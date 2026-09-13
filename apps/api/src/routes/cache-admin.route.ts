import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  cacheKeyParamsSchema,
  cacheKeysQuerySchema,
  cacheKeysResponseSchema,
  cacheStatsResponseSchema,
} from "../schemas/cache.schema.js";
import { createCacheAdminService } from "../services/cache-admin.service.js";
import {
  deleteCacheKeyController,
  getCacheStatsController,
  listCacheKeysController,
} from "../controllers/cache-admin.controller.js";

export async function cacheAdminRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.decorate(
    "cacheAdminService",
    createCacheAdminService({ redis: fastify.redis, cache: fastify.cache }),
  );

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: "GET",
    url: "/cache/keys",
    schema: {
      querystring: cacheKeysQuerySchema,
      response: { 200: cacheKeysResponseSchema },
    },
    handler: listCacheKeysController,
  });

  app.route({
    method: "GET",
    url: "/cache/stats",
    schema: {
      response: { 200: cacheStatsResponseSchema },
    },
    handler: getCacheStatsController,
  });

  app.route({
    method: "DELETE",
    url: "/cache/:key",
    schema: {
      params: cacheKeyParamsSchema,
    },
    handler: deleteCacheKeyController,
  });
}
