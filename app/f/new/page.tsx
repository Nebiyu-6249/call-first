import type { Metadata } from "next";
import { CreateCircle } from "@/components/family/CreateCircle";

export const metadata: Metadata = { title: "Set up for someone" };

export default function NewCirclePage() {
  return <CreateCircle />;
}
