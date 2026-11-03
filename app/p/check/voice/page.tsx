import type { Metadata } from "next";
import { VoiceCheck } from "@/components/parent/VoiceCheck";

export const metadata: Metadata = { title: "Tell me what happened" };

export default function VoiceCheckPage() {
  return <VoiceCheck />;
}
