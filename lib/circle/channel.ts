// How the parent's result screen reaches the family. The real app uses the server; the demo
// (Phase 5) uses shared state in the browser.

import type { CheckResult } from "@/lib/check";
import { ALERT_MASK_KINDS, maskText } from "@/lib/privacy/mask";
import { TAXONOMY, isFlagId } from "@/lib/rules/taxonomy";
import { MAX_EXCERPT, MAX_SUMMARY, type FamilyReply, type NewAlert } from "./alerts";

export type ReplyPoll = { status: "waiting" } | { status: "replied"; reply: FamilyReply } | { status: "gone" };

export interface FamilyChannel {
  // Who will see it, for "Show Sara".
  familyName: string;
  // Returns the alert id, or null if it could not be sent.
  send(alert: NewAlert): Promise<string | null>;
  poll(alertId: string): Promise<ReplyPoll>;
}

export type AlertSource = "text" | "image" | "voice";

const SOURCE_SUMMARY: Record<AlertSource, string> = {
  text: "A message",
  image: "A picture of a message",
  voice: "A phone call, described out loud",
};

// Only what the parent chose to share: a one-line summary and the checked text, cut to 500 characters.
// Codes, card numbers and account numbers are hidden; the family still sees numbers and links to
// warn about, as plain text.
export function buildAlert(result: CheckResult, source: AlertSource): NewAlert {
  const labels = result.flags
    .slice(0, 2)
    .map((f) => (isFlagId(f.id) ? TAXONOMY[f.id].label.toLowerCase() : null))
    .filter(Boolean);
  const fallback = labels.length > 0 ? `${SOURCE_SUMMARY[source]}: ${labels.join(", ")}.` : `${SOURCE_SUMMARY[source]}.`;
  return {
    verdict: result.level,
    summary: (result.summary || fallback).slice(0, MAX_SUMMARY),
    excerpt: maskText(result.checkedText.trim(), { kinds: ALERT_MASK_KINDS }).text.slice(0, MAX_EXCERPT),
    flagIds: result.flags.map((f) => f.id),
  };
}
