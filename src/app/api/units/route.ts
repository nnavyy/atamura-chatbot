import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const units = await prisma.unit.findMany({
      orderBy: [{ rooms: 'asc' }, { priceMin: 'asc' }],
    });
    return NextResponse.json(units);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
