// Hides personal details in a message before it leaves the phone for the AI service.
// Pure TypeScript: no network, no storage. The rules engine keeps running on the original text
// on the phone, and the numbers and links shown as "This came from the message" come from the
// original too, so hiding them here does not weaken what the phone itself can see.

import type { AiAnalysis } from "@/lib/ai/schema";
import type { ParentCircle } from "@/lib/circle/types";
import { extractLinks, extractPhoneNumbers } from "@/lib/rules/extract";

export const MASK_TOKENS = {
  card: "[CARD NUMBER]",
  account: "[ACCOUNT NUMBER]",
  code: "[CODE]",
  email: "[EMAIL]",
  phone: "[PHONE NUMBER]",
  parent: "[PARENT]",
  family: "[FAMILY MEMBER]",
} as const;

export type MaskKind = keyof typeof MASK_TOKENS | "link";

export const MASK_KINDS: readonly MaskKind[] = ["link", "email", "card", "account", "phone", "code", "parent", "family"];

// Codes, card numbers and account numbers: what is hidden in the excerpt the family sees.
// The family still sees phone numbers and links, as plain text.
export const ALERT_MASK_KINDS: readonly MaskKind[] = ["card", "account", "code"];

// What replaces the end of a link: the AI keeps the scheme and host to spot lookalike addresses.
export const LINK_REST = "/[rest of link removed]";

export interface MaskNames {
  parent?: string;
  family?: string[];
}

// The circle's own names, which the AI never needs to see.
export function circleNames(circle: ParentCircle | null): MaskNames {
  if (!circle) return {};
  return { parent: circle.parentName, family: circle.familyMembers.map((m) => m.name) };
}

export interface MaskOptions {
  names?: MaskNames;
  // Which details to hide. All of them unless given.
  kinds?: readonly MaskKind[];
}

export interface Replacement {
  kind: MaskKind;
  original: string;
  masked: string;
}

export interface Masked {
  text: string;
  replacements: Replacement[];
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
// A link that was already shortened (the server masks again, so masking must be repeatable).
const MASKED_LINK_RE = /\S+\/\[rest of link removed\]/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}(?: ?[A-Z0-9]{4}){3,7}(?: ?[A-Z0-9]{1,3})?\b/g;
// 13 to 19 digits, run together or in the groups printed on cards.
const CARD_RE = /(?<![\w-])(?:\d{13,19}|\d{4}([ -])\d{4}\1\d{4}\1\d{1,4}(?:\1\d{1,3})?|\d{4}([ -])\d{6}\2\d{4,5})(?![\w-])/g;
const LONG_NUMBER_RE = /(?<![\w-])\d{9,19}(?![\w-])/g;
const SORT_CODE_RE = /(?<=\bsort[ -]?code\s*(?:is|:)?\s*)\d{2}[- ]?\d{2}[- ]?\d{2}\b/gi;
const ACCOUNT_AFTER_WORD_RE = /(?<=\b(?:account|acct|a\/c)\s*(?:no\.?|number|#)?\s*(?:is|:)?\s*)\d(?:[\d -]{4,}\d)?(?![\w])/gi;
// 4 to 8 digits standing alone: not part of a money amount, a decimal, a date, a time or a word.
const CODE_RE =
  /(?<![\w.,:/'£$€-])(?<![£$€]\s)\d{4,8}(?![\w]|[.,:/-]\d|\s?(?:pounds?|pence|dollars?|euros?|gbp|usd|eur)\b)/gi;
const CODE_WORDS = /\b(code|pin|password|passcode|passcodes|otp|one[- ]time)\b/i;
// Order, parcel and case numbers are not personal, and the AI is better for seeing them.
const REFERENCE_BEFORE =
  /\b(order|ref(?:erence)?|tracking|invoice|booking|case|policy|parcel|item|ticket|claim)\s*(?:no\.?|number|#|id)?\s*(?:is|:|#)?\s*$/i;

// Luhn check: real card numbers pass it; most other long numbers do not.
function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// A link with everything after the host removed. Unchanged when there is nothing after the host.
export function shortenLink(link: string): string {
  const scheme = /^https?:\/\//i.exec(link)?.[0] ?? "";
  const rest = link.slice(scheme.length);
  const host = rest.split(/[/?#:]/)[0];
  return rest.length > host.length ? `${scheme}${host}${LINK_REST}` : link;
}

// Placeholders use private-use characters with no digits or letters in them, so later passes
// cannot match inside them.
const OPEN = "";
const CLOSE = "";
const PLACEHOLDER_RE = /([-]+)/g;

function placeholder(index: number): string {
  let id = "";
  let n = index;
  do {
    id = String.fromCharCode(0xe100 + (n % 0x0e00)) + id;
    n = Math.floor(n / 0x0e00);
  } while (n > 0);
  return `${OPEN}${id}${CLOSE}`;
}

function placeholderIndex(id: string): number {
  let n = 0;
  for (const ch of id) n = n * 0x0e00 + (ch.charCodeAt(0) - 0xe100);
  return n;
}

export function maskText(input: string, options: MaskOptions = {}): Masked {
  const enabled = new Set(options.kinds ?? MASK_KINDS);
  const held: { kind: MaskKind | null; original: string; masked: string }[] = [];
  let text = input;

  // Swaps a match for a placeholder. A kind that is switched off keeps its original text but is
  // still held back, so its digits are not mistaken for a code later.
  function hold(kind: MaskKind | null, original: string, masked: string): string {
    const show = kind !== null && enabled.has(kind) ? masked : original;
    held.push({ kind: show === original ? null : kind, original, masked: show });
    return placeholder(held.length - 1);
  }

  // None of the patterns have named groups, so the last two arguments are the offset and the text.
  function pass(re: RegExp, kind: MaskKind, decide?: (match: string, before: string) => MaskKind | null) {
    text = text.replace(re, (...args) => {
      const match = args[0] as string;
      const offset = args[args.length - 2] as number;
      const whole = args[args.length - 1] as string;
      const chosen = decide ? decide(match, whole.slice(Math.max(0, offset - 30), offset)) : kind;
      if (chosen === null) return match;
      const token = chosen === "link" ? shortenLink(match) : MASK_TOKENS[chosen];
      return hold(chosen, match, token);
    });
  }

  text = text.replace(MASKED_LINK_RE, (m) => hold(null, m, m));

  const links = extractLinks(text)
    .map((l) => l.text)
    .sort((a, b) => b.length - a.length);
  for (const link of links) {
    if (!text.includes(link)) continue;
    const masked = shortenLink(link);
    text = text.split(link).join(hold(masked === link ? null : "link", link, masked));
  }

  pass(EMAIL_RE, "email");
  pass(IBAN_RE, "account");
  pass(CARD_RE, "card", (m) => (luhn(m.replace(/\D/g, "")) ? "card" : "account"));

  const phones = extractPhoneNumbers(text).sort((a, b) => b.length - a.length);
  for (const phone of phones) {
    // The extractor tidies spaces, so match the digits with any spacing in between.
    const loose = new RegExp(
      phone
        .split(/\s+/)
        .map(escapeRegExp)
        .join("\\s+"),
      "g",
    );
    // Eight digits run together are far more often a code than a phone number.
    text = text.replace(loose, (m) => (/^\d{8}$/.test(m) ? hold("code", m, MASK_TOKENS.code) : hold("phone", m, MASK_TOKENS.phone)));
  }

  pass(SORT_CODE_RE, "account");
  pass(ACCOUNT_AFTER_WORD_RE, "account");
  pass(LONG_NUMBER_RE, "account", (_m, before) => (REFERENCE_BEFORE.test(before) ? null : "account"));
  pass(CODE_RE, "code", (m, before) => {
    if (REFERENCE_BEFORE.test(before)) return null;
    // A year such as 2026 stays, unless the words just before it are about a code.
    if (/^(19|20)\d{2}$/.test(m)) return CODE_WORDS.test(before) ? "code" : null;
    return "code";
  });

  const names: { kind: "parent" | "family"; name: string }[] = [];
  if (options.names?.parent) names.push({ kind: "parent", name: options.names.parent });
  for (const name of options.names?.family ?? []) names.push({ kind: "family", name });
  // Full names first, then each part of a longer name ("Sara Ahmed", then "Sara").
  const variants = names.flatMap(({ kind, name }) => {
    const full = name.trim();
    const parts = full.split(/\s+/).filter((p) => p.length >= 2);
    return [full, ...(parts.length > 1 ? parts : [])].filter(Boolean).map((n) => ({ kind, name: n }));
  });
  variants.sort((a, b) => b.name.length - a.name.length);
  for (const { kind, name } of variants) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(name)}(?![\\p{L}\\p{N}])`, "giu");
    text = text.replace(re, (m) => hold(kind, m, MASK_TOKENS[kind]));
  }

  const replacements: Replacement[] = [];
  const out = text.replace(PLACEHOLDER_RE, (_, id: string) => {
    const item = held[placeholderIndex(id)];
    if (item.kind) replacements.push({ kind: item.kind, original: item.original, masked: item.masked });
    return item.masked;
  });
  return { text: out, replacements };
}

const DESCRIBE: Record<MaskKind, string> = {
  card: "a card number",
  account: "an account number",
  code: "a code",
  email: "an email address",
  phone: "a phone number",
  parent: "you",
  family: "a family member",
  link: "the link in the message",
};

// Puts the hidden details back into something the AI wrote, so the parent never sees "[CODE]".
// A detail goes back only when the message had exactly one of its kind; otherwise it is described
// in words. With contactDetails "describe", phone numbers, links and email addresses are always
// described, never repeated: the AI's own words must not point the parent to them.
export function unmask(text: string, replacements: Replacement[], contactDetails: "original" | "describe"): string {
  if (!text) return text;
  let out = text;
  const contact = new Set<MaskKind>(["phone", "link", "email"]);

  const links = replacements.filter((r) => r.kind === "link");
  for (const r of [...links].sort((a, b) => b.masked.length - a.masked.length)) {
    if (!out.includes(r.masked)) continue;
    const sameMasked = new Set(links.filter((l) => l.masked === r.masked).map((l) => l.original));
    const back = contactDetails === "original" && sameMasked.size === 1 ? r.original : DESCRIBE.link;
    out = out.split(r.masked).join(back);
  }
  // A shortened link the message did not contain as written: describe it.
  out = out.replace(MASKED_LINK_RE, DESCRIBE.link);

  for (const kind of Object.keys(MASK_TOKENS) as (keyof typeof MASK_TOKENS)[]) {
    const token = MASK_TOKENS[kind];
    if (!out.includes(token)) continue;
    const originals = new Set(replacements.filter((r) => r.kind === kind).map((r) => r.original));
    const keepOriginal = originals.size === 1 && !(contactDetails === "describe" && contact.has(kind));
    out = out.split(token).join(keepOriginal ? [...originals][0] : DESCRIBE[kind]);
  }
  return out;
}

// The AI analysis with hidden details put back where it is safe to.
export function unmaskAnalysis(analysis: AiAnalysis, replacements: Replacement[]): AiAnalysis {
  return {
    ...analysis,
    input_summary: unmask(analysis.input_summary, replacements, "describe"),
    plain_explanation: unmask(analysis.plain_explanation, replacements, "describe"),
    claimed_person: unmask(analysis.claimed_person, replacements, "describe"),
    // Evidence is shown as a plain-text quote of the message the parent already has.
    flags: analysis.flags.map((f) => ({ ...f, evidence: unmask(f.evidence, replacements, "original") })),
  };
}
