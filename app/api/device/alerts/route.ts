import { MAX_EXCERPT, MAX_SUMMARY } from "@/lib/circle/alerts";
import { ALERT_MASK_KINDS, maskText } from "@/lib/privacy/mask";
import { isFlagId } from "@/lib/rules/taxonomy";
import { ALERT_TTL_MS } from "@/lib/server/config";
import { HttpError, handle, readJson, requireDevice } from "@/lib/server/http";
import { hitRateLimit, rateLimitedResponse } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";
import type { VerdictLevel } from "@/lib/verdict";

const VERDICTS: VerdictLevel[] = ["WARNING", "NOT_SURE", "NO_WARNING_SIGNS"];

// The parent chose "Show my family". Stores only the summary and a short text excerpt.
export const POST = handle(async (request: Request) => {
  const store = getStore();
  const device = await requireDevice(request, store);
  const limit = await hitRateLimit(`alert:${device.id}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) return rateLimitedResponse(limit);

  const body = await readJson(request);
  const verdict = body.verdict as VerdictLevel;
  if (!VERDICTS.includes(verdict)) throw new HttpError(400, "Unknown verdict.");
  const summary = String(body.summary ?? "").trim().slice(0, MAX_SUMMARY);
  // The phone hides codes, card and account numbers; hide them again in case it is an older copy.
  const excerpt = maskText(String(body.excerpt ?? "").trim(), { kinds: ALERT_MASK_KINDS }).text.slice(0, MAX_EXCERPT);
  const flagIds = (Array.isArray(body.flagIds) ? body.flagIds : [])
    .filter((id): id is string => typeof id === "string" && (isFlagId(id) || id === "other"))
    .slice(0, 15);

  const id = await store.createAlert(device.circleId, device.id, { verdict, summary, excerpt, flagIds }, Date.now() + ALERT_TTL_MS);
  return Response.json({ id }, { status: 201 });
});
