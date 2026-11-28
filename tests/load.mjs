// QA-04 / OPS-02: záťažový odhad jedného Durable Objectu – koľko ms CPU stojí mávnutie a obnova oblohy.
// Spustenie: node tests/load.mjs [hráči=60] [mávnutia na hráča=5]   (meria lokálne, server v Cloudflare je podobne rýchly)
import {DatabaseSync} from "node:sqlite";
import {readFileSync, writeFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import assert from "node:assert/strict";

const raw = readFileSync(new URL("../server/worker.js", import.meta.url), "utf8");
const src = raw.replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}") + "";
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
  if (u.includes("/v2/point/") || u.includes("/v2/hex/")) return new Response(JSON.stringify({ac: [{...plane, lat: 48.16, lon: 17.12}], now: Date.now()}));
  return new Response("{}"); };
const N = Number(process.argv[2] || 60), K = Number(process.argv[3] || 5);
const req = (p, b, ip) => { const r = new Request("https://x" + p, {method: "POST", body: JSON.stringify(b), headers: {"cf-connecting-ip": ip}});
  Object.defineProperty(r, "cf", {value: {country: "SK", latitude: "48.15", longitude: "17.1"}}); return r; };
const players = [];
for (let i = 0; i < N; i++) { const id = "v2load" + "x".repeat(16) + String(i).padStart(3, "0"), ip = "10.1." + (i >> 8) + "." + (i & 255);
  players.push({id, ip, tok: (await (await W.fetch(req("/api/hello", {id}, ip), env)).json()).tok}); }
const codes = {};
const time = async (label, jobs) => { const t0 = performance.now(); let ok = 0; for (const j of jobs) { const r = await j(); codes[r.status] = (codes[r.status] || 0) + 1; if (r.status < 400) ok++; }
  const ms = performance.now() - t0; console.log(`${label}: ${jobs.length} požiadaviek, ${ok} OK, ${(ms / jobs.length).toFixed(2)} ms/požiadavka → ~${Math.round(1000 / (ms / jobs.length))}/s na jeden objekt`); return ms / jobs.length; };
const waves = [];
for (let k = 0; k < K; k++) for (const p of players) waves.push(() => { plane.hex = (0x500000 + k * 1000 + players.indexOf(p)).toString(16); return W.fetch(req("/api/wave", {id: p.id, tok: p.tok, hex: plane.hex, lat: 48.15, lon: 17.11, gps: true, type: "A320"}, p.ip), env); });
const msWave = await time("Mávnutia", waves);
const msSky = await time("Obnova oblohy (/api/sky)", players.map(p => () => W.fetch(req("/api/sky", {id: p.id, tok: p.tok, hexes: ""}, p.ip), env)));
// Santa 24. 12.: odhad – každý hráč obnovuje oblohu raz za 30 s a máva raz za 2 min
const perPlayer = msSky / 30 + msWave / 120;
console.log(`Odhad: jeden objekt zvládne približne ${Math.round(1000 / perPlayer)} súčasne aktívnych hráčov (pri 100 % vyťažení; bezpečne polovicu).`);
console.log("Stavové kódy:", JSON.stringify(codes));
