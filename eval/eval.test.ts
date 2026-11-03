import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCheckResult } from "@/lib/check";
import { extractLinks, extractPhoneNumbers } from "@/lib/rules/extract";
import { aiAnalysis } from "@/test/fixtures";
import { hasTargets, parseDataset, untargetedFlags, type EvalMessage } from "./dataset";
import {
  countVerdicts,
  falseAlarms,
  misses,
  orderSets,
  rateWithInterval,
  renderEvaluation,
  wilson,
  type EvalRow,
  type EvalSet,
  type RunInfo,
} from "./report";

const messages = parseDataset(JSON.parse(readFileSync(join(__dirname, "messages.json"), "utf8")));
// Written in a separate session; only its format is checked here, never its verdicts.
const heldout = parseDataset(JSON.parse(readFileSync(join(__dirname, "heldout.json"), "utf8")));

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

  it("uses only fiction-range numbers and reserved .example links, in both sets", () => {
    for (const m of [...messages, ...heldout]) {
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

describe("eval/heldout.json", () => {
  it("loads as a set without targets, with scams and normal messages of both kinds", () => {
    expect(hasTargets(heldout)).toBe(false);
    expect(new Set(heldout.map((m) => `${m.label}/${m.type}`))).toEqual(
      new Set(["scam/text", "scam/call_description", "normal/text", "normal/call_description"]),
    );
    expect(heldout.every((m) => typeof m.scamType === "string")).toBe(true);
  });
});

describe("a set without targets", () => {
  // The held-out set's format, with made-up content: no targets, a free-text scam type.
  const raw = {
    messages: [
      { id: "h1", label: "scam", type: "text", scam_type: "fake parcel fee", text: "Pay 1.45 to release your parcel." },
      { id: "h2", label: "normal", type: "call_description", scam_type: "none", text: "My sister rang about Sunday lunch." },
    ],
  };

  it("loads, keeps the scam type, and has no coverage targets", () => {
    const set = parseDataset(raw);
    expect(set.map((m) => [m.id, m.scamType, m.targets])).toEqual([
      ["h1", "fake parcel fee", []],
      ["h2", "none", []],
    ]);
    expect(hasTargets(set)).toBe(false);
    expect(hasTargets(messages)).toBe(true);
  });

  it("still needs targets on every scam once a set uses them", () => {
    const mixed = { messages: [...raw.messages, { id: "h3", label: "scam", type: "text", targets: ["asks_for_code"], text: "Code?" }] };
    expect(() => parseDataset(mixed)).toThrow(/h1: a scam needs at least one target/);
  });
});

describe("wilson", () => {
  it("matches published values", () => {
    // 95% Wilson interval for 8 of 10 is about 0.490 to 0.943.
    const { low, high } = wilson(8, 10);
    expect(low).toBeCloseTo(0.4902, 3);
    expect(high).toBeCloseTo(0.9433, 3);
  });

  it("stays inside 0 to 100% at the edges", () => {
    expect(wilson(0, 30).low).toBe(0);
    expect(wilson(0, 30).high).toBeCloseTo(0.1135, 3);
    expect(wilson(40, 40).high).toBe(1);
    expect(wilson(40, 40).low).toBeCloseTo(0.9124, 3);
    expect(rateWithInterval(40, 40)).toBe("40 of 40 (100%, 95% CI 91-100%)");
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
  const original: EvalSet = { name: "messages", file: "eval/messages.json", about: "", datasetCommit: "1111111", info, rows };
  const heldout: EvalSet = {
    name: "heldout",
    file: "eval/heldout.json",
    about: "Written separately.",
    datasetCommit: "2222222",
    info: { ...info, commit: "def5678" },
    rows: rows.map((r) => ({ ...r, message: { ...r.message, targets: [], scamType: "made-up type" } })),
  };

  it("counts verdicts per label, and finds misses and false alarms", () => {
    const counts = countVerdicts(rows, (r) => r.full);
    expect(counts.scam).toEqual({ WARNING: 1, NOT_SURE: 0, NO_WARNING_SIGNS: 1 });
    expect(counts.normal).toEqual({ WARNING: 0, NOT_SURE: 0, NO_WARNING_SIGNS: 1 });
    expect(misses(rows, (r) => r.full).map((r) => r.message.id)).toEqual(["s2"]);
    expect(falseAlarms(rows, (r) => r.full)).toEqual([]);
  });

  it("puts the held-out set first, with where it came from and its full missed messages", () => {
    expect(orderSets([original, heldout]).map((s) => s.name)).toEqual(["heldout", "messages"]);
    const report = renderEvaluation([original, heldout], { heldout: [], messages: [] });
    expect(report.indexOf("## 1. Independent held-out set")).toBeGreaterThan(0);
    expect(report.indexOf("## 1. Independent held-out set")).toBeLessThan(report.indexOf("## 2. Original set"));
    expect(report).toContain("frozen in commit `2222222`");
    expect(report).toContain("run **once**, on 2026-11-20 at commit `def5678`");
    expect(report).toContain("have not changed since this run");
    expect(report).toContain("- **s2** (text, made-up type; AI: likely_normal");
    expect(report).toContain("  > See you on Sunday x");
    expect(report).toContain("| NO WARNING SIGNS | 1 | 50% | **missed** |");
    expect(report).toContain("Scams caught (WARNING or NOT SURE): 1 of 2 (50%, 95% CI 9-91%)");
    // Only the original set has targets, so only it has a coverage table.
    expect(report.match(/### Warning signs found, by type/g)).toHaveLength(1);
  });

  it("says when the detection code changed after a run", () => {
    const report = renderEvaluation([heldout], { heldout: ["lib/rules/index.ts"] });
    expect(report).toContain("**The detection code changed after this run** (`lib/rules/index.ts`)");
  });

  it("says clearly when the AI was not used", () => {
    const report = renderEvaluation([{ ...original, info: { ...info, aiConfigured: false } }]);
    expect(report).toContain("The AI was not used in this run");
    expect(report).not.toContain("### Rules + AI");
    expect(report).not.toContain("Found by rules + AI");
  });
});
