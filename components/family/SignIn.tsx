"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { familyApi } from "@/lib/family/api";
import { fButton, fInput, fLabel } from "./ui";

export function SignIn() {
  const router = useRouter();
  const [familyCode, setFamilyCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await familyApi.signIn(familyCode, pin);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setPin("");
      return;
    }
    router.push("/f/home");
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Sign in</h1>
      <form onSubmit={submit} className="flex max-w-md flex-col gap-4">
        <label className={fLabel}>
          Family code
          <input className={`${fInput} font-mono uppercase`} value={familyCode} onChange={(e) => setFamilyCode(e.target.value)} autoComplete="username" maxLength={12} />
        </label>
        <label className={fLabel}>
          PIN
          <input
            className={fInput}
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
        </label>
        {error && (
          <p role="alert" className="font-bold text-warning">
            {error}
          </p>
        )}
        <button type="submit" className={`${fButton} self-start`} disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p>
        Not set up yet?{" "}
        <Link href="/f/new" className="font-bold text-primary underline">
          Set up for someone
        </Link>
      </p>
    </main>
  );
}
