import { Camera, Keyboard, Mic, type LucideIcon } from "lucide-react";
import type { ParentRoute } from "@/lib/parent/env";
import { BackLink } from "./BackLink";
import { ParentLink, Screen } from "./nav";

const choices: { to: ParentRoute; label: string; Icon: LucideIcon }[] = [
  { to: "photo", label: "Photo or screenshot", Icon: Camera },
  { to: "text", label: "Type or paste", Icon: Keyboard },
  { to: "voice", label: "Tell me what happened", Icon: Mic },
];

export function ChooseInput() {
  return (
    <Screen className="flex flex-1 flex-col gap-6">
      <BackLink to="home" />
      <h1 className="text-3xl font-bold">What do you want to check?</h1>

      <ul className="flex flex-col gap-4">
        {choices.map(({ to, label, Icon }) => (
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

      <p className="text-lg text-muted">An AI service checks it. Nothing is saved.</p>
    </Screen>
  );
}
