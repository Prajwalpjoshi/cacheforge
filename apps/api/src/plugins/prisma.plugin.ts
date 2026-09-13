import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

/**
 * Single PrismaClient instance for the process lifetime. Connection is
 * lazy (Prisma connects on first query) so a momentarily-unreachable
 * Postgres does not prevent the server from starting — /api/health is
 * what surfaces that condition (PROJECT_SPEC.md §5).
 */
export const prismaPlugin = fp(async (fastify: FastifyInstance) => {
  const adapter = new PrismaPg({
    connectionString: fastify.config.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
