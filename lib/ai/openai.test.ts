import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analyse } from "./openai";
import { aiAnalysis } from "@/test/fixtures";

const SECRET_TEXT = "Send me the code 482913 now";

function okResponse(text: string, status = "completed") {
  return new Response(
    JSON.stringify({
      status,
      output: [
        { type: "reasoning" },
        { type: "message", content: [{ type: "output_text", text }] },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("analyse", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
    vi.stubEnv("OPENAI_MODEL", "test-model");
    vi.stubEnv("OPENAI_REASONING_EFFORT", "none");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is not configured without a key or model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(await analyse({ kind: "text", text: "hi" })).toEqual({ ok: false, reason: "not_configured" });
  });

  it("sends a strict schema, store: false, and the message between markers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(JSON.stringify(aiAnalysis())));
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await analyse({ kind: "text", text: SECRET_TEXT });
    expect(outcome.ok).toBe(true);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.model).toBe("test-model");
    expect(body.reasoning).toEqual({ effort: "none" });
    expect(body.text.format).toMatchObject({ type: "json_schema", strict: true });
    const userText = body.input[1].content[0].text as string;
    expect(userText).toMatch(/<<<UNTRUSTED_ITEM [0-9a-f]{16}>>>\nSend me the code/);
  });

  it("sends an image as an input_image part", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse(JSON.stringify(aiAnalysis())));
    vi.stubGlobal("fetch", fetchMock);
    await analyse({ kind: "image", imageDataUrl: "data:image/jpeg;base64,AAAA" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.input[1].content[1]).toMatchObject({ type: "input_image", image_url: "data:image/jpeg;base64,AAAA" });
  });

  it("reports a refusal", async () => {
    const refusal = new Response(
      JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "no" }] }] }),
      { status: 200 },
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(refusal));
    expect(await analyse({ kind: "text", text: "x" })).toEqual({ ok: false, reason: "refused" });
  });

  it("reports incomplete or invalid output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse("{}", "incomplete")));
    expect(await analyse({ kind: "text", text: "x" })).toEqual({ ok: false, reason: "invalid_output" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse("not json")));
    expect(await analyse({ kind: "text", text: "x" })).toEqual({ ok: false, reason: "invalid_output" });
  });

  it("times out, and never logs the message", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );
    vi.stubGlobal("fetch", hanging);
    expect(await analyse({ kind: "text", text: SECRET_TEXT }, 20)).toEqual({ ok: false, reason: "timeout" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(SECRET_TEXT, { status: 500 })));
    expect(await analyse({ kind: "text", text: SECRET_TEXT })).toEqual({ ok: false, reason: "http_error" });

    for (const call of warn.mock.calls) expect(call.join(" ")).not.toContain("482913");
  });
});
