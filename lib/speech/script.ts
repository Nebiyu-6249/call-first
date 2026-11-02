// What "Read it to me" says. Built from the result in code, so it matches the screen.
// It never reads out numbers or links from the message.

import { MAX_REASONS, type CheckResult } from "@/lib/check";
import type { NextStep } from "@/lib/next-step";
import type { VerdictLevel } from "@/lib/verdict";
import { VERDICT_COPY, whatToDo } from "@/lib/verdict/copy";

// Spoken as words, not letter by letter.
const SPOKEN_WORD: Record<VerdictLevel, string> = {
  WARNING: "Warning.",
  NOT_SURE: "Not sure.",
  NO_WARNING_SIGNS: "No warning signs found.",
};

export function speechScript(result: CheckResult, nextStep: NextStep | null, familyName: string): string {
  const parts = [SPOKEN_WORD[result.level], VERDICT_COPY[result.level].line];
  if (result.explanation) parts.push(result.explanation);
  for (const flag of result.flags.slice(0, MAX_REASONS)) parts.push(flag.reason);
  parts.push(`What to do now. ${whatToDo(result.level, familyName)}`);
  if (nextStep) parts.push(`The big button says: ${nextStep.label}.`);
  if (result.phoneNumbers.length > 0 || result.links.length > 0) {
    parts.push("Do not call any number or tap any link from the message.");
  }
  return parts.join(" ");
}
