import { describe, expect, it } from "vitest";
import { buildCheckResult } from "@/lib/check";
import { buildAlert } from "@/lib/circle/channel";
import { pickNextStep } from "@/lib/next-step";
import { DEMO_CIRCLE } from "./circle";
import { createDemoFamilyLoop } from "./family-loop";
import { checkedPanel, checkedSample, showFamilyHint } from "./panel";
import { DEMO_SAMPLES } from "./samples";

// The demo must give a sensible answer even when the AI service fails, so every sample is
// checked here with the rules alone.

describe("demo samples", () => {
  it("covers the messages the brief asks for, with 'Hi Mum' first", () => {
    expect(DEMO_SAMPLES.map((s) => s.id)).toEqual([
      "new-number",
      "bank-code",
      "account-frozen",
      "traffic-fine",
      "parcel-fee",
      "police-secret",
      "prize",
      "appointment",
      "login-code",
    ]);
  });

  it("uses only made-up numbers and reserved .example links", () => {
    for (const sample of DEMO_SAMPLES) {
      const { phoneNumbers, links } = buildCheckResult(sample.text, null, "failed");
      for (const n of phoneNumbers) expect(n.replace(/\s/g, "")).toMatch(/^(?:07700900\d{3}|08081570\d{3})$/);
      for (const l of links) expect(new URL(l).hostname).toMatch(/\.example$/);
    }
  });

  it.each(DEMO_SAMPLES.filter((s) => s.kind === "scam").map((s) => [s.id, s.text]))(
    "scam sample %s gets a warning or a not-sure with the rules alone",
    (id, text) => {
      const result = buildCheckResult(text, null, "failed");
      expect(result.level).not.toBe("NO_WARNING_SIGNS");
      expect(result.flags.length).toBeGreaterThan(0);
    },
  );

  it("rules alone give WARNING for the scams that ask for something", () => {
    for (const id of ["bank-code", "traffic-fine", "parcel-fee", "new-number", "police-secret", "prize"]) {
      const sample = DEMO_SAMPLES.find((s) => s.id === id)!;
      expect(buildCheckResult(sample.text, null, "failed").level, id).toBe("WARNING");
    }
  });

  it.each(DEMO_SAMPLES.filter((s) => s.kind === "normal").map((s) => [s.id, s.text]))(
    "normal sample %s finds no warning signs with the rules alone",
    (_id, text) => {
      const result = buildCheckResult(text, null, "failed");
      expect(result.flags).toEqual([]);
      // Without the AI it cannot say more than "not sure".
      expect(result.level).toBe("NOT_SURE");
    },
  );

  it("the requested sign-in code is not mistaken for a request for a code", () => {
    const sample = DEMO_SAMPLES.find((s) => s.id === "login-code")!;
    expect(buildCheckResult(sample.text, null, "failed").flags.map((f) => f.id)).not.toContain("asks_for_code");
  });

  it("points 'Hi Mum' to Omar's saved number, never the new one", () => {
    const sample = DEMO_SAMPLES.find((s) => s.id === "new-number")!;
    const result = buildCheckResult(sample.text, null, "failed");
    expect(result.senderType).toBe("family");
    expect(result.claimedPerson).toBe("Omar");
    const step = pickNextStep(DEMO_CIRCLE, result.senderType, result.claimedPerson);
    expect(step).toMatchObject({ name: "Omar", phone: "07700 900002" });
  });

  it("points the bank samples to the saved bank number", () => {
    const sample = DEMO_SAMPLES.find((s) => s.id === "bank-code")!;
    const result = buildCheckResult(sample.text, null, "failed");
    expect(pickNextStep(DEMO_CIRCLE, result.senderType)).toMatchObject({ phone: "0808 157 0000" });
  });
});

describe("demo family loop", () => {
  const sample = DEMO_SAMPLES[0];
  const alert = buildAlert(buildCheckResult(sample.text, null, "failed"), "text");

  it("sends an alert, shows it to the family, and passes the reply back", async () => {
    const loop = createDemoFamilyLoop(() => Date.parse("2026-11-20T10:00:00Z"));
    const channel = loop.channel("Sara");
    let changes = 0;
    loop.subscribe(() => changes++);

    const id = await channel.send(alert);
    expect(id).toBeTruthy();
    expect(await channel.poll(id!)).toEqual({ status: "waiting" });
    expect(loop.getAlerts()).toHaveLength(1);
    expect(loop.getAlerts()[0]).toMatchObject({ verdict: "WARNING", excerpt: sample.text, reply: null });

    expect(loop.reply(id!, "calling")).toBeNull();
    expect(await channel.poll(id!)).toMatchObject({
      status: "replied",
      reply: { kind: "calling", text: "Don't do anything. I'm calling you now." },
    });
    expect(changes).toBe(2);
  });

  it("keeps the same list until something changes", async () => {
    const loop = createDemoFamilyLoop();
    const before = loop.getAlerts();
    expect(loop.getAlerts()).toBe(before);
    await loop.channel("Sara").send(alert);
    expect(loop.getAlerts()).not.toBe(before);
  });

  it("puts the newest alert first and allows one reply each", async () => {
    const loop = createDemoFamilyLoop();
    const first = loop.send(alert);
    const second = loop.send({ ...alert, summary: "Second" });
    expect(loop.getAlerts().map((a) => a.id)).toEqual([second, first]);
    expect(loop.reply(first, "custom", "   ")).toBe("Please write a reply first.");
    expect(loop.reply(first, "custom", " On my way ")).toBeNull();
    expect(loop.getAlerts()[1].reply?.text).toBe("On my way");
    expect(loop.reply(first, "fine")).toBe("You have already replied to this one.");
  });

  it("cuts long excerpts to 500 characters, like the real service", () => {
    const loop = createDemoFamilyLoop();
    loop.send({ ...alert, excerpt: "x".repeat(900), summary: "y".repeat(400) });
    expect(loop.getAlerts()[0].excerpt).toHaveLength(500);
    expect(loop.getAlerts()[0].summary).toHaveLength(200);
  });

  it("reports an alert as gone after the demo is reset", async () => {
    const loop = createDemoFamilyLoop();
    const channel = loop.channel("Sara");
    const id = (await channel.send(alert))!;
    loop.reset();
    expect(loop.getAlerts()).toEqual([]);
    expect(await channel.poll(id)).toEqual({ status: "gone" });
    expect(loop.reply(id, "fine")).toBe("That message is no longer here.");
  });
});

describe("demo panel", () => {
  const sample = DEMO_SAMPLES.find((s) => s.id === "bank-code")!;

  it("shows the sample and highlights it when a sample was checked", () => {
    const checked = { kind: "text" as const, text: sample.text };
    expect(checkedSample(checked)?.id).toBe("bank-code");
    expect(checkedPanel(checked, "Amina")).toEqual({ caption: "The message Amina got", body: sample.text });
  });

  it("shows the pasted text, not the earlier sample, and clears the highlight", () => {
    const pasted = { kind: "text" as const, text: "  Your library book is due back on Friday.\n" };
    expect(checkedSample(pasted)).toBeNull();
    expect(checkedPanel(pasted, "Amina")).toEqual({
      caption: "The message Amina got",
      body: "Your library book is due back on Friday.",
    });
  });

  it("describes an uploaded screenshot instead of showing a sample", () => {
    expect(checkedSample({ kind: "image" })).toBeNull();
    expect(checkedPanel({ kind: "image" }, "Amina")?.body).toBe("A screenshot Amina uploaded");
  });

  it("shows what was said for a voice check", () => {
    const voice = { kind: "voice" as const, text: sample.text };
    expect(checkedSample(voice)).toBeNull();
    expect(checkedPanel(voice, "Amina")?.caption).toBe("What Amina said");
  });

  it("shows nothing before anything is checked", () => {
    expect(checkedSample(null)).toBeNull();
    expect(checkedPanel(null, "Amina")).toBeNull();
  });

  it("hints at the family loop after a result, until something is sent", () => {
    expect(showFamilyHint(false, 0)).toBe(false);
    expect(showFamilyHint(true, 0)).toBe(true);
    expect(showFamilyHint(true, 1)).toBe(false);
  });
});
