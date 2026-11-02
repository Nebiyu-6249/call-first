import Link from "next/link";
import { Camera, Keyboard, Mic, type LucideIcon } from "lucide-react";
import { BackLink } from "@/components/parent/BackLink";

const choices: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/p/check/photo", label: "Photo or screenshot", Icon: Camera },
  { href: "/p/check/text", label: "Type or paste", Icon: Keyboard },
  { href: "/p/check/voice", label: "Tell me what happened", Icon: Mic },
];

export default function ChooseInput() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <BackLink href="/p" />
      <h1 className="text-3xl font-bold">What do you want to check?</h1>

      <ul className="flex flex-col gap-4">
        {choices.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-24 w-full items-center gap-5 rounded-2xl border-4 border-primary bg-surface px-5 py-4 text-2xl font-bold text-primary hover:bg-background"
            >
              <Icon aria-hidden="true" className="size-12 shrink-0" />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-lg text-muted">An AI service checks it. Nothing is saved.</p>
    </main>
  );
}
