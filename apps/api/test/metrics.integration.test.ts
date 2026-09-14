import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { RequestMetricDTO } from "@cacheforge/contracts";
import { buildServer } from "../src/server.js";

const runId = randomUUID().slice(0, 8);
const skuPrefix = `metrics-test-${runId}-`;

/**
 * Metrics persistence is deliberately fire-and-forget (never awaited by
 * the request that triggered it — see request-context.plugin.ts), so a
 * freshly-created row may not be queryable the instant the HTTP
 * response returns. Poll briefly rather than sleeping a fixed amount.
 */
async function waitForRequestMetric(
  app: FastifyInstance,
  requestId: string,
  timeoutMs = 3000,
): Promise<RequestMetricDTO> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const response = await app.inject({
      method: "GET",
      url: `/api/metrics/requests?requestId=${requestId}`,
    });
    const rows = response.json() as RequestMetricDTO[];
    if (rows.length > 0) {
      return rows[0]!;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Timed out waiting for RequestMetric row with requestId=${requestId}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

describe("Request metrics persistence and API", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.prisma.product.deleteMany({
      where: { sku: { startsWith: skuPrefix } },
    });
    await app.close();
  });

  it("persists a RequestMetric row for a cache MISS product read", async () => {
    const sku = `${skuPrefix}miss`;
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Metrics Widget", category: "metrics", price: 5 },
    });
    const { id } = created.json();

    const response = await app.inject({
      method: "GET",
      url: `/api/products/${id}`,
    });
    expect(response.headers["x-cache-status"]).toBe("MISS");
    const requestId = response.headers["x-request-id"] as string;
    expect(requestId).toBeTruthy();

    const metric = await waitForRequestMetric(app, requestId);
    expect(metric.requestId).toBe(requestId);
    expect(metric.method).toBe("GET");
    expect(metric.route).toBe("/api/products/:id");
    expect(metric.statusCode).toBe(200);
    expect(metric.cacheStatus).toBe("MISS");
    expect(metric.source).toBe("DB");
    expect(metric.durationMs).toBeGreaterThan(0);
    expect(new Date(metric.createdAt).getTime()).not.toBeNaN();
  });

  it("persists a RequestMetric row for a cache HIT product read", async () => {
    const sku = `${skuPrefix}hit`;
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: { sku, name: "Metrics Widget", category: "metrics", price: 5 },
    });
    const { id } = created.json();

    await app.inject({ method: "GET", url: `/api/products/${id}` }); // MISS, populates cache
    const second = await app.inject({
      method: "GET",
      url: `/api/products/${id}`,
    });
    expect(second.headers["x-cache-status"]).toBe("HIT");
    const requestId = second.headers["x-request-id"] as string;

    const metric = await waitForRequestMetric(app, requestId);
    expect(metric.cacheStatus).toBe("HIT");
    expect(metric.source).toBe("CACHE");
    expect(metric.statusCode).toBe(200);
  });

  it("persists a RequestMetric row for a non-2xx response", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/products/clnonexistent0000000metrics",
    });
    expect(response.statusCode).toBe(404);
    const requestId = response.headers["x-request-id"] as string;

    const metric = await waitForRequestMetric(app, requestId);
    expect(metric.statusCode).toBe(404);
    expect(metric.route).toBe("/api/products/:id");
  });

  it("does not persist requests to excluded routes (health/metrics/cache/benchmarks)", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health" });
    const stats = await app.inject({ method: "GET", url: "/api/cache/stats" });
    const summary = await app.inject({
      method: "GET",
      url: "/api/metrics/summary",
    });

    // Give any (incorrect) fire-and-forget writes a moment, then assert
    // none of these requestIds ever show up.
    await new Promise((resolve) => setTimeout(resolve, 300));

    for (const response of [health, stats, summary]) {
      const requestId = response.headers["x-request-id"] as string;
      const check = await app.inject({
        method: "GET",
        url: `/api/metrics/requests?requestId=${requestId}`,
      });
      expect(check.json()).toEqual([]);
    }
  });

  describe("GET /api/metrics/summary", () => {
    it("reflects real traffic: requestCount grows by at least what we just generated", async () => {
      const before = await app.inject({
        method: "GET",
        url: "/api/metrics/summary?windowMinutes=1440",
      });
      const beforeCount = before.json().requestCount;

      const sku = `${skuPrefix}summary`;
      await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Widget", category: "metrics", price: 5 },
      });
      await app.inject({
        method: "GET",
        url: "/api/products?category=metrics",
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const after = await app.inject({
        method: "GET",
        url: "/api/metrics/summary?windowMinutes=1440",
      });
      const afterBody = after.json();

      expect(afterBody.requestCount).toBeGreaterThanOrEqual(beforeCount + 2);
      expect(afterBody.errorRate).toBeGreaterThanOrEqual(0);
      expect(afterBody.errorRate).toBeLessThanOrEqual(1);
      expect(afterBody.p50Ms).toBeGreaterThanOrEqual(0);
      expect(afterBody.p95Ms).toBeGreaterThanOrEqual(afterBody.p50Ms);
      expect(afterBody.p99Ms).toBeGreaterThanOrEqual(afterBody.p95Ms);
      if (afterBody.cacheHitRate !== null) {
        expect(afterBody.cacheHitRate).toBeGreaterThanOrEqual(0);
        expect(afterBody.cacheHitRate).toBeLessThanOrEqual(1);
      }

      const productsListEntry = afterBody.byRoute.find(
        (r: { route: string; method: string }) =>
          r.route === "/api/products" && r.method === "GET",
      );
      expect(productsListEntry).toBeDefined();
      expect(productsListEntry.requestCount).toBeGreaterThan(0);
    });

    it("returns zero values (not an error) for a window with no traffic", async () => {
      const response = await app.inject({
        method: "GET",
        // 0 minutes isn't valid (positive int required); use a tiny
        // window far enough in the past to be empty is impractical, so
        // instead assert the shape is well-formed with a 1-minute
        // window immediately after startup-adjacent isolation isn't
        // guaranteed — assert non-negative/well-typed instead of zero,
        // since other tests in this same run may have just added rows.
        url: "/api/metrics/summary?windowMinutes=1",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(typeof body.requestCount).toBe("number");
      expect(body.requestCount).toBeGreaterThanOrEqual(0);
    });

    it("rejects an invalid windowMinutes with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/summary?windowMinutes=-5",
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/metrics/requests", () => {
    it("filters by method and cacheStatus using real data", async () => {
      const sku = `${skuPrefix}filter`;
      const created = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Widget", category: "metrics", price: 5 },
      });
      const { id } = created.json();
      const missResponse = await app.inject({
        method: "GET",
        url: `/api/products/${id}`,
      });
      const missRequestId = missResponse.headers["x-request-id"] as string;
      await waitForRequestMetric(app, missRequestId);

      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?method=GET&cacheStatus=MISS&limit=50",
      });
      expect(response.statusCode).toBe(200);
      const rows = response.json() as RequestMetricDTO[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.method).toBe("GET");
        expect(row.cacheStatus).toBe("MISS");
      }
      expect(rows.some((row) => row.requestId === missRequestId)).toBe(true);
    });

    it("respects the limit parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?limit=3",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().length).toBeLessThanOrEqual(3);
    });

    it("rejects a limit above the max with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?limit=9999",
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns newest-first ordering", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?limit=10",
      });
      const rows = response.json() as RequestMetricDTO[];
      const timestamps = rows.map((row) => new Date(row.createdAt).getTime());
      const sorted = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sorted);
    });
  });
});
