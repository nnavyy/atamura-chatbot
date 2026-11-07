import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { geminiProvider } from '@/lib/gemini';
import { buildSystemPrompt, buildUnitContext } from '@/lib/knowledgeBase';
import { filterUnits, extractCriteria } from '@/lib/rules';
import { verifiedUnitCodes, buildVerifiedReply, detectPaymentMethod } from '@/lib/recommendationGuard';
import { calcFullPayment, calcInstallment, calcMortgage } from '@/lib/calculator';
import { classifyIntent, extractEntities } from '@/lib/intentClassifier';
import { scoreLead } from '@/lib/leadScoring';
import { detectLanguage } from '@/lib/i18n';
import { ChatMessage } from '@/lib/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    const { message, sessionId, history = [] } = body;

    if (typeof message !== 'string' || !message.trim() || message.length > 3000 || typeof sessionId !== 'string' || !/^[a-zA-Z0-9_:-]{8,128}$/.test(sessionId)) {
      return NextResponse.json({ error: 'Missing message or sessionId' }, { status: 400 });
    }

    // 1. Detect language & classify intent
    const language = detectLanguage(message);
    const preClassification = classifyIntent(message);
    const entities = extractEntities(message);

    // 2. Get all units from DB
    const availableUnits = await prisma.unit.findMany({ where: { status: 'available' } });

    // 3. Rule-based filtering
    const criteria = extractCriteria(entities);
    const relevantUnits = filterUnits(availableUnits, criteria);

    // 4. Build context
    const systemPrompt = buildSystemPrompt() + '\nResearch prototype using simulated/curated data, not official inventory. Recommend only provided available units. Never invent prices or calculate payments. Do not claim company affiliation.';
    const unitContext = relevantUnits.length ? buildUnitContext(relevantUnits) : 'NO MATCHING UNITS. recommendedUnits must be [].';

    // 5. Prepare chat history
    const chatMessages: ChatMessage[] = [
      ...(Array.isArray(history) ? history.slice(-12) : []).filter((h: unknown) => {
        if (!h || typeof h !== 'object') return false;
        const x = h as { role?: unknown; content?: unknown };
        return (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string';
      }).map((h: { role: 'user' | 'assistant'; content: string }) => ({ role: h.role, content: h.content.slice(0, 3000) })),
      { role: 'user' as const, content: message },
    ];

    // 6. Call Gemini
    const llmResponse = await geminiProvider.generateResponse(chatMessages, systemPrompt, unitContext);
    // Verify all LLM-proposed codes against the retrieved, constrained database rows.
    const approvedCodes = verifiedUnitCodes(llmResponse.recommendedUnits, relevantUnits);
    const approvedUnits = relevantUnits.filter(u => approvedCodes.includes(u.code));
    const hasConstraints = Boolean(criteria.budget || criteria.rooms || criteria.unitCode || criteria.purpose || criteria.minArea || criteria.view);
    const recommendationIntent = hasConstraints || ['unit_recommendation', 'price_inquiry', 'dp_calculation'].includes(preClassification.intent);
    let safeMessage = llmResponse.message;
    if (recommendationIntent || !relevantUnits.length) {
      safeMessage = buildVerifiedReply(
        !relevantUnits.length ? [] : approvedUnits.length ? approvedUnits : relevantUnits.slice(0, 3),
        language
      );
    }
    const method = detectPaymentMethod(message);
    const explicitCode = typeof entities.unit_code === 'string' ? entities.unit_code.toUpperCase() : '';
    const selectedUnit = relevantUnits.find(u => u.code === explicitCode) || approvedUnits[0] || (relevantUnits.length === 1 ? relevantUnits[0] : undefined);
    let calculation: ReturnType<typeof calcFullPayment> | null = null;
    if (method && !selectedUnit && relevantUnits.length > 0) {
      safeMessage = buildVerifiedReply(relevantUnits.slice(0, 3), language) + '\nPlease specify a unit code to calculate a payment simulation.';
    }
    if (method && selectedUnit) {
      calculation = method === 'full' ? calcFullPayment(selectedUnit.priceMin, selectedUnit.code)
        : method === 'installment' ? calcInstallment(selectedUnit.priceMin, selectedUnit.code)
        : calcMortgage(selectedUnit.priceMin, selectedUnit.code);
      safeMessage = buildVerifiedReply([selectedUnit], language) +
        '\nPayment simulation (' + method + '): DP ' + calculation.dp.toLocaleString('ru-RU') +
        ' ₸, monthly ' + calculation.monthly.toLocaleString('ru-RU') +
        ' ₸, total ' + calculation.total.toLocaleString('ru-RU') +
        ' ₸. This is a research simulation, not a commercial or bank offer.';
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
        detectedIntent: preClassification.intent,
        extractedEntities: JSON.stringify(entities),
        language,
        leadId: lead.id,
      },
    });

    // 9. Save assistant response
    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: 'assistant',
        content: safeMessage,
        units: approvedCodes.length > 0
          ? JSON.stringify(approvedCodes)
          : null,
        language,
        leadId: lead.id,
      },
    });

    // 10. Update lead with extracted info
    const updateData: Record<string, unknown> = {};
    const allEntities = entities;
    if (allEntities.budget && !lead.budget) updateData.budget = allEntities.budget as number;
    if (allEntities.purpose && !lead.purpose) updateData.purpose = allEntities.purpose as string;
    if (allEntities.unit_code) updateData.interest = allEntities.unit_code as string;
    if (language !== lead.language) updateData.language = language;

    // 11. Re-score lead
    const updatedChats = await prisma.chatHistory.findMany({
      where: { leadId: lead.id },
    });
    const scoreResult = scoreLead(updatedChats, Boolean(lead.whatsapp || lead.email));
    updateData.score = scoreResult.total;

    if (Object.keys(updateData).length > 0) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: updateData,
      });
    }

    // 12. Get recommended unit details
    const recommendedUnitDetails = approvedUnits;

    return NextResponse.json({
      message: safeMessage,
      recommendedUnits: recommendedUnitDetails,
      calculation,
      language,
      intent: preClassification.intent,
      leadScore: scoreResult.total,
      options: Array.isArray(llmResponse.options) ? llmResponse.options.slice(0, 3) : [],
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
