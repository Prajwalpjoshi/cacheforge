"use client";

import { Search, X } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/input";

export interface BenchmarkFiltersState {
  search: string;
  mode: string;
}

export const EMPTY_BENCHMARK_FILTERS: BenchmarkFiltersState = {
  search: "",
  mode: "",
};

const ROWS_OPTIONS = [10, 20, 50];

/** Server-side search/filter/rows toolbar for the History table — every control maps to a real GET /api/benchmarks query param, never a client-side filter over already-fetched rows. */
export function BenchmarkHistoryToolbar({
  filters,
  onFiltersChange,
  pageSize,
  onPageSizeChange,
}: {
  filters: BenchmarkFiltersState;
  onFiltersChange: (next: BenchmarkFiltersState) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <Label htmlFor="benchmark-history-search">Search</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="benchmark-history-search"
            placeholder="Search target or label…"
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
            className="pl-8 pr-8"
          />
          {filters.search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onFiltersChange({ ...filters, search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="benchmark-history-mode">Mode</Label>
        <Select
          id="benchmark-history-mode"
          className="w-40"
          value={filters.mode}
          onChange={(event) =>
            onFiltersChange({ ...filters, mode: event.target.value })
          }
        >
          <option value="">All modes</option>
          <option value="COMPARISON">COMPARISON</option>
          <option value="DB_ONLY">DB_ONLY</option>
          <option value="CACHE_ONLY">CACHE_ONLY</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="benchmark-history-rows">Rows</Label>
        <Select
          id="benchmark-history-rows"
          className="w-20"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {ROWS_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
