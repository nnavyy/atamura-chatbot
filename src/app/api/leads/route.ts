import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: { chats: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { score: 'desc' },
    });
    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, name, whatsapp } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const lead = await prisma.lead.upsert({
      where: { id: sessionId },
      update: { name, whatsapp, status: 'follow-up' },
      create: { sessionId, name, whatsapp, status: 'follow-up' },
    });

    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
