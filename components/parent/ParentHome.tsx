"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BookOpenCheck, Link2, Phone, Search } from "lucide-react";
import { telHref } from "@/lib/next-step";
import { useCachedCircle } from "@/lib/parent/circle-cache";
import { refreshCircle } from "@/lib/parent/device";
import { primaryButton, secondaryButton, textLink } from "./styles";

export function ParentHome() {
  const circle = useCachedCircle();

  // Pick up any changes the family made (new numbers, text size).
  useEffect(() => {
    void refreshCircle();
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-8">
      <h1 className="text-3xl font-bold">
        {circle ? `Hello ${circle.parentName}. ` : ""}Got a message or call that worries you?
      </h1>

      <Link href="/p/check" className={`${primaryButton} min-h-40 flex-col text-3xl`}>
        <Search aria-hidden="true" className="size-14" />
        Check something
      </Link>

      {circle && circle.familyMembers.length > 0 && (
        <section aria-labelledby="call-family" className="flex flex-col gap-4">
          <h2 id="call-family" className="text-2xl font-bold">
            Call your family
          </h2>
          {circle.familyMembers.map((m) => (
            <a key={m.id} href={telHref(m.phone)} className={secondaryButton}>
              <Phone aria-hidden="true" className="size-7" />
              Call {m.name}
              {m.relationship && <span className="font-normal">({m.relationship})</span>}
            </a>
          ))}
        </section>
      )}

      <div className="flex flex-col items-start gap-2">
        <Link href="/p/rules" className={textLink}>
          <BookOpenCheck aria-hidden="true" className="size-6" />
          Golden Rules
        </Link>
        {!circle && (
          <Link href="/p/pair" className={textLink}>
            <Link2 aria-hidden="true" className="size-6" />
            Connect to your family
          </Link>
        )}
      </div>
    </main>
  );
}
