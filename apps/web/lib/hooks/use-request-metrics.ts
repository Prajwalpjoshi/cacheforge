import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { RequestMetricsQuery } from "@cacheforge/contracts";
import { listRequestMetrics } from "@/lib/api/metrics";
import { queryKeys } from "@/lib/query-keys";

/**
 * `keepPreviousData` keeps the last page's rows on screen (instead of
 * blanking to a loading state) while a page/filter/search change is
 * in flight — callers distinguish the very first load (`isPending`)
 * from a subsequent refetch (`isFetching`) to show a subtle indicator
 * instead of clearing the table (PROJECT_SPEC.md §16).
 */
export function useRequestMetrics(query: Partial<RequestMetricsQuery>) {
  return useQuery({
    queryKey: queryKeys.requestMetrics(query),
    queryFn: () => listRequestMetrics(query),
    refetchInterval: 5_000,
    placeholderData: keepPreviousData,
  });
}
