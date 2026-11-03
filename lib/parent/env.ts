// The parent screens normally run as pages under /p and read the circle paired to this device.
// The demo runs the same screens inside a phone frame, so it supplies its own circle, family
// channel and navigation through this context instead.

import { createContext, useContext } from "react";
import type { FamilyChannel } from "@/lib/circle/channel";
import type { DeviceCircle } from "@/lib/circle/types";

export const PARENT_ROUTES = {
  home: "/p",
  check: "/p/check",
  text: "/p/check/text",
  photo: "/p/check/photo",
  voice: "/p/check/voice",
  rules: "/p/rules",
  phone: "/p/phone",
  happened: "/p/happened",
  pair: "/p/pair",
} as const;

export type ParentRoute = keyof typeof PARENT_ROUTES;

// What the person asked to check. A photo has no text until the check has read it.
export type CheckedInput = { kind: "text" | "voice"; text: string } | { kind: "image" };

export interface ParentEnv {
  circle: DeviceCircle;
  channel: FamilyChannel;
  go(route: ParentRoute): void;
  // Called instead of dialling, so the demo can explain what the call button would do.
  call(name: string, phone: string): void;
  autoRead: boolean;
  pollMs: number;
  // Let the demo panel follow the phone: what is being checked, and whether a result is showing.
  checkStarted?(input: CheckedInput): void;
  resultShown?(shown: boolean): void;
}

export const ParentEnvContext = createContext<ParentEnv | null>(null);

export function useParentEnv(): ParentEnv | null {
  return useContext(ParentEnvContext);
}
