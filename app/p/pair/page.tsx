import { Suspense } from "react";
import { PairDevice } from "@/components/parent/PairDevice";

export default function PairPage() {
  return (
    <Suspense>
      <PairDevice />
    </Suspense>
  );
}
