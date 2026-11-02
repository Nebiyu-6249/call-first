import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioExtension } from "./audio";
import { transcribeAudio } from "@/lib/ai/transcribe";

describe("audioExtension", () => {
  it("maps recorder formats to file extensions", () => {
    expect(audioExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(audioExtension("audio/mp4")).toBe("mp4");
    expect(audioExtension("audio/wav")).toBe("wav");
  });

  it("rejects unsupported formats", () => {
    expect(audioExtension("audio/ogg;codecs=opus")).toBeNull();
    expect(audioExtension("text/plain")).toBeNull();
    expect(audioExtension("")).toBeNull();
  });
});

describe("transcribeAudio", () => {
  const audio = new Blob(["fake audio"], { type: "audio/webm" });

  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_TRANSCRIBE_MODEL", "test-transcribe");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is not configured without a key or model", async () => {
    vi.stubEnv("OPENAI_TRANSCRIBE_MODEL", "");
    expect(await transcribeAudio(audio, "speech.webm")).toEqual({ ok: false, reason: "not_configured" });
  });

  it("sends the file and model as form data and returns trimmed text", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ text: "  A man said he was from the bank.  " }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await transcribeAudio(audio, "speech.webm")).toEqual({ ok: true, text: "A man said he was from the bank." });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("test-transcribe");
    expect((form.get("file") as File).name).toBe("speech.webm");
  });

  it("reports errors without logging the transcript", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("secret words", { status: 500 })));
    expect(await transcribeAudio(audio, "speech.webm")).toEqual({ ok: false, reason: "http_error" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ nope: true })));
    expect(await transcribeAudio(audio, "speech.webm")).toEqual({ ok: false, reason: "invalid_output" });
    for (const call of warn.mock.calls) expect(call.join(" ")).not.toContain("secret words");
  });
});
