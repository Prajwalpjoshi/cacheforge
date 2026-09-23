"use client";

import { Search, X } from "lucide-react";
import { Input, Label, Select } from "@/components/ui/input";

export interface RequestFiltersState {
  search: string;
  method: string;
  statusClass: string;
  cacheStatus: string;
  source: string;
}

export const EMPTY_REQUEST_FILTERS: RequestFiltersState = {
  search: "",
  method: "",
  statusClass: "",
  cacheStatus: "",
  source: "",
};

export function hasActiveFilters(filters: RequestFiltersState): boolean {
  return Object.values(filters).some((value) => value !== "");
}

/** Server-side search/filter bar for the Recent Requests table — every field maps to a real GET /api/metrics/requests query param, never a client-side filter over already-fetched rows. */
export function RequestFiltersBar({
  filters,
  onChange,
}: {
  filters: RequestFiltersState;
  onChange: (next: RequestFiltersState) => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border p-4">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
        <Label htmlFor="recent-requests-search">Search endpoint</Label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="recent-requests-search"
            placeholder="Search endpoint…"
            value={filters.search}
            onChange={(event) =>
              onChange({ ...filters, search: event.target.value })
            }
            className="pl-8 pr-8"
          />
          {filters.search && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onChange({ ...filters, search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recent-requests-method">Method</Label>
        <Select
          id="recent-requests-method"
          className="w-[6.5rem]"
          value={filters.method}
          onChange={(event) =>
            onChange({ ...filters, method: event.target.value })
          }
        >
          <option value="">All</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recent-requests-status">Status</Label>
        <Select
          id="recent-requests-status"
          className="w-20"
          value={filters.statusClass}
          onChange={(event) =>
            onChange({ ...filters, statusClass: event.target.value })
          }
        >
          <option value="">All</option>
          <option value="2xx">2xx</option>
          <option value="4xx">4xx</option>
          <option value="5xx">5xx</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recent-requests-cache">Cache</Label>
        <Select
          id="recent-requests-cache"
          className="w-[6.5rem]"
          value={filters.cacheStatus}
          onChange={(event) =>
            onChange({ ...filters, cacheStatus: event.target.value })
          }
        >
          <option value="">All</option>
          <option value="HIT">HIT</option>
          <option value="MISS">MISS</option>
          <option value="BYPASS">BYPASS</option>
          <option value="NOT_APPLICABLE">N/A</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recent-requests-source">Source</Label>
        <Select
          id="recent-requests-source"
          className="w-[6.5rem]"
          value={filters.source}
          onChange={(event) =>
            onChange({ ...filters, source: event.target.value })
          }
        >
          <option value="">All</option>
          <option value="CACHE">Redis</option>
          <option value="DB">Postgres</option>
        </Select>
      </div>
    </div>
  );
}
