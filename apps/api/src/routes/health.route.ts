import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthResponseSchema } from "../schemas/health.schema.js";
import { healthController } from "../controllers/health.controller.js";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/health",
    schema: {
      response: {
        200: healthResponseSchema,
      },
    },
    handler: healthController,
  });
}
