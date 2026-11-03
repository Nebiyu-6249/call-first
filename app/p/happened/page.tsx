import type { Metadata } from "next";
import { SomethingHappened } from "@/components/parent/SomethingHappened";

export const metadata: Metadata = { title: "Something already happened" };

export default function SomethingHappenedPage() {
  return <SomethingHappened />;
}
