import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthResponseSchema } from "../schemas/health.schema.js";
import { healthController } from "../controllers/health.controller.js";
import { createHealthService } from "../services/health.service.js";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.decorate(
    "healthService",
    createHealthService({ prisma: fastify.prisma, redis: fastify.redis }),
  );

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/health",
    schema: {
      response: {
        200: healthResponseSchema,
        503: healthResponseSchema,
      },
    },
    handler: healthController,
  });
}
