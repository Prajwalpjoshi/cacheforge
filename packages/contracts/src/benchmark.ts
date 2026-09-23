import { z } from "zod";

export const benchmarkModeSchema = z.enum([
  "DB_ONLY",
  "CACHE_ONLY",
  "COMPARISON",
]);
export type BenchmarkMode = z.infer<typeof benchmarkModeSchema>;

export const benchmarkTargetRouteSchema = z.enum([
  "products.list",
  "products.get",
]);
export type BenchmarkTargetRoute = z.infer<typeof benchmarkTargetRouteSchema>;

// PROJECT_SPEC.md §11 guardrails: iterations capped at 1000, concurrency at
// 20 — rejected outright (400) rather than silently clamped.
export const benchmarkRunRequestSchema = z.object({
  targetRoute: benchmarkTargetRouteSchema,
  mode: benchmarkModeSchema,
  iterations: z.number().int().positive().max(1000),
  concurrency: z.number().int().positive().max(20).default(1),
  label: z.string().trim().min(1).max(200).optional(),
});
export type BenchmarkRunRequest = z.infer<typeof benchmarkRunRequestSchema>;

export const benchmarkStatsSchema = z.object({
  minMs: z.number().nonnegative(),
  maxMs: z.number().nonnegative(),
  avgMs: z.number().nonnegative(),
  p50Ms: z.number().nonnegative(),
  p95Ms: z.number().nonnegative(),
  p99Ms: z.number().nonnegative(),
  throughputRps: z.number().nonnegative(),
});
export type BenchmarkStats = z.infer<typeof benchmarkStatsSchema>;

export const benchmarkSideResultSchema = z.object({
  latenciesMs: z.array(z.number()),
  stats: benchmarkStatsSchema,
  cacheHitRate: z.number().min(0).max(1).nullable(),
});
export type BenchmarkSideResult = z.infer<typeof benchmarkSideResultSchema>;

export const benchmarkComparisonSchema = z.object({
  dbOnly: benchmarkSideResultSchema,
  cacheOnly: benchmarkSideResultSchema,
  latencyImprovementPct: z.number().nullable(),
  p95ImprovementPct: z.number().nullable(),
  throughputImprovementPct: z.number().nullable(),
});
export type BenchmarkComparison = z.infer<typeof benchmarkComparisonSchema>;

// Summary shape used for the history list — no raw latencies, no
// comparison detail, so listing many runs stays cheap.
export const benchmarkRunSummarySchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  targetRoute: z.string(),
  mode: benchmarkModeSchema,
  iterations: z.number().int(),
  concurrency: z.number().int(),
  minMs: z.number(),
  maxMs: z.number(),
  avgMs: z.number(),
  p50Ms: z.number(),
  p95Ms: z.number(),
  p99Ms: z.number(),
  throughputRps: z.number(),
  cacheHitRate: z.number().min(0).max(1).nullable(),
  createdAt: z.string(),
});
export type BenchmarkRunSummary = z.infer<typeof benchmarkRunSummarySchema>;

// Detail shape used for POST's response and GET /:id — includes raw
// latencies (single-mode runs) or the full comparison breakdown.
export const benchmarkRunDetailSchema = benchmarkRunSummarySchema.extend({
  latenciesMs: z.array(z.number()).nullable(),
  comparison: benchmarkComparisonSchema.nullable(),
});
export type BenchmarkRunDetail = z.infer<typeof benchmarkRunDetailSchema>;

export const benchmarkListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  // Case-insensitive substring match against `targetRoute` OR `label` — see
  // benchmark.repository.ts's `list()` for how this composes with `mode`.
  search: z.string().trim().min(1).max(200).optional(),
  mode: benchmarkModeSchema.optional(),
});
export type BenchmarkListQuery = z.infer<typeof benchmarkListQuerySchema>;

/** Same `{ items, page, pageSize, total }` envelope as requestMetricsResponseSchema — one pagination convention across the API. */
export const benchmarkListResponseSchema = z.object({
  items: z.array(benchmarkRunSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type BenchmarkListResponse = z.infer<typeof benchmarkListResponseSchema>;

export const benchmarkIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type BenchmarkIdParams = z.infer<typeof benchmarkIdParamsSchema>;
