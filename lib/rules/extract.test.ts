import { describe, expect, it } from "vitest";
import { extractLinks, extractPhoneNumbers } from "./extract";

describe("extractLinks", () => {
  it("finds full and bare links and trims trailing punctuation", () => {
    const links = extractLinks("Go to https://pay.example/fine. Or visit www.help.example, or parcel-help.example.");
    expect(links.map((l) => l.text)).toEqual([
      "https://pay.example/fine",
      "www.help.example",
      "parcel-help.example",
    ]);
  });

  it("ignores email addresses, times and abbreviations", () => {
    expect(extractLinks("Write to help@bank.example at 10.30, e.g. today.")).toEqual([]);
  });

  it("marks shortened and lookalike links", () => {
    expect(extractLinks("lnk.example/a8Kd3")[0].shortened).toBe(true);
    expect(extractLinks("secure-login-update.example/x")[0].lookalike).toBe(true);
    expect(extractLinks("news.example/today/story")[0]).toMatchObject({ shortened: false, lookalike: false });
  });
});

describe("extractPhoneNumbers", () => {
  it("finds phone numbers in common formats", () => {
    expect(extractPhoneNumbers("Call 07700 900123 or +44 7700 900456 or (555) 010-0199.")).toEqual([
      "07700 900123",
      "+44 7700 900456",
      "(555) 010-0199",
    ]);
  });

  it("ignores codes, money, dates and reference numbers", () => {
    expect(
      extractPhoneNumbers("Code 482913. Pay £1,250.00 by 2026-11-30. Order no. 12345678. Card ending 1234."),
    ).toEqual([]);
  });
});
