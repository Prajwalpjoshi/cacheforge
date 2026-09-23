"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildPageList, pageRange } from "@/lib/pagination";
import { formatInteger } from "@/lib/format";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const pageButtonClass =
  "inline-flex size-7 items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:pointer-events-none disabled:opacity-40";

export function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [from, to] = pageRange(page, pageSize, total);
  const pages = buildPageList(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          {total === 0
            ? "0 requests"
            : `Showing ${formatInteger(from)}–${formatInteger(to)} of ${formatInteger(total)} requests`}
        </span>
        <label className="flex items-center gap-1.5">
          <span className="sr-only">Rows per page</span>
          <Select
            aria-label="Rows per page"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-7 w-16 px-2 text-xs"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </Select>
          <span>/ page</span>
        </label>
      </div>

      <nav
        aria-label="Recent requests pagination"
        className="flex items-center gap-1"
      >
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={cn(pageButtonClass, "text-muted hover:text-foreground")}
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
        </button>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-1 text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              aria-current={item === page ? "page" : undefined}
              onClick={() => onPageChange(item)}
              className={cn(
                pageButtonClass,
                item === page
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={cn(pageButtonClass, "text-muted hover:text-foreground")}
        >
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      </nav>
    </div>
  );
}
