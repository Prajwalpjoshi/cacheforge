import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  isResponseSerializationError,
} from "fastify-type-provider-zod";
import { AppError } from "../errors.js";

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
    });
    return;
  }

  if (hasZodFastifySchemaValidationErrors(error)) {
    reply.status(400).send({
      statusCode: 400,
      error: "Bad Request",
      message: "Request validation failed",
      details: error.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message,
      })),
    });
    return;
  }

  if (isResponseSerializationError(error)) {
    // A response failed to match its own schema — a bug in our code,
    // never the caller's fault, so it must never look like a 400.
    request.log.error({ err: error }, "response failed schema validation");
    reply.status(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "An unexpected error occurred",
    });
    return;
  }

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
