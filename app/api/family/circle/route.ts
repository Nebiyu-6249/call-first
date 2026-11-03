import { validateCircleSettings, validatePin } from "@/lib/circle/validate";
import { familyCode, hashPin } from "@/lib/server/crypto";
import { toFamilyCircle } from "@/lib/server/circle";
import { HttpError, clientIp, handle, readJson, requireFamily, requireSameOrigin } from "@/lib/server/http";
import { checkPin, pinErrorMessage } from "@/lib/server/pin";
import { hitRateLimit, rateLimitedResponse } from "@/lib/server/rate-limit";
import { clearSessionCookie, sessionCookie, signSession } from "@/lib/server/session";
import { getStore } from "@/lib/server/store";

// Create a circle. The person creating it gets a family session on this device.
export const POST = handle(async (request: Request) => {
  requireSameOrigin(request);
  const limit = await hitRateLimit(`create:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const body = await readJson(request);
  const settings = validateCircleSettings(body);
  if (!settings.ok) throw new HttpError(400, settings.errors.join(" "));
  const pinError = validatePin(body.pin);
  if (pinError) throw new HttpError(400, pinError);

  const store = getStore();
  const pinHash = await hashPin(body.pin as string);
  // Family codes are random; retry in the very unlikely case of a clash.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = familyCode();
    try {
      const id = await store.createCircle(code, pinHash, settings.value);
      return Response.json({ familyCode: code }, { status: 201, headers: { "Set-Cookie": sessionCookie(signSession(id)) } });
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new HttpError(500, "Could not create the circle.");
});

// Read the circle for the family screens (signed in).
export const GET = handle(async (request: Request) => {
  const circleId = await requireFamily(request);
  const store = getStore();
  const circle = await store.getCircle(circleId);
  if (!circle) throw new HttpError(401, "Please sign in.");
  const devices = await store.listDevices(circleId);
  return Response.json(
    { circle: toFamilyCircle(circle), devices: devices.map((d) => ({ id: d.id, createdAt: d.createdAt, lastSeenAt: d.lastSeenAt })) },
    { headers: { "Cache-Control": "no-store" } },
  );
});

// Change settings and contacts. The PIN is needed every time, even when signed in.
export const PUT = handle(async (request: Request) => {
  requireSameOrigin(request);
  const circleId = await requireFamily(request);
  const body = await readJson(request);
  const store = getStore();
  const circle = await store.getCircle(circleId);
  if (!circle) throw new HttpError(401, "Please sign in.");

  const pin = await checkPin(store, circle, String(body.pin ?? ""));
  if (!pin.ok) throw new HttpError(pin.reason === "locked" ? 429 : 403, pinErrorMessage(pin));

  const settings = validateCircleSettings(body);
  if (!settings.ok) throw new HttpError(400, settings.errors.join(" "));

  let newPinHash: string | null = null;
  if (typeof body.newPin === "string" && body.newPin !== "") {
    const pinError = validatePin(body.newPin);
    if (pinError) throw new HttpError(400, pinError);
    newPinHash = await hashPin(body.newPin);
  }

  await store.replaceSettings(circleId, settings.value, newPinHash);
  const updated = await store.getCircle(circleId);
  return Response.json({ circle: updated ? toFamilyCircle(updated) : null });
});

// Delete the circle and everything stored for it. Needs the PIN. Connected phones lose access.
export const DELETE = handle(async (request: Request) => {
  requireSameOrigin(request);
  const circleId = await requireFamily(request);
  const body = await readJson(request);
  const store = getStore();
  const circle = await store.getCircle(circleId);
  if (!circle) throw new HttpError(401, "Please sign in.");

  const pin = await checkPin(store, circle, String(body.pin ?? ""));
  if (!pin.ok) throw new HttpError(pin.reason === "locked" ? 429 : 403, pinErrorMessage(pin));

  await store.deleteCircle(circleId);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
});
