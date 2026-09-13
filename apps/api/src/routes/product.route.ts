import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  createProductRequestSchema,
  productIdParamsSchema,
  productListQuerySchema,
  productListResponseSchema,
  productSchema,
  updateProductRequestSchema,
} from "../schemas/product.schema.js";
import { createProductRepository } from "../repositories/product.repository.js";
import { createProductService } from "../services/product.service.js";
import {
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from "../controllers/product.controller.js";

export async function productRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = createProductRepository(fastify.prisma);
  const service = createProductService({
    repository,
    cache: fastify.cache,
    pubsub: fastify.pubsub,
  });
  fastify.decorate("productService", service);

  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.route({
    method: "GET",
    url: "/products",
    schema: {
      querystring: productListQuerySchema,
      response: { 200: productListResponseSchema },
    },
    handler: listProductsController,
  });

  app.route({
    method: "GET",
    url: "/products/:id",
    schema: {
      params: productIdParamsSchema,
      response: { 200: productSchema },
    },
    handler: getProductController,
  });

  app.route({
    method: "POST",
    url: "/products",
    schema: {
      body: createProductRequestSchema,
      response: { 201: productSchema },
    },
    handler: createProductController,
  });

  app.route({
    method: "PUT",
    url: "/products/:id",
    schema: {
      params: productIdParamsSchema,
      body: updateProductRequestSchema,
      response: { 200: productSchema },
    },
    handler: updateProductController,
  });

  app.route({
    method: "DELETE",
    url: "/products/:id",
    schema: {
      params: productIdParamsSchema,
    },
    handler: deleteProductController,
  });
}
