import {
  cacheKeysResponseSchema,
  cacheStatsResponseSchema,
  type CacheKeysResponse,
  type CacheStatsResponse,
} from "@cacheforge/contracts";
import { apiRequest, type ApiResult } from "./client";

export async function listCacheKeys(
  cursor?: string,
  pattern?: string,
): Promise<ApiResult<CacheKeysResponse>> {
  return apiRequest("/api/cache/keys", cacheKeysResponseSchema, {
    query: { cursor, pattern },
  });
}

export async function getCacheStats(): Promise<ApiResult<CacheStatsResponse>> {
  return apiRequest("/api/cache/stats", cacheStatsResponseSchema);
}

export async function deleteCacheKey(key: string): Promise<ApiResult<void>> {
  return apiRequest(`/api/cache/${encodeURIComponent(key)}`, null, {
    method: "DELETE",
  });
}
