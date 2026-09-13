import { createHash } from "node:crypto";
import type { ProductListQuery } from "@cacheforge/contracts";

/**
 * Every CacheForge-owned Redis key lives under this namespace, so the
 * Cache Explorer/admin endpoints can safely SCAN MATCH `${NAMESPACE}:*`
 * and never touch a key belonging to another application sharing the
 * same Redis instance — PROJECT_SPEC.md §9.
 */
export const NAMESPACE = "cacheforge";

export const TTL = {
  PRODUCT: 60,
  PRODUCT_LIST: 30,
} as const;

export const PRODUCT_LIST_TAG = `${NAMESPACE}:products:list:keys`;

export const RATE_LIMIT_KEY_PREFIX = {
  READ: `${NAMESPACE}:ratelimit:read`,
  WRITE: `${NAMESPACE}:ratelimit:write`,
} as const;

export const CACHE_STATS_KEY_PREFIX = `${NAMESPACE}:stats`;

export const EVENTS_CHANNEL = `${NAMESPACE}:events`;

export function productKey(id: string): string {
  return `${NAMESPACE}:product:${id}`;
}

/**
 * Deterministic: the object is always constructed with the same key
 * order, so equivalent queries (same page/pageSize/category) always
 * canonicalize to the same JSON string and therefore the same hash.
 * Different queries — even ones that "look similar" as raw query
 * strings — never collide because the whole normalized shape is hashed,
 * not a naive concatenation of query params.
 */
export function productListKey(query: ProductListQuery): string {
  const canonical = JSON.stringify({
    page: query.page,
    pageSize: query.pageSize,
    category: query.category ?? null,
  });
  const hash = createHash("sha1").update(canonical).digest("hex").slice(0, 16);
  return `${NAMESPACE}:products:list:${hash}`;
}
