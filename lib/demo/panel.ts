// What the demo panel shows next to the phones. It is worked out from what Amina's phone
// actually checked, so it never shows an earlier sample after the judge pastes or uploads.

import type { CheckedInput } from "@/lib/parent/env";
import { DEMO_SAMPLES, type DemoSample } from "./samples";

export interface CheckedPanel {
  caption: string;
  body: string;
}

// The sample that was checked, or null when the input was the judge's own.
export function checkedSample(checked: CheckedInput | null): DemoSample | null {
  if (!checked || checked.kind !== "text") return null;
  const text = checked.text.trim();
  return DEMO_SAMPLES.find((s) => s.text === text) ?? null;
}

export function checkedPanel(checked: CheckedInput | null, parentName: string): CheckedPanel | null {
  if (!checked) return null;
  switch (checked.kind) {
    case "image":
      return { caption: `The message ${parentName} got`, body: `A screenshot ${parentName} uploaded` };
    case "voice":
      return { caption: `What ${parentName} said`, body: checked.text.trim() };
    default:
      return { caption: `The message ${parentName} got`, body: checked.text.trim() };
  }
}

// The nudge towards the family loop: after a result, until the family has been shown anything.
export function showFamilyHint(resultShowing: boolean, alertsSent: number): boolean {
  return resultShowing && alertsSent === 0;
}
