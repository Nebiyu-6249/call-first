// Shared fictional test data. No real people, companies, numbers or links.

import type { AiAnalysis } from "@/lib/ai/schema";
import type { ParentCircle } from "@/lib/circle/types";

export const DEMO_CIRCLE: ParentCircle = {
  parentName: "Amina",
  emergencyNumber: "999",
  familyMembers: [
    { id: "f1", name: "Sara", relationship: "daughter", phone: "07700 900001" },
    { id: "f2", name: "Omar", relationship: "son", phone: "07700 900002" },
  ],
  contacts: [{ id: "c1", label: "Gulf Example Bank", category: "bank", phone: "0808 157 0000" }],
};

export function aiAnalysis(overrides: Partial<AiAnalysis> = {}): AiAnalysis {
  return {
    extracted_text: "",
    input_summary: "A friendly reminder about lunch.",
    flags: [],
    claimed_sender_type: "unknown",
    claimed_person: "",
    asked_for: [],
    phone_numbers_in_message: [],
    links_in_message: [],
    ai_assessment: "likely_normal",
    confidence: 0.95,
    plain_explanation: "This looks like an ordinary message.",
    ...overrides,
  };
}
