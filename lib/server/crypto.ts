import "server-only";

// Hashing and random values for PINs, device tokens, pairing codes and family codes.

import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;

function scryptAsync(secret: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(secret, salt, KEY_LENGTH, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

// Format: scrypt$N$r$p$salt$hash (base64url).
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pin, salt, SCRYPT_N, SCRYPT_R, SCRYPT_P);
  return ["scrypt", SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(pin, Buffer.from(salt, "base64url"), Number(n), Number(r), Number(p));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

// Keyed hash for low-entropy values (6-digit pairing codes), so a database leak alone
// does not let anyone work them out.
export function keyedHash(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sixDigitCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

// No 0/O or 1/I/L, so it can be read out over the phone.
const FAMILY_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function familyCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += FAMILY_CODE_ALPHABET[randomInt(0, FAMILY_CODE_ALPHABET.length)];
  return code;
}

// Accepts "k7m2-qx9p", "K7M2 QX9P" and so on.
export function normaliseFamilyCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
