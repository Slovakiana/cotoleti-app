// Testy servera: simulované útoky na súťaže + základné funkcie.
// Spustenie: node tests/worker.test.mjs   (Node 22+)
import {DatabaseSync} from "node:sqlite";
import {readFileSync, writeFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../server/worker.js", import.meta.url), "utf8")
  .replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}");
const dir = mkdtempSync(join(tmpdir(), "ctl-")), file = join(dir, "w.mjs");
writeFileSync(file, src);
const mod = await import(file);

const db = new DatabaseSync(":memory:");
const sql = {exec(q, ...p) {
  if (!p.length && q.trim().split(";").filter(s => s.trim()).length > 1) { db.exec(q); return {toArray: () => []}; }
  const st = db.prepare(q);
  if (/^\s*SELECT/i.test(q)) { const rows = st.all(...p); return {toArray: () => rows}; }
  st.run(...p); return {toArray: () => []};
}};
const kv = new Map(); let alarm = null;
const storage = {sql, get: async k => kv.get(k), put: async (k, v) => kv.set(k, v), getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }};
const sky = new mod.Sky({storage}, {ADMIN_KEY: "tajne"});
const env = {SKY: {idFromName: () => 1, get: () => ({fetch: r => sky.fetch(typeof r === "string" ? new Request(r) : r)})}};
const W = mod.default;

let plane = {hex: "aabbcc", flight: "WZZ123 ", t: "A21N", lat: 48.2, lon: 17.2, gs: 440, alt_baro: 36000};
globalThis.fetch = async u => { u = String(u);
  if (u.includes("/v2/point/") || u.includes("/v2/hex/")) return new Response(JSON.stringify({ac: [plane],now:Date.now()}));
  return new Response("{}"); };

const call = async (p, b, ip = "1.2.3.4", cc = "SK") => {
  sky._snap = null; // testy menia polohu lietadla – bez medzipamäte oblohy
  if (p === "/api/wave" && b && b.gps === undefined) b = {...b, gps: true};
  const r = new Request("https://x" + p, b ? {method: "POST", body: JSON.stringify(b), headers: {"cf-connecting-ip": ip, "x-cc-country": "US"}} : {headers: {"cf-connecting-ip": ip}});
  Object.defineProperty(r, "cf", {value: {country: cc, latitude: "48.15", longitude: "17.1"}});
  const res = await W.fetch(r, env); const text = await res.text();
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  return {s: res.status, j, text};
};
let ok = 0; const t = async (name, fn) => { await fn(); ok++; console.log("✓", name); };

const A = "v2aaaaaaaaaaaaaaaaaaaaaa1", B = "v2bbbbbbbbbbbbbbbbbbbbbb2", C = "v2cccccccccccccccccccccc3";
const ha = (await call("/api/hello", {id: A})).j, hb = (await call("/api/hello", {id: B}, "5.6.7.8")).j, hc = (await call("/api/hello", {id: C}, "9.9.9.9")).j;

const ep = {endpoint: "https://fcm.googleapis.com/fcm/send/rodina1"};
await t("rodinný mobil: 2 profily, 1 endpoint -> 1 odber", async () => {
  assert.equal((await call("/api/sub", {id: A, tok: ha.tok, sub: ep, lat: 48.15, lon: 17.1, moment: 1})).s, 200);
  assert.equal((await call("/api/sub", {id: B, tok: hb.tok, sub: ep, lat: 48.15, lon: 17.1, moment: 1}, "5.6.7.8")).s, 200);
  const rows = db.prepare("SELECT id FROM subs WHERE sub=?").all(JSON.stringify(ep));
  assert.deepEqual(rows.map(r => r.id), [B]);
});
await t("detský profil si nezapne upozornenia", async () => {
  const K = "v2kkkkkkkkkkkkkkkkkkkkkk9", hk = (await call("/api/hello", {id: K, kid: 1}, "7.7.7.7")).j;
  const r = await call("/api/sub", {id: K, tok: hk.tok, sub: {endpoint: "https://fcm.googleapis.com/fcm/send/kid"}, lat: 48.15, lon: 17.1}, "7.7.7.7");
  assert.equal(r.s, 403);
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM subs WHERE id=?").get(K).c, 0);
});
console.log("OK", ok);
