/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";
import { describeCacheStatus, describeOverallHealth } from "@/lib/status";

afterEach(cleanup);

describe("StatusBadge", () => {
  it("renders the text label alongside the icon, not color alone", () => {
    render(<StatusBadge descriptor={describeCacheStatus("HIT")} />);
    expect(screen.getByText("HIT")).toBeInTheDocument();
  });

  it("renders a distinct label for each health state", () => {
    const { rerender } = render(
      <StatusBadge descriptor={describeOverallHealth("ok")} />,
    );
    expect(screen.getByText("Healthy")).toBeInTheDocument();

    rerender(<StatusBadge descriptor={describeOverallHealth("degraded")} />);
    expect(screen.getByText("Degraded")).toBeInTheDocument();

    rerender(<StatusBadge descriptor={describeOverallHealth("down")} />);
    expect(screen.getByText("Down")).toBeInTheDocument();
  });
});
