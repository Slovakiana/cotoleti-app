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
  if (u.includes("/v2/point/") || u.includes("/v2/hex/")) return new Response(JSON.stringify({ac: [plane]}));
  return new Response("{}"); };

const call = async (p, b, ip = "1.2.3.4", cc = "SK") => {
  const r = new Request("https://x" + p, b ? {method: "POST", body: JSON.stringify(b), headers: {"cf-connecting-ip": ip, "x-cc-country": "US"}} : {headers: {"cf-connecting-ip": ip}});
  Object.defineProperty(r, "cf", {value: {country: cc, latitude: "48.15", longitude: "17.1"}});
  const res = await W.fetch(r, env); const text = await res.text();
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  return {s: res.status, j, text};
};
let ok = 0; const t = async (name, fn) => { await fn(); ok++; console.log("✓", name); };

const A = "v2aaaaaaaaaaaaaaaaaaaaaa1", B = "v2bbbbbbbbbbbbbbbbbbbbbb2", C = "v2cccccccccccccccccccccc3";
const ha = (await call("/api/hello", {id: A})).j, hb = (await call("/api/hello", {id: B}, "5.6.7.8")).j, hc = (await call("/api/hello", {id: C}, "9.9.9.9")).j;

await t("hello vráti token a verejné id", () => { assert.ok(ha.tok); assert.equal(ha.pid.length, 16); });
await t("mávnutie bez tokenu odmietnuté", async () => assert.equal((await call("/api/wave", {id: A, hex: "aabbcc", lat: 48.15, lon: 17.11})).s, 401));
await t("falošný token odmietnutý", async () => assert.equal((await call("/api/wave", {id: A, tok: "x", hex: "aabbcc", lat: 48.15, lon: 17.11})).s, 401));
await t("mávnutie vzdialenému lietadlu odmietnuté", async () => {
  plane.lat = 50.5; const r = await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11}); plane.lat = 48.2;
  assert.equal(r.j.error, "far");
});
const fixed = Date.parse(new Date().toISOString().slice(0, 10) + "T10:00:00Z"), realNow = Date.now;
Date.now = () => fixed; await sky.cron(); db.exec(`UPDATE ids SET t=${fixed - 60e3}`);
await t("čerstvý účet nevyhrá zlaté lietadlo", async () => assert.equal((await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11, gps: true})).j.golden, false));
Date.now = () => fixed + 20 * 60e3;
await t("zo zahraničia nevyhrá", async () => assert.equal((await call("/api/wave", {id: B, tok: hb.tok, hex: "aabbcc", lat: 48.15, lon: 17.11, gps: true}, "5.6.7.8", "US")).j.golden, false));
db.exec(`UPDATE ids SET t=0 WHERE id='${C}'`);
db.exec(`INSERT OR IGNORE INTO seen(day, id) VALUES('2000-01-01', '${C}')`);
await call(`/api/sky?id=${C}&tok=${hc.tok}&lat=48.15&lon=17.11&hexes=aabbcc`, null, "9.9.9.9");
await t("poctivý hráč sa dostane do žrebu", async () => assert.equal((await call("/api/wave", {id: C, tok: hc.tok, hex: "aabbcc", lat: 48.15, lon: 17.11, gps: true, nick: "Maťo"}, "9.9.9.9")).j.golden, "entered"));
await t("žreb po 10 minútach vyberie víťaza", async () => {
  Date.now = () => fixed + 35 * 60e3; await sky.cron();
  const g = db.prepare("SELECT state, wnick FROM golden").get(); assert.equal(g.state, 1); assert.equal(g.wnick, "Maťo");
});
Date.now = realNow;
await t("kraj počíta server", () => assert.deepEqual(db.prepare("SELECT k FROM kraje").all().map(r => r.k), ["BA"]));
await t("max 6 nových účtov z jednej siete za deň", async () => {
  const codes = []; for (let i = 0; i < 8; i++) codes.push((await call("/api/hello", {id: "v2zzzzzzzzzzzzzzzzzzzz" + i}, "7.7.7.7")).s);
  assert.deepEqual(codes.slice(-2), [429, 429]);
});
await t("kamarát vidí len prezývku", async () => {
  assert.equal((await call("/api/friend", {id: A, tok: ha.tok, pid: hc.pid})).s, 400); // bez kľúča z odkazu nie
  await call("/api/friend", {id: A, tok: ha.tok, pid: hc.pid, fk: hc.fk});
  const s = (await call(`/api/sky?id=${A}&tok=${ha.tok}&lat=48.15&lon=17.11&hexes=aabbcc`)).j;
  assert.deepEqual(s.friends.aabbcc, [{n: "Maťo"}]); assert.ok(Array.isArray(s.krajeWeek));
});
await t("upozornenia len na povolené servery", async () => {
  assert.equal((await call("/api/sub", {id: A, tok: ha.tok, sub: {endpoint: "https://evil.com/x"}})).s, 400);
  assert.equal((await call("/api/sub", {id: A, tok: ha.tok, sub: {endpoint: "https://fcm.googleapis.com/fcm/send/abc"}, lat: 48.1234, lon: 17.5678})).s, 200);
});
await t("nevhodné meno zmizne po 3 nahláseniach", async () => {
  await call("/api/team", {id: C, tok: hc.tok, action: "create", name: "Zlý tím"}, "9.9.9.9");
  db.exec("UPDATE ids SET t=0"); for (const x of [A, B, C]) for (const dd of ["2000-01-02", "2000-01-03"]) db.exec(`INSERT OR IGNORE INTO seen(day, id) VALUES('${dd}', '${x}')`);
  await call("/api/report", {id: A, tok: ha.tok, name: "Neexistuje"}); assert.equal(db.prepare("SELECT COUNT(*) c FROM reports").get().c, 0);
  for (const [id, tok, ip] of [[A, ha.tok, "1.1.1.1"], [B, hb.tok, "2.2.2.2"], [C, hc.tok, "3.3.3.3"]]) await call("/api/report", {id, tok, name: "ZLÝ TÍM"}, ip);
  assert.equal(db.prepare("SELECT name FROM teams").get().name.startsWith("Tím "), true);
  assert.equal((await call("/api/team", {id: A, tok: ha.tok, action: "create", name: "zlý tím"})).s, 400);
});
await t("liga: max 25 mávnutí na účet a deň, mesto pevné", async () => {
  const before = db.prepare("SELECT SUM(n) s FROM kraje").get().s;
  for (let i = 0; i < 30; i++) { plane.hex = "ab" + String(1000 + i); await call("/api/wave", {id: C, tok: hc.tok, hex: plane.hex, lat: 48.15 + (i % 2) * 0.6, lon: 17.11 + (i % 2) * 1.5}, "9.9.9.9"); }
  plane.hex = "aabbcc";
  assert.ok(db.prepare("SELECT SUM(n) s FROM kraje").get().s - before <= 25);
  assert.deepEqual(db.prepare("SELECT DISTINCT town FROM towns").all().map(r => r.town), ["Bratislava"]);
});
await t("IPv6 z jedného bloku = jedna sieť", async () => {
  const codes = []; for (let i = 0; i < 8; i++) codes.push((await call("/api/hello", {id: "v2yyyyyyyyyyyyyyyyyyyy" + i}, "2001:db8:1:2:" + i + "::1")).s);
  assert.deepEqual(codes.slice(-2), [429, 429]);
});
await t("lievik a chyby sa počítajú anonymne", async () => {
  await call("/api/ev", {step: "open"}); await call("/api/ev", {step: "nieco"}); await call("/api/err", {m: "TypeError x at https://a.b/c.js"});
  assert.equal(db.prepare("SELECT n FROM funnel WHERE step='open'").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM funnel").get().c, 1);
  assert.ok(!db.prepare("SELECT msg FROM errs").get().msg.includes("https"));
});
await t("zdravie servera", async () => assert.equal((await call("/api/health")).s, 200));
await t("štatistiky len s kľúčom", async () => {
  assert.equal((await call("/api/stats")).s, 401);
  assert.equal((await call("/api/stats?key=tajne")).s, 401); // kľúč v adrese už neplatí
  const r = await W.fetch(new Request("https://x/api/stats", {headers: {"x-admin-key": "tajne"}}), env); const j = await r.json();
  assert.equal(r.status, 200); assert.ok(j.days.length === 14);
  assert.equal((await call("/api/export")).s, 404); // export celej databázy je zrušený
});
await t("moje údaje sa dajú stiahnuť", async () => { const r = await call("/api/mydata", {id: C, tok: hc.tok}); assert.equal(r.s, 200); assert.ok(Array.isArray(r.j.wavelog)); assert.ok(!JSON.stringify(r.j).includes(C)); });
await t("zmazanie údajov zruší aj token", async () => {
  await call("/api/forget", {id: A, tok: ha.tok});
  assert.equal(db.prepare("SELECT COUNT(*) c FROM wavelog WHERE id=?").get(A).c, 0);
  assert.equal((await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11})).s, 401);
});
await t("prenos zbierky: jednorazový kód, starý mobil stratí prístup", async () => {
  const x = await call("/api/xfer", {id: B, tok: hb.tok, data: "{\"ctl_col\":\"{}\"}"}, "5.6.7.8");
  assert.equal(x.j.code.length, 8);
  const c1 = await call("/api/xclaim", {code: x.j.code}, "8.8.8.8"); assert.equal(c1.j.id, B); assert.ok(c1.j.tok !== hb.tok);
  assert.equal((await call("/api/xclaim", {code: x.j.code}, "8.8.8.8")).s, 404); // druhýkrát nie
  assert.equal((await call("/api/wave", {id: B, tok: hb.tok, hex: "aabbcc", lat: 48.15, lon: 17.11}, "5.6.7.8")).s, 401);
  assert.equal((await call("/api/hello", {id: B}, "5.6.7.8")).s, 401); // starý mobil si nový token nevypýta
  assert.equal((await call("/api/sky", {id: B, tok: c1.j.tok, lat: 48.15, lon: 17.11, hexes: "aabbcc"})).s, 200);
});
await t("poloha zamknutá na deň (bez teleportu)", async () => {
  const D = "v2dddddddddddddddddddddd4", hd = (await call("/api/hello", {id: D}, "4.4.4.4")).j;
  await call("/api/wave", {id: D, tok: hd.tok, hex: "aabbcc", lat: 48.15, lon: 17.11}, "4.4.4.4");
  const n0 = db.prepare("SELECT n FROM idday WHERE id=?").get(D).n;
  plane.lat = 48.7; plane.lon = 21.2; plane.hex = "cc0001";
  await call("/api/wave", {id: D, tok: hd.tok, hex: "cc0001", lat: 48.72, lon: 21.25}, "4.4.4.4");
  plane.lat = 48.2; plane.lon = 17.2; plane.hex = "aabbcc";
  assert.equal(db.prepare("SELECT n FROM idday WHERE id=?").get(D).n, n0);
});
await t("náhľad odkazu s ošetreným textom", async () => {
  const p = Buffer.from(JSON.stringify({n: "<script>x", p: 120, c: 9})).toString("base64url");
  const r = await call("/s/v/" + p); assert.ok(r.text.includes("og:image")); assert.ok(!r.text.includes("<script>x"));
  assert.ok(r.text.includes("#vyzva=" + p));
});
await t("proxy: cudzí web a cesty zakázané", async () => {
  const pr = async (u, o) => (await W.fetch(new Request("https://x/?url=" + encodeURIComponent(u), {headers: o ? {origin: o} : {}}), {})).status;
  assert.equal(await pr("https://api.adsb.lol/v2/point/48/17/25", "https://slovakiana.github.io"), 200);
  assert.equal(await pr("https://api.adsb.lol/v2/point/48/17/25", "https://evil.com"), 403);
  assert.equal(await pr("https://api.adsb.lol/admin"), 403);
  assert.equal(await pr("https://evil.com/v2/x"), 403);
});
console.log(`\n${ok} testov OK`);
