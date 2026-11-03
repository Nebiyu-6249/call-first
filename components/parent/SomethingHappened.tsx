"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Banknote, CreditCard, Home, KeyRound, MonitorSmartphone, Phone, type LucideIcon } from "lucide-react";
import type { AlertSource } from "@/lib/circle/channel";
import type { CheckResult } from "@/lib/check";
import { useParent } from "@/lib/parent/use-parent";
import { CALM_LINE, HAPPENED_CHOICES, urgentAlert, urgentPlan, type HappenedKind } from "@/lib/urgent";
import { BackLink } from "./BackLink";
import { CallLink, ParentLink, Screen } from "./nav";
import { primaryButton, secondaryButton, textLink } from "./styles";
import { TellFamilyStatus, useTellFamily } from "./TellFamily";

const ICONS: Record<HappenedKind, LucideIcon> = {
  sent_money: Banknote,
  shared_code: KeyRound,
  gave_card: CreditCard,
  remote_access: MonitorSmartphone,
};

// "Something already happened": what happened, then a short plan. The family is told straight away.
// Opened from the home screen, or from a result, when it carries that check.
export function SomethingHappened({
  checked = null,
  onBack,
}: {
  checked?: { result: CheckResult; source: AlertSource } | null;
  // From a result: go back to it. From the home screen there is a back link instead.
  onBack?: () => void;
}) {
  const { circle, channel } = useParent();
  const [kind, setKind] = useState<HappenedKind | null>(null);
  const { state, tell } = useTellFamily(channel);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toldRef = useRef(false);
  // Inside a result, which is already the page's main landmark.
  const Wrapper = onBack ? "div" : Screen;

  useEffect(() => {
    headingRef.current?.focus();
  }, [kind]);

  // Tell the family once, as soon as the person says what happened.
  useEffect(() => {
    if (!kind || !circle || !channel || toldRef.current) return;
    toldRef.current = true;
    void tell(urgentAlert(kind, circle.parentName, checked));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sends once, guarded by toldRef
  }, [kind]);

  if (!kind) {
    return (
      <Wrapper className="flex flex-1 flex-col gap-6">
        {onBack ? (
          <button type="button" onClick={onBack} className={`${textLink} self-start`}>
            <ArrowLeft aria-hidden="true" className="size-6" />
            Back
          </button>
        ) : (
          <BackLink to="home" />
        )}
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          What happened?
        </h1>
        <p className="text-xl">{CALM_LINE}</p>
        <ul className="flex flex-col gap-4">
          {HAPPENED_CHOICES.map(({ kind: k, label }) => {
            const Icon = ICONS[k];
            return (
              <li key={k}>
                <button type="button" onClick={() => setKind(k)} className={`${secondaryButton} min-h-24 justify-start text-left text-2xl`}>
                  <Icon aria-hidden="true" className="size-9 shrink-0" />
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </Wrapper>
    );
  }

  const plan = urgentPlan(kind, circle);
  const choice = HAPPENED_CHOICES.find((c) => c.kind === kind)?.label;

  return (
    <Wrapper className="flex flex-1 flex-col gap-6 break-words">
      <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
        What to do now
      </h1>
      <p className="text-xl">
        You said: &ldquo;{choice}.&rdquo; {CALM_LINE}
      </p>

      <ol className="flex flex-col gap-6">
        <li className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
          <h2 className="text-2xl font-bold">1. Call now</h2>
          <p className="text-xl">{plan.firstCallWhy}</p>
          {plan.firstCall && (
            <div className="flex flex-col gap-1">
              <CallLink name={plan.firstCall.name} phone={plan.firstCall.phone} className={primaryButton}>
                <Phone aria-hidden="true" className="size-7" />
                {plan.firstCall.label}
              </CallLink>
              <p className="text-lg text-muted">{plan.firstCall.phone}. A number your family saved.</p>
            </div>
          )}
        </li>

        {channel && (
          <li className="flex flex-col gap-3">
            <h2 className="text-2xl font-bold">2. Your family</h2>
            <TellFamilyStatus channel={channel} state={state} />
          </li>
        )}

        <li className="flex flex-col gap-3">
          <h2 className="text-2xl font-bold">{channel ? "3" : "2"}. Next</h2>
          <ul className="flex list-disc flex-col gap-3 pl-6 text-xl">
            {plan.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </li>
      </ol>

      <ParentLink to="home" className={secondaryButton}>
        <Home aria-hidden="true" className="size-7" />
        Go to the start
      </ParentLink>
    </Wrapper>
  );
}
