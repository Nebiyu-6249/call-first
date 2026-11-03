import { describe, expect, it } from "vitest";
import { familyCode, hashPin, keyedHash, normaliseFamilyCode, sixDigitCode, verifyPin } from "./crypto";
import { checkPin } from "./pin";
import { signSession, verifySession } from "./session";
import { MemoryStore } from "./store/memory";
import { PIN_LOCKOUT_MS } from "./config";

const SECRET = "a".repeat(64);

describe("PIN hashing", () => {
  it("verifies the right PIN and rejects others", async () => {
    const hash = await hashPin("482913");
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("482913");
    expect(await verifyPin("482913", hash)).toBe(true);
    expect(await verifyPin("482914", hash)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPin("482913")).not.toBe(await hashPin("482913"));
  });
});

describe("codes", () => {
  it("makes 6-digit pairing codes and readable family codes", () => {
    expect(sixDigitCode()).toMatch(/^\d{6}$/);
    expect(familyCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
    expect(normaliseFamilyCode("k7m2-qx9p ")).toBe("K7M2QX9P");
  });

  it("hashes pairing codes with a key", () => {
    expect(keyedHash("123456", SECRET)).not.toBe(keyedHash("123456", "b".repeat(64)));
  });
});

describe("family session", () => {
  it("round-trips the circle id", () => {
    expect(verifySession(signSession("circle-1", 1000, SECRET), 2000, SECRET)).toBe("circle-1");
  });

  it("rejects tampered, foreign and expired cookies", () => {
    const value = signSession("circle-1", 1000, SECRET);
    const [body, sig] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ c: "circle-2", e: 9e15 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`, 2000, SECRET)).toBeNull();
    expect(verifySession(`${body}.x${sig.slice(1)}`, 2000, SECRET)).toBeNull();
    expect(verifySession(value, 2000, "b".repeat(64))).toBeNull();
    expect(verifySession(value, 1000 + 31 * 24 * 60 * 60 * 1000, SECRET)).toBeNull();
    expect(verifySession(undefined, 2000, SECRET)).toBeNull();
  });
});

describe("PIN lockout", () => {
  async function setup() {
    let now = 1_000_000;
    const store = new MemoryStore(() => now);
    const id = await store.createCircle("ABCDEFGH", await hashPin("482913"), {
      parentName: "Amina",
      textSize: "large",
      privateMode: false,
      emergencyNumber: "999",
      familyMembers: [{ name: "Sara", relationship: "daughter", phone: "07700 900001" }],
      contacts: [],
    });
    const check = async (pin: string) => checkPin(store, (await store.getCircle(id))!, pin, now);
    return { check, advance: (ms: number) => (now += ms) };
  }

  it("locks for 15 minutes after five wrong PINs, even for the right PIN", async () => {
    const { check, advance } = await setup();
    for (let i = 4; i >= 1; i--) expect(await check("000001")).toEqual({ ok: false, reason: "wrong", attemptsLeft: i });
    expect(await check("000001")).toMatchObject({ ok: false, reason: "locked" });
    expect(await check("482913")).toMatchObject({ ok: false, reason: "locked" });
    advance(PIN_LOCKOUT_MS - 1);
    expect(await check("482913")).toMatchObject({ ok: false, reason: "locked" });
    advance(2);
    expect(await check("482913")).toEqual({ ok: true });
  });

  it("resets the count after a correct PIN", async () => {
    const { check } = await setup();
    await check("000001");
    await check("000001");
    expect(await check("482913")).toEqual({ ok: true });
    expect(await check("000001")).toEqual({ ok: false, reason: "wrong", attemptsLeft: 4 });
  });
});
