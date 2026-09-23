import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  BenchmarkListQuery,
  BenchmarkRunRequest,
} from "@cacheforge/contracts";
import {
  getBenchmark,
  listBenchmarks,
  runBenchmark,
} from "@/lib/api/benchmarks";
import { queryKeys } from "@/lib/query-keys";

/** Unfiltered single-row fetch backing the summary strip's "Total runs" and "Latest run/throughput" tiles — independent of whatever page/search/mode the History table below is showing. */
const SUMMARY_QUERY: Partial<BenchmarkListQuery> = { page: 1, pageSize: 1 };

/** `keepPreviousData` keeps the current page's rows on screen while a page/filter/search change is in flight, instead of flashing a loading state. */
export function useBenchmarkHistory(query: Partial<BenchmarkListQuery>) {
  return useQuery({
    queryKey: queryKeys.benchmarks(query),
    queryFn: () => listBenchmarks(query),
    placeholderData: keepPreviousData,
  });
}

export function useBenchmarkSummary() {
  return useQuery({
    queryKey: queryKeys.benchmarkSummary(),
    queryFn: () => listBenchmarks(SUMMARY_QUERY),
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
      // Invalidates every benchmarks query (history at any page/filter,
      // plus the summary strip) rather than just the currently-viewed
      // one, so a freshly run benchmark is reflected everywhere.
      void queryClient.invalidateQueries({ queryKey: ["benchmarks"] });
    },
  });
}
