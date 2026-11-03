"use client";

import { useState } from "react";
import { CircleCheck, MessageCircleHeart, TriangleAlert } from "lucide-react";
import type { NewAlert } from "@/lib/circle/alerts";
import type { FamilyChannel } from "@/lib/circle/channel";
import { useParentEnv } from "@/lib/parent/env";
import { useFamilyReply } from "./SentToFamily";

export type TellState = { status: "idle" | "sending" | "failed" } | { status: "sent"; alertId: string };

// Sends an URGENT alert to the family and remembers how it went.
export function useTellFamily(channel: FamilyChannel | null) {
  const [state, setState] = useState<TellState>({ status: "idle" });
  async function tell(alert: NewAlert) {
    if (!channel) return;
    setState({ status: "sending" });
    const id = await channel.send(alert);
    setState(id ? { status: "sent", alertId: id } : { status: "failed" });
  }
  return { state, tell };
}

// "We have told Sara", then Sara's reply in large text when it arrives.
export function TellFamilyStatus({ channel, state }: { channel: FamilyChannel; state: TellState }) {
  const autoRead = useParentEnv()?.autoRead ?? true;
  const alertId = state.status === "sent" ? state.alertId : null;
  const { reply, gone } = useFamilyReply(channel, alertId, autoRead);
  const name = channel.familyName;

  if (state.status === "idle") return null;
  if (state.status === "sending") {
    return (
      <p role="status" className="text-xl">
        Telling {name}...
      </p>
    );
  }
  if (state.status === "failed") {
    return (
      <p role="alert" className="flex items-start gap-3 text-xl font-bold text-warning">
        <TriangleAlert aria-hidden="true" className="mt-1 size-7 shrink-0" />
        We could not tell {name}. Please call {name}.
      </p>
    );
  }
  return (
    <div role="status" className="flex flex-col gap-3">
      <p className="flex items-start gap-3 text-xl font-bold">
        <CircleCheck aria-hidden="true" className="mt-1 size-7 shrink-0 text-primary" />
        We have told {name}.
      </p>
      {reply ? (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-3 text-2xl font-bold">
            <MessageCircleHeart aria-hidden="true" className="size-8 shrink-0 text-primary" />
            {name} says:
          </p>
          <p className="rounded-2xl border-4 border-primary bg-surface p-5 text-2xl font-bold">{reply.text}</p>
        </div>
      ) : (
        <p className="text-lg text-muted">
          {gone ? `We could not get an answer. Please call ${name}.` : `Waiting for ${name} to answer...`}
        </p>
      )}
    </div>
  );
}
