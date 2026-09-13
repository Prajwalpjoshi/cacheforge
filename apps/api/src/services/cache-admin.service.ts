import type { Cache, RedisClientLike } from "@cacheforge/cache-kit";
import type {
  CacheKeyInfo,
  CacheKeysResponse,
  CacheStatsResponse,
} from "@cacheforge/contracts";
import { BadRequestError } from "../errors.js";
import { NAMESPACE } from "../cache/keys.js";

function parseRedisInfo(raw: string): Record<string, string> {
  const info: Record<string, string> = {};
  for (const line of raw.split("\r\n")) {
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    info[line.slice(0, separatorIndex)] = line.slice(separatorIndex + 1);
  }
  return info;
}

export interface CacheAdminServiceDeps {
  redis: RedisClientLike;
  cache: Cache;
}

/**
 * Developer/admin observability over the CacheForge-owned key
 * namespace only — never a general Redis console. Key enumeration
 * uses cursor-based SCAN (never KEYS); deletion is restricted to keys
 * within our own namespace (PROJECT_SPEC.md §19).
 */
export function createCacheAdminService(deps: CacheAdminServiceDeps) {
  return {
    async listKeys(
      cursor: string | undefined,
      pattern: string | undefined,
      limit: number,
    ): Promise<CacheKeysResponse> {
      const matchPattern = pattern ?? `${NAMESPACE}:*`;
      if (!matchPattern.startsWith(`${NAMESPACE}:`)) {
        throw new BadRequestError(
          `pattern must be within the "${NAMESPACE}:" namespace`,
        );
      }

      const scanResult = await deps.redis.scan(cursor ?? "0", {
        MATCH: matchPattern,
        COUNT: 100,
      });

      const keys: CacheKeyInfo[] = await Promise.all(
        scanResult.keys.slice(0, limit).map(async (key) => {
          const [type, ttl] = await Promise.all([
            deps.redis.type(key),
            deps.redis.ttl(key),
          ]);
          return { key, type, ttlSeconds: ttl >= 0 ? ttl : null };
        }),
      );

      return {
        keys,
        nextCursor: scanResult.cursor === "0" ? null : scanResult.cursor,
      };
    },

    async getStats(): Promise<CacheStatsResponse> {
      const [cacheStats, infoRaw] = await Promise.all([
        deps.cache.getStats(),
        deps.redis.info().catch(() => ""),
      ]);
      const info = parseRedisInfo(infoRaw);

      return {
        hits: cacheStats.hits,
        misses: cacheStats.misses,
        hitRate: cacheStats.hitRate,
        usedMemoryHuman: info.used_memory_human ?? "unknown",
        connectedClients: Number(info.connected_clients ?? 0),
        uptimeSec: Number(info.uptime_in_seconds ?? 0),
      };
    },

    async deleteKey(key: string): Promise<boolean> {
      if (!key.startsWith(`${NAMESPACE}:`)) {
        throw new BadRequestError(
          `key must be within the "${NAMESPACE}:" namespace`,
        );
      }
      const deleted = await deps.redis.del(key);
      return deleted > 0;
    },
  };
}

export type CacheAdminService = ReturnType<typeof createCacheAdminService>;
