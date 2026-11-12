import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { groqProvider } from '@/lib/groq';
import { buildSystemPrompt, buildUnitContext } from '@/lib/knowledgeBase';
import { filterUnits, extractCriteria } from '@/lib/rules';
import { classifyIntent, extractEntities } from '@/lib/intentClassifier';
import { scoreLead } from '@/lib/leadScoring';
import { detectLanguage } from '@/lib/i18n';
import { ChatMessage } from '@/lib/llm';
import {
  getAllPaymentOptions,
  calcInstallment,
  calcMortgage,
  calcFullPayment,
  CalculationResult,
} from '@/lib/calculator';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, history = [] } = body;

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Missing message or sessionId' }, { status: 400 });
    }

    // 1. Detect language & classify intent
    const language = detectLanguage(message);
    const preClassification = classifyIntent(message);
    const entities = extractEntities(message);

    // 2. Get all units from DB
    const allUnits = await prisma.unit.findMany();
    // Strict Availability: only units with status 'available' can be recommended for direct purchase.
    // Exclude reserved (2V) and sold (3B) units explicitly.
    const availableUnits = allUnits.filter(
      (u) => u.status === 'available' && u.code !== '2V' && u.code !== '3B'
    );

    // 3. Rule-based filtering (Pipeline 3)
    const criteria = extractCriteria(entities);
    const relevantUnits = filterUnits(allUnits, criteria).filter(
      (u) => u.status === 'available' && u.code !== '2V' && u.code !== '3B'
    );

    // Check specific unit inquiries (supporting both entities.unit_code and regex extraction)
    const matchedUnitCode =
      (entities.unit_code as string | undefined) ||
      (() => {
        const m = message.match(/\b([123]\s*[ABVабв])\b/i);
        if (!m) return undefined;
        const raw = m[1].replace(/\s+/g, '').toUpperCase();
        const cyrillicMap: Record<string, string> = { 'А': 'A', 'Б': 'B', 'В': 'V' };
        const num = raw[0];
        const letter = cyrillicMap[raw[1]] || raw[1];
        return `${num}${letter}`;
      })();

    const targetUnit = matchedUnitCode
      ? allUnits.find((u) => u.code === matchedUnitCode)
      : null;

    const hasFilterConstraints = Boolean(
      criteria.budget || criteria.rooms || criteria.purpose || criteria.view || matchedUnitCode
    );

    // 4. Build context with deterministic mathematical calculations (Pipeline 4)
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
    } else if (hasFilterConstraints && (relevantUnits.length === 0 || (criteria.budget && criteria.budget < 12_000_000))) {
      unitContext =
        `[STATUS CRITICAL: No available units meet the user's specific filter criteria (requested budget: ${criteria.budget ? criteria.budget.toLocaleString('ru-RU') + ' ₸' : 'unmatched'}). The lowest priced available unit in KERUEN is Unit 1B at 12,000,000 ₸. Unit 2V is RESERVED and Unit 3B is SOLD OUT. You MUST politely explain that no units match this exact budget or criteria, state the minimum starting price in KERUEN (12,000,000 ₸), set recommendedUnits to [], and present the closest available units without hallucinating lower prices or recommending sold/reserved units.]\n\n` +
        buildUnitContext(availableUnits);
    } else {
      unitContext = buildUnitContext(relevantUnits.length > 0 ? relevantUnits : availableUnits);
    }

    // Attach deterministic financial calculations for primary unit
    const customDP = entities.custom_dp as number | undefined;
    const customTenor = entities.custom_tenor as number | undefined;
    const customRate = entities.custom_rate as number | undefined;

    const primaryUnit =
      targetUnit && targetUnit.status === 'available' && targetUnit.code !== '2V' && targetUnit.code !== '3B'
        ? targetUnit
        : relevantUnits.length > 0
        ? relevantUnits[0]
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

    // 5. Prepare chat history
    const chatMessages: ChatMessage[] = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 6. Call Groq (Pipeline 5)
    const llmResponse = await groqProvider.generateResponse(chatMessages, systemPrompt, unitContext);

    // Effective budget from rule-based criteria or LLM extracted entities
    const allEntities = llmResponse.extractedEntities || entities;
    const effectiveBudget =
      typeof criteria.budget === 'number'
        ? criteria.budget
        : typeof (allEntities.budget as number) === 'number'
        ? (allEntities.budget as number)
        : undefined;

    // Strict availability and budget filter:
    // 1. Only status 'available' can be recommended
    // 2. Unit 2V (reserved) and Unit 3B (sold) are strictly excluded
    // 3. Any unit exceeding the user's budget is strictly excluded
    const sanitizedRecommended = (llmResponse.recommendedUnits || []).filter((code) => {
      if (code === '2V' || code === '3B') return false;
      const u = allUnits.find((unit) => unit.code === code);
      if (!u || u.status !== 'available') return false;
      if (effectiveBudget && u.priceMin > effectiveBudget) return false;
      return true;
    });

    // Compute deterministic calculation result for API response
    let finalCalculation: CalculationResult | null = null;
    if (primaryUnit && primaryUnit.status === 'available' && primaryUnit.code !== '2V' && primaryUnit.code !== '3B') {
      const isCalcRequest =
        preClassification.intent === 'dp_calculation' ||
        llmResponse.detectedIntent === 'dp_calculation' ||
        /dp|down\s*payment|первоначальн|взнос|жарна|installment|рассрочк|mortgage|ипотек|cicilan|angsuran|kalkulasi|hitung/i.test(message);

      if (isCalcRequest || llmResponse.calculation) {
        const isMortgage =
          /mortgage|ипотек|kpr|bank/i.test(message) ||
          (llmResponse.calculation && llmResponse.calculation.method === 'mortgage');
        const isFull =
          /full|cash|100%|lunas/i.test(message) ||
          (llmResponse.calculation && llmResponse.calculation.method === 'full');

        if (isMortgage) {
          finalCalculation = calcMortgage(
            primaryUnit.priceMin,
            primaryUnit.code,
            customDP ?? 20,
            customRate ?? 17,
            customTenor ?? 240
          );
        } else if (isFull) {
          finalCalculation = calcFullPayment(primaryUnit.priceMin, primaryUnit.code);
        } else {
          finalCalculation = calcInstallment(
            primaryUnit.priceMin,
            primaryUnit.code,
            customDP ?? 30,
            customTenor ?? 36
          );
        }
      }
    }

    // 7. Find or create lead
    let lead = await prisma.lead.findFirst({
      where: { sessionId },
      include: { chats: true },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: { sessionId, language },
        include: { chats: true },
      });
    }

    // 8. Save user message
    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
        detectedIntent: llmResponse.detectedIntent || preClassification.intent,
        extractedEntities: JSON.stringify(allEntities),
        language,
        leadId: lead.id,
      },
    });

    // 9. Save assistant response
    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: 'assistant',
        content: llmResponse.message,
        units: sanitizedRecommended.length > 0 ? JSON.stringify(sanitizedRecommended) : null,
        language: llmResponse.language || language,
        leadId: lead.id,
      },
    });

    // 10. Update lead with extracted info
    const updateData: Record<string, unknown> = {};
    if (allEntities.budget && !lead.budget) updateData.budget = allEntities.budget as number;
    if (allEntities.purpose && !lead.purpose) updateData.purpose = allEntities.purpose as string;
    if (allEntities.unit_code) updateData.interest = allEntities.unit_code as string;
    if (language !== lead.language) updateData.language = language;

    // 11. Re-score lead (Pipeline 6)
    const updatedChats = await prisma.chatHistory.findMany({
      where: { leadId: lead.id },
    });
    const scoreResult = scoreLead(updatedChats);
    updateData.score = scoreResult.total;

    if (Object.keys(updateData).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: updateData,
      });
    }

    // 12. Get recommended unit details (Defense-in-depth: only available units, never 2V or 3B)
    let recommendedUnitDetails: unknown[] = [];
    if (sanitizedRecommended.length > 0) {
      recommendedUnitDetails = await prisma.unit.findMany({
        where: {
          code: { in: sanitizedRecommended },
          status: 'available',
          NOT: { code: { in: ['2V', '3B'] } },
        },
      });
    }

    return NextResponse.json({
      message: llmResponse.message,
      recommendedUnits: recommendedUnitDetails,
      calculation: finalCalculation || llmResponse.calculation || null,
      language: llmResponse.language || language,
      intent: llmResponse.detectedIntent || preClassification.intent,
      leadScore: scoreResult.total,
      options: llmResponse.options || [],
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: String(error) },
      { status: 500 }
    );
  }
}
