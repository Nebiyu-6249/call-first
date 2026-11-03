import { describe, expect, it } from "vitest";
import { buildAlert } from "./channel";
import { validateCircleSettings, validatePin } from "./validate";
import { buildCheckResult } from "@/lib/check";

describe("buildAlert", () => {
  it("hides the code in the excerpt the family sees, but keeps the number to warn about", () => {
    const result = buildCheckResult("Gulf Example Bank: read us the code 482913 on 07700 900456", null, "failed");
    expect(buildAlert(result, "text").excerpt).toBe("Gulf Example Bank: read us the code [CODE] on 07700 900456");
  });
});

describe("validatePin", () => {
  it("needs 6 digits that are not easy to guess", () => {
    expect(validatePin("482913")).toBeNull();
    expect(validatePin("12345")).not.toBeNull();
    expect(validatePin("abcdef")).not.toBeNull();
    expect(validatePin("123456")).not.toBeNull();
    expect(validatePin("777777")).not.toBeNull();
  });
});

describe("validateCircleSettings", () => {
  it("trims values and fills in defaults", () => {
    const res = validateCircleSettings({
      parentName: "  Amina ",
      familyMembers: [{ name: "Sara", relationship: "daughter", phone: "07700 900001" }],
      contacts: [{ label: "Gulf Example Bank", category: "unknown", phone: "0808 157 0000" }],
    });
    expect(res).toMatchObject({
      ok: true,
      value: { parentName: "Amina", textSize: "large", emergencyNumber: "999", contacts: [{ category: "other", note: "" }] },
    });
  });

  it("lists every problem", () => {
    const res = validateCircleSettings({ parentName: "", emergencyNumber: "help", familyMembers: [{ name: "", phone: "abc" }] });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("buildAlert", () => {
  it("shares only the summary and up to 500 characters of the checked text", () => {
    const result = buildCheckResult(`Please read me the code we sent. ${"x".repeat(900)}`, null, "failed");
    const alert = buildAlert(result, "text");
    expect(alert.verdict).toBe("WARNING");
    expect(alert.excerpt.length).toBe(500);
    expect(alert.summary).toBe("A message: asks for a code or password.");
    expect(alert.flagIds).toContain("asks_for_code");
    expect(Object.keys(alert).sort()).toEqual(["excerpt", "flagIds", "summary", "urgent", "verdict"]);
  });

  it("says when it was a described phone call", () => {
    expect(buildAlert(buildCheckResult("A man called about my pension.", null, "failed"), "voice").summary).toMatch(/^A phone call/);
  });
});
