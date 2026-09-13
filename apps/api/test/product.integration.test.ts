import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  productSchema,
  productListResponseSchema,
} from "@cacheforge/contracts";
import { buildServer } from "../src/server.js";

const runId = randomUUID().slice(0, 8);
const skuPrefix = `test-${runId}-`;
const nextSku = (() => {
  let n = 0;
  return () => `${skuPrefix}${n++}`;
})();

describe("Product CRUD", () => {
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

  describe("POST /api/products", () => {
    it("creates a product with valid input", async () => {
      const sku = nextSku();
      const response = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: {
          sku,
          name: "Widget",
          category: "widgets",
          price: 19.99,
          stock: 5,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(() => productSchema.parse(body)).not.toThrow();
      expect(body.sku).toBe(sku);
      expect(body.price).toBe(19.99);
      expect(body.stock).toBe(5);
    });

    it("defaults stock to 0 when omitted", async () => {
      const sku = nextSku();
      const response = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Widget", category: "widgets", price: 5 },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().stock).toBe(0);
    });

    it("rejects an invalid payload with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { name: "Missing sku and price" },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().statusCode).toBe(400);
    });

    it("rejects a non-positive price with 400", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: {
          sku: nextSku(),
          name: "Widget",
          category: "widgets",
          price: 0,
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it("rejects a duplicate sku with 409", async () => {
      const sku = nextSku();
      const first = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Widget", category: "widgets", price: 10 },
      });
      expect(first.statusCode).toBe(201);

      const second = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: {
          sku,
          name: "Widget Again",
          category: "widgets",
          price: 12,
        },
      });

      expect(second.statusCode).toBe(409);
    });
  });

  describe("GET /api/products/:id and /api/products", () => {
    it("fetches an existing product", async () => {
      const sku = nextSku();
      const created = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Gadget", category: "gadgets", price: 25 },
      });
      const { id } = created.json();

      const response = await app.inject({
        method: "GET",
        url: `/api/products/${id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(id);
    });

    it("returns 404 for a well-formed but nonexistent id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/products/clnonexistent00000000000",
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 400 for a malformed id", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/products/not-a-cuid",
      });
      expect(response.statusCode).toBe(400);
    });

    it("lists products with pagination metadata", async () => {
      const sku = nextSku();
      await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Listed Item", category: "list-test", price: 3 },
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/products?page=1&pageSize=5&category=list-test",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(() => productListResponseSchema.parse(body)).not.toThrow();
      expect(body.page).toBe(1);
      expect(body.pageSize).toBe(5);
      expect(body.items.some((p: { sku: string }) => p.sku === sku)).toBe(true);
    });

    it("rejects an out-of-range pageSize with 400", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/products?pageSize=9999",
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("PUT /api/products/:id", () => {
    it("updates a product with a valid partial payload", async () => {
      const sku = nextSku();
      const created = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Old Name", category: "widgets", price: 10 },
      });
      const { id } = created.json();

      const response = await app.inject({
        method: "PUT",
        url: `/api/products/${id}`,
        payload: { name: "New Name" },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.name).toBe("New Name");
      expect(body.price).toBe(10);
    });

    it("rejects an empty update payload with 400", async () => {
      const sku = nextSku();
      const created = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Widget", category: "widgets", price: 10 },
      });
      const { id } = created.json();

      const response = await app.inject({
        method: "PUT",
        url: `/api/products/${id}`,
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 404 when updating a nonexistent product", async () => {
      const response = await app.inject({
        method: "PUT",
        url: "/api/products/clnonexistent00000000001",
        payload: { name: "Doesn't matter" },
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/products/:id", () => {
    it("deletes an existing product", async () => {
      const sku = nextSku();
      const created = await app.inject({
        method: "POST",
        url: "/api/products",
        payload: { sku, name: "Doomed", category: "widgets", price: 10 },
      });
      const { id } = created.json();

      const response = await app.inject({
        method: "DELETE",
        url: `/api/products/${id}`,
      });
      expect(response.statusCode).toBe(204);

      const getAfterDelete = await app.inject({
        method: "GET",
        url: `/api/products/${id}`,
      });
      expect(getAfterDelete.statusCode).toBe(404);
    });

    it("returns 404 when deleting a nonexistent product", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/products/clnonexistent00000000002",
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
