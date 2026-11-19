// Cloudflare Worker pre appku „Čo to letí?“
//  /?url=…     → sprostredkuje dáta len z povolených zdrojov (s CORS hlavičkou)
//  /api/sky    → živé počty: kto práve pozerá hore, mávanie lietadlám, súboj krajov
//  /api/wave   → zamávaj lietadlu
//  inak        → servíruje samotnú appku
import { DurableObject } from "cloudflare:workers";

const ALLOW = ["api.adsb.lol","api.airplanes.live","opendata.adsb.fi","opensky-network.org","api.adsbdb.com","celestrak.org","api.open-meteo.com"];
const EMO = ["👋","❤️","🇸🇰","🔥","😂","🫡"];
const KRAJE = ["BA","TT","TN","NR","ZA","BB","PO","KE","XX"];
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const json = (o, s = 200) => new Response(JSON.stringify(o), {status: s, headers: {...CORS, "Content-Type": "application/json", "Cache-Control": "no-store"}});
const cleanHex = h => String(h || "").toLowerCase().replace(/[^0-9a-f~]/g, "").slice(0, 8);

export class Sky extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS waves(day TEXT, hex TEXT, emoji TEXT, n INTEGER, PRIMARY KEY(day, hex, emoji));
      CREATE TABLE IF NOT EXISTS waveby(day TEXT, hex TEXT, id TEXT, PRIMARY KEY(day, hex, id));
      CREATE TABLE IF NOT EXISTS kraje(day TEXT, k TEXT, n INTEGER, PRIMARY KEY(day, k));
      CREATE TABLE IF NOT EXISTS totals(day TEXT PRIMARY KEY, n INTEGER);
      CREATE TABLE IF NOT EXISTS pres(id TEXT PRIMARY KEY, t INTEGER, k TEXT);`);
  }
  day() { return new Date().toISOString().slice(0, 10); }
  plane(d, hex) {
    const e = {}; let total = 0;
    for (const r of this.sql.exec("SELECT emoji, n FROM waves WHERE day=? AND hex=?", d, hex).toArray()) { e[r.emoji] = r.n; total += r.n; }
    return {total, emoji: e};
  }
  async fetch(req) {
    const u = new URL(req.url), d = this.day(), now = Date.now();
    if (u.pathname === "/api/wave" && req.method === "POST") {
      let b = {};
      try { b = JSON.parse(await req.text()); } catch (e) {}
      const hex = cleanHex(b.hex), id = String(b.id || "").slice(0, 40);
      const emoji = EMO.includes(b.emoji) ? b.emoji : "👋", k = KRAJE.includes(b.k) ? b.k : "XX";
      if (!hex || id.length < 8) return json({error: "bad"}, 400);
      const seen = this.sql.exec("SELECT 1 FROM waveby WHERE day=? AND hex=? AND id=?", d, hex, id).toArray().length > 0;
      if (!seen) {
        this.sql.exec("INSERT INTO waveby(day, hex, id) VALUES(?, ?, ?)", d, hex, id);
        this.sql.exec("INSERT INTO waves(day, hex, emoji, n) VALUES(?, ?, ?, 1) ON CONFLICT(day, hex, emoji) DO UPDATE SET n = n + 1", d, hex, emoji);
        this.sql.exec("INSERT INTO kraje(day, k, n) VALUES(?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1", d, k);
        this.sql.exec("INSERT INTO totals(day, n) VALUES(?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1", d);
      }
      return json({ok: true, dup: seen, plane: this.plane(d, hex)});
    }
    if (u.pathname === "/api/sky") {
      const id = String(u.searchParams.get("id") || "").slice(0, 40), k = KRAJE.includes(u.searchParams.get("k")) ? u.searchParams.get("k") : "XX";
      if (id.length >= 8) this.sql.exec("INSERT INTO pres(id, t, k) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET t = excluded.t, k = excluded.k", id, now, k);
      if (Math.random() < 0.03) {
        this.sql.exec("DELETE FROM pres WHERE t < ?", now - 15 * 60e3);
        this.sql.exec("DELETE FROM waveby WHERE day < ?", d);
        const old = new Date(now - 8 * 86400e3).toISOString().slice(0, 10);
        this.sql.exec("DELETE FROM waves WHERE day < ?", old);
      }
      const active = (this.sql.exec("SELECT COUNT(*) AS c FROM pres WHERE t > ?", now - 3 * 60e3).toArray()[0] || {c: 0}).c;
      const kraje = this.sql.exec("SELECT k, n FROM kraje WHERE day = ? ORDER BY n DESC", d).toArray();
      const wavesToday = (this.sql.exec("SELECT n FROM totals WHERE day = ?", d).toArray()[0] || {n: 0}).n;
      const planes = {};
      for (const h of (u.searchParams.get("hexes") || "").split(",").map(cleanHex).filter(Boolean).slice(0, 25)) {
        const p = this.plane(d, h); if (p.total) planes[h] = p;
      }
      return json({active, wavesToday, kraje, planes});
    }
    return json({error: "not found"}, 404);
  }
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, {headers: CORS});
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.SKY) return json({error: "no sky"}, 503);
      try { return await env.SKY.get(env.SKY.idFromName("slovensko")).fetch(req); }
      catch (e) { return json({error: String(e)}, 500); }
    }
    const raw = url.searchParams.get("url");
    if (!raw) {
      if (env.ASSETS) return env.ASSETS.fetch(req);
      return new Response("Čo to letí? server beží ✈️", {headers: CORS});
    }
    let t;
    try { t = new URL(raw); } catch (e) { return new Response("zlá adresa", {status: 400, headers: CORS}); }
    if (t.protocol !== "https:" || !ALLOW.includes(t.hostname)) return new Response("nepovolené", {status: 403, headers: CORS});
    try {
      const r = await fetch(t, {headers: {"User-Agent": "cotoleti-app (github.com/Slovakiana/cotoleti-app)"}, cf: {cacheTtl: 5}});
      const h = new Headers(CORS);
      h.set("Content-Type", r.headers.get("Content-Type") || "application/json");
      h.set("Cache-Control", "no-store");
      return new Response(r.body, {status: r.status, headers: h});
    } catch (e) {
      return json({error: String(e)}, 502);
    }
  }
};
