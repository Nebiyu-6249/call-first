"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, Home, Link2 } from "lucide-react";
import { pairDevice } from "@/lib/parent/device";
import { BackLink } from "./BackLink";
import { primaryButton } from "./styles";

export function PairDevice() {
  // The QR code opens /p/pair?code=123456, so the code is already filled in.
  const fromLink = (useSearchParams().get("code") ?? "").replace(/\D/g, "").slice(0, 6);
  const [code, setCode] = useState(fromLink);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectedTo, setConnectedTo] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6) return setError("The code has 6 numbers.");
    setBusy(true);
    setError("");
    const res = await pairDevice(code);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setConnectedTo(res.circle.familyMembers[0]?.name ?? "your family");
  }

  if (connectedTo) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold" tabIndex={-1}>
          <CircleCheck aria-hidden="true" className="size-10 shrink-0 text-ok" />
          You are connected
        </h1>
        <p className="text-xl">When you check something, you can show it to {connectedTo} with one tap.</p>
        <Link href="/p" className={primaryButton}>
          <Home aria-hidden="true" className="size-7" />
          Go to the start
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <BackLink to="home" />
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <h1 className="text-3xl font-bold">
          <label htmlFor="pair-code">Type the 6 numbers from your family</label>
        </h1>
        <input
          id="pair-code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          aria-describedby={error ? "pair-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="w-full rounded-2xl border-4 border-border bg-surface p-4 text-center font-mono text-4xl tracking-[0.4em]"
        />
        {error && (
          <p id="pair-error" role="alert" className="text-xl font-bold text-warning">
            {error}
          </p>
        )}
        <button type="submit" className={primaryButton} disabled={busy}>
          <Link2 aria-hidden="true" className="size-7" />
          {busy ? "Connecting..." : "Connect"}
        </button>
      </form>
    </main>
  );
}
