// Turns evaluation results into EVALUATION.md. Pure functions, so they can be tested.

import type { CheckResult } from "@/lib/check";
import { FLAG_IDS, TAXONOMY } from "@/lib/rules/taxonomy";
import type { VerdictLevel } from "@/lib/verdict";
import type { EvalLabel, EvalMessage } from "./dataset";

export type AiRun =
  | { status: "ok"; assessment: string; confidence: number }
  | { status: "failed"; reason: string };

export interface EvalRow {
  message: EvalMessage;
  // Rules + AI + verdict, exactly as the app computes it (rules-only fallback when the AI failed).
  full: CheckResult;
  // Rules + verdict with no AI, which is what the parent sees when the AI is down.
  rulesOnly: CheckResult;
  ai: AiRun;
  ms: number;
}

export interface RunInfo {
  date: string;
  commit: string;
  model: string;
  reasoningEffort: string;
  timeoutMs: number;
  aiConfigured: boolean;
}

const LEVELS: VerdictLevel[] = ["WARNING", "NOT_SURE", "NO_WARNING_SIGNS"];

const LEVEL_WORDS: Record<VerdictLevel, string> = {
  WARNING: "WARNING",
  NOT_SURE: "NOT SURE",
  NO_WARNING_SIGNS: "NO WARNING SIGNS",
};

export type Counts = Record<EvalLabel, Record<VerdictLevel, number>>;

export function countVerdicts(rows: EvalRow[], pick: (row: EvalRow) => CheckResult): Counts {
  const empty = () => ({ WARNING: 0, NOT_SURE: 0, NO_WARNING_SIGNS: 0 });
  const counts: Counts = { scam: empty(), normal: empty() };
  for (const row of rows) counts[row.message.label][pick(row).level]++;
  return counts;
}

// A scam marked NO_WARNING_SIGNS is a miss; a normal message marked WARNING is a false alarm.
export function misses(rows: EvalRow[], pick: (row: EvalRow) => CheckResult): EvalRow[] {
  return rows.filter((r) => r.message.label === "scam" && pick(r).level === "NO_WARNING_SIGNS");
}

export function falseAlarms(rows: EvalRow[], pick: (row: EvalRow) => CheckResult): EvalRow[] {
  return rows.filter((r) => r.message.label === "normal" && pick(r).level === "WARNING");
}

function pct(n: number, total: number): string {
  return total === 0 ? "-" : `${Math.round((n / total) * 100)}%`;
}

function countsTable(counts: Counts): string {
  const lines: string[] = [];
  for (const label of ["scam", "normal"] as EvalLabel[]) {
    const c = counts[label];
    const total = c.WARNING + c.NOT_SURE + c.NO_WARNING_SIGNS;
    const note: Record<VerdictLevel, string> =
      label === "scam"
        ? { WARNING: "caught", NOT_SURE: "told to check with family", NO_WARNING_SIGNS: "**missed**" }
        : { WARNING: "**false alarm**", NOT_SURE: "told to check with family", NO_WARNING_SIGNS: "correct" };
    lines.push(`**${label === "scam" ? "Scam" : "Normal"} messages (${total})**`, "");
    lines.push("| Verdict | Count | Share | Meaning |", "| --- | ---: | ---: | --- |");
    for (const level of LEVELS) lines.push(`| ${LEVEL_WORDS[level]} | ${c[level]} | ${pct(c[level], total)} | ${note[level]} |`);
    lines.push("");
  }
  return lines.join("\n");
}

function excerpt(text: string, max = 70): string {
  const clean = text.replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 3)}...`;
}

function listRows(rows: EvalRow[], pick: (row: EvalRow) => CheckResult): string {
  if (rows.length === 0) return "None.";
  return rows
    .map((r) => {
      const flags = pick(r).flags.map((f) => f.id).join(", ") || "no warning signs found";
      return `- **${r.message.id}** (${pick(r) === r.full ? aiWords(r.ai) : "no AI"}): "${excerpt(r.message.text, 120)}" Found: ${flags}.`;
    })
    .join("\n");
}

function aiWords(ai: AiRun): string {
  return ai.status === "ok" ? `AI: ${ai.assessment} ${ai.confidence.toFixed(2)}` : `AI failed: ${ai.reason}`;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function coverageTable(rows: EvalRow[], withAi: boolean): string {
  const lines = withAi
    ? ["| Warning sign | Scams written with it | Found by rules | Found by rules + AI |", "| --- | ---: | ---: | ---: |"]
    : ["| Warning sign | Scams written with it | Found by rules |", "| --- | ---: | ---: |"];
  for (const id of FLAG_IDS) {
    const targeted = rows.filter((r) => r.message.targets.includes(id));
    const has = (result: CheckResult) => result.flags.some((f) => f.id === id);
    const byRules = targeted.filter((r) => has(r.rulesOnly)).length;
    const byFull = targeted.filter((r) => has(r.full)).length;
    lines.push(`| ${TAXONOMY[id].label} (\`${id}\`) | ${targeted.length} | ${byRules} |${withAi ? ` ${byFull} |` : ""}`);
  }
  return lines.join("\n");
}

export function renderReport(rows: EvalRow[], info: RunInfo): string {
  const full = (r: EvalRow) => r.full;
  const rules = (r: EvalRow) => r.rulesOnly;
  const scams = rows.filter((r) => r.message.label === "scam").length;
  const normals = rows.length - scams;
  const aiOk = rows.filter((r) => r.ai.status === "ok");
  const failures = new Map<string, number>();
  for (const r of rows) if (r.ai.status === "failed") failures.set(r.ai.reason, (failures.get(r.ai.reason) ?? 0) + 1);
  const failureText = [...failures].map(([reason, n]) => `${n} ${reason}`).join(", ");

  const out: string[] = [
    "# Evaluation",
    "",
    `Generated by \`npm run eval\` on ${info.date} at commit \`${info.commit}\`. Do not edit by hand: run the script again.`,
    "",
  ];

  if (!info.aiConfigured) {
    out.push(
      "> **The AI was not used in this run** because no `OPENAI_API_KEY` and `OPENAI_MODEL` were set.",
      "> Only the rules-only numbers are measured here. Set the key in `.env.local` and run `npm run eval` again",
      "> to measure the full pipeline.",
      "",
    );
  }

  out.push(
    "## What was tested",
    "",
    `${rows.length} fictional messages: ${scams} scams and ${normals} normal messages (\`eval/messages.json\`).`,
    "Some are spoken descriptions of phone calls. The normal set includes tricky cases: a sign-in code the person",
    "asked for, a bank notice that asks for nothing, a delivery update with a tracking link, an appointment with a",
    "phone number, and a genuine-looking bank check that asks for YES or NO.",
    "",
    "Each message goes through the same code the app uses: the rules engine (`lib/rules`), the AI analysis",
    `(\`lib/ai/openai.ts\`, same prompt, schema and ${info.timeoutMs / 1000}-second timeout) and the verdict code (\`lib/verdict\`).`,
    info.aiConfigured
      ? `Model: \`${info.model}\`, reasoning effort: \`${info.reasoningEffort || "default"}\`.`
      : "Model: not used in this run.",
    "",
    "How to read the verdicts: the app never says a message is safe. A scam marked NOT SURE still tells the person",
    "not to reply and to check with their family first, so it is not counted as a miss, but it is weaker than WARNING.",
    "A scam marked NO WARNING SIGNS is a miss. A normal message marked WARNING is a false alarm.",
    "",
    "The messages were written by the same person who wrote the rules, so this is a small check of the design, not an",
    "independent benchmark. The rules were not changed after seeing these results.",
    "",
  );

  if (info.aiConfigured) {
    out.push(
      "## Results: rules + AI (what the parent sees)",
      "",
      countsTable(countVerdicts(rows, full)),
      `AI calls: ${aiOk.length} of ${rows.length} answered${failureText ? `; failed: ${failureText}` : ""}.`,
      `Median time per AI call: ${(median(rows.map((r) => r.ms)) / 1000).toFixed(1)} s.`,
      "",
      "### Missed scams",
      "",
      listRows(misses(rows, full), full),
      "",
      "### False alarms",
      "",
      listRows(falseAlarms(rows, full), full),
      "",
    );
  }

  out.push(
    "## Results: rules only (what the parent sees if the AI is down)",
    "",
    countsTable(countVerdicts(rows, rules)),
    "Without the AI, the app cannot give NO WARNING SIGNS at all: the most it says is NOT SURE, with the Golden Rules.",
    "",
    "### Missed scams (rules only)",
    "",
    listRows(misses(rows, rules), rules),
    "",
    "### False alarms (rules only)",
    "",
    listRows(falseAlarms(rows, rules), rules),
    "",
    "## Warning signs found, by type",
    "",
    "How often each warning sign was found in the scams that were written to contain it.",
    "",
    coverageTable(rows, info.aiConfigured),
    "",
    "## Every message",
    "",
    "| Id | Label | Kind | Rules + AI | Rules only | AI said | Message |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) =>
      [
        "",
        r.message.id,
        r.message.label,
        r.message.type === "call_description" ? "call" : "text",
        info.aiConfigured ? LEVEL_WORDS[r.full.level] : "-",
        LEVEL_WORDS[r.rulesOnly.level],
        info.aiConfigured ? (r.ai.status === "ok" ? `${r.ai.assessment} ${r.ai.confidence.toFixed(2)}` : `failed (${r.ai.reason})`) : "-",
        excerpt(r.message.text),
        "",
      ]
        .join(" | ")
        .trim(),
    ),
    "",
  );

  return out.join("\n");
}
