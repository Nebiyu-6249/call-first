import Link from "next/link";
import { DISCLAIMER } from "@/lib/config";

export default function FamilyLayout({ children }: LayoutProps<"/f">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 text-lg">
      <div className="flex flex-1 flex-col">{children}</div>
      <footer className="mt-10 flex flex-col gap-2 border-t-2 border-border pt-4 text-base text-muted">
        <p>{DISCLAIMER} It is not an emergency service.</p>
        <Link href="/privacy" className="inline-flex min-h-11 items-center self-start font-bold text-primary underline underline-offset-4">
          Privacy and limits
        </Link>
      </footer>
    </div>
  );
}
