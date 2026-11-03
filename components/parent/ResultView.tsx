"use client";

import { useEffect, useRef, useState } from "react";
import {
  CircleCheck,
  CircleHelp,
  Home,
  Info,
  LifeBuoy,
  OctagonAlert,
  Phone,
  RotateCcw,
  Smartphone,
  Users,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { buildAlert, type FamilyChannel } from "@/lib/circle/channel";
import type { ParentCircle } from "@/lib/circle/types";
import { MAX_REASONS, type CheckResult } from "@/lib/check";
import { pickNextStep } from "@/lib/next-step";
import { useParentEnv } from "@/lib/parent/env";
import { speechScript } from "@/lib/speech/script";
import { canSpeak, speak } from "@/lib/speech/speak";
import type { VerdictLevel } from "@/lib/verdict";
import { DEFAULT_FAMILY_NAME, VERDICT_COPY, whatToDo } from "@/lib/verdict/copy";
import { HAPPENED_BUTTON } from "@/lib/urgent";
import { FromMessage } from "./FromMessage";
import { GoldenRules } from "./GoldenRules";
import { CallLink, ParentLink } from "./nav";
import { SentToFamily } from "./SentToFamily";
import { SomethingHappened } from "./SomethingHappened";
import { primaryButton, secondaryButton, textLink, urgentButton } from "./styles";

const BANNER: Record<VerdictLevel, { Icon: LucideIcon; className: string }> = {
  WARNING: { Icon: OctagonAlert, className: "border-warning bg-warning-bg text-warning" },
  NOT_SURE: { Icon: CircleHelp, className: "border-unsure bg-unsure-bg text-unsure" },
  NO_WARNING_SIGNS: { Icon: CircleCheck, className: "border-ok bg-ok-bg text-ok" },
};

// What was checked, when it was not typed: the words read from a picture, or the transcript of the voice note.
export type ResultSource = { kind: "text" } | { kind: "image"; text: string } | { kind: "voice"; text: string };

export function ResultView({
  result,
  circle = null,
  source = { kind: "text" },
  channel = null,
  autoRead,
  onCheckAnother,
}: {
  result: CheckResult;
  circle?: ParentCircle | null;
  source?: ResultSource;
  // How to reach the family. Null when the phone is not connected to a family circle.
  channel?: FamilyChannel | null;
  // Read the answer aloud as soon as it appears. On by default; the demo has a switch for it.
  autoRead?: boolean;
  onCheckAnother: () => void;
}) {
  const env = useParentEnv();
  const readAloud = autoRead ?? env?.autoRead ?? true;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stopReadingRef = useRef<() => void>(() => {});
  const [dismissed, setDismissed] = useState(false);
  const [reading, setReading] = useState(false);
  const [sentAlertId, setSentAlertId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  // "I already sent money, clicked, or shared something", opened from this result.
  const [happened, setHappened] = useState(false);
  const familyName = circle?.familyMembers[0]?.name ?? DEFAULT_FAMILY_NAME;
  const nextStep = pickNextStep(circle, result.senderType, result.claimedPerson);
  const script = speechScript(result, nextStep, familyName);
  const speechAvailable = canSpeak();

  // Move focus to the answer so screen readers announce it straight away.
  useEffect(() => {
    headingRef.current?.focus();
  }, [dismissed]);

  const showingResult = !dismissed && !sentAlertId && !happened;

  // Tell the demo panel while the answer is on screen.
  const resultShown = env?.resultShown;
  useEffect(() => {
    if (!resultShown || !showingResult) return;
    resultShown(true);
    return () => resultShown(false);
  }, [resultShown, showingResult]);

  // Read the result aloud once it appears, and stop when the screen changes.
  useEffect(() => {
    if (!readAloud || !showingResult) return;
    const stop = speak(script, { onStart: () => setReading(true), onEnd: () => setReading(false) });
    stopReadingRef.current = stop;
    return stop;
  }, [readAloud, showingResult, script]);

  async function showFamily() {
    if (!channel) return;
    setSending(true);
    setSendError("");
    const id = await channel.send(buildAlert(result, source.kind));
    setSending(false);
    if (id) setSentAlertId(id);
    else setSendError(`We could not send it. Please call ${channel.familyName} instead.`);
  }

  if (channel && sentAlertId) {
    return (
      <SentToFamily
        channel={channel}
        alertId={sentAlertId}
        familyPhone={circle?.familyMembers[0]?.phone}
        autoRead={readAloud}
      />
    );
  }

  if (happened) {
    return <SomethingHappened checked={{ result, source: source.kind }} onBack={() => setHappened(false)} />;
  }

  function toggleReading() {
    stopReadingRef.current();
    if (reading) return;
    stopReadingRef.current = speak(script, { onStart: () => setReading(true), onEnd: () => setReading(false) });
  }

  if (dismissed) {
    return (
      <div className="flex flex-col gap-6 break-words">
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          That is OK.
        </h1>
        <p className="text-xl">
          We can get things wrong. If you are not sure, ask {familyName} before you do anything.
        </p>
        <ParentLink to="home" className={primaryButton}>
          <Home aria-hidden="true" className="size-7" />
          Go to the start
        </ParentLink>
      </div>
    );
  }

  const { Icon, className } = BANNER[result.level];
  const copy = VERDICT_COPY[result.level];
  const reasons = result.flags.slice(0, MAX_REASONS);

  return (
    <div className="flex flex-col gap-6 break-words">
      <div className={`flex flex-col items-center gap-2 rounded-2xl border-4 p-5 text-center ${className}`}>
        <Icon aria-hidden="true" className="size-16" />
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
          {copy.word}
        </h1>
        <p className="text-xl font-bold">{copy.line}</p>
      </div>

      {result.aiStatus === "skipped" && (
        <p className="flex items-start gap-3 text-xl font-bold">
          <Smartphone aria-hidden="true" className="mt-1 size-7 shrink-0" />
          Quick check on this phone only. Nothing was sent anywhere.
        </p>
      )}

      {speechAvailable && (
        <button type="button" onClick={toggleReading} className={secondaryButton}>
          {reading ? (
            <VolumeX aria-hidden="true" className="size-7" />
          ) : (
            <Volume2 aria-hidden="true" className="size-7" />
          )}
          {reading ? "Stop reading" : "Read it to me"}
        </button>
      )}

      {source.kind === "voice" && (
        <section aria-labelledby="you-said" className="rounded-2xl border-2 border-border bg-surface p-5">
          <h2 id="you-said" className="text-xl font-bold">
            You said:
          </h2>
          <p className="mt-2 text-xl">&ldquo;{source.text}&rdquo;</p>
        </section>
      )}

      {source.kind === "image" &&
        (source.text ? (
          <details className="rounded-2xl border-2 border-border bg-surface p-5 text-xl">
            <summary className="min-h-12 cursor-pointer font-bold">What we read in the picture</summary>
            <p className="mt-3 whitespace-pre-line break-words">{source.text}</p>
          </details>
        ) : (
          <p className="text-xl font-bold">
            We could not read the picture this time. You can type the message instead.
          </p>
        ))}

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
        <p className="text-xl">{whatToDo(result.level, familyName, nextStep?.name)}</p>
        {nextStep && (
          <div className="flex flex-col gap-2">
            <CallLink name={nextStep.name} phone={nextStep.phone} className={primaryButton}>
              <Phone aria-hidden="true" className="size-7" />
              {nextStep.label}
            </CallLink>
            <p className="text-lg text-muted">
              {nextStep.phone}. {nextStep.reason}
            </p>
          </div>
        )}
      </section>

      {channel && (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={showFamily} disabled={sending} className={secondaryButton}>
            <Users aria-hidden="true" className="size-7" />
            {sending ? "Sending..." : `Show ${channel.familyName}`}
          </button>
          <p className="text-lg text-muted">
            {channel.familyName} will see the words of the message and our answer, with codes and card numbers hidden.
            Pictures are never sent.
          </p>
          {sendError && (
            <p role="alert" className="text-xl font-bold text-warning">
              {sendError}
            </p>
          )}
        </div>
      )}

      {result.level !== "NO_WARNING_SIGNS" && (
        <button type="button" onClick={() => setHappened(true)} className={urgentButton}>
          <LifeBuoy aria-hidden="true" className="size-7 shrink-0" />
          {HAPPENED_BUTTON}
        </button>
      )}

      <FromMessage phoneNumbers={result.phoneNumbers} links={result.links} />

      {result.sent.kind !== "nothing" && (
        <details className="rounded-2xl border-2 border-border bg-surface p-5 text-lg">
          <summary className="min-h-12 cursor-pointer text-xl font-bold">What the AI service saw</summary>
          {result.sent.kind === "text" ? (
            <div className="mt-3 flex flex-col gap-3">
              <p>Codes, card and account numbers, email addresses, phone numbers and your family&apos;s names were hidden on this phone first.</p>
              <p className="whitespace-pre-line break-words rounded-lg border-2 border-border bg-background p-3">
                {result.sent.text}
              </p>
              {source.kind === "voice" && (
                <p>Your voice recording was sent to a speech service to write it down. It is not saved.</p>
              )}
            </div>
          ) : (
            <p className="mt-3">
              The picture itself, so the AI service could read it. Nothing in a picture can be hidden first.
            </p>
          )}
        </details>
      )}

      {result.aiStatus !== "ok" && (
        <>
          {result.aiStatus === "failed" && (
            <p className="flex items-start gap-3 text-lg text-muted">
              <Info aria-hidden="true" className="mt-1 size-6 shrink-0" />
              We could only do a quick check this time.
            </p>
          )}
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
