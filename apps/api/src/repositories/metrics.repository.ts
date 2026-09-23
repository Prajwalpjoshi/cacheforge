import type {
  CacheStatus,
  DataSource,
  PrismaClient,
  RequestMetric,
} from "../generated/prisma/client.js";

export interface CreateRequestMetricData {
  requestId: string;
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
  cacheStatus: CacheStatus;
  source: DataSource;
}

export interface MetricsSummaryRow {
  requestCount: number;
  errorCount: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  hitCount: number;
  cacheApplicableCount: number;
}

export interface RouteMetricsRow {
  route: string;
  method: string;
  requestCount: number;
  errorCount: number;
  p95Ms: number | null;
}

export interface ListRequestMetricsParams {
  page: number;
  pageSize: number;
  windowMinutes?: number;
  route?: string;
  search?: string;
  method?: string;
  cacheStatus?: CacheStatus;
  statusClass?: "2xx" | "4xx" | "5xx";
  source?: DataSource;
  requestId?: string;
}

export interface ListRequestMetricsResult {
  items: RequestMetric[];
  total: number;
}

const STATUS_CLASS_RANGES: Record<"2xx" | "4xx" | "5xx", [number, number]> = {
  "2xx": [200, 300],
  "4xx": [400, 500],
  "5xx": [500, 600],
};

interface SummaryQueryRow {
  request_count: bigint;
  error_count: bigint;
  p50: number | null;
  p95: number | null;
  p99: number | null;
  hit_count: bigint;
  cache_applicable_count: bigint;
}

interface RouteQueryRow {
  route: string;
  method: string;
  request_count: bigint;
  error_count: bigint;
  p95: number | null;
}

/**
 * All aggregation happens in Postgres (count/percentile_cont/GROUP BY),
 * never by pulling rows into Node and computing in JavaScript — see
 * docs/performance.md for why percentile_cont (linear interpolation,
 * standard for observability dashboards) is used here specifically,
 * as distinct from the benchmark engine's nearest-rank method.
 */
export function createMetricsRepository(prisma: PrismaClient) {
  return {
    async create(data: CreateRequestMetricData): Promise<void> {
      await prisma.requestMetric.create({ data });
    },

    async getSummary(windowMinutes: number): Promise<MetricsSummaryRow> {
      const rows = await prisma.$queryRaw<SummaryQueryRow[]>`
        SELECT
          count(*) AS request_count,
          count(*) FILTER (WHERE "statusCode" >= 500) AS error_count,
          percentile_cont(0.5) WITHIN GROUP (ORDER BY "durationMs") AS p50,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") AS p95,
          percentile_cont(0.99) WITHIN GROUP (ORDER BY "durationMs") AS p99,
          count(*) FILTER (WHERE "cacheStatus" = 'HIT') AS hit_count,
          count(*) FILTER (WHERE "cacheStatus" IN ('HIT', 'MISS', 'BYPASS')) AS cache_applicable_count
        FROM "RequestMetric"
        WHERE "createdAt" >= NOW() - (${windowMinutes}::int * INTERVAL '1 minute')
      `;

      const row = rows[0];
      return {
        requestCount: Number(row?.request_count ?? 0n),
        errorCount: Number(row?.error_count ?? 0n),
        p50Ms: row?.p50 ?? null,
        p95Ms: row?.p95 ?? null,
        p99Ms: row?.p99 ?? null,
        hitCount: Number(row?.hit_count ?? 0n),
        cacheApplicableCount: Number(row?.cache_applicable_count ?? 0n),
      };
    },

    async getSummaryByRoute(windowMinutes: number): Promise<RouteMetricsRow[]> {
      const rows = await prisma.$queryRaw<RouteQueryRow[]>`
        SELECT
          route,
          method,
          count(*) AS request_count,
          count(*) FILTER (WHERE "statusCode" >= 500) AS error_count,
          percentile_cont(0.95) WITHIN GROUP (ORDER BY "durationMs") AS p95
        FROM "RequestMetric"
        WHERE "createdAt" >= NOW() - (${windowMinutes}::int * INTERVAL '1 minute')
        GROUP BY route, method
        ORDER BY count(*) DESC
      `;

      return rows.map((row) => ({
        route: row.route,
        method: row.method,
        requestCount: Number(row.request_count),
        errorCount: Number(row.error_count),
        p95Ms: row.p95,
      }));
    },

    async list(
      params: ListRequestMetricsParams,
    ): Promise<ListRequestMetricsResult> {
      const where: Record<string, unknown> = {};

      if (params.windowMinutes !== undefined) {
        where.createdAt = {
          gte: new Date(Date.now() - params.windowMinutes * 60_000),
        };
      }
      // `search` (substring, case-insensitive) takes precedence over the
      // exact-match `route` param when both are somehow given — neither
      // is backed by an index (no pg_trgm/GIN index on `route`), so this
      // is a sequential scan under the window/other filters. Acceptable
      // at this project's data volume; documented here rather than
      // adding a migration for a UI-focused task (PROJECT_SPEC.md scope).
      if (params.search) {
        where.route = { contains: params.search, mode: "insensitive" };
      } else if (params.route) {
        where.route = params.route;
      }
      if (params.method) where.method = params.method;
      if (params.cacheStatus) where.cacheStatus = params.cacheStatus;
      if (params.statusClass) {
        const [gte, lt] = STATUS_CLASS_RANGES[params.statusClass];
        where.statusCode = { gte, lt };
      }
      if (params.source) where.source = params.source;
      if (params.requestId) where.requestId = params.requestId;

      const [items, total] = await Promise.all([
        prisma.requestMetric.findMany({
          where,
          // createdAt DESC alone isn't strictly deterministic across
          // requests recorded in the same millisecond; the
          // autoincrement id breaks ties so pagination never skips or
          // repeats a row across pages (PROJECT_SPEC.md §12).
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        prisma.requestMetric.count({ where }),
      ]);

      return { items, total };
    },
  };
}

export type MetricsRepository = ReturnType<typeof createMetricsRepository>;
