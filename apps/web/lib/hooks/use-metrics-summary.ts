import { useQuery } from "@tanstack/react-query";
import { getMetricsSummary } from "@/lib/api/metrics";
import { queryKeys } from "@/lib/query-keys";

/** PROJECT_SPEC.md #12: 5s polling for the dashboard. */
export function useMetricsSummary(windowMinutes: number) {
  return useQuery({
    queryKey: queryKeys.metricsSummary(windowMinutes),
    queryFn: () => getMetricsSummary(windowMinutes),
    refetchInterval: 5_000,
  });
}
