-- CreateEnum
CREATE TYPE "CacheStatus" AS ENUM ('HIT', 'MISS', 'BYPASS', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('DB', 'CACHE');

-- CreateEnum
CREATE TYPE "BenchmarkMode" AS ENUM ('DB_ONLY', 'CACHE_ONLY', 'COMPARISON');

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestMetric" (
    "id" BIGSERIAL NOT NULL,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "cacheStatus" "CacheStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "source" "DataSource" NOT NULL DEFAULT 'DB',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkRun" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "targetRoute" TEXT NOT NULL,
    "mode" "BenchmarkMode" NOT NULL,
    "iterations" INTEGER NOT NULL,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "minMs" DOUBLE PRECISION NOT NULL,
    "maxMs" DOUBLE PRECISION NOT NULL,
    "avgMs" DOUBLE PRECISION NOT NULL,
    "p50Ms" DOUBLE PRECISION NOT NULL,
    "p95Ms" DOUBLE PRECISION NOT NULL,
    "p99Ms" DOUBLE PRECISION NOT NULL,
    "throughputRps" DOUBLE PRECISION NOT NULL,
    "cacheHitRate" DOUBLE PRECISION,
    "rawLatenciesMs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "RequestMetric_route_createdAt_idx" ON "RequestMetric"("route", "createdAt");

-- CreateIndex
CREATE INDEX "RequestMetric_createdAt_idx" ON "RequestMetric"("createdAt");
