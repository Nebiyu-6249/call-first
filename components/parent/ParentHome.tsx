"use client";

import { useEffect } from "react";
import { BookOpenCheck, Link2, Phone, Search } from "lucide-react";
import { refreshCircle } from "@/lib/parent/device";
import { useParentEnv } from "@/lib/parent/env";
import { useParent } from "@/lib/parent/use-parent";
import { CallLink, ParentLink, Screen } from "./nav";
import { primaryButton, secondaryButton, textLink } from "./styles";

export function ParentHome() {
  const { circle } = useParent();
  const inDemo = useParentEnv() !== null;

  // Pick up any changes the family made (new numbers, text size).
  useEffect(() => {
    if (!inDemo) void refreshCircle();
  }, [inDemo]);

  return (
    <Screen className="flex flex-1 flex-col gap-8">
      <h1 className="text-3xl font-bold">
        {circle ? `Hello ${circle.parentName}. ` : ""}Got a message or call that worries you?
      </h1>

      <ParentLink to="check" className={`${primaryButton} min-h-40 flex-col text-3xl`}>
        <Search aria-hidden="true" className="size-14" />
        Check something
      </ParentLink>

      {circle && circle.familyMembers.length > 0 && (
        <section aria-labelledby="call-family" className="flex flex-col gap-4">
          <h2 id="call-family" className="text-2xl font-bold">
            Call your family
          </h2>
          {circle.familyMembers.map((m) => (
            <CallLink key={m.id} name={m.name} phone={m.phone} className={`${secondaryButton} flex-wrap`}>
              <Phone aria-hidden="true" className="size-7" />
              Call {m.name}
              {m.relationship && <span className="font-normal">({m.relationship})</span>}
            </CallLink>
          ))}
        </section>
      )}

      <div className="flex flex-col items-start gap-2">
        <ParentLink to="rules" className={textLink}>
          <BookOpenCheck aria-hidden="true" className="size-6" />
          Golden Rules
        </ParentLink>
        {!circle && (
          <ParentLink to="pair" className={textLink}>
            <Link2 aria-hidden="true" className="size-6" />
            Connect to your family
          </ParentLink>
        )}
      </div>
    </Screen>
  );
}
