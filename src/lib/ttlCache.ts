/**
 * A small in-memory cache with a time-to-live and a size cap (least recently
 * used entries are dropped first). Map keeps insertion order, so re-inserting
 * on read moves an entry to the "most recent" end.
 */
interface TtlCache<V> {
  get(key: string, now?: number): V | undefined;
  set(key: string, value: V, now?: number): void;
  clear(): void;
  readonly size: number;
}

/** An in-memory cache whose entries expire after `ttlMs`, holding at most `maxEntries`. */
export function createTtlCache<V>({ ttlMs, maxEntries }: { ttlMs: number; maxEntries: number }): TtlCache<V> {
  const entries = new Map<string, { value: V; expires: number }>();

  return {
    get(key, now = Date.now()) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      entries.delete(key);
      if (entry.expires <= now) return undefined;
      entries.set(key, entry);
      return entry.value;
    },
    set(key, value, now = Date.now()) {
      entries.delete(key);
      entries.set(key, { value, expires: now + ttlMs });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    },
  };
}
