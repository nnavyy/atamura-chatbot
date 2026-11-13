import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { maskPhoneForDisplay, maskPhoneNumbers } from '@/lib/intentClassifier';

function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 1) return '***';
  return `${trimmed[0]}***${trimmed.slice(atIndex)}`;
}

function sanitizeExtractedEntitiesJson(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.phone === 'string') {
      parsed.phone = maskPhoneForDisplay(parsed.phone);
    }
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: { chats: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { score: 'desc' },
    });

    const sanitizedLeads = leads.map((lead) => ({
      ...lead,
      whatsapp: lead.whatsapp ? maskPhoneForDisplay(lead.whatsapp) : null,
      email: maskEmail(lead.email),
      chats: lead.chats.map((chat) => ({
        ...chat,
        content: maskPhoneNumbers(chat.content, { preserveOfficialHotline: true }),
        extractedEntities: sanitizeExtractedEntitiesJson(chat.extractedEntities),
      })),
    }));

    return NextResponse.json(sanitizedLeads);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, name, whatsapp } = body;

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const cleanName = typeof name === 'string' && name.trim() ? name.trim().slice(0, 120) : undefined;
    const maskedWhatsapp =
      typeof whatsapp === 'string' && whatsapp.trim()
        ? maskPhoneForDisplay(whatsapp.trim())
        : undefined;

    const existingLead = await prisma.lead.findFirst({
      where: { OR: [{ sessionId }, { id: sessionId }] },
    });

    const lead = existingLead
      ? await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            ...(cleanName !== undefined ? { name: cleanName } : {}),
            ...(maskedWhatsapp !== undefined ? { whatsapp: maskedWhatsapp } : {}),
            status: 'follow-up',
          },
        })
      : await prisma.lead.create({
          data: {
            sessionId,
            ...(cleanName !== undefined ? { name: cleanName } : {}),
            ...(maskedWhatsapp !== undefined ? { whatsapp: maskedWhatsapp } : {}),
            status: 'follow-up',
          },
        });

    return NextResponse.json({
      ...lead,
      whatsapp: lead.whatsapp ? maskPhoneForDisplay(lead.whatsapp) : null,
      email: maskEmail(lead.email),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
