import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAdminRequest } from '@/lib/adminAuth';
import { scoreLead } from '@/lib/leadScoring';

export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const leads = await prisma.lead.findMany({
      select: { id: true, name: true, whatsapp: true, budget: true, purpose: true,
        interest: true, status: true, score: true, language: true, createdAt: true },
      take: 100,
      orderBy: { score: 'desc' },
    });
    return NextResponse.json(leads);
  } catch (error) {
    console.error('Lead API failed', error);
    return NextResponse.json({ error: 'Lead service unavailable' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
    const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.trim() : '';

    if (!/^[a-zA-Z0-9_:-]{8,128}$/.test(sessionId) || body.consent !== true || (!name && !whatsapp)) {
      return NextResponse.json({ error: 'Valid session, contact, and explicit consent required' }, { status: 400 });
    }
    if (whatsapp && !/^\+[1-9]\d{7,14}$/.test(whatsapp)) return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });

    // sessionId is not a unique field in the legacy schema; never use it as id.
    const existing = await prisma.lead.findFirst({ where: { sessionId } });
    const lead = existing
      ? await prisma.lead.update({ where: { id: existing.id }, data: { name, whatsapp, status: 'follow-up' } })
      : await prisma.lead.create({ data: { sessionId, name, whatsapp, status: 'follow-up' } });
    // Contact submission must immediately affect the score, not only future chat turns.
    const chats = await prisma.chatHistory.findMany({ where: { leadId: lead.id } });
    const result = scoreLead(chats, Boolean(lead.whatsapp || lead.email));
    await prisma.lead.update({ where: { id: lead.id }, data: { score: result.total } });
    return NextResponse.json({ success: true, id: lead.id });
  } catch (error) {
    console.error('Lead API failed', error);
    return NextResponse.json({ error: 'Lead service unavailable' }, { status: 500 });
  }
}
