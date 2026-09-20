import {
  productListResponseSchema,
  productSchema,
  type CreateProductRequest,
  type Product,
  type ProductListQuery,
  type ProductListResponse,
  type UpdateProductRequest,
} from "@cacheforge/contracts";
import { apiRequest, type ApiResult } from "./client";

export async function listProducts(
  query: Partial<ProductListQuery> = {},
): Promise<ApiResult<ProductListResponse>> {
  return apiRequest("/api/products", productListResponseSchema, { query });
}

export async function getProduct(id: string): Promise<ApiResult<Product>> {
  return apiRequest(`/api/products/${id}`, productSchema);
}

export async function createProduct(
  body: CreateProductRequest,
): Promise<ApiResult<Product>> {
  return apiRequest("/api/products", productSchema, { method: "POST", body });
}

export async function updateProduct(
  id: string,
  body: UpdateProductRequest,
): Promise<ApiResult<Product>> {
  return apiRequest(`/api/products/${id}`, productSchema, {
    method: "PUT",
    body,
  });
}

export async function deleteProduct(id: string): Promise<ApiResult<void>> {
  return apiRequest(`/api/products/${id}`, null, { method: "DELETE" });
}
