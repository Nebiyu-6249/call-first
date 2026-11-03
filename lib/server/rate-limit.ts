import "server-only";

// Fixed-window rate limits, counted in the store so they hold across serverless instances.
// If the store cannot be reached, a per-instance counter is used instead, so the AI key stays
// protected and the demo keeps working.

import { sessionSecret } from "./config";
import { keyedHash, sha256 } from "./crypto";
import { MemoryStore } from "./store/memory";
import { getStore } from "./store";

const fallback = new MemoryStore();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Keys contain IP addresses, so only a keyed hash is stored. Without a secret (a setup problem) a plain
// hash still keeps the address out of the table at a glance.
function storedKey(key: string): string {
  try {
    return keyedHash(key, sessionSecret());
  } catch {
    return sha256(key);
  }
}

export async function hitRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): Promise<RateLimitResult> {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const hashed = storedKey(key);
  let count: number;
  try {
    count = await getStore().hitRateLimit(hashed, windowStart);
  } catch {
    count = await fallback.hitRateLimit(hashed, windowStart);
  }
  return { allowed: count <= limit, retryAfterSeconds: Math.ceil((windowStart + windowMs - now) / 1000) };
}

export function rateLimitedResponse(result: RateLimitResult): Response {
  return Response.json(
    { error: "Too many requests. Please wait a little and try again." },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } },
  );
}
