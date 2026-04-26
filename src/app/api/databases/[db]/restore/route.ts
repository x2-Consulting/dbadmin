import { NextRequest, NextResponse } from 'next/server';
import { getConnPool } from '@/lib/connections';

const MAX_SIZE_MB = 100;

function splitStatements(sql: string): string[] {
  // Split on ';' followed by newline or end-of-string, ignoring content inside strings.
  // Handles basic cases; not a full SQL parser.
  const stmts: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    if (escaped) { current += ch; escaped = false; continue; }
    if (ch === '\\' && !inDouble) { current += ch; escaped = true; continue; }

    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }

    if (ch === ';' && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) stmts.push(trimmed);
      current = '';
      continue;
    }

    current += ch;
  }
  const trimmed = current.trim();
  if (trimmed) stmts.push(trimmed);
  return stmts.filter(s => s.length > 0 && !s.startsWith('--'));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ db: string }> }) {
  const { db } = await params;
  const connId = req.nextUrl.searchParams.get('conn') || 'default';

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File too large (max ${MAX_SIZE_MB}MB)` }, { status: 413 });
  }

  const sql = await file.text();

  let pool;
  try {
    pool = await getConnPool(connId);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  if (pool.config.readonly) {
    return NextResponse.json({ error: 'Connection is read-only' }, { status: 403 });
  }

  let executed = 0;
  const errors: string[] = [];

  try {
    if (pool.config.type === 'postgres') {
      // pg can execute multiple statements in a single query call
      await pool.pg!.query(sql);
      executed = splitStatements(sql).length;
    } else {
      // mysql2 with multipleStatements=true handles this natively
      if (db) await pool.mysql!.query(`USE \`${db.replace(/[^\w$]/g, '')}\``);
      await pool.mysql!.query(sql);
      executed = splitStatements(sql).length;
    }
  } catch (e: unknown) {
    const msg = (e as Error).message;
    errors.push(msg);
    return NextResponse.json({ error: msg, executed }, { status: 400 });
  }

  return NextResponse.json({ ok: true, executed, errors });
}
