export type PageItem = number | "ellipsis";

/**
 * Compact page-number list for pagination controls: always includes
 * page 1, the last page, and a window around the current page,
 * collapsing longer runs into a single "ellipsis" marker (e.g.
 * "1 2 3 … 8 9") instead of rendering dozens of page buttons.
 */
export function buildPageList(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const candidates = new Set<number>(
    [1, totalPages, current - 1, current, current + 1].filter(
      (page) => page >= 1 && page <= totalPages,
    ),
  );
  const sorted = [...candidates].sort((a, b) => a - b);

  const items: PageItem[] = [];
  let previous = 0;
  for (const page of sorted) {
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
    previous = page;
  }
  return items;
}

/** [from, to] 1-indexed row range for a "Showing X–Y of Z" label; both are 0 when there are no results. */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): [number, number] {
  if (total === 0) return [0, 0];
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return [from, to];
}
