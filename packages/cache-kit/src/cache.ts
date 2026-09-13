import type { RedisClientLike } from "./redis-client.js";
import type {
  Cache,
  CacheOptions,
  CacheResult,
  CacheSetOptions,
  CacheStats,
} from "./types.js";

interface RawGetResult<T> {
  ok: boolean;
  value: T | null;
}

/**
 * Cache-aside on top of a single Redis client. Every Redis operation is
 * fail-open: an unreachable Redis degrades to "go to the source" rather
 * than rejecting the caller. `getOrSet`'s `fetcher` is never wrapped in
 * this fail-open behavior — if it throws (e.g. "not found"), that error
 * propagates untouched, since it is a real application error, not a
 * cache infrastructure failure.
 */
export function createCache(
  redis: RedisClientLike,
  options: CacheOptions = {},
): Cache {
  const onError = options.onError ?? (() => {});
  const statsKeyPrefix = options.statsKeyPrefix ?? "cache-kit:stats";
  const hitsKey = `${statsKeyPrefix}:hits`;
  const missesKey = `${statsKeyPrefix}:misses`;

  async function rawGet<T>(key: string): Promise<RawGetResult<T>> {
    try {
      const raw = await redis.get(key);
      return { ok: true, value: raw == null ? null : (JSON.parse(raw) as T) };
    } catch (error) {
      onError(error, { operation: "get", key });
      return { ok: false, value: null };
    }
  }

  async function get<T>(key: string): Promise<T | null> {
    const result = await rawGet<T>(key);
    return result.value;
  }

  async function set<T>(
    key: string,
    value: T,
    ttlSeconds: number,
    setOptions?: CacheSetOptions,
  ): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
      if (setOptions?.tags?.length) {
        await Promise.all(setOptions.tags.map((tag) => redis.sAdd(tag, key)));
      }
    } catch (error) {
      onError(error, { operation: "set", key });
    }
  }

  async function del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      onError(error, { operation: "delete", key });
    }
  }

  async function exists(key: string): Promise<boolean> {
    try {
      const count = await redis.exists(key);
      return count > 0;
    } catch (error) {
      onError(error, { operation: "exists", key });
      return false;
    }
  }

  function bumpStat(key: string): void {
    redis.incr(key).catch((error: unknown) => {
      onError(error, { operation: "stats-incr", key });
    });
  }

  async function getOrSet<T>(
    key: string,
    ttlSeconds: number,
    fetcher: () => Promise<T>,
    setOptions?: CacheSetOptions,
  ): Promise<CacheResult<T>> {
    const result = await rawGet<T>(key);

    if (result.ok && result.value !== null) {
      bumpStat(hitsKey);
      return { value: result.value, status: "hit" };
    }

    const value = await fetcher();
    await set(key, value, ttlSeconds, setOptions);

    if (!result.ok) {
      return { value, status: "bypass" };
    }

    bumpStat(missesKey);
    return { value, status: "miss" };
  }

  async function invalidateTag(tag: string): Promise<void> {
    try {
      const keys = await redis.sMembers(tag);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      await redis.del(tag);
    } catch (error) {
      onError(error, { operation: "invalidate-tag", key: tag });
    }
  }

  async function getStats(): Promise<CacheStats> {
    try {
      const [hitsRaw, missesRaw] = await Promise.all([
        redis.get(hitsKey),
        redis.get(missesKey),
      ]);
      const hits = Number(hitsRaw ?? 0);
      const misses = Number(missesRaw ?? 0);
      const total = hits + misses;
      return { hits, misses, hitRate: total > 0 ? hits / total : 0 };
    } catch (error) {
      onError(error, { operation: "get-stats" });
      return { hits: 0, misses: 0, hitRate: 0 };
    }
  }

  return { get, set, delete: del, exists, getOrSet, invalidateTag, getStats };
}
