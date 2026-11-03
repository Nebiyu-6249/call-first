// The demo's family loop, kept entirely in the browser: Amina's phone sends an alert and Sara's
// phone sees it and replies, through shared state on one page. Nothing is sent to the server or
// stored, so the demo works without the database.

import {
  MAX_EXCERPT,
  MAX_SUMMARY,
  replyText,
  type AlertView,
  type NewAlert,
  type ReplyKind,
} from "@/lib/circle/alerts";
import type { FamilyChannel, ReplyPoll } from "@/lib/circle/channel";

export interface DemoFamilyLoop {
  subscribe(onChange: () => void): () => void;
  // Newest first. The same array until something changes, for useSyncExternalStore.
  getAlerts(): AlertView[];
  send(alert: NewAlert): string;
  // Returns an error message, or null when the reply was saved.
  reply(id: string, kind: ReplyKind, custom?: string): string | null;
  reset(): void;
  channel(familyName: string): FamilyChannel;
}

export function createDemoFamilyLoop(now: () => number = Date.now): DemoFamilyLoop {
  let alerts: AlertView[] = [];
  let counter = 0;
  const listeners = new Set<() => void>();

  function update(next: AlertView[]) {
    alerts = next;
    listeners.forEach((listener) => listener());
  }

  function send(alert: NewAlert): string {
    const id = `demo-${++counter}`;
    const view: AlertView = {
      id,
      verdict: alert.verdict,
      summary: alert.summary.slice(0, MAX_SUMMARY),
      excerpt: alert.excerpt.slice(0, MAX_EXCERPT),
      flagIds: [...alert.flagIds],
      createdAt: new Date(now()).toISOString(),
      reply: null,
    };
    update([view, ...alerts]);
    return id;
  }

  function reply(id: string, kind: ReplyKind, custom = ""): string | null {
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return "That message is no longer here.";
    if (alert.reply) return "You have already replied to this one.";
    const text = replyText(kind, custom);
    if (!text) return "Please write a reply first.";
    update(alerts.map((a) => (a.id === id ? { ...a, reply: { kind, text, repliedAt: new Date(now()).toISOString() } } : a)));
    return null;
  }

  function poll(id: string): ReplyPoll {
    const alert = alerts.find((a) => a.id === id);
    if (!alert) return { status: "gone" };
    return alert.reply ? { status: "replied", reply: alert.reply } : { status: "waiting" };
  }

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    getAlerts: () => alerts,
    send,
    reply,
    reset: () => update([]),
    channel: (familyName) => ({
      familyName,
      send: async (alert) => send(alert),
      poll: async (id) => poll(id),
    }),
  };
}
