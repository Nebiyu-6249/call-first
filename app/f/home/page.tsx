import type { Metadata } from "next";
import { FamilyHome } from "@/components/family/FamilyHome";

export const metadata: Metadata = { title: "Messages" };

export default function FamilyHomePage() {
  return <FamilyHome />;
}
