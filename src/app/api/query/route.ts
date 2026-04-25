import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { sql, db } = await req.json();
  if (!sql?.trim()) return NextResponse.json({ error: 'Empty query' }, { status: 400 });

  try {
    const conn = getPool();
    if (db) await conn.query(`USE \`${db}\``);

    const start = Date.now();
    const [result] = await conn.query(sql);
    const elapsed = Date.now() - start;

    if (Array.isArray(result)) {
      return NextResponse.json({ rows: result, elapsed, type: 'select' });
    }
    const r = result as { affectedRows?: number; insertId?: number; warningStatus?: number };
    return NextResponse.json({
      affectedRows: r.affectedRows,
      insertId: r.insertId,
      elapsed,
      type: 'write',
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
