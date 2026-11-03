import { describe, expect, it } from "vitest";
import { speechScript } from "./script";
import { buildCheckResult } from "@/lib/check";
import { pickNextStep } from "@/lib/next-step";
import { DEMO_CIRCLE } from "@/test/fixtures";

describe("speechScript", () => {
  const text = "Gulf Example Bank: unusual activity. Read me the code we sent. Call 07700 900123 or visit bank-help.example";
  const result = buildCheckResult(text, null, "failed");
  const nextStep = pickNextStep(DEMO_CIRCLE, result.senderType);
  const script = speechScript(result, nextStep, "Sara");

  it("starts with the verdict as a word, not letters", () => {
    expect(script.startsWith("Warning. This looks like a scam.")).toBe(true);
    expect(script).not.toContain("WARNING");
  });

  it("reads the reasons, what to do, and the verified button", () => {
    expect(script).toContain("It asks you to share a code");
    expect(script).toContain("What to do now. Do not reply, pay, or share anything. Call Gulf Example Bank first.");
    expect(script).toContain("The big button says: Call Gulf Example Bank.");
  });

  it("never reads out numbers or links from the message", () => {
    expect(script).not.toContain("07700");
    expect(script).not.toContain("bank-help.example");
    expect(script).toContain("Do not call any number or tap any link from the message.");
  });

  it("reads the no-warning line for a normal message", () => {
    const calm = buildCheckResult("See you Saturday.", {
      extracted_text: "",
      input_summary: "",
      flags: [],
      claimed_sender_type: "family",
      claimed_person: "",
      asked_for: [],
      phone_numbers_in_message: [],
      links_in_message: [],
      ai_assessment: "likely_normal",
      confidence: 0.9,
      plain_explanation: "",
    }, "ok");
    expect(speechScript(calm, null, "Sara")).toContain(
      "No warning signs found. We did not find signs of a scam. What to do now. If anyone asks you for money or a code, check with Sara first.",
    );
  });
});
