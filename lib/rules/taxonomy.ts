// The fixed list of red flags. The rules engine and the AI both choose from this list,
// so the verdict code can treat their findings the same way.

export type Severity = "high" | "medium";

export const FLAG_IDS = [
  "asks_for_code",
  "asks_for_card_or_bank_details",
  "secrecy_request",
  "remote_access_request",
  "asks_for_payment",
  "family_emergency_claim",
  "contains_instructions_to_ai",
  "threat_or_penalty",
  "urgency_or_deadline",
  "impersonates_authority",
  "impersonates_bank_or_company",
  "unexpected_prize_or_refund",
  "contains_link",
  "contains_callback_number",
] as const;

export type FlagId = (typeof FLAG_IDS)[number];

export interface FlagDefinition {
  severity: Severity;
  // Short name for the family alert view.
  label: string;
  // Plain-language reason for the parent. Simple words, reading age about 10.
  reason: string;
}

export const TAXONOMY: Record<FlagId, FlagDefinition> = {
  asks_for_code: {
    severity: "high",
    label: "Asks for a code or password",
    reason: "It asks you to share a code, PIN, or password. Banks and real companies never ask for these.",
  },
  asks_for_card_or_bank_details: {
    severity: "high",
    label: "Asks for card or bank details",
    reason: "It asks for your card or bank details. Never give these to someone who contacted you.",
  },
  secrecy_request: {
    severity: "high",
    label: "Asks to keep it secret",
    reason: "It tells you to keep this secret. Scammers do not want you to talk to your family or your bank.",
  },
  remote_access_request: {
    severity: "high",
    label: "Asks to control your device",
    reason: "It asks you to install an app or share your screen. This can let a stranger control your phone or computer.",
  },
  asks_for_payment: {
    severity: "high",
    label: "Asks for money",
    reason: "It asks you to pay or send money. Scammers often ask for gift cards, transfers, or a small fee.",
  },
  family_emergency_claim: {
    severity: "high",
    label: "Family emergency or new number",
    reason: "It says a family member has a new number or is in trouble. Call them on the number you already have.",
  },
  contains_instructions_to_ai: {
    severity: "high",
    label: "Tries to trick the checker",
    reason: "It tries to convince you, or a checking tool, that it is safe. Real messages do not need to do this.",
  },
  threat_or_penalty: {
    severity: "medium",
    label: "Threat or penalty",
    reason: "It threatens you with a fine, arrest, or a blocked account. This is meant to scare you.",
  },
  urgency_or_deadline: {
    severity: "medium",
    label: "Rushes you",
    reason: "It rushes you to act fast. Scammers do not want you to stop and think.",
  },
  impersonates_authority: {
    severity: "medium",
    label: "Claims to be police or government",
    reason: "It says it is from the police, a court, or a government office. Anyone can pretend to be them.",
  },
  impersonates_bank_or_company: {
    severity: "medium",
    label: "Claims to be a bank or company",
    reason: "It says it is from a bank or company about a problem. Anyone can pretend to be a bank or company.",
  },
  unexpected_prize_or_refund: {
    severity: "medium",
    label: "Prize or refund",
    reason: "It offers a prize, a refund, or money you did not expect.",
  },
  contains_link: {
    severity: "medium",
    label: "Contains a link",
    reason: "It has a link. Do not tap it.",
  },
  contains_callback_number: {
    severity: "medium",
    label: "Gives a number to call",
    reason: "It gives a phone number to call. Do not call it. Use a number you already trust.",
  },
};

// Stronger reasons for links that look worse than an ordinary link.
export const LINK_REASONS = {
  shortened: "It has a short link that hides where it really goes. Do not tap it.",
  lookalike: "It has a link that looks like it is pretending to be a real website. Do not tap it.",
} as const;

export function isFlagId(value: string): value is FlagId {
  return (FLAG_IDS as readonly string[]).includes(value);
}
