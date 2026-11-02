// Checks the family's circle settings. Used by the family forms and again on the server.

import { CONTACT_CATEGORIES, type ContactCategory, type TextSizeSetting } from "./types";

export const MAX_FAMILY_MEMBERS = 5;
export const MAX_CONTACTS = 10;

export type { TextSizeSetting };

export interface CircleSettingsInput {
  parentName: string;
  textSize: TextSizeSetting;
  emergencyNumber: string;
  familyMembers: { name: string; relationship: string; phone: string }[];
  contacts: { label: string; category: ContactCategory; phone: string; note: string }[];
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const PHONE = /^[0-9+()\-\s]{3,25}$/;
const WEAK_PINS = new Set(["000000", "111111", "123456", "654321", "121212", "112233", "123123"]);

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validPhone(phone: string): boolean {
  return PHONE.test(phone) && phone.replace(/\D/g, "").length >= 3;
}

export function validatePin(pin: unknown): string | null {
  if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) return "The PIN must be exactly 6 digits.";
  if (WEAK_PINS.has(pin) || /^(\d)\1{5}$/.test(pin)) return "Please choose a PIN that is harder to guess.";
  return null;
}

export function validateCircleSettings(input: unknown): ValidationResult<CircleSettingsInput> {
  const errors: string[] = [];
  const v = (input ?? {}) as Record<string, unknown>;

  const parentName = text(v.parentName, 60);
  if (!parentName) errors.push("Enter the name of the person you are protecting.");

  const textSize: TextSizeSetting = v.textSize === "xl" ? "xl" : "large";

  const emergencyNumber = text(v.emergencyNumber, 6) || "999";
  if (!/^\d{2,6}$/.test(emergencyNumber)) errors.push("The emergency number must be 2 to 6 digits.");

  const rawMembers = Array.isArray(v.familyMembers) ? v.familyMembers : [];
  const familyMembers = rawMembers.slice(0, MAX_FAMILY_MEMBERS).map((m) => {
    const r = (m ?? {}) as Record<string, unknown>;
    return { name: text(r.name, 60), relationship: text(r.relationship, 40), phone: text(r.phone, 25) };
  });
  if (familyMembers.length === 0) errors.push("Add at least one family member.");
  familyMembers.forEach((m, i) => {
    if (!m.name) errors.push(`Family member ${i + 1}: enter a name.`);
    if (!validPhone(m.phone)) errors.push(`Family member ${i + 1}: enter a phone number.`);
  });

  const rawContacts = Array.isArray(v.contacts) ? v.contacts : [];
  const contacts = rawContacts.slice(0, MAX_CONTACTS).map((c) => {
    const r = (c ?? {}) as Record<string, unknown>;
    const category = (CONTACT_CATEGORIES as readonly string[]).includes(r.category as string)
      ? (r.category as ContactCategory)
      : "other";
    return { label: text(r.label, 60), category, phone: text(r.phone, 25), note: text(r.note, 120) };
  });
  contacts.forEach((c, i) => {
    if (!c.label) errors.push(`Verified contact ${i + 1}: enter a name.`);
    if (!validPhone(c.phone)) errors.push(`Verified contact ${i + 1}: enter a phone number.`);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { parentName, textSize, emergencyNumber, familyMembers, contacts } };
}
