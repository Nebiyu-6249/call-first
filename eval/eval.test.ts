import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCheckResult } from "@/lib/check";
import { extractLinks, extractPhoneNumbers } from "@/lib/rules/extract";
import { aiAnalysis } from "@/test/fixtures";
import { parseDataset, untargetedFlags, type EvalMessage } from "./dataset";
import { countVerdicts, falseAlarms, misses, renderReport, type EvalRow, type RunInfo } from "./report";

const messages = parseDataset(JSON.parse(readFileSync(join(__dirname, "messages.json"), "utf8")));

describe("eval/messages.json", () => {
  it("has about 30 scams and about 15 normal messages", () => {
    expect(messages.filter((m) => m.label === "scam").length).toBeGreaterThanOrEqual(30);
    expect(messages.filter((m) => m.label === "normal").length).toBeGreaterThanOrEqual(15);
  });

  it("has scams written for every warning sign in the taxonomy", () => {
    expect(untargetedFlags(messages)).toEqual([]);
  });

  it("includes the tricky normal messages from the brief", () => {
    const normal = messages.filter((m) => m.label === "normal").map((m) => m.text);
    expect(normal.some((t) => /sign-in code is \d{6}/.test(t))).toBe(true);
    expect(normal.some((t) => /Bank: .*No action is needed/.test(t))).toBe(true);
    expect(normal.some((t) => /parcel will arrive/.test(t))).toBe(true);
  });

  it("uses only fiction-range numbers and reserved .example links", () => {
    for (const m of messages) {
      for (const n of extractPhoneNumbers(m.text)) {
        expect(n.replace(/\s/g, ""), m.id).toMatch(/^(?:07700900\d{3}|08081570\d{3}|02079460\d{3}|01134960\d{3})$/);
      }
      for (const l of extractLinks(m.text)) expect(l.host, m.id).toMatch(/\.example$/);
    }
  });

  it("rejects a broken set", () => {
    expect(() => parseDataset({ messages: [{ id: "a", label: "maybe", type: "text", targets: [], text: "" }] })).toThrow(
      /label must be scam or normal[\s\S]*missing text/,
    );
    expect(() =>
      parseDataset({ messages: [{ id: "a", label: "scam", type: "text", targets: ["made_up"], text: "x" }] }),
    ).toThrow(/unknown target made_up/);
  });
});

describe("report", () => {
  const scam: EvalMessage = { id: "s1", label: "scam", type: "text", targets: ["asks_for_code"], text: "Read me the code we sent." };
  const normal: EvalMessage = { id: "n1", label: "normal", type: "text", targets: [], text: "See you on Sunday." };
  const sneaky: EvalMessage = { id: "s2", label: "scam", type: "text", targets: ["urgency_or_deadline"], text: "See you on Sunday x" };

  function row(message: EvalMessage, ai: ReturnType<typeof aiAnalysis> | null): EvalRow {
    return {
      message,
      full: buildCheckResult(message.text, ai, ai ? "ok" : "failed"),
      rulesOnly: buildCheckResult(message.text, null, "skipped"),
      ai: ai ? { status: "ok", assessment: ai.ai_assessment, confidence: ai.confidence } : { status: "failed", reason: "timeout" },
      ms: 1200,
    };
  }

  const rows = [
    row(scam, aiAnalysis({ ai_assessment: "likely_scam", confidence: 0.9 })),
    row(normal, aiAnalysis()),
    row(sneaky, aiAnalysis()),
  ];
  const info: RunInfo = { date: "2026-11-20", commit: "abc1234", model: "test-model", reasoningEffort: "none", timeoutMs: 8000, aiConfigured: true };

  it("counts verdicts per label, and finds misses and false alarms", () => {
    const counts = countVerdicts(rows, (r) => r.full);
    expect(counts.scam).toEqual({ WARNING: 1, NOT_SURE: 0, NO_WARNING_SIGNS: 1 });
    expect(counts.normal).toEqual({ WARNING: 0, NOT_SURE: 0, NO_WARNING_SIGNS: 1 });
    expect(misses(rows, (r) => r.full).map((r) => r.message.id)).toEqual(["s2"]);
    expect(falseAlarms(rows, (r) => r.full)).toEqual([]);
  });

  it("reports misses honestly", () => {
    const report = renderReport(rows, info);
    expect(report).toContain("| NO WARNING SIGNS | 1 | 50% | **missed** |");
    expect(report).toContain("### Missed scams\n\n- **s2**");
    expect(report).toContain("Model: `test-model`");
  });

  it("says clearly when the AI was not used", () => {
    const report = renderReport(rows, { ...info, aiConfigured: false });
    expect(report).toContain("The AI was not used in this run");
    expect(report).not.toContain("## Results: rules + AI");
    expect(report).not.toContain("Found by rules + AI");
  });
});
