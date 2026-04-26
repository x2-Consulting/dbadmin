import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { renameTable } from '@/lib/adapter';

type Params = Promise<{ db: string; table: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const { newName } = await req.json();
  if (!newName) return NextResponse.json({ error: 'newName required' }, { status: 400 });
  const connId = req.nextUrl.searchParams.get('conn') || 'default';
  try {
    const pool = await getConnPool(connId);
    await renameTable(pool, db, table, newName);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
