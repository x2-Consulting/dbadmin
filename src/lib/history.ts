import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'query-history.json');
const MAX_ENTRIES = 500;

export interface HistoryEntry {
  id: string;
  sql: string;
  db?: string;
  conn: string;
  elapsed: number;
  rowCount?: number;
  affectedRows?: number;
  error?: string;
  ts: number;
}

function ensureFile() {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(HISTORY_FILE)) fs.writeFileSync(HISTORY_FILE, '[]');
}

function atomicWrite(file: string, data: string): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, file);
}

export function appendHistory(entry: Omit<HistoryEntry, 'id' | 'ts'>): void {
  try {
    ensureFile();
    const existing: HistoryEntry[] = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    existing.unshift({ ...entry, id: randomUUID(), ts: Date.now() });
    atomicWrite(HISTORY_FILE, JSON.stringify(existing.slice(0, MAX_ENTRIES)));
  } catch { /* non-fatal */ }
}

export function readHistory(): HistoryEntry[] {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  } catch { return []; }
}

export function clearHistory(): void {
  try { atomicWrite(HISTORY_FILE, '[]'); } catch { /* non-fatal */ }
}
