/**
 * Sanitises an error for API responses: DB errors pass through as-is
 * (they are informative); Node/system errors have absolute paths redacted
 * and are also logged server-side with full detail.
 */
export function toApiError(e: unknown): string {
  const err = e as Error & { code?: string };
  const msg = err?.message ?? String(e);

  // mysql2 error codes start with ER_; pg codes are 5-char alphanumeric.
  // These are safe to forward verbatim — DB engines don't embed file paths.
  if (err?.code && (/^ER_/.test(err.code) || /^[0-9A-Z]{5}$/.test(err.code))) {
    return msg;
  }

  // Connection-level errors (ECONNREFUSED etc.) are useful for debugging
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connect/.test(msg)) {
    return msg;
  }

  // Log the full error server-side, return a redacted version to the caller
  console.error('[dbadmin api error]', e);
  return msg.replace(/\/(home|root|var|etc|usr|opt|tmp|proc|srv)[^\s,;'"()[\]]+/g, '<path>');
}
