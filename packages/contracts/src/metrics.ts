import { z } from "zod";

export const cacheStatusValueSchema = z.enum([
  "HIT",
  "MISS",
  "BYPASS",
  "NOT_APPLICABLE",
]);
export type CacheStatusValue = z.infer<typeof cacheStatusValueSchema>;

export const dataSourceValueSchema = z.enum(["DB", "CACHE"]);
export type DataSourceValue = z.infer<typeof dataSourceValueSchema>;

export const metricsSummaryQuerySchema = z.object({
  windowMinutes: z.coerce.number().int().positive().max(10080).default(15),
});
export type MetricsSummaryQuery = z.infer<typeof metricsSummaryQuerySchema>;

export const routeMetricsSummarySchema = z.object({
  route: z.string(),
  method: z.string(),
  requestCount: z.number().int().nonnegative(),
  errorRate: z.number().min(0).max(1),
  p95Ms: z.number().nonnegative(),
});
export type RouteMetricsSummary = z.infer<typeof routeMetricsSummarySchema>;

export const metricsSummaryResponseSchema = z.object({
  windowMinutes: z.number().int().positive(),
  requestCount: z.number().int().nonnegative(),
  errorRate: z.number().min(0).max(1),
  p50Ms: z.number().nonnegative(),
  p95Ms: z.number().nonnegative(),
  p99Ms: z.number().nonnegative(),
  cacheHitRate: z.number().min(0).max(1).nullable(),
  byRoute: z.array(routeMetricsSummarySchema),
});
export type MetricsSummaryResponse = z.infer<
  typeof metricsSummaryResponseSchema
>;

export const requestMetricSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  method: z.string(),
  route: z.string(),
  statusCode: z.number().int(),
  durationMs: z.number().nonnegative(),
  cacheStatus: cacheStatusValueSchema,
  source: dataSourceValueSchema,
  createdAt: z.string(),
});
export type RequestMetricDTO = z.infer<typeof requestMetricSchema>;

export const requestMetricsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
  windowMinutes: z.coerce.number().int().positive().max(10080).optional(),
  route: z.string().min(1).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  cacheStatus: cacheStatusValueSchema.optional(),
  source: dataSourceValueSchema.optional(),
  // Lets a specific request's row be found directly — the trace-a-
  // request-end-to-end capability PROJECT_SPEC.md §20 describes.
  requestId: z.string().min(1).optional(),
});
export type RequestMetricsQuery = z.infer<typeof requestMetricsQuerySchema>;

export const requestMetricsResponseSchema = z.array(requestMetricSchema);
