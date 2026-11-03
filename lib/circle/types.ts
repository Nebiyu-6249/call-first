// What the parent's device knows about its circle. Set up by the family; read-only on the parent device.

export const CONTACT_CATEGORIES = ["bank", "family", "doctor", "police", "other"] as const;
export type ContactCategory = (typeof CONTACT_CATEGORIES)[number];

export interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
}

export interface VerifiedContact {
  id: string;
  label: string;
  category: ContactCategory;
  phone: string;
  note?: string;
}

export type TextSizeSetting = "large" | "xl";

export interface ParentCircle {
  parentName: string;
  emergencyNumber: string;
  // The first family member is the main contact.
  familyMembers: FamilyMember[];
  contacts: VerifiedContact[];
}

// What a paired parent device receives: the circle plus the text size the family chose.
export interface DeviceCircle extends ParentCircle {
  textSize: TextSizeSetting;
  // Rules-only checks: nothing leaves the phone. Missing on circles cached before it existed.
  privateMode?: boolean;
}
