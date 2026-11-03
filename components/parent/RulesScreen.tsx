"use client";

import { useParent } from "@/lib/parent/use-parent";
import { BackLink } from "./BackLink";
import { GoldenRules } from "./GoldenRules";
import { Screen } from "./nav";

export function RulesScreen() {
  const { circle } = useParent();
  return (
    <Screen className="flex flex-1 flex-col gap-6">
      <BackLink to="home" />
      <GoldenRules headingLevel={1} familyName={circle?.familyMembers[0]?.name} />
    </Screen>
  );
}
