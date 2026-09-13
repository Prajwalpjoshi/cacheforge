import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

const runId = randomUUID().slice(0, 8);
const skuPrefix = `cache-admin-${runId}-`;

describe("Cache administration endpoints", () => {
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

  it("GET /api/cache/keys lists real cacheforge-namespaced keys via SCAN", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: {
        sku: `${skuPrefix}0`,
        name: "Cache Admin Widget",
        category: "cache-admin",
        price: 5,
      },
    });
    const { id } = created.json();
    await app.inject({ method: "GET", url: `/api/products/${id}` });

    const response = await app.inject({
      method: "GET",
      url: "/api/cache/keys",
    });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(Array.isArray(body.keys)).toBe(true);
    expect(
      body.keys.every((k: { key: string }) => k.key.startsWith("cacheforge:")),
    ).toBe(true);
    const productKeyEntry = body.keys.find(
      (k: { key: string }) => k.key === `cacheforge:product:${id}`,
    );
    expect(productKeyEntry).toBeDefined();
    expect(productKeyEntry.type).toBe("string");
    expect(productKeyEntry.ttlSeconds).toBeGreaterThan(0);
    expect(productKeyEntry.ttlSeconds).toBeLessThanOrEqual(60);
  });

  it("rejects a pattern query outside the cacheforge namespace with 400", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/cache/keys?pattern=*",
    });
    expect(response.statusCode).toBe(400);
  });

  it("GET /api/cache/stats returns real, non-fabricated counters", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/cache/stats",
    });
    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(typeof body.hits).toBe("number");
    expect(typeof body.misses).toBe("number");
    expect(body.hitRate).toBeGreaterThanOrEqual(0);
    expect(body.hitRate).toBeLessThanOrEqual(1);
    expect(typeof body.usedMemoryHuman).toBe("string");
    expect(body.connectedClients).toBeGreaterThan(0);
    expect(body.uptimeSec).toBeGreaterThanOrEqual(0);
  });

  it("DELETE /api/cache/:key deletes a real key and reports 404 on a second delete", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/api/products",
      payload: {
        sku: `${skuPrefix}1`,
        name: "Deletable Widget",
        category: "cache-admin",
        price: 5,
      },
    });
    const { id } = created.json();
    await app.inject({ method: "GET", url: `/api/products/${id}` });

    const key = `cacheforge:product:${id}`;
    const beforeDelete = await app.redis.exists(key);
    expect(beforeDelete).toBe(1);

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/cache/${encodeURIComponent(key)}`,
    });
    expect(deleted.statusCode).toBe(204);
    expect(await app.redis.exists(key)).toBe(0);

    const secondDelete = await app.inject({
      method: "DELETE",
      url: `/api/cache/${encodeURIComponent(key)}`,
    });
    expect(secondDelete.statusCode).toBe(404);
  });

  it("rejects deleting a key outside the cacheforge namespace with 400", async () => {
    const response = await app.inject({
      method: "DELETE",
      url: "/api/cache/some-other-app:secret",
    });
    expect(response.statusCode).toBe(400);
  });
});
