// Finds links and phone numbers in a message so the app can show them as plain,
// non-clickable text and warn about them. Nothing found here is ever linkified.

export interface FoundLink {
  text: string;
  host: string;
  shortened: boolean;
  lookalike: boolean;
}

const TLDS = [
  "example", "com", "net", "org", "info", "biz", "co", "uk", "io", "ly", "me", "app", "link",
  "click", "xyz", "top", "site", "online", "live", "shop", "store", "support", "help", "today",
  "icu", "cc", "tk", "ml", "ga", "cf", "gq", "ru", "cn", "in", "us", "ca", "au", "de", "fr",
  "gov", "edu", "bank", "vip", "club", "win", "loan", "work", "page", "ws", "to", "gl", "gd",
  "eu", "ae", "sa", "qa", "ke", "ng", "za", "ie", "nz", "es", "it", "nl", "be", "ch", "at",
  "mobi", "pw", "rest", "fun", "cloud", "services", "security", "delivery", "claims", "post",
];

const URL_RE = new RegExp(
  String.raw`(?:https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:${TLDS.join("|")})\b(?::\d+)?(?:\/[^\s<>"']*)?)`,
  "gi",
);

// Words scammers put in fake web addresses to make them look official.
const LOOKALIKE_WORDS =
  /(secure|login|log-in|signin|sign-in|verify|verification|account|update|support|refund|billing|confirm|unlock|auth|wallet|helpdesk|alert|claim|redeliver|reschedule|tracking|parcel|customs|fine|penalty)/;

function hostOf(link: string): string {
  const withoutScheme = link.replace(/^https?:\/\//i, "");
  return withoutScheme.split(/[/?#:]/)[0].toLowerCase();
}

function pathOf(link: string): string {
  const withoutScheme = link.replace(/^https?:\/\//i, "");
  const slash = withoutScheme.indexOf("/");
  return slash === -1 ? "" : withoutScheme.slice(slash);
}

function trimTrailing(link: string): string {
  return link.replace(/[.,;:!?)\]}'"]+$/, "");
}

export function extractLinks(text: string): FoundLink[] {
  const found: FoundLink[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    // Skip the domain part of an email address.
    if (start > 0 && text[start - 1] === "@") continue;
    const raw = trimTrailing(match[0]);
    const host = hostOf(raw);
    if (!host.includes(".")) continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const labels = host.replace(/^www\./, "").split(".");
    const path = pathOf(raw);
    // A tiny domain with one short random-looking path segment (mixed case or digits) is how
    // link shorteners look.
    const shortened =
      labels.length === 2 && labels[0].length <= 5 && /^\/(?=[\w-]*[\dA-Z])[\w-]{3,12}\/?$/.test(path);
    const lookalike =
      LOOKALIKE_WORDS.test(host) ||
      (host.match(/-/g)?.length ?? 0) >= 2 ||
      host.includes("xn--") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      labels.length >= 4;

    found.push({ text: raw, host, shortened, lookalike });
  }
  return found;
}

const PHONE_RE = /(?<![\w+(])(?:\+|00|\()?\d[\d\s().-]{5,}\d(?!\w)/g;

// Digits that follow these words are reference numbers, not phone numbers.
const REFERENCE_PREFIX =
  /(order|ref(?:erence)?|account|acct|tracking|invoice|booking|case|policy|customer|member(?:ship)?|parcel|item|transaction|id|ending(?: in)?)\s*(?:no\.?|number|#|id)?\s*[:#]?\s*$/i;

const DATE_LIKE = /^\d{1,4}[./-]\d{1,2}[./-]\d{1,4}$/;

export function extractPhoneNumbers(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(PHONE_RE)) {
    const raw = match[0].trim().replace(/[\s.-]+$/, "");
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) continue;
    if (DATE_LIKE.test(raw)) continue;
    const start = match.index ?? 0;
    const before = text.slice(Math.max(0, start - 30), start);
    if (/[£$€]\s*$/.test(before)) continue;
    if (REFERENCE_PREFIX.test(before)) continue;
    const tidy = raw.replace(/\s+/g, " ");
    if (!found.includes(tidy)) found.push(tidy);
  }
  return found;
}
