import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { listViews } from '@/lib/adapter';

export async function GET(req: NextRequest, { params }: { params: Promise<{ db: string }> }) {
  const { db } = await params;
  const connId = req.nextUrl.searchParams.get('conn') || 'default';
  try {
    const pool = await getConnPool(connId);
    const views = await listViews(pool, db);
    return NextResponse.json({ views });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
