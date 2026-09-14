import { describe, expect, it, vi } from "vitest";
import type { Cache, PubSub } from "@cacheforge/cache-kit";
import { createRedisClient, type RedisClientLike } from "@cacheforge/cache-kit";
import { createBenchmarkService } from "../src/services/benchmark.service.js";
import type { ProductRepository } from "../src/repositories/product.repository.js";
import type { BenchmarkRepository } from "../src/repositories/benchmark.repository.js";
import { createProductService } from "../src/services/product.service.js";

/**
 * Verifies the "no products exist" precondition in isolation, without
 * touching the real (shared) development database — deleting every
 * Product row just to exercise this one branch would conflict with
 * PROJECT_SPEC.md §25's benchmark-isolation requirement, even from a
 * test rather than the benchmark engine itself.
 */
describe("benchmark service preconditions", () => {
  it('rejects a "products.get" benchmark with 400 when no products exist', async () => {
    const emptyProductRepository = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn(),
      findBySku: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as ProductRepository;

    const service = createBenchmarkService({
      productRepository: emptyProductRepository,
      productService: createProductService({
        repository: emptyProductRepository,
        cache: {} as unknown as Cache,
        pubsub: {} as unknown as PubSub,
      }),
      cache: {} as unknown as Cache,
      redis: {} as unknown as RedisClientLike,
      repository: {} as unknown as BenchmarkRepository,
    });

    await expect(
      service.run({
        targetRoute: "products.get",
        mode: "DB_ONLY",
        iterations: 5,
        concurrency: 1,
      }),
    ).rejects.toThrow(/No products exist/);
  });

  it("returns 503 for CACHE_ONLY/COMPARISON when Redis is genuinely unreachable", async () => {
    // Same fast, deterministic pattern as cache-kit's own fail-open
    // tests: nothing listens on this address, and reconnectStrategy:
    // false means node-redis gives up after the first failed attempt
    // instead of retrying with backoff — a real (not mocked) broken
    // client that fails in milliseconds rather than tens of seconds.
    const brokenRedis = createRedisClient("redis://127.0.0.1:1", {
      connectTimeout: 200,
      reconnectStrategy: false,
    });
    await brokenRedis.connect().catch(() => {});

    const productRepositoryWithOneItem = {
      list: vi
        .fn()
        .mockResolvedValue({ items: [{ id: "existing-product" }], total: 1 }),
      findById: vi.fn(),
      findBySku: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as ProductRepository;

    const service = createBenchmarkService({
      productRepository: productRepositoryWithOneItem,
      productService: createProductService({
        repository: productRepositoryWithOneItem,
        cache: {} as unknown as Cache,
        pubsub: {} as unknown as PubSub,
      }),
      cache: {} as unknown as Cache,
      redis: brokenRedis,
      repository: {} as unknown as BenchmarkRepository,
    });

    await expect(
      service.run({
        targetRoute: "products.get",
        mode: "CACHE_ONLY",
        iterations: 5,
        concurrency: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 503 });

    // Never successfully connected, so there's nothing to tear down —
    // disconnect() on an already-closed client throws synchronously.
    if (brokenRedis.isOpen) {
      await brokenRedis.disconnect();
    }
  });

  it("does not require any products for a products.list DB_ONLY benchmark", async () => {
    const emptyProductRepository = {
      list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn(),
      findBySku: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as ProductRepository;

    const benchmarkRepository = {
      create: vi.fn().mockImplementation((data: Record<string, unknown>) => ({
        id: "fake-id",
        ...data,
        createdAt: new Date(),
      })),
    } as unknown as BenchmarkRepository;

    const service = createBenchmarkService({
      productRepository: emptyProductRepository,
      productService: createProductService({
        repository: emptyProductRepository,
        cache: {} as unknown as Cache,
        pubsub: {} as unknown as PubSub,
      }),
      cache: {} as unknown as Cache,
      redis: {} as unknown as RedisClientLike,
      repository: benchmarkRepository,
    });

    const result = await service.run({
      targetRoute: "products.list",
      mode: "DB_ONLY",
      iterations: 3,
      concurrency: 1,
    });

    expect(result.iterations).toBe(3);
    expect(emptyProductRepository.list).toHaveBeenCalled();
  });
});
