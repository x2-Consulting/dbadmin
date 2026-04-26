import { NextRequest, NextResponse } from 'next/server';
import { readSaved, addSaved, deleteSaved } from '@/lib/saved-queries';

export async function GET() {
  return NextResponse.json({ queries: readSaved() });
}

export async function POST(req: NextRequest) {
  const { name, sql, db } = await req.json();
  if (!name?.trim() || !sql?.trim()) {
    return NextResponse.json({ error: 'name and sql required' }, { status: 400 });
  }
  try {
    const item = addSaved({ name: name.trim(), sql, db });
    return NextResponse.json(item);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  deleteSaved(id);
  return NextResponse.json({ ok: true });
}
