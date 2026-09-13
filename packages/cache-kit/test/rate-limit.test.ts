import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRateLimiter } from "../src/rate-limit.js";
import {
  createRedisClient,
  type RedisClientLike,
} from "../src/redis-client.js";

const REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";
const runId = randomUUID().slice(0, 8);

describe("createRateLimiter", () => {
  let redis: RedisClientLike;

  beforeAll(async () => {
    redis = createRedisClient(REDIS_URL);
    await redis.connect();
  });

  afterAll(async () => {
    const keys = await redis.keys(`ratelimit-test:${runId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }
    await redis.quit();
  });

  it("allows requests under the limit and decrements remaining", async () => {
    const limiter = createRateLimiter(redis, {
      windowSeconds: 60,
      max: 3,
      keyPrefix: `ratelimit-test:${runId}:under`,
    });

    const first = await limiter.consume("client-a");
    const second = await limiter.consume("client-a");

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
  });

  it("denies a request once the limit is exceeded", async () => {
    const limiter = createRateLimiter(redis, {
      windowSeconds: 60,
      max: 2,
      keyPrefix: `ratelimit-test:${runId}:exceed`,
    });

    await limiter.consume("client-b");
    await limiter.consume("client-b");
    const third = await limiter.consume("client-b");

    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
    expect(third.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("tracks separate clients independently", async () => {
    const limiter = createRateLimiter(redis, {
      windowSeconds: 60,
      max: 1,
      keyPrefix: `ratelimit-test:${runId}:separate`,
    });

    const clientX = await limiter.consume("client-x");
    const clientY = await limiter.consume("client-y");

    expect(clientX.allowed).toBe(true);
    expect(clientY.allowed).toBe(true);
  });

  it("is backed by real Redis state (a second limiter instance shares the count)", async () => {
    const options = {
      windowSeconds: 60,
      max: 2,
      keyPrefix: `ratelimit-test:${runId}:shared`,
    };
    const limiterA = createRateLimiter(redis, options);
    const limiterB = createRateLimiter(redis, options);

    await limiterA.consume("client-shared");
    await limiterB.consume("client-shared");
    const third = await limiterA.consume("client-shared");

    expect(third.allowed).toBe(false);
  });

  it("resets after the window elapses", async () => {
    const limiter = createRateLimiter(redis, {
      windowSeconds: 1,
      max: 1,
      keyPrefix: `ratelimit-test:${runId}:window`,
    });

    const first = await limiter.consume("client-window");
    const second = await limiter.consume("client-window");
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1300));

    const third = await limiter.consume("client-window");
    expect(third.allowed).toBe(true);
  });

  it("fails open when Redis is unreachable", async () => {
    const brokenClient = createRedisClient("redis://127.0.0.1:1", {
      connectTimeout: 200,
      reconnectStrategy: false,
    });
    await brokenClient.connect().catch(() => {});

    const errors: unknown[] = [];
    const limiter = createRateLimiter(brokenClient, {
      windowSeconds: 60,
      max: 1,
      keyPrefix: `ratelimit-test:${runId}:broken`,
      onError: (error) => errors.push(error),
    });

    const result = await limiter.consume("client-broken");

    expect(result.allowed).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
  });
});
