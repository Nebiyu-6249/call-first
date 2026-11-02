import { toDeviceCircle } from "@/lib/server/circle";
import { sessionSecret } from "@/lib/server/config";
import { keyedHash, randomToken, sha256 } from "@/lib/server/crypto";
import { HttpError, clientIp, handle, readJson } from "@/lib/server/http";
import { hitRateLimit, rateLimitedResponse } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";

// The parent's phone swaps a 6-digit pairing code for a random device token.
// Only a hash of the token is stored; the phone keeps the token itself.
export const POST = handle(async (request: Request) => {
  // Few tries per address, so the 6-digit codes cannot be guessed.
  const limit = await hitRateLimit(`pair:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const body = await readJson(request);
  const code = String(body.code ?? "").replace(/\D/g, "");
  if (code.length !== 6) throw new HttpError(400, "The code has 6 numbers.");

  const store = getStore();
  const circleId = await store.consumePairingCode(keyedHash(code, sessionSecret()));
  const circle = circleId ? await store.getCircle(circleId) : null;
  if (!circle) throw new HttpError(404, "That code did not work. Ask your family for a new one.");

  const token = randomToken();
  await store.createDevice(circle.id, sha256(token));
  return Response.json({ deviceToken: token, circle: toDeviceCircle(circle) }, { headers: { "Cache-Control": "no-store" } });
});
