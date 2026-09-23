/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaginationControls } from "./pagination-controls";

afterEach(cleanup);

describe("PaginationControls", () => {
  it("shows the current result range and total", () => {
    render(
      <PaginationControls
        page={2}
        pageSize={10}
        total={81}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Showing 11–20 of 81 requests"),
    ).toBeInTheDocument();
  });

  it("shows a plain zero-state when there are no results", () => {
    render(
      <PaginationControls
        page={1}
        pageSize={10}
        total={0}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(screen.getByText("0 requests")).toBeInTheDocument();
  });

  it("disables Previous on the first page and Next on the last page", () => {
    render(
      <PaginationControls
        page={1}
        pageSize={10}
        total={10}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("calls onPageChange with the next page when Next is clicked", () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        page={1}
        pageSize={10}
        total={30}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when a page number is clicked, and marks the current page", () => {
    const onPageChange = vi.fn();
    render(
      <PaginationControls
        page={1}
        pageSize={10}
        total={30}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("calls onPageSizeChange when the page-size select changes", () => {
    const onPageSizeChange = vi.fn();
    render(
      <PaginationControls
        page={1}
        pageSize={10}
        total={30}
        onPageChange={vi.fn()}
        onPageSizeChange={onPageSizeChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "20" },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
