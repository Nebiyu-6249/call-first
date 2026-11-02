import { transcribeAudio } from "@/lib/ai/transcribe";
import { MAX_AUDIO_BYTES, audioExtension } from "@/lib/voice/audio";

// Turns the parent's recorded description of a call into text. The audio is not stored.
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected form data." }, { status: 400 });
  }
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: "Audio is required." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) return Response.json({ error: "The recording is too long." }, { status: 400 });
  const extension = audioExtension(audio.type);
  if (!extension) return Response.json({ error: "This audio format is not supported." }, { status: 400 });

  const outcome = await transcribeAudio(audio, `speech.${extension}`);
  if (!outcome.ok) return Response.json({ error: "Could not transcribe." }, { status: 502 });
  return Response.json({ text: outcome.text }, { headers: { "Cache-Control": "no-store" } });
}
