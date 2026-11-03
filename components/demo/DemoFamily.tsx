"use client";

import { useMemo, useSyncExternalStore } from "react";
import { BookUser, Inbox, LockKeyhole } from "lucide-react";
import { AlertCard } from "@/components/family/AlertCard";
import { fCard } from "@/components/family/ui";
import { inboxOrder, type ReplyKind } from "@/lib/circle/alerts";
import { APP_NAME } from "@/lib/config";
import { DEMO_CIRCLE } from "@/lib/demo/circle";
import type { DemoFamilyLoop } from "@/lib/demo/family-loop";

const parent = DEMO_CIRCLE.parentName;
const family = DEMO_CIRCLE.familyMembers[0].name;

// Sara's side of the demo: Amina's alerts with one-tap replies, and the numbers Sara saved.
export function DemoFamily({ loop }: { loop: DemoFamilyLoop }) {
  const newestFirst = useSyncExternalStore(loop.subscribe, loop.getAlerts, loop.getAlerts);
  // URGENT alerts waiting for a reply come first, as in the real inbox.
  const alerts = useMemo(() => inboxOrder(newestFirst), [newestFirst]);

  async function reply(id: string, kind: ReplyKind, text: string) {
    return loop.reply(id, kind, text);
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 text-lg">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-muted">{APP_NAME} for families</p>
        <p className="text-2xl font-bold">Looking after {parent}</p>
      </div>

      <section aria-labelledby="demo-inbox" className="flex flex-col gap-4">
        <h3 id="demo-inbox" className="flex items-center gap-2 text-xl font-bold">
          <Inbox aria-hidden="true" className="size-6 text-primary" />
          Messages from {parent}
        </h3>
        <div aria-live="polite" className="flex flex-col gap-4">
          {alerts.length === 0 ? (
            <p className={fCard}>
              Nothing yet. When {parent} taps &ldquo;Show {family}&rdquo;, it appears here.
            </p>
          ) : (
            alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                parentName={parent}
                onReply={(kind, text) => reply(alert.id, kind, text)}
              />
            ))
          )}
        </div>
      </section>

      <section aria-labelledby="demo-contacts" className={`${fCard} flex flex-col gap-3`}>
        <h3 id="demo-contacts" className="flex items-center gap-2 text-xl font-bold">
          <BookUser aria-hidden="true" className="size-6 text-primary" />
          Numbers {family} saved for {parent}
        </h3>
        <ul className="flex flex-col gap-3">
          {DEMO_CIRCLE.familyMembers.map((m) => (
            <li key={m.id}>
              <span className="font-bold">{m.name}</span> ({m.relationship}): {m.phone}
            </li>
          ))}
          {DEMO_CIRCLE.contacts.map((c) => (
            <li key={c.id}>
              <span className="font-bold">{c.label}</span> ({c.category}): {c.phone}
              {c.note && <span className="block text-base text-muted">{c.note}</span>}
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-2 text-base">
          <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
          <span>
            Only family can change these, and only with their PIN. {parent}&apos;s phone can read them but not
            change them, so someone holding {parent}&apos;s phone cannot swap in their own number.
          </span>
        </p>
      </section>
    </div>
  );
}
