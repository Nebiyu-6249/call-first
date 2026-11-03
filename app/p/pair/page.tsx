import type { Metadata } from "next";
import { Suspense } from "react";
import { PairDevice } from "@/components/parent/PairDevice";

export const metadata: Metadata = { title: "Connect to your family" };

export default function PairPage() {
  return (
    <Suspense>
      <PairDevice />
    </Suspense>
  );
}
