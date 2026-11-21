/**
 * Fixed-window rate limiter kept in memory. Good enough for a single instance;
 * swap the Map for Redis or similar when running several instances.
 */
export interface RateLimiter {
  check(key: string, now?: number): { ok: boolean; retryAfterSeconds: number };
}

/** A limiter allowing `limit` requests per key in each window of `windowMs`. */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const MAX_KEYS = 10_000;

  return {
    check(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (hits.size >= MAX_KEYS) {
          // Drop expired entries first; if still full, drop the oldest insert.
          for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
          if (hits.size >= MAX_KEYS) hits.delete(hits.keys().next().value as string);
        }
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return { ok: true, retryAfterSeconds: 0 };
      }
      entry.count += 1;
      if (entry.count > limit) {
        return { ok: false, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
      }
      return { ok: true, retryAfterSeconds: 0 };
    },
  };
}

/** Best-effort client key from proxy headers. */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "anonymous";
}
