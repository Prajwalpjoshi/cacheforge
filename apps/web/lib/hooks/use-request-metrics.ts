import { useQuery } from "@tanstack/react-query";
import { listRequestMetrics } from "@/lib/api/metrics";
import { queryKeys } from "@/lib/query-keys";

export function useRequestMetrics(limit: number) {
  return useQuery({
    queryKey: queryKeys.requestMetrics(limit),
    queryFn: () => listRequestMetrics({ limit }),
    refetchInterval: 5_000,
  });
}
