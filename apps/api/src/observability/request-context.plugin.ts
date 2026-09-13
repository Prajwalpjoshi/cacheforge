import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

/**
 * Foundation-level request observability: stamps the response with the
 * request ID and logs a structured line per request (method, route,
 * status, duration). Persisting this as a `RequestMetric` row is Phase 2
 * work — see PROJECT_SPEC.md §14 and §20.
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
      },
      "request completed",
    );
  });
});
