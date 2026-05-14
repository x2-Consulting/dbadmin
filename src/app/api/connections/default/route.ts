import { NextRequest, NextResponse } from 'next/server';
import { getDefaultId, setDefaultId, listConnections } from '@/lib/connections';

export async function GET() {
  const configured = getDefaultId();
  const conns = listConnections();
  // Validate stored ID still exists; fall back to first connection
  const valid = conns.find(c => c.id === configured);
  const defaultId = valid ? configured : (conns[0]?.id ?? null);
  return NextResponse.json({ defaultId });
}

export async function PUT(req: NextRequest) {
  const { id } = await req.json();
  const conns = listConnections();
  if (!conns.find(c => c.id === id)) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }
  setDefaultId(id);
  return NextResponse.json({ ok: true });
}
