import { BackLink } from "@/components/parent/BackLink";
import { GoldenRules } from "@/components/parent/GoldenRules";

export default function GoldenRulesPage() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <BackLink href="/p" />
      <GoldenRules headingLevel={1} />
    </main>
  );
}
