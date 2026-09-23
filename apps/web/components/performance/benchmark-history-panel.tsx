"use client";

import { useState } from "react";
import type { BenchmarkListQuery, BenchmarkMode } from "@cacheforge/contracts";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PaginationControls } from "@/components/dashboard/pagination-controls";
import { useBenchmarkHistory } from "@/lib/hooks/use-benchmarks";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { getErrorMessage } from "@/lib/api/error-message";
import { BenchmarkHistoryTable } from "./benchmark-history-table";
import {
  BenchmarkHistoryToolbar,
  EMPTY_BENCHMARK_FILTERS,
  type BenchmarkFiltersState,
} from "./benchmark-history-toolbar";

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Owns all History state (page, page size, search, mode filter) and its
 * own GET /api/benchmarks query — deliberately separate from the summary
 * strip's fixed unfiltered fetch (see benchmark-summary-strip.tsx) so
 * paging or filtering this table never refetches or changes the summary
 * tiles above it.
 */
export function BenchmarkHistoryPanel({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState<BenchmarkFiltersState>(
    EMPTY_BENCHMARK_FILTERS,
  );

  const debouncedSearch = useDebouncedValue(
    filters.search.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const filtersActive = debouncedSearch !== "" || filters.mode !== "";

  // Any change that alters the result set invalidates the current page
  // number, so land back on page 1 — adjusted during render rather than
  // in a useEffect, which would cause an extra commit with the stale
  // page still in flight.
  const resultSetKey = [debouncedSearch, filters.mode, pageSize].join("\u0000");
  const [prevResultSetKey, setPrevResultSetKey] = useState(resultSetKey);
  if (resultSetKey !== prevResultSetKey) {
    setPrevResultSetKey(resultSetKey);
    setPage(1);
  }

  const query: Partial<BenchmarkListQuery> = {
    page,
    pageSize,
    search: debouncedSearch || undefined,
    mode: (filters.mode || undefined) as BenchmarkMode | undefined,
  };

  const historyQuery = useBenchmarkHistory(query);
  const isInitialLoad = historyQuery.isPending;
  const response = historyQuery.data?.data;
  const total = response?.total ?? 0;

  return (
    <>
      <BenchmarkHistoryToolbar
        filters={filters}
        onFiltersChange={setFilters}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />

      {isInitialLoad ? (
        <div className="p-5">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : historyQuery.isError ? (
        <div className="p-5">
          <ErrorState
            message={`Unable to load benchmark history. ${getErrorMessage(historyQuery.error)}`}
            onRetry={() => void historyQuery.refetch()}
          />
        </div>
      ) : response && response.items.length > 0 ? (
        <BenchmarkHistoryTable runs={response.items} onSelect={onSelect} />
      ) : filtersActive ? (
        <EmptyState
          title="No benchmark runs found"
          description="Try changing your search or mode filter."
        />
      ) : (
        <EmptyState
          title="No benchmark runs yet"
          description="Run your first benchmark to compare database and Redis performance."
        />
      )}

      {!isInitialLoad && !historyQuery.isError && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="runs"
          ariaLabel="Benchmark history pagination"
          showPageSizeControl={false}
        />
      )}
    </>
  );
}
