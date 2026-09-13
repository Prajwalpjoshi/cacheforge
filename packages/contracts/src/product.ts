import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Product = z.infer<typeof productSchema>;

export const createProductRequestSchema = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullish(),
  category: z.string().trim().min(1).max(100),
  price: z.number().positive(),
  stock: z.number().int().nonnegative().default(0),
});

export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

export const updateProductRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    category: z.string().trim().min(1).max(100),
    price: z.number().positive(),
    stock: z.number().int().nonnegative(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

export const productListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  category: z.string().trim().min(1).max(100).optional(),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;

export const productListResponseSchema = z.object({
  items: z.array(productSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;

export const productIdParamsSchema = z.object({
  id: z.cuid(),
});

export type ProductIdParams = z.infer<typeof productIdParamsSchema>;
