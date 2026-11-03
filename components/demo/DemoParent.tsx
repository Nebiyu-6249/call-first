"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChooseInput } from "@/components/parent/ChooseInput";
import { ParentFooter } from "@/components/parent/ParentFooter";
import { ParentHome } from "@/components/parent/ParentHome";
import { PhotoCheck } from "@/components/parent/PhotoCheck";
import { RulesScreen } from "@/components/parent/RulesScreen";
import { TextCheck } from "@/components/parent/TextCheck";
import { VoiceCheck } from "@/components/parent/VoiceCheck";
import { DEMO_CIRCLE } from "@/lib/demo/circle";
import type { DemoFamilyLoop } from "@/lib/demo/family-loop";
import { ParentEnvContext, type CheckedInput, type ParentEnv, type ParentRoute } from "@/lib/parent/env";

// What Amina's phone is showing. A new `nonce` starts the screen afresh.
export interface ParentView {
  route: ParentRoute;
  nonce: number;
  sampleText?: string;
}

// The real parent screens use a 22px base size (html font-size 137.5%). The demo page keeps
// the normal 16px, so the phone's content is zoomed to match what Amina would really see.
const PARENT_ZOOM = 1.375;

// The real app asks every 5 seconds; the demo asks more often so the reply appears quickly.
const DEMO_POLL_MS = 1500;

export function DemoParent({
  loop,
  view,
  autoRead,
  privateMode,
  onNavigate,
  onCall,
  onCheckStarted,
  onResultShown,
}: {
  loop: DemoFamilyLoop;
  view: ParentView;
  autoRead: boolean;
  privateMode: boolean;
  onNavigate: (route: ParentRoute) => void;
  onCall: (name: string, phone: string) => void;
  onCheckStarted: (input: CheckedInput) => void;
  onResultShown: (shown: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const channel = useMemo(() => loop.channel(DEMO_CIRCLE.familyMembers[0].name), [loop]);

  const circle = useMemo(() => ({ ...DEMO_CIRCLE, privateMode }), [privateMode]);

  const env = useMemo<ParentEnv>(
    () => ({
      circle,
      channel,
      go: onNavigate,
      call: onCall,
      autoRead,
      pollMs: DEMO_POLL_MS,
      checkStarted: onCheckStarted,
      resultShown: onResultShown,
    }),
    [circle, channel, onNavigate, onCall, autoRead, onCheckStarted, onResultShown],
  );

  // On each new screen, go back to the top and move focus there, as a page change would.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const container = containerRef.current;
    if (!container) return;
    container.closest("[data-phone-scroll]")?.scrollTo({ top: 0 });
    const heading = container.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    } else {
      container.focus({ preventScroll: true });
    }
  }, [view.nonce]);

  let screen;
  switch (view.route) {
    case "check":
      screen = <ChooseInput />;
      break;
    case "text":
      screen = <TextCheck initialText={view.sampleText} checkNow={Boolean(view.sampleText)} />;
      break;
    case "photo":
      screen = <PhotoCheck />;
      break;
    case "voice":
      screen = <VoiceCheck />;
      break;
    case "rules":
      screen = <RulesScreen />;
      break;
    default:
      screen = <ParentHome />;
  }

  return (
    <ParentEnvContext.Provider value={env}>
      <div
        ref={containerRef}
        tabIndex={-1}
        style={{ zoom: PARENT_ZOOM }}
        className="flex flex-col px-4 py-6 outline-none"
      >
        <div key={view.nonce} className="flex flex-col">
          {screen}
        </div>
        <ParentFooter />
      </div>
    </ParentEnvContext.Provider>
  );
}
