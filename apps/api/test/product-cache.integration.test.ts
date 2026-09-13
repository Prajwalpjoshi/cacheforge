import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

const runId = randomUUID().slice(0, 8);
const skuPrefix = `cache-test-${runId}-`;
const nextSku = (() => {
  let n = 0;
  return () => `${skuPrefix}${n++}`;
})();

async function createProduct(
  app: FastifyInstance,
  overrides: Partial<{
    sku: string;
    name: string;
    category: string;
    price: number;
  }> = {},
) {
  const response = await app.inject({
    method: "POST",
    url: "/api/products",
    payload: {
      sku: overrides.sku ?? nextSku(),
      name: overrides.name ?? "Cached Widget",
      category: overrides.category ?? "cache-test",
      price: overrides.price ?? 9.99,
    },
  });
  return response.json();
}

describe("Product cache-aside", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    await app.prisma.product.deleteMany({
      where: { sku: { startsWith: skuPrefix } },
    });
    await app.close();
  });

  describe("GET /api/products/:id", () => {
    it("MISSes on first read, HITs on second, and skips the database on the hit", async () => {
      const created = await createProduct(app);
      const findByIdSpy = vi.spyOn(app.prisma.product, "findUnique");

      const first = await app.inject({
        method: "GET",
        url: `/api/products/${created.id}`,
      });
      expect(first.statusCode).toBe(200);
      expect(first.headers["x-cache-status"]).toBe("MISS");
      expect(findByIdSpy).toHaveBeenCalledTimes(1);

      const second = await app.inject({
        method: "GET",
        url: `/api/products/${created.id}`,
      });
      expect(second.statusCode).toBe(200);
      expect(second.headers["x-cache-status"]).toBe("HIT");
      expect(second.json()).toEqual(first.json());
      // Still only the one call from the first (MISS) request.
      expect(findByIdSpy).toHaveBeenCalledTimes(1);
    });

    it("PUT invalidates the product cache so the next GET is a MISS again", async () => {
      const created = await createProduct(app);

      await app.inject({ method: "GET", url: `/api/products/${created.id}` });
      const hit = await app.inject({
        method: "GET",
        url: `/api/products/${created.id}`,
      });
      expect(hit.headers["x-cache-status"]).toBe("HIT");

      const updated = await app.inject({
        method: "PUT",
        url: `/api/products/${created.id}`,
        payload: { name: "Renamed Widget" },
      });
      expect(updated.statusCode).toBe(200);

      const afterUpdate = await app.inject({
        method: "GET",
        url: `/api/products/${created.id}`,
      });
      expect(afterUpdate.headers["x-cache-status"]).toBe("MISS");
      expect(afterUpdate.json().name).toBe("Renamed Widget");
    });

    it("DELETE invalidates the product cache", async () => {
      const created = await createProduct(app);

      await app.inject({ method: "GET", url: `/api/products/${created.id}` });
      const hit = await app.inject({
        method: "GET",
        url: `/api/products/${created.id}`,
      });
      expect(hit.headers["x-cache-status"]).toBe("HIT");

      const deleted = await app.inject({
        method: "DELETE",
        url: `/api/products/${created.id}`,
      });
      expect(deleted.statusCode).toBe(204);

      const afterDelete = await app.inject({
        method: "GET",
        url: `/api/products/${created.id}`,
      });
      expect(afterDelete.statusCode).toBe(404);
    });
  });

  describe("GET /api/products (list)", () => {
    it("MISSes on first read, HITs on an identical query", async () => {
      const category = `list-cache-${runId}`;
      await createProduct(app, { category });

      const first = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}&page=1&pageSize=10`,
      });
      expect(first.headers["x-cache-status"]).toBe("MISS");

      const second = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}&page=1&pageSize=10`,
      });
      expect(second.headers["x-cache-status"]).toBe("HIT");
      expect(second.json()).toEqual(first.json());
    });

    it("generates different cache keys for different queries", async () => {
      const category = `list-key-${runId}`;
      await createProduct(app, { category });

      const pageOne = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}&page=1&pageSize=10`,
      });
      const pageTwo = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}&page=2&pageSize=10`,
      });
      const differentCategory = await app.inject({
        method: "GET",
        url: `/api/products?category=other-${runId}&page=1&pageSize=10`,
      });

      // Each distinct query is a MISS the first time it's seen — none of
      // them collide with each other's cache entry.
      expect(pageOne.headers["x-cache-status"]).toBe("MISS");
      expect(pageTwo.headers["x-cache-status"]).toBe("MISS");
      expect(differentCategory.headers["x-cache-status"]).toBe("MISS");
    });

    it("product create invalidates existing list caches", async () => {
      const category = `list-invalidate-${runId}`;
      await createProduct(app, { category });

      const before = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}`,
      });
      expect(before.headers["x-cache-status"]).toBe("MISS");
      const beforeTotal = before.json().total;

      const cached = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}`,
      });
      expect(cached.headers["x-cache-status"]).toBe("HIT");

      await createProduct(app, { category });

      const after = await app.inject({
        method: "GET",
        url: `/api/products?category=${category}`,
      });
      expect(after.headers["x-cache-status"]).toBe("MISS");
      expect(after.json().total).toBe(beforeTotal + 1);
    });
  });
});
