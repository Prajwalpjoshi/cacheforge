import { CacheStatus, Prisma } from "../generated/prisma/client.js";
import type { Product as PrismaProduct } from "../generated/prisma/client.js";
import type { Cache, CacheResultStatus, PubSub } from "@cacheforge/cache-kit";
import type {
  CreateProductRequest,
  Product,
  ProductListQuery,
  ProductListResponse,
  UpdateProductRequest,
} from "@cacheforge/contracts";
import { ConflictError, NotFoundError } from "../errors.js";
import type { ProductRepository } from "../repositories/product.repository.js";
import {
  PRODUCT_LIST_TAG,
  TTL,
  productKey,
  productListKey,
} from "../cache/keys.js";
import { publishProductEvent } from "../events.js";

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

function mapCacheStatus(status: CacheResultStatus): CacheStatus {
  switch (status) {
    case "hit":
      return CacheStatus.HIT;
    case "miss":
      return CacheStatus.MISS;
    case "bypass":
      return CacheStatus.BYPASS;
    default: {
      const exhaustiveCheck: never = status;
      throw new Error(
        `Unhandled cache result status: ${String(exhaustiveCheck)}`,
      );
    }
  }
}

export interface ProductGetResult {
  product: Product;
  cacheStatus: CacheStatus;
}

export interface ProductListResult {
  response: ProductListResponse;
  cacheStatus: CacheStatus;
}

export interface ProductServiceDeps {
  repository: ProductRepository;
  cache: Cache;
  pubsub: PubSub;
}

/**
 * GET paths: controller -> service -> cache -> repository only on a
 * real miss/bypass. Write paths: controller -> service -> repository
 * -> cache invalidation -> pub/sub event, invalidation/publish only
 * ever running after the database mutation itself has succeeded
 * (PROJECT_SPEC.md §9/§17).
 */
export function createProductService(deps: ProductServiceDeps) {
  const { repository, cache, pubsub } = deps;

  return {
    async getById(id: string): Promise<ProductGetResult> {
      const result = await cache.getOrSet(
        productKey(id),
        TTL.PRODUCT,
        async () => {
          const row = await repository.findById(id);
          if (!row) {
            throw new NotFoundError(`Product "${id}" not found`);
          }
          return toProductDTO(row);
        },
      );

      return {
        product: result.value,
        cacheStatus: mapCacheStatus(result.status),
      };
    },

    async list(query: ProductListQuery): Promise<ProductListResult> {
      const result = await cache.getOrSet(
        productListKey(query),
        TTL.PRODUCT_LIST,
        async () => {
          const { items, total } = await repository.list(query);
          return {
            items: items.map(toProductDTO),
            page: query.page,
            pageSize: query.pageSize,
            total,
          };
        },
        { tags: [PRODUCT_LIST_TAG] },
      );

      return {
        response: result.value,
        cacheStatus: mapCacheStatus(result.status),
      };
    },

    async create(input: CreateProductRequest): Promise<Product> {
      const existing = await repository.findBySku(input.sku);
      if (existing) {
        throw new ConflictError(
          `Product with sku "${input.sku}" already exists`,
        );
      }

      let row: PrismaProduct;
      try {
        row = await repository.create({
          sku: input.sku,
          name: input.name,
          description: input.description ?? null,
          category: input.category,
          price: input.price,
          stock: input.stock,
        });
      } catch (error) {
        if (isUniqueConstraintViolation(error)) {
          throw new ConflictError(
            `Product with sku "${input.sku}" already exists`,
          );
        }
        throw error;
      }

      const product = toProductDTO(row);
      // Only reachable once the mutation above has committed — a
      // rejected write never invalidates existing valid cache entries.
      await cache.invalidateTag(PRODUCT_LIST_TAG);
      await publishProductEvent(pubsub, "product.updated", {
        id: product.id,
        sku: product.sku,
      });
      return product;
    },

    async update(id: string, input: UpdateProductRequest): Promise<Product> {
      let row: PrismaProduct;
      try {
        row = await repository.update(id, input);
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw new NotFoundError(`Product "${id}" not found`);
        }
        throw error;
      }

      const product = toProductDTO(row);
      await cache.delete(productKey(id));
      await cache.invalidateTag(PRODUCT_LIST_TAG);
      await publishProductEvent(pubsub, "product.updated", {
        id: product.id,
        sku: product.sku,
      });
      return product;
    },

    async delete(id: string): Promise<void> {
      let row: PrismaProduct;
      try {
        row = await repository.delete(id);
      } catch (error) {
        if (isRecordNotFound(error)) {
          throw new NotFoundError(`Product "${id}" not found`);
        }
        throw error;
      }

      await cache.delete(productKey(id));
      await cache.invalidateTag(PRODUCT_LIST_TAG);
      await publishProductEvent(pubsub, "product.deleted", {
        id: row.id,
        sku: row.sku,
      });
    },
  };
}

export type ProductService = ReturnType<typeof createProductService>;
