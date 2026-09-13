import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { CacheStatus, DataSource } from "../generated/prisma/client.js";

/**
 * Foundation-level request observability: stamps the response with the
 * request ID and logs a structured line per request (method, route,
 * status, duration, cache status/source). This is the shape a future
 * `RequestMetric` persistence hook would write from — PROJECT_SPEC.md
 * §14/§20; that persistence itself is a later phase (Performance Lab).
 */
export const requestContextPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.addHook("onRequest", async (request) => {
    request.startTime = process.hrtime.bigint();
  });

  fastify.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id);
    return payload;
  });

  fastify.addHook("onResponse", async (request, reply) => {
    const durationMs = request.startTime
      ? Number(process.hrtime.bigint() - request.startTime) / 1_000_000
      : undefined;

    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        route: request.routeOptions?.url ?? request.url,
        statusCode: reply.statusCode,
        durationMs: durationMs !== undefined ? Math.round(durationMs) : null,
        cacheStatus: request.cacheStatus ?? CacheStatus.NOT_APPLICABLE,
        source: request.cacheSource ?? DataSource.DB,
      },
      "request completed",
    );
  });
});
