// Family screens talking to the server. The session is an httpOnly cookie, so nothing is stored here.

import type { AlertView, ReplyKind } from "@/lib/circle/alerts";
import type { DeviceCircle } from "@/lib/circle/types";

export interface FamilyCircle extends DeviceCircle {
  familyCode: string;
}

export interface DeviceInfo {
  id: string;
  createdAt: string;
  lastSeenAt: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export async function api<T>(url: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init.body ? { "Content-Type": "application/json", ...init.headers } : init.headers,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data.error ?? "Something went wrong." };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "We could not connect. Please check the internet and try again." };
  }
}

export const familyApi = {
  create: (body: unknown) => api<{ familyCode: string }>("/api/family/circle", { method: "POST", body: JSON.stringify(body) }),
  signIn: (familyCode: string, pin: string) =>
    api<{ ok: true }>("/api/family/session", { method: "POST", body: JSON.stringify({ familyCode, pin }) }),
  signOut: () => api<{ ok: true }>("/api/family/session", { method: "DELETE" }),
  circle: () => api<{ circle: FamilyCircle; devices: DeviceInfo[] }>("/api/family/circle"),
  update: (body: unknown) => api<{ circle: FamilyCircle }>("/api/family/circle", { method: "PUT", body: JSON.stringify(body) }),
  pairingCode: () => api<{ code: string; expiresAt: string }>("/api/family/pairing", { method: "POST" }),
  alerts: () => api<{ alerts: AlertView[] }>("/api/family/alerts"),
  reply: (alertId: string, kind: ReplyKind, text = "") =>
    api<{ ok: true }>(`/api/family/alerts/${encodeURIComponent(alertId)}/reply`, {
      method: "POST",
      body: JSON.stringify({ kind, text }),
    }),
  removeDevice: (deviceId: string, pin: string) =>
    api<{ ok: true }>(`/api/family/devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      body: JSON.stringify({ pin }),
    }),
};

// "K7M2QX9P" -> "K7M2-QX9P", easier to read out.
export function formatFamilyCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
