import "server-only";

// Calls the OpenAI Responses API with Structured Outputs. Server-only: the API key never
// reaches the browser. Message content is never logged.

import type { ValidInput } from "@/lib/check/request";
import { SYSTEM_PROMPT, makeMarkerId, wrapUntrusted } from "./prompt";
import { AI_ANALYSIS_SCHEMA, parseAiAnalysis, type AiAnalysis } from "./schema";

export const AI_TIMEOUT_MS = 8000;

export type AnalyseOutcome =
  | { ok: true; analysis: AiAnalysis }
  | { ok: false; reason: "not_configured" | "timeout" | "http_error" | "refused" | "invalid_output" | "network" };

interface ResponsesOutputItem {
  type: string;
  content?: { type: string; text?: string; refusal?: string }[];
}

function buildInput(input: ValidInput) {
  const markerId = makeMarkerId();
  const content: Record<string, string>[] = [
    { type: "input_text", text: wrapUntrusted(input.kind, input.kind === "image" ? "" : input.text, markerId) },
  ];
  if (input.kind === "image") {
    content.push({ type: "input_image", image_url: input.imageDataUrl, detail: "auto" });
  }
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content },
  ];
}

export async function analyse(input: ValidInput, timeoutMs = AI_TIMEOUT_MS): Promise<AnalyseOutcome> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;
  if (!apiKey || !model) return { ok: false, reason: "not_configured" };

  const effort = process.env.OPENAI_REASONING_EFFORT?.trim();
  const body = {
    model,
    input: buildInput(input),
    // Do not keep the request or response on OpenAI's side for later retrieval.
    store: false,
    max_output_tokens: 1500,
    ...(effort ? { reasoning: { effort } } : {}),
    text: {
      format: {
        type: "json_schema",
        name: "scam_check",
        strict: true,
        schema: AI_ANALYSIS_SCHEMA,
      },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Log only the status, never the request or response body.
      console.warn(`[check] OpenAI responded ${res.status}`);
      return { ok: false, reason: "http_error" };
    }
    const data = (await res.json()) as { status?: string; output?: ResponsesOutputItem[] };
    if (data.status && data.status !== "completed") return { ok: false, reason: "invalid_output" };

    const message = data.output?.find((item) => item.type === "message");
    const part = message?.content?.find((c) => c.type === "output_text" || c.type === "refusal");
    if (!part || part.type === "refusal") return { ok: false, reason: "refused" };

    let parsed: unknown;
    try {
      parsed = JSON.parse(part.text ?? "");
    } catch {
      return { ok: false, reason: "invalid_output" };
    }
    const analysis = parseAiAnalysis(parsed);
    return analysis ? { ok: true, analysis } : { ok: false, reason: "invalid_output" };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, reason: "timeout" };
    console.warn(`[check] OpenAI request failed: ${(error as Error).name}`);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
