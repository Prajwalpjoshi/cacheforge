import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  MetricsSummaryQuery,
  RequestMetricsQuery,
} from "@cacheforge/contracts";

export async function getMetricsSummaryController(
  request: FastifyRequest<{ Querystring: MetricsSummaryQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.metricsService.getSummary(
    request.query.windowMinutes,
  );
  reply.send(result);
}

export async function listRequestMetricsController(
  request: FastifyRequest<{ Querystring: RequestMetricsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.metricsService.listRequests(
    request.query,
  );
  reply.send(result);
}
