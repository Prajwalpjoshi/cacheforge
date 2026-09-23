/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BenchmarkRunSummary } from "@cacheforge/contracts";
import { BenchmarkHistoryPanel } from "./benchmark-history-panel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeRun(
  overrides: Partial<BenchmarkRunSummary> = {},
): BenchmarkRunSummary {
  return {
    id: "run-1",
    label: null,
    targetRoute: "products.get",
    mode: "COMPARISON",
    iterations: 30,
    concurrency: 1,
    minMs: 0.5,
    maxMs: 4.2,
    avgMs: 1.8,
    p50Ms: 1.6,
    p95Ms: 3.1,
    p99Ms: 3.9,
    throughputRps: 502,
    cacheHitRate: 0.95,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function renderPanel(onSelect = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <BenchmarkHistoryPanel onSelect={onSelect} />
    </QueryClientProvider>,
  );
}

describe("BenchmarkHistoryPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows a loading skeleton, then renders real rows once the request resolves", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [makeRun()],
        page: 1,
        pageSize: 10,
        total: 25,
      }),
    );

    renderPanel();

    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );
    expect(screen.getByText("Showing 1–10 of 25 runs")).toBeInTheDocument();
  });

  it("requests page 1 with pageSize 10 by default", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    renderPanel();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("pageSize")).toBe("10");
  });

  it("requests the next page when Next is clicked", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [makeRun()], page: 1, pageSize: 10, total: 25 }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("2");
    });
  });

  it("resets to page 1 when the mode filter changes after paging forward", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [makeRun()], page: 1, pageSize: 10, total: 25 }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("2");
    });

    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "DB_ONLY" },
    });

    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("1");
      expect(lastUrl.searchParams.get("mode")).toBe("DB_ONLY");
    });
  });

  it("sends the search term as a query param once debounced, and resets to page 1", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [makeRun()], page: 1, pageSize: 10, total: 25 }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("2");
    });

    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "after adding an index" },
    });

    await waitFor(
      () => {
        const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
        expect(lastUrl.searchParams.get("search")).toBe(
          "after adding an index",
        );
        expect(lastUrl.searchParams.get("page")).toBe("1");
      },
      { timeout: 2000 },
    );
  });

  it("changes rows and resets to page 1", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [makeRun()], page: 1, pageSize: 10, total: 25 }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("2");
    });

    fireEvent.change(screen.getByLabelText("Rows"), {
      target: { value: "20" },
    });

    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("pageSize")).toBe("20");
      expect(lastUrl.searchParams.get("page")).toBe("1");
    });
  });

  it("shows a plain empty state when there are no runs and no filters", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    renderPanel();

    await waitFor(() =>
      expect(screen.getByText("No benchmark runs yet")).toBeInTheDocument(),
    );
  });

  it("shows a filter-specific empty state once a filter matches nothing", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("No benchmark runs yet")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: "CACHE_ONLY" },
    });

    await waitFor(() =>
      expect(screen.getByText("No benchmark runs found")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Try changing your search or mode filter."),
    ).toBeInTheDocument();
  });

  it("shows an error state with a working retry button on failure", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "Internal Server Error" }, 500),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        items: [makeRun()],
        page: 1,
        pageSize: 10,
        total: 1,
      }),
    );

    renderPanel();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load benchmark history.",
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );
  });

  it("calls onSelect with the run id when View is clicked", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [makeRun({ id: "run-42" })],
        page: 1,
        pageSize: 10,
        total: 1,
      }),
    );
    const onSelect = vi.fn();

    renderPanel(onSelect);
    await waitFor(() =>
      expect(screen.getByText("products.get")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(onSelect).toHaveBeenCalledWith("run-42");
  });
});
