import type { Metadata } from "next";
import { OnThePhone } from "@/components/parent/OnThePhone";

export const metadata: Metadata = { title: "Someone is on the phone with me now" };

export default function OnThePhonePage() {
  return <OnThePhone />;
}
