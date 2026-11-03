// In-memory store with the same behaviour as the Supabase one. Data is lost on restart.

import { randomUUID } from "node:crypto";
import type { AlertView, NewAlert, ReplyKind } from "@/lib/circle/alerts";
import type { CircleSettingsInput } from "@/lib/circle/validate";
import type { CircleRecord, DeviceRecord, Store } from "./types";

interface StoredDevice extends DeviceRecord {
  tokenHash: string;
  revoked: boolean;
}

interface StoredAlert extends AlertView {
  circleId: string;
  expiresAt: number;
}

function withIds(settings: CircleSettingsInput) {
  return {
    familyMembers: settings.familyMembers.map((m) => ({ id: randomUUID(), ...m })),
    contacts: settings.contacts.map((c) => ({ id: randomUUID(), ...c })),
  };
}

function view(alert: StoredAlert): AlertView {
  return {
    id: alert.id,
    verdict: alert.verdict,
    summary: alert.summary,
    excerpt: alert.excerpt,
    flagIds: [...alert.flagIds],
    createdAt: alert.createdAt,
    reply: alert.reply ? { ...alert.reply } : null,
  };
}

export class MemoryStore implements Store {
  private circles = new Map<string, CircleRecord>();
  private pairing: { circleId: string; codeHash: string; expiresAt: number; used: boolean }[] = [];
  private devices = new Map<string, StoredDevice>();
  private alerts = new Map<string, StoredAlert>();
  private rateLimits = new Map<string, number>();

  constructor(private now: () => number = Date.now) {}

  async createCircle(familyCode: string, pinHash: string, settings: CircleSettingsInput) {
    if ([...this.circles.values()].some((c) => c.familyCode === familyCode)) throw new Error("duplicate family code");
    const id = randomUUID();
    this.circles.set(id, {
      id,
      familyCode,
      parentName: settings.parentName,
      textSize: settings.textSize,
      emergencyNumber: settings.emergencyNumber,
      privateMode: settings.privateMode,
      pinHash,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
      ...withIds(settings),
    });
    return id;
  }

  async getCircle(id: string) {
    const c = this.circles.get(id);
    return c ? structuredClone(c) : null;
  }

  async getCircleIdByFamilyCode(familyCode: string) {
    return [...this.circles.values()].find((c) => c.familyCode === familyCode)?.id ?? null;
  }

  async replaceSettings(id: string, settings: CircleSettingsInput, newPinHash: string | null) {
    const c = this.circles.get(id);
    if (!c) return;
    Object.assign(c, {
      parentName: settings.parentName,
      textSize: settings.textSize,
      emergencyNumber: settings.emergencyNumber,
      privateMode: settings.privateMode,
      pinHash: newPinHash ?? c.pinHash,
      ...withIds(settings),
    });
  }

  async setPinAttempts(id: string, attempts: number, lockedUntil: number | null) {
    const c = this.circles.get(id);
    if (c) Object.assign(c, { pinFailedAttempts: attempts, pinLockedUntil: lockedUntil });
  }

  async createPairingCode(circleId: string, codeHash: string, expiresAt: number) {
    for (const p of this.pairing) if (p.circleId === circleId) p.used = true;
    if (this.pairing.some((p) => p.codeHash === codeHash && !p.used)) throw new Error("pairing code in use");
    this.pairing.push({ circleId, codeHash, expiresAt, used: false });
  }

  async consumePairingCode(codeHash: string) {
    const code = this.pairing.find((p) => p.codeHash === codeHash && !p.used && p.expiresAt > this.now());
    if (!code) return null;
    code.used = true;
    return code.circleId;
  }

  async createDevice(circleId: string, tokenHash: string) {
    const id = randomUUID();
    const at = new Date(this.now()).toISOString();
    this.devices.set(id, { id, circleId, tokenHash, createdAt: at, lastSeenAt: at, revoked: false });
    return id;
  }

  async findDevice(tokenHash: string) {
    const d = [...this.devices.values()].find((x) => x.tokenHash === tokenHash && !x.revoked);
    if (!d) return null;
    d.lastSeenAt = new Date(this.now()).toISOString();
    return { id: d.id, circleId: d.circleId, createdAt: d.createdAt, lastSeenAt: d.lastSeenAt };
  }

  async listDevices(circleId: string) {
    return [...this.devices.values()]
      .filter((d) => d.circleId === circleId && !d.revoked)
      .map(({ id, circleId: c, createdAt, lastSeenAt }) => ({ id, circleId: c, createdAt, lastSeenAt }));
  }

  async revokeDevice(circleId: string, deviceId: string) {
    const d = this.devices.get(deviceId);
    if (!d || d.circleId !== circleId || d.revoked) return false;
    d.revoked = true;
    return true;
  }

  async createAlert(circleId: string, _deviceId: string, alert: NewAlert, expiresAt: number) {
    const id = randomUUID();
    this.alerts.set(id, {
      id,
      circleId,
      ...alert,
      createdAt: new Date(this.now()).toISOString(),
      expiresAt,
      reply: null,
    });
    return id;
  }

  async listAlerts(circleId: string) {
    await this.deleteExpired();
    return [...this.alerts.values()]
      .filter((a) => a.circleId === circleId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(view);
  }

  async getAlert(circleId: string, alertId: string) {
    const a = this.alerts.get(alertId);
    return a && a.circleId === circleId && a.expiresAt > this.now() ? view(a) : null;
  }

  async replyToAlert(circleId: string, alertId: string, kind: ReplyKind, text: string) {
    const a = this.alerts.get(alertId);
    if (!a || a.circleId !== circleId || a.expiresAt <= this.now()) return false;
    a.reply = { kind, text, repliedAt: new Date(this.now()).toISOString() };
    return true;
  }

  async deleteCircle(id: string) {
    this.circles.delete(id);
    this.pairing = this.pairing.filter((p) => p.circleId !== id);
    for (const [key, d] of this.devices) if (d.circleId === id) this.devices.delete(key);
    for (const [key, a] of this.alerts) if (a.circleId === id) this.alerts.delete(key);
  }

  async deleteExpired() {
    for (const [id, a] of this.alerts) if (a.expiresAt <= this.now()) this.alerts.delete(id);
    this.pairing = this.pairing.filter((p) => p.expiresAt > this.now() - 24 * 60 * 60 * 1000);
  }

  async hitRateLimit(key: string, windowStart: number) {
    const k = `${key}@${windowStart}`;
    const count = (this.rateLimits.get(k) ?? 0) + 1;
    this.rateLimits.set(k, count);
    return count;
  }
}
