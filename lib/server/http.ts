import "server-only";

// Shared request handling for the family and device routes.

import { unstable_rethrow } from "next/navigation";
import { ConfigError } from "./config";
import { sha256 } from "./crypto";
import { readSessionCookie, verifySession } from "./session";
import { getStore } from "./store";
import type { DeviceRecord, Store } from "./store/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ConfigError) {
    console.error(`[config] ${error.message}`);
    return Response.json({ error: "The service is not set up yet." }, { status: 503 });
  }
  // Never log request bodies; only the kind of failure.
  console.error(`[server] ${(error as Error)?.name ?? "Error"}: ${(error as Error)?.message ?? ""}`);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

// Wraps a handler so thrown HttpErrors become JSON responses.
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      // Let Next.js's own signals through (for example the prerender bail-out on request headers).
      unstable_rethrow(error);
      return errorResponse(error);
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new HttpError(400, "Expected a JSON body.");
}

// Blocks cross-site requests that try to use the family cookie (on top of SameSite=Lax).
export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    // fall through
  }
  throw new HttpError(403, "Request from another site was blocked.");
}

// The signed cookie says which circle; the circle must also still exist (it may have been deleted).
export async function requireFamily(request: Request, store: Store = getStore()): Promise<string> {
  const circleId = verifySession(readSessionCookie(request));
  if (!circleId || !(await store.getCircle(circleId))) throw new HttpError(401, "Please sign in.");
  return circleId;
}

export async function requireDevice(request: Request, store: Store = getStore()): Promise<DeviceRecord> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new HttpError(401, "This phone is not connected.");
  const device = await store.findDevice(sha256(token));
  if (!device) throw new HttpError(401, "This phone is not connected.");
  return device;
}

// Netlify sets x-nf-client-connection-ip; other hosts set x-forwarded-for.
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-nf-client-connection-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}
