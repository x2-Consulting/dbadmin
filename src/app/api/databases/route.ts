import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const conn = getPool();
    const [rows] = await conn.query('SHOW DATABASES') as [Array<{ Database: string }>, unknown];
    const skip = new Set(['information_schema', 'performance_schema', 'sys']);
    const databases = rows.map(r => r.Database).filter(d => !skip.has(d));
    return NextResponse.json({ databases });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
