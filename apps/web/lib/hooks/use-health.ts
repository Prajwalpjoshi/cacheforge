import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api/health";
import { queryKeys } from "@/lib/query-keys";

/**
 * Visibility-aware polling: `refetchIntervalInBackground` defaults to
 * false, so the interval above already pauses while the tab is hidden;
 * `refetchOnWindowFocus` (globally off in `lib/providers.tsx`) is
 * re-enabled here so returning to a visible tab triggers one immediate
 * refetch instead of waiting out the rest of the interval.
 */
export function useHealth(refetchInterval = 60_000) {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: ({ signal }) => getHealth(signal),
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}
