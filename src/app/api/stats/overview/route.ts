import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const conn = getPool();

    const [[uptime], [version], [maxConn], [openConn], dbSizes] = await Promise.all([
      conn.query(`SELECT VARIABLE_VALUE as val FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Uptime'`) as Promise<[Array<{ val: string }>, unknown]>,
      conn.query(`SELECT VARIABLE_VALUE as val FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'version'`) as Promise<[Array<{ val: string }>, unknown]>,
      conn.query(`SELECT VARIABLE_VALUE as val FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections'`) as Promise<[Array<{ val: string }>, unknown]>,
      conn.query(`SELECT VARIABLE_VALUE as val FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Threads_connected'`) as Promise<[Array<{ val: string }>, unknown]>,
      conn.query(`
        SELECT
          table_schema AS \`database\`,
          COUNT(*) AS tableCount,
          SUM(data_length + index_length) AS totalSize,
          SUM(data_length) AS dataSize,
          SUM(index_length) AS indexSize,
          SUM(table_rows) AS estimatedRows
        FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema', 'performance_schema')
        GROUP BY table_schema
        ORDER BY totalSize DESC
      `) as Promise<[Array<{ database: string; tableCount: number; totalSize: number; dataSize: number; indexSize: number; estimatedRows: number }>, unknown]>,
    ]);

    const uptimeSec = parseInt(uptime[0]?.val || '0');

    return NextResponse.json({
      server: {
        version: version[0]?.val || '',
        uptime: uptimeSec,
        maxConnections: parseInt(maxConn[0]?.val || '0'),
        openConnections: parseInt(openConn[0]?.val || '0'),
      },
      databases: (dbSizes[0] as Array<Record<string, unknown>>).map(db => ({
        ...db,
        totalSize: Number(db.totalSize) || 0,
        dataSize: Number(db.dataSize) || 0,
        indexSize: Number(db.indexSize) || 0,
        tableCount: Number(db.tableCount) || 0,
        estimatedRows: Number(db.estimatedRows) || 0,
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
