/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";

// Vitest doesn't run with `globals: true` here, so RTL's automatic
// afterEach(cleanup) detection never fires — do it explicitly per file.
afterEach(cleanup);

describe("EmptyState", () => {
  it("never renders fabricated content — only the given title/description", () => {
    render(
      <EmptyState
        title="No benchmark runs yet"
        description="Run your first benchmark to compare database and Redis performance."
      />,
    );
    expect(screen.getByText("No benchmark runs yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Run your first benchmark to compare database and Redis performance.",
      ),
    ).toBeInTheDocument();
  });
});

describe("ErrorState", () => {
  it("explains the failure and invokes onRetry when the Retry button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState
        message="Unable to load cache statistics."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load cache statistics.",
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry button when no onRetry is provided", () => {
    render(<ErrorState message="Unable to load cache statistics." />);
    expect(
      screen.queryByRole("button", { name: /retry/i }),
    ).not.toBeInTheDocument();
  });
});
