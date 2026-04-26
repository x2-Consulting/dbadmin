import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';

const SKIP_MYSQL = ['information_schema', 'performance_schema', 'sys', 'mysql'];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.trim() ?? '';
  const connId = sp.get('conn') || 'default';

  if (q.length < 2) return NextResponse.json({ tables: [], columns: [] });

  try {
    const pool = await getConnPool(connId);
    const pattern = `%${q}%`;

    if (pool.config.type === 'postgres') {
      const [tableRes, colRes] = await Promise.all([
        pool.pg!.query<{ db: string; table: string }>(
          `SELECT table_schema AS db, table_name AS table
           FROM information_schema.tables
           WHERE table_type = 'BASE TABLE'
             AND table_schema NOT IN ('information_schema','pg_catalog','pg_toast')
             AND table_schema NOT LIKE 'pg_temp%'
             AND (table_name ILIKE $1 OR table_schema ILIKE $1)
           ORDER BY table_schema, table_name LIMIT 20`,
          [pattern]
        ),
        pool.pg!.query<{ db: string; table: string; column: string }>(
          `SELECT table_schema AS db, table_name AS table, column_name AS column
           FROM information_schema.columns
           WHERE table_schema NOT IN ('information_schema','pg_catalog','pg_toast')
             AND table_schema NOT LIKE 'pg_temp%'
             AND column_name ILIKE $1
           ORDER BY table_schema, table_name, column_name LIMIT 20`,
          [pattern]
        ),
      ]);
      return NextResponse.json({ tables: tableRes.rows, columns: colRes.rows });
    }

    const skip = SKIP_MYSQL.map(() => '?').join(',');
    const [tableRows, colRows] = await Promise.all([
      pool.mysql!.execute(
        `SELECT table_schema AS db, table_name AS \`table\`
         FROM information_schema.tables
         WHERE table_type = 'BASE TABLE'
           AND table_schema NOT IN (${skip})
           AND (table_name LIKE ? OR table_schema LIKE ?)
         ORDER BY table_schema, table_name LIMIT 20`,
        [...SKIP_MYSQL, pattern, pattern]
      ) as Promise<[Array<{ db: string; table: string }>, unknown]>,
      pool.mysql!.execute(
        `SELECT table_schema AS db, table_name AS \`table\`, column_name AS \`column\`
         FROM information_schema.columns
         WHERE table_schema NOT IN (${skip})
           AND column_name LIKE ?
         ORDER BY table_schema, table_name, column_name LIMIT 20`,
        [...SKIP_MYSQL, pattern]
      ) as Promise<[Array<{ db: string; table: string; column: string }>, unknown]>,
    ]);
    return NextResponse.json({ tables: tableRows[0], columns: colRows[0] });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
