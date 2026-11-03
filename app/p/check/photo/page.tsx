import type { Metadata } from "next";
import { PhotoCheck } from "@/components/parent/PhotoCheck";

export const metadata: Metadata = { title: "Photo or screenshot" };

export default function PhotoCheckPage() {
  return <PhotoCheck />;
}
