import type { Metadata } from "next";
import { RulesScreen } from "@/components/parent/RulesScreen";

export const metadata: Metadata = { title: "Golden Rules" };

export default function GoldenRulesPage() {
  return <RulesScreen />;
}
