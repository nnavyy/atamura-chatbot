import { ChatMessage, LLMResponse } from './llm';
import { groqProvider, PRIMARY_MODEL, FALLBACK_MODEL } from './groq';
import { buildSystemPrompt, buildUnitContext } from './knowledgeBase';
import { Unit, FilterCriteria, filterUnits, extractCriteria } from './rules';
import { classifyIntent, extractEntities } from './intentClassifier';
import { detectLanguage } from './i18n';
import {
  getAllPaymentOptions,
  calcInstallment,
  calcMortgage,
  calcFullPayment,
  CalculationResult,
} from './calculator';

export interface ProcessPropertyQueryOptions {
  query: string;
  allUnits: Unit[];
  history?: Array<{ role: string; content: string }>;
  sessionId?: string;
  model?: 'openai/gpt-oss-120b' | 'qwen/qwen3.8-27b' | string;
}

export interface ProcessPropertyQueryResult {
  message: string;
  recommendedUnits: string[];
  recommendedUnitDetails: Unit[];
  calculation: CalculationResult | null;
  detectedIntent: string;
  extractedEntities: Record<string, unknown>;
  language: 'en' | 'ru' | 'kz';
  modelUsed: 'openai/gpt-oss-120b' | 'qwen/qwen3.8-27b' | 'fallback' | string;
  latencyMs: number;
  options?: string[];
  eligibleUnits: Unit[];
}

/**
 * Core query processing engine for Atamura Chatbot.
 * Unified between Next.js /api/chat route and benchmark evaluation runner.
 *
 * Implements the 6-Pipeline Hybrid Constraint-Aware Architecture:
 * 1. Language, intent, and multi-lingual entity extraction.
 * 2. Relational database retrieval.
 * 3. Rule-based strict constraint pre-filtering (status, budget, rooms, view).
 * 4. Dynamic prompt context builder with strict banners & deterministic calculations.
 * 5. High-speed Groq LPU inference with JSON structured response.
 * 6. Authoritative post-inference validation & deterministic financial computation.
 */
export async function processPropertyQuery({
  query,
  allUnits,
  history = [],
  sessionId,
  model,
}: ProcessPropertyQueryOptions): Promise<ProcessPropertyQueryResult> {
  const startTime = Date.now();

  // Pipeline 1: Language detection, Intent classification, and Entity extraction
  const language = detectLanguage(query);
  const preClassification = classifyIntent(query);
  const entities = extractEntities(query);

  // Normalize unit code if present (supporting both Latin & Cyrillic 1A, 1B, 1V, 2A, 2B, 2V, 3A, 3B)
  let matchedUnitCode = entities.unit_code as string | undefined;
  if (!matchedUnitCode) {
    const m = query.match(/\b([123]\s*[ABVабв])\b/i);
    if (m) {
      const raw = m[1].replace(/\s+/g, '').toUpperCase();
      const cyrillicMap: Record<string, string> = { 'А': 'A', 'Б': 'B', 'В': 'V' };
      const num = raw[0];
      const letter = cyrillicMap[raw[1]] || raw[1];
      matchedUnitCode = `${num}${letter}`;
      entities.unit_code = matchedUnitCode;
    }
  }

  // Pipeline 2: Available Units & Target Unit Check
  const availableUnits = allUnits.filter(
    (u) => u.status === 'available' && u.code !== '2V' && u.code !== '3B'
  );

  const targetUnit = matchedUnitCode
    ? allUnits.find((u) => u.code.toUpperCase() === matchedUnitCode!.toUpperCase()) || null
    : null;

  // Pipeline 3: Strict Multi-Criteria Rule Filtering
  const criteria = extractCriteria(entities);
  const eligibleUnits = filterUnits(allUnits, criteria);

  const hasFilterConstraints = Boolean(
    criteria.budget || criteria.rooms || criteria.purpose || criteria.view || matchedUnitCode
  );

  // Pipeline 4: Dynamic Prompt Context with Strict Banners & Exact Deterministic Financial Options
  const systemPrompt = buildSystemPrompt();
  let unitContext: string;

  if (targetUnit && (targetUnit.status === 'sold' || targetUnit.code === '3B')) {
    unitContext =
      `[STATUS CRITICAL: Unit ${targetUnit.code} is strictly SOLD OUT (status: sold). If the client asks to buy, price, or book Unit ${targetUnit.code}, you MUST explicitly and politely state that Unit ${targetUnit.code} has already been sold. Do NOT recommend or sell Unit ${targetUnit.code}. Suggest available alternative units such as Unit 3A (for 3BR) or Unit 2A/2B.]\n\n` +
      buildUnitContext(availableUnits);
  } else if (targetUnit && (targetUnit.status === 'reserved' || targetUnit.code === '2V')) {
    unitContext =
      `[STATUS CRITICAL: Unit ${targetUnit.code} is currently RESERVED (status: reserved / under booking). It CANNOT be recommended for immediate purchase. You MUST politely explain that Unit ${targetUnit.code} is currently on hold/reserved by another client. Do NOT recommend or sell Unit ${targetUnit.code}. Suggest available alternative units of the same type (such as Unit 2A or 2B) or suggest contacting sales to join the waiting list.]\n\n` +
      buildUnitContext(availableUnits);
  } else if (hasFilterConstraints && eligibleUnits.length === 0) {
    unitContext =
      `[STATUS CRITICAL: No available units meet the user's specific filter criteria (requested budget: ${criteria.budget ? criteria.budget.toLocaleString('ru-RU') + ' ₸' : 'unmatched'}). The lowest priced available unit in KERUEN is Unit 1B at 12,000,000 ₸. Unit 2V is RESERVED and Unit 3B is SOLD OUT. You MUST politely explain that no units match this exact budget or criteria, state the minimum starting price in KERUEN (12,000,000 ₸), set recommendedUnits to [], and present the closest available units without hallucinating lower prices or recommending sold/reserved units.]\n\n` +
      buildUnitContext(availableUnits);
  } else {
    unitContext = buildUnitContext(eligibleUnits.length > 0 ? eligibleUnits : availableUnits);
  }

  // Attach deterministic financial options for primary unit
  const customDP = entities.custom_dp as number | undefined;
  const customTenor = entities.custom_tenor as number | undefined;
  const customRate = entities.custom_rate as number | undefined;

  const primaryUnit =
    targetUnit && targetUnit.status === 'available' && targetUnit.code !== '2V' && targetUnit.code !== '3B'
      ? targetUnit
      : eligibleUnits.length > 0
      ? eligibleUnits[0]
      : availableUnits[0];

  if (primaryUnit && primaryUnit.status === 'available' && primaryUnit.code !== '2V' && primaryUnit.code !== '3B') {
    const paymentOptions = getAllPaymentOptions(
      primaryUnit.priceMin,
      primaryUnit.code,
      customDP,
      customTenor,
      customRate
    );
    unitContext +=
      `\n\n[DETERMINISTIC FINANCIAL CALCULATION FOR UNIT ${primaryUnit.code} (${primaryUnit.priceMin.toLocaleString('ru-RU')} ₸)]:\n` +
      `- Developer Installment (0% interest, ${paymentOptions.installment.tenor} mos): Down Payment (${paymentOptions.installment.dpPercent}%) = ${paymentOptions.installment.dp.toLocaleString('ru-RU')} ₸, Monthly Payment = ${paymentOptions.installment.monthly.toLocaleString('ru-RU')} ₸/mo, Total = ${paymentOptions.installment.total.toLocaleString('ru-RU')} ₸\n` +
      `- Bank Mortgage (${paymentOptions.mortgage.interestRate}% p.a., ${paymentOptions.mortgage.tenor} mos): Down Payment (${paymentOptions.mortgage.dpPercent}%) = ${paymentOptions.mortgage.dp.toLocaleString('ru-RU')} ₸, Monthly Annuity = ${paymentOptions.mortgage.monthly.toLocaleString('ru-RU')} ₸/mo, Total = ${paymentOptions.mortgage.total.toLocaleString('ru-RU')} ₸\n` +
      `- Full Cash Payment (3% discount): Total = ${paymentOptions.full.total.toLocaleString('ru-RU')} ₸ (Savings: ${paymentOptions.full.savings.toLocaleString('ru-RU')} ₸)\n` +
      `If the user asks for financial calculations, down payments, or installments, you MUST cite these EXACT computed values without alteration.`;
  }

  // Pipeline 5: Format Chat Messages & Call Groq LPU Provider
  const chatMessages: ChatMessage[] = [
    ...(history || []).map((h) => ({
      role: h.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: h.content,
    })),
    { role: 'user' as const, content: query },
  ];

  const llmResponse: LLMResponse = await groqProvider.generateResponse(
    chatMessages,
    systemPrompt,
    unitContext,
    model
  );

  // Pipeline 6: Multi-Criteria Constraint Enforcement & Strict Validation
  const mergedEntities: Record<string, unknown> = {
    ...entities,
    ...(llmResponse.extractedEntities || {}),
  };

  const effectiveBudget =
    typeof criteria.budget === 'number'
      ? criteria.budget
      : typeof mergedEntities.budget === 'number'
      ? (mergedEntities.budget as number)
      : undefined;

  // Re-filter eligible units if effective budget narrows candidates further
  const strictEligibleUnits = effectiveBudget && (!criteria.budget || effectiveBudget < criteria.budget)
    ? filterUnits(eligibleUnits, { ...criteria, budget: effectiveBudget })
    : eligibleUnits;

  const eligibleCodeSet = new Set(strictEligibleUnits.map((u) => u.code.toUpperCase()));

  // Enforce recommendedUnits to be strictly a subset of eligibleUnits
  // Strictly eliminates any unit violating budget, rooms, view, or availability (including 2V, 3B)
  const rawRecs: string[] = Array.isArray(llmResponse.recommendedUnits)
    ? llmResponse.recommendedUnits
    : [];

  const sanitizedUnitCodes: string[] = [];
  for (const rawCode of rawRecs) {
    const code = String(rawCode).trim().toUpperCase();
    if (code === '2V' || code === '3B') continue;
    if (!eligibleCodeSet.has(code)) continue;
    if (!sanitizedUnitCodes.includes(code)) {
      sanitizedUnitCodes.push(code);
    }
  }

  const sanitizedUnitDetails = sanitizedUnitCodes
    .map((code) => allUnits.find((u) => u.code.toUpperCase() === code))
    .filter((u): u is Unit => Boolean(u));

  // Authoritative Server Calculation (Sole Source of Truth, NEVER fallback to llmResponse.calculation)
  let finalCalculation: CalculationResult | null = null;

  const isCalcRequest =
    preClassification.intent === 'dp_calculation' ||
    llmResponse.detectedIntent === 'dp_calculation' ||
    Boolean(llmResponse.calculation) ||
    /dp|down\s*payment|первоначальн|взнос|жарна|бастапқы|installment|рассрочк|бөліп\s*төлеу|mortgage|ипотек|несие|cicilan|angsuran|kalkulasi|hitung|расчёт|расчет|есепт/i.test(query);

  const calcUnit =
    targetUnit && targetUnit.status === 'available' && targetUnit.code !== '2V' && targetUnit.code !== '3B'
      ? targetUnit
      : sanitizedUnitDetails.length > 0
      ? sanitizedUnitDetails[0]
      : primaryUnit && primaryUnit.status === 'available' && primaryUnit.code !== '2V' && primaryUnit.code !== '3B'
      ? primaryUnit
      : null;

  if (isCalcRequest && calcUnit) {
    const isMortgage =
      /mortgage|ипотек|несие|kpr|bank/i.test(query) ||
      llmResponse.calculation?.method === 'mortgage';
    const isFull =
      /full|cash|100%|lunas|полн|біржола/i.test(query) ||
      llmResponse.calculation?.method === 'full';

    if (isMortgage) {
      finalCalculation = calcMortgage(
        calcUnit.priceMin,
        calcUnit.code,
        customDP ?? 20,
        customRate ?? 17,
        customTenor ?? 240
      );
    } else if (isFull) {
      finalCalculation = calcFullPayment(calcUnit.priceMin, calcUnit.code);
    } else {
      finalCalculation = calcInstallment(
        calcUnit.priceMin,
        calcUnit.code,
        customDP ?? 30,
        customTenor ?? 36
      );
    }
  }

  const latencyMs = Date.now() - startTime;

  return {
    message: llmResponse.message,
    recommendedUnits: sanitizedUnitCodes,
    recommendedUnitDetails: sanitizedUnitDetails,
    calculation: finalCalculation,
    detectedIntent: llmResponse.detectedIntent || preClassification.intent,
    extractedEntities: mergedEntities,
    language: llmResponse.language || language,
    modelUsed: llmResponse.modelUsed || model || PRIMARY_MODEL,
    latencyMs,
    options: llmResponse.options || [],
    eligibleUnits: strictEligibleUnits,
  };
}
