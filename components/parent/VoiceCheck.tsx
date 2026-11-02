"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Keyboard, Mic, RotateCcw, Square } from "lucide-react";
import type { ParentCircle } from "@/lib/circle/types";
import type { CheckResult } from "@/lib/check";
import { runCheck } from "@/lib/check/client";
import { readCachedCircle } from "@/lib/parent/circle-cache";
import { MAX_RECORDING_SECONDS, RECORDING_TYPES } from "@/lib/voice/audio";
import { transcribe } from "@/lib/voice/client";
import { BackLink } from "./BackLink";
import { CheckingScreen, atLeast } from "./CheckingScreen";
import { ResultView } from "./ResultView";
import { primaryButton, secondaryButton } from "./styles";

type Problem = "unsupported" | "denied" | "failed" | "empty";

type Step =
  | { name: "intro" }
  | { name: "recording" }
  | { name: "transcribing" }
  | { name: "checking" }
  | { name: "problem"; problem: Problem }
  | { name: "result"; result: CheckResult; transcript: string; circle: ParentCircle | null };

const PROBLEM_TEXT: Record<Problem, string> = {
  unsupported: "This phone or browser cannot record your voice. You can type what happened instead.",
  denied: "We could not use the microphone. You can allow it in your settings, or type what happened instead.",
  failed: "Sorry, we could not write down what you said. Please try again, or type it instead.",
  empty: "We could not hear anything. Please try again and speak close to the phone.",
};

export function VoiceCheck() {
  const [step, setStep] = useState<Step>({ name: "intro" });
  const [secondsLeft, setSecondsLeft] = useState(MAX_RECORDING_SECONDS);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  function releaseMicrophone() {
    if (tickRef.current !== null) window.clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  // Turn the microphone off if the person leaves the screen while recording.
  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.onstop = null;
        if (recorder.state === "recording") recorder.stop();
      }
      releaseMicrophone();
    };
  }, []);

  async function finish(audio: Blob) {
    setStep({ name: "transcribing" });
    // The recording is sent once for transcription and then dropped.
    const transcript = await transcribe(audio);
    if (transcript === null) return setStep({ name: "problem", problem: "failed" });
    if (!transcript.trim()) return setStep({ name: "problem", problem: "empty" });
    setStep({ name: "checking" });
    const result = await atLeast(runCheck({ type: "call_description", text: transcript }));
    setStep({ name: "result", result, transcript, circle: readCachedCircle() });
  }

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return setStep({ name: "problem", problem: "unsupported" });
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setStep({ name: "problem", problem: "denied" });
    }
    streamRef.current = stream;

    const mimeType = RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      releaseMicrophone();
      void finish(new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" }));
    };
    recorderRef.current = recorder;
    recorder.start();

    const startedAt = Date.now();
    setSecondsLeft(MAX_RECORDING_SECONDS);
    setStep({ name: "recording" });
    tickRef.current = window.setInterval(() => {
      const left = MAX_RECORDING_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      setSecondsLeft(Math.max(0, left));
      if (left <= 0) stop();
    }, 250);
  }

  function reset() {
    setStep({ name: "intro" });
  }

  if (step.name === "transcribing") return <CheckingScreen message="Writing down what you said..." />;
  if (step.name === "checking") return <CheckingScreen />;

  if (step.name === "result") {
    return (
      <main className="flex flex-1 flex-col">
        <ResultView
          result={step.result}
          circle={step.circle}
          source={{ kind: "voice", text: step.transcript }}
          onCheckAnother={reset}
        />
      </main>
    );
  }

  if (step.name === "recording") {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Mic aria-hidden="true" className="size-10 shrink-0 text-warning motion-safe:animate-pulse" />
          Listening...
        </h1>
        <p className="text-xl">Tell me who called, what they said, and what they asked you to do.</p>
        <p className="text-2xl font-bold" aria-hidden="true">
          {secondsLeft} seconds left
        </p>
        <button type="button" onClick={stop} className={`${primaryButton} min-h-24 text-2xl`}>
          <Square aria-hidden="true" className="size-8" />
          I have finished
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <BackLink href="/p/check" />
      <h1 className="text-3xl font-bold">Tell me what happened</h1>

      {step.name === "problem" ? (
        <p role="alert" className="text-xl font-bold text-warning">
          {PROBLEM_TEXT[step.problem]}
        </p>
      ) : (
        <ul className="flex list-disc flex-col gap-2 pl-8 text-xl">
          <li>Who called you?</li>
          <li>What did they say?</li>
          <li>What did they ask you to do?</li>
        </ul>
      )}

      {!(step.name === "problem" && step.problem === "unsupported") && (
        <button type="button" onClick={start} className={`${primaryButton} min-h-24 text-2xl`}>
          {step.name === "problem" ? (
            <RotateCcw aria-hidden="true" className="size-8" />
          ) : (
            <Mic aria-hidden="true" className="size-8" />
          )}
          {step.name === "problem" ? "Try again" : "Start talking"}
        </button>
      )}

      <Link href="/p/check/text" className={secondaryButton}>
        <Keyboard aria-hidden="true" className="size-7" />
        Type it instead
      </Link>

      <p className="text-lg text-muted">
        You can talk for up to {MAX_RECORDING_SECONDS} seconds. Your voice is turned into words and then checked. The
        recording is not saved.
      </p>
    </main>
  );
}
