// The parent's phone talking to the server: pairing, refreshing the circle, and alerts.

import type { FamilyReply, NewAlert } from "@/lib/circle/alerts";
import type { FamilyChannel, ReplyPoll } from "@/lib/circle/channel";
import type { DeviceCircle } from "@/lib/circle/types";
import { forgetDevicePairing, readDeviceToken, saveDevicePairing, writeCachedCircle } from "./circle-cache";

function authHeaders(): Record<string, string> {
  const token = readDeviceToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function pairDevice(code: string): Promise<{ ok: true; circle: DeviceCircle } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error ?? "That code did not work." };
    saveDevicePairing(data.deviceToken, data.circle);
    return { ok: true, circle: data.circle };
  } catch {
    return { ok: false, error: "We could not connect. Please check the internet and try again." };
  }
}

// Updates the cached circle. If the family disconnected this phone, forgets the pairing.
export async function refreshCircle(): Promise<void> {
  if (!readDeviceToken()) return;
  try {
    const res = await fetch("/api/device/circle", { headers: authHeaders(), cache: "no-store" });
    if (res.status === 401) return forgetDevicePairing();
    if (!res.ok) return;
    const data = (await res.json()) as { circle: DeviceCircle };
    writeCachedCircle(data.circle);
  } catch {
    // Offline: keep using the cached copy.
  }
}

export function deviceChannel(familyName: string): FamilyChannel {
  return {
    familyName,
    async send(alert: NewAlert) {
      try {
        const res = await fetch("/api/device/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(alert),
        });
        if (!res.ok) return null;
        return ((await res.json()) as { id: string }).id;
      } catch {
        return null;
      }
    },
    async poll(alertId: string): Promise<ReplyPoll> {
      try {
        const res = await fetch(`/api/device/alerts/${encodeURIComponent(alertId)}`, { headers: authHeaders(), cache: "no-store" });
        if (res.status === 404 || res.status === 401) return { status: "gone" };
        if (!res.ok) return { status: "waiting" };
        const data = (await res.json()) as { reply: FamilyReply | null };
        return data.reply ? { status: "replied", reply: data.reply } : { status: "waiting" };
      } catch {
        return { status: "waiting" };
      }
    },
  };
}
