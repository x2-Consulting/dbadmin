import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

type Params = Promise<{ db: string; table: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { db, table } = await params;
  try {
    const conn = getPool();
    const [columns] = await conn.query(`DESCRIBE \`${db}\`.\`${table}\``);
    const [indexes] = await conn.query(`SHOW INDEX FROM \`${db}\`.\`${table}\``);
    return NextResponse.json({ columns, indexes });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
