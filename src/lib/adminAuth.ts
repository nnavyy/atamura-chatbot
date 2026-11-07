import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Prototype admin API authentication. The key must only be entered by the
 * researcher/admin; never embed ADMIN_API_KEY in NEXT_PUBLIC_* variables.
 * Replace with an authenticated server-side session before public production.
 */
export function isAdminRequest(req: NextRequest): boolean {
  const expected = process.env.ADMIN_API_KEY;
  const auth = req.headers.get('authorization') || '';
  if (!expected || !auth.startsWith('Bearer ')) return false;
  const provided = auth.slice(7);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
