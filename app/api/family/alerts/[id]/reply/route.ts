import { REPLY_KINDS, replyText, type ReplyKind } from "@/lib/circle/alerts";
import { HttpError, handle, readJson, requireFamily, requireSameOrigin } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const POST = handle(async (request: Request, ctx: RouteContext<"/api/family/alerts/[id]/reply">) => {
  requireSameOrigin(request);
  const circleId = requireFamily(request);
  const { id } = await ctx.params;
  const body = await readJson(request);
  const kind = body.kind as ReplyKind;
  if (!REPLY_KINDS.includes(kind)) throw new HttpError(400, "Unknown reply.");
  const text = replyText(kind, typeof body.text === "string" ? body.text : "");
  if (!text) throw new HttpError(400, "Write a short reply first.");

  const ok = await getStore().replyToAlert(circleId, id, kind, text);
  if (!ok) throw new HttpError(404, "This alert has expired or does not exist.");
  return Response.json({ ok: true });
});
