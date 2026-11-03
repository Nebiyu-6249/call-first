import { describe, expect, it } from "vitest";
import { buildCheckResult } from "@/lib/check";
import type { ParentCircle } from "@/lib/circle/types";
import { DEMO_CIRCLE } from "@/lib/demo/circle";
import { HAPPENED_CHOICES, afterCallButtons, urgentAlert, urgentPlan, urgentSummary, type HappenedKind } from ".";

// All people, numbers and the bank are fictional.
const CIRCLE: ParentCircle = {
  parentName: "Amina",
  emergencyNumber: "999",
  familyMembers: [
    { id: "f1", name: "Sara", relationship: "daughter", phone: "07700 900001" },
    { id: "f2", name: "Omar", relationship: "son", phone: "07700 900002" },
  ],
  contacts: [
    { id: "c1", label: "Riverside Example Surgery", category: "doctor", phone: "0808 157 0001" },
    { id: "c2", label: "Gulf Example Bank", category: "bank", phone: "0808 157 0000" },
  ],
};
const NO_BANK: ParentCircle = { ...CIRCLE, contacts: CIRCLE.contacts.filter((c) => c.category !== "bank") };

const KINDS = HAPPENED_CHOICES.map((c) => c.kind);
const savedNumbers = (circle: ParentCircle) => [...circle.familyMembers, ...circle.contacts].map((c) => c.phone);

describe("Something already happened", () => {
  it("offers the four choices, in order", () => {
    expect(HAPPENED_CHOICES.map((c) => c.label)).toEqual([
      "I sent money",
      "I shared a code or password",
      "I gave card or bank details",
      "I let someone into my phone or computer",
    ]);
  });

  it.each(KINDS)("%s: the first step is a call to the saved bank, then two or three next steps", (kind) => {
    const plan = urgentPlan(kind, CIRCLE);
    expect(plan.firstCall).toEqual({ name: "Gulf Example Bank", label: "Call Gulf Example Bank", phone: "0808 157 0000" });
    expect(plan.firstCallWhy.length).toBeGreaterThan(0);
    expect(plan.steps.length).toBeGreaterThanOrEqual(2);
    expect(plan.steps.length).toBeLessThanOrEqual(3);
  });

  it.each(KINDS)("%s: with no saved bank, the first call is the main family member", (kind) => {
    const plan = urgentPlan(kind, NO_BANK);
    expect(plan.firstCall).toEqual({ name: "Sara", label: "Call Sara", phone: "07700 900001" });
    expect(plan.firstCallWhy).toBe("Sara can help you call your bank.");
  });

  it("each plan says what matters for that choice", () => {
    const text = (kind: HappenedKind) => {
      const plan = urgentPlan(kind, CIRCLE);
      return [plan.firstCallWhy, ...plan.steps].join(" ");
    };
    expect(text("sent_money")).toMatch(/stop the payment/);
    expect(text("sent_money")).toMatch(/offering to get your money back.*another scam/);
    expect(text("shared_code")).toMatch(/Change that password/);
    expect(text("gave_card")).toMatch(/stop your card/);
    expect(text("gave_card")).toMatch(/never collect/);
    expect(text("remote_access")).toMatch(/check your phone or computer/);
  });

  it("never promises the money will come back", () => {
    for (const kind of KINDS) {
      const plan = urgentPlan(kind, CIRCLE);
      const text = [plan.firstCallWhy, ...plan.steps].join(" ").toLowerCase();
      expect(text).not.toMatch(/you will get|will be refunded|guarantee|get it all back|don't worry/);
    }
  });

  it("points to the number on the card once, whatever is saved", () => {
    const onCard = (circle: ParentCircle | null) => {
      const plan = urgentPlan("gave_card", circle);
      return [plan.firstCallWhy, ...plan.steps].filter((l) => /back of your card/.test(l));
    };
    expect(onCard(CIRCLE)).toEqual(["If that number does not work, use the number on the back of your card."]);
    expect(onCard(NO_BANK)).toEqual(["Your bank's number is on the back of your card."]);
    expect(onCard(null)).toEqual(["Call your bank on the number on the back of your card."]);
  });

  it("without a circle, has no call button and still gives next steps", () => {
    for (const kind of KINDS) {
      const plan = urgentPlan(kind, null);
      expect(plan.firstCall).toBeNull();
      expect(plan.steps.length).toBeGreaterThanOrEqual(2);
    }
    expect(urgentPlan("sent_money", null).steps.join(" ")).toMatch(/your family/);
  });

  it("never puts a phone number in the advice text", () => {
    for (const kind of KINDS) {
      const plan = urgentPlan(kind, CIRCLE);
      for (const line of [plan.firstCallWhy, ...plan.steps]) expect(line).not.toMatch(/\d{3}/);
    }
  });
});

describe("call buttons only use saved numbers", () => {
  it("after hanging up: the saved bank, then the main family member", () => {
    expect(afterCallButtons(CIRCLE)).toEqual([
      { name: "Gulf Example Bank", label: "Call Gulf Example Bank", phone: "0808 157 0000" },
      { name: "Sara", label: "Call Sara", phone: "07700 900001" },
    ]);
    expect(afterCallButtons(NO_BANK).map((c) => c.name)).toEqual(["Sara"]);
    expect(afterCallButtons(null)).toEqual([]);
  });

  it("every number on a call button is one the family saved, even after a message with its own number", () => {
    const result = buildCheckResult("Gulf Example Bank: we froze your card. Call us now on 07700 900456.", null, "failed");
    expect(result.phoneNumbers).toEqual(["07700 900456"]);
    for (const circle of [CIRCLE, NO_BANK, DEMO_CIRCLE]) {
      const saved = savedNumbers(circle);
      const phones = [...afterCallButtons(circle), ...KINDS.map((k) => urgentPlan(k, circle).firstCall)].map((c) => c?.phone);
      for (const phone of phones) expect(saved).toContain(phone);
      expect(phones).not.toContain("07700 900456");
    }
  });
});

describe("URGENT alerts", () => {
  it("a phone call: no check, no verdict, nothing from a message", () => {
    expect(urgentAlert("phone_call", "Amina")).toEqual({
      verdict: null,
      urgent: "phone_call",
      summary: "Amina had a worrying phone call and hung up.",
      excerpt: "",
      flagIds: [],
    });
  });

  it("after a check: the choice, the verdict, and the excerpt with the code hidden", () => {
    const result = buildCheckResult("Hi Mum, it's Omar. Send me 300 pounds and the code 482913.", null, "failed");
    const alert = urgentAlert("sent_money", "Amina", { result, source: "text" });
    expect(alert).toMatchObject({ urgent: "sent_money", verdict: "WARNING", summary: 'Amina says: "I sent money." Please call now.' });
    expect(alert.excerpt).toBe("Hi Mum, it's Omar. Send me 300 pounds and the code [CODE].");
  });

  it("summaries fit the alert limit", () => {
    for (const kind of ["phone_call", ...KINDS] as const) expect(urgentSummary(kind, "A".repeat(60)).length).toBeLessThanOrEqual(200);
  });
});
