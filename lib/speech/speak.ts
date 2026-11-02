// Reads text aloud with the browser's built-in voice. Nothing is sent anywhere.

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

// Some browsers stop long utterances part way, so speak one sentence at a time.
function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const preferred = navigator.language?.toLowerCase().startsWith("en") ? navigator.language : "en-GB";
  return (
    voices.find((v) => v.lang === preferred && v.localService) ??
    voices.find((v) => v.lang === preferred) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en"))
  );
}

// Starts reading and returns a function that stops it.
export function speak(text: string, handlers: { onStart?: () => void; onEnd?: () => void } = {}): () => void {
  if (!canSpeak()) return () => {};
  const synth = window.speechSynthesis;
  synth.cancel();

  const sentences = splitSentences(text);
  const voice = pickVoice();
  let stopped = false;

  sentences.forEach((sentence, i) => {
    const utterance = new SpeechSynthesisUtterance(sentence);
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "en-GB";
    // A little slower than normal, for easier listening.
    utterance.rate = 0.9;
    if (i === 0) utterance.onstart = () => handlers.onStart?.();
    if (i === sentences.length - 1) {
      utterance.onend = () => handlers.onEnd?.();
    }
    utterance.onerror = () => {
      if (!stopped) handlers.onEnd?.();
    };
    synth.speak(utterance);
  });

  return () => {
    stopped = true;
    synth.cancel();
    handlers.onEnd?.();
  };
}
