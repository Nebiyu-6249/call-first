"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { familyApi, formatFamilyCode } from "@/lib/family/api";
import { CircleForm } from "./CircleForm";
import { fButton, fCard } from "./ui";

export function CreateCircle() {
  const [familyCode, setFamilyCode] = useState<string | null>(null);

  if (familyCode) {
    return (
      <main className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold">All set up</h1>
        <div className={fCard}>
          <p>Your family code is</p>
          <p className="my-2 font-mono text-4xl font-bold tracking-widest">{formatFamilyCode(familyCode)}</p>
          <p>Write it down. You need it with your PIN to sign in on another phone or computer.</p>
        </div>
        <p>Next, connect their phone so they can check messages and ask you for help.</p>
        <Link href="/f/home" className={`${fButton} self-start`}>
          Connect their phone
          <ArrowRight aria-hidden="true" className="size-5" />
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Set up for someone</h1>
      <p>This takes about five minutes. You can change everything later.</p>
      <CircleForm
        mode="create"
        submitLabel="Create"
        onSubmit={async (values) => {
          const res = await familyApi.create(values);
          if (!res.ok) return res.error;
          setFamilyCode(res.data.familyCode);
          window.scrollTo({ top: 0 });
          return null;
        }}
      />
    </main>
  );
}
