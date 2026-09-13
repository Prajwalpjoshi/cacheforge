import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const statusCode = error.statusCode ?? 500;

  if (statusCode >= 500) {
    request.log.error({ err: error }, "unhandled error");
  }

  reply.status(statusCode).send({
    statusCode,
    error: statusCode >= 500 ? "Internal Server Error" : error.name,
    message: statusCode >= 500 ? "An unexpected error occurred" : error.message,
  });
}
