-- CreateIndex
CREATE INDEX "BenchmarkRun_createdAt_idx" ON "BenchmarkRun"("createdAt");

-- CreateIndex
CREATE INDEX "BenchmarkRun_mode_createdAt_idx" ON "BenchmarkRun"("mode", "createdAt");
