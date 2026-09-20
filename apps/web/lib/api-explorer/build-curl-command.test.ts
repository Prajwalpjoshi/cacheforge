import { afterEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "./catalog";
import { buildCurlCommand } from "./build-curl-command";

afterEach(() => {
  vi.unstubAllEnvs();
});

const getProduct = ENDPOINTS.find((e) => e.id === "products.get")!;
const createProduct = ENDPOINTS.find((e) => e.id === "products.create")!;
const listProducts = ENDPOINTS.find((e) => e.id === "products.list")!;

describe("buildCurlCommand", () => {
  it("substitutes path params into the URL", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    const command = buildCurlCommand({
      endpoint: getProduct,
      pathValues: { id: "p1" },
      queryValues: {},
      body: undefined,
    });
    expect(command).toBe("curl -X GET 'http://localhost:4000/api/products/p1'");
  });

  it("includes non-empty query params and omits empty ones", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    const command = buildCurlCommand({
      endpoint: listProducts,
      pathValues: {},
      queryValues: { page: "2", category: "" },
      body: undefined,
    });
    expect(command).toBe(
      "curl -X GET 'http://localhost:4000/api/products?page=2'",
    );
  });

  it("adds a JSON body and content-type header when a body is present", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    const command = buildCurlCommand({
      endpoint: createProduct,
      pathValues: {},
      queryValues: {},
      body: { sku: "abc", price: 19.99 },
    });
    expect(command).toBe(
      "curl -X POST 'http://localhost:4000/api/products' -H 'content-type: application/json' -d '{\"sku\":\"abc\",\"price\":19.99}'",
    );
  });

  it("omits the body flags entirely when there is nothing to send", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");
    const command = buildCurlCommand({
      endpoint: createProduct,
      pathValues: {},
      queryValues: {},
      body: {},
    });
    expect(command).toBe("curl -X POST 'http://localhost:4000/api/products'");
  });
});
