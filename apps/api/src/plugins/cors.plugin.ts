import fp from "fastify-plugin";
import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";

export const corsPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    origin: fastify.config.CORS_ORIGIN,
  });
});
