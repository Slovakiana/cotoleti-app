// Testy: lesklé (shiny) kartičky a edície „Bol som pri tom“ – server prideľuje, /api/wave vracia shiny/ed/no.
// Spustenie: node tests/shiny_ed.test.mjs   (Node 22+)
import {DatabaseSync} from "node:sqlite";
import {readFileSync, writeFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";

const raw = readFileSync(new URL("../server/worker.js", import.meta.url), "utf8");
const src = raw.replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}") + "\nexport {EVENTS, SHINY_P};";
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
  sky._radarSnap = null; sky._radarSnapRetryAt = 0;
  db.exec("DELETE FROM meta WHERE k LIKE 'radar:%'");
  if (p === "/api/wave" && b && b.gps === undefined) b = {...b, gps: true};
  const r = new Request("https://x" + p, b ? {method: "POST", body: JSON.stringify(b), headers: {"cf-connecting-ip": ip}} : {headers: {"cf-connecting-ip": ip}});
  Object.defineProperty(r, "cf", {value: {country: cc, latitude: "48.15", longitude: "17.1"}});
  const res = await W.fetch(r, env); const text = await res.text();
  let j = null; try { j = JSON.parse(text); } catch (e) {}
  return {s: res.status, j, text};
};
let ok = 0, bad = 0; const t = async (name, fn) => { try { await fn(); ok++; console.log("✓", name); } catch (e) { bad++; console.log("✗", name, "–", e.message.split("\n")[0]); } };
const realNow = Date.now, at = iso => { const x = Date.parse(iso); Date.now = () => x; };
const P = [], ips = [];
for (let i = 0; i < 8; i++) { const id = "v2shiny" + "x".repeat(16) + i, ip = "10.0.0." + (i + 1); ips.push(ip); P.push({id, tok: (await call("/api/hello", {id}, ip)).j.tok}); }
const wave = (i, hex, extra = {}) => { plane.hex = hex; return call("/api/wave", {id: P[i].id, tok: P[i].tok, hex, lat: 48.15, lon: 17.11, ...extra}, ips[i]); };
// nájdi lietadlo, ktoré je v daný deň lesklé (a jedno, ktoré nie je)
async function hexes(iso) { const d = sky.day(Date.parse(iso)); let sh = null, no = null;
  for (let i = 0; i < 5000 && !(sh && no); i++) { const h = (0x400000 + i).toString(16); if (await sky.shinyOf(h, d, "c")) sh = sh || h; else no = no || h; }
  return {sh, no}; }

// ---- ✨ shiny ----
at("2026-11-22T10:00:00Z");
const H1 = await hexes("2026-11-22T10:00:00Z");
await t("SHINY_P: bežná ~1,5 %, legendárna 10 %", () => { assert.equal(mod.SHINY_P.c, 15); assert.equal(mod.SHINY_P.l, 100); });
await t("lesklé lietadlo → /api/wave vráti shiny:true a uloží catches.shiny=1", async () => {
  const r = await wave(0, H1.sh); assert.equal(r.s, 200, r.text); assert.equal(r.j.shiny, true, r.text); assert.equal(r.j.ver, 1, r.text);
  assert.equal(db.prepare("SELECT shiny FROM catches WHERE id=? AND hex=?").get(P[0].id, H1.sh).shiny, 1);
});
await t("to isté lietadlo je v ten deň lesklé aj pre iného hráča", async () => assert.equal((await wave(1, H1.sh)).j.shiny, true));
await t("obyčajné lietadlo → shiny:false", async () => assert.equal((await wave(0, H1.no)).j.shiny, false));
await t("nízko nad obzorom (< 8°) → nie je lesklé ani overené", async () => {
  plane.lat = 49.2; plane.lon = 17.11; plane.alt_baro = 30000; // ~115 km → ~2°
  const r = await wave(2, H1.sh); plane.lat = 48.2; plane.lon = 17.2; plane.alt_baro = 36000;
  assert.equal(r.j.shiny, false, r.text); assert.equal(r.j.ver, 0);
});

// ---- 📅 edície ----
await t("dnes (22. 11. 2026) nie je aktívna žiadna edícia → ed:null", async () => assert.equal((await wave(3, H1.no)).j.ed, null));
await t("najbližšia serverová edícia po 22. 11. 2026", () => {
  const now = Date.parse("2026-11-22T10:00:00Z"), nx = mod.EVENTS.filter(e => Date.parse(e.to) > now).sort((a, b) => Date.parse(a.from) - Date.parse(b.from))[0];
  const days = Math.round((Date.parse(nx.from) - now) / 864e5);
  console.log(`   → najbližšia: ${nx.id} o ${days} dní`);
  assert.ok(days <= 21, `medzera bez edície ${days} dní (${nx.id}) – pridaj adventné/vianočné okná`);
});
for (const e of mod.EVENTS) await t("okno edície je platné: " + e.id, () => { const f = Date.parse(e.from), to = Date.parse(e.to); assert.ok(f < to && to - f <= 2 * 864e5, e.id); });
await t("ID edícií v appke (EDS) = ID na serveri", () => {
  const cards = readFileSync(new URL("../js/cards.js", import.meta.url), "utf8");
  const eds = [...cards.matchAll(/\["([a-z]+\d{4})","/g)].map(m => m[1]).filter(x => !x.startsWith("santa"));
  for (const e of mod.EVENTS) assert.ok(eds.includes(e.id), "appka nepozná edíciu " + e.id);
});

const SIL = "2026-12-31T21:00:00Z"; at(SIL);
const H2 = await hexes(SIL);
await t("Silvester: overené mávnutie → ed {id, n, no:1}", async () => {
  const r = await wave(4, H2.no); assert.deepEqual(r.j.ed, {id: "silvester2026", n: "Posledné lietadlo 2026", no: 1}, r.text);
});
await t("ďalší hráč dostane č. 2, ten istý hráč pri ďalšom lietadle stále č. 1", async () => {
  assert.equal((await wave(5, H2.no)).j.ed.no, 2);
  assert.equal((await wave(4, H2.sh)).j.ed.no, 1);
});
await t("lesklé + edícia naraz", async () => { const r = await wave(6, H2.sh); assert.equal(r.j.shiny, true); assert.equal(r.j.ed.no, 3); });
await t("neoverené mávnutie (ručná poloha) edíciu nedostane", async () => {
  plane.hex = (0x500000).toString(16); const r = await call("/api/wave", {id: P[7].id, tok: P[7].tok, hex: plane.hex, lat: 48.15, lon: 17.11, gps: false}, ips[7]);
  assert.equal(r.j.ver, 0); assert.equal(r.j.ed, null);
});
await t("overené lietadlo bez známeho typu tiež dostane edíciu (edícia nezávisí od typu)", async () => {
  plane.t = ""; const r = await wave(7, (0x500001).toString(16)); plane.t = "A21N";
  assert.equal(r.j.ver, 1, r.text); assert.ok(r.j.ed && r.j.ed.no === 4, "ed=" + JSON.stringify(r.j.ed));
});
await t("hranica okna: 23:00:00Z už patrí Novému roku", async () => {
  at("2026-12-31T23:00:00Z"); const r = await wave(0, (0x500002).toString(16)); assert.equal(r.j.ed.id, "novyrok2027");
});
await t("/api/mycards vráti aj lesklé typy a edície (obnova po preinštalovaní)", async () => {
  const r = await call("/api/mycards", {id: P[6].id, tok: P[6].tok}, ips[6]);
  assert.ok(Array.isArray(r.j.sh) && r.j.sh.includes("A21N"), r.text);
  assert.ok(Array.isArray(r.j.ed) && r.j.ed.some(e => e[0] === "silvester2026" && e[2] === 3), r.text);
});
// Advent (ak sú doplnené nové okná)
for (const [iso, id] of [["2026-12-06T12:00:00Z", "mikulas2026"], ["2026-12-24T12:00:00Z", "vianoce2026"]]) await t("edícia " + id + " v " + iso, async () => {
  at(iso); const r = await wave(1, (0x600000 + iso.length + Date.now() % 997).toString(16)); assert.equal(r.j.ed && r.j.ed.id, id, r.text);
});
Date.now = realNow;
console.log(`\n${ok} OK, ${bad} zlyhalo`); if (bad) process.exitCode = 1;
