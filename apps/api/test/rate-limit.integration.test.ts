import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

/**
 * A dedicated app instance with a deliberately low threshold — see
 * PROJECT_SPEC.md §23: override configuration for the test environment
 * rather than weakening the production default (env.ts's actual
 * defaults, used by every other test file, stay untouched). The window
 * is generous (not tiny) so it can't roll over mid-test purely from
 * ordinary test overhead; cache-kit's own unit tests already cover
 * window-rollover timing in isolation.
 */
const READ_MAX = 5;
const WRITE_MAX = 3;
const WINDOW_SECONDS = 120;

// Rate-limit identifiers are just strings (request.ip), not validated as
// real IPs. Each is unique per test run so leftover Redis counters from
// a previous run (same 120s window) can never bleed into this one.
const runId = randomUUID().slice(0, 8);
const skuPrefix = `rate-limit-write-${runId}-`;

describe("Rate limiting", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer({
      RATE_LIMIT_MAX: READ_MAX,
      RATE_LIMIT_WRITE_MAX: WRITE_MAX,
      RATE_LIMIT_WINDOW_SECONDS: WINDOW_SECONDS,
    });
    await app.ready();
  });

  afterAll(async () => {
    await app.prisma.product.deleteMany({
      where: { sku: { startsWith: skuPrefix } },
    });
    await app.close();
  });

  it("allows requests under the read limit, then 429s with Retry-After once exceeded", async () => {
    const remoteAddress = `test-read-${runId}`;

    for (let i = 0; i < READ_MAX; i++) {
      const response = await app.inject({
        method: "GET",
        url: "/api/products",
        remoteAddress,
      });
      expect(response.statusCode).toBe(200);
      expect(Number(response.headers["x-ratelimit-remaining"])).toBe(
        READ_MAX - (i + 1),
      );
    }

    const overLimit = await app.inject({
      method: "GET",
      url: "/api/products",
      remoteAddress,
    });

    expect(overLimit.statusCode).toBe(429);
    expect(overLimit.headers["retry-after"]).toBeTruthy();
    expect(Number(overLimit.headers["retry-after"])).toBeGreaterThan(0);
    expect(overLimit.json().statusCode).toBe(429);
  });

  it("enforces a stricter limit on write routes than read routes", async () => {
    const remoteAddress = `test-write-${runId}`;

    for (let i = 0; i < WRITE_MAX; i++) {
      const response = await app.inject({
        method: "POST",
        url: "/api/products",
        remoteAddress,
        payload: {
          sku: `${skuPrefix}${i}`,
          name: "Rate Limit Test",
          category: "rate-limit",
          price: 1,
        },
      });
      expect(response.statusCode).toBe(201);
    }

    const overLimit = await app.inject({
      method: "POST",
      url: "/api/products",
      remoteAddress,
      payload: {
        sku: `${skuPrefix}over`,
        name: "Rate Limit Test",
        category: "rate-limit",
        price: 1,
      },
    });

    expect(overLimit.statusCode).toBe(429);
    expect(overLimit.headers["retry-after"]).toBeTruthy();
  });

  it("does not rate-limit /api/health", async () => {
    const remoteAddress = `test-health-${runId}`;
    for (let i = 0; i < READ_MAX + 5; i++) {
      const response = await app.inject({
        method: "GET",
        url: "/api/health",
        remoteAddress,
      });
      expect(response.statusCode).toBe(200);
    }
  });

  it("tracks separate clients independently", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/products",
      remoteAddress: `test-separate-${runId}`,
    });
    expect(response.statusCode).toBe(200);
  });
});
