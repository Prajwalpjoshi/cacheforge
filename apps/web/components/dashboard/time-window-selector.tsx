"use client";

import { cn } from "@/lib/utils";

const WINDOWS = [
  { label: "15m", minutes: 15 },
  { label: "1h", minutes: 60 },
  { label: "24h", minutes: 1440 },
  { label: "7d", minutes: 10080 },
];

export function TimeWindowSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Time window"
      className="inline-flex rounded-md border border-border bg-surface p-0.5"
    >
      {WINDOWS.map((window) => (
        <button
          key={window.minutes}
          type="button"
          aria-pressed={value === window.minutes}
          onClick={() => onChange(window.minutes)}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            value === window.minutes
              ? "bg-accent/10 text-accent"
              : "text-muted hover:text-foreground",
          )}
        >
          {window.label}
        </button>
      ))}
    </div>
  );
}
