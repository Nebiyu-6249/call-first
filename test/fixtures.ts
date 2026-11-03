// Shared fictional test data. No real people, companies, numbers or links.

import type { AiAnalysis } from "@/lib/ai/schema";

export { DEMO_CIRCLE } from "@/lib/demo/circle";

export function aiAnalysis(overrides: Partial<AiAnalysis> = {}): AiAnalysis {
  return {
    extracted_text: "",
    input_summary: "A friendly reminder about lunch.",
    flags: [],
    claimed_sender_type: "unknown",
    claimed_person: "",
    asked_for: [],
    ai_assessment: "likely_normal",
    confidence: 0.95,
    plain_explanation: "This looks like an ordinary message.",
    ...overrides,
  };
}
