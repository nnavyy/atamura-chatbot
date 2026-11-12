import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processPropertyQuery } from '@/lib/chatEngine';
import { scoreLead } from '@/lib/leadScoring';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, sessionId, history = [] } = body;

    if (!message || !sessionId) {
      return NextResponse.json({ error: 'Missing message or sessionId' }, { status: 400 });
    }

    // 1. Retrieve all units from relational database
    const allUnits = await prisma.unit.findMany();

    // 2. Call unified query processing engine (Pipelines 1 to 6)
    const result = await processPropertyQuery({
      query: message,
      allUnits,
      history,
      sessionId,
    });

    // 3. Find or create lead
    let lead = await prisma.lead.findFirst({
      where: { sessionId },
      include: { chats: true },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: { sessionId, language: result.language },
        include: { chats: true },
      });
    }

    // 4. Save user message
    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
        detectedIntent: result.detectedIntent,
        extractedEntities: JSON.stringify(result.extractedEntities),
        language: result.language,
        leadId: lead.id,
      },
    });

    // 5. Save assistant response
    await prisma.chatHistory.create({
      data: {
        sessionId,
        role: 'assistant',
        content: result.message,
        units: result.recommendedUnits.length > 0 ? JSON.stringify(result.recommendedUnits) : null,
        language: result.language,
        leadId: lead.id,
      },
    });

    // 6. Update lead with extracted info
    const updateData: Record<string, unknown> = {};
    if (result.extractedEntities.budget && !lead.budget) {
      updateData.budget = result.extractedEntities.budget as number;
    }
    if (result.extractedEntities.purpose && !lead.purpose) {
      updateData.purpose = result.extractedEntities.purpose as string;
    }
    if (result.extractedEntities.unit_code) {
      updateData.interest = result.extractedEntities.unit_code as string;
    }
    if (result.language !== lead.language) {
      updateData.language = result.language;
    }

    // 7. Re-score lead (Pipeline 6)
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

    // 8. Return response:
    // recommendedUnits contains full unit details for frontend UI cards
    // calculation is strictly authoritative from calculator.ts (null if no calculation requested)
    return NextResponse.json({
      message: result.message,
      recommendedUnits: result.recommendedUnitDetails,
      recommendedUnitCodes: result.recommendedUnits,
      calculation: result.calculation,
      language: result.language,
      intent: result.detectedIntent,
      leadScore: scoreResult.total,
      options: result.options || [],
      modelUsed: result.modelUsed,
      latencyMs: result.latencyMs,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', details: String(error) },
      { status: 500 }
    );
  }
}
