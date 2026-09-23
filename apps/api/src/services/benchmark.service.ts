import { BenchmarkMode } from "../generated/prisma/client.js";
import type { BenchmarkRun as PrismaBenchmarkRun } from "../generated/prisma/client.js";
import type { Cache, RedisClientLike } from "@cacheforge/cache-kit";
import type {
  BenchmarkListQuery,
  BenchmarkListResponse,
  BenchmarkRunDetail,
  BenchmarkRunRequest,
  BenchmarkRunSummary,
  BenchmarkTargetRoute,
} from "@cacheforge/contracts";
import {
  BadRequestError,
  NotFoundError,
  ServiceUnavailableError,
} from "../errors.js";
import { runWithConcurrency } from "../benchmark/concurrency.js";
import {
  calculateLatencyStats,
  type LatencyStats,
} from "../benchmark/percentiles.js";
import { PRODUCT_LIST_TAG, productKey } from "../cache/keys.js";
import type { ProductRepository } from "../repositories/product.repository.js";
import type {
  BenchmarkRepository,
  CreateBenchmarkRunData,
} from "../repositories/benchmark.repository.js";
import type { ProductService } from "./product.service.js";

const DEFAULT_LIST_QUERY = { page: 1, pageSize: 20 } as const;

type WorkloadContext =
  | { kind: "products.get"; productId: string }
  | {
      kind: "products.list";
      listQuery: { page: number; pageSize: number; category?: string };
    };

interface SideRunResult {
  latenciesMs: number[];
  throughputRps: number;
  cacheHitRate: number | null;
}

interface ComparisonRawJson {
  dbOnly: { latenciesMs: number[]; throughputRps: number };
  cacheOnly: {
    latenciesMs: number[];
    throughputRps: number;
    hits: number;
    total: number;
  };
}

function isComparisonRawJson(value: unknown): value is ComparisonRawJson {
  return (
    typeof value === "object" &&
    value !== null &&
    "dbOnly" in value &&
    "cacheOnly" in value
  );
}

function improvementPct(before: number, after: number): number | null {
  if (before <= 0) {
    return null;
  }
  return ((before - after) / before) * 100;
}

export interface BenchmarkServiceDeps {
  productRepository: ProductRepository;
  productService: ProductService;
  cache: Cache;
  redis: RedisClientLike;
  repository: BenchmarkRepository;
}

/**
 * Benchmark controller -> this service -> Product service/repository/
 * cache -> Postgres/Redis. Reuses the real application data-access
 * path (productRepository for DB_ONLY, productService for CACHE_ONLY)
 * rather than a second implementation of product business logic —
 * PROJECT_SPEC.md §11/§13.
 */
export function createBenchmarkService(deps: BenchmarkServiceDeps) {
  const { productRepository, productService, cache, redis, repository } = deps;

  async function resolveWorkloadContext(
    targetRoute: BenchmarkTargetRoute,
  ): Promise<WorkloadContext> {
    if (targetRoute === "products.get") {
      const { items } = await productRepository.list({ page: 1, pageSize: 1 });
      const product = items[0];
      if (!product) {
        throw new BadRequestError(
          'No products exist to benchmark against "products.get". Create at least one product first — benchmarks never create/update/delete products themselves (PROJECT_SPEC.md §25).',
        );
      }
      return { kind: "products.get", productId: product.id };
    }
    return { kind: "products.list", listQuery: { ...DEFAULT_LIST_QUERY } };
  }

  async function ensureRedisAvailable(): Promise<void> {
    try {
      if (!redis.isOpen) {
        throw new Error("redis client is not open");
      }
      await redis.ping();
    } catch {
      throw new ServiceUnavailableError(
        "Redis is unavailable; CACHE_ONLY/COMPARISON benchmarks require it to measure anything meaningful (PROJECT_SPEC.md §10).",
      );
    }
  }

  async function runDbOnlyIteration(ctx: WorkloadContext): Promise<number> {
    const start = process.hrtime.bigint();
    if (ctx.kind === "products.get") {
      await productRepository.findById(ctx.productId);
    } else {
      await productRepository.list(ctx.listQuery);
    }
    return Number(process.hrtime.bigint() - start) / 1_000_000;
  }

  async function runCacheOnlyIteration(
    ctx: WorkloadContext,
  ): Promise<{ latencyMs: number; hit: boolean }> {
    const start = process.hrtime.bigint();
    const cacheStatus =
      ctx.kind === "products.get"
        ? (await productService.getById(ctx.productId)).cacheStatus
        : (await productService.list(ctx.listQuery)).cacheStatus;
    const latencyMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    return { latencyMs, hit: cacheStatus === "HIT" };
  }

  /**
   * Deliberate, documented cold start (PROJECT_SPEC.md §26): always
   * invalidates the target's cache entry first, so iteration 1 is a
   * guaranteed real MISS (populating the cache) and every iteration
   * after it is a real HIT — never a silent mix of whatever happened
   * to already be cached from unrelated prior traffic.
   */
  async function warmCacheFromCold(ctx: WorkloadContext): Promise<void> {
    if (ctx.kind === "products.get") {
      await cache.delete(productKey(ctx.productId));
    } else {
      await cache.invalidateTag(PRODUCT_LIST_TAG);
    }
  }

  async function runDbOnly(
    ctx: WorkloadContext,
    iterations: number,
    concurrency: number,
  ): Promise<SideRunResult> {
    const wallStart = process.hrtime.bigint();
    const latenciesMs = await runWithConcurrency(iterations, concurrency, () =>
      runDbOnlyIteration(ctx),
    );
    const wallSeconds = Number(process.hrtime.bigint() - wallStart) / 1e9;

    return {
      latenciesMs,
      throughputRps: wallSeconds > 0 ? iterations / wallSeconds : 0,
      cacheHitRate: null,
    };
  }

  async function runCacheOnly(
    ctx: WorkloadContext,
    iterations: number,
    concurrency: number,
  ): Promise<SideRunResult> {
    await warmCacheFromCold(ctx);

    const wallStart = process.hrtime.bigint();
    const results = await runWithConcurrency(iterations, concurrency, () =>
      runCacheOnlyIteration(ctx),
    );
    const wallSeconds = Number(process.hrtime.bigint() - wallStart) / 1e9;
    const hits = results.filter((result) => result.hit).length;

    return {
      latenciesMs: results.map((result) => result.latencyMs),
      throughputRps: wallSeconds > 0 ? iterations / wallSeconds : 0,
      cacheHitRate: iterations > 0 ? hits / iterations : null,
    };
  }

  function toSummary(row: PrismaBenchmarkRun): BenchmarkRunSummary {
    return {
      id: row.id,
      label: row.label,
      targetRoute: row.targetRoute,
      mode: row.mode,
      iterations: row.iterations,
      concurrency: row.concurrency,
      minMs: row.minMs,
      maxMs: row.maxMs,
      avgMs: row.avgMs,
      p50Ms: row.p50Ms,
      p95Ms: row.p95Ms,
      p99Ms: row.p99Ms,
      throughputRps: row.throughputRps,
      cacheHitRate: row.cacheHitRate,
      createdAt: row.createdAt.toISOString(),
    };
  }

  function toDetail(row: PrismaBenchmarkRun): BenchmarkRunDetail {
    const summary = toSummary(row);

    if (
      row.mode === BenchmarkMode.COMPARISON &&
      isComparisonRawJson(row.rawLatenciesMs)
    ) {
      const json = row.rawLatenciesMs;
      const dbStats = calculateLatencyStats(json.dbOnly.latenciesMs);
      const cacheStats = calculateLatencyStats(json.cacheOnly.latenciesMs);
      const cacheHitRate =
        json.cacheOnly.total > 0
          ? json.cacheOnly.hits / json.cacheOnly.total
          : null;

      const dbSide: LatencyStats & { throughputRps: number } = {
        ...dbStats,
        throughputRps: json.dbOnly.throughputRps,
      };
      const cacheSide: LatencyStats & { throughputRps: number } = {
        ...cacheStats,
        throughputRps: json.cacheOnly.throughputRps,
      };

      return {
        ...summary,
        latenciesMs: null,
        comparison: {
          dbOnly: {
            latenciesMs: json.dbOnly.latenciesMs,
            stats: dbSide,
            cacheHitRate: null,
          },
          cacheOnly: {
            latenciesMs: json.cacheOnly.latenciesMs,
            stats: cacheSide,
            cacheHitRate,
          },
          latencyImprovementPct: improvementPct(
            dbStats.avgMs,
            cacheStats.avgMs,
          ),
          p95ImprovementPct: improvementPct(dbStats.p95Ms, cacheStats.p95Ms),
          throughputImprovementPct:
            json.dbOnly.throughputRps > 0
              ? ((json.cacheOnly.throughputRps - json.dbOnly.throughputRps) /
                  json.dbOnly.throughputRps) *
                100
              : null,
        },
      };
    }

    return {
      ...summary,
      latenciesMs: Array.isArray(row.rawLatenciesMs)
        ? (row.rawLatenciesMs as number[])
        : [],
      comparison: null,
    };
  }

  return {
    async run(input: BenchmarkRunRequest): Promise<BenchmarkRunDetail> {
      const ctx = await resolveWorkloadContext(input.targetRoute);

      if (input.mode !== "DB_ONLY") {
        await ensureRedisAvailable();
      }

      let createData: CreateBenchmarkRunData;

      if (input.mode === "COMPARISON") {
        const dbOnly = await runDbOnly(
          ctx,
          input.iterations,
          input.concurrency,
        );
        const cacheOnly = await runCacheOnly(
          ctx,
          input.iterations,
          input.concurrency,
        );
        const cacheStats = calculateLatencyStats(cacheOnly.latenciesMs);

        createData = {
          label: input.label ?? null,
          targetRoute: input.targetRoute,
          mode: BenchmarkMode.COMPARISON,
          iterations: input.iterations,
          concurrency: input.concurrency,
          ...cacheStats,
          throughputRps: cacheOnly.throughputRps,
          cacheHitRate: cacheOnly.cacheHitRate,
          rawLatenciesMs: {
            dbOnly: {
              latenciesMs: dbOnly.latenciesMs,
              throughputRps: dbOnly.throughputRps,
            },
            cacheOnly: {
              latenciesMs: cacheOnly.latenciesMs,
              throughputRps: cacheOnly.throughputRps,
              hits: Math.round(
                (cacheOnly.cacheHitRate ?? 0) * input.iterations,
              ),
              total: input.iterations,
            },
          } satisfies ComparisonRawJson,
        };
      } else {
        const sideResult =
          input.mode === "DB_ONLY"
            ? await runDbOnly(ctx, input.iterations, input.concurrency)
            : await runCacheOnly(ctx, input.iterations, input.concurrency);
        const stats = calculateLatencyStats(sideResult.latenciesMs);

        createData = {
          label: input.label ?? null,
          targetRoute: input.targetRoute,
          mode:
            input.mode === "DB_ONLY"
              ? BenchmarkMode.DB_ONLY
              : BenchmarkMode.CACHE_ONLY,
          iterations: input.iterations,
          concurrency: input.concurrency,
          ...stats,
          throughputRps: sideResult.throughputRps,
          cacheHitRate: sideResult.cacheHitRate,
          rawLatenciesMs: sideResult.latenciesMs,
        };
      }

      const row = await repository.create(createData);
      return toDetail(row);
    },

    async getById(id: string): Promise<BenchmarkRunDetail> {
      const row = await repository.findById(id);
      if (!row) {
        throw new NotFoundError(`Benchmark run "${id}" not found`);
      }
      return toDetail(row);
    },

    async list(query: BenchmarkListQuery): Promise<BenchmarkListResponse> {
      const { items, total } = await repository.list(query);
      return {
        items: items.map(toSummary),
        page: query.page,
        pageSize: query.pageSize,
        total,
      };
    },
  };
}

export type BenchmarkService = ReturnType<typeof createBenchmarkService>;
