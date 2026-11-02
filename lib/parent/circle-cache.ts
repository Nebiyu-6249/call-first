// The parent's circle (family names and verified numbers) is cached on the device, so the call
// buttons and Golden Rules still work when the network or the server is down.

import type { ParentCircle } from "@/lib/circle/types";

const CIRCLE_KEY = "secondlook.circle";

export function readCachedCircle(): ParentCircle | null {
  try {
    const raw = localStorage.getItem(CIRCLE_KEY);
    if (!raw) return null;
    const circle = JSON.parse(raw) as ParentCircle;
    return Array.isArray(circle.familyMembers) && Array.isArray(circle.contacts) ? circle : null;
  } catch {
    return null;
  }
}

export function writeCachedCircle(circle: ParentCircle): void {
  try {
    localStorage.setItem(CIRCLE_KEY, JSON.stringify(circle));
  } catch {
    // Storage can be unavailable (private mode); the app still works without the cache.
  }
}
