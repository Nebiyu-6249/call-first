import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Checks the colour tokens in app/globals.css against WCAG contrast ratios: 7:1 (AAA) for text,
// 3:1 for borders and other non-text parts.

const css = readFileSync(join(__dirname, "..", "app", "globals.css"), "utf8");
const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(tokens[a]), luminance(tokens[b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every text colour on every background it is used on.
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "surface"],
  ["muted", "background"],
  ["muted", "surface"],
  ["primary", "background"],
  ["primary", "surface"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "primary-hover"],
  ["warning", "warning-bg"],
  ["warning", "surface"],
  ["warning", "background"],
  ["unsure", "unsure-bg"],
  ["ok", "ok-bg"],
  ["ok", "surface"],
  ["ok", "background"],
  // The demo's call note uses the page colours reversed.
  ["background", "foreground"],
];

describe("colour contrast", () => {
  it("finds the tokens", () => {
    expect(Object.keys(tokens).length).toBeGreaterThanOrEqual(15);
  });

  it.each(TEXT_PAIRS)("%s text on %s is at least 7:1 (AAA)", (text, bg) => {
    expect(ratio(text, bg)).toBeGreaterThanOrEqual(7);
  });

  it.each([
    ["border", "background"],
    ["border", "surface"],
    ["focus", "background"],
    ["focus", "surface"],
  ])("%s on %s is at least 3:1 (non-text)", (part, bg) => {
    expect(ratio(part, bg)).toBeGreaterThanOrEqual(3);
  });
});
