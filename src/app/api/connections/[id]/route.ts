import { NextResponse } from 'next/server';
import { removeConnection, getDefaultId, setDefaultId, listConnections } from '@/lib/connections';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wasDefault = getDefaultId() === id;
  removeConnection(id);
  if (wasDefault) {
    const remaining = listConnections();
    setDefaultId(remaining[0]?.id ?? null);
  }
  return NextResponse.json({ ok: true });
}
