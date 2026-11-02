// Turns a message into everything the result screen needs.

import { runRules } from "@/lib/rules/rules";
import { computeVerdict, type AiVerdictInput, type MergedFlag, type VerdictLevel } from "@/lib/verdict";

// "skipped" means no AI call was made; "failed" means it was tried and did not answer in time.
export type AiStatus = "ok" | "failed" | "skipped";

export interface CheckResult {
  level: VerdictLevel;
  // All flags, most serious first. The parent sees the first three reasons.
  flags: MergedFlag[];
  // Shown as plain text only, never as links or call buttons.
  phoneNumbers: string[];
  links: string[];
  aiStatus: AiStatus;
}

export const MAX_REASONS = 3;

export function buildCheckResult(text: string, ai: AiVerdictInput | null, aiStatus: AiStatus): CheckResult {
  const rules = runRules(text);
  const verdict = computeVerdict(rules.flags, aiStatus === "ok" ? ai : null);
  return {
    level: verdict.level,
    flags: verdict.flags,
    phoneNumbers: rules.phoneNumbers,
    links: rules.links.map((l) => l.text),
    aiStatus,
  };
}

export function checkWithRulesOnly(text: string): CheckResult {
  return buildCheckResult(text, null, "skipped");
}
