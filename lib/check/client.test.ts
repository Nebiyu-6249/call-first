import { afterEach, describe, expect, it, vi } from "vitest";
import { DEMO_CIRCLE } from "@/lib/demo/circle";
import { aiAnalysis } from "@/test/fixtures";
import { runCheck } from "./client";

const message = "Hi Mum, it's Omar. Send the code 482913 to 07700 900456 and don't tell Sara. https://pay.example/ref/77";

function stubFetch(response: unknown, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => response }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runCheck", () => {
  it("in private mode, makes no request and checks with the rules on the phone", async () => {
    const fetchMock = stubFetch({ aiStatus: "failed" });
    const result = await runCheck({ type: "text", text: message }, { ...DEMO_CIRCLE, privateMode: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.aiStatus).toBe("skipped");
    expect(result.sent).toEqual({ kind: "nothing" });
    // The rules still find the secrecy request, so the verdict is the same as with the AI.
    expect(result.level).toBe("WARNING");
    expect(result.phoneNumbers).toEqual(["07700 900456"]);
  });

  it("in private mode, a normal message gets NOT SURE, never NO WARNING SIGNS", async () => {
    stubFetch({ aiStatus: "ok", ai: aiAnalysis({ ai_assessment: "likely_normal", confidence: 0.99 }) });
    const result = await runCheck(
      { type: "text", text: "Riverside Example Surgery: your appointment is on Thursday at 10:30." },
      { ...DEMO_CIRCLE, privateMode: true },
    );
    expect(result.level).toBe("NOT_SURE");
  });

  it("in private mode, sends no voice description either", async () => {
    const fetchMock = stubFetch({ aiStatus: "failed" });
    await runCheck({ type: "call_description", text: "A man said he was from the bank" }, { ...DEMO_CIRCLE, privateMode: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends only the masked text, and shows the person what was sent", async () => {
    const fetchMock = stubFetch({ aiStatus: "ok", ai: aiAnalysis({ ai_assessment: "likely_scam", confidence: 0.9 }) });
    const result = await runCheck({ type: "text", text: message }, DEMO_CIRCLE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body as string);
    expect(body.type).toBe("text");
    expect(body.text).toBe(
      "Hi Mum, it's [FAMILY MEMBER]. Send the code [CODE] to [PHONE NUMBER] and don't tell [FAMILY MEMBER]. https://pay.example/[rest of link removed]",
    );
    for (const secret of ["Omar", "Sara", "482913", "900456", "ref/77"]) expect(body.text).not.toContain(secret);

    expect(result.sent).toEqual({ kind: "text", text: body.text });
    // The phone still shows the real number and link from the message, as plain text.
    expect(result.phoneNumbers).toEqual(["07700 900456"]);
    expect(result.links).toEqual(["https://pay.example/ref/77"]);
  });

  it("puts details back into the AI's quotes and words on the phone", async () => {
    stubFetch({
      aiStatus: "ok",
      ai: aiAnalysis({
        ai_assessment: "likely_scam",
        confidence: 0.9,
        claimed_sender_type: "family",
        claimed_person: "[FAMILY MEMBER]",
        input_summary: "A message claiming to be from your son, asking for [CODE].",
        flags: [{ id: "asks_for_code", evidence: "Send the code [CODE]", note: "" }],
      }),
    });
    const result = await runCheck({ type: "text", text: "Hi Mum, it's Omar. Send the code 482913." }, DEMO_CIRCLE);
    expect(result.summary).toBe("A message claiming to be from your son, asking for 482913.");
    expect(result.flags.find((f) => f.id === "asks_for_code")?.evidence).toMatch(/482913/);
    expect(result.claimedPerson).toBe("Omar");
  });

  it("records what was sent even when the AI service fails", async () => {
    stubFetch({ aiStatus: "failed" });
    const result = await runCheck({ type: "text", text: "Your code is 482913" }, DEMO_CIRCLE);
    expect(result.aiStatus).toBe("failed");
    expect(result.sent).toEqual({ kind: "text", text: "Your code is [CODE]" });
  });

  it("sends a picture as it is", async () => {
    const fetchMock = stubFetch({ aiStatus: "failed" });
    const image = "data:image/jpeg;base64,AAAA";
    const result = await runCheck({ type: "image", image }, DEMO_CIRCLE);
    const body = JSON.parse(((fetchMock.mock.calls[0] as unknown[])[1] as RequestInit).body as string);
    expect(body).toEqual({ type: "image", image });
    expect(result.sent).toEqual({ kind: "image" });
  });
});
