import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';

export async function GET() {
  try {
    const conn = getPool();
    const [rows] = await conn.query(
      `SELECT User, Host, plugin, password_expired, account_locked
       FROM mysql.user ORDER BY User, Host`
    );
    return NextResponse.json({ users: rows });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, host, password, grants } = await req.json();
  try {
    const conn = getPool();
    await conn.execute(
      `CREATE USER ?@? IDENTIFIED BY ?`,
      [user, host || '%', password]
    );
    if (grants?.length) {
      for (const grant of grants as string[]) {
        await conn.query(`GRANT ${grant} ON *.* TO ?@?`, [user, host || '%']);
      }
    }
    await conn.query('FLUSH PRIVILEGES');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { user, host } = await req.json();
  try {
    const conn = getPool();
    await conn.execute(`DROP USER ?@?`, [user, host]);
    await conn.query('FLUSH PRIVILEGES');
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
