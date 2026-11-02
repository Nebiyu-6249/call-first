import "server-only";

// Checks the family PIN. Five wrong tries lock the circle for 15 minutes.

import { verifyPin } from "./crypto";
import { PIN_LOCKOUT_MS, PIN_MAX_ATTEMPTS } from "./config";
import type { CircleRecord, Store } from "./store/types";

export type PinCheck =
  | { ok: true }
  | { ok: false; reason: "wrong"; attemptsLeft: number }
  | { ok: false; reason: "locked"; retryAfterMs: number };

export async function checkPin(store: Store, circle: CircleRecord, pin: string, now = Date.now()): Promise<PinCheck> {
  if (circle.pinLockedUntil && circle.pinLockedUntil > now) {
    return { ok: false, reason: "locked", retryAfterMs: circle.pinLockedUntil - now };
  }
  // A lock that has run out starts a fresh count.
  const previous = circle.pinLockedUntil ? 0 : circle.pinFailedAttempts;

  if (typeof pin === "string" && /^\d{6}$/.test(pin) && (await verifyPin(pin, circle.pinHash))) {
    if (previous > 0 || circle.pinLockedUntil) await store.setPinAttempts(circle.id, 0, null);
    return { ok: true };
  }

  const attempts = previous + 1;
  if (attempts >= PIN_MAX_ATTEMPTS) {
    await store.setPinAttempts(circle.id, 0, now + PIN_LOCKOUT_MS);
    return { ok: false, reason: "locked", retryAfterMs: PIN_LOCKOUT_MS };
  }
  await store.setPinAttempts(circle.id, attempts, null);
  return { ok: false, reason: "wrong", attemptsLeft: PIN_MAX_ATTEMPTS - attempts };
}

export function pinErrorMessage(result: Exclude<PinCheck, { ok: true }>): string {
  if (result.reason === "locked") {
    const minutes = Math.max(1, Math.ceil(result.retryAfterMs / 60000));
    return `Too many wrong PINs. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return `That PIN is not right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left.`;
}
