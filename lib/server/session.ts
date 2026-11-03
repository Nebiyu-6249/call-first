import "server-only";

// Family sessions: a signed, httpOnly cookie holding the circle id and an expiry time.

import { keyedHash, safeEqual } from "./crypto";
import { SESSION_TTL_MS, sessionSecret } from "./config";

export const SESSION_COOKIE = "cf_family";

interface SessionPayload {
  c: string;
  e: number;
}

export function signSession(circleId: string, now = Date.now(), secret = sessionSecret()): string {
  const payload: SessionPayload = { c: circleId, e: now + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${keyedHash(body, secret)}`;
}

// Returns the circle id, or null if the cookie is missing, tampered with, or expired.
export function verifySession(value: string | undefined, now = Date.now(), secret = sessionSecret()): string | null {
  if (!value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature || !safeEqual(signature, keyedHash(body, secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.c !== "string" || typeof payload.e !== "number" || payload.e < now) return null;
    return payload.c;
  } catch {
    return null;
  }
}

export function sessionCookie(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function readSessionCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=");
  }
  return undefined;
}
