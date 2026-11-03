import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

// Runs the real migrations, in order, in an in-process Postgres to check the SQL and the functions.

const dir = fileURLToPath(new URL("./migrations/", import.meta.url));
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(`${dir}/${f}`, "utf8"))
  .join("\n");

const members = JSON.stringify([
  { name: "Sara", relationship: "daughter", phone: "07700 900001" },
  { name: "Omar", relationship: "son", phone: "07700 900002" },
]);
const contacts = JSON.stringify([{ label: "Gulf Example Bank", category: "bank", phone: "0808 157 0000", note: "" }]);

describe("supabase migration", () => {
  let db: PGlite;
  let circleId: string;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(sql);
    // Running it twice must be safe.
    await db.exec(sql);
    const res = await db.query<{ id: string }>(
      "select create_circle($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb) as id",
      ["K7M2QX9P", "Amina", "large", "999", "scrypt$hash", members, contacts],
    );
    circleId = res.rows[0].id;
  }, 30000);

  it("creates a circle with ordered members and contacts", async () => {
    const m = await db.query<{ name: string; position: number }>(
      "select name, position from family_members where circle_id = $1 order by position",
      [circleId],
    );
    expect(m.rows).toEqual([
      { name: "Sara", position: 0 },
      { name: "Omar", position: 1 },
    ]);
    const c = await db.query<{ label: string; category: string }>("select label, category from contacts where circle_id = $1", [circleId]);
    expect(c.rows).toEqual([{ label: "Gulf Example Bank", category: "bank" }]);
  });

  it("rejects invalid values", async () => {
    await expect(
      db.query("select create_circle('ABCDEFGH', 'X', 'huge', '999', 'h', '[]'::jsonb, '[]'::jsonb)"),
    ).rejects.toThrow();
    await expect(
      db.query("select create_circle('ABCDEFG2', 'X', 'large', 'call me', 'h', '[]'::jsonb, '[]'::jsonb)"),
    ).rejects.toThrow();
  });

  it("replaces settings and keeps the PIN when none is given", async () => {
    await db.query("select replace_circle_settings($1, 'Amina B', 'xl', '112', null, $2::jsonb, '[]'::jsonb)", [
      circleId,
      JSON.stringify([{ name: "Sara", relationship: "daughter", phone: "07700 900001" }]),
    ]);
    const c = await db.query<{ parent_name: string; text_size: string; pin_hash: string }>(
      "select parent_name, text_size, pin_hash from circles where id = $1",
      [circleId],
    );
    expect(c.rows[0]).toEqual({ parent_name: "Amina B", text_size: "xl", pin_hash: "scrypt$hash" });
    const counts = await db.query<{ m: number; c: number }>(
      "select (select count(*)::int from family_members where circle_id = $1) as m, (select count(*)::int from contacts where circle_id = $1) as c",
      [circleId],
    );
    expect(counts.rows[0]).toEqual({ m: 1, c: 0 });
  });

  it("stores private mode, off unless the family turns it on", async () => {
    const mode = async () =>
      (await db.query<{ private_mode: boolean }>("select private_mode from circles where id = $1", [circleId])).rows[0]
        .private_mode;
    expect(await mode()).toBe(false);
    await db.query(
      "select replace_circle_settings($1, 'Amina B', 'xl', '112', null, $2::jsonb, '[]'::jsonb, true)",
      [circleId, JSON.stringify([{ name: "Sara", relationship: "daughter", phone: "07700 900001" }])],
    );
    expect(await mode()).toBe(true);
    // The old seven-argument call still works and switches it off again.
    await db.query(
      "select replace_circle_settings($1, 'Amina B', 'xl', '112', null, $2::jsonb, '[]'::jsonb)",
      [circleId, JSON.stringify([{ name: "Sara", relationship: "daughter", phone: "07700 900001" }])],
    );
    expect(await mode()).toBe(false);
  });

  it("uses a pairing code once and never after it expires", async () => {
    await db.query("insert into pairing_codes (circle_id, code_hash, expires_at) values ($1, 'live', now() + interval '15 minutes')", [circleId]);
    await db.query("insert into pairing_codes (circle_id, code_hash, expires_at) values ($1, 'old', now() - interval '1 minute')", [circleId]);
    const first = await db.query<{ c: string | null }>("select consume_pairing_code('live') as c");
    const second = await db.query<{ c: string | null }>("select consume_pairing_code('live') as c");
    const expired = await db.query<{ c: string | null }>("select consume_pairing_code('old') as c");
    expect(first.rows[0].c).toBe(circleId);
    expect(second.rows[0].c).toBeNull();
    expect(expired.rows[0].c).toBeNull();
  });

  it("counts rate-limit hits per key and window", async () => {
    const hit = async (key: string) =>
      (await db.query<{ n: number }>("select hit_rate_limit($1, date_trunc('hour', now())) as n", [key])).rows[0].n;
    expect(await hit("ip:1")).toBe(1);
    expect(await hit("ip:1")).toBe(2);
    expect(await hit("ip:2")).toBe(1);
  });

  it("limits alert text and removes expired alerts", async () => {
    await expect(
      db.query("insert into alerts (circle_id, verdict, summary, excerpt) values ($1, 'WARNING', 's', $2)", [circleId, "x".repeat(501)]),
    ).rejects.toThrow();
    await db.query(
      "insert into alerts (circle_id, verdict, summary, excerpt, expires_at) values ($1, 'WARNING', 'old', 'e', now() - interval '1 second'), ($1, 'NOT_SURE', 'new', 'e', default)",
      [circleId],
    );
    await db.query("select delete_expired()");
    const left = await db.query<{ summary: string }>("select summary from alerts where circle_id = $1", [circleId]);
    expect(left.rows.map((r) => r.summary)).toEqual(["new"]);
  });

  it("stores URGENT alerts, with or without a check, and the calling-now reply", async () => {
    await db.query("insert into alerts (circle_id, verdict, urgent, summary, excerpt) values ($1, null, 'phone_call', 'call', '')", [circleId]);
    await db.query("insert into alerts (circle_id, verdict, urgent, summary, excerpt) values ($1, 'WARNING', 'sent_money', 'money', 'e')", [circleId]);
    await expect(
      db.query("insert into alerts (circle_id, verdict, urgent, summary, excerpt) values ($1, null, null, 's', '')", [circleId]),
    ).rejects.toThrow();
    await expect(
      db.query("insert into alerts (circle_id, verdict, urgent, summary, excerpt) values ($1, null, 'made_up', 's', '')", [circleId]),
    ).rejects.toThrow();
    await db.query("update alerts set reply_kind = 'calling_now', reply_text = 'r', replied_at = now() where summary = 'call'");
    const rows = await db.query<{ urgent: string; reply_kind: string | null }>(
      "select urgent, reply_kind from alerts where circle_id = $1 and urgent is not null order by summary",
      [circleId],
    );
    expect(rows.rows).toEqual([
      { urgent: "phone_call", reply_kind: "calling_now" },
      { urgent: "sent_money", reply_kind: null },
    ]);
  });

  it("deletes everything for a circle when the circle is deleted", async () => {
    await db.query("delete from circles where id = $1", [circleId]);
    const rows = await db.query<{ n: number }>(
      "select (select count(*) from family_members) + (select count(*) from contacts) + (select count(*) from alerts) + (select count(*) from pairing_codes) as n",
    );
    expect(Number(rows.rows[0].n)).toBe(0);
  });
});
