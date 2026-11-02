import Link from "next/link";
import { BookOpenCheck, Search } from "lucide-react";
import { primaryButton, textLink } from "@/components/parent/styles";

export default function ParentHome() {
  return (
    <main className="flex flex-1 flex-col gap-8">
      <h1 className="text-3xl font-bold">Got a message or call that worries you?</h1>

      <Link href="/p/check" className={`${primaryButton} min-h-40 flex-col text-3xl`}>
        <Search aria-hidden="true" className="size-14" />
        Check something
      </Link>

      <Link href="/p/rules" className={`${textLink} self-start`}>
        <BookOpenCheck aria-hidden="true" className="size-6" />
        Golden Rules
      </Link>
    </main>
  );
}
