import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { execQuery, importCSVRows } from '@/lib/adapter';

type Params = Promise<{ db: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { db } = await params;
  const connId = req.nextUrl.searchParams.get('conn') || 'default';
  const { type, sql, table, headers, rows } = await req.json();
  try {
    const pool = await getConnPool(connId);
    if (pool.config.readonly) {
      return NextResponse.json({ error: 'Connection is read-only' }, { status: 403 });
    }
    if (type === 'sql') {
      if (!sql) return NextResponse.json({ error: 'sql required' }, { status: 400 });
      const result = await execQuery(pool, sql, db);
      return NextResponse.json({ ok: true, ...result });
    }
    if (type === 'csv') {
      if (!table || !headers?.length || !rows?.length) {
        return NextResponse.json({ error: 'table, headers, and rows required' }, { status: 400 });
      }
      const result = await importCSVRows(pool, db, table, headers, rows);
      return NextResponse.json({ ok: true, ...result });
    }
    return NextResponse.json({ error: 'type must be sql or csv' }, { status: 400 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
