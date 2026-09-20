import { ZodError } from "zod";
import { ApiError, ApiNetworkError } from "./client";

/** A single place that turns any thrown value from the API layer into a message safe to show a user — never a raw stack trace or [object Object]. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.details && error.details.length > 0) {
      return `${error.message}: ${error.details
        .map((detail) => `${detail.path || "value"} ${detail.message}`)
        .join(", ")}`;
    }
    return error.message;
  }
  if (error instanceof ApiNetworkError) {
    return error.message;
  }
  if (error instanceof ZodError) {
    return "The server returned data that didn't match the expected shape.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
}
