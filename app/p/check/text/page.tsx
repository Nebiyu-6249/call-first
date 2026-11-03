import type { Metadata } from "next";
import { TextCheck } from "@/components/parent/TextCheck";

export const metadata: Metadata = { title: "Type or paste" };

export default function TextCheckPage() {
  return <TextCheck />;
}
