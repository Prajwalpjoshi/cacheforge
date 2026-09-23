import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-medium",
  {
    variants: {
      tone: {
        success: "border-status-hit/30 bg-status-hit/10 text-status-hit",
        warning: "border-status-miss/30 bg-status-miss/10 text-status-miss",
        danger: "border-status-down/30 bg-status-down/10 text-status-down",
        neutral:
          "border-status-neutral/30 bg-status-neutral/10 text-status-neutral",
        accent: "border-accent/30 bg-accent/10 text-accent",
        info: "border-mode-db/30 bg-mode-db/10 text-mode-db",
        violet: "border-mode-cache/30 bg-mode-cache/10 text-mode-cache",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode;
  className?: string;
}

export function Badge({ tone, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>{children}</span>
  );
}
