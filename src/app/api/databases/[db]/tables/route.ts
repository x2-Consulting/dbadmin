import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET(_req: Request, { params }: { params: Promise<{ db: string }> }) {
  const { db } = await params;
  try {
    const conn = getPool();
    const [rows] = await conn.query(`SHOW TABLES FROM \`${db}\``);
    const key = `Tables_in_${db}`;
    const tables = (rows as Record<string, string>[]).map(r => r[key]);
    return NextResponse.json({ tables });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
