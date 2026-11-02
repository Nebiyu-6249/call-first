// Browser side of a check: call /api/check, and fall back to the rules alone if it fails.

import { buildCheckResult, type CheckResult } from "./index";
import type { CheckApiResponse, CheckRequest } from "./request";

// A little longer than the server's own AI timeout, to allow for the network.
const CLIENT_TIMEOUT_MS = 12000;

export async function runCheck(request: CheckRequest): Promise<CheckResult> {
  const text = request.type === "image" ? "" : request.text;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const res = await fetch("/api/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    if (!res.ok) return buildCheckResult(text, null, "failed");
    const data = (await res.json()) as CheckApiResponse;
    return data.aiStatus === "ok" ? buildCheckResult(text, data.ai, "ok") : buildCheckResult(text, null, "failed");
  } catch {
    // Offline, timed out, or the server is unreachable.
    return buildCheckResult(text, null, "failed");
  } finally {
    clearTimeout(timer);
  }
}
