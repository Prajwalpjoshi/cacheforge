import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Compact technical tables (PROJECT_SPEC.md #13) — wrapped in an
 * overflow-x-auto container so they degrade to horizontal scroll at
 * ~768px rather than breaking layout. `contain-layout` isolates that
 * scroll region from the rest of the page: without it, a wide <table>
 * that genuinely needs to scroll here can otherwise inflate
 * `document.documentElement.scrollWidth` and make the whole page
 * horizontally scrollable, even though this container's own
 * clientWidth/scrollWidth (and every visual clip) are already correct
 * — a real, reproducible browser quirk with table layout, not just a
 * theoretical one.
 */
export function TableContainer({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("w-full overflow-x-auto contain-layout", className)}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full min-w-max border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("border-b border-border", className)} {...props} />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border/60", className)} {...props} />
  );
}

export function TableRow({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-raised/60", className)}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-3 py-2.5 text-foreground", className)} {...props} />
  );
}
