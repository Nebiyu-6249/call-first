import { toDeviceCircle } from "@/lib/server/circle";
import { HttpError, handle, requireDevice } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

// The parent's phone can read its circle's names and verified numbers. It cannot change them.
export const GET = handle(async (request: Request) => {
  const store = getStore();
  const device = await requireDevice(request, store);
  const circle = await store.getCircle(device.circleId);
  if (!circle) throw new HttpError(401, "This phone is not connected.");
  return Response.json({ circle: toDeviceCircle(circle) }, { headers: { "Cache-Control": "no-store" } });
});
