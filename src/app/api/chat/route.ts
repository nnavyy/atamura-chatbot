import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { geminiProvider } from '@/lib/gemini';
import { buildSystemPrompt, buildUnitContext } from '@/lib/knowledgeBase';
import { filterUnits, extractCriteria } from '@/lib/rules';
import { classifyIntent, extractEntities } from '@/lib/intentClassifier';
import { scoreLead } from '@/lib/leadScoring';
import { detectLanguage } from '@/lib/i18n';
import { ChatMessage } from '@/lib/llm';

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

    // 3. Rule-based filtering
    const criteria = extractCriteria(entities);
    const relevantUnits = filterUnits(allUnits, criteria);

    // 4. Build context
    const systemPrompt = buildSystemPrompt();
    const unitContext = buildUnitContext(relevantUnits.length > 0 ? relevantUnits : allUnits);

    // 5. Prepare chat history
    const chatMessages: ChatMessage[] = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 6. Call Gemini
    const llmResponse = await geminiProvider.generateResponse(chatMessages, systemPrompt, unitContext);

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
        units: llmResponse.recommendedUnits.length > 0
          ? JSON.stringify(llmResponse.recommendedUnits)
          : null,
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

    // 11. Re-score lead
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
    if (llmResponse.recommendedUnits.length > 0) {
      recommendedUnitDetails = await prisma.unit.findMany({
        where: { code: { in: llmResponse.recommendedUnits } },
      });
    }

    return NextResponse.json({
      message: llmResponse.message,
      recommendedUnits: recommendedUnitDetails,
      calculation: llmResponse.calculation || null,
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
