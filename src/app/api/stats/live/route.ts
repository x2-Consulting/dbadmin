import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

const KEYS = [
  'Queries', 'Com_select', 'Com_insert', 'Com_update', 'Com_delete',
  'Threads_connected', 'Threads_running', 'Threads_created',
  'Innodb_buffer_pool_reads', 'Innodb_buffer_pool_read_requests',
  'Slow_queries', 'Bytes_sent', 'Bytes_received',
  'Connections', 'Aborted_connects',
  'Key_reads', 'Key_read_requests',
];

export async function GET() {
  try {
    const conn = getPool();
    const placeholders = KEYS.map(() => '?').join(',');
    const [rows] = await conn.execute(
      `SELECT VARIABLE_NAME as k, VARIABLE_VALUE as v
       FROM information_schema.GLOBAL_STATUS
       WHERE VARIABLE_NAME IN (${placeholders})`,
      KEYS
    ) as [Array<{ k: string; v: string }>, unknown];

    const stats: Record<string, number> = {};
    for (const row of rows) stats[row.k.toLowerCase()] = parseInt(row.v) || 0;

    return NextResponse.json({ stats, ts: Date.now() });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
