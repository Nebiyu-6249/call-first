import { HttpError, handle, requireDevice } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

// The parent's phone checks for the family's reply (every few seconds while waiting).
export const GET = handle(async (request: Request, ctx: RouteContext<"/api/device/alerts/[id]">) => {
  const store = getStore();
  const device = await requireDevice(request, store);
  const { id } = await ctx.params;
  const alert = await store.getAlert(device.circleId, id);
  if (!alert) throw new HttpError(404, "This alert has expired.");
  return Response.json({ reply: alert.reply }, { headers: { "Cache-Control": "no-store" } });
});
