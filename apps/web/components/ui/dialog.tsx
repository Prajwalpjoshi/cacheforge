"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

/** A centered modal (confirm dialogs) or a right-anchored sheet (drawers) — same Radix primitive, different `side`. */
export function DialogContent({
  children,
  side = "center",
  className,
  title,
  description,
}: {
  children: ReactNode;
  side?: "center" | "right" | "left";
  className?: string;
  title: string;
  description?: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
      <RadixDialog.Content
        className={cn(
          "fixed z-50 border border-border bg-surface shadow-xl focus:outline-none",
          side === "center" &&
            "left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg p-5",
          side === "right" &&
            "right-0 top-0 h-full w-full max-w-md overflow-y-auto p-5",
          side === "left" &&
            "left-0 top-0 h-full w-full max-w-xs overflow-y-auto p-5",
          className,
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <RadixDialog.Title className="text-sm font-semibold text-foreground">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm text-muted">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close
            aria-label="Close"
            className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
          >
            <X className="size-4" />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
