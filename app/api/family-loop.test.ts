import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/server/store/memory";
import { setStoreForTesting } from "@/lib/server/store";
import * as circleRoute from "./family/circle/route";
import * as sessionRoute from "./family/session/route";
import * as pairingRoute from "./family/pairing/route";
import * as familyAlertsRoute from "./family/alerts/route";
import * as replyRoute from "./family/alerts/[id]/reply/route";
import * as familyDeviceRoute from "./family/devices/[id]/route";
import * as pairRoute from "./pair/route";
import * as deviceCircleRoute from "./device/circle/route";
import * as deviceAlertsRoute from "./device/alerts/route";
import * as deviceAlertRoute from "./device/alerts/[id]/route";

// The whole family loop through the real route handlers, with an in-memory store.
// All people, numbers and the bank are fictional.

const ORIGIN = "http://localhost:3000";
const PIN = "482913";

const SETTINGS = {
  parentName: "Amina",
  textSize: "xl",
  emergencyNumber: "999",
  familyMembers: [{ name: "Sara", relationship: "daughter", phone: "07700 900001" }],
  contacts: [{ label: "Gulf Example Bank", category: "bank", phone: "0808 157 0000", note: "" }],
};

let ipCounter = 0;

function req(path: string, init: { method?: string; body?: unknown; cookie?: string; token?: string; origin?: string; ip?: string } = {}) {
  const headers: Record<string, string> = { host: "localhost:3000", "x-forwarded-for": init.ip ?? `10.0.0.${++ipCounter % 250}` };
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.cookie) headers.cookie = init.cookie;
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.origin !== undefined) headers.origin = init.origin;
  else if (init.method && init.method !== "GET") headers.origin = ORIGIN;
  return new Request(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const ctx = <T extends string>(id: T) => ({ params: Promise.resolve({ id }) });

function cookieFrom(res: Response): string {
  return (res.headers.get("set-cookie") ?? "").split(";")[0];
}

async function createCircle() {
  const res = await circleRoute.POST(req("/api/family/circle", { method: "POST", body: { ...SETTINGS, pin: PIN } }));
  expect(res.status).toBe(201);
  return { cookie: cookieFrom(res), familyCode: (await res.json()).familyCode as string };
}

async function pairPhone(cookie: string) {
  const code = (await (await pairingRoute.POST(req("/api/family/pairing", { method: "POST", cookie }))).json()).code;
  const res = await pairRoute.POST(req("/api/pair", { method: "POST", body: { code } }));
  expect(res.status).toBe(200);
  return { code, ...(await res.json()) } as { code: string; deviceToken: string; circle: Record<string, unknown> };
}

describe("family loop", () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    setStoreForTesting(store);
  });

  afterEach(() => setStoreForTesting(undefined));

  it("create -> pair -> parent sends alert -> family replies -> parent sees reply", async () => {
    const { cookie, familyCode } = await createCircle();
    expect(cookie).toMatch(/^cf_family=/);
    expect(familyCode).toMatch(/^[A-Z0-9]{8}$/);

    const { deviceToken, circle } = await pairPhone(cookie);
    expect(circle).toMatchObject({ parentName: "Amina", textSize: "xl", emergencyNumber: "999" });

    const sent = await deviceAlertsRoute.POST(
      req("/api/device/alerts", {
        method: "POST",
        token: deviceToken,
        body: { verdict: "WARNING", summary: "A text claiming to be from the bank.", excerpt: "x".repeat(800), flagIds: ["asks_for_code", "made_up", "other"] },
      }),
    );
    expect(sent.status).toBe(201);
    const { id } = await sent.json();

    const waiting = await (await deviceAlertRoute.GET(req(`/api/device/alerts/${id}`, { token: deviceToken }), ctx(id))).json();
    expect(waiting.reply).toBeNull();

    const inbox = await (await familyAlertsRoute.GET(req("/api/family/alerts", { cookie }))).json();
    expect(inbox.alerts).toHaveLength(1);
    expect(inbox.alerts[0].excerpt).toHaveLength(500);
    expect(inbox.alerts[0].flagIds).toEqual(["asks_for_code", "other"]);

    const replied = await replyRoute.POST(req(`/api/family/alerts/${id}/reply`, { method: "POST", cookie, body: { kind: "calling" } }), ctx(id));
    expect(replied.status).toBe(200);

    const answer = await (await deviceAlertRoute.GET(req(`/api/device/alerts/${id}`, { token: deviceToken }), ctx(id))).json();
    expect(answer.reply).toMatchObject({ kind: "calling", text: "Don't do anything. I'm calling you now." });
  });

  it("never sends the PIN hash or family code to the parent's phone", async () => {
    const { cookie } = await createCircle();
    const { deviceToken, circle } = await pairPhone(cookie);
    const refreshed = await (await deviceCircleRoute.GET(req("/api/device/circle", { token: deviceToken }))).json();
    for (const c of [circle, refreshed.circle]) {
      const text = JSON.stringify(c);
      expect(text).not.toMatch(/pin|familyCode|scrypt/i);
    }
  });

  it("the parent's phone cannot change contacts or settings", async () => {
    const { cookie } = await createCircle();
    const { deviceToken } = await pairPhone(cookie);
    const changed = { ...SETTINGS, contacts: [{ label: "Gulf Example Bank", category: "bank", phone: "07700 900999", note: "" }], pin: PIN };
    const res = await circleRoute.PUT(req("/api/family/circle", { method: "PUT", token: deviceToken, body: changed }));
    expect(res.status).toBe(401);
    const circle = (await (await deviceCircleRoute.GET(req("/api/device/circle", { token: deviceToken }))).json()).circle;
    expect(circle.contacts[0].phone).toBe("0808 157 0000");
  });

  it("changing settings needs the PIN every time, even when signed in", async () => {
    const { cookie } = await createCircle();
    const noPin = await circleRoute.PUT(req("/api/family/circle", { method: "PUT", cookie, body: { ...SETTINGS } }));
    expect(noPin.status).toBe(403);
    const ok = await circleRoute.PUT(req("/api/family/circle", { method: "PUT", cookie, body: { ...SETTINGS, parentName: "Amina B", pin: PIN } }));
    expect(ok.status).toBe(200);
    expect((await ok.json()).circle.parentName).toBe("Amina B");
  });

  it("five wrong PINs lock settings changes and sign-in", async () => {
    const { cookie, familyCode } = await createCircle();
    for (let i = 0; i < 4; i++) {
      const res = await circleRoute.PUT(req("/api/family/circle", { method: "PUT", cookie, body: { ...SETTINGS, pin: "000001" } }));
      expect(res.status).toBe(403);
    }
    const locked = await circleRoute.PUT(req("/api/family/circle", { method: "PUT", cookie, body: { ...SETTINGS, pin: "000001" } }));
    expect(locked.status).toBe(429);
    const signIn = await sessionRoute.POST(req("/api/family/session", { method: "POST", body: { familyCode, pin: PIN } }));
    expect(signIn.status).toBe(429);
  });

  it("signs in on another device with the family code and PIN", async () => {
    const { familyCode } = await createCircle();
    const wrong = await sessionRoute.POST(req("/api/family/session", { method: "POST", body: { familyCode, pin: "000001" } }));
    expect(wrong.status).toBe(403);
    const res = await sessionRoute.POST(
      req("/api/family/session", { method: "POST", body: { familyCode: `${familyCode.slice(0, 4).toLowerCase()}-${familyCode.slice(4)}`, pin: PIN } }),
    );
    expect(res.status).toBe(200);
    const cookie = cookieFrom(res);
    expect((await familyAlertsRoute.GET(req("/api/family/alerts", { cookie }))).status).toBe(200);
  });

  it("a pairing code works once", async () => {
    const { cookie } = await createCircle();
    const { code } = await pairPhone(cookie);
    const again = await pairRoute.POST(req("/api/pair", { method: "POST", body: { code } }));
    expect(again.status).toBe(404);
  });

  it("a new pairing code replaces the old one", async () => {
    const { cookie } = await createCircle();
    const first = (await (await pairingRoute.POST(req("/api/family/pairing", { method: "POST", cookie }))).json()).code;
    const second = (await (await pairingRoute.POST(req("/api/family/pairing", { method: "POST", cookie }))).json()).code;
    if (first !== second) {
      expect((await pairRoute.POST(req("/api/pair", { method: "POST", body: { code: first } }))).status).toBe(404);
    }
    expect((await pairRoute.POST(req("/api/pair", { method: "POST", body: { code: second } }))).status).toBe(200);
  });

  it("limits pairing attempts from one address", async () => {
    let last = 0;
    for (let i = 0; i < 11; i++) {
      last = (await pairRoute.POST(req("/api/pair", { method: "POST", ip: "10.9.9.9", body: { code: "000000" } }))).status;
    }
    expect(last).toBe(429);
  });

  it("a disconnected phone loses access", async () => {
    const { cookie } = await createCircle();
    const { deviceToken } = await pairPhone(cookie);
    const devices = (await (await circleRoute.GET(req("/api/family/circle", { cookie }))).json()).devices;
    const res = await familyDeviceRoute.DELETE(
      req(`/api/family/devices/${devices[0].id}`, { method: "DELETE", cookie, body: { pin: PIN } }),
      ctx(devices[0].id),
    );
    expect(res.status).toBe(200);
    expect((await deviceCircleRoute.GET(req("/api/device/circle", { token: deviceToken }))).status).toBe(401);
  });

  it("rejects requests without a session or token, and from other sites", async () => {
    expect((await familyAlertsRoute.GET(req("/api/family/alerts"))).status).toBe(401);
    expect((await deviceCircleRoute.GET(req("/api/device/circle", { token: "made-up" }))).status).toBe(401);
    const { cookie } = await createCircle();
    const crossSite = await pairingRoute.POST(req("/api/family/pairing", { method: "POST", cookie, origin: "https://evil.example" }));
    expect(crossSite.status).toBe(403);
  });

  it("one circle cannot see or answer another circle's alerts", async () => {
    const a = await createCircle();
    const b = await createCircle();
    const phoneA = await pairPhone(a.cookie);
    const { id } = await (
      await deviceAlertsRoute.POST(req("/api/device/alerts", { method: "POST", token: phoneA.deviceToken, body: { verdict: "NOT_SURE", summary: "s", excerpt: "e" } }))
    ).json();
    expect((await (await familyAlertsRoute.GET(req("/api/family/alerts", { cookie: b.cookie }))).json()).alerts).toEqual([]);
    const reply = await replyRoute.POST(req(`/api/family/alerts/${id}/reply`, { method: "POST", cookie: b.cookie, body: { kind: "fine" } }), ctx(id));
    expect(reply.status).toBe(404);
  });

  it("alerts disappear after 7 days", async () => {
    let now = Date.now();
    store = new MemoryStore(() => now);
    setStoreForTesting(store);
    const { cookie } = await createCircle();
    const { deviceToken } = await pairPhone(cookie);
    await deviceAlertsRoute.POST(req("/api/device/alerts", { method: "POST", token: deviceToken, body: { verdict: "WARNING", summary: "s", excerpt: "e" } }));
    now += 7 * 24 * 60 * 60 * 1000 + 1000;
    expect((await (await familyAlertsRoute.GET(req("/api/family/alerts", { cookie }))).json()).alerts).toEqual([]);
  });

  it("deletes the whole circle with the PIN, and the phone and family lose access", async () => {
    const { cookie } = await createCircle();
    const { deviceToken } = await pairPhone(cookie);
    await deviceAlertsRoute.POST(req("/api/device/alerts", { method: "POST", token: deviceToken, body: { verdict: "WARNING", summary: "s", excerpt: "e" } }));

    const wrong = await circleRoute.DELETE(req("/api/family/circle", { method: "DELETE", cookie, body: { pin: "000001" } }));
    expect(wrong.status).toBe(403);
    const fromPhone = await circleRoute.DELETE(req("/api/family/circle", { method: "DELETE", token: deviceToken, body: { pin: PIN } }));
    expect(fromPhone.status).toBe(401);

    const res = await circleRoute.DELETE(req("/api/family/circle", { method: "DELETE", cookie, body: { pin: PIN } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
    expect((await familyAlertsRoute.GET(req("/api/family/alerts", { cookie }))).status).toBe(401);
    expect((await deviceCircleRoute.GET(req("/api/device/circle", { token: deviceToken }))).status).toBe(401);
  });

  it("stores rate-limit counters without the IP address", async () => {
    const keys: string[] = [];
    const original = store.hitRateLimit.bind(store);
    store.hitRateLimit = async (key, windowStart) => {
      keys.push(key);
      return original(key, windowStart);
    };
    await pairRoute.POST(req("/api/pair", { method: "POST", ip: "10.1.2.3", body: { code: "000000" } }));
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key).not.toContain("10.1.2.3");
  });

  it("rejects weak PINs and invalid settings when creating a circle", async () => {
    const weak = await circleRoute.POST(req("/api/family/circle", { method: "POST", body: { ...SETTINGS, pin: "123456" } }));
    expect(weak.status).toBe(400);
    const noFamily = await circleRoute.POST(req("/api/family/circle", { method: "POST", body: { ...SETTINGS, familyMembers: [], pin: PIN } }));
    expect(noFamily.status).toBe(400);
  });
});
