import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api/health";
import { queryKeys } from "@/lib/query-keys";

export function useHealth(refetchInterval = 10_000) {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval,
  });
}
