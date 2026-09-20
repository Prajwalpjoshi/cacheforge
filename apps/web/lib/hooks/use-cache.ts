import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteCacheKey, getCacheStats, listCacheKeys } from "@/lib/api/cache";
import { queryKeys } from "@/lib/query-keys";

export function useCacheStats() {
  return useQuery({
    queryKey: queryKeys.cacheStats(),
    queryFn: () => getCacheStats(),
    refetchInterval: 5_000,
  });
}

export function useCacheKeys(pattern: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.cacheKeys(pattern),
    queryFn: ({ pageParam }) => listCacheKeys(pageParam, pattern),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.data.nextCursor ?? undefined,
    refetchInterval: 5_000,
  });
}

export function useDeleteCacheKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deleteCacheKey(key),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cache"] });
    },
  });
}
