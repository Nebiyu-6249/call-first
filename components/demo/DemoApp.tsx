"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import Link from "next/link";
import {
  ImageUp,
  Info,
  Keyboard,
  MessageSquareText,
  PhoneCall,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  X,
} from "lucide-react";
import { APP_NAME } from "@/lib/config";
import { DEMO_CIRCLE } from "@/lib/demo/circle";
import { createDemoFamilyLoop } from "@/lib/demo/family-loop";
import { DEMO_SAMPLES, type DemoSample } from "@/lib/demo/samples";
import type { ParentRoute } from "@/lib/parent/env";
import { canSpeak } from "@/lib/speech/speak";
import { DemoFamily } from "./DemoFamily";
import { DemoParent, type ParentView } from "./DemoParent";

const parentName = DEMO_CIRCLE.parentName;
const familyName = DEMO_CIRCLE.familyMembers[0].name;

const chipBase = "inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-primary px-4 py-2 text-left text-base font-bold";
const chip = `${chipBase} bg-surface text-primary hover:bg-background`;
const chipSelected = `${chipBase} bg-primary text-primary-foreground hover:bg-primary-hover`;

type Phone = "parent" | "family";

export function DemoApp() {
  const [loop] = useState(createDemoFamilyLoop);
  const [view, setView] = useState<ParentView>({ route: "home", nonce: 0 });
  const [sample, setSample] = useState<DemoSample | null>(null);
  const [autoRead, setAutoRead] = useState(true);
  const [call, setCall] = useState<{ name: string; phone: string } | null>(null);
  const [phone, setPhone] = useState<Phone>("parent");
  const parentFrameRef = useRef<HTMLElement>(null);
  const alerts = useSyncExternalStore(loop.subscribe, loop.getAlerts, loop.getAlerts);
  const waiting = alerts.filter((a) => !a.reply).length;

  const navigate = useCallback((route: ParentRoute) => {
    setCall(null);
    setView((v) => ({ route, nonce: v.nonce + 1 }));
  }, []);

  const onCall = useCallback((name: string, phone: string) => setCall({ name, phone }), []);

  function showOnParent(route: ParentRoute, sampleText?: string) {
    setCall(null);
    setView((v) => ({ route, nonce: v.nonce + 1, sampleText }));
    setPhone("parent");
    // On small screens the phone is below the samples.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      parentFrameRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function trySample(s: DemoSample) {
    setSample(s);
    showOnParent("text", s.text);
  }

  function stopSpeaking() {
    if (canSpeak()) window.speechSynthesis.cancel();
  }

  function restart() {
    stopSpeaking();
    loop.reset();
    setSample(null);
    setPhone("parent");
    showOnParent("home");
  }

  return (
    <main className="mx-auto flex w-full max-w-[90rem] flex-col gap-8 px-4 py-6 text-lg">
      <header className="grid gap-4 rounded-2xl border-2 border-border bg-surface p-5 lg:p-6 xl:grid-cols-2 xl:gap-x-10">
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-base font-bold text-muted">
            <Info aria-hidden="true" className="size-5 shrink-0" />
            {APP_NAME} demo. Everyone and everything here is made up.
          </p>
          <h1 className="text-3xl font-bold">Try {APP_NAME} in two minutes</h1>
          <p className="max-w-4xl">
            You are looking at two phones. <strong>{parentName}</strong> is the older person, whose phone only shows
            big, simple screens. <strong>{familyName}</strong> is {parentName}&apos;s daughter, who set everything up
            and gets the alerts.
          </p>
        </div>
        <ol className="flex max-w-4xl list-decimal flex-col gap-1 pl-6 xl:self-end">
          <li>Tap a sample message, or paste your own text or upload a screenshot.</li>
          <li>
            Read {parentName}&apos;s answer. The call button uses a number {familyName} saved, never one from the
            message.
          </li>
          <li>
            Tap &ldquo;Show {familyName}&rdquo;, then reply on {familyName}&apos;s phone. {parentName} sees the reply.
          </li>
        </ol>
        <p className="max-w-4xl text-base text-muted xl:col-span-2 xl:max-w-none">
          The checks are real: each message goes through our rules and an AI service. Nothing in this demo is saved,
          and the family alerts never leave this browser tab.{" "}
          <Link href="/privacy" className="font-bold text-primary underline underline-offset-4">
            Privacy
          </Link>{" "}
          and{" "}
          <Link href="/privacy#limitations" className="font-bold text-primary underline underline-offset-4">
            what it cannot do
          </Link>
          .
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[25rem_25rem] lg:justify-center xl:grid-cols-[minmax(18rem,26rem)_25rem_25rem]">
        <section aria-labelledby="samples-heading" className="flex flex-col gap-4 lg:col-span-2 xl:col-span-1">
          <h2 id="samples-heading" className="flex items-center gap-2 text-2xl font-bold">
            <MessageSquareText aria-hidden="true" className="size-7 text-primary" />
            Sample messages
          </h2>
          <p>Tap one to send it to {parentName}&apos;s phone, as if {parentName} had pasted it in.</p>
          <ul className="flex flex-wrap gap-2">
            {DEMO_SAMPLES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => trySample(s)}
                  aria-pressed={sample?.id === s.id}
                  className={sample?.id === s.id ? chipSelected : chip}
                >
                  {s.kind === "scam" ? (
                    <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
                  ) : (
                    <ShieldCheck aria-hidden="true" className="size-5 shrink-0" />
                  )}
                  <span>
                    {s.label}
                    <span className="sr-only">, </span>
                    <span className="block text-sm font-normal">{s.kind === "scam" ? "Scam" : "Normal message"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => showOnParent("text")} className={chip}>
              <Keyboard aria-hidden="true" className="size-5 shrink-0" />
              Paste your own
            </button>
            <button type="button" onClick={() => showOnParent("photo")} className={chip}>
              <ImageUp aria-hidden="true" className="size-5 shrink-0" />
              Upload a screenshot
            </button>
          </div>

          {sample && (
            <figure className="flex flex-col gap-2 rounded-2xl border-2 border-border bg-surface p-4">
              <figcaption className="text-base font-bold text-muted">The message {parentName} got</figcaption>
              <blockquote className="whitespace-pre-line break-words">{sample.text}</blockquote>
            </figure>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="inline-flex min-h-12 items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => {
                  if (!e.target.checked) stopSpeaking();
                  setAutoRead(e.target.checked);
                }}
                className="size-6 accent-primary"
              />
              Read answers aloud
            </label>
            <button type="button" onClick={restart} className={chip}>
              <RotateCcw aria-hidden="true" className="size-5 shrink-0" />
              Start again
            </button>
          </div>
        </section>

        <div role="group" aria-label="Which phone to show" className="grid grid-cols-2 gap-2 lg:hidden">
          <PhoneTab active={phone === "parent"} onClick={() => setPhone("parent")}>
            {parentName}&apos;s phone
          </PhoneTab>
          <PhoneTab active={phone === "family"} onClick={() => setPhone("family")}>
            {familyName}&apos;s phone
            {waiting > 0 && <span className="block text-sm font-normal">{waiting} waiting for a reply</span>}
          </PhoneTab>
        </div>

        <PhoneFrame
          ref={parentFrameRef}
          id="parent-phone"
          title={`${parentName}'s phone`}
          subtitle="the older person"
          visible={phone === "parent"}
          overlay={call && <CallNotice call={call} onClose={() => setCall(null)} />}
        >
          <DemoParent loop={loop} view={view} autoRead={autoRead} onNavigate={navigate} onCall={onCall} />
        </PhoneFrame>

        <PhoneFrame id="family-phone" title={`${familyName}'s phone`} subtitle={`${parentName}'s daughter`} visible={phone === "family"}>
          <DemoFamily loop={loop} />
        </PhoneFrame>
      </div>
    </main>
  );
}

function PhoneTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-primary px-3 py-2 text-center font-bold ${
        active ? "bg-primary text-primary-foreground" : "bg-surface text-primary"
      }`}
    >
      <Smartphone aria-hidden="true" className="size-5 shrink-0" />
      <span>{children}</span>
    </button>
  );
}

function PhoneFrame({
  ref,
  id,
  title,
  subtitle,
  visible,
  overlay,
  children,
}: {
  ref?: Ref<HTMLElement>;
  id: string;
  title: string;
  subtitle: string;
  visible: boolean;
  overlay?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      ref={ref}
      aria-labelledby={`${id}-title`}
      className={`${visible ? "flex" : "hidden lg:flex"} scroll-mt-4 flex-col gap-3`}
    >
      <h2 id={`${id}-title`} className="flex flex-wrap items-center gap-x-2 text-xl font-bold">
        <Smartphone aria-hidden="true" className="size-6 shrink-0 text-primary" />
        {title}
        <span className="font-normal text-muted">({subtitle})</span>
      </h2>
      <div className="relative overflow-hidden rounded-3xl border-2 border-border bg-background lg:h-[clamp(36rem,calc(100dvh-4rem),52rem)] lg:rounded-[2.75rem] lg:border-[12px] lg:border-foreground lg:shadow-xl">
        <div data-phone-scroll className="lg:h-full lg:overflow-y-auto">
          {children}
        </div>
        {overlay}
      </div>
    </section>
  );
}

function CallNotice({ call, onClose }: { call: { name: string; phone: string }; onClose: () => void }) {
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-10 flex items-start gap-3 rounded-2xl bg-foreground p-4 text-base text-background shadow-xl lg:absolute lg:inset-x-3 lg:bottom-3"
    >
      <PhoneCall aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <p className="flex-1">
        <strong>Demo:</strong> on a real phone this calls {call.name} on {call.phone}. {familyName} saved this number
        in advance. It never comes from the message.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-background"
      >
        <X aria-hidden="true" className="size-5" />
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
}
