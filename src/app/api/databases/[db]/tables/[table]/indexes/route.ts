import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { createIndex, dropIndex } from '@/lib/adapter';

type Params = Promise<{ db: string; table: string }>;
const conn = (req: NextRequest) => req.nextUrl.searchParams.get('conn') || 'default';

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const { name, columns, unique = false } = await req.json();
  if (!name || !Array.isArray(columns) || columns.length === 0) {
    return NextResponse.json({ error: 'name and columns required' }, { status: 400 });
  }
  try {
    const pool = await getConnPool(conn(req));
    await createIndex(pool, db, table, name, columns, unique);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  try {
    const pool = await getConnPool(conn(req));
    await dropIndex(pool, db, table, name);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
