// Browser side of a check: hide personal details, call /api/check, and fall back to the rules
// alone if it fails. In private mode nothing is sent at all.

import type { DeviceCircle } from "@/lib/circle/types";
import { circleNames, maskText, unmaskAnalysis } from "@/lib/privacy/mask";
import { buildCheckResult, type CheckResult, type SentToAi } from "./index";
import type { CheckApiResponse, CheckRequest } from "./request";

// A little longer than the server's own AI timeout, to allow for the network.
const CLIENT_TIMEOUT_MS = 12000;

export async function runCheck(request: CheckRequest, circle: DeviceCircle | null = null): Promise<CheckResult> {
  // The rules always run on the original text, on the phone.
  const text = request.type === "image" ? "" : request.text;
  if (circle?.privateMode) return buildCheckResult(text, null, "skipped");

  const masked = request.type === "image" ? null : maskText(request.text, { names: circleNames(circle) });
  const body: CheckRequest = request.type === "image" ? request : { type: request.type, text: masked!.text };
  const sent: SentToAi = masked ? { kind: "text", text: masked.text } : { kind: "image" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return buildCheckResult(text, null, "failed", sent);
    const data = (await res.json()) as CheckApiResponse;
    if (data.aiStatus !== "ok") return buildCheckResult(text, null, "failed", sent);
    const ai = masked ? unmaskAnalysis(data.ai, masked.replacements) : data.ai;
    return buildCheckResult(text, ai, "ok", sent);
  } catch {
    // Offline, timed out, or the server is unreachable.
    return buildCheckResult(text, null, "failed", sent);
  } finally {
    clearTimeout(timer);
  }
}
