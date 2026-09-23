const buckets = new Map();

export function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();

  for (const [k, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(k);
    }
  }

  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    buckets.set(key, entry);
  }

  entry.count += 1;

  if (entry.count > limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }
  return { ok: true, retryAfterMs: 0 };
}

export function resetRateLimit(key) {
  buckets.delete(key);
}
