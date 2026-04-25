import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import type { ResultSetHeader } from 'mysql2';

type Params = Promise<{ db: string; table: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const sp = req.nextUrl.searchParams;
  const page = parseInt(sp.get('page') || '1');
  const pageSize = parseInt(sp.get('pageSize') || '50');
  const offset = (page - 1) * pageSize;

  try {
    const conn = getPool();
    const [[countRow]] = await conn.query(
      `SELECT COUNT(*) as total FROM \`${db}\`.\`${table}\``
    ) as [Array<{ total: number }>, unknown];

    const [rows] = await conn.query(
      `SELECT * FROM \`${db}\`.\`${table}\` LIMIT ${pageSize} OFFSET ${offset}`
    );

    return NextResponse.json({ rows, total: countRow.total, page, pageSize });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const body = await req.json();
  try {
    const conn = getPool();
    const keys = Object.keys(body).map(k => `\`${k}\``).join(', ');
    const placeholders = Object.keys(body).map(() => '?').join(', ');
    const values = Object.values(body) as string[];
    const [result] = await conn.execute(
      `INSERT INTO \`${db}\`.\`${table}\` (${keys}) VALUES (${placeholders})`,
      values
    );
    return NextResponse.json({ insertId: (result as ResultSetHeader).insertId });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const body = await req.json();
  const { __pk, ...fields } = body as { __pk: Record<string, unknown>; [k: string]: unknown };

  try {
    const conn = getPool();
    const setClauses = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    const whereClauses = Object.keys(__pk).map(k => `\`${k}\` = ?`).join(' AND ');
    const values = [...Object.values(fields), ...Object.values(__pk)] as string[];
    await conn.execute(
      `UPDATE \`${db}\`.\`${table}\` SET ${setClauses} WHERE ${whereClauses}`,
      values
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { db, table } = await params;
  const body = await req.json();
  try {
    const conn = getPool();
    const whereClauses = Object.keys(body).map(k => `\`${k}\` = ?`).join(' AND ');
    await conn.execute(
      `DELETE FROM \`${db}\`.\`${table}\` WHERE ${whereClauses} LIMIT 1`,
      Object.values(body)
    );
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
