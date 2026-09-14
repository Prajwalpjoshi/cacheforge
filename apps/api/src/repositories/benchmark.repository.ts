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

    async list(limit: number): Promise<BenchmarkRun[]> {
      return prisma.benchmarkRun.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
    },
  };
}

export type BenchmarkRepository = ReturnType<typeof createBenchmarkRepository>;
