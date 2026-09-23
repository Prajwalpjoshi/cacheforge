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
        url: "/api/benchmarks?pageSize=5",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(5);
      expect(typeof body.total).toBe("number");
      const rows = body.items;
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

    it("rejects a pageSize above the max with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?pageSize=9999",
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/benchmarks — pagination, search, and mode filtering", () => {
    const filterRunId = randomUUID().slice(0, 8);
    const dbLabel = `filter-db-${filterRunId}`;
    const cacheLabel = `filter-cache-${filterRunId}`;
    const comparisonLabel = `filter-cmp-${filterRunId}`;

    beforeAll(async () => {
      for (const [mode, label] of [
        ["DB_ONLY", dbLabel],
        ["CACHE_ONLY", cacheLabel],
        ["COMPARISON", comparisonLabel],
      ] as const) {
        const response = await app.inject({
          method: "POST",
          url: "/api/benchmarks/run",
          payload: {
            targetRoute: "products.get",
            mode,
            iterations: 5,
            label,
          },
        });
        expect(response.statusCode).toBe(201);
      }
    });

    it("returns the paginated envelope with a real total for a scoped search", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId}&pageSize=10`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(10);
      expect(body.total).toBe(3);
      expect(body.items).toHaveLength(3);
    });

    it("searches by label, case-insensitively", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId.toUpperCase()}`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.total).toBe(3);
      for (const item of body.items) {
        expect(item.label.toLowerCase()).toContain(filterRunId);
      }
    });

    it("searches by target route", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?search=products.get&pageSize=100",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.total).toBeGreaterThan(0);
      for (const item of body.items) {
        expect(item.targetRoute).toBe("products.get");
      }
    });

    it("filters by mode", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId}&mode=CACHE_ONLY`,
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.total).toBe(1);
      expect(body.items[0].mode).toBe("CACHE_ONLY");
      expect(body.items[0].label).toBe(cacheLabel);
    });

    it("combines search and mode filters", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId}&mode=DB_ONLY`,
      });
      const body = response.json();
      expect(body.total).toBe(1);
      expect(body.items[0].label).toBe(dbLabel);
    });

    it("paginates: page 1 and page 2 return disjoint rows honoring pageSize", async () => {
      const first = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId}&page=1&pageSize=2`,
      });
      const firstBody = first.json();
      expect(firstBody.items).toHaveLength(2);
      expect(firstBody.total).toBe(3);

      const second = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId}&page=2&pageSize=2`,
      });
      const secondBody = second.json();
      expect(secondBody.page).toBe(2);
      expect(secondBody.items).toHaveLength(1);

      const firstIds = new Set(
        firstBody.items.map((item: { id: string }) => item.id),
      );
      for (const item of secondBody.items as { id: string }[]) {
        expect(firstIds.has(item.id)).toBe(false);
      }
    });

    it("returns an empty page (not an error) when the search matches nothing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?search=this-label-does-not-exist-anywhere",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("defaults to page 1 with pageSize 20 when omitted", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/api/benchmarks?search=${filterRunId}`,
      });
      const body = response.json();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(20);
    });

    it("rejects an invalid mode with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?mode=BOGUS_MODE",
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects page=0 with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/benchmarks?page=0",
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
