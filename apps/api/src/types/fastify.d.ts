import type { Env } from "../env.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { RedisClient } from "./redis-client.js";
import type { ProductService } from "../services/product.service.js";
import type { HealthService } from "../services/health.service.js";

declare module "fastify" {
  interface FastifyInstance {
    config: Env;
    prisma: PrismaClient;
    redis: RedisClient;
    productService: ProductService;
    healthService: HealthService;
  }

  interface FastifyRequest {
    startTime?: bigint;
  }
}
