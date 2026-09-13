import type { PrismaClient, Product } from "../generated/prisma/client.js";

export interface CreateProductData {
  sku: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  stock: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string | null;
  category?: string;
  price?: number;
  stock?: number;
}

export interface ListProductsParams {
  page: number;
  pageSize: number;
  category?: string;
}

export interface ListProductsResult {
  items: Product[];
  total: number;
}

export function createProductRepository(prisma: PrismaClient) {
  return {
    async findById(id: string): Promise<Product | null> {
      return prisma.product.findUnique({ where: { id } });
    },

    async findBySku(sku: string): Promise<Product | null> {
      return prisma.product.findUnique({ where: { sku } });
    },

    async list(params: ListProductsParams): Promise<ListProductsResult> {
      const where = params.category ? { category: params.category } : {};

      const [items, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        prisma.product.count({ where }),
      ]);

      return { items, total };
    },

    async create(data: CreateProductData): Promise<Product> {
      return prisma.product.create({ data });
    },

    async update(id: string, data: UpdateProductData): Promise<Product> {
      return prisma.product.update({ where: { id }, data });
    },

    async delete(id: string): Promise<Product> {
      return prisma.product.delete({ where: { id } });
    },
  };
}

export type ProductRepository = ReturnType<typeof createProductRepository>;
