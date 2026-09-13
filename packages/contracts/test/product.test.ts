import { describe, expect, it } from "vitest";
import {
  createProductRequestSchema,
  productIdParamsSchema,
  productListQuerySchema,
  updateProductRequestSchema,
} from "../src/product.js";

describe("createProductRequestSchema", () => {
  it("accepts a valid product and defaults stock to 0", () => {
    const result = createProductRequestSchema.safeParse({
      sku: "SKU-1",
      name: "Widget",
      category: "widgets",
      price: 9.99,
    });
    expect(result.success).toBe(true);
    expect(result.data?.stock).toBe(0);
  });

  it("rejects a missing sku", () => {
    const result = createProductRequestSchema.safeParse({
      name: "Widget",
      category: "widgets",
      price: 9.99,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative price", () => {
    expect(
      createProductRequestSchema.safeParse({
        sku: "SKU-1",
        name: "Widget",
        category: "widgets",
        price: 0,
      }).success,
    ).toBe(false);

    expect(
      createProductRequestSchema.safeParse({
        sku: "SKU-1",
        name: "Widget",
        category: "widgets",
        price: -5,
      }).success,
    ).toBe(false);
  });

  it("rejects a negative or non-integer stock", () => {
    expect(
      createProductRequestSchema.safeParse({
        sku: "SKU-1",
        name: "Widget",
        category: "widgets",
        price: 9.99,
        stock: -1,
      }).success,
    ).toBe(false);

    expect(
      createProductRequestSchema.safeParse({
        sku: "SKU-1",
        name: "Widget",
        category: "widgets",
        price: 9.99,
        stock: 1.5,
      }).success,
    ).toBe(false);
  });
});

describe("updateProductRequestSchema", () => {
  it("accepts a single-field update", () => {
    const result = updateProductRequestSchema.safeParse({ price: 19.99 });
    expect(result.success).toBe(true);
  });

  it("rejects an empty payload", () => {
    const result = updateProductRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects sku as a field (not part of the update contract)", () => {
    const result = updateProductRequestSchema.safeParse({ sku: "NEW-SKU" });
    expect(result.success).toBe(false);
  });
});

describe("productListQuerySchema", () => {
  it("defaults page and pageSize when omitted", () => {
    const result = productListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 1, pageSize: 20 });
  });

  it("coerces string query params to numbers", () => {
    const result = productListQuerySchema.safeParse({
      page: "2",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    expect(result.data?.page).toBe(2);
    expect(result.data?.pageSize).toBe(50);
  });

  it("rejects a pageSize above the max", () => {
    const result = productListQuerySchema.safeParse({ pageSize: "500" });
    expect(result.success).toBe(false);
  });
});

describe("productIdParamsSchema", () => {
  it("accepts a valid cuid", () => {
    const result = productIdParamsSchema.safeParse({
      id: "cl9dfoo0000gv7z6zjklxyz1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-cuid id", () => {
    const result = productIdParamsSchema.safeParse({ id: "not-a-cuid" });
    expect(result.success).toBe(false);
  });
});
