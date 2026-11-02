// Rules engine: fixed patterns, no AI. Each rule looks for one red flag from the taxonomy.
// Patterns run on a lower-cased copy of the text with curly quotes straightened.

import { extractLinks, extractPhoneNumbers, type FoundLink } from "./extract";
import { LINK_REASONS, TAXONOMY, type FlagId, type Severity } from "./taxonomy";

export interface RuleFlag {
  id: FlagId;
  severity: Severity;
  reason: string;
  // A short quote from the message (12 words or fewer) that triggered the flag.
  evidence: string;
}

export interface RulesResult {
  flags: RuleFlag[];
  links: FoundLink[];
  phoneNumbers: string[];
}

interface Hit {
  index: number;
  length: number;
}

interface Context {
  text: string;
  lower: string;
  links: FoundLink[];
  phoneNumbers: string[];
}

// Words that turn a request into a warning, as in "we will never ask for your PIN".
const NEGATION =
  /\b(never|nobody|no[ -]one|not|do not|don't|dont|does not|doesn't|will not|won't|would not|wouldn't|should not|shouldn't|must not|mustn't)\b/;

// The part of the sentence before `index`, back to the last comma or sentence end.
function clauseBefore(lower: string, index: number): string {
  const before = lower.slice(0, index);
  const cut = Math.max(...[",", ";", ":", ".", "!", "?", "\n"].map((c) => before.lastIndexOf(c)));
  return before.slice(cut + 1);
}

// The part of the sentence after the match, up to the next comma or sentence end.
function clauseAfter(lower: string, index: number): string {
  const rest = lower.slice(index);
  const end = rest.search(/[,;:.!?\n]/);
  return end === -1 ? rest : rest.slice(0, end);
}

interface FindOptions {
  // Skip matches that sit in a negated clause ("never share this code").
  negatable?: boolean;
  // Skip a match when this returns true.
  unless?: (lower: string, hit: Hit) => boolean;
}

function find(lower: string, patterns: RegExp[], options: FindOptions = {}): Hit | null {
  for (const pattern of patterns) {
    const global = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    for (const match of lower.matchAll(global)) {
      const hit = { index: match.index ?? 0, length: match[0].length };
      if (options.negatable && NEGATION.test(clauseBefore(lower, hit.index))) continue;
      if (options.unless?.(lower, hit)) continue;
      return hit;
    }
  }
  return null;
}

const MAX_QUOTE_WORDS = 12;

// Quotes the sentence around the match, so "Bank" becomes "Gulf Example Bank: we noticed
// unusual activity". Long sentences are cut to a window that starts just before the match.
function quote(text: string, hit: Hit): string {
  const before = text.slice(0, hit.index);
  const start = Math.max(...[".", "!", "?", "\n"].map((c) => before.lastIndexOf(c))) + 1;
  const afterEnd = text.slice(hit.index + hit.length).search(/[.!?\n]/);
  const end = afterEnd === -1 ? text.length : hit.index + hit.length + afterEnd;

  const lead = text.slice(start, hit.index).trim().split(/\s+/).filter(Boolean);
  const rest = text.slice(hit.index, end).trim().split(/\s+/).filter(Boolean);
  const words = [...lead.slice(-3), ...rest];
  const all = [...lead, ...rest];
  return (all.length <= MAX_QUOTE_WORDS ? all : words.slice(0, MAX_QUOTE_WORDS)).join(" ");
}

// Words for a secret code, but not "postcode", "promo code" and the like.
const CODE_WORD = String.raw`(?:(?:one[- ]time |verification |security |login |log-in |sign-in |access |confirmation |authori[sz]ation |\d[- ]?digit |six[- ]digit |4[- ]digit |four[- ]digit )*(?<!(?:post|zip|postal|area|sort|promo|discount|voucher|booking|reference|tracking|dress|qr|bar|country|dialling|dialing|gift)[ -]?)(?:code|codes|pin|pin number|password|passcode|passcodes|otp|passwords))\b`;

const SHARE_VERB = String.raw`(?:share|sharing|tell|telling|give|giving|read|reading|provide|providing|confirm|confirming|forward|repeat|pass on|let (?:me|us) (?:know|have)|reply(?:ing)? with|respond(?:ing)? with|text (?:me|us|it|back)|send (?:me|us|back|it back|it to)|say)`;

type Rule = (ctx: Context) => Hit | null;

const RULES: Record<Exclude<FlagId, "contains_link" | "contains_callback_number">, Rule> = {
  asks_for_code: ({ lower }) =>
    find(
      lower,
      [
        new RegExp(String.raw`\b${SHARE_VERB}\b[^.!?\n,;:]{0,40}?\b${CODE_WORD}`),
        new RegExp(String.raw`\b(?:need|needs|needed|require|requires|required|want|wants|wanted|ask(?:ed|ing)? (?:you |me )?for|asks (?:you |me )?for|request(?:ed|ing)?)\b[^.!?\n]{0,25}?\b(?:your|my|the|that|this) ${CODE_WORD}`),
        /\b(?:what(?:'s| is| was)|tell me|read me) (?:the|your|that) (?:\d[- ]?digit )?(?:code|pin|numbers|digits)\b/,
        /\bread (?:it|them|the (?:numbers|digits|code)) (?:out|back)\b/,
        /\b(?:enter|type|input|put) (?:in )?your (?:card )?(?:pin|password|passcode)\b/,
      ],
      { negatable: true },
    ),

  asks_for_card_or_bank_details: ({ lower }) => {
    const detail = String.raw`(?:card number|card details|long number on (?:the front of )?your card|security (?:code|number) on the back|3[- ]digit (?:code|number)|three[- ]digit (?:code|number)|expiry date|expiration date|sort code|account number|account details|bank details|banking details|online banking (?:login|details|password|username)|iban|routing number|card pin|debit card|credit card|bank card)`;
    return (
      find(lower, [/\b(?:cvv|cvc|cvv2)\b/]) ??
      find(
        lower,
        [
          new RegExp(String.raw`\b(?:confirm|verify|update|provide|enter|send|give|share|tell|re-?enter|need|needed|require|submit|fill in|type|read|ask(?:ed|ing)? (?:you |me )?for|want(?:s|ed)?)\b[^.!?\n]{0,40}?\b${detail}`),
          new RegExp(String.raw`\b${detail}\b[^.!?\n]{0,20}?\b(?:is|are) (?:needed|required)\b`),
        ],
        { negatable: true },
      )
    );
  },

  secrecy_request: ({ lower }) =>
    find(
      lower,
      [
        // Includes reported speech from a call description: "he said not to tell my daughter".
        /\b(?:do not|don't|dont|never|not to|you must not|you cannot|you can't|you are not allowed to|i must not|i can't|i cannot|i was not allowed to|i wasn't allowed to)\s+(?:tell|inform|contact|call|speak to|talk to|mention (?:this|it) to|discuss (?:this|it) with|let)\s+(?:anyone|anybody|(?:your|my) (?:family|bank|children|kids|son|daughter|husband|wife|friends?|relatives|grandchildren|grandson|granddaughter|partner)|the bank|bank staff|family|branch staff|the police)\b/,
        /\b(?:keep|kept) (?:it|this) (?:a )?secret\b/,
        /\bkeep (?:this|it|everything|our conversation) (?:a )?(?:secret|confidential|private|quiet|between us|to yourself)\b/,
        /\bbetween (?:you and me|you and i|ourselves)\b/,
        /\b(?:confidential|secret|undercover|covert) (?:investigation|operation|matter|case)\b/,
        /\bif (?:the bank|anyone|they|staff|the cashier|bank staff|the teller|someone) asks?,? (?:you )?(?:just )?(?:say|tell them)\b/,
        /\b(?:bank )?staff (?:at (?:the|your) bank )?(?:may be|are|could be|might be) (?:involved|corrupt|working with)\b/,
        /\b(?:do not|don't|dont) hang up\b/,
      ],
      {
        // "Do not tell anyone this code" protects the person; it is not a secrecy request.
        unless: (lower, hit) => new RegExp(String.raw`\b(?:your|this|the|that) ${CODE_WORD}`).test(clauseAfter(lower, hit.index)),
      },
    ),

  remote_access_request: ({ lower }) =>
    find(
      lower,
      [
        /\bremote (?:access|control|desktop|support|assistance|session|app|software|tool|viewer)\b/,
        /\bshare (?:your|the) screen\b/,
        /\bscreen ?shar(?:e|ing)\b/,
        /\btake (?:control|over) (?:of )?your (?:computer|phone|device|laptop|pc|screen|tablet)\b/,
        /\bgive (?:me|us|the technician|our (?:agent|technician|team|engineer)) access to your (?:computer|phone|device|laptop|pc|tablet|account)\b/,
        /\b(?:install|download)\b[^.!?\n]{0,40}?\b(?:so (?:that )?(?:i|we|our|the) (?:can|could|will)|to (?:let|allow) (?:us|me|our)|(?:support|security|protection|remote|viewer|desk|assist)(?: app| tool| software| program)?)\b/,
        /\b(?:read|tell) (?:me|us) the (?:id|access code|connection code|session code) (?:on|shown on|from) (?:your|the) screen\b/,
      ],
      { negatable: true },
    ),

  asks_for_payment: ({ lower }) =>
    find(
      lower,
      [
        /\bgift ?cards?\b/,
        /\b(?:bitcoin|cryptocurrency|crypto|btc|usdt|ethereum|crypto wallet|bitcoin atm|bitcoin machine)\b/,
        /\b(?:wire (?:the )?(?:money|funds|transfer)|bank transfer|transfer (?:the |your |all )?(?:money|funds|savings|balance|amount)|move (?:your |the )?(?:money|savings|funds)|safe account|secure account|holding account)\b/,
        /\b(?:pay|send|transfer)\b[^.!?\n]{0,30}?(?:[£$€]\s?\d|\b\d+(?:\.\d{2})?\s?(?:pounds|dollars|euros|gbp|usd|eur)\b)/,
        /\b(?:pay|settle|clear)\b[^.!?\n]{0,25}?\b(?:fee|fine|charge|penalty|balance|debt|amount owed|outstanding|invoice|tax|duty|duties)\b/,
        /\b(?:release|processing|handling|redelivery|re-delivery|customs|clearance|admin|administration|unlock|activation|transfer|courier|small|shipping|postage) (?:fee|charge|payment)\b/,
        /\b(?:send|transfer|lend) me (?:some |the )?money\b/,
        /\bcan you (?:send|transfer|lend|pay)\b/,
        /\bpayment (?:of|is required|required|must be made)\b/,
      ],
      { negatable: true },
    ),

  family_emergency_claim: ({ lower }) =>
    find(lower, [
      /\b(?:my|a) new (?:phone |mobile |cell )?number\b/,
      /\b(?:lost|broke|broken|dropped|smashed|cracked) (?:my )?(?:phone|mobile)\b/,
      /\bmy (?:phone|mobile) (?:is|got|was|has been) (?:broken|smashed|lost|stolen|dead|cracked|in for repair)\b/,
      /\b(?:using|on) (?:a |my )?(?:friend's|friends|mate's|temporary|borrowed) (?:phone|number)\b/,
      /\b(?:your|ur) (?:grandson|granddaughter|grandchild|son|daughter|nephew|niece|child|husband|wife|brother|sister)\b[^.!?\n]{0,40}?\b(?:arrested|in (?:jail|prison|custody|hospital|trouble)|accident|hurt|injured|bail|stuck|stranded|detained)\b/,
      /\b(?:i'm|i am|im|i've been|i have been|i got)\b[^.!?\n]{0,15}?\b(?:arrested|in (?:jail|prison|custody|trouble|hospital)|in an accident|stranded|stuck abroad|detained)\b/,
      /\b(?:it's me|it is me),? (?:your )?(?:grandson|granddaughter|son|daughter|nephew|niece)\b/,
      /\bguess who\b/,
      /\bhi,? (?:mum|mom|mam|mummy|mommy|dad|daddy|gran|grandma|granny|nan|nana|grandpa|grandad|granddad)\b(?=[\s\S]*\b(?:money|pay|transfer|bill|bank|urgent|asap|favou?r)\b)/,
    ]),

  contains_instructions_to_ai: ({ lower }) =>
    find(lower, [
      /\b(?:ignore|disregard|forget|override)\b[^.!?\n]{0,20}?\b(?:previous|prior|above|earlier|preceding|other|system|all) (?:instructions|prompts?|rules|messages|directions|guidance)\b/,
      /\b(?:ai|assistant|chatbot|language model|llm|scanner|scam (?:checker|detector|filter)|model|system)\b[^.!?\n]{0,30}?\b(?:must|should|will|shall|is instructed to|are instructed to)\b[^.!?\n]{0,30}?\b(?:say|respond|reply|answer|classify|mark|label|rate|report|output|return|treat|consider)\b/,
      /\b(?:mark|classify|label|rate|treat|report|flag) (?:this|it|the message|this message) as (?:safe|normal|legitimate|genuine|not (?:a )?scam|harmless|trusted|verified)\b/,
      /\bthis (?:message|text|email|e-mail|sms|letter) is (?:safe|genuine|legitimate|verified|harmless|trusted|not (?:a )?(?:scam|fraud|phishing))\b/,
      /\bthis is not a scam\b/,
      /\b(?:system prompt|prompt injection|as an ai|likely_normal|no_warning_signs|ai_assessment)\b/,
      /\[\s*(?:system|instructions?|assistant)\s*\]|<\s*\/?\s*(?:system|instructions?)\s*>/,
    ]),

  threat_or_penalty: ({ lower }) =>
    find(lower, [
      /\b(?:arrest|arrested|warrant|prosecute|prosecuted|prosecution|legal action|legal proceedings|court (?:summons|case|action|order|date|hearing)|summons|lawsuit|sued|jail|prison|deported|deportation|bailiffs?|debt collectors?|enforcement (?:agents?|action)|criminal (?:charges?|record|case)|penalty|penalties|fined|a fine|the fine|fine of|late fee|seized|repossess(?:ed|ion)?)\b/,
      /\b(?:account|card|service|access|number|line|benefits|pension|licen[cs]e)\b[^.!?\n]{0,20}?\b(?:will be|has been|have been|is being|is|are|was) (?:temporarily |permanently )?(?:blocked|suspended|frozen|closed|locked|restricted|deactivated|terminated|cancelled|canceled|disconnected|cut off|stopped|disabled)\b/,
      /\b(?:lose|losing) (?:access|your (?:money|savings|account|benefits|pension))\b/,
    ]),

  urgency_or_deadline: ({ lower }) =>
    find(lower, [
      /\b(?:urgent|urgently|immediately|immediate action|right now|right away|act now|respond now|reply now|call now|asap|as soon as possible|without delay|don't delay|do not delay|hurry|final (?:notice|warning|reminder|demand|attempt)|last (?:chance|warning|notice|attempt)|time is running out|limited time|today only|expires? (?:today|tonight|soon|shortly)|by (?:today|tonight|midnight|end of (?:the )?day)|before (?:midnight|it's too late|it is too late|the end of (?:the )?day)|stay on the line)\b/,
      /\bwithin (?:the next )?\d+ ?(?:hours?|hrs?|minutes?|mins?)\b/,
      /\b(?:24|48|72)[ -]?(?:hours?|hrs?)\b/,
      /\bin the next (?:hour|few hours|\d+ minutes)\b/,
    ]),

  impersonates_authority: ({ lower }) =>
    find(lower, [
      /\b(?:police|policeman|police officer|detective|constable|sergeant|sheriff|federal agent|court|judge|magistrate|tax (?:office|authority|department|agency|inspector)|revenue (?:service|office|department|agency)|government|ministry|department of|town council|city council|county council|immigration|customs (?:office|officer|department|agency)|social security|pension (?:service|office)|benefits (?:office|department|agency)|national insurance|embassy|consulate)\b/,
    ]),

  impersonates_bank_or_company: ({ lower }) => {
    // Only a claim about a problem or an action counts. "Your statement is ready" does not.
    const problem =
      /\b(?:suspicious|unusual|fraud|fraudulent|security (?:alert|check|issue|problem|concern)|compromised|unauthori[sz]ed|blocked|suspended|frozen|locked|restricted|verify|confirm your|update your|problem|issue|attempted|new payee|payment (?:attempt|request|failed|declined)|held|on hold|failed|missed|unable to deliver|(?:could not|couldn't|cannot|can't) (?:be )?deliver(?:ed)?|not (?:be )?delivered|redeliver|re-deliver|reschedule|incomplete|customs|expired|overdue|cancel|cancelled)\b/;
    if (!problem.test(lower)) return null;
    return find(lower, [
      /\b(?:bank|banking|building society|credit union|card services|fraud (?:team|department|prevention)|security (?:team|department))\b/,
      /\b(?:customer (?:service|support|care)|tech(?:nical)? support|support team|help ?desk|internet provider|broadband|energy (?:supplier|company)|phone company|mobile provider|subscription|streaming service|online shop|courier|delivery (?:company|service|driver)|parcel|package|post office|postal service)\b/,
    ]);
  },

  unexpected_prize_or_refund: ({ lower }) =>
    find(lower, [
      /\b(?:you(?:'ve| have)? won|you are (?:a |the )?winner|winner|prize|lottery|lotto|sweepstakes?|jackpot|raffle|congratulations|congrats|selected to receive|claim your|claim now|unclaimed|reward|free gift|inheritance|compensation|rebate|refund|reimbursement|cash ?back|you are (?:owed|entitled|eligible)|money (?:is )?waiting)\b/,
    ]),
};

export type GuessedSender = "bank" | "government" | "police" | "delivery" | "family" | "company" | "unknown";

// A rough guess at who the message claims to be from, used when the AI is unavailable.
export function guessSenderType(input: string, flags: RuleFlag[]): GuessedSender {
  const lower = normalise(input).toLowerCase();
  if (flags.some((f) => f.id === "family_emergency_claim")) return "family";
  if (/\b(?:bank|banking|building society|credit union|card services)\b/.test(lower)) return "bank";
  if (/\b(?:police|officer|detective|constable|court|judge|magistrate)\b/.test(lower)) return "police";
  if (/\b(?:government|tax (?:office|authority|department)|revenue|ministry|council|immigration|social security|pension service|benefits)\b/.test(lower)) {
    return "government";
  }
  if (/\b(?:parcel|package|courier|delivery|post office|postal)\b/.test(lower)) return "delivery";
  if (flags.some((f) => f.id === "impersonates_bank_or_company")) return "company";
  return "unknown";
}

function normalise(text: string): string {
  return text.replace(/[‘’‛′]/g, "'").replace(/[“”″]/g, '"');
}

function flag(id: FlagId, evidence: string, reason = TAXONOMY[id].reason): RuleFlag {
  return { id, severity: TAXONOMY[id].severity, reason, evidence };
}

export function runRules(input: string): RulesResult {
  const text = normalise(input);
  const lower = text.toLowerCase();
  // toLowerCase can change length for a few rare characters; quotes then come from the lower copy.
  const quoteSource = lower.length === text.length ? text : lower;
  const ctx: Context = { text, lower, links: extractLinks(text), phoneNumbers: extractPhoneNumbers(text) };

  const flags: RuleFlag[] = [];
  for (const [id, rule] of Object.entries(RULES) as [FlagId, Rule][]) {
    const hit = rule(ctx);
    if (hit) flags.push(flag(id, quote(quoteSource, hit)));
  }

  if (ctx.links.length > 0) {
    const worst = ctx.links.find((l) => l.shortened) ?? ctx.links.find((l) => l.lookalike) ?? ctx.links[0];
    const reason = worst.shortened
      ? LINK_REASONS.shortened
      : worst.lookalike
        ? LINK_REASONS.lookalike
        : TAXONOMY.contains_link.reason;
    flags.push(flag("contains_link", worst.text, reason));
  }

  if (ctx.phoneNumbers.length > 0) {
    flags.push(flag("contains_callback_number", ctx.phoneNumbers[0]));
  }

  return { flags, links: ctx.links, phoneNumbers: ctx.phoneNumbers };
}
