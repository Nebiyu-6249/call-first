// Alerts the parent sends to the family, and the family's replies. Shared by server and screens.

import type { VerdictLevel } from "@/lib/verdict";

export const REPLY_KINDS = ["calling", "fine", "wait", "custom"] as const;
export type ReplyKind = (typeof REPLY_KINDS)[number];

export const QUICK_REPLIES: Record<Exclude<ReplyKind, "custom">, string> = {
  calling: "Don't do anything. I'm calling you now.",
  fine: "That one is fine.",
  wait: "Wait for me, I'll check.",
};

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
  verdict: VerdictLevel;
  summary: string;
  excerpt: string;
  flagIds: string[];
  createdAt: string;
  reply: FamilyReply | null;
}

// What the parent's device sends. Only what the parent chose to share.
export interface NewAlert {
  verdict: VerdictLevel;
  summary: string;
  excerpt: string;
  flagIds: string[];
}

export function replyText(kind: ReplyKind, custom = ""): string {
  return kind === "custom" ? custom.trim().slice(0, MAX_CUSTOM_REPLY) : QUICK_REPLIES[kind];
}
