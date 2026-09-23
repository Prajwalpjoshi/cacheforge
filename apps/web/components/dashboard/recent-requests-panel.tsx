"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  CacheStatusValue,
  DataSourceValue,
  RequestMetricsQuery,
  RequestStatusClass,
} from "@cacheforge/contracts";
import { useRequestMetrics } from "@/lib/hooks/use-request-metrics";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/api/error-message";
import { RecentRequestsTable } from "./recent-requests-table";
import { PaginationControls } from "./pagination-controls";
import {
  EMPTY_REQUEST_FILTERS,
  RequestFiltersBar,
  hasActiveFilters,
  type RequestFiltersState,
} from "./request-filters-bar";

const SEARCH_DEBOUNCE_MS = 350;
const DEFAULT_PAGE_SIZE = 10;

/**
 * Owns all Recent Requests state (page, page size, search, filters) and
 * its own GET /api/metrics/requests query — deliberately separate from
 * the dashboard's chart query (see dashboard-view.tsx) so paging or
 * filtering this table never refetches or changes the Requests-by-route
 * / latency charts (PROJECT_SPEC.md #21 for this task).
 */
export function RecentRequestsPanel({
  windowMinutes,
}: {
  windowMinutes: number;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filters, setFilters] = useState<RequestFiltersState>(
    EMPTY_REQUEST_FILTERS,
  );

  const debouncedSearch = useDebouncedValue(
    filters.search.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  // Uses the debounced search (what's actually driving the current
  // query) rather than the raw input, so the empty-state copy reflects
  // the results actually being shown, not an in-flight keystroke.
  const filtersActive = hasActiveFilters({
    ...filters,
    search: debouncedSearch,
  });

  // Any change that alters the result set invalidates the current page
  // number, so land back on page 1 — adjusted during render (React's
  // documented alternative to an effect for "reset state when an input
  // changes") rather than in a useEffect, which would cause an extra
  // commit with the stale page still in flight.
  const resultSetKey = [
    debouncedSearch,
    filters.method,
    filters.statusClass,
    filters.cacheStatus,
    filters.source,
    pageSize,
    windowMinutes,
  ].join("\u0000");
  const [prevResultSetKey, setPrevResultSetKey] = useState(resultSetKey);
  if (resultSetKey !== prevResultSetKey) {
    setPrevResultSetKey(resultSetKey);
    setPage(1);
  }

  const query = useMemo<Partial<RequestMetricsQuery>>(
    () => ({
      page,
      pageSize,
      windowMinutes,
      search: debouncedSearch || undefined,
      method: (filters.method || undefined) as RequestMetricsQuery["method"],
      statusClass: (filters.statusClass || undefined) as
        RequestStatusClass | undefined,
      cacheStatus: (filters.cacheStatus || undefined) as
        CacheStatusValue | undefined,
      source: (filters.source || undefined) as DataSourceValue | undefined,
    }),
    [
      page,
      pageSize,
      windowMinutes,
      debouncedSearch,
      filters.method,
      filters.statusClass,
      filters.cacheStatus,
      filters.source,
    ],
  );

  const requestsQuery = useRequestMetrics(query);

  const isInitialLoad = requestsQuery.isPending;
  const isRefreshing = requestsQuery.isFetching && !isInitialLoad;
  const response = requestsQuery.data?.data;
  const total = response?.total ?? 0;

  return (
    <>
      <RequestFiltersBar filters={filters} onChange={setFilters} />

      {isRefreshing && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs text-muted"
            role="status"
          >
            <Loader2 aria-hidden="true" className="size-3 animate-spin" />
            Updating…
          </span>
        </div>
      )}

      {isInitialLoad ? (
        <div className="p-5">
          <Skeleton className="h-48 w-full" />
        </div>
      ) : requestsQuery.isError ? (
        <div className="p-5">
          <ErrorState
            message={`Unable to load recent requests. ${getErrorMessage(requestsQuery.error)}`}
            onRetry={() => void requestsQuery.refetch()}
          />
        </div>
      ) : response && response.items.length > 0 ? (
        <RecentRequestsTable requests={response.items} />
      ) : filtersActive ? (
        <EmptyState
          title="No requests found"
          description="Try changing your search or filters."
        />
      ) : (
        <EmptyState
          title="No requests in this time window"
          description="Try the API Explorer to generate real requests, then come back here."
        />
      )}

      {!isInitialLoad && !requestsQuery.isError && (
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  );
}
