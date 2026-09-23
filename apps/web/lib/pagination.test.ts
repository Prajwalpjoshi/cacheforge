import { describe, expect, it } from "vitest";
import { buildPageList, pageRange } from "./pagination";

describe("buildPageList", () => {
  it("returns an empty list for zero pages", () => {
    expect(buildPageList(1, 0)).toEqual([]);
  });

  it("lists every page when there are 7 or fewer", () => {
    expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("collapses with a trailing ellipsis near the start", () => {
    expect(buildPageList(1, 9)).toEqual([1, 2, "ellipsis", 9]);
  });

  it("collapses with a leading ellipsis near the end", () => {
    expect(buildPageList(9, 9)).toEqual([1, "ellipsis", 8, 9]);
  });

  it("collapses with ellipses on both sides in the middle", () => {
    expect(buildPageList(5, 9)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      9,
    ]);
  });

  it("never duplicates a page number at the boundary", () => {
    // current=2 on a 9-page list: candidates are 1,2,3,9 — page 1 must
    // not appear twice even though it's both "first" and "current-1".
    expect(buildPageList(2, 9)).toEqual([1, 2, 3, "ellipsis", 9]);
  });
});

describe("pageRange", () => {
  it("returns [0, 0] when there are no results", () => {
    expect(pageRange(1, 10, 0)).toEqual([0, 0]);
  });

  it("computes the first page's range", () => {
    expect(pageRange(1, 10, 81)).toEqual([1, 10]);
  });

  it("computes a middle page's range", () => {
    expect(pageRange(2, 10, 81)).toEqual([11, 20]);
  });

  it("clamps the last page's range to the total", () => {
    expect(pageRange(9, 10, 81)).toEqual([81, 81]);
  });
});
