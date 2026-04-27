import { NextRequest, NextResponse } from 'next/server';
import { createToken, COOKIE, isSecureContext } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const RATE_FILE = path.join(process.cwd(), 'data', 'rate-limit.json');

type RateLimitStore = Record<string, { count: number; resetAt: number }>;

function loadStore(): RateLimitStore {
  try { return JSON.parse(fs.readFileSync(RATE_FILE, 'utf8')); } catch { return {}; }
}

function saveStore(store: RateLimitStore): void {
  const now = Date.now();
  const pruned = Object.fromEntries(Object.entries(store).filter(([, v]) => v.resetAt > now));
  try {
    const dir = path.dirname(RATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = RATE_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(pruned), 'utf8');
    fs.renameSync(tmp, RATE_FILE);
  } catch { /* non-fatal */ }
}

// In-memory primary store, loaded from disk at startup
let loginAttempts: RateLimitStore = loadStore();

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const rec = loginAttempts[ip];
  if (!rec || rec.resetAt < now) return { allowed: true };
  if (rec.count >= MAX_ATTEMPTS) return { allowed: false, retryAfter: Math.ceil((rec.resetAt - now) / 1000) };
  return { allowed: true };
}

function recordAttempt(ip: string, success: boolean) {
  if (success) {
    delete loginAttempts[ip];
  } else {
    const now = Date.now();
    const rec = loginAttempts[ip];
    if (!rec || rec.resetAt < now) loginAttempts[ip] = { count: 1, resetAt: now + WINDOW_MS };
    else loginAttempts[ip] = { ...rec, count: rec.count + 1 };
  }
  saveStore(loginAttempts);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many failed attempts. Try again in ${retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const { password } = await req.json();
  const expected = process.env.UI_PASSWORD;

  if (!expected || password !== expected) {
    recordAttempt(ip, false);
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  recordAttempt(ip, true);
  const token = await createToken();

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isSecureContext(),
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return res;
}
