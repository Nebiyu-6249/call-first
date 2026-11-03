import Link from "next/link";
import { HeartHandshake, MonitorPlay, ShieldCheck } from "lucide-react";
import { APP_NAME, APP_TAGLINE, emergencyLine } from "@/lib/config";

const entries = [
  {
    href: "/p",
    title: "I want to check something",
    body: "For the person who got the message or call.",
    Icon: ShieldCheck,
  },
  {
    href: "/f",
    title: "I am a family member or helper",
    body: "Set things up and answer when someone asks you.",
    Icon: HeartHandshake,
  },
  {
    href: "/demo",
    title: "Try the demo",
    body: "See both sides working, with made-up messages.",
    Icon: MonitorPlay,
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold">{APP_NAME}</h1>
        <p className="text-xl text-muted">{APP_TAGLINE}</p>
      </header>

      <nav aria-label="Choose where to start">
        <ul className="flex flex-col gap-4">
          {entries.map(({ href, title, body, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex min-h-16 items-center gap-4 rounded-2xl border-2 border-border bg-surface p-5 hover:bg-background"
              >
                <Icon aria-hidden="true" className="size-10 shrink-0 text-primary" />
                <span className="flex flex-col">
                  <span className="text-2xl font-bold">{title}</span>
                  <span className="text-lg text-muted">{body}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="mt-auto flex flex-col gap-2 text-lg text-muted">
        <p>{emergencyLine()}</p>
        <Link href="/privacy" className="inline-flex min-h-11 items-center self-start font-bold text-primary underline underline-offset-4">
          Privacy and limits
        </Link>
      </footer>
    </main>
  );
}
