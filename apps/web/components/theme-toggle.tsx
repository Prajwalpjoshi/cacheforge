"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light mode", icon: Sun },
  { value: "dark", label: "Dark mode", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Icon-button theme switcher — persists via lib/theme/theme-provider.tsx, applied through the `data-theme` CSS tokens in app/globals.css (PROJECT_SPEC.md #13). */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const activeLabel =
    OPTIONS.find((option) => option.value === theme)?.label ?? "Theme";
  const TriggerIcon = resolvedTheme === "light" ? Sun : Moon;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="true"
        aria-expanded={open}
        title={activeLabel}
        className="inline-flex size-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <TriggerIcon aria-hidden="true" className="size-[18px]" />
        <span className="sr-only">Theme: {activeLabel}. Change theme</span>
      </button>

      {open && (
        <div
          role="group"
          aria-label="Theme"
          className="absolute right-0 z-50 mt-2 w-36 overflow-hidden rounded-md border border-border bg-surface-raised py-1 shadow-lg"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                title={option.label}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-surface hover:text-foreground",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
