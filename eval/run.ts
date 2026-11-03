// npm run eval [-- <file>]: runs every message in a set (default eval/messages.json) through the
// real pipeline (rules, masking, the live AI call and the verdict), saves the results in
// eval/results/<name>.json, and writes EVALUATION.md from every saved run.
// npm run eval -- --report: writes EVALUATION.md again from the saved runs, without checking anything.
// eval/notes.md, if present, is added at the end under its own heading.
// Reads OPENAI_* from .env.local.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { loadEnvConfig } from "@next/env";
import { AI_TIMEOUT_MS, analyse } from "@/lib/ai/openai";
import { buildCheckResult, type CheckResult } from "@/lib/check";
import { maskText, unmaskAnalysis } from "@/lib/privacy/mask";
import { hasTargets, parseDataset, untargetedFlags, type EvalMessage } from "./dataset";
import { DETECTION_PATHS, countVerdicts, renderEvaluation, type ChangedSince, type EvalRow, type EvalSet, type Outcome } from "./report";

// A few calls at a time, to stay well inside API rate limits.
const CONCURRENCY = 3;

// Sets that may only ever be run once, so nobody can tune the checker against them.
const RUN_ONCE = new Set(["heldout"]);

const RESULTS_DIR = join("eval", "results");

function outcome(result: CheckResult): Outcome {
  return { level: result.level, flags: result.flags.map((f) => ({ id: f.id })) };
}

async function evaluate(message: EvalMessage): Promise<EvalRow> {
  // The same as the phone: personal details hidden before the AI sees the message. The test
  // messages have no family circle, so there are no names to hide.
  const masked = maskText(message.text);
  const started = Date.now();
  const answer = await analyse({ kind: message.type, text: masked.text });
  const ms = Date.now() - started;
  const full = answer.ok
    ? buildCheckResult(message.text, unmaskAnalysis(answer.analysis, masked.replacements), "ok")
    : buildCheckResult(message.text, null, answer.reason === "not_configured" ? "skipped" : "failed");
  return {
    message,
    full: outcome(full),
    rulesOnly: outcome(buildCheckResult(message.text, null, "skipped")),
    ai: answer.ok
      ? { status: "ok", assessment: answer.analysis.ai_assessment, confidence: answer.analysis.confidence }
      : { status: "failed", reason: answer.reason },
    ms,
  };
}

async function runAll(messages: EvalMessage[]): Promise<EvalRow[]> {
  const rows: EvalRow[] = new Array(messages.length);
  let next = 0;
  let done = 0;
  async function worker() {
    while (next < messages.length) {
      const index = next++;
      rows[index] = await evaluate(messages[index]);
      done++;
      process.stdout.write(`\r  ${done}/${messages.length} checked`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  process.stdout.write("\n");
  return rows;
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function commit(): string {
  try {
    const hash = git(["rev-parse", "--short", "HEAD"]);
    return git(["status", "--porcelain"]) !== "" ? `${hash} plus uncommitted changes` : hash;
  } catch {
    return "unknown";
  }
}

// Detection files that differ between the commit a set was run at and the working tree now.
function changedSince(runCommit: string): string[] | null {
  if (!/^[0-9a-f]{7,40}$/.test(runCommit)) return null;
  try {
    const out = git(["diff", "--name-only", runCommit, "--", ...DETECTION_PATHS]);
    return out ? out.split("\n").filter((f) => !/\.test\.ts$/.test(f)) : [];
  } catch {
    return null;
  }
}

function loadSavedSets(root: string): EvalSet[] {
  const dir = join(root, RESULTS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as EvalSet);
}

function writeReport(root: string) {
  const sets = loadSavedSets(root);
  if (sets.length === 0) throw new Error("No saved runs in eval/results. Run npm run eval first.");
  const changed: ChangedSince = Object.fromEntries(sets.map((s) => [s.name, changedSince(s.info.commit)]));
  // Notes written by hand after looking at the results, kept apart from the generated numbers.
  const notesPath = join(root, "eval", "notes.md");
  const notes = existsSync(notesPath) ? readFileSync(notesPath, "utf8").trim() : "";
  writeFileSync(join(root, "EVALUATION.md"), renderEvaluation(sets, changed, notes));
  console.log(`Wrote EVALUATION.md from ${sets.map((s) => s.name).join(", ")}.`);
}

async function main() {
  const root = process.cwd();
  const args = process.argv.slice(2);
  if (args.includes("--report")) return writeReport(root);

  loadEnvConfig(root);
  const file = relative(root, join(root, args[0] ?? join("eval", "messages.json"))).replace(/\\/g, "/");
  const name = basename(file, ".json");
  const resultPath = join(root, RESULTS_DIR, `${name}.json`);
  if (RUN_ONCE.has(name) && existsSync(resultPath)) {
    throw new Error(`${file} has already been run once (eval/results/${name}.json). Use --report to write EVALUATION.md again.`);
  }

  const raw = JSON.parse(readFileSync(join(root, file), "utf8")) as { about?: unknown };
  const messages = parseDataset(raw);
  if (hasTargets(messages)) {
    const missing = untargetedFlags(messages);
    if (missing.length > 0) console.warn(`No scam targets: ${missing.join(", ")}`);
  }

  const aiConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  if (RUN_ONCE.has(name) && !aiConfigured) throw new Error(`${file} may only be run once, so it needs the AI key set first.`);
  console.log(`Checking ${messages.length} messages from ${file}${aiConfigured ? ` with ${process.env.OPENAI_MODEL}` : " (no AI key: rules only)"}...`);

  const runCommit = commit();
  const rows = await runAll(messages);
  let datasetCommit = "unknown";
  try {
    datasetCommit = git(["log", "-1", "--format=%h", "--", file]) || "not committed";
  } catch {
    // Not a git checkout.
  }
  const set: EvalSet = {
    name,
    file,
    about: typeof raw.about === "string" ? raw.about : "",
    datasetCommit,
    info: {
      date: new Date().toISOString().slice(0, 10),
      commit: runCommit,
      model: process.env.OPENAI_MODEL ?? "",
      reasoningEffort: process.env.OPENAI_REASONING_EFFORT ?? "",
      timeoutMs: AI_TIMEOUT_MS,
      aiConfigured,
    },
    rows,
  };
  mkdirSync(join(root, RESULTS_DIR), { recursive: true });
  writeFileSync(resultPath, `${JSON.stringify(set, null, 2)}\n`);

  for (const [mode, pick] of [
    ...(aiConfigured ? [["Rules + AI", (r: EvalRow) => r.full] as const] : []),
    ["Rules only", (r: EvalRow) => r.rulesOnly] as const,
  ]) {
    const c = countVerdicts(rows, pick);
    console.log(
      `${mode}: scams ${c.scam.WARNING} WARNING / ${c.scam.NOT_SURE} NOT SURE / ${c.scam.NO_WARNING_SIGNS} missed; ` +
        `normal ${c.normal.WARNING} false alarms / ${c.normal.NOT_SURE} NOT SURE / ${c.normal.NO_WARNING_SIGNS} no warning signs`,
    );
  }
  const failed = rows.filter((r) => r.ai.status === "failed" && r.ai.reason !== "not_configured").length;
  if (failed > 0) console.log(`AI failed on ${failed} message(s); those use the rules-only fallback, as in the app.`);
  writeReport(root);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
