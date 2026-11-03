// npm run check:supabase: checks the connected Supabase project end to end with a made-up circle.
// It creates the circle, pairs a phone, sends an alert, replies, checks the PIN counter, rate
// limits and clean-up, then deletes the circle again. Reads SUPABASE_* from .env.local.

import { loadEnvConfig } from "@next/env";
import { familyCode, hashPin, randomToken, sha256 } from "@/lib/server/crypto";
import { SupabaseStore } from "@/lib/server/store/supabase";

function check(condition: unknown, what: string): void {
  if (!condition) throw new Error(`Failed: ${what}`);
  console.log(`  ok  ${what}`);
}

async function main() {
  loadEnvConfig(process.cwd());
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  const store = new SupabaseStore(url, key);

  console.log(`Checking ${new URL(url).host} with a made-up circle...`);
  const code = familyCode();
  const circleId = await store.createCircle(code, await hashPin("482913"), {
    parentName: "Test Parent",
    textSize: "large",
    emergencyNumber: "999",
    familyMembers: [{ name: "Test Daughter", relationship: "daughter", phone: "07700 900001" }],
    contacts: [{ label: "Gulf Example Bank", category: "bank", phone: "0808 157 0000", note: "" }],
  });

  try {
    const circle = await store.getCircle(circleId);
    check(circle?.parentName === "Test Parent" && circle.contacts[0]?.phone === "0808 157 0000", "create and read a circle");
    check((await store.getCircleIdByFamilyCode(code)) === circleId, "find a circle by family code");

    await store.replaceSettings(circleId, {
      parentName: "Test Parent",
      textSize: "xl",
      emergencyNumber: "112",
      familyMembers: [{ name: "Test Son", relationship: "son", phone: "07700 900002" }],
      contacts: [],
    }, null);
    const updated = await store.getCircle(circleId);
    check(updated?.textSize === "xl" && updated.familyMembers[0]?.name === "Test Son" && updated.contacts.length === 0, "replace settings");

    await store.setPinAttempts(circleId, 2, null);
    check((await store.getCircle(circleId))?.pinFailedAttempts === 2, "count wrong PINs");

    const codeHash = sha256(`check-${randomToken()}`);
    await store.createPairingCode(circleId, codeHash, Date.now() + 60_000);
    check((await store.consumePairingCode(codeHash)) === circleId, "use a pairing code");
    check((await store.consumePairingCode(codeHash)) === null, "a pairing code works only once");

    const tokenHash = sha256(randomToken());
    const deviceId = await store.createDevice(circleId, tokenHash);
    check((await store.findDevice(tokenHash))?.circleId === circleId, "connect a phone");

    const alertId = await store.createAlert(
      circleId,
      deviceId,
      { verdict: "WARNING", summary: "A test alert.", excerpt: "Made-up message for the check.", flagIds: ["asks_for_code"] },
      Date.now() + 60_000,
    );
    check((await store.listAlerts(circleId)).some((a) => a.id === alertId), "send an alert");
    check(await store.replyToAlert(circleId, alertId, "calling", "Don't do anything. I'm calling you now."), "reply to an alert");
    check((await store.getAlert(circleId, alertId))?.reply?.kind === "calling", "read the reply");

    const window = Math.floor(Date.now() / 3_600_000) * 3_600_000;
    const rateKey = `check:${randomToken()}`;
    await store.hitRateLimit(rateKey, window);
    check((await store.hitRateLimit(rateKey, window)) === 2, "count requests for rate limits");

    await store.deleteExpired();
    check(true, "run the clean-up function");

    check(await store.revokeDevice(circleId, deviceId), "disconnect a phone");
    check((await store.findDevice(tokenHash)) === null, "a disconnected phone has no access");
  } finally {
    await store.deleteCircle(circleId);
  }
  check((await store.getCircle(circleId)) === null, "delete the circle and everything in it");
  console.log("Supabase is set up correctly.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
