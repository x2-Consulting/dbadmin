import { NextResponse } from 'next/server';
import { readHistory, clearHistory } from '@/lib/history';

export async function GET() {
  return NextResponse.json({ history: readHistory() });
}

export async function DELETE() {
  clearHistory();
  return NextResponse.json({ ok: true });
}
