import {
  benchmarkListResponseSchema,
  benchmarkRunDetailSchema,
  type BenchmarkRunDetail,
  type BenchmarkRunRequest,
  type BenchmarkRunSummary,
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
  limit?: number,
): Promise<ApiResult<BenchmarkRunSummary[]>> {
  return apiRequest("/api/benchmarks", benchmarkListResponseSchema, {
    query: { limit },
  });
}

export async function getBenchmark(
  id: string,
): Promise<ApiResult<BenchmarkRunDetail>> {
  return apiRequest(`/api/benchmarks/${id}`, benchmarkRunDetailSchema);
}
