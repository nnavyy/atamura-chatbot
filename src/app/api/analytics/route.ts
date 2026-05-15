import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [totalChats, totalLeads, hotLeads, chatsByLang, recentChats, unitMentions] = await Promise.all([
      prisma.chatHistory.count(),
      prisma.lead.count(),
      prisma.lead.count({ where: { score: { gte: 75 } } }),
      prisma.chatHistory.groupBy({ by: ['language'], _count: { language: true } }),
      prisma.chatHistory.findMany({
        where: { role: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { detectedIntent: true, content: true, language: true, createdAt: true },
      }),
      prisma.chatHistory.findMany({
        where: { units: { not: null } },
        select: { units: true },
      }),
    ]);

    // Count intents
    const intentCounts: Record<string, number> = {};
    recentChats.forEach((c) => {
      const intent = c.detectedIntent || 'unknown';
      intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    });

    // Count recommended units
    const unitCounts: Record<string, number> = {};
    unitMentions.forEach((c) => {
      try {
        const codes = JSON.parse(c.units!) as string[];
        codes.forEach((code) => {
          unitCounts[code] = (unitCounts[code] || 0) + 1;
        });
      } catch { /* skip invalid */ }
    });

    // Language distribution
    const languageDistribution: Record<string, number> = {};
    chatsByLang.forEach((l) => {
      languageDistribution[l.language] = l._count.language;
    });

    // Conversion rate
    const leadsWithContact = await prisma.lead.count({
      where: { OR: [{ whatsapp: { not: null } }, { name: { not: null } }] },
    });
    const conversionRate = totalLeads > 0 ? Math.round((leadsWithContact / totalLeads) * 100) : 0;

    return NextResponse.json({
      totalChats,
      totalLeads,
      hotLeads,
      conversionRate,
      intentCounts,
      unitCounts,
      languageDistribution,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
