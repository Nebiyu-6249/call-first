import { describe, expect, it } from "vitest";
import type { AiAnalysis } from "@/lib/ai/schema";
import { DEMO_SAMPLES } from "@/lib/demo/samples";
import { ALERT_MASK_KINDS, LINK_REST, maskText, unmask, unmaskAnalysis } from "./mask";

const names = { parent: "Amina", family: ["Sara", "Omar"] };
const mask = (text: string) => maskText(text, { names }).text;

describe("maskText", () => {
  it("hides card numbers, with or without spaces or dashes", () => {
    expect(mask("Card 4111 1111 1111 1111 expires soon")).toBe("Card [CARD NUMBER] expires soon");
    expect(mask("Card 4111-1111-1111-1111.")).toBe("Card [CARD NUMBER].");
    expect(mask("Card 4111111111111111")).toBe("Card [CARD NUMBER]");
    expect(mask("Amex 3782 822463 10005 is blocked")).toBe("Amex [CARD NUMBER] is blocked");
  });

  it("hides IBANs and long account numbers", () => {
    expect(mask("Send it to GB29 NWBK 6016 1331 9268 19 today")).toBe("Send it to [ACCOUNT NUMBER] today");
    expect(mask("Use account number 31926819 and sort code 60-16-13")).toBe(
      "Use account number [ACCOUNT NUMBER] and sort code [ACCOUNT NUMBER]",
    );
    expect(mask("Transfer to 1234567890123")).toBe("Transfer to [ACCOUNT NUMBER]");
  });

  it("hides a sign-in code inside 'Your code is 482913'", () => {
    expect(mask("Your code is 482913. Never share it.")).toBe("Your code is [CODE]. Never share it.");
    expect(mask("PIN: 4821")).toBe("PIN: [CODE]");
    expect(mask("Read me the 8 digits 12345678 now")).toBe("Read me the 8 digits [CODE] now");
  });

  it("keeps money amounts, dates and times", () => {
    const text = "Pay £1,250.00 or £5000 or 4500 pounds by 14/11/2026 at 10:30, 14 November 2026, ref day 2026-11-14.";
    expect(mask(text)).toBe(text);
    expect(mask("A fee of $ 2500 is due")).toBe("A fee of $ 2500 is due");
    expect(mask("The fee is 1.99 or 1999.50")).toBe("The fee is 1.99 or 1999.50");
  });

  it("hides a year only when it is said to be a code", () => {
    expect(mask("Since 2019 you have banked with us")).toBe("Since 2019 you have banked with us");
    expect(mask("Your PIN is 1987")).toBe("Your PIN is [CODE]");
  });

  it("keeps order, parcel and case numbers", () => {
    expect(mask("Order 123456789 has shipped. Parcel ref: 88213.")).toBe("Order 123456789 has shipped. Parcel ref: 88213.");
  });

  it("hides email addresses", () => {
    expect(mask("Write to help2024@gulf-example-bank.example now")).toBe("Write to [EMAIL] now");
  });

  it("hides phone numbers", () => {
    expect(mask("Call me back on 07700 900456 today")).toBe("Call me back on [PHONE NUMBER] today");
    expect(mask("Ring +44 7700 900456 or 0808 157 0456.")).toBe("Ring [PHONE NUMBER] or [PHONE NUMBER].");
  });

  it("hides the circle's own names, as whole words only", () => {
    expect(mask("Hi Amina, it's Omar. Don't tell Sara.")).toBe(
      "Hi [PARENT], it's [FAMILY MEMBER]. Don't tell [FAMILY MEMBER].",
    );
    expect(mask("SARA says hello")).toBe("[FAMILY MEMBER] says hello");
    expect(mask("Samara and Omari are not family")).toBe("Samara and Omari are not family");
    expect(maskText("Hi Sara Ahmed, or just Sara", { names: { family: ["Sara Ahmed"] } }).text).toBe(
      "Hi [FAMILY MEMBER], or just [FAMILY MEMBER]",
    );
  });

  it("keeps the scheme and host of a link and removes the rest", () => {
    expect(mask("Verify at http://gulf-example-bank.secure-login.example/verify?id=48291 now")).toBe(
      `Verify at http://gulf-example-bank.secure-login.example${LINK_REST} now`,
    );
    expect(mask("Pay at sxp.example/Rp8Kq2")).toBe(`Pay at sxp.example${LINK_REST}`);
    expect(mask("See www.gulf-example.example")).toBe("See www.gulf-example.example");
  });

  it("keeps a lookalike host that contains digits", () => {
    expect(mask("Log in at https://g0lf-examp1e-bank2024.example/login/48291")).toBe(
      `Log in at https://g0lf-examp1e-bank2024.example${LINK_REST}`,
    );
  });

  it("can be run twice with the same result", () => {
    const once = mask(
      "Hi Amina, your code is 482913. Card 4111 1111 1111 1111. Call 07700 900456 or go to https://pay-fines.example/ref/88213",
    );
    expect(maskText(once).text).toBe(once);
  });

  it("lists what it replaced, in the order of the text", () => {
    const { replacements } = maskText("Your code is 482913. Call 07700 900456.", { names });
    expect(replacements).toEqual([
      { kind: "code", original: "482913", masked: "[CODE]" },
      { kind: "phone", original: "07700 900456", masked: "[PHONE NUMBER]" },
    ]);
  });

  it("for the family alert, hides only codes, cards and account numbers", () => {
    const text =
      "Hi Amina, send code 482913 and card 4111 1111 1111 1111 to account number 31926819. Call 07700 900456 or see https://pay.example/x/12345";
    expect(maskText(text, { names, kinds: ALERT_MASK_KINDS }).text).toBe(
      "Hi Amina, send code [CODE] and card [CARD NUMBER] to account number [ACCOUNT NUMBER]. Call 07700 900456 or see https://pay.example/x/12345",
    );
  });

  it("leaves the demo samples readable", () => {
    const masked = DEMO_SAMPLES.map((s) => mask(s.text));
    expect(masked[0]).toBe(
      "Hi Mum, it's [FAMILY MEMBER]. I dropped my phone in the sink so this is my new number. Can you send £450 to my friend's account today? I'll pay you back. Don't tell Dad yet x",
    );
    const login = DEMO_SAMPLES.find((s) => s.id === "login-code")!;
    expect(mask(login.text)).toBe(
      "Your Gulf Example Bank sign-in code is [CODE]. It expires in 10 minutes. We will never ask you for this code. Do not share it with anyone.",
    );
  });
});

describe("unmask", () => {
  const { replacements } = maskText(
    "Hi Amina, it's Omar. Your code is 482913. Call 07700 900456 or go to https://pay.example/ref/1",
    { names },
  );

  it("puts single details back into a quote", () => {
    expect(unmask("Your code is [CODE]", replacements, "original")).toBe("Your code is 482913");
    expect(unmask("Hi [PARENT], it's [FAMILY MEMBER]", replacements, "original")).toBe("Hi Amina, it's Omar");
    expect(unmask(`go to https://pay.example${LINK_REST}`, replacements, "original")).toBe(
      "go to https://pay.example/ref/1",
    );
  });

  it("never repeats numbers or links in the AI's own words", () => {
    expect(unmask(`Call [PHONE NUMBER] or open https://pay.example${LINK_REST}`, replacements, "describe")).toBe(
      "Call a phone number or open the link in the message",
    );
  });

  it("describes a detail in words when there was more than one", () => {
    const two = maskText("Codes 482913 and 777123", {}).replacements;
    expect(unmask("It asks for [CODE]", two, "original")).toBe("It asks for a code");
  });

  it("cleans every text field of an AI analysis", () => {
    const analysis: AiAnalysis = {
      extracted_text: "",
      input_summary: "A message claiming to be from [FAMILY MEMBER].",
      flags: [{ id: "asks_for_code", evidence: "Your code is [CODE]", note: "" }],
      claimed_sender_type: "family",
      claimed_person: "[FAMILY MEMBER]",
      asked_for: [],
      ai_assessment: "likely_scam",
      confidence: 0.9,
      plain_explanation: "Do not call [PHONE NUMBER].",
    };
    const clean = unmaskAnalysis(analysis, replacements);
    expect(clean.input_summary).toBe("A message claiming to be from Omar.");
    expect(clean.claimed_person).toBe("Omar");
    expect(clean.flags[0].evidence).toBe("Your code is 482913");
    expect(clean.plain_explanation).toBe("Do not call a phone number.");
  });
});
