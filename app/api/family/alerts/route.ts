import { inboxOrder } from "@/lib/circle/alerts";
import { handle, requireFamily } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

// The family's inbox. Expired alerts are removed first. URGENT alerts waiting for a reply come first.
export const GET = handle(async (request: Request) => {
  const circleId = await requireFamily(request);
  const alerts = await getStore().listAlerts(circleId);
  return Response.json({ alerts: inboxOrder(alerts) }, { headers: { "Cache-Control": "no-store" } });
});
