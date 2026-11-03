"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Home, Mic, Phone, PhoneOff, Users } from "lucide-react";
import { useParent } from "@/lib/parent/use-parent";
import { CLEAR_LINE, afterCallButtons, urgentAlert } from "@/lib/urgent";
import { BackLink } from "./BackLink";
import { CallLink, ParentLink, Screen } from "./nav";
import { primaryButton, secondaryButton } from "./styles";
import { TellFamilyStatus, useTellFamily } from "./TellFamily";

// "Someone is on the phone with me now": first permission to hang up, then who to call.
export function OnThePhone() {
  const { circle, channel } = useParent();
  const [hungUp, setHungUp] = useState(false);
  const { state, tell } = useTellFamily(channel);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const calls = afterCallButtons(circle);
  const privateMode = circle?.privateMode === true;

  useEffect(() => {
    if (hungUp) headingRef.current?.focus();
  }, [hungUp]);

  if (!hungUp) {
    return (
      <Screen className="flex flex-1 flex-col gap-8">
        <BackLink to="home" />
        <h1 className="text-3xl font-bold">It is OK to hang up.</h1>
        <p className="text-2xl">Your real bank and the real police will not mind.</p>
        <button type="button" onClick={() => setHungUp(true)} className={`${primaryButton} min-h-32 flex-col text-3xl`}>
          <PhoneOff aria-hidden="true" className="size-12" />I hung up
        </button>
      </Screen>
    );
  }

  return (
    <Screen className="flex flex-1 flex-col gap-6 break-words">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
        Well done for hanging up.
      </h1>

      <p className="flex items-start gap-3 text-xl font-bold">
        <Clock aria-hidden="true" className="mt-1 size-7 shrink-0" />
        {CLEAR_LINE}
      </p>

      {calls.length > 0 && (
        <section aria-labelledby="who-to-call" className="flex flex-col gap-4">
          <h2 id="who-to-call" className="text-2xl font-bold">
            Call someone you trust
          </h2>
          {calls.map((c, i) => (
            <div key={c.phone + c.name} className="flex flex-col gap-1">
              <CallLink name={c.name} phone={c.phone} className={i === 0 ? primaryButton : secondaryButton}>
                <Phone aria-hidden="true" className="size-7" />
                {c.label}
              </CallLink>
              <p className="text-lg text-muted">{c.phone}. A number your family saved.</p>
            </div>
          ))}
        </section>
      )}

      {channel && circle && (
        <div className="flex flex-col gap-3">
          {state.status === "idle" || state.status === "failed" ? (
            <button
              type="button"
              onClick={() => tell(urgentAlert("phone_call", circle.parentName))}
              className={secondaryButton}
            >
              <Users aria-hidden="true" className="size-7" />
              Tell {channel.familyName}
            </button>
          ) : null}
          <TellFamilyStatus channel={channel} state={state} />
        </div>
      )}

      {!privateMode && (
        <ParentLink to="voice" className={secondaryButton}>
          <Mic aria-hidden="true" className="size-7" />
          Tell me what happened
        </ParentLink>
      )}

      <ParentLink to="home" className={secondaryButton}>
        <Home aria-hidden="true" className="size-7" />
        Go to the start
      </ParentLink>
    </Screen>
  );
}
