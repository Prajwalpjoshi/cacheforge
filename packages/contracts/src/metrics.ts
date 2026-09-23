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

/** Coarse HTTP status grouping for the Recent Requests filter UI — exact `statusCode` filtering isn't exposed since the dashboard only needs class-level triage. */
export const requestStatusClassSchema = z.enum(["2xx", "4xx", "5xx"]);
export type RequestStatusClass = z.infer<typeof requestStatusClassSchema>;

export const requestMetricsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(200).default(50),
  windowMinutes: z.coerce.number().int().positive().max(10080).optional(),
  route: z.string().min(1).optional(),
  // Case-insensitive substring match on `route` — see requestMetricsQuerySchema
  // usage in metrics.repository.ts for how this composes with `route`.
  search: z.string().trim().min(1).max(200).optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  cacheStatus: cacheStatusValueSchema.optional(),
  statusClass: requestStatusClassSchema.optional(),
  source: dataSourceValueSchema.optional(),
  // Lets a specific request's row be found directly — the trace-a-
  // request-end-to-end capability PROJECT_SPEC.md §20 describes.
  requestId: z.string().min(1).optional(),
});
export type RequestMetricsQuery = z.infer<typeof requestMetricsQuerySchema>;

/** Same `{ items, page, pageSize, total }` envelope as productListResponseSchema — one pagination convention across the API. */
export const requestMetricsResponseSchema = z.object({
  items: z.array(requestMetricSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type RequestMetricsResponse = z.infer<
  typeof requestMetricsResponseSchema
>;
