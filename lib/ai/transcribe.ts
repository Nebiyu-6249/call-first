import "server-only";

// Speech to text for the parent's spoken description of a call. Server-only.
// The audio is passed straight through to OpenAI and never stored or logged.

import { MAX_TEXT_LENGTH } from "@/lib/check/request";

export const TRANSCRIBE_TIMEOUT_MS = 20000;

export type TranscribeOutcome =
  | { ok: true; text: string }
  | { ok: false; reason: "not_configured" | "timeout" | "http_error" | "invalid_output" | "network" };

// A hint that helps the model with the kind of words people use when describing scam calls.
const PROMPT = "A person describing a phone call they received, which might be a scam. They may mention banks, codes, PINs, police, parcels, or family members.";

export async function transcribeAudio(audio: Blob, fileName: string, timeoutMs = TRANSCRIBE_TIMEOUT_MS): Promise<TranscribeOutcome> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_TRANSCRIBE_MODEL;
  if (!apiKey || !model) return { ok: false, reason: "not_configured" };

  const form = new FormData();
  form.append("file", audio, fileName);
  form.append("model", model);
  form.append("prompt", PROMPT);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[transcribe] OpenAI responded ${res.status}`);
      return { ok: false, reason: "http_error" };
    }
    const data = (await res.json()) as { text?: unknown };
    if (typeof data.text !== "string") return { ok: false, reason: "invalid_output" };
    return { ok: true, text: data.text.trim().slice(0, MAX_TEXT_LENGTH) };
  } catch (error) {
    if (controller.signal.aborted) return { ok: false, reason: "timeout" };
    console.warn(`[transcribe] OpenAI request failed: ${(error as Error).name}`);
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
