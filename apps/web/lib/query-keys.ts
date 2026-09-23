import type { RequestMetricsQuery } from "@cacheforge/contracts";

/** Centralized TanStack Query key factory so invalidation targets stay in sync with fetch call sites. */
export const queryKeys = {
  health: () => ["health"] as const,
  metricsSummary: (windowMinutes: number) =>
    ["metrics", "summary", windowMinutes] as const,
  // The full query object (page, filters, search, ...) is the key, so
  // the chart's fixed unfiltered fetch and the Recent Requests table's
  // filtered/paginated fetch are cached and refetched independently —
  // changing the table's filters never touches the chart's data.
  requestMetrics: (query: Partial<RequestMetricsQuery>) =>
    ["metrics", "requests", query] as const,
  cacheStats: () => ["cache", "stats"] as const,
  cacheKeys: (pattern: string | undefined) =>
    ["cache", "keys", pattern ?? null] as const,
  benchmarks: (limit: number) => ["benchmarks", "list", limit] as const,
  benchmark: (id: string) => ["benchmarks", "detail", id] as const,
};
