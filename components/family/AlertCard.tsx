"use client";

import { useState, type FormEvent } from "react";
import { CheckCheck, Clock, PhoneCall, Send, ThumbsUp } from "lucide-react";
import { VerdictBadge } from "@/components/VerdictBadge";
import { MAX_CUSTOM_REPLY, QUICK_REPLIES, type AlertView, type ReplyKind } from "@/lib/circle/alerts";
import { TAXONOMY, isFlagId } from "@/lib/rules/taxonomy";
import { fButton, fButtonSecondary, fCard, fInput } from "./ui";

const QUICK: { kind: Exclude<ReplyKind, "custom">; Icon: typeof PhoneCall }[] = [
  { kind: "calling", Icon: PhoneCall },
  { kind: "wait", Icon: Clock },
  { kind: "fine", Icon: ThumbsUp },
];

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

// One alert from the parent, with one-tap replies. Used by the family inbox and the demo.
export function AlertCard({
  alert,
  parentName,
  onReply,
}: {
  alert: AlertView;
  parentName: string;
  // Returns an error message, or null when the reply was sent.
  onReply: (kind: ReplyKind, text: string) => Promise<string | null>;
}) {
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reply(kind: ReplyKind, text = "") {
    setBusy(true);
    setError("");
    const problem = await onReply(kind, text);
    setBusy(false);
    if (problem) setError(problem);
    else setCustom("");
  }

  function sendCustom(event: FormEvent) {
    event.preventDefault();
    if (custom.trim()) void reply("custom", custom);
  }

  const labels = alert.flagIds.filter(isFlagId).map((id) => TAXONOMY[id].label);

  return (
    <article className={`${fCard} @container flex flex-col gap-4 break-words`} aria-label={`Alert from ${parentName}, ${when(alert.createdAt)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <VerdictBadge level={alert.verdict} />
        <time dateTime={alert.createdAt} className="text-base text-muted">
          {when(alert.createdAt)}
        </time>
      </div>
      <p className="text-xl font-bold">{alert.summary}</p>
      {alert.excerpt && (
        <blockquote className="whitespace-pre-line break-words rounded-lg border-l-4 border-border bg-background p-3 text-base">
          {alert.excerpt}
        </blockquote>
      )}
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-base" aria-label="Warning signs found">
          {labels.slice(0, 5).map((l) => (
            <li key={l} className="rounded-md border border-border px-2 py-1">
              {l}
            </li>
          ))}
        </ul>
      )}

      {alert.reply ? (
        <p className="flex items-center gap-2 font-bold text-ok">
          <CheckCheck aria-hidden="true" className="size-6 shrink-0" />
          You replied: &ldquo;{alert.reply.text}&rdquo;
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-bold">Reply to {parentName}:</p>
          <div className="flex flex-col gap-2 @lg:flex-row @lg:flex-wrap">
            {QUICK.map(({ kind, Icon }) => (
              <button key={kind} type="button" disabled={busy} onClick={() => reply(kind)} className={kind === "calling" ? fButton : fButtonSecondary}>
                <Icon aria-hidden="true" className="size-5" />
                {QUICK_REPLIES[kind]}
              </button>
            ))}
          </div>
          <form onSubmit={sendCustom} className="flex flex-col gap-2 @lg:flex-row">
            <label className="sr-only" htmlFor={`custom-${alert.id}`}>
              Write your own short reply
            </label>
            <input
              id={`custom-${alert.id}`}
              className={fInput}
              placeholder="Or write a short reply"
              value={custom}
              maxLength={MAX_CUSTOM_REPLY}
              onChange={(e) => setCustom(e.target.value)}
            />
            <button type="submit" disabled={busy || !custom.trim()} className={fButtonSecondary}>
              <Send aria-hidden="true" className="size-5" />
              Send
            </button>
          </form>
          {error && (
            <p role="alert" className="font-bold text-warning">
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}
