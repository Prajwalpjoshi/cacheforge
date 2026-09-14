import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  metricsSummaryQuerySchema,
  metricsSummaryResponseSchema,
  requestMetricsQuerySchema,
  requestMetricsResponseSchema,
} from "../schemas/metrics.schema.js";
import {
  getMetricsSummaryController,
  listRequestMetricsController,
} from "../controllers/metrics.controller.js";

/**
 * metricsService is decorated on the root instance by
 * plugins/metrics.plugin.ts (registered earlier in server.ts) — this
 * file only wires the two GET routes to it.
 */
export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: "GET",
    url: "/metrics/summary",
    schema: {
      querystring: metricsSummaryQuerySchema,
      response: { 200: metricsSummaryResponseSchema },
    },
    handler: getMetricsSummaryController,
  });

  app.route({
    method: "GET",
    url: "/metrics/requests",
    schema: {
      querystring: requestMetricsQuerySchema,
      response: { 200: requestMetricsResponseSchema },
    },
    handler: listRequestMetricsController,
  });
}
