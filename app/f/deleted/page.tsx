import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Home } from "lucide-react";
import { fButtonSecondary } from "@/components/family/ui";

export const metadata: Metadata = { title: "Circle deleted" };

export default function CircleDeleted() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="flex items-center gap-3 text-3xl font-bold">
        <CircleCheck aria-hidden="true" className="size-9 shrink-0 text-ok" />
        Everything is deleted
      </h1>
      <p>
        The circle, its names and numbers, the connected phones and all messages have been removed from our database.
        The parent&apos;s phone may still show the old contacts until the app is opened again; it can no longer send
        messages to you.
      </p>
      <Link href="/f" className={`${fButtonSecondary} self-start`}>
        <Home aria-hidden="true" className="size-5" />
        Back to the start
      </Link>
    </main>
  );
}
