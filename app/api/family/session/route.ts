import { normaliseFamilyCode } from "@/lib/server/crypto";
import { HttpError, clientIp, handle, readJson, requireSameOrigin } from "@/lib/server/http";
import { checkPin, pinErrorMessage } from "@/lib/server/pin";
import { hitRateLimit, rateLimitedResponse } from "@/lib/server/rate-limit";
import { clearSessionCookie, sessionCookie, signSession } from "@/lib/server/session";
import { getStore } from "@/lib/server/store";

// Sign in on a family device with the family code and the PIN.
export const POST = handle(async (request: Request) => {
  requireSameOrigin(request);
  const limit = await hitRateLimit(`signin:${clientIp(request)}`, 20, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const body = await readJson(request);
  const code = normaliseFamilyCode(String(body.familyCode ?? ""));
  const store = getStore();
  const circleId = code ? await store.getCircleIdByFamilyCode(code) : null;
  const circle = circleId ? await store.getCircle(circleId) : null;
  if (!circle) throw new HttpError(403, "That family code or PIN is not right.");

  const pin = await checkPin(store, circle, String(body.pin ?? ""));
  if (!pin.ok) throw new HttpError(pin.reason === "locked" ? 429 : 403, pinErrorMessage(pin));

  return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(signSession(circle.id)) } });
});

export const DELETE = handle(async (request: Request) => {
  requireSameOrigin(request);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
});
