import type {
  BenchmarkMode,
  BenchmarkRun,
  PrismaClient,
} from "../generated/prisma/client.js";

export interface CreateBenchmarkRunData {
  label: string | null;
  targetRoute: string;
  mode: BenchmarkMode;
  iterations: number;
  concurrency: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  throughputRps: number;
  cacheHitRate: number | null;
  /** number[] for DB_ONLY/CACHE_ONLY; a structured object for COMPARISON — see benchmark.service.ts. */
  rawLatenciesMs: unknown;
}

export interface ListBenchmarkRunsParams {
  page: number;
  pageSize: number;
  search?: string;
  mode?: BenchmarkMode;
}

export interface ListBenchmarkRunsResult {
  items: BenchmarkRun[];
  total: number;
}

export function createBenchmarkRepository(prisma: PrismaClient) {
  return {
    async create(data: CreateBenchmarkRunData): Promise<BenchmarkRun> {
      return prisma.benchmarkRun.create({
        data: {
          ...data,
          rawLatenciesMs: data.rawLatenciesMs as never,
        },
      });
    },

    async findById(id: string): Promise<BenchmarkRun | null> {
      return prisma.benchmarkRun.findUnique({ where: { id } });
    },

    async list(
      params: ListBenchmarkRunsParams,
    ): Promise<ListBenchmarkRunsResult> {
      const where: Record<string, unknown> = {};

      if (params.search) {
        where.OR = [
          { targetRoute: { contains: params.search, mode: "insensitive" } },
          { label: { contains: params.search, mode: "insensitive" } },
        ];
      }
      if (params.mode) where.mode = params.mode;

      const [items, total] = await Promise.all([
        prisma.benchmarkRun.findMany({
          where,
          // createdAt DESC alone isn't strictly deterministic across runs
          // persisted in the same millisecond; id breaks ties so
          // pagination never skips or repeats a row across pages.
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        prisma.benchmarkRun.count({ where }),
      ]);

      return { items, total };
    },
  };
}

export type BenchmarkRepository = ReturnType<typeof createBenchmarkRepository>;
