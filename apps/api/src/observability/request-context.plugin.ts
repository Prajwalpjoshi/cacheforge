import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { CacheStatus, DataSource } from "../generated/prisma/client.js";
import { shouldPersistMetricForRoute } from "./metrics-exclusions.js";

/**
 * Request observability: stamps the response with the request ID,
 * logs a structured completion line (method, route, status, duration,
 * cache status/source), and persists a `RequestMetric` row for real
 * product-catalog traffic — PROJECT_SPEC.md §14/§20.
 *
 * Persistence happens in `onResponse`, which Fastify runs *after* the
 * response has already been sent to the client, so it can never add
 * latency the caller experiences. The write itself is fire-and-forget
 * (not awaited) rather than queued: each request's insert is one
 * bounded operation with its own `.catch()`, so there is no unbounded
 * in-memory queue that could grow under load — back-pressure instead
 * comes from Prisma/Postgres's own connection pool, the same way any
 * other concurrent query would. A failed insert is logged and
 * discarded; it never turns the (already-sent) successful response
 * into an error, and a lost metric row is an acceptable trade-off for
 * a demo observability pipeline, not audit-grade data.
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
    const route = request.routeOptions?.url;
    const cacheStatus = request.cacheStatus ?? CacheStatus.NOT_APPLICABLE;
    const source = request.cacheSource ?? DataSource.DB;

    request.log.info(
      {
        requestId: request.id,
        method: request.method,
        route: route ?? request.url,
        statusCode: reply.statusCode,
        durationMs: durationMs !== undefined ? Math.round(durationMs) : null,
        cacheStatus,
        source,
      },
      "request completed",
    );

    if (
      route &&
      durationMs !== undefined &&
      shouldPersistMetricForRoute(route)
    ) {
      void fastify.metricsService
        .record({
          requestId: request.id,
          method: request.method,
          route,
          statusCode: reply.statusCode,
          durationMs,
          cacheStatus,
          source,
        })
        .catch((error: unknown) => {
          request.log.warn({ err: error }, "failed to persist request metric");
        });
    }
  });
});
