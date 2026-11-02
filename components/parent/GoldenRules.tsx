import { BookOpenCheck } from "lucide-react";
import { DEFAULT_FAMILY_NAME } from "@/lib/verdict/copy";

export function goldenRules(familyName: string = DEFAULT_FAMILY_NAME): string[] {
  return [
    "Never share a code sent to your phone.",
    "Never pay because a message rushes you.",
    "Never call a number or tap a link from the message.",
    `When in doubt, call ${familyName}.`,
  ];
}

export function GoldenRules({
  familyName,
  headingLevel = 2,
}: {
  familyName?: string;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section aria-labelledby="golden-rules" className="rounded-2xl border-4 border-primary bg-surface p-5">
      <Heading id="golden-rules" className="flex items-center gap-3 text-2xl font-bold">
        <BookOpenCheck aria-hidden="true" className="size-8 shrink-0 text-primary" />
        Golden Rules
      </Heading>
      <ol className="mt-4 flex list-decimal flex-col gap-3 pl-8 text-xl">
        {goldenRules(familyName).map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
    </section>
  );
}
