import type {
  MetricsSummaryResponse,
  RequestMetricDTO,
  RequestMetricsQuery,
  RequestMetricsResponse,
} from "@cacheforge/contracts";
import type { RequestMetric } from "../generated/prisma/client.js";
import type {
  CreateRequestMetricData,
  MetricsRepository,
} from "../repositories/metrics.repository.js";

function toRequestMetricDTO(row: RequestMetric): RequestMetricDTO {
  return {
    id: row.id.toString(),
    requestId: row.requestId,
    method: row.method,
    route: row.route,
    statusCode: row.statusCode,
    durationMs: row.durationMs,
    cacheStatus: row.cacheStatus,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createMetricsService(repository: MetricsRepository) {
  return {
    /** Fire-and-forget from the request-completion hook; never throws. */
    async record(data: CreateRequestMetricData): Promise<void> {
      await repository.create(data);
    },

    async getSummary(windowMinutes: number): Promise<MetricsSummaryResponse> {
      const [summary, byRoute] = await Promise.all([
        repository.getSummary(windowMinutes),
        repository.getSummaryByRoute(windowMinutes),
      ]);

      const errorRate =
        summary.requestCount > 0
          ? summary.errorCount / summary.requestCount
          : 0;
      const cacheHitRate =
        summary.cacheApplicableCount > 0
          ? summary.hitCount / summary.cacheApplicableCount
          : null;

      return {
        windowMinutes,
        requestCount: summary.requestCount,
        errorRate,
        p50Ms: summary.p50Ms ?? 0,
        p95Ms: summary.p95Ms ?? 0,
        p99Ms: summary.p99Ms ?? 0,
        cacheHitRate,
        byRoute: byRoute.map((route) => ({
          route: route.route,
          method: route.method,
          requestCount: route.requestCount,
          errorRate:
            route.requestCount > 0 ? route.errorCount / route.requestCount : 0,
          p95Ms: route.p95Ms ?? 0,
        })),
      };
    },

    async listRequests(
      query: RequestMetricsQuery,
    ): Promise<RequestMetricsResponse> {
      const { items, total } = await repository.list(query);
      return {
        items: items.map(toRequestMetricDTO),
        page: query.page,
        pageSize: query.pageSize,
        total,
      };
    },
  };
}

export type MetricsService = ReturnType<typeof createMetricsService>;
