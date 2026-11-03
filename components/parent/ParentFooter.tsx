"use client";

import { emergencyLine } from "@/lib/config";
import { useParent } from "@/lib/parent/use-parent";

export function ParentFooter() {
  const { circle } = useParent();
  return (
    <footer className="mt-10 border-t-2 border-border pt-4 text-base text-muted">
      {emergencyLine(circle?.emergencyNumber)}
    </footer>
  );
}
