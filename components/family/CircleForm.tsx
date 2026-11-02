"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { CONTACT_CATEGORIES, type ContactCategory } from "@/lib/circle/types";
import {
  MAX_CONTACTS,
  MAX_FAMILY_MEMBERS,
  validateCircleSettings,
  validatePin,
  type CircleSettingsInput,
} from "@/lib/circle/validate";
import { fButton, fButtonSecondary, fCard, fInput, fLabel } from "./ui";

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  bank: "Bank",
  family: "Family",
  doctor: "Doctor",
  police: "Police (non-emergency)",
  other: "Other",
};

export type CircleFormMode = "create" | "edit";

export interface CircleFormSubmit extends CircleSettingsInput {
  pin: string;
  newPin?: string;
}

const EMPTY: CircleSettingsInput = {
  parentName: "",
  textSize: "large",
  emergencyNumber: "999",
  familyMembers: [{ name: "", relationship: "", phone: "" }],
  contacts: [{ label: "", category: "bank", phone: "", note: "" }],
};

export function CircleForm({
  mode,
  initial = EMPTY,
  submitLabel,
  onSubmit,
}: {
  mode: CircleFormMode;
  initial?: CircleSettingsInput;
  submitLabel: string;
  // Returns an error message to show, or null on success.
  onSubmit: (values: CircleFormSubmit) => Promise<string | null>;
}) {
  const [values, setValues] = useState<CircleSettingsInput>(initial);
  const [pin, setPin] = useState("");
  const [pinAgain, setPinAgain] = useState("");
  const [newPin, setNewPin] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof CircleSettingsInput>(key: K, value: CircleSettingsInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setMember(i: number, field: "name" | "relationship" | "phone", value: string) {
    set("familyMembers", values.familyMembers.map((m, j) => (j === i ? { ...m, [field]: value } : m)));
  }

  function setContact(i: number, field: "label" | "category" | "phone" | "note", value: string) {
    set("contacts", values.contacts.map((c, j) => (j === i ? { ...c, [field]: value } : c)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: string[] = [];
    const checked = validateCircleSettings(values);
    if (!checked.ok) found.push(...checked.errors);
    if (mode === "create") {
      const pinError = validatePin(pin);
      if (pinError) found.push(pinError);
      else if (pin !== pinAgain) found.push("The two PINs do not match.");
    } else {
      if (!/^\d{6}$/.test(pin)) found.push("Enter your current 6-digit PIN to save changes.");
      if (newPin) {
        const pinError = validatePin(newPin);
        if (pinError) found.push(`New PIN: ${pinError}`);
      }
    }
    setErrors(found);
    if (found.length > 0 || !checked.ok) return;

    setBusy(true);
    const error = await onSubmit({ ...checked.value, pin, newPin: newPin || undefined });
    setBusy(false);
    if (error) setErrors([error]);
    else if (mode === "edit") {
      setPin("");
      setNewPin("");
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset className={`${fCard} flex flex-col gap-4`}>
        <legend className="px-1 text-xl font-bold">The person you are protecting</legend>
        <label className={fLabel}>
          Their first name
          <input className={fInput} value={values.parentName} onChange={(e) => set("parentName", e.target.value)} maxLength={60} autoComplete="off" />
        </label>
        <div className="flex flex-col gap-2">
          <span className="text-lg font-bold" id="text-size-label">Text size on their phone</span>
          <div role="radiogroup" aria-labelledby="text-size-label" className="flex flex-wrap gap-4 text-lg">
            {(["large", "xl"] as const).map((size) => (
              <label key={size} className="flex min-h-12 items-center gap-2">
                <input type="radio" name="textSize" className="size-5" checked={values.textSize === size} onChange={() => set("textSize", size)} />
                {size === "large" ? "Large" : "Extra large"}
              </label>
            ))}
          </div>
        </div>
        <label className={fLabel}>
          Emergency number where they live
          <input
            className={`${fInput} max-w-40`}
            value={values.emergencyNumber}
            onChange={(e) => set("emergencyNumber", e.target.value)}
            inputMode="numeric"
            maxLength={6}
          />
        </label>
      </fieldset>

      <fieldset className={`${fCard} flex flex-col gap-4`}>
        <legend className="px-1 text-xl font-bold">Family members</legend>
        <p className="text-base text-muted">The first person is the main contact. Their name appears on the parent&apos;s buttons.</p>
        {values.familyMembers.map((m, i) => (
          <div key={i} className="grid gap-3 border-t-2 border-border pt-4 sm:grid-cols-3">
            <label className={fLabel}>
              Name
              <input className={fInput} value={m.name} onChange={(e) => setMember(i, "name", e.target.value)} maxLength={60} />
            </label>
            <label className={fLabel}>
              Relationship
              <input className={fInput} value={m.relationship} placeholder="daughter" onChange={(e) => setMember(i, "relationship", e.target.value)} maxLength={40} />
            </label>
            <label className={fLabel}>
              Phone
              <input className={fInput} value={m.phone} onChange={(e) => setMember(i, "phone", e.target.value)} inputMode="tel" maxLength={25} />
            </label>
            {values.familyMembers.length > 1 && (
              <button
                type="button"
                className={`${fButtonSecondary} sm:col-span-3 sm:justify-self-start`}
                onClick={() => set("familyMembers", values.familyMembers.filter((_, j) => j !== i))}
              >
                <Trash2 aria-hidden="true" className="size-5" />
                Remove {m.name || `family member ${i + 1}`}
              </button>
            )}
          </div>
        ))}
        {values.familyMembers.length < MAX_FAMILY_MEMBERS && (
          <button
            type="button"
            className={`${fButtonSecondary} self-start`}
            onClick={() => set("familyMembers", [...values.familyMembers, { name: "", relationship: "", phone: "" }])}
          >
            <Plus aria-hidden="true" className="size-5" />
            Add a family member
          </button>
        )}
      </fieldset>

      <fieldset className={`${fCard} flex flex-col gap-4`}>
        <legend className="px-1 text-xl font-bold">Verified contacts</legend>
        <p className="text-base text-muted">
          Real numbers you have checked yourself, for example from the back of their bank card. The app sends them to these
          numbers, never to a number from a message.
        </p>
        {values.contacts.map((c, i) => (
          <div key={i} className="grid gap-3 border-t-2 border-border pt-4 sm:grid-cols-2">
            <label className={fLabel}>
              Name
              <input className={fInput} value={c.label} placeholder="Gulf Example Bank" onChange={(e) => setContact(i, "label", e.target.value)} maxLength={60} />
            </label>
            <label className={fLabel}>
              Type
              <select className={fInput} value={c.category} onChange={(e) => setContact(i, "category", e.target.value)}>
                {CONTACT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
            <label className={fLabel}>
              Phone
              <input className={fInput} value={c.phone} onChange={(e) => setContact(i, "phone", e.target.value)} inputMode="tel" maxLength={25} />
            </label>
            <label className={fLabel}>
              Note (optional)
              <input className={fInput} value={c.note} onChange={(e) => setContact(i, "note", e.target.value)} maxLength={120} />
            </label>
            <button
              type="button"
              className={`${fButtonSecondary} sm:col-span-2 sm:justify-self-start`}
              onClick={() => set("contacts", values.contacts.filter((_, j) => j !== i))}
            >
              <Trash2 aria-hidden="true" className="size-5" />
              Remove {c.label || `contact ${i + 1}`}
            </button>
          </div>
        ))}
        {values.contacts.length < MAX_CONTACTS && (
          <button
            type="button"
            className={`${fButtonSecondary} self-start`}
            onClick={() => set("contacts", [...values.contacts, { label: "", category: "other", phone: "", note: "" }])}
          >
            <Plus aria-hidden="true" className="size-5" />
            Add a verified contact
          </button>
        )}
      </fieldset>

      <fieldset className={`${fCard} flex flex-col gap-4`}>
        <legend className="px-1 text-xl font-bold">PIN</legend>
        {mode === "create" ? (
          <>
            <p className="text-base text-muted">
              6 digits. You need it to sign in and every time you change contacts or settings. Keep it away from the
              parent&apos;s phone, so nobody holding that phone can change the verified numbers.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={fLabel}>
                Choose a PIN
                <input className={fInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
              </label>
              <label className={fLabel}>
                Type it again
                <input className={fInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={pinAgain} onChange={(e) => setPinAgain(e.target.value.replace(/\D/g, ""))} />
              </label>
            </div>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fLabel}>
              Your PIN (needed to save)
              <input className={fInput} type="password" inputMode="numeric" autoComplete="current-password" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className={fLabel}>
              New PIN (optional)
              <input className={fInput} type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} />
            </label>
          </div>
        )}
      </fieldset>

      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border-2 border-warning bg-warning-bg p-4 text-lg text-warning">
          <ul className="list-disc pl-6">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <button type="submit" className={`${fButton} self-start`} disabled={busy}>
        {busy ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
