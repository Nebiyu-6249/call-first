import { analyse } from "@/lib/ai/openai";
import { parseCheckRequest, type CheckApiResponse } from "@/lib/check/request";
import { maskText } from "@/lib/privacy/mask";
import { rateLimitPerHour } from "@/lib/server/config";
import { clientIp } from "@/lib/server/http";
import { hitRateLimit, rateLimitedResponse } from "@/lib/server/rate-limit";

// Returns only the AI analysis. The rules engine and the verdict run on the device, so a
// result is still possible when this call fails.
export async function POST(request: Request) {
  // Protects the AI key. When limited, the device falls back to the rules-only result.
  const limit = await hitRateLimit(`ai:${clientIp(request)}`, rateLimitPerHour(), 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitedResponse(limit);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const parsed = parseCheckRequest(body);
  if (typeof parsed === "string") return Response.json({ error: parsed }, { status: 400 });

  // The phone has already hidden personal details. Hide them again here, without the family's
  // names, in case an older copy of the app is still cached on a phone.
  const input = parsed.kind === "image" ? parsed : { ...parsed, text: maskText(parsed.text).text };
  const outcome = await analyse(input);
  const payload: CheckApiResponse = outcome.ok ? { aiStatus: "ok", ai: outcome.analysis } : { aiStatus: "failed" };
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
