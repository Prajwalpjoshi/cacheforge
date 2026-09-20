/**
 * Presentation logic for a benchmark comparison's *ImprovementPct
 * values. The backend already orients every one of these as
 * (before - after) / before * 100 (see apps/api's benchmark.service.ts
 * and docs/performance.md), so a positive number always means
 * "better" — for latency/P95 (where lower is better) and throughput
 * (where higher is better) alike. Only the arrow's direction (did the
 * raw metric go up or down) depends on which kind of metric it is.
 */
export type ImprovementDirection = "up" | "down";

export interface ImprovementDescriptor {
  improved: boolean;
  direction: ImprovementDirection;
}

export function describeImprovement(
  pct: number,
  higherIsBetter: boolean,
): ImprovementDescriptor {
  const improved = pct > 0;
  const wentUp = pct >= 0;
  const direction: ImprovementDirection = higherIsBetter
    ? wentUp
      ? "up"
      : "down"
    : wentUp
      ? "down"
      : "up";
  return { improved, direction };
}
