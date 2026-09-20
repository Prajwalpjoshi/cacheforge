import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, ApiNetworkError } from "./client";
import { getErrorMessage } from "./error-message";

describe("getErrorMessage", () => {
  it("returns an ApiError's message as-is when there are no field details", () => {
    const error = new ApiError('Product "abc" not found', 404, {
      code: "NotFoundError",
    });
    expect(getErrorMessage(error)).toBe('Product "abc" not found');
  });

  it("appends field-level details from a validation error", () => {
    const error = new ApiError("Request validation failed", 400, {
      details: [
        { path: "/price", message: "Expected number, received string" },
      ],
    });
    expect(getErrorMessage(error)).toBe(
      "Request validation failed: /price Expected number, received string",
    );
  });

  it("returns the network error's explanatory message", () => {
    const error = new ApiNetworkError(new TypeError("fetch failed"));
    expect(getErrorMessage(error)).toContain(
      "Could not reach the CacheForge API",
    );
  });

  it("gives a generic, safe message for a schema mismatch", () => {
    const result = z.object({ id: z.string() }).safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getErrorMessage(result.error)).toBe(
        "The server returned data that didn't match the expected shape.",
      );
    }
  });

  it("falls back to a generic message for a non-Error throw", () => {
    expect(getErrorMessage("plain string")).toBe(
      "An unexpected error occurred.",
    );
    expect(getErrorMessage(undefined)).toBe("An unexpected error occurred.");
  });
});
