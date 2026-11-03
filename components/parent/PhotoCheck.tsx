"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Camera, ImageUp, RotateCcw, Search } from "lucide-react";
import type { CheckResult } from "@/lib/check";
import { runCheck } from "@/lib/check/client";
import { compressImage } from "@/lib/image/compress";
import { useParentEnv } from "@/lib/parent/env";
import { useParent } from "@/lib/parent/use-parent";
import { BackLink } from "./BackLink";
import { Screen } from "./nav";
import { CheckingScreen, atLeast } from "./CheckingScreen";
import { PrivateModeOff } from "./PrivateModeOff";
import { ResultView } from "./ResultView";
import { primaryButton, secondaryButton } from "./styles";

type Step =
  | { name: "choose" }
  | { name: "preparing" }
  | { name: "preview"; image: string }
  | { name: "checking" }
  | { name: "result"; result: CheckResult };

export function PhotoCheck() {
  const { circle, channel } = useParent();
  const env = useParentEnv();
  const [step, setStep] = useState<Step>({ name: "choose" });
  const [error, setError] = useState("");
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Let the same file be chosen again later.
    event.target.value = "";
    if (!file) return;
    setError("");
    setStep({ name: "preparing" });
    try {
      // The picture stays in memory only. It is never saved on the device or the server.
      setStep({ name: "preview", image: await compressImage(file) });
    } catch {
      setError("Sorry, we could not open that picture. Please try another one.");
      setStep({ name: "choose" });
    }
  }

  async function check(image: string) {
    setStep({ name: "checking" });
    env?.checkStarted?.({ kind: "image" });
    const result = await atLeast(runCheck({ type: "image", image }, circle));
    setStep({ name: "result", result });
  }

  function reset() {
    setError("");
    setStep({ name: "choose" });
  }

  if (circle?.privateMode) return <PrivateModeOff title="Photo or screenshot" />;
  if (step.name === "preparing") return <CheckingScreen message="Getting the picture ready..." />;
  if (step.name === "checking") return <CheckingScreen />;

  if (step.name === "result") {
    return (
      <Screen className="flex flex-1 flex-col">
        <ResultView
          result={step.result}
          circle={circle}
          channel={channel}
          source={{ kind: "image", text: step.result.checkedText }}
          onCheckAnother={reset}
        />
      </Screen>
    );
  }

  if (step.name === "preview") {
    return (
      <Screen className="flex flex-1 flex-col gap-6">
        <h1 className="text-3xl font-bold">Is this the right picture?</h1>
        {/* eslint-disable-next-line @next/next/no-img-element -- a local preview, never uploaded anywhere but the check */}
        <img
          src={step.image}
          alt="The picture you chose"
          className="max-h-[60vh] w-full rounded-2xl border-4 border-border bg-surface object-contain"
        />
        <button type="button" onClick={() => check(step.image)} className={primaryButton}>
          <Search aria-hidden="true" className="size-7" />
          Check this picture
        </button>
        <button type="button" onClick={reset} className={secondaryButton}>
          <RotateCcw aria-hidden="true" className="size-7" />
          Choose another
        </button>
      </Screen>
    );
  }

  return (
    <Screen className="flex flex-1 flex-col gap-6">
      <BackLink to="check" />
      <h1 className="text-3xl font-bold">Photo or screenshot</h1>
      <p className="text-xl">Take a photo of the letter or screen, or choose a screenshot you already have.</p>

      {error && (
        <p role="alert" className="text-xl font-bold text-warning">
          {error}
        </p>
      )}

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" onChange={onFile} hidden />
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} hidden />

      <button type="button" onClick={() => cameraInput.current?.click()} className={primaryButton}>
        <Camera aria-hidden="true" className="size-7" />
        Take a photo
      </button>
      <button type="button" onClick={() => fileInput.current?.click()} className={secondaryButton}>
        <ImageUp aria-hidden="true" className="size-7" />
        Choose a screenshot
      </button>

      <p className="text-xl font-bold">
        The picture is sent to an AI service to read it. If it shows a card number, cover it first.
      </p>
      <p className="text-lg text-muted">
        The picture is made smaller and its location details are removed before it is sent. It is not saved.
      </p>
    </Screen>
  );
}
