// Deterministic verdict. Combines the rules engine and the AI analysis in code, so a message
// that talks the AI into calling it safe cannot change the result on its own.

import type { RuleFlag } from "@/lib/rules/rules";
import { FLAG_IDS, TAXONOMY, type FlagId, type Severity } from "@/lib/rules/taxonomy";

export type VerdictLevel = "WARNING" | "NOT_SURE" | "NO_WARNING_SIGNS";

export type AiAssessment = "likely_scam" | "unclear" | "likely_normal";

export interface AiFlag {
  id: FlagId | "other";
  evidence: string;
  note?: string;
}

// The parts of the AI analysis that the verdict depends on.
export interface AiVerdictInput {
  flags: AiFlag[];
  ai_assessment: AiAssessment;
  confidence: number;
}

export interface MergedFlag {
  id: FlagId | "other";
  severity: Severity;
  reason: string;
  evidence: string;
  source: "rules" | "ai" | "both";
}

export interface Verdict {
  level: VerdictLevel;
  flags: MergedFlag[];
}

export const SCAM_CONFIDENCE = 0.6;
export const NORMAL_CONFIDENCE = 0.7;

const OTHER_REASON = "Something else in it looks like a scam.";

function order(id: FlagId | "other"): number {
  return id === "other" ? FLAG_IDS.length : FLAG_IDS.indexOf(id);
}

export function mergeFlags(ruleFlags: RuleFlag[], aiFlags: AiFlag[]): MergedFlag[] {
  const merged = new Map<string, MergedFlag>();
  for (const f of ruleFlags) {
    merged.set(f.id, { ...f, source: "rules" });
  }
  for (const f of aiFlags) {
    const existing = merged.get(f.id);
    if (existing) {
      if (existing.source === "rules") existing.source = "both";
      continue;
    }
    // "other" carries a short AI note; treat it as medium so it can raise caution but not alarm.
    merged.set(f.id, {
      id: f.id,
      severity: f.id === "other" ? "medium" : TAXONOMY[f.id].severity,
      reason: f.id === "other" ? OTHER_REASON : TAXONOMY[f.id].reason,
      evidence: f.evidence,
      source: "ai",
    });
  }
  return [...merged.values()].sort(
    (a, b) => (a.severity === b.severity ? order(a.id) - order(b.id) : a.severity === "high" ? -1 : 1),
  );
}

// `ai` is null when the AI call failed, timed out, or was not made.
export function computeVerdict(ruleFlags: RuleFlag[], ai: AiVerdictInput | null): Verdict {
  const flags = mergeFlags(ruleFlags, ai?.flags ?? []);
  const confidence = ai ? Math.min(1, Math.max(0, ai.confidence)) : 0;

  if (flags.some((f) => f.severity === "high")) return { level: "WARNING", flags };
  if (ai && ai.ai_assessment === "likely_scam" && confidence >= SCAM_CONFIDENCE && flags.length > 0) {
    return { level: "WARNING", flags };
  }

  if (
    ruleFlags.length === 0 &&
    flags.length === 0 &&
    ai &&
    ai.ai_assessment === "likely_normal" &&
    confidence >= NORMAL_CONFIDENCE
  ) {
    return { level: "NO_WARNING_SIGNS", flags };
  }

  // Medium flags, an unclear AI answer, a failed AI call, or a low-confidence answer.
  return { level: "NOT_SURE", flags };
}
