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
 *
 * Polling is visibility-aware: `refetchIntervalInBackground` defaults
 * to false (pauses while the tab is hidden) and `refetchOnWindowFocus`
 * is re-enabled here (off globally in `lib/providers.tsx`) so returning
 * to the tab triggers one immediate refetch rather than waiting out the
 * rest of the interval.
 */
export function useRequestMetrics(query: Partial<RequestMetricsQuery>) {
  return useQuery({
    queryKey: queryKeys.requestMetrics(query),
    queryFn: () => listRequestMetrics(query),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}
