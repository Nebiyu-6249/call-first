import { CircleCheck, CircleHelp, OctagonAlert, type LucideIcon } from "lucide-react";
import type { VerdictLevel } from "@/lib/verdict";
import { VERDICT_COPY } from "@/lib/verdict/copy";

const STYLE: Record<VerdictLevel, { Icon: LucideIcon; className: string }> = {
  WARNING: { Icon: OctagonAlert, className: "border-warning bg-warning-bg text-warning" },
  NOT_SURE: { Icon: CircleHelp, className: "border-unsure bg-unsure-bg text-unsure" },
  NO_WARNING_SIGNS: { Icon: CircleCheck, className: "border-ok bg-ok-bg text-ok" },
};

// Small icon-and-word label for a verdict. Never colour alone.
export function VerdictBadge({ level }: { level: VerdictLevel }) {
  const { Icon, className } = STYLE[level];
  return (
    <span className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1 text-base font-bold ${className}`}>
      <Icon aria-hidden="true" className="size-5" />
      {VERDICT_COPY[level].word}
    </span>
  );
}
