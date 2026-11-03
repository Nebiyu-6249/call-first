// Turns evaluation results into EVALUATION.md. Pure functions, so they can be tested.

import { FLAG_IDS, TAXONOMY } from "@/lib/rules/taxonomy";
import type { VerdictLevel } from "@/lib/verdict";
import { hasTargets, type EvalLabel, type EvalMessage } from "./dataset";

export type AiRun =
  | { status: "ok"; assessment: string; confidence: number }
  | { status: "failed"; reason: string };

// What one check ended with. A CheckResult has this shape too; the saved results keep only this.
export interface Outcome {
  level: VerdictLevel;
  flags: { id: string }[];
}

export interface EvalRow {
  message: EvalMessage;
  // Rules + AI + verdict, exactly as the app computes it (rules-only fallback when the AI failed).
  full: Outcome;
  // Rules + verdict with no AI, which is what the parent sees when the AI is down.
  rulesOnly: Outcome;
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

// One set's saved run, as written to eval/results/<name>.json.
export interface EvalSet {
  // "heldout" or "messages": the file name without .json.
  name: string;
  file: string;
  about: string;
  // The last commit that changed the set's file, so readers can see it was frozen before the run.
  datasetCommit: string;
  info: RunInfo;
  rows: EvalRow[];
}

// Detection code that changed after a set was run: null when that could not be checked.
export type ChangedSince = Record<string, string[] | null>;

// The code that decides verdicts. If any of it changes after a run, the report must say so.
export const DETECTION_PATHS = ["lib/rules", "lib/ai", "lib/privacy", "lib/verdict", "lib/check"];

const LEVELS: VerdictLevel[] = ["WARNING", "NOT_SURE", "NO_WARNING_SIGNS"];

const LEVEL_WORDS: Record<VerdictLevel, string> = {
  WARNING: "WARNING",
  NOT_SURE: "NOT SURE",
  NO_WARNING_SIGNS: "NO WARNING SIGNS",
};

type Pick = (row: EvalRow) => Outcome;
const full: Pick = (r) => r.full;
const rules: Pick = (r) => r.rulesOnly;

export type Counts = Record<EvalLabel, Record<VerdictLevel, number>>;

export function countVerdicts(rows: EvalRow[], pick: Pick): Counts {
  const empty = () => ({ WARNING: 0, NOT_SURE: 0, NO_WARNING_SIGNS: 0 });
  const counts: Counts = { scam: empty(), normal: empty() };
  for (const row of rows) counts[row.message.label][pick(row).level]++;
  return counts;
}

// A scam marked NO_WARNING_SIGNS is a miss; a normal message marked WARNING is a false alarm.
export function misses(rows: EvalRow[], pick: Pick): EvalRow[] {
  return rows.filter((r) => r.message.label === "scam" && pick(r).level === "NO_WARNING_SIGNS");
}

export function falseAlarms(rows: EvalRow[], pick: Pick): EvalRow[] {
  return rows.filter((r) => r.message.label === "normal" && pick(r).level === "WARNING");
}

// Wilson score interval for a proportion, 95% (z = 1.96). Behaves well for small sets and for
// rates near 0% or 100%, where the simple "plus or minus" interval does not.
export function wilson(successes: number, total: number, z = 1.96): { low: number; high: number } {
  if (total === 0) return { low: 0, high: 1 };
  const p = successes / total;
  const z2 = z * z;
  const centre = (p + z2 / (2 * total)) / (1 + z2 / total);
  const half = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / (1 + z2 / total);
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

function pct(n: number, total: number): string {
  return total === 0 ? "-" : `${Math.round((n / total) * 100)}%`;
}

// "39 of 40 (98%, 95% CI 87-100%)"
export function rateWithInterval(n: number, total: number): string {
  if (total === 0) return "-";
  const { low, high } = wilson(n, total);
  return `${n} of ${total} (${pct(n, total)}, 95% CI ${Math.round(low * 100)}-${Math.round(high * 100)}%)`;
}

export interface Rates {
  scams: number;
  normals: number;
  // Scams that got WARNING or NOT SURE: the person is told not to act and to check first.
  caught: number;
  warned: number;
  falseAlarms: number;
}

export function rates(rows: EvalRow[], pick: Pick): Rates {
  const c = countVerdicts(rows, pick);
  return {
    scams: c.scam.WARNING + c.scam.NOT_SURE + c.scam.NO_WARNING_SIGNS,
    normals: c.normal.WARNING + c.normal.NOT_SURE + c.normal.NO_WARNING_SIGNS,
    caught: c.scam.WARNING + c.scam.NOT_SURE,
    warned: c.scam.WARNING,
    falseAlarms: c.normal.WARNING,
  };
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

function ratesLines(r: Rates): string {
  return [
    `- Scams caught (WARNING or NOT SURE): ${rateWithInterval(r.caught, r.scams)}`,
    `- Scams with WARNING: ${rateWithInterval(r.warned, r.scams)}`,
    `- False alarms (normal messages with WARNING): ${rateWithInterval(r.falseAlarms, r.normals)}`,
  ].join("\n");
}

function excerpt(text: string, max = 70): string {
  const clean = text.replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 3)}...`;
}

function aiWords(ai: AiRun): string {
  return ai.status === "ok" ? `AI: ${ai.assessment} ${ai.confidence.toFixed(2)}` : `AI failed: ${ai.reason}`;
}

// Every listed message in full, so readers can judge the miss or false alarm themselves.
function listRows(rows: EvalRow[], pick: Pick): string {
  if (rows.length === 0) return "None.";
  return rows
    .map((r) => {
      const flags = pick(r).flags.map((f) => f.id).join(", ") || "no warning signs found";
      const kind = [r.message.type === "call_description" ? "phone call" : "text", r.message.scamType].filter(Boolean).join(", ");
      const how = pick === full ? aiWords(r.ai) : "no AI";
      const quoted = r.message.text.trim().split(/\r?\n/).map((line) => `  > ${line}`).join("\n");
      return `- **${r.message.id}** (${kind}; ${how}). Found: ${flags}.\n\n${quoted}`;
    })
    .join("\n\n");
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
    const has = (result: Outcome) => result.flags.some((f) => f.id === id);
    const byRules = targeted.filter((r) => has(r.rulesOnly)).length;
    const byFull = targeted.filter((r) => has(r.full)).length;
    lines.push(`| ${TAXONOMY[id].label} (\`${id}\`) | ${targeted.length} | ${byRules} |${withAi ? ` ${byFull} |` : ""}`);
  }
  return lines.join("\n");
}

const SET_TITLES: Record<string, string> = {
  heldout: "Independent held-out set",
  messages: "Original set (written alongside the rules)",
};

function setTitle(set: EvalSet): string {
  return SET_TITLES[set.name] ?? `Set \`${set.file}\``;
}

function provenance(set: EvalSet, changed: string[] | null): string[] {
  const scams = set.rows.filter((r) => r.message.label === "scam").length;
  const sizes = `${set.rows.length} fictional messages: ${scams} scams and ${set.rows.length - scams} normal messages (\`${set.file}\`).`;
  const afterRun =
    changed === null
      ? "Whether the detection code changed after this run could not be checked."
      : changed.length === 0
        ? `The rules, the AI prompt and schema, the masking and the verdict code (\`${DETECTION_PATHS.join("`, `")}\`) have not changed since this run (checked with git when this report was written).`
        : `**The detection code changed after this run** (${changed.map((f) => `\`${f}\``).join(", ")}), so these numbers describe commit \`${set.info.commit}\`, not the current code.`;

  if (set.name === "heldout") {
    return [
      sizes,
      "",
      `Written in a separate session that never saw the checker's rules, prompt or masking code. The file says: "${set.about}"`,
      `It was frozen in commit \`${set.datasetCommit}\` and not opened while the rules, prompt and masking were being changed.`,
      `It was run **once**, on ${set.info.date} at commit \`${set.info.commit}\`. ${afterRun}`,
      "Its messages have no list of intended warning signs, so there is no coverage table for this set.",
    ];
  }
  if (set.name === "messages") {
    return [
      sizes,
      "",
      "Written by the builder alongside the rules, so the rules were shaped by these messages. Read it as a check of",
      "the design, not as an independent test. The normal set includes tricky cases: a sign-in code the person asked",
      "for, a bank notice that asks for nothing, a delivery update with a tracking link, an appointment with a phone",
      "number, and a genuine-looking bank check that asks for YES or NO.",
      "",
      `Run on ${set.info.date} at commit \`${set.info.commit}\`. ${afterRun}`,
    ];
  }
  return [sizes, "", `Run on ${set.info.date} at commit \`${set.info.commit}\`. ${afterRun}`];
}

function renderSet(set: EvalSet, number: number, changed: string[] | null): string {
  const { rows, info } = set;
  const aiOk = rows.filter((r) => r.ai.status === "ok");
  const failures = new Map<string, number>();
  for (const r of rows) if (r.ai.status === "failed") failures.set(r.ai.reason, (failures.get(r.ai.reason) ?? 0) + 1);
  const failureText = [...failures].map(([reason, n]) => `${n} ${reason}`).join(", ");

  const out: string[] = [`## ${number}. ${setTitle(set)}`, "", ...provenance(set, changed), ""];

  if (!info.aiConfigured) {
    out.push("> **The AI was not used in this run** because no `OPENAI_API_KEY` and `OPENAI_MODEL` were set.", "");
  } else {
    out.push(`Model: \`${info.model}\`, reasoning effort: \`${info.reasoningEffort || "default"}\`, timeout ${info.timeoutMs / 1000} s.`, "");
    out.push(
      "### Rules + AI (what the parent sees)",
      "",
      ratesLines(rates(rows, full)),
      "",
      countsTable(countVerdicts(rows, full)),
      `AI calls: ${aiOk.length} of ${rows.length} answered${failureText ? `; failed: ${failureText} (those use the rules-only result, as in the app)` : ""}.`,
      `Median time per AI call: ${(median(rows.map((r) => r.ms)) / 1000).toFixed(1)} s.`,
      "",
      "#### Missed scams (rules + AI)",
      "",
      listRows(misses(rows, full), full),
      "",
      "#### False alarms (rules + AI)",
      "",
      listRows(falseAlarms(rows, full), full),
      "",
    );
  }

  out.push(
    "### Rules only (what the parent sees if the AI is down, or in private mode)",
    "",
    ratesLines(rates(rows, rules)),
    "",
    countsTable(countVerdicts(rows, rules)),
    "Without the AI, the app cannot give NO WARNING SIGNS at all: the most it says is NOT SURE, with the Golden Rules.",
    "",
    "#### Missed scams (rules only)",
    "",
    listRows(misses(rows, rules), rules),
    "",
    "#### False alarms (rules only)",
    "",
    listRows(falseAlarms(rows, rules), rules),
    "",
  );

  if (hasTargets(rows.map((r) => r.message))) {
    out.push(
      "### Warning signs found, by type",
      "",
      "How often each warning sign was found in the scams that were written to contain it.",
      "",
      coverageTable(rows, info.aiConfigured),
      "",
    );
  }

  out.push(
    "### Every message",
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

function summaryTable(sets: EvalSet[]): string {
  const lines = [
    "| Set | Checked by | Scams caught (WARNING or NOT SURE) | Scams with WARNING | False alarms |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const set of sets) {
    const modes: [string, Pick][] = set.info.aiConfigured ? [["Rules + AI", full], ["Rules only", rules]] : [["Rules only", rules]];
    for (const [mode, pick] of modes) {
      const r = rates(set.rows, pick);
      lines.push(
        `| ${setTitle(set)} | ${mode} | ${rateWithInterval(r.caught, r.scams)} | ${rateWithInterval(r.warned, r.scams)} | ${rateWithInterval(r.falseAlarms, r.normals)} |`,
      );
    }
  }
  return lines.join("\n");
}

// The held-out set comes first: it is the honest measure. Then the original set.
export function orderSets(sets: EvalSet[]): EvalSet[] {
  const rank = (s: EvalSet) => (s.name === "heldout" ? 0 : s.name === "messages" ? 1 : 2);
  return [...sets].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function renderEvaluation(sets: EvalSet[], changed: ChangedSince = {}, notes = ""): string {
  const ordered = orderSets(sets);
  const notesSection = notes
    ? ["## What the results show (written by hand after the runs, from `eval/notes.md`)", "", notes, ""]
    : [];
  return [
    "# Evaluation",
    "",
    "Generated by `npm run eval` from the saved runs in `eval/results/`. Do not edit by hand: run the script again.",
    "",
    "Each message goes through the same code the app uses: the rules engine (`lib/rules`), personal details hidden",
    "(`lib/privacy/mask.ts`), the AI analysis (`lib/ai/openai.ts`, same prompt, schema and timeout) and the verdict",
    "code (`lib/verdict`). All messages are fictional.",
    "",
    "How to read the verdicts: the app never says a message is safe. A scam marked NOT SURE still tells the person",
    "not to reply and to check with their family first, so it counts as caught here, but it is weaker than WARNING.",
    "A scam marked NO WARNING SIGNS is a miss. A normal message marked WARNING is a false alarm.",
    "",
    "The ranges are 95% confidence intervals (Wilson score). With sets this small they are wide: treat the numbers as",
    "a rough guide, not a precise rate. AI answers can also vary a little between runs.",
    "",
    "## Summary",
    "",
    summaryTable(ordered),
    "",
    ...ordered.map((set, i) => renderSet(set, i + 1, changed[set.name] ?? null)),
    ...notesSection,
  ].join("\n");
}
