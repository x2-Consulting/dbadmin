import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const PREFIX = 'enc1:';

function deriveKey(): Buffer | null {
  const secret = process.env.SESSION_SECRET || process.env.UI_PASSWORD || '';
  if (!secret) return null;
  return createHash('sha256').update(secret).digest();
}

export function encryptPassword(plain: string): string {
  const key = deriveKey();
  if (!key || !plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptPassword(enc: string): string {
  if (!enc.startsWith(PREFIX)) return enc;
  const key = deriveKey();
  if (!key) return '';
  try {
    const buf = Buffer.from(enc.slice(PREFIX.length), 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}
