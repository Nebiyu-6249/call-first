"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  CircleCheck,
  CircleHelp,
  Home,
  Info,
  OctagonAlert,
  Phone,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import type { ParentCircle } from "@/lib/circle/types";
import { MAX_REASONS, type CheckResult } from "@/lib/check";
import { pickNextStep, telHref } from "@/lib/next-step";
import type { VerdictLevel } from "@/lib/verdict";
import { DEFAULT_FAMILY_NAME, VERDICT_COPY, whatToDo } from "@/lib/verdict/copy";
import { FromMessage } from "./FromMessage";
import { GoldenRules } from "./GoldenRules";
import { primaryButton, secondaryButton, textLink } from "./styles";

const BANNER: Record<VerdictLevel, { Icon: LucideIcon; className: string }> = {
  WARNING: { Icon: OctagonAlert, className: "border-warning bg-warning-bg text-warning" },
  NOT_SURE: { Icon: CircleHelp, className: "border-unsure bg-unsure-bg text-unsure" },
  NO_WARNING_SIGNS: { Icon: CircleCheck, className: "border-ok bg-ok-bg text-ok" },
};

export function ResultView({
  result,
  circle = null,
  onCheckAnother,
}: {
  result: CheckResult;
  circle?: ParentCircle | null;
  onCheckAnother: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [dismissed, setDismissed] = useState(false);
  const familyName = circle?.familyMembers[0]?.name ?? DEFAULT_FAMILY_NAME;

  // Move focus to the answer so screen readers announce it straight away.
  useEffect(() => {
    headingRef.current?.focus();
  }, [dismissed]);

  if (dismissed) {
    return (
      <div className="flex flex-col gap-6">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          That is OK.
        </h1>
        <p className="text-xl">
          We can get things wrong. If you are not sure, ask {familyName} before you do anything.
        </p>
        <Link href="/p" className={primaryButton}>
          <Home aria-hidden="true" className="size-7" />
          Go to the start
        </Link>
      </div>
    );
  }

  const { Icon, className } = BANNER[result.level];
  const copy = VERDICT_COPY[result.level];
  const reasons = result.flags.slice(0, MAX_REASONS);
  const nextStep = pickNextStep(circle, result.senderType, result.claimedPerson);

  return (
    <div className="flex flex-col gap-6">
      <div className={`flex flex-col items-center gap-2 rounded-2xl border-4 p-5 text-center ${className}`}>
        <Icon aria-hidden="true" className="size-16" />
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          {copy.word}
        </h1>
        <p className="text-xl font-bold">{copy.line}</p>
      </div>

      {(result.summary || result.explanation) && (
        <div className="flex flex-col gap-3 text-xl">
          {result.summary && <p className="font-bold">{result.summary}</p>}
          {result.explanation && <p>{result.explanation}</p>}
        </div>
      )}

      {reasons.length > 0 && (
        <section aria-labelledby="why">
          <h2 id="why" className="text-2xl font-bold">
            Why
          </h2>
          <ul className="mt-3 flex flex-col gap-4">
            {reasons.map((flag) => (
              <li key={flag.id} className="text-xl">
                {flag.reason}
                {flag.evidence && (
                  <span className="mt-1 block text-lg text-muted">
                    It says: &ldquo;{flag.evidence}&rdquo;
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="todo" className="flex flex-col gap-4 rounded-2xl bg-surface p-5">
        <h2 id="todo" className="text-2xl font-bold">
          What to do now
        </h2>
        <p className="text-xl">{whatToDo(result.level, familyName)}</p>
        {nextStep && (
          <div className="flex flex-col gap-2">
            <a href={telHref(nextStep.phone)} className={primaryButton}>
              <Phone aria-hidden="true" className="size-7" />
              {nextStep.label}
            </a>
            <p className="text-lg text-muted">
              {nextStep.phone}. {nextStep.reason}
            </p>
          </div>
        )}
      </section>

      <FromMessage phoneNumbers={result.phoneNumbers} links={result.links} />

      {result.aiStatus !== "ok" && (
        <>
          <p className="flex items-start gap-3 text-lg text-muted">
            <Info aria-hidden="true" className="mt-1 size-6 shrink-0" />
            We could only do a quick check this time.
          </p>
          <GoldenRules familyName={familyName} />
        </>
      )}

      <button type="button" onClick={onCheckAnother} className={secondaryButton}>
        <RotateCcw aria-hidden="true" className="size-7" />
        Check something else
      </button>

      <button type="button" onClick={() => setDismissed(true)} className={`${textLink} self-start`}>
        I think this is wrong
      </button>
    </div>
  );
}
