import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';
import { getCompletions } from '@/lib/adapter';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const connId = sp.get('conn') || 'default';
  const db = sp.get('db') || '';
  if (!db) return NextResponse.json({ tables: [], columns: [] });
  try {
    const pool = await getConnPool(connId);
    const data = await getCompletions(pool, db);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ tables: [], columns: [] });
  }
}
