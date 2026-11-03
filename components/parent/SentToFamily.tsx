"use client";

import { useEffect, useRef, useState } from "react";
import { Home, MessageCircleHeart, Phone } from "lucide-react";
import type { FamilyReply } from "@/lib/circle/alerts";
import type { FamilyChannel } from "@/lib/circle/channel";
import { useParentEnv } from "@/lib/parent/env";
import { speak } from "@/lib/speech/speak";
import { CallLink, ParentLink } from "./nav";
import { primaryButton, secondaryButton } from "./styles";

export const POLL_MS = 5000;
// Stop asking after half an hour; the family can still call.
const MAX_WAIT_MS = 30 * 60 * 1000;

export function SentToFamily({
  channel,
  alertId,
  familyPhone,
  autoRead = true,
}: {
  channel: FamilyChannel;
  alertId: string;
  familyPhone?: string;
  autoRead?: boolean;
}) {
  // The demo asks more often, so the reply shows up quickly.
  const pollMs = useParentEnv()?.pollMs ?? POLL_MS;
  const [reply, setReply] = useState<FamilyReply | null>(null);
  const [gone, setGone] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const name = channel.familyName;

  useEffect(() => {
    headingRef.current?.focus();
  }, [reply]);

  // Ask every 5 seconds whether the family has replied.
  useEffect(() => {
    if (reply || gone) return;
    const started = Date.now();
    let stopSpeaking = () => {};
    const timer = window.setInterval(async () => {
      if (Date.now() - started > MAX_WAIT_MS) return window.clearInterval(timer);
      const result = await channel.poll(alertId);
      if (result.status === "gone") {
        window.clearInterval(timer);
        setGone(true);
      } else if (result.status === "replied") {
        window.clearInterval(timer);
        setReply(result.reply);
        if (autoRead) stopSpeaking = speak(`${name} says: ${result.reply.text}`);
      }
    }, pollMs);
    return () => {
      window.clearInterval(timer);
      stopSpeaking();
    };
  }, [alertId, autoRead, channel, gone, name, pollMs, reply]);

  return (
    <div className="flex flex-col gap-6">
      {reply ? (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="flex items-center gap-3 text-3xl font-bold outline-none">
            <MessageCircleHeart aria-hidden="true" className="size-10 shrink-0 text-primary" />
            {name} says:
          </h1>
          <p className="rounded-2xl border-4 border-primary bg-surface p-5 text-3xl font-bold">{reply.text}</p>
        </>
      ) : (
        <>
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
            {name} will see this.
          </h1>
          <p className="text-2xl">Do not reply to the message while you wait.</p>
          <p role="status" className="text-xl text-muted">
            {gone ? `We could not get an answer. Please call ${name}.` : `Waiting for ${name} to answer...`}
          </p>
        </>
      )}

      {familyPhone && (
        <CallLink name={name} phone={familyPhone} className={reply ? secondaryButton : primaryButton}>
          <Phone aria-hidden="true" className="size-7" />
          Call {name}
        </CallLink>
      )}
      <ParentLink to="home" className={secondaryButton}>
        <Home aria-hidden="true" className="size-7" />
        Go to the start
      </ParentLink>
    </div>
  );
}
