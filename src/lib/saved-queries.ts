import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const SAVED_FILE = path.join(process.cwd(), 'data', 'saved-queries.json');

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  db?: string;
  ts: number;
}

function ensureFile() {
  const dir = path.dirname(SAVED_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SAVED_FILE)) fs.writeFileSync(SAVED_FILE, '[]');
}

function atomicWrite(file: string, data: string): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, data, 'utf8');
  fs.renameSync(tmp, file);
}

export function readSaved(): SavedQuery[] {
  try {
    ensureFile();
    return JSON.parse(fs.readFileSync(SAVED_FILE, 'utf8'));
  } catch { return []; }
}

export function addSaved(entry: Omit<SavedQuery, 'id' | 'ts'>): SavedQuery {
  ensureFile();
  const existing = readSaved();
  const item: SavedQuery = { ...entry, id: randomUUID(), ts: Date.now() };
  existing.unshift(item);
  atomicWrite(SAVED_FILE, JSON.stringify(existing));
  return item;
}

export function deleteSaved(id: string): void {
  try {
    const existing = readSaved();
    atomicWrite(SAVED_FILE, JSON.stringify(existing.filter(e => e.id !== id)));
  } catch { /* non-fatal */ }
}
