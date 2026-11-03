"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ClipboardPaste, Search } from "lucide-react";
import type { CheckResult } from "@/lib/check";
import { runCheck } from "@/lib/check/client";
import { MAX_TEXT_LENGTH } from "@/lib/check/request";
import { useParent } from "@/lib/parent/use-parent";
import { BackLink } from "./BackLink";
import { CheckingScreen, atLeast } from "./CheckingScreen";
import { Screen } from "./nav";
import { ResultView } from "./ResultView";
import { primaryButton, secondaryButton } from "./styles";

type Step =
  | { name: "input" }
  | { name: "checking" }
  | { name: "result"; result: CheckResult };

// The demo passes a sample message and checks it straight away, as if it had been pasted.
export function TextCheck({ initialText = "", checkNow = false }: { initialText?: string; checkNow?: boolean }) {
  const { circle, channel } = useParent();
  const [step, setStep] = useState<Step>(checkNow && initialText.trim() ? { name: "checking" } : { name: "input" });
  const [text, setText] = useState(initialText);
  const [error, setError] = useState("");
  const startedRef = useRef(false);

  async function check(message: string) {
    setError("");
    setStep({ name: "checking" });
    const result = await atLeast(runCheck({ type: "text", text: message }));
    setStep({ name: "result", result });
  }

  useEffect(() => {
    if (startedRef.current || !checkNow || !initialText.trim()) return;
    startedRef.current = true;
    void check(initialText);
  }, [checkNow, initialText]);

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

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError("Please type or paste the message first.");
      return;
    }
    void check(text);
  }

  function reset() {
    setText("");
    setStep({ name: "input" });
  }

  if (step.name === "checking") return <CheckingScreen />;

  if (step.name === "result") {
    return (
      <Screen className="flex flex-1 flex-col">
        <ResultView result={step.result} circle={circle} channel={channel} onCheckAnother={reset} />
      </Screen>
    );
  }

  return (
    <Screen className="flex flex-1 flex-col gap-6">
      <BackLink to="check" />
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <h1 className="text-3xl font-bold">
          <label htmlFor="message">Type or paste the message</label>
        </h1>
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
    </Screen>
  );
}
