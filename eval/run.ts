// npm run eval: runs every message in eval/messages.json through the real pipeline (rules, the
// live AI call and the verdict) and writes EVALUATION.md. Reads OPENAI_* from .env.local.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnvConfig } from "@next/env";
import { AI_TIMEOUT_MS, analyse } from "@/lib/ai/openai";
import { buildCheckResult } from "@/lib/check";
import { maskText, unmaskAnalysis } from "@/lib/privacy/mask";
import { parseDataset, untargetedFlags, type EvalMessage } from "./dataset";
import { countVerdicts, renderReport, type EvalRow } from "./report";

// A few calls at a time, to stay well inside API rate limits.
const CONCURRENCY = 3;

async function evaluate(message: EvalMessage): Promise<EvalRow> {
  // The same as the phone: personal details hidden before the AI sees the message. The test
  // messages have no family circle, so there are no names to hide.
  const masked = maskText(message.text);
  const started = Date.now();
  const outcome = await analyse({ kind: message.type, text: masked.text });
  const ms = Date.now() - started;
  const full = outcome.ok
    ? buildCheckResult(message.text, unmaskAnalysis(outcome.analysis, masked.replacements), "ok")
    : buildCheckResult(message.text, null, outcome.reason === "not_configured" ? "skipped" : "failed");
  return {
    message,
    full,
    rulesOnly: buildCheckResult(message.text, null, "skipped"),
    ai: outcome.ok
      ? { status: "ok", assessment: outcome.analysis.ai_assessment, confidence: outcome.analysis.confidence }
      : { status: "failed", reason: outcome.reason },
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

function commit(): string {
  try {
    const hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
    const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim() !== "";
    return dirty ? `${hash} plus uncommitted changes` : hash;
  } catch {
    return "unknown";
  }
}

async function main() {
  const root = process.cwd();
  loadEnvConfig(root);
  const messages = parseDataset(JSON.parse(readFileSync(join(root, "eval", "messages.json"), "utf8")));
  const missing = untargetedFlags(messages);
  if (missing.length > 0) console.warn(`No scam targets: ${missing.join(", ")}`);

  const aiConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL);
  console.log(`Checking ${messages.length} messages${aiConfigured ? ` with ${process.env.OPENAI_MODEL}` : " (no AI key: rules only)"}...`);

  const rows = await runAll(messages);
  const report = renderReport(rows, {
    date: new Date().toISOString().slice(0, 10),
    commit: commit(),
    model: process.env.OPENAI_MODEL ?? "",
    reasoningEffort: process.env.OPENAI_REASONING_EFFORT ?? "",
    timeoutMs: AI_TIMEOUT_MS,
    aiConfigured,
  });
  writeFileSync(join(root, "EVALUATION.md"), report);

  for (const [name, pick] of [
    ...(aiConfigured ? [["Rules + AI", (r: EvalRow) => r.full] as const] : []),
    ["Rules only", (r: EvalRow) => r.rulesOnly] as const,
  ]) {
    const c = countVerdicts(rows, pick);
    console.log(
      `${name}: scams ${c.scam.WARNING} WARNING / ${c.scam.NOT_SURE} NOT SURE / ${c.scam.NO_WARNING_SIGNS} missed; ` +
        `normal ${c.normal.WARNING} false alarms / ${c.normal.NOT_SURE} NOT SURE / ${c.normal.NO_WARNING_SIGNS} no warning signs`,
    );
  }
  const failed = rows.filter((r) => r.ai.status === "failed" && r.ai.reason !== "not_configured").length;
  if (failed > 0) console.log(`AI failed on ${failed} message(s); those use the rules-only fallback, as in the app.`);
  console.log("Wrote EVALUATION.md");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
