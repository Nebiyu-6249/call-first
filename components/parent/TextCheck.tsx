"use client";

import { useState, type FormEvent } from "react";
import { ClipboardPaste, LoaderCircle, Search } from "lucide-react";
import type { ParentCircle } from "@/lib/circle/types";
import type { CheckResult } from "@/lib/check";
import { runCheck } from "@/lib/check/client";
import { MAX_TEXT_LENGTH } from "@/lib/check/request";
import { readCachedCircle } from "@/lib/parent/circle-cache";
import { BackLink } from "./BackLink";
import { ResultView } from "./ResultView";
import { primaryButton, secondaryButton } from "./styles";

// A short pause so the "checking" message can be read instead of flashing.
const MIN_CHECKING_MS = 900;

type Step =
  | { name: "input" }
  | { name: "checking" }
  | { name: "result"; result: CheckResult; circle: ParentCircle | null };

export function TextCheck() {
  const [step, setStep] = useState<Step>({ name: "input" });
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function paste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) {
        setText(clip.slice(0, MAX_TEXT_LENGTH));
        setError("");
        return;
      }
      setError("There was nothing to paste. Copy the message first.");
    } catch {
      setError("Could not paste. Press and hold inside the box, then choose Paste.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError("Please type or paste the message first.");
      return;
    }
    setError("");
    setStep({ name: "checking" });
    const [result] = await Promise.all([
      runCheck({ type: "text", text }),
      new Promise((resolve) => setTimeout(resolve, MIN_CHECKING_MS)),
    ]);
    setStep({ name: "result", result, circle: readCachedCircle() });
  }

  function reset() {
    setText("");
    setStep({ name: "input" });
  }

  if (step.name === "checking") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
        <LoaderCircle aria-hidden="true" className="size-16 text-primary motion-safe:animate-spin" />
        <p role="status" className="text-3xl font-bold">
          Taking a careful look...
        </p>
      </main>
    );
  }

  if (step.name === "result") {
    return (
      <main className="flex flex-1 flex-col">
        <ResultView result={step.result} circle={step.circle} onCheckAnother={reset} />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <BackLink href="/p/check" />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <label htmlFor="message" className="text-3xl font-bold">
          Type or paste the message
        </label>
        <textarea
          id="message"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT_LENGTH}
          rows={7}
          aria-describedby={error ? "message-error" : undefined}
          aria-invalid={error ? true : undefined}
          className="w-full rounded-2xl border-4 border-border bg-surface p-4 text-xl"
        />
        {error && (
          <p id="message-error" role="alert" className="text-xl font-bold text-warning">
            {error}
          </p>
        )}
        <button type="button" onClick={paste} className={secondaryButton}>
          <ClipboardPaste aria-hidden="true" className="size-7" />
          Paste the message
        </button>
        <button type="submit" className={primaryButton}>
          <Search aria-hidden="true" className="size-7" />
          Check it
        </button>
      </form>
    </main>
  );
}
