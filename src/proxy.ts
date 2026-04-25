import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'dbadmin_session';

async function makeToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('authenticated'));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(cookie: string, secret: string): Promise<boolean> {
  const expected = await makeToken(secret);
  if (cookie.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < cookie.length; i++) diff |= cookie.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const session = req.cookies.get(COOKIE)?.value;
  const secret = process.env.SESSION_SECRET || process.env.UI_PASSWORD || 'dev';

  if (!session || !(await verify(session, secret))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
