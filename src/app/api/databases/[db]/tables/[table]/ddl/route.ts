import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { getCreateStatement, execQuery } from '@/lib/adapter';

type Params = Promise<{ db: string; table: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const connId = req.nextUrl.searchParams.get('conn') || 'default';
  try {
    const pool = await getConnPool(connId);
    const ddl = await getCreateStatement(pool, db, table);
    return NextResponse.json({ ddl });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const { sql, conn = 'default' } = await req.json();
  if (!sql?.trim()) return NextResponse.json({ error: 'Empty SQL' }, { status: 400 });
  try {
    const pool = await getConnPool(conn);
    const result = await execQuery(pool, sql, db);
    return NextResponse.json(result);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
