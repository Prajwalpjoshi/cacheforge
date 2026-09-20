import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BenchmarkRunRequest } from "@cacheforge/contracts";
import {
  getBenchmark,
  listBenchmarks,
  runBenchmark,
} from "@/lib/api/benchmarks";
import { queryKeys } from "@/lib/query-keys";

const HISTORY_LIMIT = 20;

export function useBenchmarkHistory() {
  return useQuery({
    queryKey: queryKeys.benchmarks(HISTORY_LIMIT),
    queryFn: () => listBenchmarks(HISTORY_LIMIT),
  });
}

export function useBenchmarkDetail(id: string | null) {
  return useQuery({
    queryKey: queryKeys.benchmark(id ?? ""),
    queryFn: () => getBenchmark(id as string),
    enabled: id !== null,
  });
}

export function useRunBenchmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BenchmarkRunRequest) => runBenchmark(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.benchmarks(HISTORY_LIMIT),
      });
    },
  });
}
