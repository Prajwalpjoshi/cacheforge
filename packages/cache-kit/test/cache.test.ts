import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createCache } from "../src/cache.js";
import {
  createRedisClient,
  type RedisClientLike,
} from "../src/redis-client.js";

const REDIS_URL = process.env.TEST_REDIS_URL ?? "redis://localhost:6379";
const runId = randomUUID().slice(0, 8);
const testKey = (name: string) => `cache-kit-test:${runId}:${name}`;

describe("createCache", () => {
  let redis: RedisClientLike;

  beforeAll(async () => {
    redis = createRedisClient(REDIS_URL);
    await redis.connect();
  });

  afterAll(async () => {
    const keys = await redis.keys(`cache-kit-test:${runId}:*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }
    await redis.quit();
  });

  it("returns null for a key that was never set", async () => {
    const cache = createCache(redis);
    const value = await cache.get(testKey("missing"));
    expect(value).toBeNull();
  });

  it("round-trips a JSON-serializable value through set/get", async () => {
    const cache = createCache(redis);
    const key = testKey("roundtrip");
    const payload = { id: "abc", tags: ["a", "b"], nested: { n: 1 } };

    await cache.set(key, payload, 30);
    const value = await cache.get<typeof payload>(key);

    expect(value).toEqual(payload);
  });

  it("expires a key after its TTL elapses", async () => {
    const cache = createCache(redis);
    const key = testKey("ttl");

    await cache.set(key, { alive: true }, 1);
    expect(await cache.exists(key)).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 1300));

    expect(await cache.exists(key)).toBe(false);
    expect(await cache.get(key)).toBeNull();
  });

  it("delete removes a key immediately", async () => {
    const cache = createCache(redis);
    const key = testKey("delete-me");

    await cache.set(key, { x: 1 }, 60);
    expect(await cache.exists(key)).toBe(true);

    await cache.delete(key);
    expect(await cache.exists(key)).toBe(false);
  });

  it("getOrSet calls the fetcher and caches on a miss", async () => {
    const cache = createCache(redis);
    const key = testKey("get-or-set-miss");
    let fetcherCalls = 0;

    const result = await cache.getOrSet(key, 60, async () => {
      fetcherCalls += 1;
      return { computed: "value" };
    });

    expect(result.status).toBe("miss");
    expect(result.value).toEqual({ computed: "value" });
    expect(fetcherCalls).toBe(1);
  });

  it("getOrSet returns the cached value on a hit without calling the fetcher again", async () => {
    const cache = createCache(redis);
    const key = testKey("get-or-set-hit");
    let fetcherCalls = 0;
    const fetcher = async () => {
      fetcherCalls += 1;
      return { computed: "value", call: fetcherCalls };
    };

    const first = await cache.getOrSet(key, 60, fetcher);
    const second = await cache.getOrSet(key, 60, fetcher);

    expect(first.status).toBe("miss");
    expect(second.status).toBe("hit");
    expect(second.value).toEqual(first.value);
    expect(fetcherCalls).toBe(1);
  });

  it("propagates an error thrown by the fetcher instead of swallowing it", async () => {
    const cache = createCache(redis);
    const key = testKey("get-or-set-throws");

    await expect(
      cache.getOrSet(key, 60, async () => {
        throw new Error("not found");
      }),
    ).rejects.toThrow("not found");

    expect(await cache.exists(key)).toBe(false);
  });

  it("registers a key under a tag on set and invalidates it via invalidateTag", async () => {
    const cache = createCache(redis);
    const tag = testKey("tag");
    const keyA = testKey("tagged-a");
    const keyB = testKey("tagged-b");

    await cache.set(keyA, { a: 1 }, 60, { tags: [tag] });
    await cache.set(keyB, { b: 2 }, 60, { tags: [tag] });

    expect(await cache.exists(keyA)).toBe(true);
    expect(await cache.exists(keyB)).toBe(true);

    await cache.invalidateTag(tag);

    expect(await cache.exists(keyA)).toBe(false);
    expect(await cache.exists(keyB)).toBe(false);
    expect(await redis.exists(tag)).toBe(0);
  });

  it("getOrSet registers tags so a later invalidateTag forces the next call to miss", async () => {
    const cache = createCache(redis);
    const tag = testKey("list-tag");
    const key = testKey("list-entry");

    const first = await cache.getOrSet(key, 60, async () => "v1", {
      tags: [tag],
    });
    const second = await cache.getOrSet(key, 60, async () => "v2", {
      tags: [tag],
    });
    await cache.invalidateTag(tag);
    const third = await cache.getOrSet(key, 60, async () => "v3", {
      tags: [tag],
    });

    expect(first.status).toBe("miss");
    expect(second.status).toBe("hit");
    expect(third.status).toBe("miss");
    expect(third.value).toBe("v3");
  });

  it("tracks real hit/miss counters via getStats", async () => {
    const statsKeyPrefix = testKey("stats");
    const cache = createCache(redis, { statsKeyPrefix });
    const key = testKey("stats-target");

    await cache.getOrSet(key, 60, async () => "value"); // miss
    await cache.getOrSet(key, 60, async () => "value"); // hit
    await cache.getOrSet(key, 60, async () => "value"); // hit

    // Stats counters are incremented fire-and-forget; give them a tick.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const stats = await cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(2 / 3);
  });
});
