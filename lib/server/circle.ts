import "server-only";

// Shapes of circle data sent to each side. The parent's device never receives the PIN hash,
// the family code, or anything it could use to change settings.

import type { DeviceCircle } from "@/lib/circle/types";
import type { CircleRecord } from "./store/types";

export function toDeviceCircle(c: CircleRecord): DeviceCircle {
  return {
    parentName: c.parentName,
    emergencyNumber: c.emergencyNumber,
    textSize: c.textSize,
    familyMembers: c.familyMembers,
    contacts: c.contacts,
  };
}

export interface FamilyCircle extends DeviceCircle {
  familyCode: string;
}

export function toFamilyCircle(c: CircleRecord): FamilyCircle {
  return { ...toDeviceCircle(c), familyCode: c.familyCode };
}
