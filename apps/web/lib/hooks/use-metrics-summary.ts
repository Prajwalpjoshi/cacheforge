import { useQuery } from "@tanstack/react-query";
import { getMetricsSummary } from "@/lib/api/metrics";
import { queryKeys } from "@/lib/query-keys";

/**
 * PROJECT_SPEC.md #12: 60s polling for the dashboard, visibility-aware —
 * `refetchIntervalInBackground` defaults to false (pauses while the tab
 * is hidden) and `refetchOnWindowFocus` is re-enabled here (off globally
 * in `lib/providers.tsx`) so returning to the tab triggers one immediate
 * refetch rather than waiting out the rest of the interval.
 */
export function useMetricsSummary(windowMinutes: number) {
  return useQuery({
    queryKey: queryKeys.metricsSummary(windowMinutes),
    queryFn: () => getMetricsSummary(windowMinutes),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
