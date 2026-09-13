import { z } from "zod";

export const cacheKeyInfoSchema = z.object({
  key: z.string(),
  type: z.string(),
  ttlSeconds: z.number().int().nullable(),
});

export type CacheKeyInfo = z.infer<typeof cacheKeyInfoSchema>;

export const cacheKeysQuerySchema = z.object({
  cursor: z.string().optional(),
  pattern: z.string().optional(),
});

export type CacheKeysQuery = z.infer<typeof cacheKeysQuerySchema>;

export const cacheKeysResponseSchema = z.object({
  keys: z.array(cacheKeyInfoSchema),
  nextCursor: z.string().nullable(),
});

export type CacheKeysResponse = z.infer<typeof cacheKeysResponseSchema>;

export const cacheStatsResponseSchema = z.object({
  hits: z.number().int().nonnegative(),
  misses: z.number().int().nonnegative(),
  hitRate: z.number().min(0).max(1),
  usedMemoryHuman: z.string(),
  connectedClients: z.number().int().nonnegative(),
  uptimeSec: z.number().int().nonnegative(),
});

export type CacheStatsResponse = z.infer<typeof cacheStatsResponseSchema>;

export const cacheKeyParamsSchema = z.object({
  key: z.string().min(1),
});

export type CacheKeyParams = z.infer<typeof cacheKeyParamsSchema>;
