"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Button } from "./button";
import * as RadixDialog from "@radix-ui/react-dialog";

/** Explicit-confirmation wrapper for destructive actions (cache key deletion) — never fires without this dialog. */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  loading,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>
        <div className="flex justify-end gap-2 pt-2">
          <RadixDialog.Close asChild>
            <Button variant="secondary" size="sm">
              Cancel
            </Button>
          </RadixDialog.Close>
          <Button
            variant="danger"
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
