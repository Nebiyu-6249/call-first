// Browser side of transcription. Returns the text, or null if it could not be transcribed.

const CLIENT_TIMEOUT_MS = 25000;

export async function transcribe(audio: Blob): Promise<string | null> {
  const form = new FormData();
  form.append("audio", audio);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/transcribe", { method: "POST", body: form, signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: unknown };
    return typeof data.text === "string" ? data.text : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
