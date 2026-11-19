// Cloudflare Worker pre appku „Čo to letí?“
//  /?url=…        → sprostredkuje dáta len z povolených zdrojov (s CORS hlavičkou)
//  /api/sky       → živé počty: kto pozerá hore, mávanie, kraje, rekord, spoločný moment, kamoši
//  /api/wave      → zamávaj lietadlu
//  /api/vapid     → verejný kľúč pre upozornenia
//  /api/sub       → prihlásenie na upozornenia
//  /api/track     → sledovanie letu (upozornenie, keď bude nad tebou)
//  /api/msg       → text posledného upozornenia (číta ho service worker)
//  /api/moment    → „bol som pri spoločnom momente“
//  cron každú minútu → spoločný moment + blížiace sa sledované lety
import { DurableObject } from "cloudflare:workers";

const ALLOW = ["api.adsb.lol","api.airplanes.live","opendata.adsb.fi","opensky-network.org","api.adsbdb.com","celestrak.org","api.open-meteo.com"];
const EMO = ["👋","❤️","🇸🇰","🔥","😂","🫡"];
const KRAJE = ["BA","TT","TN","NR","ZA","BB","PO","KE","XX"];
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type"};
const json = (o, s = 200) => new Response(JSON.stringify(o), {status: s, headers: {...CORS, "Content-Type": "application/json", "Cache-Control": "no-store"}});
const cleanHex = h => String(h || "").toLowerCase().replace(/[^0-9a-f~]/g, "").slice(0, 8);
const cleanCs = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
const cleanId = i => String(i || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 40);
const num = (v, d = null) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const b64u = buf => { const b = buf instanceof ArrayBuffer ? new Uint8Array(buf) : (typeof buf === "string" ? new TextEncoder().encode(buf) : buf); let s = ""; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const MOMENT_MS = 3 * 60e3;

function distKm(la1, lo1, la2, lo2) {
  const R = 6371, r = Math.PI / 180, dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
// za koľko minút a ako blízko preletí lietadlo okolo bodu (plochá aproximácia, stačí na ~500 km)
function approachMin(ac, la, lo) {
  const kx = 111.32 * Math.cos(la * Math.PI / 180), ky = 110.57;
  const x = (ac.lon - lo) * kx, y = (ac.lat - la) * ky;
  const v = (ac.gs || 0) * 1.852 / 60, tr = (ac.track || 0) * Math.PI / 180;
  const vx = v * Math.sin(tr), vy = v * Math.cos(tr);
  const now = Math.hypot(x, y);
  if (v < 1) return {t: null, d: now, now};
  const t = -(x * vx + y * vy) / (v * v);
  return {t, d: Math.hypot(x + vx * t, y + vy * t), now};
}

export class Sky extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS waves(day TEXT, hex TEXT, emoji TEXT, n INTEGER, PRIMARY KEY(day, hex, emoji));
      CREATE TABLE IF NOT EXISTS waveby(day TEXT, hex TEXT, id TEXT, PRIMARY KEY(day, hex, id));
      CREATE TABLE IF NOT EXISTS wavelog(day TEXT, hex TEXT, id TEXT, t INTEGER, k TEXT, PRIMARY KEY(day, hex, id));
      CREATE TABLE IF NOT EXISTS kraje(day TEXT, k TEXT, n INTEGER, PRIMARY KEY(day, k));
      CREATE TABLE IF NOT EXISTS totals(day TEXT PRIMARY KEY, n INTEGER);
      CREATE TABLE IF NOT EXISTS pres(id TEXT PRIMARY KEY, t INTEGER, k TEXT);
      CREATE TABLE IF NOT EXISTS nicks(id TEXT PRIMARY KEY, nick TEXT);
      CREATE TABLE IF NOT EXISTS subs(id TEXT PRIMARY KEY, sub TEXT, lat REAL, lon REAL, k TEXT, moment INTEGER, t INTEGER);
      CREATE TABLE IF NOT EXISTS tracks(id TEXT, cs TEXT, label TEXT, lat REAL, lon REAL, notified INTEGER DEFAULT 0, hex TEXT, t INTEGER, PRIMARY KEY(id, cs));
      CREATE TABLE IF NOT EXISTS msgs(id TEXT PRIMARY KEY, title TEXT, body TEXT, url TEXT, t INTEGER);
      CREATE TABLE IF NOT EXISTS queue(qid INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT);
      CREATE TABLE IF NOT EXISTS moments(day TEXT PRIMARY KEY, start INTEGER, sent INTEGER DEFAULT 0, n INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS momentby(day TEXT, id TEXT, PRIMARY KEY(day, id));
      CREATE TABLE IF NOT EXISTS planes(day TEXT, hex TEXT, call TEXT, type TEXT, dest TEXT, PRIMARY KEY(day, hex));
      CREATE TABLE IF NOT EXISTS towns(day TEXT, town TEXT, n INTEGER, PRIMARY KEY(day, town));
      CREATE TABLE IF NOT EXISTS mails(mid INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT, hex TEXT, id TEXT, nick TEXT, town TEXT, k TEXT, msg INTEGER, emoji TEXT, t INTEGER, delivered INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS maildel(mid INTEGER, id TEXT, PRIMARY KEY(mid, id));
      CREATE TABLE IF NOT EXISTS maildeliv(mid INTEGER, town TEXT, k TEXT, t INTEGER, seen INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS golden(day TEXT, seq INTEGER, hex TEXT, call TEXT, type TEXT, t INTEGER, wid TEXT, wnick TEXT, wk TEXT, wtown TEXT, wt INTEGER, state INTEGER DEFAULT 0, PRIMARY KEY(day, seq));
      CREATE TABLE IF NOT EXISTS teams(code TEXT PRIMARY KEY, name TEXT, t INTEGER);
      CREATE TABLE IF NOT EXISTS tmembers(id TEXT PRIMARY KEY, code TEXT, nick TEXT);
      CREATE TABLE IF NOT EXISTS tweek(code TEXT, wk TEXT, n INTEGER, PRIMARY KEY(code, wk));`);
  }
  day() { return new Date().toISOString().slice(0, 10); }
  week(t = Date.now()) { const d = new Date(t); const day = (d.getUTCDay() + 6) % 7; const mon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)); return mon.toISOString().slice(0, 10); }
  goldenNow(d) { return this.row("SELECT * FROM golden WHERE day=? ORDER BY seq DESC LIMIT 1", d); }
  async pickGolden(d, now) {
    const g = this.goldenNow(d), n = (this.row("SELECT COUNT(*) AS c FROM golden WHERE day=?", d) || {c: 0}).c;
    const h = new Date(now).getUTCHours();
    if (g && g.state === 0) {
      // je ešte vo vzduchu nad strednou Európou?
      let ac = null;
      try { const j = await (await fetch("https://api.adsb.lol/v2/hex/" + g.hex, {headers: {"User-Agent": "cotoleti-app"}})).json(); ac = (j.ac || [])[0] || null; } catch (e) { return; }
      const out = !ac || ac.alt_baro === "ground" || ac.lat < 46.8 || ac.lat > 50.6 || ac.lon < 15.2 || ac.lon > 23.8;
      if (out || now - g.t > 3 * 3600e3) this.sql.exec("UPDATE golden SET state=2 WHERE day=? AND seq=?", d, g.seq);
      return;
    }
    if (h < 6 || h > 19 || n >= 4 || (g && now - (g.wt || g.t) < 25 * 60e3)) return;
    let list = [];
    try { const j = await (await fetch("https://api.adsb.lol/v2/point/48.7/19.5/160", {headers: {"User-Agent": "cotoleti-app"}})).json(); list = (j.ac || []).filter(a => a.flight && typeof a.alt_baro === "number" && a.alt_baro > 12000 && a.gs > 250 && a.lat > 47.8 && a.lat < 49.5 && a.lon > 17 && a.lon < 22.4); } catch (e) { return; }
    if (!list.length) return;
    const a = list[Math.floor(Math.random() * list.length)];
    this.sql.exec("INSERT INTO golden(day, seq, hex, call, type, t) VALUES(?, ?, ?, ?, ?, ?)", d, n + 1, cleanHex(a.hex), String(a.flight).trim().slice(0, 8), String(a.t || "").slice(0, 6), now);
  }
  row(q, ...p) { return this.sql.exec(q, ...p).toArray()[0] || null; }
  plane(d, hex) {
    const e = {}; let total = 0;
    for (const r of this.sql.exec("SELECT emoji, n FROM waves WHERE day=? AND hex=?", d, hex).toArray()) { e[r.emoji] = r.n; total += r.n; }
    return {total, emoji: e};
  }
  // dnešný spoločný moment: náhodná minúta medzi 9:00 a 19:00 UTC (10–20 h u nás v zime)
  moment(d) {
    let m = this.row("SELECT * FROM moments WHERE day=?", d);
    if (!m) {
      const base = Date.parse(d + "T09:00:00Z"), start = base + Math.floor(Math.random() * 600) * 60e3;
      this.sql.exec("INSERT OR IGNORE INTO moments(day, start) VALUES(?, ?)", d, start);
      m = this.row("SELECT * FROM moments WHERE day=?", d);
    }
    return m;
  }
  async keys() {
    if (this._keys) return this._keys;
    let k = await this.ctx.storage.get("vapid");
    if (!k) {
      const kp = await crypto.subtle.generateKey({name: "ECDSA", namedCurve: "P-256"}, true, ["sign", "verify"]);
      const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
      const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
      k = {jwk, pub};
      await this.ctx.storage.put("vapid", k);
    }
    const priv = await crypto.subtle.importKey("jwk", k.jwk, {name: "ECDSA", namedCurve: "P-256"}, false, ["sign"]);
    this._keys = {priv, pub: k.pub};
    return this._keys;
  }
  async sendPush(id) {
    const s = this.row("SELECT sub FROM subs WHERE id=?", id);
    if (!s) return;
    let sub; try { sub = JSON.parse(s.sub); } catch (e) { return; }
    if (!sub || !sub.endpoint) return;
    const k = await this.keys(), aud = new URL(sub.endpoint).origin;
    const head = b64u(JSON.stringify({typ: "JWT", alg: "ES256"}));
    const body = b64u(JSON.stringify({aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://slovakiana.github.io/cotoleti-app/"}));
    const sig = await crypto.subtle.sign({name: "ECDSA", hash: "SHA-256"}, k.priv, new TextEncoder().encode(head + "." + body));
    try {
      const r = await fetch(sub.endpoint, {method: "POST", headers: {Authorization: `vapid t=${head}.${body}.${b64u(sig)}, k=${k.pub}`, TTL: "900", Urgency: "high", "Content-Length": "0"}});
      if (r.status === 404 || r.status === 410) this.sql.exec("DELETE FROM subs WHERE id=?", id);
    } catch (e) {}
  }
  notify(id, title, body, url = "./") {
    this.sql.exec("INSERT INTO msgs(id, title, body, url, t) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, body=excluded.body, url=excluded.url, t=excluded.t", id, title, body, url, Date.now());
    this.sql.exec("INSERT INTO queue(id) VALUES(?)", id);
  }
  async kick() { const a = await this.ctx.storage.getAlarm(); if (!a) await this.ctx.storage.setAlarm(Date.now() + 200); }
  async alarm() {
    const rows = this.sql.exec("SELECT qid, id FROM queue ORDER BY qid LIMIT 35").toArray();
    for (const r of rows) { this.sql.exec("DELETE FROM queue WHERE qid=?", r.qid); await this.sendPush(r.id); }
    if (this.row("SELECT 1 AS x FROM queue LIMIT 1")) await this.ctx.storage.setAlarm(Date.now() + 1000);
  }
  async cron() {
    const d = this.day(), now = Date.now();
    // 1) spoločný moment
    const m = this.moment(d);
    if (!m.sent && now >= m.start && now < m.start + MOMENT_MS) {
      this.sql.exec("UPDATE moments SET sent=1 WHERE day=?", d);
      for (const s of this.sql.exec("SELECT id FROM subs WHERE moment=1").toArray())
        this.notify(s.id, "✈️ POZRI HORE!", "Spoločný moment – celé Slovensko sa práve pozerá na oblohu. Máš 3 minúty 👆", "./#moment");
    } else if (!m.sent && now >= m.start + MOMENT_MS) this.sql.exec("UPDATE moments SET sent=1 WHERE day=?", d);
    // 2) zlaté lietadlo dňa
    if (Math.floor(now / 60e3) % 5 === 0) await this.pickGolden(d, now);
    // 3) sledované lety
    this.sql.exec("DELETE FROM tracks WHERE t < ?", now - 36 * 3600e3);
    const css = this.sql.exec("SELECT DISTINCT cs FROM tracks WHERE notified=0 LIMIT 25").toArray().map(r => r.cs);
    for (const cs of css) {
      let ac = null;
      try {
        const r = await fetch("https://api.adsb.lol/v2/callsign/" + cs, {headers: {"User-Agent": "cotoleti-app"}});
        const j = await r.json(); ac = (j.ac || []).find(a => a.lat != null && a.alt_baro !== "ground") || null;
      } catch (e) {}
      if (!ac) continue;
      for (const t of this.sql.exec("SELECT * FROM tracks WHERE cs=? AND notified=0", cs).toArray()) {
        if (ac.hex && t.hex !== ac.hex) this.sql.exec("UPDATE tracks SET hex=? WHERE id=? AND cs=?", ac.hex, t.id, cs);
        if (t.lat == null) continue;
        const a = approachMin(ac, t.lat, t.lon), who = t.label || cs;
        const soon = (a.t != null && a.t > 0 && a.t <= 12 && a.d <= 30) || a.now <= 25;
        if (soon) {
          this.sql.exec("UPDATE tracks SET notified=1 WHERE id=? AND cs=?", t.id, cs);
          const mins = a.t != null && a.t > 1 ? `o ~${Math.round(a.t)} min` : "práve teraz";
          this.notify(t.id, `✈️ ${who} letí nad tebou ${mins}!`, "Vyjdi von a zamávaj 👋 Ťukni a nájdi lietadlo na oblohe.", "./#let=" + cs);
        }
      }
    }
    if (this.row("SELECT 1 AS x FROM queue LIMIT 1")) await this.kick();
  }
  async fetch(req) {
    const u = new URL(req.url), d = this.day(), now = Date.now(), p = u.pathname;
    const body = async () => { try { return JSON.parse(await req.text()); } catch (e) { return {}; } };
    if (p === "/cron") { await this.cron(); return json({ok: true}); }
    if (p === "/api/vapid") return json({key: (await this.keys()).pub});
    if (p === "/api/wave" && req.method === "POST") {
      const b = await body();
      const hex = cleanHex(b.hex), id = cleanId(b.id);
      const emoji = EMO.includes(b.emoji) ? b.emoji : "👋", k = KRAJE.includes(b.k) ? b.k : "XX";
      if (!hex || id.length < 8) return json({error: "bad"}, 400);
      if (b.nick) this.sql.exec("INSERT INTO nicks(id, nick) VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET nick=excluded.nick", id, String(b.nick).slice(0, 20));
      const seen = !!this.row("SELECT 1 AS x FROM wavelog WHERE day=? AND hex=? AND id=?", d, hex, id) || !!this.row("SELECT 1 AS x FROM waveby WHERE day=? AND hex=? AND id=?", d, hex, id);
      let record = false;
      let golden = false;
      if (!seen) {
        const town = String(b.town || "").slice(0, 40);
        this.sql.exec("INSERT INTO planes(day, hex, call, type, dest) VALUES(?, ?, ?, ?, ?) ON CONFLICT(day, hex) DO UPDATE SET call=COALESCE(NULLIF(excluded.call,''), call), type=COALESCE(NULLIF(excluded.type,''), type), dest=COALESCE(NULLIF(excluded.dest,''), dest)",
          d, hex, String(b.call || "").slice(0, 8), String(b.type || "").slice(0, 6), String(b.dest || "").slice(0, 40));
        if (town) this.sql.exec("INSERT INTO towns(day, town, n) VALUES(?, ?, 1) ON CONFLICT(day, town) DO UPDATE SET n = n + 1", d, town);
        const tm = this.row("SELECT code FROM tmembers WHERE id=?", id);
        if (tm) this.sql.exec("INSERT INTO tweek(code, wk, n) VALUES(?, ?, 1) ON CONFLICT(code, wk) DO UPDATE SET n = n + 1", tm.code, this.week());
        const g = this.goldenNow(d);
        if (g && g.state === 0 && g.hex === hex) { this.sql.exec("UPDATE golden SET state=1, wid=?, wnick=?, wk=?, wtown=?, wt=? WHERE day=? AND seq=?", id, String(b.nick || "Spotter").slice(0, 20), k, town, now, d, g.seq); golden = true; }
        this.sql.exec("INSERT INTO wavelog(day, hex, id, t, k) VALUES(?, ?, ?, ?, ?)", d, hex, id, now, k);
        this.sql.exec("INSERT INTO waves(day, hex, emoji, n) VALUES(?, ?, ?, 1) ON CONFLICT(day, hex, emoji) DO UPDATE SET n = n + 1", d, hex, emoji);
        this.sql.exec("INSERT INTO kraje(day, k, n) VALUES(?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1", d, k);
        this.sql.exec("INSERT INTO totals(day, n) VALUES(?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1", d);
      }
      return json({ok: true, dup: seen, golden, plane: this.plane(d, hex)});
    }
    if (p === "/api/mail" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), hex = cleanHex(b.hex), msg = Math.max(0, Math.min(11, num(b.msg, 0) | 0));
      if (id.length < 8 || !hex) return json({error: "bad"}, 400);
      const cnt = (this.row("SELECT COUNT(*) AS c FROM mails WHERE day=? AND id=?", d, id) || {c: 0}).c;
      if (cnt >= 30) return json({error: "limit"}, 429);
      if (this.row("SELECT 1 AS x FROM mails WHERE day=? AND hex=? AND id=?", d, hex, id)) return json({ok: true, dup: true});
      this.sql.exec("INSERT INTO mails(day, hex, id, nick, town, k, msg, emoji, t) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)", d, hex, id, String(b.nick || "").slice(0, 20), String(b.town || "").slice(0, 40), KRAJE.includes(b.k) ? b.k : "XX", msg, EMO.includes(b.emoji) ? b.emoji : "✉️", now);
      const on = (this.row("SELECT COUNT(*) AS c FROM mails WHERE day=? AND hex=?", d, hex) || {c: 0}).c;
      return json({ok: true, on});
    }
    if (p === "/api/team" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), nick = String(b.nick || "Spotter").slice(0, 20);
      if (id.length < 8) return json({error: "bad"}, 400);
      if (b.action === "create") {
        const name = String(b.name || "").trim().slice(0, 24); if (!name) return json({error: "name"}, 400);
        let code; do { code = Array.from({length: 6}, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""); } while (this.row("SELECT 1 AS x FROM teams WHERE code=?", code));
        this.sql.exec("INSERT INTO teams(code, name, t) VALUES(?, ?, ?)", code, name, now);
        this.sql.exec("INSERT INTO tmembers(id, code, nick) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, nick=excluded.nick", id, code, nick);
        return json({ok: true, code, name});
      }
      if (b.action === "join") {
        const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6), t = this.row("SELECT * FROM teams WHERE code=?", code);
        if (!t) return json({error: "notfound"}, 404);
        this.sql.exec("INSERT INTO tmembers(id, code, nick) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, nick=excluded.nick", id, code, nick);
        return json({ok: true, code, name: t.name});
      }
      if (b.action === "leave") { this.sql.exec("DELETE FROM tmembers WHERE id=?", id); return json({ok: true}); }
      return json({error: "bad"}, 400);
    }
    if (p === "/api/sub" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if (id.length < 8 || !b.sub || !b.sub.endpoint || !/^https:\/\//.test(b.sub.endpoint)) return json({error: "bad"}, 400);
      this.sql.exec("INSERT INTO subs(id, sub, lat, lon, k, moment, t) VALUES(?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET sub=excluded.sub, lat=excluded.lat, lon=excluded.lon, k=excluded.k, moment=excluded.moment, t=excluded.t",
        id, JSON.stringify(b.sub).slice(0, 2000), num(b.lat), num(b.lon), KRAJE.includes(b.k) ? b.k : "XX", b.moment ? 1 : 0, now);
      return json({ok: true});
    }
    if (p === "/api/subset" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if ("moment" in b) this.sql.exec("UPDATE subs SET moment=? WHERE id=?", b.moment ? 1 : 0, id);
      if (b.lat != null) this.sql.exec("UPDATE subs SET lat=?, lon=? WHERE id=?", num(b.lat), num(b.lon), id);
      return json({ok: true});
    }
    if (p === "/api/track" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), cs = cleanCs(b.cs);
      if (id.length < 8) return json({error: "bad"}, 400);
      if (!cs || b.off) { this.sql.exec("DELETE FROM tracks WHERE id=?" + (cs ? " AND cs=?" : ""), ...(cs ? [id, cs] : [id])); return json({ok: true}); }
      this.sql.exec("INSERT INTO tracks(id, cs, label, lat, lon, notified, t) VALUES(?, ?, ?, ?, ?, 0, ?) ON CONFLICT(id, cs) DO UPDATE SET label=excluded.label, lat=excluded.lat, lon=excluded.lon, notified=0, t=excluded.t",
        id, cs, String(b.label || "").slice(0, 30), num(b.lat), num(b.lon), now);
      return json({ok: true});
    }
    if (p === "/api/msg") {
      const m = this.row("SELECT title, body, url FROM msgs WHERE id=?", cleanId(u.searchParams.get("id")));
      return json(m || {title: "✈️ Pozri hore!", body: "Niečo zaujímavé letí nad tebou.", url: "./"});
    }
    if (p === "/api/moment" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), m = this.moment(d);
      if (id.length >= 8 && now >= m.start && now < m.start + MOMENT_MS + 60e3) {
        const was = !!this.row("SELECT 1 AS x FROM momentby WHERE day=? AND id=?", d, id);
        if (!was) { this.sql.exec("INSERT INTO momentby(day, id) VALUES(?, ?)", d, id); this.sql.exec("UPDATE moments SET n = n + 1 WHERE day=?", d); }
      }
      return json({ok: true, n: (this.row("SELECT n FROM moments WHERE day=?", d) || {n: 0}).n});
    }
    if (p === "/api/sky") {
      const id = cleanId(u.searchParams.get("id")), k = KRAJE.includes(u.searchParams.get("k")) ? u.searchParams.get("k") : "XX";
      if (id.length >= 8) this.sql.exec("INSERT INTO pres(id, t, k) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET t = excluded.t, k = excluded.k", id, now, k);
      if (Math.random() < 0.03) {
        this.sql.exec("DELETE FROM pres WHERE t < ?", now - 15 * 60e3);
        this.sql.exec("DELETE FROM waveby WHERE day < ?", d);
        const old = new Date(now - 8 * 86400e3).toISOString().slice(0, 10);
        this.sql.exec("DELETE FROM waves WHERE day < ?", old);
        this.sql.exec("DELETE FROM wavelog WHERE day < ?", old);
        this.sql.exec("DELETE FROM momentby WHERE day < ?", old);
      }
      const active = (this.row("SELECT COUNT(*) AS c FROM pres WHERE t > ?", now - 3 * 60e3) || {c: 0}).c;
      const kraje = this.sql.exec("SELECT k, n FROM kraje WHERE day = ? ORDER BY n DESC", d).toArray();
      const wavesToday = (this.row("SELECT n FROM totals WHERE day = ?", d) || {n: 0}).n;
      const allTime = (this.row("SELECT SUM(n) AS s FROM totals") || {s: 0}).s || 0;
      const rec = this.row("SELECT day, n FROM totals WHERE day < ? ORDER BY n DESC LIMIT 1", d);
      const hexes = (u.searchParams.get("hexes") || "").split(",").map(cleanHex).filter(Boolean).slice(0, 25);
      const friendIds = (u.searchParams.get("f") || "").split(",").map(cleanId).filter(x => x.length >= 8).slice(0, 50);
      const planes = {}, friends = {};
      for (const h of hexes) {
        const pl = this.plane(d, h); if (pl.total) planes[h] = pl;
        if (friendIds.length) {
          const fr = this.sql.exec(`SELECT w.id, w.t, w.k, n.nick FROM wavelog w LEFT JOIN nicks n ON n.id = w.id WHERE w.day = ? AND w.hex = ? AND w.id IN (${friendIds.map(() => "?").join(",")})`, d, h, ...friendIds).toArray();
          if (fr.length) friends[h] = fr.map(r => ({n: r.nick || "Kamoš", t: r.t, k: r.k}));
        }
      }
      // pošta: doruč pozdravy z lietadiel, ktoré sú práve nad mnou
      const myTown = String(u.searchParams.get("town") || "").slice(0, 40), mailsIn = [], mailOn = {};
      if (hexes.length) {
        const ph = hexes.map(() => "?").join(",");
        for (const r of this.sql.exec(`SELECT hex, COUNT(*) AS c FROM mails WHERE day=? AND hex IN (${ph}) GROUP BY hex`, d, ...hexes).toArray()) mailOn[r.hex] = r.c;
        if (id.length >= 8) {
          const cand = this.sql.exec(`SELECT * FROM mails m WHERE m.day=? AND m.hex IN (${ph}) AND m.id<>? AND (m.town<>? OR m.town='' OR ?='') AND m.t < ? AND NOT EXISTS (SELECT 1 FROM maildel x WHERE x.mid=m.mid AND x.id=?) ORDER BY m.t DESC LIMIT 2`, d, ...hexes, id, myTown, myTown, now - 60e3, id).toArray();
          for (const m of cand) {
            if (m.town && myTown && m.town === myTown) continue;
            this.sql.exec("INSERT OR IGNORE INTO maildel(mid, id) VALUES(?, ?)", m.mid, id);
            this.sql.exec("UPDATE mails SET delivered = delivered + 1 WHERE mid=?", m.mid);
            this.sql.exec("INSERT INTO maildeliv(mid, town, k, t) VALUES(?, ?, ?, ?)", m.mid, myTown, k, now);
            mailsIn.push({nick: m.nick || "Niekto", town: m.town, k: m.k, msg: m.msg, emoji: m.emoji, hex: m.hex, t: m.t});
          }
        }
      }
      let mailsOut = [];
      if (id.length >= 8) {
        mailsOut = this.sql.exec("SELECT md.rowid AS rid, md.town, md.k, m.msg FROM maildeliv md JOIN mails m ON m.mid = md.mid WHERE m.id=? AND md.seen=0 ORDER BY md.t LIMIT 5", id).toArray();
        for (const r of mailsOut) this.sql.exec("UPDATE maildeliv SET seen=1 WHERE rowid=?", r.rid);
        mailsOut = mailsOut.map(r => ({town: r.town, k: r.k, msg: r.msg}));
      }
      // liga miest
      const towns = this.sql.exec("SELECT town, n FROM towns WHERE day=? ORDER BY n DESC LIMIT 10", d).toArray();
      // zlaté lietadlo
      const g = this.goldenNow(d);
      const golden = g ? {seq: g.seq, hex: g.hex, call: g.call, type: g.type, t: g.t, state: g.state, winner: g.state === 1 ? {n: g.wnick, k: g.wk, town: g.wtown, t: g.wt} : null} : null;
      // tímy
      const wk = this.week(), mt = id.length >= 8 ? this.row("SELECT code FROM tmembers WHERE id=?", id) : null;
      const teamsTop = this.sql.exec("SELECT t.code, t.name, w.n FROM tweek w JOIN teams t ON t.code = w.code WHERE w.wk=? ORDER BY w.n DESC LIMIT 10", wk).toArray().map(r => ({name: r.name, n: r.n, me: !!(mt && mt.code === r.code)}));
      let myTeam = null;
      if (mt) {
        const t = this.row("SELECT * FROM teams WHERE code=?", mt.code);
        if (t) {
          const n = (this.row("SELECT n FROM tweek WHERE code=? AND wk=?", t.code, wk) || {n: 0}).n;
          const rank = (this.row("SELECT COUNT(*) AS c FROM tweek WHERE wk=? AND n > ?", wk, n) || {c: 0}).c + 1;
          const members = this.sql.exec("SELECT nick FROM tmembers WHERE code=? LIMIT 30", t.code).toArray().map(r => r.nick);
          myTeam = {code: t.code, name: t.name, n, rank, members};
        }
      }
      // najzamávanejšie lietadlo týždňa
      const top = this.row("SELECT hex, SUM(n) AS s FROM waves WHERE day >= ? GROUP BY hex ORDER BY s DESC LIMIT 1", wk);
      const weekTop = top ? {...(this.row("SELECT call, type, dest FROM planes WHERE hex=? ORDER BY day DESC LIMIT 1", top.hex) || {}), hex: top.hex, n: top.s} : null;
      const m = this.moment(d), mo = {start: m.start, end: m.start + MOMENT_MS, n: m.n, live: now >= m.start && now < m.start + MOMENT_MS, past: now >= m.start + MOMENT_MS};
      if (!mo.live && !mo.past) delete mo.start; // čas momentu neprezrádzame vopred
      return json({active, wavesToday, allTime, record: rec ? {day: rec.day, n: rec.n} : null, kraje, planes, friends, moment: mo, now, mailsIn, mailsOut, mailOn, towns, golden, teamsTop, myTeam, weekTop});
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
  },
  async scheduled(event, env, ctx) {
    if (env.SKY) ctx.waitUntil(env.SKY.get(env.SKY.idFromName("slovensko")).fetch("https://do/cron"));
  }
};
