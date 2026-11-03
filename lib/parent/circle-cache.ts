// The parent's device keeps its pairing token and a copy of the circle (family names and
// verified numbers). The copy means the call buttons and Golden Rules still work offline.

import { useSyncExternalStore } from "react";
import type { DeviceCircle } from "@/lib/circle/types";

const CIRCLE_KEY = "callfirst.circle";
const TOKEN_KEY = "callfirst.deviceToken";
const CHANGE_EVENT = "callfirst:device-change";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the app still works without it.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Parsed once per stored string, so React sees the same object until it changes.
let lastRaw: string | null = null;
let lastCircle: DeviceCircle | null = null;

export function readCachedCircle(): DeviceCircle | null {
  const raw = read(CIRCLE_KEY);
  if (raw === lastRaw) return lastCircle;
  lastRaw = raw;
  try {
    const circle = raw ? (JSON.parse(raw) as DeviceCircle) : null;
    lastCircle = circle && Array.isArray(circle.familyMembers) && Array.isArray(circle.contacts) ? circle : null;
  } catch {
    lastCircle = null;
  }
  return lastCircle;
}

export function writeCachedCircle(circle: DeviceCircle): void {
  write(CIRCLE_KEY, JSON.stringify(circle));
}

export function readDeviceToken(): string | null {
  return read(TOKEN_KEY);
}

export function saveDevicePairing(token: string, circle: DeviceCircle): void {
  write(TOKEN_KEY, token);
  writeCachedCircle(circle);
}

export function forgetDevicePairing(): void {
  write(TOKEN_KEY, null);
  write(CIRCLE_KEY, null);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

// The cached circle, kept up to date. Null on the server and before pairing.
export function useCachedCircle(): DeviceCircle | null {
  return useSyncExternalStore(subscribe, readCachedCircle, () => null);
}
