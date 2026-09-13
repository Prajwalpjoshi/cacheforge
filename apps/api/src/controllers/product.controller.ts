import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  CreateProductRequest,
  ProductIdParams,
  ProductListQuery,
  UpdateProductRequest,
} from "@cacheforge/contracts";

export async function listProductsController(
  request: FastifyRequest<{ Querystring: ProductListQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.productService.list(request.query);
  reply.send(result);
}

export async function getProductController(
  request: FastifyRequest<{ Params: ProductIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.productService.getById(request.params.id);
  reply.send(result);
}

export async function createProductController(
  request: FastifyRequest<{ Body: CreateProductRequest }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.productService.create(request.body);
  reply.status(201).send(result);
}

export async function updateProductController(
  request: FastifyRequest<{
    Params: ProductIdParams;
    Body: UpdateProductRequest;
  }>,
  reply: FastifyReply,
): Promise<void> {
  const result = await request.server.productService.update(
    request.params.id,
    request.body,
  );
  reply.send(result);
}

export async function deleteProductController(
  request: FastifyRequest<{ Params: ProductIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  await request.server.productService.delete(request.params.id);
  reply.status(204).send();
}
