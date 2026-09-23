import {
  benchmarkListResponseSchema,
  benchmarkRunDetailSchema,
  type BenchmarkListQuery,
  type BenchmarkListResponse,
  type BenchmarkRunDetail,
  type BenchmarkRunRequest,
} from "@cacheforge/contracts";
import { apiRequest, type ApiResult } from "./client";

export async function runBenchmark(
  body: BenchmarkRunRequest,
): Promise<ApiResult<BenchmarkRunDetail>> {
  return apiRequest("/api/benchmarks/run", benchmarkRunDetailSchema, {
    method: "POST",
    body,
  });
}

export async function listBenchmarks(
  query: Partial<BenchmarkListQuery> = {},
): Promise<ApiResult<BenchmarkListResponse>> {
  return apiRequest("/api/benchmarks", benchmarkListResponseSchema, {
    query,
  });
}

export async function getBenchmark(
  id: string,
): Promise<ApiResult<BenchmarkRunDetail>> {
  return apiRequest(`/api/benchmarks/${id}`, benchmarkRunDetailSchema);
}
