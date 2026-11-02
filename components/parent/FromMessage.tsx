import { Ban } from "lucide-react";

// Numbers and links from the message, shown as plain text. Never make these clickable.
export function FromMessage({ phoneNumbers, links }: { phoneNumbers: string[]; links: string[] }) {
  const items = [...phoneNumbers, ...links];
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="from-message" className="rounded-2xl border-2 border-border bg-surface p-5">
      <h2 id="from-message" className="flex items-center gap-3 text-xl font-bold">
        <Ban aria-hidden="true" className="size-7 shrink-0 text-warning" />
        This came from the message. Do not call it or tap it.
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="select-all break-all font-mono text-lg">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
