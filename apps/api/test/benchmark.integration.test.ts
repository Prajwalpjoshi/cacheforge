import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

const runId = randomUUID().slice(0, 8);
const skuPrefix = `benchmark-test-${runId}-`;

describe("Benchmark engine", () => {
  let app: FastifyInstance;
  let productId: string;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();

    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: {
        sku: `${skuPrefix}0`,
        name: "Benchmark Target",
        category: "benchmark",
        price: 9.99,
      },
    });
    productId = created.json().id;
  });

  afterAll(async () => {
    await app.prisma.product.deleteMany({
      where: { sku: { startsWith: skuPrefix } },
    });
    await app.close();
  });

  describe("DB_ONLY", () => {
    it("executes real Postgres queries, computes real stats, and persists the run", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "DB_ONLY",
          iterations: 20,
          concurrency: 1,
          label: `db-only-${runId}`,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.mode).toBe("DB_ONLY");
      expect(body.iterations).toBe(20);
      expect(body.cacheHitRate).toBeNull();
      expect(body.comparison).toBeNull();
      expect(Array.isArray(body.latenciesMs)).toBe(true);
      expect(body.latenciesMs).toHaveLength(20);
      // Every sample is a real, positive measured duration, not a
      // fabricated/hardcoded value.
      for (const sample of body.latenciesMs) {
        expect(sample).toBeGreaterThan(0);
      }
      expect(body.minMs).toBeGreaterThan(0);
      expect(body.maxMs).toBeGreaterThanOrEqual(body.minMs);
      expect(body.avgMs).toBeGreaterThan(0);
      expect(body.p50Ms).toBeGreaterThan(0);
      expect(body.p95Ms).toBeGreaterThanOrEqual(body.p50Ms);
      expect(body.p99Ms).toBeGreaterThanOrEqual(body.p95Ms);
      expect(body.throughputRps).toBeGreaterThan(0);

      const stored = await app.prisma.benchmarkRun.findUnique({
        where: { id: body.id },
      });
      expect(stored).not.toBeNull();
      expect(stored?.mode).toBe("DB_ONLY");
      expect(Array.isArray(stored?.rawLatenciesMs)).toBe(true);
      expect((stored?.rawLatenciesMs as number[]).length).toBe(20);
    });

    it("respects bounded concurrency (concurrency=5 still runs all iterations)", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "DB_ONLY",
          iterations: 15,
          concurrency: 5,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().latenciesMs).toHaveLength(15);
    });

    it("works for the products.list target", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.list",
          mode: "DB_ONLY",
          iterations: 10,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.targetRoute).toBe("products.list");
      expect(body.latenciesMs).toHaveLength(10);
    });
  });

  describe("CACHE_ONLY", () => {
    it("executes the real cache-aside path and reports a real (not assumed-100%) hit rate", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "CACHE_ONLY",
          iterations: 20,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.mode).toBe("CACHE_ONLY");
      expect(body.cacheHitRate).not.toBeNull();
      // Deliberate cold start (warmCacheFromCold): iteration 1 is a real
      // MISS, so with 20 iterations the hit rate must be < 100%, not an
      // assumed/hardcoded 1.0.
      expect(body.cacheHitRate).toBeLessThan(1);
      expect(body.cacheHitRate).toBeGreaterThan(0);
      expect(body.cacheHitRate).toBeCloseTo(19 / 20, 5);

      expect(body.latenciesMs).toHaveLength(20);
      for (const sample of body.latenciesMs) {
        expect(sample).toBeGreaterThan(0);
      }
    });

    // The 503-when-Redis-is-down precondition is covered in
    // benchmark-preconditions.test.ts against a deliberately broken
    // cache-kit client with reconnectStrategy: false — building a full
    // buildServer() around an unreachable Redis here would take many
    // seconds (redis.plugin.ts's default reconnect strategy keeps
    // retrying in the background even after the bounded connectTimeout
    // rejects the initial attempt), for no extra coverage.
  });

  describe("COMPARISON", () => {
    it("runs both DB_ONLY and CACHE_ONLY and computes improvement only from measured values", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "COMPARISON",
          iterations: 15,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();

      expect(body.mode).toBe("COMPARISON");
      expect(body.latenciesMs).toBeNull();
      expect(body.comparison).not.toBeNull();

      const { comparison } = body;
      expect(comparison.dbOnly.latenciesMs).toHaveLength(15);
      expect(comparison.cacheOnly.latenciesMs).toHaveLength(15);
      expect(comparison.dbOnly.cacheHitRate).toBeNull();
      expect(comparison.cacheOnly.cacheHitRate).toBeGreaterThan(0);

      // Both sides' stats are independently recomputed from their own
      // raw samples — sanity-check internal consistency rather than a
      // specific magnitude (real local timing varies run to run).
      expect(comparison.dbOnly.stats.p95Ms).toBeGreaterThanOrEqual(
        comparison.dbOnly.stats.p50Ms,
      );
      expect(comparison.cacheOnly.stats.p95Ms).toBeGreaterThanOrEqual(
        comparison.cacheOnly.stats.p50Ms,
      );

      // Improvement percentages must be finite numbers (or null),
      // never fabricated placeholders.
      for (const key of [
        "latencyImprovementPct",
        "p95ImprovementPct",
        "throughputImprovementPct",
      ] as const) {
        if (comparison[key] !== null) {
          expect(Number.isFinite(comparison[key])).toBe(true);
        }
      }

      // Top-level summary fields mirror the cache-only ("headline") side.
      expect(body.throughputRps).toBeCloseTo(
        comparison.cacheOnly.stats.throughputRps,
        5,
      );
    });
  });

  describe("validation", () => {
    it("rejects iterations above the cap with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "DB_ONLY",
          iterations: 1001,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects concurrency above the cap with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "DB_ONLY",
          iterations: 10,
          concurrency: 21,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects zero/negative iterations with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "DB_ONLY",
          iterations: 0,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects an unsupported mode with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "BOGUS_MODE",
          iterations: 10,
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects an unsupported target route with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.delete",
          mode: "DB_ONLY",
          iterations: 10,
        },
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/benchmarks and /api/benchmarks/:id", () => {
    it("lists recent runs newest-first, without raw latency arrays", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?limit=5",
      });
      expect(response.statusCode).toBe(200);
      const rows = response.json();
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0]).not.toHaveProperty("latenciesMs");
      expect(rows[0]).not.toHaveProperty("comparison");

      const timestamps = rows.map((r: { createdAt: string }) =>
        new Date(r.createdAt).getTime(),
      );
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
    });

    it("returns full detail for a specific run", async () => {
      const created = await app.inject({
        method: "POST",
        url: "/api/benchmarks/run",
        payload: {
          targetRoute: "products.get",
          mode: "DB_ONLY",
          iterations: 5,
        },
      });
      const { id } = created.json();

      const response = await app.inject({
        method: "GET",
        url: `/api/benchmarks/${id}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(id);
      expect(response.json().latenciesMs).toHaveLength(5);
    });

    it("returns 404 for an unknown benchmark id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks/clnonexistentbenchmark00000",
      });
      expect(response.statusCode).toBe(404);
    });

    it("rejects a limit above the max with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?limit=9999",
      });
      expect(response.statusCode).toBe(400);
    });
  });

  it("does not create, update, or delete products while benchmarking (isolation)", async () => {
    const before = await app.prisma.product.count();

    await app.inject({
      method: "POST",
      url: "/api/benchmarks/run",
      payload: {
        targetRoute: "products.get",
        mode: "COMPARISON",
        iterations: 10,
      },
    });

    const after = await app.prisma.product.count();
    expect(after).toBe(before);

    const target = await app.prisma.product.findUnique({
      where: { id: productId },
    });
    expect(target?.sku).toBe(`${skuPrefix}0`);
  });
});
