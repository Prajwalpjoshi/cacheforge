/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BenchmarkRunDetail } from "@cacheforge/contracts";
import { PerformanceView } from "./performance-view";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeDetail(
  overrides: Partial<BenchmarkRunDetail> = {},
): BenchmarkRunDetail {
  const dbStats = {
    minMs: 3,
    maxMs: 5,
    avgMs: 4,
    p50Ms: 4,
    p95Ms: 4.8,
    p99Ms: 5,
    throughputRps: 250,
  };
  const cacheStats = {
    minMs: 0.4,
    maxMs: 0.9,
    avgMs: 0.6,
    p50Ms: 0.6,
    p95Ms: 0.8,
    p99Ms: 0.9,
    throughputRps: 900,
  };
  return {
    id: "new-run-1",
    label: null,
    targetRoute: "products.get",
    mode: "COMPARISON",
    iterations: 30,
    concurrency: 1,
    ...cacheStats,
    cacheHitRate: 0.9,
    createdAt: "2026-01-01T00:00:00.000Z",
    latenciesMs: null,
    comparison: {
      dbOnly: { latenciesMs: [3, 4, 5], stats: dbStats, cacheHitRate: null },
      cacheOnly: {
        latenciesMs: [0.4, 0.6, 0.9],
        stats: cacheStats,
        cacheHitRate: 0.9,
      },
      latencyImprovementPct: 85,
      p95ImprovementPct: 83,
      throughputImprovementPct: 260,
    },
    ...overrides,
  };
}

function renderView() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PerformanceView />
    </QueryClientProvider>,
  );
}

describe("PerformanceView", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((input: string, init?: RequestInit) => {
      const url = new URL(input);
      const method = init?.method ?? "GET";

      if (method === "POST" && url.pathname === "/api/benchmarks/run") {
        return Promise.resolve(jsonResponse(makeDetail(), 201));
      }
      if (url.pathname === "/api/benchmarks") {
        const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
        return Promise.resolve(
          jsonResponse({ items: [], page: 1, pageSize, total: 0 }),
        );
      }
      if (url.pathname.startsWith("/api/benchmarks/")) {
        return Promise.resolve(jsonResponse(makeDetail()));
      }
      return Promise.resolve(jsonResponse({ message: "not found" }, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders Run a benchmark, the summary strip, and History — with no Methodology section", async () => {
    renderView();

    expect(
      screen.getByRole("heading", { name: "Performance Lab" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Run a benchmark" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Total runs")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "History" }),
    ).toBeInTheDocument();

    expect(screen.queryByText("Methodology")).not.toBeInTheDocument();
  }, 15000);

  it("runs successfully with the optional Label field left blank, and opens the real result detail sheet immediately", async () => {
    renderView();

    // The Label field is deliberately left untouched here — this is
    // the common case for an optional field, and previously caused
    // the button to silently do nothing (see benchmark-form.tsx).
    fireEvent.click(screen.getByRole("button", { name: /run benchmark/i }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("products.get")).toBeInTheDocument();
    expect(
      within(dialog).getByText("COMPARISON", { selector: "span" }),
    ).toBeInTheDocument();
  }, 15000);
});
