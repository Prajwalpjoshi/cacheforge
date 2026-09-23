/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EMPTY_REQUEST_FILTERS,
  RequestFiltersBar,
  hasActiveFilters,
} from "./request-filters-bar";

afterEach(cleanup);

describe("RequestFiltersBar", () => {
  it("renders the search input with an accessible label", () => {
    render(
      <RequestFiltersBar filters={EMPTY_REQUEST_FILTERS} onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText("Search endpoint")).toBeInTheDocument();
  });

  it("calls onChange with the updated search text as the user types", () => {
    const onChange = vi.fn();
    render(
      <RequestFiltersBar filters={EMPTY_REQUEST_FILTERS} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Search endpoint"), {
      target: { value: "products" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_REQUEST_FILTERS,
      search: "products",
    });
  });

  it("shows a clear button only when search text is present, and clears it", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RequestFiltersBar filters={EMPTY_REQUEST_FILTERS} onChange={onChange} />,
    );
    expect(
      screen.queryByRole("button", { name: "Clear search" }),
    ).not.toBeInTheDocument();

    rerender(
      <RequestFiltersBar
        filters={{ ...EMPTY_REQUEST_FILTERS, search: "products" }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_REQUEST_FILTERS,
      search: "",
    });
  });

  it("updates the method filter via the select", () => {
    const onChange = vi.fn();
    render(
      <RequestFiltersBar filters={EMPTY_REQUEST_FILTERS} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Method"), {
      target: { value: "POST" },
    });
    expect(onChange).toHaveBeenCalledWith({
      ...EMPTY_REQUEST_FILTERS,
      method: "POST",
    });
  });

  it("only exposes cache statuses the API actually represents", () => {
    render(
      <RequestFiltersBar filters={EMPTY_REQUEST_FILTERS} onChange={vi.fn()} />,
    );
    const select = screen.getByLabelText("Cache") as HTMLSelectElement;
    const options = [...select.options].map((option) => option.value);
    expect(options).toEqual(["", "HIT", "MISS", "BYPASS", "NOT_APPLICABLE"]);
  });
});

describe("hasActiveFilters", () => {
  it("is false when every filter is empty", () => {
    expect(hasActiveFilters(EMPTY_REQUEST_FILTERS)).toBe(false);
  });

  it("is true when any single filter is set", () => {
    expect(hasActiveFilters({ ...EMPTY_REQUEST_FILTERS, search: "x" })).toBe(
      true,
    );
    expect(hasActiveFilters({ ...EMPTY_REQUEST_FILTERS, source: "DB" })).toBe(
      true,
    );
  });
});
