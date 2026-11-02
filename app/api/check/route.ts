import { analyse } from "@/lib/ai/openai";
import { parseCheckRequest, type CheckApiResponse } from "@/lib/check/request";

// Returns only the AI analysis. The rules engine and the verdict run on the device, so a
// result is still possible when this call fails.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const input = parseCheckRequest(body);
  if (typeof input === "string") return Response.json({ error: input }, { status: 400 });

  const outcome = await analyse(input);
  const payload: CheckApiResponse = outcome.ok ? { aiStatus: "ok", ai: outcome.analysis } : { aiStatus: "failed" };
  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
