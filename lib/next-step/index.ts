// Picks the single most useful call for the parent, always from numbers the family saved.
// Never uses a number from the message.

import type { SenderType } from "@/lib/ai/schema";
import type { FamilyMember, ParentCircle } from "@/lib/circle/types";

export interface NextStep {
  // Who the call goes to, for example "Gulf Example Bank".
  name: string;
  // Button text, for example "Call Gulf Example Bank".
  label: string;
  // Saved number, used for the tel: link.
  phone: string;
  // Why this person, in plain words.
  reason: string;
}

function findClaimedFamilyMember(members: FamilyMember[], claimedPerson: string): FamilyMember | undefined {
  // Whole words only, so "grandson" does not match "son".
  const claimWords = new Set(claimedPerson.toLowerCase().split(/[^a-z']+/).filter(Boolean));
  if (claimWords.size === 0) return undefined;
  const mentions = (value: string) => {
    const words = value.toLowerCase().split(/[^a-z']+/).filter(Boolean);
    return words.length > 0 && words.every((w) => claimWords.has(w));
  };
  return members.find((m) => mentions(m.name)) ?? members.find((m) => mentions(m.relationship));
}

export function pickNextStep(
  circle: ParentCircle | null,
  senderType: SenderType,
  claimedPerson = "",
): NextStep | null {
  if (!circle) return null;
  const main = circle.familyMembers[0];

  if (senderType === "bank") {
    const bank = circle.contacts.find((c) => c.category === "bank");
    if (bank) {
      return {
        name: bank.label,
        label: `Call ${bank.label}`,
        phone: bank.phone,
        reason: `This is the number ${main?.name ?? "your family"} saved for your bank.`,
      };
    }
  }

  if (senderType === "family") {
    const member = findClaimedFamilyMember(circle.familyMembers, claimedPerson);
    if (member) {
      return {
        name: member.name,
        label: `Call ${member.name}`,
        phone: member.phone,
        reason: `Call ${member.name} on the number you already have, to check it is really them.`,
      };
    }
  }

  if (main) {
    return {
      name: main.name,
      label: `Call ${main.name}`,
      phone: main.phone,
      reason: `${main.name} can help you check.`,
    };
  }
  return null;
}

// Keeps only characters a phone can dial, for the tel: link.
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
