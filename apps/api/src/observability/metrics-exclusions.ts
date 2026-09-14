/**
 * Routes excluded from RequestMetric persistence, to avoid the
 * observability/admin/benchmark surfaces polluting the very traffic
 * numbers they exist to report on:
 *
 * - `/api/health` — monitoring/orchestration pings, not product traffic
 *   (already excluded from rate limiting for the same reason).
 * - `/api/metrics/*` — viewing the dashboard would otherwise create a
 *   new metric row about viewing the dashboard, recursively.
 * - `/api/benchmarks/*` — a benchmark run's own HTTP request duration is
 *   dominated by however many iterations it ran, an outlier that would
 *   skew the real traffic's latency percentiles; the benchmark's
 *   *internal* repository/service calls never go through the HTTP
 *   pipeline at all, so they were never a risk of double-counting.
 * - `/api/cache/*` — developer/admin introspection, not product-catalog
 *   traffic.
 *
 * Everything else (currently: /api/products*) is real, measurable
 * product-catalog traffic and is persisted.
 */
const EXCLUDED_METRIC_ROUTE_PREFIXES = [
  "/api/health",
  "/api/metrics",
  "/api/benchmarks",
  "/api/cache",
];

export function shouldPersistMetricForRoute(route: string): boolean {
  return !EXCLUDED_METRIC_ROUTE_PREFIXES.some((prefix) =>
    route.startsWith(prefix),
  );
}
