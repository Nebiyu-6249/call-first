// Audio formats for recording on the device and accepting on the server.
// The speech-to-text API accepts mp3, mp4, mpeg, mpga, m4a, wav and webm.

export const MAX_RECORDING_SECONDS = 60;
// A minute of compressed speech is well under 1 MB; this leaves plenty of room.
export const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

// In order of preference. Chrome and Firefox record webm; Safari records mp4.
export const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav"];

const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
};

// Returns the file extension for a supported audio type, or null if it is not supported.
export function audioExtension(mimeType: string): string | null {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  return EXTENSIONS[base] ?? null;
}
