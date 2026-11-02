import "server-only";

// Server secrets and limits. In development, a missing secret is replaced with a random
// one for this process; in production a missing secret is an error.

import { randomBytes } from "node:crypto";

export class ConfigError extends Error {}

let devSecret: string | null = null;

export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new ConfigError("SESSION_SECRET must be set to at least 32 characters.");
  }
  devSecret ??= randomBytes(32).toString("hex");
  return devSecret;
}

export function rateLimitPerHour(): number {
  const value = Number(process.env.RATE_LIMIT_PER_HOUR);
  return Number.isFinite(value) && value > 0 ? value : 30;
}

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCKOUT_MS = 15 * 60 * 1000;
export const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;
export const ALERT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
