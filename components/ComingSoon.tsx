import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Temporary placeholder for screens that later build phases fill in.
export function ComingSoon({ title, backHref = "/" }: { title: string; backHref?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="text-xl text-muted">This screen is not built yet.</p>
      <Link href={backHref} className="flex min-h-16 items-center gap-3 text-xl font-bold text-primary underline">
        <ArrowLeft aria-hidden="true" className="size-7" />
        Back
      </Link>
    </main>
  );
}
