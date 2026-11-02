import { HttpError, handle, readJson, requireFamily, requireSameOrigin } from "@/lib/server/http";
import { checkPin, pinErrorMessage } from "@/lib/server/pin";
import { getStore } from "@/lib/server/store";

// Disconnect a parent phone (for example if it is lost). Needs the PIN.
export const DELETE = handle(async (request: Request, ctx: RouteContext<"/api/family/devices/[id]">) => {
  requireSameOrigin(request);
  const circleId = requireFamily(request);
  const { id } = await ctx.params;
  const body = await readJson(request);
  const store = getStore();
  const circle = await store.getCircle(circleId);
  if (!circle) throw new HttpError(401, "Please sign in.");

  const pin = await checkPin(store, circle, String(body.pin ?? ""));
  if (!pin.ok) throw new HttpError(pin.reason === "locked" ? 429 : 403, pinErrorMessage(pin));

  if (!(await store.revokeDevice(circleId, id))) throw new HttpError(404, "That phone is not connected.");
  return Response.json({ ok: true });
});
