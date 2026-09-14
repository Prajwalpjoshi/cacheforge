import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createMetricsRepository } from "../repositories/metrics.repository.js";
import { createMetricsService } from "../services/metrics.service.js";

/**
 * Unlike productService/cacheAdminService/healthService (each decorated
 * inside its own route-registration function, since only that route's
 * own controllers ever use it), metricsService must be decorated on
 * the *root* instance: requestContextPlugin's global onResponse hook
 * needs it to persist every request, and that hook is registered
 * before — and outside of — metrics.route.ts's own encapsulation
 * context. fastify-plugin (fp) is what makes a decorate() call apply
 * to the root instance rather than a child scope.
 */
export const metricsPlugin = fp(async (fastify: FastifyInstance) => {
  const repository = createMetricsRepository(fastify.prisma);
  fastify.decorate("metricsService", createMetricsService(repository));
});
