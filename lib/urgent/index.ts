// The two urgent moments: "Someone is on the phone with me now" and "Something already happened".
// The advice is paraphrased from official guidance, listed on the privacy page under "Where the
// advice comes from":
//   FTC, What To Do if You Were Scammed (consumer.ftc.gov/articles/what-do-if-you-were-scammed)
//   FTC, Phone Scams (consumer.ftc.gov/articles/phone-scams)
//   FTC, Tech Support Scams (consumer.ftc.gov/articles/how-spot-avoid-and-report-tech-support-scams)
//   UK police Report Fraud, Courier fraud (reportfraud.police.uk/courier-fraud/)
// Every call button uses a number the family saved. Nothing here promises money can be recovered.

import type { NewAlert, UrgentKind } from "@/lib/circle/alerts";
import { buildAlert, type AlertSource } from "@/lib/circle/channel";
import type { ParentCircle } from "@/lib/circle/types";
import type { CheckResult } from "@/lib/check";
import { DEFAULT_FAMILY_NAME } from "@/lib/verdict/copy";

export type HappenedKind = Exclude<UrgentKind, "phone_call">;

// The four choices on "What happened?", in order.
export const HAPPENED_CHOICES: { kind: HappenedKind; label: string }[] = [
  { kind: "sent_money", label: "I sent money" },
  { kind: "shared_code", label: "I shared a code or password" },
  { kind: "gave_card", label: "I gave card or bank details" },
  { kind: "remote_access", label: "I let someone into my phone or computer" },
];

export const HAPPENED_BUTTON = "I already sent money, clicked, or shared something";

export const CALM_LINE = "This happens to many people. Acting now helps.";

// Report Fraud (UK police): a caller can keep a landline open, so the next call reaches them again.
export const CLEAR_LINE = "Before you call anyone, wait five minutes or use a different phone. The caller may still be on the line.";

export interface SavedCall {
  name: string;
  label: string;
  // Always a number from the circle the family saved.
  phone: string;
}

function familyNameOf(circle: ParentCircle | null): string {
  return circle?.familyMembers[0]?.name ?? DEFAULT_FAMILY_NAME;
}

function bankOf(circle: ParentCircle | null): SavedCall | null {
  const bank = circle?.contacts.find((c) => c.category === "bank");
  return bank ? { name: bank.label, label: `Call ${bank.label}`, phone: bank.phone } : null;
}

function mainFamilyOf(circle: ParentCircle | null): SavedCall | null {
  const main = circle?.familyMembers[0];
  return main ? { name: main.name, label: `Call ${main.name}`, phone: main.phone } : null;
}

// After hanging up: the saved bank, then the main family member.
export function afterCallButtons(circle: ParentCircle | null): SavedCall[] {
  return [bankOf(circle), mainFamilyOf(circle)].filter((c): c is SavedCall => c !== null);
}

export interface UrgentPlan {
  // The first step: the saved bank, or the main family member if no bank is saved.
  firstCall: SavedCall | null;
  // What to say on that call, in plain words.
  firstCallWhy: string;
  // Two or three plain next steps.
  steps: string[];
}

const BANK_WHY: Record<HappenedKind, string> = {
  // FTC: report it to the bank straight away and ask them to reverse the payment. The money may
  // already be gone, but it is always worth asking.
  sent_money: "Tell them a scammer tricked you into paying. Ask them to stop the payment and give the money back. It is always worth asking.",
  shared_code: "Tell them you shared a code or password, so they can protect your account.",
  // Report Fraud: call your bank straight away to cancel the card.
  gave_card: "Ask them to stop your card straight away.",
  // FTC: check for payments you did not make and ask the bank to reverse them.
  remote_access: "Tell them someone got into your phone or computer. Ask them to look out for payments you did not make.",
};

// Where the bank's number comes from, if not the saved contact.
function cardNumberStep(hasBank: boolean, hasFirstCall: boolean): string[] {
  // FTC: use the number on the back of your card. Without a circle, the first step already says so.
  if (hasBank) return ["If that number does not work, use the number on the back of your card."];
  return hasFirstCall ? ["Your bank's number is on the back of your card."] : [];
}

function steps(kind: HappenedKind, family: string, hasBank: boolean, hasFirstCall: boolean): string[] {
  switch (kind) {
    case "sent_money":
      return [
        // FTC: report it to the payment app, wire transfer or gift card company too. Keep the card and receipt.
        "If you paid with a money transfer company, a payment app or a gift card, call that company too. Keep any gift card and the receipt.",
        // FTC: someone who offers to help recover lost money is probably running a refund scam.
        "If someone calls offering to get your money back, do not pay them or tell them anything. That is another scam.",
        // FTC and Report Fraud: report it.
        `Later, ${family} can help you report it to the police or the official fraud reporting service.`,
      ];
    case "shared_code":
      return [
        // FTC: create a new, strong password, and change it anywhere else you use it.
        `Change that password, with help from ${family}. If you use the same password anywhere else, change it there too.`,
        // FTC: turn on two-factor authentication.
        `Ask ${family} to help you turn on the extra check that sends a code to your phone when you sign in.`,
        // FTC: if you cannot log in any more, follow the account's recovery steps.
        `If you cannot sign in any more, tell ${family}. They can help you get back in.`,
      ];
    case "gave_card":
      return [
        ...cardNumberStep(hasBank, hasFirstCall),
        // Report Fraud: your bank or the police will never come to your home to collect money or your card.
        "Never hand your card or money to anyone who comes to your door. Your bank and the police will never collect them.",
        // FTC: check your statement for payments you did not make, and report them.
        `Look at your bank statement with ${family} for payments you did not make, and tell the bank about them.`,
      ];
    case "remote_access":
      return [
        // FTC: update security software, scan, remove problems; get help from someone you trust.
        `Ask ${family}, or someone else you trust, to check your phone or computer and remove anything harmful.`,
        // FTC: change your passwords and turn on two-factor authentication.
        `Change your passwords, with help from ${family}.`,
        // FTC: real tech companies will not contact you about a problem with your computer.
        "Real computer companies do not call you about problems. If they call again, hang up.",
      ];
  }
}

export function urgentPlan(kind: HappenedKind, circle: ParentCircle | null): UrgentPlan {
  const family = familyNameOf(circle);
  const bank = bankOf(circle);
  const firstCall = bank ?? mainFamilyOf(circle);
  const firstCallWhy = bank
    ? BANK_WHY[kind]
    : firstCall
      ? `${firstCall.name} can help you call your bank.`
      : "Call your bank on the number on the back of your card.";
  return { firstCall, firstCallWhy, steps: steps(kind, family, bank !== null, firstCall !== null) };
}

// The one line the family sees at the top of the URGENT alert.
export function urgentSummary(kind: UrgentKind, parentName: string): string {
  if (kind === "phone_call") return `${parentName} had a worrying phone call and hung up.`;
  const choice = HAPPENED_CHOICES.find((c) => c.kind === kind)?.label ?? "";
  return `${parentName} says: "${choice}." Please call now.`;
}

// The URGENT alert. When it came from a check, it carries that check's verdict and masked excerpt.
export function urgentAlert(
  kind: UrgentKind,
  parentName: string,
  checked: { result: CheckResult; source: AlertSource } | null = null,
): NewAlert {
  const summary = urgentSummary(kind, parentName);
  if (checked) return { ...buildAlert(checked.result, checked.source), urgent: kind, summary };
  return { verdict: null, urgent: kind, summary, excerpt: "", flagIds: [] };
}
