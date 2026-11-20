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
const PUSH_HOSTS = ["fcm.googleapis.com","updates.push.services.mozilla.com","push.services.mozilla.com","web.push.apple.com","notify.windows.com"];
const APP_ORIGINS = ["https://slovakiana.github.io","https://cotoleti-app.radovan-kudela.workers.dev","http://localhost:8765"];
// kraj a mesto počíta server sám – klientovi neveríme
const KRAJ_C = {BA:[48.15,17.11],TT:[48.38,17.59],TN:[48.89,18.04],NR:[48.31,18.08],ZA:[49.22,18.74],BB:[48.74,19.15],PO:[49.0,21.24],KE:[48.72,21.26]};
const TOWNS = [["Bratislava",48.148,17.107],["Košice",48.716,21.261],["Prešov",48.998,21.234],["Žilina",49.223,18.739],["Banská Bystrica",48.736,19.146],["Nitra",48.306,18.076],["Trnava",48.377,17.587],["Trenčín",48.894,18.044],["Martin",49.063,18.922],["Poprad",49.059,20.297],["Prievidza",48.774,18.627],["Zvolen",48.574,19.124],["Považská Bystrica",49.121,18.448],["Michalovce",48.755,21.918],["Nové Zámky",47.986,18.162],["Spišská Nová Ves",48.944,20.565],["Komárno",47.763,18.129],["Levice",48.217,18.604],["Humenné",48.937,21.906],["Bardejov",49.292,21.276],["Liptovský Mikuláš",49.083,19.612],["Lučenec",48.330,19.667],["Piešťany",48.592,17.827],["Ružomberok",49.075,19.302],["Topoľčany",48.561,18.175],["Trebišov",48.629,21.720],["Čadca",49.438,18.789],["Dubnica nad Váhom",48.959,18.172],["Rimavská Sobota",48.383,20.022],["Partizánske",48.628,18.375],["Šaľa",48.152,17.874],["Vranov nad Topľou",48.889,21.684],["Pezinok",48.289,17.267],["Hlohovec",48.426,17.803],["Brezno",48.806,19.638],["Senica",48.680,17.367],["Nové Mesto nad Váhom",48.757,17.831],["Dunajská Streda",47.993,17.619],["Snina",48.988,22.152],["Senec",48.220,17.400],["Žiar nad Hronom",48.592,18.853],["Rožňava",48.660,20.532],["Dolný Kubín",49.209,19.296],["Bánovce nad Bebravou",48.719,18.258],["Púchov",49.124,18.326],["Malacky",48.436,17.018],["Handlová",48.728,18.762],["Kežmarok",49.135,20.429],["Stará Ľubovňa",49.300,20.687],["Sereď",48.287,17.735],["Kysucké Nové Mesto",49.300,18.786],["Galanta",48.190,17.727],["Levoča",49.025,20.588],["Detva",48.557,19.420],["Skalica",48.845,17.226],["Revúca",48.683,20.117],["Myjava",48.756,17.568],["Svidník",49.306,21.568],["Stupava",48.274,17.032],["Šurany",48.086,18.186],["Štúrovo",47.799,18.718],["Veľký Krtíš",48.211,19.338],["Sabinov",49.102,21.098],["Krupina",48.355,19.065],["Námestovo",49.408,19.480],["Tvrdošín",49.337,19.556],["Stropkov",49.202,21.651],["Gelnica",48.855,20.937],["Moldava nad Bodvou",48.614,21.000],["Medzilaborce",49.272,21.903],["Banská Štiavnica",48.449,18.910],["Turčianske Teplice",48.862,18.862],["Bytča",49.224,18.559],["Žarnovica",48.484,18.721],["Poltár",48.431,19.794],["Sobrance",48.745,22.181],["Kráľovský Chlmec",48.423,21.980],["Šamorín",48.031,17.309],["Modra",48.333,17.307]];
function krajOf(la, lo) {
  if (la == null || la < 47.72 || la > 49.62 || lo < 16.83 || lo > 22.57) return "XX";
  let best = "BA", bd = 1e9;
  for (const [k, v] of Object.entries(KRAJ_C)) { const d = Math.hypot(la - v[0], (lo - v[1]) * 0.66); if (d < bd) { bd = d; best = k; } }
  return best;
}
function townOf(la, lo) {
  if (krajOf(la, lo) === "XX") return "";
  let best = "", bd = 1e9;
  for (const t of TOWNS) { const d = Math.hypot(la - t[1], (lo - t[2]) * 0.66); if (d < bd) { bd = d; best = t[0]; } }
  return bd < 0.3 ? best : "";
}
// prezývky a názvy tímov: bez neviditeľných znakov a vulgarizmov
const BAD = ["kokot","pica","picus","jeb","kurv","kurw","debil","chuj","hovno","srack","fuck","shit","bitch","nigg","negr","hitler","nazi","buzer","zmrd","retard","whore","porn","penis","vagin","kreten","idiot","sieg"];
function cleanName(v, max = 20) {
  let s = String(v || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  const flat = s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/0/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t").replace(/[^a-z]/g, "");
  if (BAD.some(w => flat.includes(w))) return null;
  return s;
}
const round2 = v => v == null ? null : Math.round(Number(v) * 100) / 100;

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
    this.env = env || {};
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
      CREATE TABLE IF NOT EXISTS tweek(code TEXT, wk TEXT, n INTEGER, PRIMARY KEY(code, wk));
      CREATE TABLE IF NOT EXISTS ids(id TEXT PRIMARY KEY, t INTEGER, iph TEXT);
      CREATE TABLE IF NOT EXISTS rl(k TEXT PRIMARY KEY, w INTEGER, n INTEGER);
      CREATE TABLE IF NOT EXISTS friends(a TEXT, b TEXT, PRIMARY KEY(a, b));
      CREATE INDEX IF NOT EXISTS pres_t ON pres(t);
      CREATE INDEX IF NOT EXISTS mails_dh ON mails(day, hex);
      CREATE TABLE IF NOT EXISTS seen(day TEXT, id TEXT, PRIMARY KEY(day, id));
      CREATE TABLE IF NOT EXISTS reports(name TEXT, id TEXT, t INTEGER, PRIMARY KEY(name, id));
      CREATE TABLE IF NOT EXISTS banned(name TEXT PRIMARY KEY, t INTEGER);
      CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);`);
    try { this.sql.exec("ALTER TABLE wavelog ADD COLUMN pid TEXT"); } catch (e) {}
  }
  day() { return new Date().toISOString().slice(0, 10); }
  // meno prejde filtrom aj zoznamom nahlásených mien
  nm(v, max = 20) { const s = cleanName(v, max); if (!s) return null; return this.row("SELECT 1 AS x FROM banned WHERE name=?", s.toLowerCase()) ? null : s; }
  getMeta(k) { const r = this.row("SELECT v FROM meta WHERE k=?", k); return r ? r.v : null; }
  setMeta(k, v) { this.sql.exec("INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", k, String(v)); }
  // týždenný súhrn (bez osobných údajov)
  weekly(wk) {
    const end = new Date(Date.parse(wk) + 7 * 86400e3).toISOString().slice(0, 10);
    const sum = q => (this.row(q, wk, end) || {s: 0}).s || 0;
    const waves = sum("SELECT SUM(n) AS s FROM totals WHERE day >= ? AND day < ?");
    const kraj = this.row("SELECT k, SUM(n) AS s FROM kraje WHERE day >= ? AND day < ? AND k <> 'XX' GROUP BY k ORDER BY s DESC LIMIT 1", wk, end);
    const town = this.row("SELECT town, SUM(n) AS s FROM towns WHERE day >= ? AND day < ? GROUP BY town ORDER BY s DESC LIMIT 1", wk, end);
    const top = this.row("SELECT hex, SUM(n) AS s FROM waves WHERE day >= ? AND day < ? GROUP BY hex ORDER BY s DESC LIMIT 1", wk, end);
    const pl = top ? this.row("SELECT call, type, dest FROM planes WHERE hex=? ORDER BY day DESC LIMIT 1", top.hex) : null;
    const team = this.row("SELECT t.name, w.n FROM tweek w JOIN teams t ON t.code = w.code WHERE w.wk=? ORDER BY w.n DESC LIMIT 1", wk);
    const users = (this.row("SELECT COUNT(DISTINCT id) AS c FROM seen WHERE day >= ? AND day < ?", wk, end) || {c: 0}).c;
    const fresh = (this.row("SELECT COUNT(*) AS c FROM ids WHERE t >= ? AND t < ?", Date.parse(wk), Date.parse(end)) || {c: 0}).c;
    return {wk, waves, users, newUsers: fresh, kraj: kraj ? {k: kraj.k, n: kraj.s} : null, town: town ? {name: town.town, n: town.s} : null, plane: top ? {hex: top.hex, n: top.s, call: pl && pl.call, type: pl && pl.type, dest: pl && pl.dest} : null, team: team ? {name: team.name, n: team.n} : null};
  }
  async postWeekly(r) {
    const e = this.env; if (!e.TG_TOKEN || !e.TG_CHAT) return;
    const KN = {BA: "Bratislavský", TT: "Trnavský", TN: "Trenčiansky", NR: "Nitriansky", ZA: "Žilinský", BB: "Banskobystrický", PO: "Prešovský", KE: "Košický"};
    const text = `✈️ Čo to letí? – týždeň od ${r.wk}\n👋 ${r.waves} mávnutí, ${r.users} spotterov (${r.newUsers} nových)` +
      (r.kraj ? `\n🏆 Najviac mával ${KN[r.kraj.k] || r.kraj.k} kraj (${r.kraj.n})` : "") + (r.town ? `\n🏙️ Mesto týždňa: ${r.town.name}` : "") +
      (r.plane ? `\n🥇 Lietadlo týždňa: ${r.plane.call || r.plane.hex}${r.plane.dest ? " → " + r.plane.dest : ""} (${r.plane.n}× zamávané)` : "") + (r.team ? `\n👥 Tím týždňa: ${r.team.name}` : "") +
      "\n\nPozri hore 👉 https://slovakiana.github.io/cotoleti-app/";
    try { await fetch(`https://api.telegram.org/bot${e.TG_TOKEN}/sendMessage`, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({chat_id: e.TG_CHAT, text, disable_web_page_preview: false})}); } catch (err) {}
  }
  admin(u) { const k = this.env.ADMIN_KEY; return !!k && u.searchParams.get("key") === k; }
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
  async secret() {
    if (this._sec) return this._sec;
    let raw = await this.ctx.storage.get("hmac");
    if (!raw) { raw = b64u(crypto.getRandomValues(new Uint8Array(32))); await this.ctx.storage.put("hmac", raw); }
    this._salt = raw;
    this._sec = await crypto.subtle.importKey("raw", new TextEncoder().encode(raw), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
    return this._sec;
  }
  async pid(id) { return b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pid:" + id))).replace(/[^A-Za-z0-9]/g, "").slice(0, 16); }
  async tok(id) { return b64u(await crypto.subtle.sign("HMAC", await this.secret(), new TextEncoder().encode("id:" + id))).slice(0, 24); }
  async authed(id, tok) { if (!id || id.length < 8 || !tok) return false; return (await this.tok(id)) === String(tok); }
  async iph(ip) { await this.secret(); return b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(this.day() + "|" + this._salt + "|" + (ip || "?")))).slice(0, 16); }
  // obmedzenie počtu požiadaviek: true = povolené
  rate(key, limit, winMs) {
    const w = Math.floor(Date.now() / winMs), r = this.row("SELECT w, n FROM rl WHERE k=?", key);
    if (!r || r.w !== w) { this.sql.exec("INSERT INTO rl(k, w, n) VALUES(?, ?, 1) ON CONFLICT(k) DO UPDATE SET w=excluded.w, n=1", key, w); return true; }
    if (r.n >= limit) return false;
    this.sql.exec("UPDATE rl SET n = n + 1 WHERE k=?", key); return true;
  }
  // je lietadlo naozaj blízko tvrdenej polohy?
  async verifyPlane(hex, la, lo) {
    try {
      const r = await fetch("https://api.adsb.lol/v2/hex/" + hex, {headers: {"User-Agent": "cotoleti-app"}, cf: {cacheTtl: 10, cacheEverything: true}});
      const j = await r.json(), a = (j.ac || [])[0];
      if (!a || a.lat == null) return {known: true, found: false};
      if (a.alt_baro === "ground") return {known: true, found: true, ground: true, km: distKm(la, lo, a.lat, a.lon)};
      return {known: true, found: true, km: distKm(la, lo, a.lat, a.lon), call: String(a.flight || "").trim(), type: a.t || ""};
    } catch (e) { return {known: false}; }
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
      if (!PUSH_HOSTS.some(h => { const hn = new URL(sub.endpoint).hostname; return hn === h || hn.endsWith("." + h); })) return;
      const r = await fetch(sub.endpoint, {method: "POST", redirect: "manual", headers: {Authorization: `vapid t=${head}.${body}.${b64u(sig)}, k=${k.pub}`, TTL: "900", Urgency: "high", "Content-Length": "0"}});
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
    this.setMeta("cron", now);
    // 🎅 Santa vzlietol (24.12. 15:00 SEČ = 14:00 UTC)
    const dt = new Date(now);
    if (dt.getUTCMonth() === 11 && dt.getUTCDate() === 24 && dt.getUTCHours() >= 14 && this.getMeta("santa") !== String(dt.getUTCFullYear())) {
      this.setMeta("santa", dt.getUTCFullYear());
      for (const s of this.sql.exec("SELECT id FROM subs").toArray()) this.notify(s.id, "🎅 Santa vzlietol!", "Do 22:00 preletí aj nad tebou. Otvor appku a zamávaj mu 👋", "./#santa");
    }
    // týždenný súhrn v pondelok ráno
    const wk = this.week(), prev = this.week(now - 7 * 86400e3);
    if (dt.getUTCDay() === 1 && dt.getUTCHours() >= 7 && this.getMeta("weekly") !== prev) {
      this.setMeta("weekly", prev); const r = this.weekly(prev); this.setMeta("weeklyData", JSON.stringify(r)); await this.postWeekly(r);
    }
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
    let _b = null;
    const body = async () => { if (_b) return _b; try { const t = await req.text(); _b = t.length > 4000 ? {} : JSON.parse(t); } catch (e) { _b = {}; } return _b; };
    const ip = req.headers.get("x-cc-ip") || "", country = req.headers.get("x-cc-country") || "", ipLat = num(req.headers.get("x-cc-lat")), ipLon = num(req.headers.get("x-cc-lon"));
    const iph = await this.iph(ip);
    const ipFar = (la, lo) => ipLat != null && la != null && distKm(la, lo, ipLat, ipLon) > 650;
    if (p === "/api/hello" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if (id.length < 16) return json({error: "bad"}, 400);
      if (!this.row("SELECT 1 AS x FROM ids WHERE id=?", id)) {
        if (!this.rate("mint:" + iph, 6, 86400e3)) return json({error: "rate"}, 429);
        this.sql.exec("INSERT INTO ids(id, t, iph) VALUES(?, ?, ?)", id, now, iph);
      }
      return json({tok: await this.tok(id), pid: await this.pid(id)});
    }
    if (req.method === "POST" && p !== "/cron") {
      const b = await body();
      if (!(await this.authed(cleanId(b.id), b.tok))) return json({error: "auth"}, 401);
      if (!this.rate("post:" + iph, 60, 60e3)) return json({error: "rate"}, 429);
    }
    if (p === "/cron") { await this.cron(); return json({ok: true}); }
    if (p === "/api/health") {
      const c = Number(this.getMeta("cron") || 0);
      return json({ok: now - c < 5 * 60e3, lastCron: c, behindMin: Math.round((now - c) / 60e3), active: (this.row("SELECT COUNT(*) AS c FROM pres WHERE t > ?", now - 3 * 60e3) || {c: 0}).c});
    }
    if (p === "/api/weekly") return json(JSON.parse(this.getMeta("weeklyData") || "null") || this.weekly(this.week()));
    if (p === "/api/tname") { const t = this.row("SELECT name FROM teams WHERE code=?", String(u.searchParams.get("c") || "").toUpperCase().slice(0, 6)); return json({name: t ? t.name : ""}); }
    if (p === "/api/stats") {
      if (!this.admin(u)) return json({error: "auth"}, 401);
      const days = [];
      for (let i = 0; i < 14; i++) {
        const dd = new Date(now - i * 86400e3).toISOString().slice(0, 10), prevD = new Date(now - (i + 1) * 86400e3).toISOString().slice(0, 10);
        const dau = (this.row("SELECT COUNT(*) AS c FROM seen WHERE day=?", dd) || {c: 0}).c;
        const s0 = Date.parse(prevD), born = (this.row("SELECT COUNT(*) AS c FROM ids WHERE t >= ? AND t < ?", s0, s0 + 86400e3) || {c: 0}).c;
        const back = (this.row("SELECT COUNT(*) AS c FROM ids i JOIN seen s ON s.id = i.id AND s.day = ? WHERE i.t >= ? AND i.t < ?", dd, s0, s0 + 86400e3) || {c: 0}).c;
        days.push({day: dd, dau, waves: (this.row("SELECT n FROM totals WHERE day=?", dd) || {n: 0}).n, d1: born ? Math.round(back / born * 100) + "%" : "–"});
      }
      return json({users: (this.row("SELECT COUNT(*) AS c FROM ids") || {c: 0}).c, pushSubs: (this.row("SELECT COUNT(*) AS c FROM subs") || {c: 0}).c, teams: (this.row("SELECT COUNT(*) AS c FROM teams") || {c: 0}).c, days});
    }
    if (p === "/api/export") {
      if (!this.admin(u)) return json({error: "auth"}, 401);
      const out = {t: now};
      for (const t of ["waves", "wavelog", "kraje", "totals", "nicks", "subs", "tracks", "moments", "planes", "towns", "mails", "golden", "teams", "tmembers", "tweek", "ids", "friends", "banned", "seen"]) out[t] = this.sql.exec(`SELECT * FROM ${t}`).toArray();
      return json(out);
    }
    if (p === "/api/vapid") return json({key: (await this.keys()).pub});
    if (p === "/api/wave" && req.method === "POST") {
      const b = await body();
      const hex = cleanHex(b.hex), id = cleanId(b.id), la = num(b.lat), lo = num(b.lon);
      const emoji = EMO.includes(b.emoji) ? b.emoji : "👋";
      if (!hex || id.length < 8 || la == null || lo == null || Math.abs(la) > 90 || Math.abs(lo) > 180) return json({error: "bad"}, 400);
      if (!this.rate("wave:" + iph, 400, 86400e3) || !this.rate("wid:" + id, 150, 86400e3)) return json({error: "rate"}, 429);
      const vp = await this.verifyPlane(hex, la, lo);
      if (vp.known && (!vp.found || vp.ground || vp.km > 130)) return json({error: "far"}, 422);
      // do súťaží sa ráta len poloha zo Slovenska, ktorá sedí s IP adresou
      const fair = country === "SK" && !ipFar(la, lo);
      const k = fair ? krajOf(la, lo) : "XX";
      const nk = this.nm(b.nick);
      if (nk) this.sql.exec("INSERT INTO nicks(id, nick) VALUES(?, ?) ON CONFLICT(id) DO UPDATE SET nick=excluded.nick", id, nk);
      const seen = !!this.row("SELECT 1 AS x FROM wavelog WHERE day=? AND hex=? AND id=?", d, hex, id) || !!this.row("SELECT 1 AS x FROM waveby WHERE day=? AND hex=? AND id=?", d, hex, id);
      let record = false;
      let golden = false;
      if (!seen) {
        const town = fair ? townOf(la, lo) : "";
        this.sql.exec("INSERT INTO planes(day, hex, call, type, dest) VALUES(?, ?, ?, ?, ?) ON CONFLICT(day, hex) DO UPDATE SET call=COALESCE(NULLIF(excluded.call,''), call), type=COALESCE(NULLIF(excluded.type,''), type), dest=COALESCE(NULLIF(excluded.dest,''), dest)",
          d, hex, (vp.call || String(b.call || "")).replace(/[^A-Z0-9]/gi, "").slice(0, 8), (vp.type || String(b.type || "")).replace(/[^A-Z0-9]/gi, "").slice(0, 6), cleanName(b.dest, 40) || "");
        if (town) this.sql.exec("INSERT INTO towns(day, town, n) VALUES(?, ?, 1) ON CONFLICT(day, town) DO UPDATE SET n = n + 1", d, town);
        const tm = this.row("SELECT code FROM tmembers WHERE id=?", id);
        if (tm && fair) this.sql.exec("INSERT INTO tweek(code, wk, n) VALUES(?, ?, 1) ON CONFLICT(code, wk) DO UPDATE SET n = n + 1", tm.code, this.week());
        const g = this.goldenNow(d);
        // zlaté lietadlo: overené blízko (GPS, ≤ 60 km), zo Slovenska, účet starší ako 10 min
        const acct = this.row("SELECT t FROM ids WHERE id=?", id);
        if (g && g.state === 0 && g.hex === hex && fair && b.gps === true && vp.known && vp.found && vp.km <= 60 && acct && now - acct.t > 10 * 60e3) {
          this.sql.exec("UPDATE golden SET state=1, wid=?, wnick=?, wk=?, wtown=?, wt=? WHERE day=? AND seq=?", id, nk || "Spotter", k, town, now, d, g.seq); golden = true;
        }
        this.sql.exec("INSERT INTO wavelog(day, hex, id, t, k, pid) VALUES(?, ?, ?, ?, ?, ?)", d, hex, id, now, k, await this.pid(id));
        this.sql.exec("INSERT INTO waves(day, hex, emoji, n) VALUES(?, ?, ?, 1) ON CONFLICT(day, hex, emoji) DO UPDATE SET n = n + 1", d, hex, emoji);
        if (fair) {
          this.sql.exec("INSERT INTO kraje(day, k, n) VALUES(?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1", d, k);
          this.sql.exec("INSERT INTO totals(day, n) VALUES(?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1", d);
        }
      }
      return json({ok: true, dup: seen, golden, plane: this.plane(d, hex)});
    }
    if (p === "/api/report" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), name = String(b.name || "").normalize("NFKC").trim().slice(0, 24).toLowerCase();
      if (!name || name === "spotter") return json({ok: true});
      if (!this.rate("rep:" + id, 10, 86400e3)) return json({error: "rate"}, 429);
      this.sql.exec("INSERT OR IGNORE INTO reports(name, id, t) VALUES(?, ?, ?)", name, id, now);
      const n = (this.row("SELECT COUNT(*) AS c FROM reports WHERE name=?", name) || {c: 0}).c;
      if (n >= 3) { // 3 rôzni ľudia nahlásili -> meno zmizne všade
        this.sql.exec("INSERT OR IGNORE INTO banned(name, t) VALUES(?, ?)", name, now);
        this.sql.exec("UPDATE nicks SET nick='Spotter' WHERE lower(nick)=?", name);
        this.sql.exec("UPDATE tmembers SET nick='Spotter' WHERE lower(nick)=?", name);
        this.sql.exec("UPDATE mails SET nick='' WHERE lower(nick)=?", name);
        this.sql.exec("UPDATE golden SET wnick='Spotter' WHERE lower(wnick)=?", name);
        this.sql.exec("UPDATE teams SET name='Tím ' || code WHERE lower(name)=?", name);
      }
      return json({ok: true});
    }
    if (p === "/api/friend" && req.method === "POST") {
      const b = await body(), me = await this.pid(cleanId(b.id)), other = String(b.pid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
      if (other.length !== 16 || other === me) return json({error: "bad"}, 400);
      if (!this.rate("friend:" + iph, 30, 86400e3)) return json({error: "rate"}, 429);
      this.sql.exec("INSERT OR IGNORE INTO friends(a, b) VALUES(?, ?)", me, other);
      this.sql.exec("INSERT OR IGNORE INTO friends(a, b) VALUES(?, ?)", other, me);
      return json({ok: true});
    }
    if (p === "/api/forget" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), pd = await this.pid(id);
      for (const t of ["wavelog", "waveby", "maildel", "nicks", "subs", "tracks", "msgs", "tmembers", "pres", "momentby", "ids"]) this.sql.exec(`DELETE FROM ${t} WHERE id=?`, id);
      this.sql.exec("DELETE FROM maildeliv WHERE mid IN (SELECT mid FROM mails WHERE id=?)", id);
      this.sql.exec("DELETE FROM mails WHERE id=?", id);
      this.sql.exec("DELETE FROM friends WHERE a=? OR b=?", pd, pd);
      this.sql.exec("UPDATE golden SET wid=NULL, wnick='Spotter', wtown='' WHERE wid=?", id);
      this.sql.exec("DELETE FROM seen WHERE id=?", id);
      return json({ok: true});
    }
    if (p === "/api/mail" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), hex = cleanHex(b.hex), msg = Math.max(0, Math.min(11, num(b.msg, 0) | 0)), la = num(b.lat), lo = num(b.lon);
      if (id.length < 8 || !hex || la == null || lo == null) return json({error: "bad"}, 400);
      if (!this.rate("mail:" + iph, 40, 86400e3)) return json({error: "limit"}, 429);
      const vp = await this.verifyPlane(hex, la, lo);
      if (vp.known && (!vp.found || vp.ground || vp.km > 130)) return json({error: "far"}, 422);
      const fair = country === "SK" && !ipFar(la, lo);
      const cnt = (this.row("SELECT COUNT(*) AS c FROM mails WHERE day=? AND id=?", d, id) || {c: 0}).c;
      if (cnt >= 30) return json({error: "limit"}, 429);
      if (this.row("SELECT 1 AS x FROM mails WHERE day=? AND hex=? AND id=?", d, hex, id)) return json({ok: true, dup: true});
      const MEMO = ["☀️","🇸🇰","✈️","👋","🌙","❤️","😊","🔥","🙏","🛋️","👀","🥺"];
      this.sql.exec("INSERT INTO mails(day, hex, id, nick, town, k, msg, emoji, t) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)", d, hex, id, this.nm(b.nick) || "", fair ? townOf(la, lo) : "", fair ? krajOf(la, lo) : "XX", msg, MEMO[msg] || "✉️", now);
      const on = (this.row("SELECT COUNT(*) AS c FROM mails WHERE day=? AND hex=?", d, hex) || {c: 0}).c;
      return json({ok: true, on});
    }
    if (p === "/api/team" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), nick = this.nm(b.nick) || "Spotter";
      if (id.length < 8) return json({error: "bad"}, 400);
      if (b.action === "create") {
        const name = this.nm(b.name, 24); if (!name) return json({error: "name"}, 400);
        if (!this.rate("team:" + iph, 3, 86400e3)) return json({error: "rate"}, 429);
        let code; do { code = Array.from({length: 6}, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""); } while (this.row("SELECT 1 AS x FROM teams WHERE code=?", code));
        this.sql.exec("INSERT INTO teams(code, name, t) VALUES(?, ?, ?)", code, name, now);
        this.sql.exec("INSERT INTO tmembers(id, code, nick) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, nick=excluded.nick", id, code, nick);
        return json({ok: true, code, name});
      }
      if (b.action === "join") {
        if (!this.rate("tjoin:" + iph, 20, 3600e3)) return json({error: "rate"}, 429);
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
      let host = ""; try { host = new URL(b.sub && b.sub.endpoint).hostname; } catch (e) {}
      if (id.length < 8 || !host || !/^https:\/\//.test(b.sub.endpoint) || !PUSH_HOSTS.some(h => host === h || host.endsWith("." + h))) return json({error: "bad"}, 400);
      if (!this.rate("sub:" + iph, 10, 86400e3)) return json({error: "rate"}, 429);
      this.sql.exec("INSERT INTO subs(id, sub, lat, lon, k, moment, t) VALUES(?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET sub=excluded.sub, lat=excluded.lat, lon=excluded.lon, k=excluded.k, moment=excluded.moment, t=excluded.t",
        id, JSON.stringify({endpoint: b.sub.endpoint}).slice(0, 1000), round2(b.lat), round2(b.lon), krajOf(num(b.lat), num(b.lon)), b.moment ? 1 : 0, now);
      return json({ok: true});
    }
    if (p === "/api/subset" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if ("moment" in b) this.sql.exec("UPDATE subs SET moment=? WHERE id=?", b.moment ? 1 : 0, id);
      if (b.lat != null) this.sql.exec("UPDATE subs SET lat=?, lon=? WHERE id=?", round2(b.lat), round2(b.lon), id);
      return json({ok: true});
    }
    if (p === "/api/track" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), cs = cleanCs(b.cs);
      if (id.length < 8) return json({error: "bad"}, 400);
      if (!cs || b.off) { this.sql.exec("DELETE FROM tracks WHERE id=?" + (cs ? " AND cs=?" : ""), ...(cs ? [id, cs] : [id])); return json({ok: true}); }
      if ((this.row("SELECT COUNT(*) AS c FROM tracks WHERE id=? AND cs<>?", id, cs) || {c: 0}).c >= 5) return json({error: "limit"}, 429);
      this.sql.exec("INSERT INTO tracks(id, cs, label, lat, lon, notified, t) VALUES(?, ?, ?, ?, ?, 0, ?) ON CONFLICT(id, cs) DO UPDATE SET label=excluded.label, lat=excluded.lat, lon=excluded.lon, notified=0, t=excluded.t",
        id, cs, cleanName(b.label, 30) || "", round2(b.lat), round2(b.lon), now);
      return json({ok: true});
    }
    if (p === "/api/msg") {
      const mid = cleanId(u.searchParams.get("id"));
      const m = (await this.authed(mid, u.searchParams.get("tok"))) ? this.row("SELECT title, body, url FROM msgs WHERE id=?", mid) : null;
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
      if (!this.rate("sky:" + iph, 40, 60e3)) return json({error: "rate"}, 429);
      const okId = await this.authed(cleanId(u.searchParams.get("id")), u.searchParams.get("tok"));
      const id = okId ? cleanId(u.searchParams.get("id")) : "";
      const sla = num(u.searchParams.get("lat")), slo = num(u.searchParams.get("lon"));
      const k = sla != null && country === "SK" && !ipFar(sla, slo) ? krajOf(sla, slo) : "XX";
      if (id.length >= 8) { const pr = this.row("SELECT t FROM pres WHERE id=?", id); if (!pr || now - pr.t > 60e3) { this.sql.exec("INSERT INTO pres(id, t, k) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET t = excluded.t, k = excluded.k", id, now, k); this.sql.exec("INSERT OR IGNORE INTO seen(day, id) VALUES(?, ?)", d, id); } }
      if (Math.random() < 0.03) {
        this.sql.exec("DELETE FROM pres WHERE t < ?", now - 15 * 60e3);
        this.sql.exec("DELETE FROM waveby WHERE day < ?", d);
        const old = new Date(now - 8 * 86400e3).toISOString().slice(0, 10);
        this.sql.exec("DELETE FROM waves WHERE day < ?", old);
        this.sql.exec("DELETE FROM wavelog WHERE day < ?", old);
        this.sql.exec("DELETE FROM momentby WHERE day < ?", old);
        for (const t of ["planes", "towns", "mails", "kraje"]) this.sql.exec(`DELETE FROM ${t} WHERE day < ?`, old);
        this.sql.exec("DELETE FROM maildel WHERE mid NOT IN (SELECT mid FROM mails)");
        this.sql.exec("DELETE FROM maildeliv WHERE mid NOT IN (SELECT mid FROM mails)");
        this.sql.exec("DELETE FROM rl WHERE k LIKE 'sky:%' OR k LIKE 'post:%'");
        this.sql.exec("DELETE FROM subs WHERE t < ?", now - 90 * 86400e3);
        this.sql.exec("DELETE FROM seen WHERE day < ?", new Date(now - 35 * 86400e3).toISOString().slice(0, 10));
        this.sql.exec("DELETE FROM reports WHERE t < ?", now - 30 * 86400e3);
      }
      const active = (this.row("SELECT COUNT(*) AS c FROM pres WHERE t > ?", now - 3 * 60e3) || {c: 0}).c;
      const kraje = this.sql.exec("SELECT k, n FROM kraje WHERE day = ? ORDER BY n DESC", d).toArray();
      const krajeWeek = this.sql.exec("SELECT k, SUM(n) AS n FROM kraje WHERE day >= ? GROUP BY k ORDER BY n DESC", this.week()).toArray();
      const wavesToday = (this.row("SELECT n FROM totals WHERE day = ?", d) || {n: 0}).n;
      const allTime = (this.row("SELECT SUM(n) AS s FROM totals") || {s: 0}).s || 0;
      const rec = this.row("SELECT day, n FROM totals WHERE day < ? ORDER BY n DESC LIMIT 1", d);
      const hexes = (u.searchParams.get("hexes") || "").split(",").map(cleanHex).filter(Boolean).slice(0, 25);
      const myPid = id ? await this.pid(id) : "";
      const friendIds = myPid ? this.sql.exec("SELECT b FROM friends WHERE a=? LIMIT 50", myPid).toArray().map(r => r.b) : [];
      const planes = {}, friends = {};
      for (const h of hexes) {
        const pl = this.plane(d, h); if (pl.total) planes[h] = pl;
        if (friendIds.length) {
          const fr = this.sql.exec(`SELECT w.id, n.nick FROM wavelog w LEFT JOIN nicks n ON n.id = w.id WHERE w.day = ? AND w.hex = ? AND w.pid IN (${friendIds.map(() => "?").join(",")})`, d, h, ...friendIds).toArray();
          if (fr.length) friends[h] = fr.map(r => ({n: r.nick || "Kamoš"}));
        }
      }
      // pošta: doruč pozdravy z lietadiel, ktoré sú práve nad mnou
      const myTown = k !== "XX" ? townOf(sla, slo) : "", mailsIn = [], mailOn = {};
      if (hexes.length) {
        const ph = hexes.map(() => "?").join(",");
        for (const r of this.sql.exec(`SELECT hex, COUNT(*) AS c FROM mails WHERE day=? AND hex IN (${ph}) GROUP BY hex`, d, ...hexes).toArray()) mailOn[r.hex] = r.c;
        if (id.length >= 8 && sla != null) {
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
      const golden = g ? {seq: g.seq, hex: g.hex, call: g.call, type: g.type, t: g.t, state: g.state, winner: g.state === 1 ? {n: g.wnick, k: g.wk} : null} : null;
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
      return json({active, wavesToday, allTime, record: rec ? {day: rec.day, n: rec.n} : null, kraje, krajeWeek, planes, friends, moment: mo, now, mailsIn, mailsOut, mailOn, towns, golden, teamsTop, myTeam, weekTop});
    }
    return json({error: "not found"}, 404);
  }
}

/* 🔗 pekný náhľad odkazu (WhatsApp, Messenger, Instagram) + presmerovanie do appky */
const APP_URL = "https://slovakiana.github.io/cotoleti-app/";
const OGI = "https://cotoleti-app.radovan-kudela.workers.dev/og/";
const he = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
function b64json(s) { try { const b = atob(String(s).replace(/-/g, "+").replace(/_/g, "/")); return JSON.parse(decodeURIComponent(Array.from(b, c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""))); } catch (e) { return null; } }
async function sharePage(url, env) {
  const [, , kind, raw = ""] = url.pathname.split("/"), data = raw.slice(0, 1500);
  const nm = v => cleanName(v, 20) || "Kamoš";
  let title = "Čo to letí? ✈️ Pozri hore.", desc = "Každé lietadlo nad tebou naživo. Zamávaj mu s celým Slovenskom 👋", img = "default", hash = "";
  if (kind === "v" && /^[\w-]+$/.test(data)) { const j = b64json(data) || {}; hash = "vyzva=" + data; img = "vyzva";
    title = `⚔️ ${nm(j.n)} ťa vyzýva!`; desc = `Má ${Number(j.p) | 0} bodov a ${Number(j.c) | 0} ulovených lietadiel. Prekonáš ho?`; }
  else if (kind === "k" && /^[\w-]+$/.test(data)) { const j = b64json(data) || {}; hash = "kd=" + data; img = "duel";
    title = `🃏 ${nm(j.n)} ťa vyzýva na súboj kartičiek`; desc = "3 kolá, 3 lietadlá. Ktoré je rýchlejšie, väčšie, ďalej doletí? Trúfneš si?"; }
  else if (kind === "t" && /^[A-Z0-9]{6}$/.test(data)) { hash = "tim=" + data; img = "team"; let n = "";
    try { if (env.SKY) n = (await (await env.SKY.get(env.SKY.idFromName("slovensko")).fetch("https://do/api/tname?c=" + data)).json()).name; } catch (e) {}
    title = `👥 Pridaj sa do tímu${n ? " „" + n + "“" : ""}`; desc = "Mávame lietadlám a bojujeme o 1. miesto na Slovensku ✈️"; }
  else if (kind === "l" && /^[A-Z0-9]{2,8}$/i.test(data)) { const n = url.searchParams.get("n"); hash = "let=" + data.toUpperCase() + (n ? "&n=" + encodeURIComponent(nm(n)) : ""); img = "let";
    title = `✈️ ${n ? nm(n) + " letí" : "Let " + data.toUpperCase()} – sleduj ho naživo`; desc = "Upozorníme ťa, keď bude nad tebou. Vyjdi von a zamávaj 👋"; }
  else if (kind === "santa") { hash = "santa"; img = "santa"; title = "🎅 Santa nad Slovenskom"; desc = "24. 12. od 15:00 preletí nad každým z nás. Zamávaj mu!"; }
  const to = APP_URL + (hash ? "#" + hash : "");
  const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${he(title)}</title>
<meta property="og:title" content="${he(title)}"><meta property="og:description" content="${he(desc)}"><meta property="og:image" content="${OGI + img}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${he(url.href)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Čo to letí?"><meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0;url=${he(to)}"><style>body{background:#0d1430;color:#fff;font-family:system-ui;display:grid;place-items:center;height:100vh;margin:0}a{color:#6dffc7}</style></head>
<body><a href="${he(to)}">Otvoriť appku Čo to letí? ✈️</a></body></html>`;
  return new Response(html, {headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https:"}});
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, {headers: CORS});
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.SKY) return json({error: "no sky"}, 503);
      const h = new Headers();
      for (const [k, v] of req.headers) if (!k.toLowerCase().startsWith("x-cc-")) h.set(k, v);
      h.set("x-cc-ip", req.headers.get("cf-connecting-ip") || "");
      h.set("x-cc-country", (req.cf && req.cf.country) || "");
      if (req.cf && req.cf.latitude) { h.set("x-cc-lat", String(req.cf.latitude)); h.set("x-cc-lon", String(req.cf.longitude)); }
      const fwd = new Request(req.url, {method: req.method, headers: h, body: req.method === "POST" ? await req.text() : undefined});
      try { return await env.SKY.get(env.SKY.idFromName("slovensko")).fetch(fwd); }
      catch (e) { return json({error: String(e)}, 500); }
    }
    if (url.pathname.startsWith("/s/")) return sharePage(url, env);
    const raw = url.searchParams.get("url");
    if (!raw) {
      if (env.ASSETS) {
        const r = await env.ASSETS.fetch(req), h = new Headers(r.headers);
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Referrer-Policy", "strict-origin-when-cross-origin");
        h.set("X-Frame-Options", "DENY");
        h.set("Permissions-Policy", "geolocation=(self), camera=(self), microphone=(self)");
        h.set("Content-Security-Policy", "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https:; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
        return new Response(r.body, {status: r.status, headers: h});
      }
      return new Response("Čo to letí? server beží ✈️", {headers: CORS});
    }
    const origin = req.headers.get("origin");
    if (origin && !APP_ORIGINS.includes(origin)) return new Response("nepovolené", {status: 403, headers: CORS});
    let t;
    try { t = new URL(raw); } catch (e) { return new Response("zlá adresa", {status: 400, headers: CORS}); }
    const PATHS = {"api.adsb.lol": /^\/v2\//, "api.airplanes.live": /^\/v2\//, "opendata.adsb.fi": /^\/api\/v2\//, "opensky-network.org": /^\/api\/states\/all$/, "api.adsbdb.com": /^\/v0\//, "celestrak.org": /^\/NORAD\/elements\/gp\.php$/, "api.open-meteo.com": /^\/v1\/forecast$/};
    if (t.protocol !== "https:" || !ALLOW.includes(t.hostname) || !PATHS[t.hostname].test(t.pathname)) return new Response("nepovolené", {status: 403, headers: CORS});
    try {
      const r = await fetch(t, {redirect: "manual", headers: {"User-Agent": "cotoleti-app (github.com/Slovakiana/cotoleti-app)"}, cf: {cacheTtl: t.hostname === "celestrak.org" ? 3600 : t.hostname === "api.adsbdb.com" ? 86400 : t.hostname === "api.open-meteo.com" ? 900 : 8, cacheEverything: true}});
      const h = new Headers(CORS);
      h.set("Content-Type", t.hostname === "celestrak.org" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
      h.set("X-Content-Type-Options", "nosniff");
      h.set("Content-Security-Policy", "sandbox; default-src 'none'");
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
