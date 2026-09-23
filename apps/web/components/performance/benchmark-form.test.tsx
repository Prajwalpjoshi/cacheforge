/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BenchmarkForm } from "./benchmark-form";

afterEach(cleanup);

describe("BenchmarkForm", () => {
  it("submits the default values when the optional Label field is left blank", async () => {
    const onSubmit = vi.fn();
    render(
      <BenchmarkForm
        onSubmit={onSubmit}
        submitting={false}
        submitError={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /run benchmark/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        targetRoute: "products.get",
        mode: "COMPARISON",
        iterations: 30,
        concurrency: 1,
      }),
    );
    expect(onSubmit.mock.calls[0]![0].label).toBeUndefined();
  });

  it("submits the typed value when a Label is provided", async () => {
    const onSubmit = vi.fn();
    render(
      <BenchmarkForm
        onSubmit={onSubmit}
        submitting={false}
        submitError={null}
      />,
    );

    fireEvent.change(screen.getByLabelText("Label (optional)"), {
      target: { value: "after adding an index" },
    });
    fireEvent.click(screen.getByRole("button", { name: /run benchmark/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ label: "after adding an index" }),
    );
  });

  it("shows the running state and disables the button while submitting", () => {
    render(
      <BenchmarkForm onSubmit={vi.fn()} submitting={true} submitError={null} />,
    );

    const button = screen.getByRole("button", { name: /running benchmark/i });
    expect(button).toBeDisabled();
  });

  it("shows the submit error banner when provided", () => {
    render(
      <BenchmarkForm
        onSubmit={vi.fn()}
        submitting={false}
        submitError="Redis is unavailable."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Redis is unavailable.",
    );
  });
});
