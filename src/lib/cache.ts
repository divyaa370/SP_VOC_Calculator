/**
 * In-memory + localStorage cache for live data fetches.
 * Persists values across page loads; in-memory layer avoids JSON
 * parse overhead on repeated reads within the same session.
 */

const CACHE_PREFIX = "truecost_livedata_";

interface CacheEntry<T> {
  value: T;
  fetchedAt: number; // Date.now()
  ttl: number;       // milliseconds
}

// In-memory layer — avoids repeated localStorage reads
const memCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const fullKey = CACHE_PREFIX + key;

  // Check memory first
  const mem = memCache.get(fullKey);
  if (mem && Date.now() - mem.fetchedAt < mem.ttl) {
    return mem.value as T;
  }

  // Fall back to localStorage
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt >= entry.ttl) {
      localStorage.removeItem(fullKey);
      return null;
    }
    // Warm the memory layer
    memCache.set(fullKey, entry as CacheEntry<unknown>);
    return entry.value;
  } catch {
    // Corrupt entry — purge and treat as cache miss
    try { localStorage.removeItem(fullKey); } catch { /* ignore */ }
    return null;
  }
}

export function setCached<T>(key: string, value: T, ttl: number): void {
  const fullKey = CACHE_PREFIX + key;
  const entry: CacheEntry<T> = { value, fetchedAt: Date.now(), ttl };
  memCache.set(fullKey, entry as CacheEntry<unknown>);
  try {
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — memory cache is still warm
  }
}

/** Returns the timestamp (Date.now()) when a key was last successfully fetched, or 0. */
export function getCacheAge(key: string): number {
  const fullKey = CACHE_PREFIX + key;
  const mem = memCache.get(fullKey);
  if (mem) return mem.fetchedAt;
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return 0;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return entry.fetchedAt ?? 0;
  } catch {
    return 0;
  }
}
