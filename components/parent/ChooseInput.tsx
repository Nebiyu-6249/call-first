"use client";

import { Camera, Keyboard, Mic, type LucideIcon } from "lucide-react";
import type { ParentRoute } from "@/lib/parent/env";
import { useParent } from "@/lib/parent/use-parent";
import { BackLink } from "./BackLink";
import { ParentLink, Screen } from "./nav";

const choices: { to: ParentRoute; label: string; Icon: LucideIcon; needsAi: boolean }[] = [
  { to: "photo", label: "Photo or screenshot", Icon: Camera, needsAi: true },
  { to: "text", label: "Type or paste", Icon: Keyboard, needsAi: false },
  { to: "voice", label: "Tell me what happened", Icon: Mic, needsAi: true },
];

export function ChooseInput() {
  const { circle } = useParent();
  // In private mode nothing leaves the phone, so only typed or pasted messages can be checked.
  const privateMode = circle?.privateMode === true;
  const shown = choices.filter((c) => !privateMode || !c.needsAi);

  return (
    <Screen className="flex flex-1 flex-col gap-6">
      <BackLink to="home" />
      <h1 className="text-3xl font-bold">What do you want to check?</h1>

      <ul className="flex flex-col gap-4">
        {shown.map(({ to, label, Icon }) => (
          <li key={to}>
            <ParentLink
              to={to}
              className="flex min-h-24 w-full items-center gap-5 rounded-2xl border-4 border-primary bg-surface px-5 py-4 text-left text-2xl font-bold text-primary hover:bg-background"
            >
              <Icon aria-hidden="true" className="size-12 shrink-0" />
              {label}
            </ParentLink>
          </li>
        ))}
      </ul>

      <p className="text-lg text-muted">
        {privateMode
          ? "It is checked on this phone only. Nothing is sent anywhere."
          : "An AI service checks it. Private details are hidden first. We do not save it."}
      </p>
    </Screen>
  );
}
