// Words shown to the parent for each verdict. Never says "safe".

import type { VerdictLevel } from "./index";

export const DEFAULT_FAMILY_NAME = "your family";

export const VERDICT_COPY: Record<VerdictLevel, { word: string; line: string }> = {
  WARNING: {
    word: "WARNING",
    line: "This looks like a scam.",
  },
  NOT_SURE: {
    word: "NOT SURE",
    line: "We could not tell. Please be careful.",
  },
  NO_WARNING_SIGNS: {
    word: "NO WARNING SIGNS FOUND",
    line: "We did not find signs of a scam.",
  },
};

// `callName` is whoever the big call button rings (for example the bank), so the words and the
// button agree. The reassurance line always names the family.
export function whatToDo(level: VerdictLevel, familyName: string = DEFAULT_FAMILY_NAME, callName: string = familyName): string {
  switch (level) {
    case "WARNING":
      return `Do not reply, pay, or share anything. Call ${callName} first.`;
    case "NOT_SURE":
      return `Do not reply yet. Check with ${callName} before you do anything.`;
    case "NO_WARNING_SIGNS":
      return `If anyone asks you for money or a code, check with ${familyName} first.`;
  }
}
