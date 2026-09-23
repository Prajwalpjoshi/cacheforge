import {
  metricsSummaryResponseSchema,
  requestMetricsResponseSchema,
  type MetricsSummaryResponse,
  type RequestMetricsQuery,
  type RequestMetricsResponse,
} from "@cacheforge/contracts";
import { apiRequest, type ApiResult } from "./client";

export async function getMetricsSummary(
  windowMinutes?: number,
): Promise<ApiResult<MetricsSummaryResponse>> {
  return apiRequest("/api/metrics/summary", metricsSummaryResponseSchema, {
    query: { windowMinutes },
  });
}

export async function listRequestMetrics(
  query: Partial<RequestMetricsQuery> = {},
): Promise<ApiResult<RequestMetricsResponse>> {
  return apiRequest("/api/metrics/requests", requestMetricsResponseSchema, {
    query,
  });
}
