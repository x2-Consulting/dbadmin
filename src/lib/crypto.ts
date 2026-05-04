import { createCipheriv, createDecipheriv, createHash, pbkdf2Sync, randomBytes } from 'node:crypto';

const PREFIX_V1 = 'enc1:';
const PREFIX_V2 = 'enc2:';

// Fixed salt — uniqueness comes from the random IV per encryption, not the salt
const PBKDF2_SALT = Buffer.from('dbadmin-connections-v2');
const PBKDF2_ITER = 310_000;

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.UI_PASSWORD || '';
}

const PBKDF2_ITER_LEGACY = 200_000; // iteration count used before the 310K upgrade

// Cache the derived keys so PBKDF2 only runs once per process lifecycle
let _cachedSecret = '';
let _cachedKey: Buffer | null = null;
let _cachedKeyLegacy: Buffer | null = null;

function deriveKeyV2(): Buffer | null {
  const secret = getSecret();
  if (!secret) return null;
  if (secret === _cachedSecret && _cachedKey) return _cachedKey;
  _cachedKey = pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_ITER, 32, 'sha256');
  _cachedKeyLegacy = pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_ITER_LEGACY, 32, 'sha256');
  _cachedSecret = secret;
  return _cachedKey;
}

function deriveKeyV2Legacy(): Buffer | null {
  const secret = getSecret();
  if (!secret) return null;
  if (secret === _cachedSecret && _cachedKeyLegacy) return _cachedKeyLegacy;
  deriveKeyV2(); // populates both caches
  return _cachedKeyLegacy;
}

function deriveKeyV1(): Buffer | null {
  const secret = getSecret();
  if (!secret) return null;
  return createHash('sha256').update(secret).digest();
}

// Returns null when decryption fails (wrong key / corrupt data) so callers can try a fallback key
function aesGcmDecrypt(b64: string, key: Buffer): string | null {
  try {
    const buf = Buffer.from(b64, 'base64');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export function encryptPassword(plain: string): string {
  const key = deriveKeyV2();
  if (!key || !plain) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX_V2 + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptPassword(enc: string): string {
  if (enc.startsWith(PREFIX_V2)) {
    const data = enc.slice(PREFIX_V2.length);
    const key = deriveKeyV2();
    if (key) {
      const result = aesGcmDecrypt(data, key);
      if (result !== null) return result;
      // Current key failed — try the pre-310K legacy key so existing connections keep working
      const legacyKey = deriveKeyV2Legacy();
      if (legacyKey) return aesGcmDecrypt(data, legacyKey) ?? '';
    }
    return '';
  }
  if (enc.startsWith(PREFIX_V1)) {
    // Legacy v1: decrypt with SHA-256-derived key; re-encrypted next saveConnection call
    const key = deriveKeyV1();
    return key ? (aesGcmDecrypt(enc.slice(PREFIX_V1.length), key) ?? '') : '';
  }
  return enc; // unencrypted plaintext (default connection from env vars)
}
