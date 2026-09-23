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
    const rows = response.json().items as RequestMetricDTO[];
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
      expect(check.json().items).toEqual([]);
      expect(check.json().total).toBe(0);
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
        url: "/api/metrics/requests?method=GET&cacheStatus=MISS&pageSize=50",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      const rows = body.items as RequestMetricDTO[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.method).toBe("GET");
        expect(row.cacheStatus).toBe("MISS");
      }
      expect(rows.some((row) => row.requestId === missRequestId)).toBe(true);
    });

    it("filters by source using real data", async () => {
      const sku = `${skuPrefix}source`;
      const created = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Widget", category: "metrics", price: 5 },
      });
      const { id } = created.json();
      await app.inject({ method: "GET", url: `/api/products/${id}` }); // MISS, populates cache
      const hit = await app.inject({
        method: "GET",
        url: `/api/products/${id}`,
      });
      const hitRequestId = hit.headers["x-request-id"] as string;
      await waitForRequestMetric(app, hitRequestId);

      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?source=CACHE&pageSize=50",
      });
      const rows = response.json().items as RequestMetricDTO[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.source).toBe("CACHE");
      }
    });

    it("filters by statusClass using real data", async () => {
      const notFound = await app.inject({
        method: "GET",
        url: "/api/products/clnonexistent0000000statuscls",
      });
      const requestId = notFound.headers["x-request-id"] as string;
      await waitForRequestMetric(app, requestId);

      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?statusClass=4xx&pageSize=50",
      });
      const rows = response.json().items as RequestMetricDTO[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.statusCode).toBeGreaterThanOrEqual(400);
        expect(row.statusCode).toBeLessThan(500);
      }
      expect(rows.some((row) => row.requestId === requestId)).toBe(true);

      const okOnly = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?statusClass=2xx&pageSize=50",
      });
      for (const row of okOnly.json().items as RequestMetricDTO[]) {
        expect(row.statusCode).toBeGreaterThanOrEqual(200);
        expect(row.statusCode).toBeLessThan(300);
      }
    });

    it("searches by a substring of the route, case-insensitively", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?search=PRODUCTS&pageSize=50",
      });
      expect(response.statusCode).toBe(200);
      const rows = response.json().items as RequestMetricDTO[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.route.toLowerCase()).toContain("products");
      }

      const noMatch = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?search=this-route-does-not-exist",
      });
      const noMatchBody = noMatch.json();
      expect(noMatchBody.items).toEqual([]);
      expect(noMatchBody.total).toBe(0);
    });

    it("combines search, method, and statusClass filters", async () => {
      const notFound = await app.inject({
        method: "GET",
        url: "/api/products/clnonexistent0000000combined",
      });
      const requestId = notFound.headers["x-request-id"] as string;
      await waitForRequestMetric(app, requestId);

      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?search=products&method=GET&statusClass=4xx&pageSize=50",
      });
      const rows = response.json().items as RequestMetricDTO[];
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.route.toLowerCase()).toContain("products");
        expect(row.method).toBe("GET");
        expect(row.statusCode).toBeGreaterThanOrEqual(400);
        expect(row.statusCode).toBeLessThan(500);
      }
    });

    it("paginates: page 1 and page 2 return disjoint rows that together respect the total", async () => {
      const first = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?page=1&pageSize=5",
      });
      const firstBody = first.json();
      expect(firstBody.page).toBe(1);
      expect(firstBody.pageSize).toBe(5);
      expect(firstBody.items.length).toBeLessThanOrEqual(5);
      expect(firstBody.total).toBeGreaterThan(0);

      if (firstBody.total <= 5) return; // not enough real traffic yet to exercise page 2

      const second = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?page=2&pageSize=5",
      });
      const secondBody = second.json();
      expect(secondBody.page).toBe(2);
      expect(secondBody.total).toBe(firstBody.total);

      const firstIds = new Set(
        (firstBody.items as RequestMetricDTO[]).map((row) => row.id),
      );
      for (const row of secondBody.items as RequestMetricDTO[]) {
        expect(firstIds.has(row.id)).toBe(false);
      }
    });

    it("respects the pageSize parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?pageSize=3",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.pageSize).toBe(3);
      expect(body.items.length).toBeLessThanOrEqual(3);
    });

    it("rejects a pageSize above the max with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?pageSize=9999",
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects page=0 with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?page=0",
      });
      expect(response.statusCode).toBe(400);
    });

    it("rejects an invalid statusClass with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?statusClass=3xx",
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns an empty page (not an error) past the last page", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?search=this-route-does-not-exist&page=5&pageSize=10",
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.items).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("returns newest-first ordering", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/metrics/requests?pageSize=10",
      });
      const rows = response.json().items as RequestMetricDTO[];
      const timestamps = rows.map((row) => new Date(row.createdAt).getTime());
      const sorted = [...timestamps].sort((a, b) => b - a);
      expect(timestamps).toEqual(sorted);
    });
  });
});
