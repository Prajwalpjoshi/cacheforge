"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "./sidebar-nav";

/** Reclaims horizontal space below ~768px (PROJECT_SPEC.md #13) — the same NAV_ITEMS as the desktop sidebar, in a drawer instead. */
export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent side="left" title="CacheForge">
        <SidebarNav onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
