import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  BenchmarkIdParams,
  BenchmarkListQuery,
  BenchmarkRunRequest,
} from "@cacheforge/contracts";

export async function runBenchmarkController(
  request: FastifyRequest<{ Body: BenchmarkRunRequest }>,
  reply: FastifyReply,
): Promise<void> {
  request.log.info(
    {
      mode: request.body.mode,
      targetRoute: request.body.targetRoute,
      iterations: request.body.iterations,
      concurrency: request.body.concurrency,
    },
    "benchmark run starting",
  );

  const start = process.hrtime.bigint();
  const result = await request.server.benchmarkService.run(request.body);
  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  request.log.info(
    {
      benchmarkId: result.id,
      mode: result.mode,
      iterations: result.iterations,
      concurrency: result.concurrency,
      durationMs: Math.round(durationMs),
      status: "completed",
    },
    "benchmark run completed",
  );

  reply.status(201).send(result);
}

export async function listBenchmarksController(
  request: FastifyRequest<{ Querystring: BenchmarkListQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.benchmarkService.list(request.query);
  reply.send(result);
}

export async function getBenchmarkController(
  request: FastifyRequest<{ Params: BenchmarkIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.benchmarkService.getById(
    request.params.id,
  );
  reply.send(result);
}
