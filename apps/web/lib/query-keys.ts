/** Centralized TanStack Query key factory so invalidation targets stay in sync with fetch call sites. */
export const queryKeys = {
  health: () => ["health"] as const,
  metricsSummary: (windowMinutes: number) =>
    ["metrics", "summary", windowMinutes] as const,
  requestMetrics: (limit: number) => ["metrics", "requests", limit] as const,
  cacheStats: () => ["cache", "stats"] as const,
  cacheKeys: (pattern: string | undefined) =>
    ["cache", "keys", pattern ?? null] as const,
  benchmarks: (limit: number) => ["benchmarks", "list", limit] as const,
  benchmark: (id: string) => ["benchmarks", "detail", id] as const,
};
