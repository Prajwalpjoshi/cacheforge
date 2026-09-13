import type { Env } from "../env.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { CacheStatus, DataSource } from "../generated/prisma/client.js";
import type {
  Cache,
  PubSub,
  RateLimiter,
  RedisClientLike,
} from "@cacheforge/cache-kit";
import type { ProductService } from "../services/product.service.js";
import type { HealthService } from "../services/health.service.js";
import type { CacheAdminService } from "../services/cache-admin.service.js";

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
    prisma: PrismaClient;
    redis: RedisClientLike;
    cache: Cache;
    readRateLimiter: RateLimiter;
    writeRateLimiter: RateLimiter;
    pubsub: PubSub;
    productService: ProductService;
    healthService: HealthService;
    cacheAdminService: CacheAdminService;
  }

  interface FastifyRequest {
    startTime?: bigint;
    cacheStatus?: CacheStatus;
    cacheSource?: DataSource;
  }
}
