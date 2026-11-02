import "server-only";

// Supabase store. Uses the service role key, so it only ever runs on the server.
// Multi-row changes go through the SQL functions in supabase/migrations so they are atomic.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AlertView, NewAlert, ReplyKind } from "@/lib/circle/alerts";
import type { ContactCategory } from "@/lib/circle/types";
import type { CircleSettingsInput, TextSizeSetting } from "@/lib/circle/validate";
import type { VerdictLevel } from "@/lib/verdict";
import type { CircleRecord, DeviceRecord, Store } from "./types";

interface AlertRow {
  id: string;
  verdict: VerdictLevel;
  summary: string;
  excerpt: string;
  flag_ids: string[];
  created_at: string;
  reply_kind: ReplyKind | null;
  reply_text: string | null;
  replied_at: string | null;
}

const ALERT_COLUMNS = "id, verdict, summary, excerpt, flag_ids, created_at, reply_kind, reply_text, replied_at";

function alertView(row: AlertRow): AlertView {
  return {
    id: row.id,
    verdict: row.verdict,
    summary: row.summary,
    excerpt: row.excerpt,
    flagIds: row.flag_ids ?? [],
    createdAt: row.created_at,
    reply:
      row.reply_kind && row.replied_at
        ? { kind: row.reply_kind, text: row.reply_text ?? "", repliedAt: row.replied_at }
        : null,
  };
}

function check<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(`Supabase: ${result.error.message}`);
  return result.data;
}

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

export class SupabaseStore implements Store {
  private db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async createCircle(familyCode: string, pinHash: string, s: CircleSettingsInput) {
    return check(
      await this.db.rpc("create_circle", {
        p_family_code: familyCode,
        p_parent_name: s.parentName,
        p_text_size: s.textSize,
        p_emergency_number: s.emergencyNumber,
        p_pin_hash: pinHash,
        p_members: s.familyMembers,
        p_contacts: s.contacts,
      }),
    ) as string;
  }

  async getCircle(id: string): Promise<CircleRecord | null> {
    const circle = check(
      await this.db
        .from("circles")
        .select("id, family_code, parent_name, text_size, emergency_number, pin_hash, pin_failed_attempts, pin_locked_until")
        .eq("id", id)
        .maybeSingle(),
    );
    if (!circle) return null;
    const members = check(
      await this.db.from("family_members").select("id, name, relationship, phone").eq("circle_id", id).order("position"),
    );
    const contacts = check(
      await this.db.from("contacts").select("id, label, category, phone, note").eq("circle_id", id).order("position"),
    );
    return {
      id: circle.id,
      familyCode: circle.family_code,
      parentName: circle.parent_name,
      textSize: circle.text_size as TextSizeSetting,
      emergencyNumber: circle.emergency_number,
      pinHash: circle.pin_hash,
      pinFailedAttempts: circle.pin_failed_attempts,
      pinLockedUntil: circle.pin_locked_until ? Date.parse(circle.pin_locked_until) : null,
      familyMembers: members ?? [],
      contacts: (contacts ?? []).map((c) => ({ ...c, category: c.category as ContactCategory })),
    };
  }

  async getCircleIdByFamilyCode(familyCode: string) {
    const row = check(await this.db.from("circles").select("id").eq("family_code", familyCode).maybeSingle());
    return row?.id ?? null;
  }

  async replaceSettings(id: string, s: CircleSettingsInput, newPinHash: string | null) {
    check(
      await this.db.rpc("replace_circle_settings", {
        p_circle_id: id,
        p_parent_name: s.parentName,
        p_text_size: s.textSize,
        p_emergency_number: s.emergencyNumber,
        p_pin_hash: newPinHash,
        p_members: s.familyMembers,
        p_contacts: s.contacts,
      }),
    );
  }

  async setPinAttempts(id: string, attempts: number, lockedUntil: number | null) {
    check(
      await this.db
        .from("circles")
        .update({ pin_failed_attempts: attempts, pin_locked_until: lockedUntil ? iso(lockedUntil) : null })
        .eq("id", id),
    );
  }

  async createPairingCode(circleId: string, codeHash: string, expiresAt: number) {
    check(await this.db.from("pairing_codes").update({ used_at: iso(Date.now()) }).eq("circle_id", circleId).is("used_at", null));
    check(await this.db.from("pairing_codes").insert({ circle_id: circleId, code_hash: codeHash, expires_at: iso(expiresAt) }));
  }

  async consumePairingCode(codeHash: string) {
    return (check(await this.db.rpc("consume_pairing_code", { p_code_hash: codeHash })) as string | null) ?? null;
  }

  async createDevice(circleId: string, tokenHash: string) {
    const row = check(await this.db.from("devices").insert({ circle_id: circleId, token_hash: tokenHash }).select("id").single());
    return (row as { id: string }).id;
  }

  async findDevice(tokenHash: string): Promise<DeviceRecord | null> {
    const row = check(
      await this.db
        .from("devices")
        .update({ last_seen_at: iso(Date.now()) })
        .eq("token_hash", tokenHash)
        .is("revoked_at", null)
        .select("id, circle_id, created_at, last_seen_at")
        .maybeSingle(),
    );
    return row ? { id: row.id, circleId: row.circle_id, createdAt: row.created_at, lastSeenAt: row.last_seen_at } : null;
  }

  async listDevices(circleId: string) {
    const rows = check(
      await this.db
        .from("devices")
        .select("id, circle_id, created_at, last_seen_at")
        .eq("circle_id", circleId)
        .is("revoked_at", null)
        .order("created_at"),
    );
    return (rows ?? []).map((r) => ({ id: r.id, circleId: r.circle_id, createdAt: r.created_at, lastSeenAt: r.last_seen_at }));
  }

  async revokeDevice(circleId: string, deviceId: string) {
    const rows = check(
      await this.db
        .from("devices")
        .update({ revoked_at: iso(Date.now()) })
        .eq("id", deviceId)
        .eq("circle_id", circleId)
        .is("revoked_at", null)
        .select("id"),
    );
    return (rows ?? []).length > 0;
  }

  async createAlert(circleId: string, deviceId: string, alert: NewAlert, expiresAt: number) {
    const row = check(
      await this.db
        .from("alerts")
        .insert({
          circle_id: circleId,
          device_id: deviceId,
          verdict: alert.verdict,
          summary: alert.summary,
          excerpt: alert.excerpt,
          flag_ids: alert.flagIds,
          expires_at: iso(expiresAt),
        })
        .select("id")
        .single(),
    );
    return (row as { id: string }).id;
  }

  async listAlerts(circleId: string) {
    await this.deleteExpired();
    const rows = check(
      await this.db
        .from("alerts")
        .select(ALERT_COLUMNS)
        .eq("circle_id", circleId)
        .gt("expires_at", iso(Date.now()))
        .order("created_at", { ascending: false })
        .limit(50),
    );
    return ((rows ?? []) as AlertRow[]).map(alertView);
  }

  async getAlert(circleId: string, alertId: string) {
    const row = check(
      await this.db
        .from("alerts")
        .select(ALERT_COLUMNS)
        .eq("id", alertId)
        .eq("circle_id", circleId)
        .gt("expires_at", iso(Date.now()))
        .maybeSingle(),
    );
    return row ? alertView(row as AlertRow) : null;
  }

  async replyToAlert(circleId: string, alertId: string, kind: ReplyKind, text: string) {
    const rows = check(
      await this.db
        .from("alerts")
        .update({ reply_kind: kind, reply_text: text, replied_at: iso(Date.now()) })
        .eq("id", alertId)
        .eq("circle_id", circleId)
        .gt("expires_at", iso(Date.now()))
        .select("id"),
    );
    return (rows ?? []).length > 0;
  }

  async deleteExpired() {
    check(await this.db.rpc("delete_expired"));
  }

  async hitRateLimit(key: string, windowStart: number) {
    return check(await this.db.rpc("hit_rate_limit", { p_key: key, p_window_start: iso(windowStart) })) as number;
  }
}
