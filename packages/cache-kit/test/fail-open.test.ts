import { describe, expect, it } from "vitest";
import { createCache } from "../src/cache.js";
import { createRedisClient } from "../src/redis-client.js";

/**
 * Simulates a genuinely unreachable Redis (nothing listens on port 1,
 * and reconnectStrategy: false means node-redis gives up after the
 * first failed attempt) to verify the fail-open contract described in
 * PROJECT_SPEC.md §9: infrastructure failures degrade to "go to the
 * source," they never throw back at the caller.
 */
describe("createCache fail-open behavior", () => {
  async function brokenCache(onError?: (error: unknown) => void) {
    const client = createRedisClient("redis://127.0.0.1:1", {
      connectTimeout: 200,
      reconnectStrategy: false,
    });
    await client.connect().catch(() => {});
    return createCache(client, { onError });
  }

  it("get() resolves to null instead of throwing", async () => {
    const cache = await brokenCache();
    await expect(cache.get("any-key")).resolves.toBeNull();
  });

  it("set() resolves instead of throwing", async () => {
    const cache = await brokenCache();
    await expect(cache.set("any-key", { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it("delete() and exists() resolve instead of throwing", async () => {
    const cache = await brokenCache();
    await expect(cache.delete("any-key")).resolves.toBeUndefined();
    await expect(cache.exists("any-key")).resolves.toBe(false);
  });

  it("invalidateTag() resolves instead of throwing", async () => {
    const cache = await brokenCache();
    await expect(cache.invalidateTag("some-tag")).resolves.toBeUndefined();
  });

  it("getOrSet() still calls the fetcher and returns its value, tagged as bypass", async () => {
    const cache = await brokenCache();
    const result = await cache.getOrSet(
      "any-key",
      60,
      async () => "from-source",
    );

    expect(result.status).toBe("bypass");
    expect(result.value).toBe("from-source");
  });

  it("getOrSet() still propagates a real error from the fetcher", async () => {
    const cache = await brokenCache();
    await expect(
      cache.getOrSet("any-key", 60, async () => {
        throw new Error("not found");
      }),
    ).rejects.toThrow("not found");
  });

  it("reports every failure through onError rather than hiding it", async () => {
    const errors: Array<{ operation: string }> = [];
    const client = createRedisClient("redis://127.0.0.1:1", {
      connectTimeout: 200,
      reconnectStrategy: false,
    });
    await client.connect().catch(() => {});
    const cache = createCache(client, {
      onError: (_error, context) => errors.push(context),
    });

    await cache.get("k");
    await cache.set("k", "v", 60);
    await cache.exists("k");
    await cache.delete("k");

    expect(errors.map((e) => e.operation)).toEqual([
      "get",
      "set",
      "exists",
      "delete",
    ]);
  });
});
