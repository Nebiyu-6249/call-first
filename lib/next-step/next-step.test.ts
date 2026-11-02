import { describe, expect, it } from "vitest";
import { pickNextStep, telHref } from "./index";
import { DEMO_CIRCLE } from "@/test/fixtures";

describe("pickNextStep", () => {
  it("bank message -> the saved bank contact", () => {
    expect(pickNextStep(DEMO_CIRCLE, "bank")).toMatchObject({ label: "Call Gulf Example Bank", phone: "0808 157 0000" });
  });

  it("family claim -> that family member on their saved number", () => {
    expect(pickNextStep(DEMO_CIRCLE, "family", "son")).toMatchObject({ label: "Call Omar", phone: "07700 900002" });
    expect(pickNextStep(DEMO_CIRCLE, "family", "Sara")).toMatchObject({ label: "Call Sara" });
    expect(pickNextStep(DEMO_CIRCLE, "family", "your son Omar")).toMatchObject({ label: "Call Omar" });
  });

  it("family claim for someone not in the circle -> the main family member", () => {
    expect(pickNextStep(DEMO_CIRCLE, "family", "grandson")).toMatchObject({ label: "Call Sara" });
  });

  it("anything else -> the main family member", () => {
    for (const sender of ["police", "government", "delivery", "company", "unknown"] as const) {
      expect(pickNextStep(DEMO_CIRCLE, sender)).toMatchObject({ label: "Call Sara", phone: "07700 900001" });
    }
  });

  it("bank message with no saved bank -> the main family member", () => {
    expect(pickNextStep({ ...DEMO_CIRCLE, contacts: [] }, "bank")).toMatchObject({ label: "Call Sara" });
  });

  it("no circle -> no button", () => {
    expect(pickNextStep(null, "bank")).toBeNull();
  });

  it("builds a dialable tel: link", () => {
    expect(telHref("+44 (0) 7700-900 001")).toBe("tel:+4407700900001");
  });
});
