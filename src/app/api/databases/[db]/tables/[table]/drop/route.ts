import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { dropTable } from '@/lib/adapter';

type Params = Promise<{ db: string; table: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const connId = req.nextUrl.searchParams.get('conn') || 'default';
  try {
    const pool = await getConnPool(connId);
    await dropTable(pool, db, table);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
