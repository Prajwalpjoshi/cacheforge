import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  Database,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

export interface StatusDescriptor {
  label: string;
  tone: StatusTone;
  icon: LucideIcon;
}

/** Semantic color classes keyed by tone — the only place hit/miss/error/bypass colors are decided (PROJECT_SPEC.md §13: color is never the sole signal, always paired with icon + text here). */
export const TONE_CLASSES: Record<StatusTone, string> = {
  success: "text-status-hit bg-status-hit/10 border-status-hit/30",
  warning: "text-status-miss bg-status-miss/10 border-status-miss/30",
  danger: "text-status-down bg-status-down/10 border-status-down/30",
  neutral: "text-status-neutral bg-status-neutral/10 border-status-neutral/30",
};

export function describeCacheStatus(
  status: "HIT" | "MISS" | "BYPASS" | "NOT_APPLICABLE",
): StatusDescriptor {
  switch (status) {
    case "HIT":
      return { label: "HIT", tone: "success", icon: CheckCircle2 };
    case "MISS":
      return { label: "MISS", tone: "warning", icon: AlertTriangle };
    case "BYPASS":
      return { label: "BYPASS", tone: "neutral", icon: CircleSlash };
    case "NOT_APPLICABLE":
      return { label: "N/A", tone: "neutral", icon: CircleSlash };
  }
}

export function describeDataSource(source: "DB" | "CACHE"): StatusDescriptor {
  return source === "CACHE"
    ? { label: "Redis", tone: "success", icon: Database }
    : { label: "Postgres", tone: "neutral", icon: Database };
}

export function describeServiceStatus(status: "up" | "down"): StatusDescriptor {
  return status === "up"
    ? { label: "Up", tone: "success", icon: CheckCircle2 }
    : { label: "Down", tone: "danger", icon: XCircle };
}

export type OverallHealth = "ok" | "degraded" | "down";

export function describeOverallHealth(status: OverallHealth): StatusDescriptor {
  switch (status) {
    case "ok":
      return { label: "Healthy", tone: "success", icon: CheckCircle2 };
    case "degraded":
      return { label: "Degraded", tone: "warning", icon: AlertTriangle };
    case "down":
      return { label: "Down", tone: "danger", icon: XCircle };
  }
}

export function describeHttpStatus(statusCode: number): StatusDescriptor {
  if (statusCode < 300) {
    return { label: String(statusCode), tone: "success", icon: CheckCircle2 };
  }
  if (statusCode < 500) {
    return { label: String(statusCode), tone: "warning", icon: AlertTriangle };
  }
  return { label: String(statusCode), tone: "danger", icon: XCircle };
}
