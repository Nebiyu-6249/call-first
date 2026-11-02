import { describe, expect, it } from "vitest";
import { AI_ANALYSIS_SCHEMA, parseAiAnalysis } from "./schema";
import { aiAnalysis } from "@/test/fixtures";

describe("AI_ANALYSIS_SCHEMA", () => {
  // Strict Structured Outputs need every property listed as required and no extra properties.
  function checkStrict(node: Record<string, unknown>, path: string) {
    if (node.type === "object") {
      const props = Object.keys(node.properties as object);
      expect(node.additionalProperties, path).toBe(false);
      expect([...(node.required as string[])].sort(), path).toEqual([...props].sort());
      for (const [key, child] of Object.entries(node.properties as Record<string, Record<string, unknown>>)) {
        checkStrict(child, `${path}.${key}`);
      }
    }
    if (node.type === "array") checkStrict(node.items as Record<string, unknown>, `${path}[]`);
  }

  it("is valid for strict mode", () => {
    checkStrict(AI_ANALYSIS_SCHEMA as unknown as Record<string, unknown>, "root");
  });
});

describe("parseAiAnalysis", () => {
  it("accepts a well-formed analysis", () => {
    const parsed = parseAiAnalysis(aiAnalysis());
    expect(parsed?.ai_assessment).toBe("likely_normal");
  });

  it("rejects output without a valid assessment or confidence", () => {
    expect(parseAiAnalysis({ ...aiAnalysis(), ai_assessment: "safe" })).toBeNull();
    expect(parseAiAnalysis({ ...aiAnalysis(), confidence: "high" })).toBeNull();
    expect(parseAiAnalysis(null)).toBeNull();
    expect(parseAiAnalysis("likely_normal")).toBeNull();
  });

  it("drops unknown and duplicate flags and shortens evidence to 12 words", () => {
    const parsed = parseAiAnalysis({
      ...aiAnalysis(),
      flags: [
        { id: "made_up_flag", evidence: "x", note: "" },
        { id: "asks_for_code", evidence: "one two three four five six seven eight nine ten eleven twelve thirteen", note: "" },
        { id: "asks_for_code", evidence: "again", note: "" },
      ],
    });
    expect(parsed?.flags).toHaveLength(1);
    expect(parsed?.flags[0].evidence.split(" ")).toHaveLength(12);
  });

  it("clamps confidence to 0..1 and unknown sender types to unknown", () => {
    const parsed = parseAiAnalysis({ ...aiAnalysis(), confidence: 7, claimed_sender_type: "aliens" });
    expect(parsed?.confidence).toBe(1);
    expect(parsed?.claimed_sender_type).toBe("unknown");
  });

  it("removes phone numbers and links from the AI's own words", () => {
    const parsed = parseAiAnalysis({
      ...aiAnalysis(),
      input_summary: "A text from the bank asking you to call 07700 900123.",
      plain_explanation: "Please call 07700 900123 or visit secure-bank.example/login to fix this.",
    });
    expect(parsed?.plain_explanation).not.toMatch(/07700|secure-bank/);
    expect(parsed?.plain_explanation).toContain("the number in the message");
    expect(parsed?.input_summary).not.toMatch(/07700/);
  });

  it("keeps at most three sentences of explanation", () => {
    const parsed = parseAiAnalysis({ ...aiAnalysis(), plain_explanation: "One. Two. Three. Four. Five." });
    expect(parsed?.plain_explanation).toBe("One. Two. Three.");
  });
});
