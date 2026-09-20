import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiRequest, apiUrl, ApiError, ApiNetworkError } from "./client";

const productLikeSchema = z.object({ id: z.string(), name: z.string() });

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("apiUrl", () => {
  it("defaults to localhost:4000 when NEXT_PUBLIC_API_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(apiUrl("/api/health")).toBe("http://localhost:4000/api/health");
  });

  it("uses NEXT_PUBLIC_API_URL and strips a trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com/");
    expect(apiUrl("/api/health")).toBe("https://api.example.com/api/health");
  });

  it("appends only defined, non-empty query params", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.example.com");
    const url = apiUrl("/api/products", {
      page: 2,
      category: undefined,
      pattern: "",
    });
    expect(url).toBe("https://api.example.com/api/products?page=2");
  });
});

describe("apiRequest", () => {
  it("returns schema-validated data with latency and status on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ id: "p1", name: "Widget" })),
    );

    const result = await apiRequest("/api/products/p1", productLikeSchema);

    expect(result.data).toEqual({ id: "p1", name: "Widget" });
    expect(result.status).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("throws ApiError with the server's message/code/details on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            statusCode: 409,
            error: "ConflictError",
            message: 'Product with sku "abc" already exists',
          },
          { status: 409 },
        ),
      ),
    );

    await expect(
      apiRequest("/api/products", productLikeSchema, {
        method: "POST",
        body: { sku: "abc" },
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      code: "ConflictError",
      message: 'Product with sku "abc" already exists',
    });
  });

  it("carries field-level validation details from a 400 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            error: "Bad Request",
            message: "Request validation failed",
            details: [{ path: "/price", message: "Expected number" }],
          },
          { status: 400 },
        ),
      ),
    );

    try {
      await apiRequest("/api/products", productLikeSchema, { method: "POST" });
      expect.unreachable("expected apiRequest to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).details).toEqual([
        { path: "/price", message: "Expected number" },
      ]);
    }
  });

  it("throws ApiNetworkError when fetch itself rejects", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    await expect(
      apiRequest("/api/products", productLikeSchema),
    ).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it("does not attempt to parse a body for 204 responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    const result = await apiRequest("/api/products/p1", null, {
      method: "DELETE",
    });
    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });

  it("throws a schema validation error when the response does not match the contract", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ id: "p1" })),
    );

    await expect(
      apiRequest("/api/products/p1", productLikeSchema),
    ).rejects.toThrow();
  });
});
