import type { Metadata } from "next";
import { ChooseInput } from "@/components/parent/ChooseInput";

export const metadata: Metadata = { title: "What do you want to check?" };

export default function ChooseInputPage() {
  return <ChooseInput />;
}
