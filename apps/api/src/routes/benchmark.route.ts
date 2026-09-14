import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  benchmarkIdParamsSchema,
  benchmarkListQuerySchema,
  benchmarkListResponseSchema,
  benchmarkRunDetailSchema,
  benchmarkRunRequestSchema,
} from "../schemas/benchmark.schema.js";
import { createProductRepository } from "../repositories/product.repository.js";
import { createProductService } from "../services/product.service.js";
import { createBenchmarkRepository } from "../repositories/benchmark.repository.js";
import { createBenchmarkService } from "../services/benchmark.service.js";
import {
  getBenchmarkController,
  listBenchmarksController,
  runBenchmarkController,
} from "../controllers/benchmark.controller.js";

export async function benchmarkRoutes(fastify: FastifyInstance): Promise<void> {
  const productRepository = createProductRepository(fastify.prisma);
  // A second, independently-constructed ProductService — stateless, so
  // this is just the same real cache-aside code (repository + cache +
  // pubsub) reused, not a duplicate implementation of product business
  // logic. It has to be built here rather than read off
  // `fastify.productService`: that decoration lives in product.route.ts's
  // own child encapsulation context, invisible to this sibling route
  // (unlike metricsService, which plugins/metrics.plugin.ts deliberately
  // decorates on the root instance because it also needs to be reached
  // from the global request-completion hook).
  const productService = createProductService({
    repository: productRepository,
    cache: fastify.cache,
    pubsub: fastify.pubsub,
  });

  const benchmarkRepository = createBenchmarkRepository(fastify.prisma);
  const service = createBenchmarkService({
    productRepository,
    productService,
    cache: fastify.cache,
    redis: fastify.redis,
    repository: benchmarkRepository,
  });
  fastify.decorate("benchmarkService", service);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: "POST",
    url: "/benchmarks/run",
    schema: {
      body: benchmarkRunRequestSchema,
      response: { 201: benchmarkRunDetailSchema },
    },
    handler: runBenchmarkController,
  });

  app.route({
    method: "GET",
    url: "/benchmarks",
    schema: {
      querystring: benchmarkListQuerySchema,
      response: { 200: benchmarkListResponseSchema },
    },
    handler: listBenchmarksController,
  });

  app.route({
    method: "GET",
    url: "/benchmarks/:id",
    schema: {
      params: benchmarkIdParamsSchema,
      response: { 200: benchmarkRunDetailSchema },
    },
    handler: getBenchmarkController,
  });
}
