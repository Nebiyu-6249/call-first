"use client";

import Link from "next/link";
import { emergencyLine } from "@/lib/config";
import { useParentEnv } from "@/lib/parent/env";
import { useParent } from "@/lib/parent/use-parent";

export function ParentFooter() {
  const { circle } = useParent();
  // In the demo, open the page in a new tab so the demo keeps its place.
  const inDemo = useParentEnv() !== null;
  return (
    <footer className="mt-10 flex flex-col gap-2 border-t-2 border-border pt-4 text-base text-muted">
      <p>{emergencyLine(circle?.emergencyNumber)}</p>
      <Link
        href="/privacy"
        target={inDemo ? "_blank" : undefined}
        className="inline-flex min-h-11 items-center self-start font-bold text-primary underline underline-offset-4"
      >
        Privacy and limits{inDemo && <span className="sr-only"> (opens in a new tab)</span>}
      </Link>
    </footer>
  );
}
