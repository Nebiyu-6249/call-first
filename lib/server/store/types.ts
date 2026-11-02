// Data access for the family circle. Two implementations: Supabase (production) and in-memory
// (tests, and local development without a Supabase project).

import type { AlertView, NewAlert, ReplyKind } from "@/lib/circle/alerts";
import type { FamilyMember, VerifiedContact } from "@/lib/circle/types";
import type { CircleSettingsInput, TextSizeSetting } from "@/lib/circle/validate";

export interface CircleRecord {
  id: string;
  familyCode: string;
  parentName: string;
  textSize: TextSizeSetting;
  emergencyNumber: string;
  pinHash: string;
  pinFailedAttempts: number;
  pinLockedUntil: number | null;
  familyMembers: FamilyMember[];
  contacts: VerifiedContact[];
}

export interface DeviceRecord {
  id: string;
  circleId: string;
  createdAt: string;
  lastSeenAt: string;
}

export interface Store {
  createCircle(familyCode: string, pinHash: string, settings: CircleSettingsInput): Promise<string>;
  getCircle(id: string): Promise<CircleRecord | null>;
  getCircleIdByFamilyCode(familyCode: string): Promise<string | null>;
  replaceSettings(id: string, settings: CircleSettingsInput, newPinHash: string | null): Promise<void>;
  setPinAttempts(id: string, attempts: number, lockedUntil: number | null): Promise<void>;

  // Replaces any unused code for the circle. Throws if another circle has the same unused code.
  createPairingCode(circleId: string, codeHash: string, expiresAt: number): Promise<void>;
  // Marks the code used and returns its circle, or null if unknown, used or expired.
  consumePairingCode(codeHash: string): Promise<string | null>;

  createDevice(circleId: string, tokenHash: string): Promise<string>;
  // Returns the device if the token is known and not revoked, and records that it was seen.
  findDevice(tokenHash: string): Promise<DeviceRecord | null>;
  listDevices(circleId: string): Promise<DeviceRecord[]>;
  revokeDevice(circleId: string, deviceId: string): Promise<boolean>;

  createAlert(circleId: string, deviceId: string, alert: NewAlert, expiresAt: number): Promise<string>;
  listAlerts(circleId: string): Promise<AlertView[]>;
  getAlert(circleId: string, alertId: string): Promise<AlertView | null>;
  replyToAlert(circleId: string, alertId: string, kind: ReplyKind, text: string): Promise<boolean>;
  deleteExpired(): Promise<void>;

  // Adds one to the counter for this key and window and returns the new count.
  hitRateLimit(key: string, windowStart: number): Promise<number>;
}
