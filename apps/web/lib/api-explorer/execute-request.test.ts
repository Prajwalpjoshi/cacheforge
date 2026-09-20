import { afterEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "./catalog";
import { executeRequest } from "./execute-request";

afterEach(() => {
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

const getProduct = ENDPOINTS.find((e) => e.id === "products.get")!;
const createProduct = ENDPOINTS.find((e) => e.id === "products.create")!;
const deleteCacheKey = ENDPOINTS.find((e) => e.id === "cache.delete")!;
const listRequests = ENDPOINTS.find((e) => e.id === "metrics.requests")!;

describe("executeRequest", () => {
  it("substitutes path params and sends a GET with no body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "p1" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeRequest({
      endpoint: getProduct,
      pathValues: { id: "p1" },
      queryValues: {},
      bodyValues: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/products/p1"),
      expect.objectContaining({ method: "GET", body: undefined }),
    );
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ id: "p1" });
  });

  it("URL-encodes a path param containing special characters (e.g. a namespaced cache key)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await executeRequest({
      endpoint: deleteCacheKey,
      pathValues: { key: "cacheforge:product:abc" },
      queryValues: {},
      bodyValues: null,
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain(encodeURIComponent("cacheforge:product:abc"));
  });

  it("only includes non-empty query params, coercing values to strings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await executeRequest({
      endpoint: listRequests,
      pathValues: {},
      queryValues: { limit: "10", route: "", method: "GET" },
      bodyValues: null,
    });

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("limit")).toBe("10");
    expect(calledUrl.searchParams.has("route")).toBe(false);
    expect(calledUrl.searchParams.get("method")).toBe("GET");
  });

  it("coerces number-kind body fields and drops empty optional fields", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: "p1" }, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await executeRequest({
      endpoint: createProduct,
      pathValues: {},
      queryValues: {},
      bodyValues: {
        sku: "abc",
        name: "Widget",
        description: "",
        category: "demo",
        price: "19.99",
        stock: "5",
      },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(sentBody).toEqual({
      sku: "abc",
      name: "Widget",
      category: "demo",
      price: 19.99,
      stock: 5,
    });
  });

  it("never throws on a non-2xx response — it returns the real error body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          statusCode: 404,
          error: "NotFoundError",
          message: 'Product "x" not found',
        },
        { status: 404, statusText: "Not Found" },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await executeRequest({
      endpoint: getProduct,
      pathValues: { id: "x" },
      queryValues: {},
      bodyValues: null,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ message: 'Product "x" not found' });
  });

  it("reports a network failure without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const result = await executeRequest({
      endpoint: getProduct,
      pathValues: { id: "x" },
      queryValues: {},
      bodyValues: null,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.networkError).toBeTruthy();
  });
});
