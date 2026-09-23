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
import type { RequestMetricDTO } from "@cacheforge/contracts";
import { RecentRequestsPanel } from "./recent-requests-panel";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function makeRequest(
  overrides: Partial<RequestMetricDTO> = {},
): RequestMetricDTO {
  return {
    id: "1",
    requestId: "req-1",
    method: "GET",
    route: "/api/products",
    statusCode: 200,
    durationMs: 12.3,
    cacheStatus: "HIT",
    source: "CACHE",
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

function renderPanel(windowMinutes = 15) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <RecentRequestsPanel windowMinutes={windowMinutes} />
    </QueryClientProvider>,
  );
}

describe("RecentRequestsPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows a loading skeleton, then renders real rows once the request resolves", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [makeRequest()],
        page: 1,
        pageSize: 10,
        total: 25,
      }),
    );

    renderPanel();

    await waitFor(() =>
      expect(screen.getByText("/api/products")).toBeInTheDocument(),
    );
    expect(screen.getByText("Showing 1–10 of 25 requests")).toBeInTheDocument();
  });

  it("requests page 1 with pageSize 10 and the given time window by default", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    renderPanel(60);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const url = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("pageSize")).toBe("10");
    expect(url.searchParams.get("windowMinutes")).toBe("60");
  });

  it("requests the next page when Next is clicked", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [makeRequest()],
        page: 1,
        pageSize: 10,
        total: 25,
      }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("/api/products")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("2");
    });
  });

  it("resets to page 1 when a filter changes after paging forward", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        items: [makeRequest()],
        page: 1,
        pageSize: 10,
        total: 25,
      }),
    );

    renderPanel();
    await waitFor(() =>
      expect(screen.getByText("/api/products")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("2");
    });

    fireEvent.change(screen.getByLabelText("Method"), {
      target: { value: "POST" },
    });

    await waitFor(() => {
      const lastUrl = new URL(fetchMock.mock.calls.at(-1)![0] as string);
      expect(lastUrl.searchParams.get("page")).toBe("1");
      expect(lastUrl.searchParams.get("method")).toBe("POST");
    });
  });

  it("shows a window-specific empty state when there are no filters and no traffic", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    renderPanel();

    await waitFor(() =>
      expect(
        screen.getByText("No requests in this time window"),
      ).toBeInTheDocument(),
    );
  });

  it("shows a filter-specific empty state once a filter is applied and matches nothing", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ items: [], page: 1, pageSize: 10, total: 0 }),
    );

    renderPanel();
    await waitFor(() =>
      expect(
        screen.getByText("No requests in this time window"),
      ).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "DB" },
    });

    await waitFor(() =>
      expect(screen.getByText("No requests found")).toBeInTheDocument(),
    );
    expect(
      screen.getByText("Try changing your search or filters."),
    ).toBeInTheDocument();
  });

  it("shows an error state with a working retry button on failure", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: "Internal Server Error" }, 500),
    );
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ items: [makeRequest()], page: 1, pageSize: 10, total: 1 }),
    );

    renderPanel();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Unable to load recent requests.",
    );

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));

    await waitFor(() =>
      expect(screen.getByText("/api/products")).toBeInTheDocument(),
    );
  });
});
