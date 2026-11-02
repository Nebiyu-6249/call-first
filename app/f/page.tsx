import Link from "next/link";
import { LogIn, UserPlus } from "lucide-react";
import { fButton, fButtonSecondary } from "@/components/family/ui";
import { APP_NAME } from "@/lib/config";

export default function FamilyStart() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">{APP_NAME} for families</h1>
      <p>
        You set things up, so your parent or relative never has to. You save the real numbers for their bank and family,
        connect their phone, and get a message when they ask you to look at something.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/f/new" className={fButton}>
          <UserPlus aria-hidden="true" className="size-5" />
          Set up for someone
        </Link>
        <Link href="/f/signin" className={fButtonSecondary}>
          <LogIn aria-hidden="true" className="size-5" />
          Sign in
        </Link>
      </div>
    </main>
  );
}
