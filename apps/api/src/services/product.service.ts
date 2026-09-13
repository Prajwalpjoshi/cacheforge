import { Prisma } from "../generated/prisma/client.js";
import type { Product as PrismaProduct } from "../generated/prisma/client.js";
import type {
  CreateProductRequest,
  Product,
  ProductListQuery,
  ProductListResponse,
  UpdateProductRequest,
} from "@cacheforge/contracts";
import { ConflictError, NotFoundError } from "../errors.js";
import type { ProductRepository } from "../repositories/product.repository.js";

function toProductDTO(row: PrismaProduct): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    category: row.category,
    price: row.price.toNumber(),
    stock: row.stock,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

export function createProductService(repository: ProductRepository) {
  return {
    async getById(id: string): Promise<Product> {
      const row = await repository.findById(id);
      if (!row) {
        throw new NotFoundError(`Product "${id}" not found`);
      }
      return toProductDTO(row);
    },

    async list(query: ProductListQuery): Promise<ProductListResponse> {
      const { items, total } = await repository.list(query);
      return {
        items: items.map(toProductDTO),
        page: query.page,
        pageSize: query.pageSize,
        total,
      };
    },

    async create(input: CreateProductRequest): Promise<Product> {
      const existing = await repository.findBySku(input.sku);
      if (existing) {
        throw new ConflictError(
          `Product with sku "${input.sku}" already exists`,
        );
      }

      try {
        const row = await repository.create({
          sku: input.sku,
          name: input.name,
          description: input.description ?? null,
          category: input.category,
          price: input.price,
          stock: input.stock,
        });
        return toProductDTO(row);
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw new ConflictError(
            `Product with sku "${input.sku}" already exists`,
          );
        }
        throw error;
      }
    },

    async update(id: string, input: UpdateProductRequest): Promise<Product> {
      try {
        const row = await repository.update(id, input);
        return toProductDTO(row);
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw new NotFoundError(`Product "${id}" not found`);
        }
        throw error;
      }
    },

    async delete(id: string): Promise<void> {
      try {
        await repository.delete(id);
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw new NotFoundError(`Product "${id}" not found`);
        }
        throw error;
      }
    },
  };
}

export type ProductService = ReturnType<typeof createProductService>;
