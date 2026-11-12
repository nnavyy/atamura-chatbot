import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { geminiProvider } from '@/lib/gemini';
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
    const availableUnits = allUnits.filter((u) => u.status !== 'sold');

    // 3. Rule-based filtering (Pipeline 3)
    const criteria = extractCriteria(entities);
    const relevantUnits = filterUnits(allUnits, criteria);

    // Check specific unit inquiries
    const targetUnit = entities.unit_code
      ? allUnits.find((u) => u.code === entities.unit_code)
      : null;

    const hasFilterConstraints = Boolean(
      criteria.budget || criteria.rooms || criteria.purpose || criteria.view || entities.unit_code
    );

    // 4. Build context with deterministic mathematical calculations (Pipeline 4)
    const systemPrompt = buildSystemPrompt();
    let unitContext: string;

    if (targetUnit && targetUnit.status === 'sold') {
      unitContext =
        `[STATUS CRITICAL: Unit ${targetUnit.code} is strictly SOLD OUT (status: sold). If the client asks to buy, price, or book Unit ${targetUnit.code}, you MUST explicitly and politely state that Unit ${targetUnit.code} has already been sold. Do NOT recommend or sell Unit ${targetUnit.code}. Suggest available alternative units such as Unit 3A (for 3BR) or Unit 2A/2B.]\n\n` +
        buildUnitContext(availableUnits);
    } else if (hasFilterConstraints && relevantUnits.length === 0) {
      unitContext =
        `[STATUS CRITICAL: No available units meet the user's specific filter criteria (requested budget: ${criteria.budget ? criteria.budget.toLocaleString('ru-RU') + ' ₸' : 'unmatched'}. The lowest priced available unit in KERUEN is Unit 1B at 12,000,000 ₸. Unit 3B is SOLD OUT. You MUST politely explain that no units match this exact budget or criteria, state the minimum starting price in KERUEN (12,000,000 ₸), and present the closest available units without hallucinating lower prices or recommending sold units.]\n\n` +
        buildUnitContext(availableUnits);
    } else {
      unitContext = buildUnitContext(relevantUnits.length > 0 ? relevantUnits : availableUnits);
    }

    // Attach deterministic financial calculations for primary unit
    const primaryUnit =
      targetUnit && targetUnit.status !== 'sold'
        ? targetUnit
        : relevantUnits.length > 0
        ? relevantUnits[0]
        : availableUnits[0];

    if (primaryUnit && primaryUnit.status !== 'sold') {
      const paymentOptions = getAllPaymentOptions(primaryUnit.priceMin, primaryUnit.code);
      unitContext +=
        `\n\n[DETERMINISTIC FINANCIAL CALCULATION FOR UNIT ${primaryUnit.code} (${primaryUnit.priceMin.toLocaleString('ru-RU')} ₸)]:\n` +
        `- Developer Installment (0% interest, 36 mos): Down Payment (30%) = ${paymentOptions.installment.dp.toLocaleString('ru-RU')} ₸, Monthly Payment = ${paymentOptions.installment.monthly.toLocaleString('ru-RU')} ₸/mo, Total = ${paymentOptions.installment.total.toLocaleString('ru-RU')} ₸\n` +
        `- Bank Mortgage (17% p.a., 20 yrs): Down Payment (20%) = ${paymentOptions.mortgage.dp.toLocaleString('ru-RU')} ₸, Monthly Annuity = ${paymentOptions.mortgage.monthly.toLocaleString('ru-RU')} ₸/mo, Total = ${paymentOptions.mortgage.total.toLocaleString('ru-RU')} ₸\n` +
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

    // 6. Call Gemini (Pipeline 5)
    const llmResponse = await geminiProvider.generateResponse(chatMessages, systemPrompt, unitContext);

    // Sanitize recommended units: NEVER allow sold units to be recommended
    const sanitizedRecommended = (llmResponse.recommendedUnits || []).filter((code) => {
      const u = allUnits.find((unit) => unit.code === code);
      return u && u.status !== 'sold';
    });

    // Compute deterministic calculation result for API response
    let finalCalculation: CalculationResult | null = null;
    if (primaryUnit && primaryUnit.status !== 'sold') {
      const isCalcRequest =
        preClassification.intent === 'dp_calculation' ||
        llmResponse.detectedIntent === 'dp_calculation' ||
        /dp|down\s*payment|первоначальн|installment|рассрочк|mortgage|ипотек|cicilan|angsuran|kalkulasi|hitung/i.test(message);

      if (isCalcRequest || llmResponse.calculation) {
        const isMortgage =
          /mortgage|ипотек|kpr|bank/i.test(message) ||
          (llmResponse.calculation && llmResponse.calculation.method === 'mortgage');
        const isFull =
          /full|cash|100%|lunas/i.test(message) ||
          (llmResponse.calculation && llmResponse.calculation.method === 'full');

        if (isMortgage) {
          finalCalculation = calcMortgage(primaryUnit.priceMin, primaryUnit.code);
        } else if (isFull) {
          finalCalculation = calcFullPayment(primaryUnit.priceMin, primaryUnit.code);
        } else {
          finalCalculation = calcInstallment(primaryUnit.priceMin, primaryUnit.code);
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
        extractedEntities: JSON.stringify(llmResponse.extractedEntities || entities),
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
    const allEntities = llmResponse.extractedEntities || entities;
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

    // 12. Get recommended unit details
    let recommendedUnitDetails: unknown[] = [];
    if (sanitizedRecommended.length > 0) {
      recommendedUnitDetails = await prisma.unit.findMany({
        where: { code: { in: sanitizedRecommended } },
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
