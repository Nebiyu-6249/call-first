// Turns a message (and the AI analysis, when there is one) into everything the result screen needs.
// Used by the parent device, the demo and the evaluation script, so they all share one pipeline.

import type { AiAnalysis, SenderType } from "@/lib/ai/schema";
import { guessClaimedPerson, guessSenderType, runRules } from "@/lib/rules/rules";
import { computeVerdict, type MergedFlag, type VerdictLevel } from "@/lib/verdict";

// "skipped" means no AI call was made; "failed" means it was tried and did not answer in time.
export type AiStatus = "ok" | "failed" | "skipped";

// What left the phone for the AI service: the text with personal details hidden, the picture
// itself, or nothing at all (private mode, or a rules-only check).
export type SentToAi = { kind: "text"; text: string } | { kind: "image" } | { kind: "nothing" };

export interface CheckResult {
  level: VerdictLevel;
  // All flags, most serious first. The parent sees the first three reasons.
  flags: MergedFlag[];
  // Shown as plain text only, never as links or call buttons.
  phoneNumbers: string[];
  links: string[];
  aiStatus: AiStatus;
  senderType: SenderType;
  claimedPerson: string;
  // From the AI: what the message claims to be, in one sentence.
  summary: string;
  // From the AI, only when it agrees with the verdict, so the words never contradict the banner.
  explanation: string;
  // The text that was checked (for images, what the AI read from the picture).
  checkedText: string;
  sent: SentToAi;
}

export const MAX_REASONS = 3;

const AGREES: Record<VerdictLevel, AiAnalysis["ai_assessment"]> = {
  WARNING: "likely_scam",
  NOT_SURE: "unclear",
  NO_WARNING_SIGNS: "likely_normal",
};

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/\s+/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// `text` is what the parent typed or said. For images pass "" and the AI's extracted text is used.
export function buildCheckResult(
  text: string,
  ai: AiAnalysis | null,
  aiStatus: AiStatus,
  sent: SentToAi = { kind: "nothing" },
): CheckResult {
  const analysis = aiStatus === "ok" ? ai : null;
  const checkedText = text.trim() || analysis?.extracted_text || "";
  const rules = runRules(checkedText);
  const verdict = computeVerdict(rules.flags, analysis);

  return {
    level: verdict.level,
    flags: verdict.flags,
    // Found on the phone in the original text. The AI only ever sees them hidden.
    phoneNumbers: unique(rules.phoneNumbers),
    links: unique(rules.links.map((l) => l.text)),
    aiStatus,
    senderType:
      analysis && analysis.claimed_sender_type !== "unknown"
        ? analysis.claimed_sender_type
        : guessSenderType(checkedText, rules.flags),
    claimedPerson: analysis?.claimed_person || guessClaimedPerson(checkedText),
    summary: analysis?.input_summary ?? "",
    explanation: analysis && AGREES[verdict.level] === analysis.ai_assessment ? analysis.plain_explanation : "",
    checkedText,
    sent,
  };
}

export function checkWithRulesOnly(text: string): CheckResult {
  return buildCheckResult(text, null, "skipped");
}
