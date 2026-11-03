// Alerts the parent sends to the family, and the family's replies. Shared by server and screens.

import type { VerdictLevel } from "@/lib/verdict";

export const REPLY_KINDS = ["calling", "fine", "wait", "custom", "calling_now"] as const;
export type ReplyKind = (typeof REPLY_KINDS)[number];

export const QUICK_REPLIES: Record<Exclude<ReplyKind, "custom">, string> = {
  calling: "Don't do anything. I'm calling you now.",
  fine: "That one is fine.",
  wait: "Wait for me, I'll check.",
  // For URGENT alerts, where the parent may need to call the bank, so not "don't do anything".
  calling_now: "I'm calling you now.",
};

// URGENT alerts: the parent hung up on a worrying call, or tapped "Something already happened".
export const URGENT_KINDS = ["phone_call", "sent_money", "shared_code", "gave_card", "remote_access"] as const;
export type UrgentKind = (typeof URGENT_KINDS)[number];

export function isUrgentKind(value: unknown): value is UrgentKind {
  return typeof value === "string" && (URGENT_KINDS as readonly string[]).includes(value);
}

export const MAX_SUMMARY = 200;
export const MAX_EXCERPT = 500;
export const MAX_CUSTOM_REPLY = 200;

export interface FamilyReply {
  kind: ReplyKind;
  text: string;
  repliedAt: string;
}

// What the family sees in the inbox.
export interface AlertView {
  id: string;
  // Null for an URGENT alert that did not come from a check, such as a phone call.
  verdict: VerdictLevel | null;
  urgent: UrgentKind | null;
  summary: string;
  excerpt: string;
  flagIds: string[];
  createdAt: string;
  reply: FamilyReply | null;
}

// What the parent's device sends. Only what the parent chose to share.
export interface NewAlert {
  verdict: VerdictLevel | null;
  urgent: UrgentKind | null;
  summary: string;
  excerpt: string;
  flagIds: string[];
}

// The family inbox shows URGENT alerts that are still waiting for a reply at the top, then
// everything else, newest first.
export function inboxOrder(alerts: AlertView[]): AlertView[] {
  const waitingUrgent = (a: AlertView) => (a.urgent && !a.reply ? 0 : 1);
  return [...alerts].sort((a, b) => waitingUrgent(a) - waitingUrgent(b) || b.createdAt.localeCompare(a.createdAt));
}

export function replyText(kind: ReplyKind, custom = ""): string {
  return kind === "custom" ? custom.trim().slice(0, MAX_CUSTOM_REPLY) : QUICK_REPLIES[kind];
}
