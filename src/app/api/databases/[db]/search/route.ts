import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { searchDatabase } from '@/lib/adapter';
import { toApiError } from '@/lib/errors';

export async function POST(req: NextRequest, { params }: { params: Promise<{ db: string }> }) {
  const { db } = await params;
  const connId = req.nextUrl.searchParams.get('conn') || 'default';
  try {
    const { term } = await req.json();
    if (!term?.trim()) return NextResponse.json({ hits: [] });
    if (term.trim().length > 100) return NextResponse.json({ error: 'Search term too long' }, { status: 400 });
    const pool = await getConnPool(connId);
    const hits = await searchDatabase(pool, db, term.trim());
    return NextResponse.json({ hits });
  } catch (e: unknown) {
    return NextResponse.json({ error: toApiError(e) }, { status: 500 });
  }
}
