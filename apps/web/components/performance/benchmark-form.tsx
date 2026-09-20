"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import {
  benchmarkRunRequestSchema,
  type BenchmarkRunRequest,
} from "@cacheforge/contracts";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { InlineErrorBanner } from "@/components/ui/error-state";

type FormValues = z.input<typeof benchmarkRunRequestSchema>;

const MODE_DESCRIPTIONS: Record<BenchmarkRunRequest["mode"], string> = {
  DB_ONLY:
    "Every iteration bypasses Redis entirely — a direct PostgreSQL query.",
  CACHE_ONLY:
    "Every iteration goes through the real cache-aside service path (Redis-backed).",
  COMPARISON:
    "Runs DB_ONLY, then CACHE_ONLY, against the same target, back to back.",
};

const DEFAULT_VALUES: FormValues = {
  targetRoute: "products.get",
  mode: "COMPARISON",
  iterations: 30,
  concurrency: 1,
};

export function BenchmarkForm({
  onSubmit,
  submitting,
  submitError,
}: {
  onSubmit: (input: BenchmarkRunRequest) => void;
  submitting: boolean;
  submitError: string | null;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(benchmarkRunRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const mode = useWatch({ control, name: "mode" });

  function submit(values: FormValues) {
    // The resolver has already validated `values` against
    // benchmarkRunRequestSchema, so re-parsing here only fills in
    // Zod's own defaults (e.g. concurrency) — it cannot fail.
    onSubmit(benchmarkRunRequestSchema.parse(values));
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetRoute">Target</Label>
          <Select id="targetRoute" {...register("targetRoute")}>
            <option value="products.get">GET /api/products/:id</option>
            <option value="products.list">GET /api/products</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="mode">Mode</Label>
          <Select id="mode" {...register("mode")}>
            <option value="DB_ONLY">DB_ONLY</option>
            <option value="CACHE_ONLY">CACHE_ONLY</option>
            <option value="COMPARISON">COMPARISON</option>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="iterations">Iterations (1-1000)</Label>
          <Input
            id="iterations"
            type="number"
            min={1}
            max={1000}
            {...register("iterations", { valueAsNumber: true })}
          />
          {errors.iterations && (
            <p className="text-xs text-status-down">
              {errors.iterations.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="concurrency">Concurrency (1-20)</Label>
          <Input
            id="concurrency"
            type="number"
            min={1}
            max={20}
            {...register("concurrency", { valueAsNumber: true })}
          />
          {errors.concurrency && (
            <p className="text-xs text-status-down">
              {errors.concurrency.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="label">Label (optional)</Label>
          <Input
            id="label"
            placeholder="e.g. after adding an index"
            {...register("label")}
          />
        </div>
      </div>

      <p className="text-xs text-muted">{MODE_DESCRIPTIONS[mode]}</p>

      {submitError && <InlineErrorBanner message={submitError} />}

      <div>
        <Button type="submit" loading={submitting} disabled={submitting}>
          {submitting ? "Running benchmark…" : "Run Benchmark"}
        </Button>
      </div>
    </form>
  );
}
