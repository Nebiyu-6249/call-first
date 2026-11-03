import { PAIRING_CODE_TTL_MS, sessionSecret } from "@/lib/server/config";
import { keyedHash, sixDigitCode } from "@/lib/server/crypto";
import { HttpError, handle, requireFamily, requireSameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

// Make a one-time 6-digit code (valid 15 minutes) to connect the parent's phone.
export const POST = handle(async (request: Request) => {
  requireSameOrigin(request);
  const circleId = await requireFamily(request);
  const store = getStore();
  const expiresAt = Date.now() + PAIRING_CODE_TTL_MS;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = sixDigitCode();
    try {
      await store.createPairingCode(circleId, keyedHash(code, sessionSecret()), expiresAt);
      return Response.json({ code, expiresAt: new Date(expiresAt).toISOString() }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      // Another circle has the same unused code right now; pick another.
    }
  }
  throw new HttpError(500, "Could not make a code. Please try again.");
});
