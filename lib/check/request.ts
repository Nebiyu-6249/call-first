// The /api/check request and response shapes, shared by the route handler and the client.

import type { AiAnalysis } from "@/lib/ai/schema";

export type CheckRequest =
  | { type: "text" | "call_description"; text: string }
  | { type: "image"; image: string };

export type CheckApiResponse = { aiStatus: "ok"; ai: AiAnalysis } | { aiStatus: "failed" };

export type ValidInput =
  | { kind: "text" | "call_description"; text: string }
  | { kind: "image"; imageDataUrl: string };

export const MAX_TEXT_LENGTH = 5000;
// About 3 MB of image data once decoded; compressed screenshots are far smaller.
export const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

// Returns the validated input, or an error message.
export function parseCheckRequest(body: unknown): ValidInput | string {
  if (!body || typeof body !== "object") return "Expected a JSON object.";
  const { type, text, image } = body as Record<string, unknown>;
  if (type === "text" || type === "call_description") {
    if (typeof text !== "string" || !text.trim()) return "Text is required.";
    if (text.length > MAX_TEXT_LENGTH) return "Text is too long.";
    return { kind: type, text };
  }
  if (type === "image") {
    if (typeof image !== "string" || image.length > MAX_IMAGE_DATA_URL_LENGTH || !IMAGE_DATA_URL.test(image)) {
      return "A JPEG, PNG or WEBP image is required.";
    }
    return { kind: "image", imageDataUrl: image };
  }
  return "Unknown input type.";
}
