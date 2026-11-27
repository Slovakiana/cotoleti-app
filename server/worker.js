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

const ALLOW = ["api.adsbdb.com","celestrak.org","api.open-meteo.com"];
const API_BODY_BYTES = 4096;
const TRANSFER_DATA_BYTES = 1_500_000;
const TRANSFER_BODY_BYTES = 2 * TRANSFER_DATA_BYTES + 4096;
const ACCOUNT_CODE_MS = 10 * 60e3;
const ACCOUNT_BACKUP_KEYS = new Set([
  "ctl_col", "ctl_collectorHunt", "ctl_daily", "ctl_season", "ctl_waved", "ctl_waveN",
  "ctl_nick", "ctl_seen", "ctl_log", "ctl_famScore", "ctl_kdDone", "ctl_kdDay",
  "ctl_gstreak", "ctl_gday", "ctl_streakp", "ctl_adopt", "ctl_momJoined", "ctl_momPts",
  "ctl_goldWon", "ctl_mayor", "ctl_wanted", "ctl_wantedK", "ctl_inv", "ctl_invSeen",
  "ctl_wpd", "ctl_mpd", "ctl_rival", "ctl_hidSeen", "ctl_guessed", "ctl_moment", "ctl_legp"
]);
function accountBackup(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (!value.ctl_col || typeof value.ctl_col !== "object" || Array.isArray(value.ctl_col)) return null;
  const data = JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key]) => ACCOUNT_BACKUP_KEYS.has(key))));
  return TEXT_ENCODER.encode(data).byteLength <= TRANSFER_DATA_BYTES ? data : null;
}
const TEXT_ENCODER = new TextEncoder();
const boundedBody = async (req, limit) => {
  if (Number(req.headers.get("content-length") || 0) > limit) return null;
  if (!req.body) return "";
  const reader = req.body.getReader(), decoder = new TextDecoder();
  let size = 0, text = "";
  for (;;) {
    const {done, value} = await reader.read();
    if (done) return text + decoder.decode();
    size += value.byteLength;
    if (size > limit) { reader.cancel().catch(() => {}); return null; }
    text += decoder.decode(value, {stream: true});
  }
};
function objectJSON(text) {
  try { const value = JSON.parse(text); return value && typeof value === "object" && !Array.isArray(value) ? value : null; }
  catch (e) { return null; }
}
const EMO = ["👋","❤️","🇸🇰","🔥","😂","🫡"];
const KRAJE = ["BA","TT","TN","NR","ZA","BB","PO","KE","XX"];
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Content-Type, x-admin-key","Access-Control-Expose-Headers":"Retry-After","Access-Control-Max-Age":"86400"};
// siete dátových centier a VPN – mávnutia z nich sa do súťaží nerátajú (AWS, Google, Azure, DigitalOcean, OVH, Hetzner, M247, Datacamp, Linode, Vultr, Contabo, Oracle, Alibaba, Scaleway, Leaseweb)
const BIG_TOWNS = ["Bratislava", "Košice", "Prešov", "Žilina", "Banská Bystrica", "Nitra", "Trnava", "Trenčín", "Martin", "Poprad"];
const DC_ASN = new Set([16509, 14618, 15169, 396982, 8075, 14061, 16276, 24940, 9009, 60068, 63949, 20473, 51167, 31898, 45102, 12876, 60781, 212238, 136787]);
const UA = "cotoleti-app/1.0 (+https://github.com/Slovakiana/cotoleti-app)";
/* 🃏 vzácnosť typov (zhodná s js/core.js) – server z nej počíta zbierkové skóre a šancu na shiny */
const T_L = new Set(["B779","AN30","DC6","A124","A225","BLCF","A3ST","A337","C5M","B52","U2","AN22","B2","VC25","F35","MD11","A346","IL76"]);
const T_E = new Set(["A400","C17","K35R","E3TF","E3CF","AN12","L39","F16","GRIF","EUFI","F18","F15","C130","C30J","C27J","RQ4","Q4","P8","R135","C295","CN35","C390","E390","L159","MI24","UH1Y","H47"]);
const T_R = new Set(["A388","B744","B748","B742","A343","B778","GL7T","GLF5","AN26","DC10","L410","AN2","DC3","JU52","Z37","Z37T","Z26","PZ04","H60","MI8","B735","CRJ2","SF34","A338","B762","B3XM","F100","A189","W3","EC25","M28"]);
const T_U = /^(F2TH|B734|AT72|Z42|SHRK|PC7|F900|B73[23]|AS3|AS6|H160|B412|B212|B505|A119|R66|NH90|S76|A30B|A306|A310|A33|A35|B76|B77|B78|B75|AT4|AT7|DH8|EC|AS5|A109|A139|A169|B06|B407|B429|R44|R22|S92|GLF|GL|CL|FA|F9|C68|C700|PC24|LJ|E55|E50|C56|C25|C510|BE20|B350|TBM|P180|C208|PC12|GA[5-8]C)/;
const TYPES_SRV = {C140: "Cessna 140", D328: "Dornier 328", M600: "Piper M600", B779: "Boeing 777-9", AN30: "Antonov An-30", DC6: "Douglas DC-6", E390: "Embraer C-390", C295: "Airbus C295", L159: "Aero L-159", MI24: "Mi-24", UH1Y: "UH-1Y Venom", H47: "CH-47 Chinook", R135: "RC-135", Q4: "Global Hawk", RQ4: "Global Hawk", P8: "P-8 Poseidon", Z37: "Čmelák", A124: "Antonov An-124", BLCF: "Boeing Dreamlifter", A3ST: "Airbus Beluga", A337: "Airbus BelugaXL", C5M: "C-5 Galaxy", B52: "B-52", F35: "F-35", MD11: "MD-11", A346: "Airbus A340-600", IL76: "Iljušin Il-76", A400: "Airbus A400M", C17: "C-17 Globemaster", K35R: "KC-135 tanker", E3TF: "AWACS", F16: "F-16", GRIF: "Gripen", EUFI: "Eurofighter", C130: "C-130 Hercules", C30J: "C-130J", C27J: "C-27J Spartan", H60: "Black Hawk", MI8: "Mi-17", L39: "L-39", VC25: "Air Force One", U2: "U-2", B2: "B-2"};
const T_ALIAS = {AT44: "AT43", AT45: "AT43", AT46: "AT43", E75S: "E75L", CRJX: "CRJ9", MI17: "MI8", MI171: "MI8", UH60: "H60", S70: "H60", C390: "E390", RQ4: "Q4", S22T: "SR22", P28R: "P28A", P28T: "P28A", P28B: "P28A", C150: "C152", CL30: "CL35"};
Object.assign(TYPES_SRV, {Z43: "Zlín Z-43", BL13: "Let L-13 Blaník", L13S: "Aerotechnik L-13 Vivat"});
const tAlias = t => T_ALIAS[t] || t;
function normalizeType(value) {
  const type = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{2,5}$/.test(type) && !["UNK", "UNKN", "ZZZZ", "NONE", "NA", "NIL", "GLID"].includes(type) ? tAlias(type) : "";
}
const tierOf = t0 => { const t = tAlias(t0); return !t ? "c" : T_L.has(t) ? "l" : T_E.has(t) ? "e" : T_R.has(t) ? "r" : T_U.test(t) ? "u" : "c"; };
const TIER_W = {c: 3, u: 8, r: 25, e: 45, l: 80};
const SHINY_P = {c: 15, u: 30, r: 60, e: 80, l: 100}; // z 1000
/* 📅 edície „Bol som pri tom“ – časové okná (UTC), číslované serverom */
const EVENTS = [
  {id: "advent2026", n: "Prvá adventná nedeľa 2026", from: "2026-11-28T23:00:00Z", to: "2026-11-29T23:00:00Z"},
  {id: "mikulas2026", n: "Mikulášske lietadlo 2026", from: "2026-12-05T23:00:00Z", to: "2026-12-06T23:00:00Z"},
  {id: "lucia2026", n: "Lucia 2026", from: "2026-12-12T23:00:00Z", to: "2026-12-13T23:00:00Z"},
  {id: "zslnovrat2026", n: "Zimný slnovrat 2026", from: "2026-12-20T23:00:00Z", to: "2026-12-21T23:00:00Z"},
  {id: "vianoce2026", n: "Štedrý deň 2026", from: "2026-12-23T23:00:00Z", to: "2026-12-24T23:00:00Z"},
  {id: "silvester2026", n: "Posledné lietadlo 2026", from: "2026-12-31T19:00:00Z", to: "2026-12-31T23:00:00Z"},
  {id: "novyrok2027", n: "Prvé lietadlo 2027", from: "2026-12-31T23:00:00Z", to: "2027-01-01T23:00:00Z"},
  {id: "valentin2027", n: "Valentínske lietadlo 2027", from: "2027-02-13T23:00:00Z", to: "2027-02-14T23:00:00Z"},
  {id: "rovnodennost2027", n: "Jarná rovnodennosť 2027", from: "2027-03-19T23:00:00Z", to: "2027-03-20T23:00:00Z"},
  {id: "stefanik2027", n: "Deň Štefánika 2027", from: "2027-05-03T22:00:00Z", to: "2027-05-04T22:00:00Z"},
  {id: "detom2027", n: "Deň detí 2027", from: "2027-05-31T22:00:00Z", to: "2027-06-01T22:00:00Z"},
  {id: "slnovrat2027", n: "Letný slnovrat 2027", from: "2027-06-20T22:00:00Z", to: "2027-06-21T22:00:00Z"},
  {id: "zatmenie2027", n: "Zatmenie Slnka 2027", from: "2027-08-02T08:10:00Z", to: "2027-08-02T10:30:00Z"},
  {id: "perzeidy2027", n: "Noc Perzeíd 2027", from: "2027-08-12T20:00:00Z", to: "2027-08-13T02:00:00Z"},
  {id: "snp2027", n: "Výročie SNP 2027", from: "2027-08-28T22:00:00Z", to: "2027-08-29T22:00:00Z"},
  {id: "halloween2027", n: "Strašidelné lietadlo 2027", from: "2027-10-31T16:00:00Z", to: "2027-10-31T23:00:00Z"},
];
const SNAPSHOT_AGE = 30e3, RADAR_PREVIEW_AGE = 120e3;
const RADAR_ACTIVE_INTERVAL = 24e3, RADAR_SAVING_INTERVAL = 28e3;
const RADAR_REGION = "point/48.7/19.5/250";
const RADAR_DAY = 86400e3, RADAR_HOUR = 3600e3;
const ADSB_NAMES = ["adsb.lol", "airplanes.live", "adsb.fi"];
const positionTime = (a, at) => at - Math.max(0, Number(a.seen_pos) || 0) * 1000;
const retryDelay = (value, now) => {
  if (!value) return 60e3;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(15e3, delay) : 60e3;
};
const ADSB_ORIGINS = ["https://api.adsb.lol/v2/", "https://api.airplanes.live/v2/", "https://opendata.adsb.fi/api/v2/"];
const radarCoordinates = (lat, lon, radius) => {
  if (lat == null || lon == null || lat === "" || lon === "") return null;
  const la = Number(lat), lo = Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180 || distKm(la, lo, 48.7, 19.5) > 330) return null;
  return {la, lo, r: Math.min(60, Math.max(5, num(radius) || 40))};
};
const currentAircraft = a => a && /^~?[a-f0-9]{6}$/i.test(a.hex || "") &&
  Number.isFinite(a.lat) && Math.abs(a.lat) <= 90 && Number.isFinite(a.lon) && Math.abs(a.lon) <= 180 &&
  !(a.seen_pos >= 60);
const privateAircraft = a => a.dbFlags & 12 ? {hex: a.hex, t: a.t || "", r: "", ownOp: "", flight: "", desc: "", dbFlags: a.dbFlags, lat: a.lat, lon: a.lon,
  alt_baro: a.alt_baro, alt_geom: a.alt_geom, gs: a.gs, track: a.track, baro_rate: a.baro_rate,
  geom_rate: a.geom_rate, category: a.category, emergency: a.emergency, seen_pos: a.seen_pos} : a;
async function liveFeed(url, timeout, token) {
  const deadline = AbortSignal.timeout(timeout);
  const headers = {"User-Agent": UA};
  if (token) headers["x-api-key"] = token;
  // Použi rovnakú cestu cez cache Cloudflare ako fungujúci anonymný radar.
  // Autentifikované odpovede ostávajú mimo zdieľanej cache.
  const transport = token ? {cache: "no-store"} : {cf: {cacheTtl: 5, cacheEverything: true}};
  const response = await fetch(url, {headers, ...transport, redirect: "manual", signal: deadline});
  if (!response.ok) {
    const error = Object.assign(Error("upstream " + response.status), {status: response.status, retry: response.headers.get("Retry-After")});
    if (response.body) response.body.cancel().catch(() => {});
    throw error;
  }
  const payload = await response.text(), data = JSON.parse(payload), ac = data?.ac || data?.aircraft;
  const bytes = token ? Math.max(Number(response.headers.get("Content-Length")) || 0, new TextEncoder().encode(payload).length) : 0;
  if (!Array.isArray(ac)) throw Error("upstream format");
  const t = Number(data.now || 0), at = t > 0 ? (t < 1e12 ? t * 1000 : t) : NaN;
  if (!Number.isFinite(at) || Date.now() - at > SNAPSHOT_AGE || at - Date.now() > SNAPSHOT_AGE) throw Error("upstream stale");
  return {ac: ac.filter(currentAircraft), at: Math.min(Date.now(), at), bytes};
}
function elevDeg(km, altFt) { if (altFt == null || km == null) return null; const h = altFt * 0.3048, d = Math.max(km * 1000, 1); return Math.atan2(h - d * d / (2 * 6371e3), d) * 180 / Math.PI; }
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), {status: s, headers: {...CORS, "Content-Type": "application/json", "Cache-Control": "no-store", ...h}});
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
const BAD = ["cigan","zid","buzn","teplos","kunda","curak","mrd","sukat","suka","retardo","pice","jebat","prdel","skurv","debilko","onan","kurev","nahy","sex","drog","heroin","pervers","pedof","kokotin","kokot","pica","picus","jeb","kurv","kurw","debil","chuj","hovno","srack","fuck","shit","bitch","nigg","negr","hitler","nazi","buzer","zmrd","retard","whore","porn","penis","vagin","kreten","idiot","sieg"];
function cleanName(v, max = 20) {
  let s = String(v || "").normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  // azbuka a podobné znaky -> latinka, číslice -> písmená, zdvojené písmená zlúčiť (kooookot)
  const HG = {"а":"a","в":"b","с":"c","е":"e","н":"h","і":"i","ј":"j","к":"k","м":"m","о":"o","р":"p","т":"t","х":"x","у":"y","ѕ":"s","ԁ":"d","ɡ":"g","ո":"n","ս":"u","ν":"v","ο":"o","ρ":"p","τ":"t","α":"a","ε":"e","ι":"i","κ":"k","χ":"x","υ":"u","8":"b","6":"g","9":"g","2":"z"};
  // trieda a škola v mene (napr. „5.B ZŠ“, „3 B“, „gymnázium“) – chránime deti pred dohľadaním
  if (/(^|[^\p{L}\d])\d\s*\.?\s*\p{L}($|[^\p{L}])|(^|\s)z[sš](\s|$)|gymn|škol|skol|zakladn|základn/iu.test(s)) return null;
  let flat = s.toLowerCase().replace(/./gu, c => HG[c] || c).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/0/g, "o").replace(/[1!|]/g, "i").replace(/3/g, "e").replace(/[4@]/g, "a").replace(/[5$]/g, "s").replace(/7/g, "t");
  flat = flat.replace(/x/g, "ch").replace(/ck/g, "k").replace(/ph/g, "f").replace(/[^a-z]/g, "").replace(/(.)\1+/g, "$1");
  if (BAD.some(w => flat.includes(w.replace(/(.)\1+/g, "$1")))) return null;
  return s;
}
const VERSION = "v105";
const PLAYER_DATA_TABLES = [
  "wavewhy", "typeseq", "edcatch", "catches", "mayorm", "mayorhof", "heatp",
  "mission_waves", "relay_waves", "wavelog", "waveby", "maildel", "nicks",
  "subs", "tracks", "msgs", "queue", "tmembers", "pres", "momentby", "reports",
  "gcand", "xfer", "seen", "idday", "reminders", "streaks", "hidden", "mails"
];
const SKDAY = new Intl.DateTimeFormat("sv-SE", {timeZone: "Europe/Bratislava", year: "numeric", month: "2-digit", day: "2-digit"});
const lc = v => String(v || "").normalize("NFKC").trim().toLocaleLowerCase("sk");
// IPv6: celý /64 blok je jeden človek (inak si útočník vie meniť adresu donekonečna)
const ipKey = ip => ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip;
const sameStr = (a, b) => { a = String(a); b = String(b); if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };
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
      CREATE TABLE IF NOT EXISTS revoked_devices(key TEXT PRIMARY KEY, proof TEXT);
      CREATE TABLE IF NOT EXISTS rl(k TEXT PRIMARY KEY, w INTEGER, n INTEGER);
      CREATE TABLE IF NOT EXISTS friends(a TEXT, b TEXT, PRIMARY KEY(a, b));
      CREATE TABLE IF NOT EXISTS reminders(id TEXT, at INTEGER, title TEXT, body TEXT, PRIMARY KEY(id, at));
      CREATE TABLE IF NOT EXISTS catches(id TEXT, hex TEXT, t INTEGER, PRIMARY KEY(id, hex));
      CREATE TABLE IF NOT EXISTS relay_waves(id TEXT, hex TEXT, call TEXT, type TEXT, k TEXT, t INTEGER, other TEXT DEFAULT '', PRIMARY KEY(id, hex, t));
      CREATE INDEX IF NOT EXISTS relay_match ON relay_waves(hex, call, type, t);
      CREATE INDEX IF NOT EXISTS relay_time ON relay_waves(t);
      CREATE TABLE IF NOT EXISTS mission_weeks(week TEXT PRIMARY KEY, goal INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS mission_waves(week TEXT, id TEXT, day TEXT, hex TEXT, PRIMARY KEY(week, id, day, hex));
      CREATE TABLE IF NOT EXISTS heatp(m TEXT, cell TEXT, id TEXT, PRIMARY KEY(m, cell, id));
      CREATE TABLE IF NOT EXISTS typeseq(type TEXT, id TEXT, seq INTEGER, w INTEGER, k TEXT, town TEXT, t INTEGER, PRIMARY KEY(type, id));
      CREATE TABLE IF NOT EXISTS edcatch(ev TEXT, id TEXT, no INTEGER, type TEXT, t INTEGER, PRIMARY KEY(ev, id));
      CREATE TABLE IF NOT EXISTS wavewhy(id TEXT, t INTEGER, hex TEXT, type TEXT, el REAL, ok INTEGER, why TEXT);
      CREATE TABLE IF NOT EXISTS gifts(code TEXT PRIMARY KEY, id TEXT, type TEXT, t INTEGER, used TEXT);
      CREATE TABLE IF NOT EXISTS mayorhof(m TEXT, town TEXT, id TEXT, nick TEXT, n INTEGER, PRIMARY KEY(m, town));
      CREATE TABLE IF NOT EXISTS mayorm(m TEXT, town TEXT, id TEXT, n INTEGER, PRIMARY KEY(m, town, id));
      CREATE TABLE IF NOT EXISTS yagg(y TEXT, k TEXT, n INTEGER, PRIMARY KEY(y, k));
      CREATE TABLE IF NOT EXISTS yplane(y TEXT, hex TEXT, call TEXT, type TEXT, dest TEXT, n INTEGER, PRIMARY KEY(y, hex));
      CREATE INDEX IF NOT EXISTS pres_t ON pres(t);
      CREATE INDEX IF NOT EXISTS mails_dh ON mails(day, hex);
      CREATE TABLE IF NOT EXISTS seen(day TEXT, id TEXT, PRIMARY KEY(day, id));
      CREATE TABLE IF NOT EXISTS reports(name TEXT, id TEXT, t INTEGER, PRIMARY KEY(name, id));
      CREATE TABLE IF NOT EXISTS banned(name TEXT PRIMARY KEY, t INTEGER);
      CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT);
      CREATE TABLE IF NOT EXISTS idday(day TEXT, id TEXT, town TEXT, k TEXT, n INTEGER DEFAULT 0, PRIMARY KEY(day, id));
      CREATE TABLE IF NOT EXISTS funnel(day TEXT, step TEXT, n INTEGER, PRIMARY KEY(day, step));
      CREATE TABLE IF NOT EXISTS refs(pid TEXT PRIMARY KEY, n INTEGER);
      CREATE TABLE IF NOT EXISTS errs(day TEXT, msg TEXT, n INTEGER, PRIMARY KEY(day, msg));
      CREATE INDEX IF NOT EXISTS tweek_wk ON tweek(wk, n);
      CREATE INDEX IF NOT EXISTS tmem_code ON tmembers(code);
      CREATE INDEX IF NOT EXISTS planes_hex ON planes(hex, day);
      CREATE INDEX IF NOT EXISTS mails_id ON mails(id);
      CREATE INDEX IF NOT EXISTS maildeliv_mid ON maildeliv(mid, seen);
      CREATE INDEX IF NOT EXISTS subs_t ON subs(t);
      CREATE INDEX IF NOT EXISTS ids_t ON ids(t);
      CREATE TABLE IF NOT EXISTS gcand(day TEXT, seq INTEGER, id TEXT, nick TEXT, k TEXT, town TEXT, t INTEGER, PRIMARY KEY(day, seq, id));
      CREATE TABLE IF NOT EXISTS xfer(code TEXT PRIMARY KEY, id TEXT, data TEXT, t INTEGER);
      CREATE TABLE IF NOT EXISTS xfer_receipts(code TEXT PRIMARY KEY, id TEXT NOT NULL, proof TEXT NOT NULL, ep INTEGER NOT NULL, t INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS player_accounts(id TEXT PRIMARY KEY, email_key TEXT NOT NULL UNIQUE, backup TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 1);
      CREATE TABLE IF NOT EXISTS account_codes(challenge TEXT PRIMARY KEY, email_key TEXT NOT NULL, id TEXT NOT NULL, mode TEXT NOT NULL, proof TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS account_codes_expiry ON account_codes(expires);
      CREATE TABLE IF NOT EXISTS sig(day TEXT, k TEXT, n INTEGER, PRIMARY KEY(day, k));
      CREATE INDEX IF NOT EXISTS seen_id ON seen(id);
      CREATE INDEX IF NOT EXISTS friends_b ON friends(b);
      CREATE INDEX IF NOT EXISTS wavelog_id ON wavelog(id);
      CREATE INDEX IF NOT EXISTS tracks_cs ON tracks(cs);
      CREATE INDEX IF NOT EXISTS tracks_t ON tracks(t);
      DROP INDEX IF EXISTS waves_day;
      DROP INDEX IF EXISTS friends_a;`);
    for (const q of ["ALTER TABLE ids ADD COLUMN ep INTEGER DEFAULT 0", "ALTER TABLE ids ADD COLUMN ls TEXT", "ALTER TABLE idday ADD COLUMN la REAL", "ALTER TABLE idday ADD COLUMN lo REAL",
      "ALTER TABLE wavelog ADD COLUMN lg INTEGER DEFAULT 0", "ALTER TABLE tmembers ADD COLUMN jt INTEGER DEFAULT 0", "ALTER TABLE nicks ADD COLUMN lc TEXT", "ALTER TABLE nicks ADD COLUMN edited INTEGER NOT NULL DEFAULT 0", "ALTER TABLE teams ADD COLUMN lc TEXT",
      "ALTER TABLE tmembers ADD COLUMN lc TEXT", "ALTER TABLE mails ADD COLUMN lc TEXT", "ALTER TABLE ids ADD COLUMN kid INTEGER DEFAULT 0", "ALTER TABLE reports ADD COLUMN why TEXT", "ALTER TABLE banned ADD COLUMN why TEXT", "ALTER TABLE banned ADD COLUMN ok INTEGER DEFAULT 0", "ALTER TABLE ids ADD COLUMN pid TEXT", "CREATE INDEX IF NOT EXISTS ids_pid ON ids(pid)"]) { try { this.sql.exec(q); } catch (e) {} }
    try { this.sql.exec("CREATE INDEX IF NOT EXISTS nicks_lc ON nicks(lc); CREATE INDEX IF NOT EXISTS teams_lc ON teams(lc); CREATE INDEX IF NOT EXISTS tmem_lc ON tmembers(lc); CREATE INDEX IF NOT EXISTS mails_lc ON mails(lc); CREATE INDEX IF NOT EXISTS wavelog_lg ON wavelog(day, lg); CREATE INDEX IF NOT EXISTS tracks_nc ON tracks(notified, chk)"); } catch (e) {}
    // jednorazové doplnenie normalizovaných mien a vymazanie IP odtlačkov z účtov
    if (!this.row("SELECT 1 AS x FROM meta WHERE k='mig3'")) {
      for (const [t, c, key] of [["nicks", "nick", "id"], ["teams", "name", "code"], ["tmembers", "nick", "id"], ["mails", "nick", "mid"]])
        for (const r of this.sql.exec(`SELECT ${key} AS k, ${c} AS v FROM ${t}`).toArray()) this.sql.exec(`UPDATE ${t} SET lc=? WHERE ${key}=?`, lc(r.v), r.k);
      this.sql.exec("UPDATE ids SET iph=''");
      this.sql.exec("UPDATE tmembers SET jt=0 WHERE jt IS NULL");
      this.sql.exec("INSERT INTO meta(k, v) VALUES('mig3', '1')");
    }
    try { this.sql.exec("ALTER TABLE tracks ADD COLUMN chk INTEGER DEFAULT 0"); } catch (e) {}
    try { this.sql.exec("CREATE INDEX IF NOT EXISTS tracks_nc ON tracks(notified, chk)"); } catch (e) {}
    try { this.sql.exec("ALTER TABLE wavelog ADD COLUMN pid TEXT"); } catch (e) {}
    // skryté mená: komu sme meno skryli (aby sa to dozvedel a mohol sa odvolať)
    this.sql.exec("CREATE TABLE IF NOT EXISTS hidden(id TEXT PRIMARY KEY, name TEXT, t INTEGER, appeal INTEGER DEFAULT 0)");
    try { this.sql.exec("ALTER TABLE banned ADD COLUMN appeal INTEGER DEFAULT 0"); } catch (e) {}
    try { this.sql.exec("CREATE INDEX IF NOT EXISTS wavelog_pid ON wavelog(pid, day)"); } catch (e) {}
    for (const c of ["type TEXT", "reg TEXT", "el REAL", "ok INTEGER", "shiny INTEGER"]) try { this.sql.exec("ALTER TABLE catches ADD COLUMN " + c); } catch (e) {}
    try { this.sql.exec("ALTER TABLE golden ADD COLUMN crew INTEGER"); } catch (e) {}
    for (const column of ["title TEXT", "body TEXT", "url TEXT", "created INTEGER", "expires INTEGER", "next INTEGER DEFAULT 0", "attempts INTEGER DEFAULT 0", "sent INTEGER DEFAULT 0", "sending INTEGER DEFAULT 0"]) {
      try { this.sql.exec("ALTER TABLE queue ADD COLUMN " + column); } catch (e) {}
    }
    this.sql.exec("CREATE INDEX IF NOT EXISTS queue_due ON queue(sent, next)");
    this.sql.exec("CREATE INDEX IF NOT EXISTS queue_inbox ON queue(id, qid)");
    if (!this.getMeta("push-queue-v102")) {
      const migrate = () => {
        this.sql.exec("DELETE FROM queue WHERE title IS NULL AND qid NOT IN (SELECT MAX(qid) FROM queue WHERE title IS NULL GROUP BY id)");
        this.sql.exec("UPDATE queue SET title=(SELECT title FROM msgs WHERE msgs.id=queue.id), body=(SELECT body FROM msgs WHERE msgs.id=queue.id), url=(SELECT url FROM msgs WHERE msgs.id=queue.id), created=(SELECT t FROM msgs WHERE msgs.id=queue.id), expires=(SELECT t+900000 FROM msgs WHERE msgs.id=queue.id) WHERE title IS NULL");
        this.sql.exec("DELETE FROM queue WHERE title IS NULL OR expires<=?", Date.now());
        this.setMeta("push-queue-v102", "1");
      };
      if (this.ctx.storage.transactionSync) this.ctx.storage.transactionSync(migrate);
      else migrate();
    }
    try { this.sql.exec("ALTER TABLE subs ADD COLUMN streak INTEGER DEFAULT 1"); } catch (e) {}
    try { this.sql.exec("ALTER TABLE subs ADD COLUMN leg INTEGER DEFAULT 1"); } catch (e) {}
    this.sql.exec("CREATE TABLE IF NOT EXISTS streaks(id TEXT PRIMARY KEY, n INTEGER, day TEXT)");
    this.sql.exec("CREATE TABLE IF NOT EXISTS duelres(pid TEXT, t INTEGER, n TEXT, res TEXT)");
    try { this.sql.exec("ALTER TABLE duelres ADD COLUMN src TEXT"); } catch (e) {}
    try { this.sql.exec("ALTER TABLE teams ADD COLUMN owner TEXT"); } catch (e) {}
    this.sql.exec("CREATE INDEX IF NOT EXISTS duelres_t ON duelres(t)");
    if (!this.getMeta("privacy-v94")) {
      this.sql.exec("DELETE FROM errs; DELETE FROM funnel");
      this.setMeta("privacy-v94", "1");
    }
    try { this.sql.exec("CREATE INDEX IF NOT EXISTS typeseq_id ON typeseq(id)"); } catch (e) {}
    try { this.sql.exec("CREATE INDEX IF NOT EXISTS typeseq_k ON typeseq(k, id)"); } catch (e) {}
  }
  day(t = Date.now()) { return SKDAY.format(new Date(t)); }
  // meno prejde filtrom aj zoznamom nahlásených mien
  nm(v, max = 20) { const s = cleanName(v, max); if (!s) return null; return this.row("SELECT 1 AS x FROM banned WHERE name=?", lc(s)) ? null : s; }
  getMeta(k) { const r = this.row("SELECT v FROM meta WHERE k=?", k); return r ? r.v : null; }
  setMeta(k, v) { this.sql.exec("INSERT INTO meta(k, v) VALUES(?, ?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", k, String(v)); }
  // týždenný súhrn (bez osobných údajov)
  weekly(wk) {
    const end = new Date(Date.parse(wk) + 7 * 86400e3).toISOString().slice(0, 10);
    const sum = q => (this.row(q, wk, end) || {s: 0}).s || 0;
    const waves = sum("SELECT SUM(n) AS s FROM totals WHERE day >= ? AND day < ?");
    const kraj = this.row("SELECT k, SUM(n) AS s FROM kraje WHERE day >= ? AND day < ? AND k <> 'XX' GROUP BY k ORDER BY s DESC LIMIT 1", wk, end);
    const town = this.row("SELECT town, SUM(n) AS s FROM towns WHERE day >= ? AND day < ? GROUP BY town ORDER BY s DESC LIMIT 1", wk, end);
    const top = this.row("SELECT hex, COUNT(*) AS s FROM wavelog WHERE day >= ? AND day < ? AND lg=1 GROUP BY hex ORDER BY s DESC LIMIT 1", wk, end);
    const pl = top ? this.row("SELECT call, type, dest FROM planes WHERE hex=? ORDER BY day DESC LIMIT 1", top.hex) : null;
    const team = this.row("SELECT t.name, w.n FROM tweek w JOIN teams t ON t.code = w.code WHERE w.wk=? ORDER BY w.n DESC LIMIT 1", wk);
    const users = (this.row("SELECT COUNT(DISTINCT id) AS c FROM seen WHERE day >= ? AND day < ?", wk, end) || {c: 0}).c;
    const fresh = (this.row("SELECT COUNT(*) AS c FROM ids WHERE t >= ? AND t < ?", Date.parse(wk), Date.parse(end)) || {c: 0}).c;
    return {wk, waves, users, newUsers: fresh, kraj: kraj ? {k: kraj.k, n: kraj.s} : null, town: town ? {name: town.town, n: town.s} : null, plane: top ? {hex: top.hex, n: top.s, call: pl && pl.call, type: pl && pl.type, dest: pl && pl.dest} : null, team: team ? {name: team.name, n: team.n} : null};
  }
  async postWeekly(r) {
    const e = this.env; if (!e.TG_TOKEN || !e.TG_CHAT) return true;
    const KN = {BA: "Bratislavský", TT: "Trnavský", TN: "Trenčiansky", NR: "Nitriansky", ZA: "Žilinský", BB: "Banskobystrický", PO: "Prešovský", KE: "Košický"};
    const text = `✈️ Čo to letí? – týždeň od ${r.wk}\n👋 ${r.waves} mávnutí, ${r.users} spotterov (${r.newUsers} nových)` +
      (r.kraj ? `\n🏆 Najviac mával ${KN[r.kraj.k] || r.kraj.k} kraj (${r.kraj.n})` : "") + (r.town ? `\n🏙️ Mesto týždňa: ${r.town.name}` : "") +
      (r.plane ? `\n🥇 Lietadlo týždňa: ${r.plane.call || r.plane.hex}${r.plane.dest ? " → " + r.plane.dest : ""} (${r.plane.n}× zamávané)` : "") + (r.team ? `\n👥 Tím týždňa: ${r.team.name}` : "") +
      "\n\nPozri hore 👉 https://slovakiana.github.io/cotoleti-app/";
    return this.telegram(text);
  }
  async telegram(text) {
    const e = this.env;
    if (!e.TG_TOKEN || !e.TG_CHAT) return true;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(`https://api.telegram.org/bot${e.TG_TOKEN}/sendMessage`, {method: "POST", signal: ctl.signal,
        headers: {"Content-Type": "application/json"}, body: JSON.stringify({chat_id: e.TG_CHAT, text})});
      return r.ok && (await r.json()).ok === true;
    } catch (error) { return false; }
    finally { clearTimeout(timer); }
  }
  // spoločná časť pre všetkých – počíta sa raz za 10 s, nie pri každej požiadavke
  snap(d, now) {
    if (this._gameSnap && this._gameSnap.d === d && now - this._gameSnap.at < 10e3) return this._gameSnap.v;
      const active = (this.row("SELECT COUNT(*) AS c FROM pres WHERE t > ?", now - 3 * 60e3) || {c: 0}).c;
      const kraje = this.sql.exec("SELECT k, n FROM kraje WHERE day = ? ORDER BY n DESC", d).toArray();
      const krajeWeek = this.sql.exec("SELECT k, SUM(n) AS n FROM kraje WHERE day >= ? GROUP BY k ORDER BY n DESC", this.week()).toArray();
      const wavesToday = (this.row("SELECT n FROM totals WHERE day = ?", d) || {n: 0}).n;
      const allTime = (this.row("SELECT SUM(n) AS s FROM totals") || {s: 0}).s || 0;
      const rec = this.row("SELECT day, n FROM totals WHERE day < ? ORDER BY n DESC LIMIT 1", d);
      const towns = this.sql.exec("SELECT town, n FROM towns WHERE day=? ORDER BY n DESC LIMIT 10", d).toArray();
      // menšie mestá (bez 10 najväčších) – aby mali šancu aj menšie miesta
      const townsSmall = this.sql.exec(`SELECT town, n FROM towns WHERE day=? AND town NOT IN (${BIG_TOWNS.map(() => "?").join(",")}) ORDER BY n DESC LIMIT 10`, d, ...BIG_TOWNS).toArray();
      // kraje na hráča: priemer mávnutí na aktívneho spottera (aspoň 3 hráči)
      const krajePP = this.sql.exec("SELECT k, SUM(n) AS s, COUNT(*) AS c FROM idday WHERE day=? AND n > 0 AND k <> 'XX' GROUP BY k HAVING c >= 3", d).toArray().map(r => ({k: r.k, n: Math.round(r.s / r.c * 10) / 10, p: r.c})).sort((a, b) => b.n - a.n);
      const g = this.goldenNow(d);
      const golden = g ? {seq: g.seq, hex: g.hex, call: g.call, type: g.type, t: g.t, state: g.state, crew: g.crew || 0} : null;
      const wk = this.week();
      const teamsTop = this.sql.exec("SELECT t.code, t.name, w.n FROM tweek w JOIN teams t ON t.code = w.code WHERE w.wk=? ORDER BY w.n DESC LIMIT 10", wk).toArray();
      // najzamávanejšie lietadlo týždňa
      if (!this._wk || now - this._wk.at > 5 * 60e3) {
        const top = this.row("SELECT hex, COUNT(*) AS s FROM wavelog WHERE day >= ? AND lg=1 GROUP BY hex ORDER BY s DESC LIMIT 1", wk);
        this._wk = {at: now, v: top ? {...(this.row("SELECT call, type, dest FROM planes WHERE hex=? ORDER BY day DESC LIMIT 1", top.hex) || {}), hex: top.hex, n: top.s} : null};
      }
      const weekTop = this._wk.v;
      const m = this.moment(d), mo = {start: m.start, end: m.start + MOMENT_MS, n: m.n, live: now >= m.start && now < m.start + MOMENT_MS, past: now >= m.start + MOMENT_MS};
      if (!mo.live && !mo.past) delete mo.start; // čas momentu neprezrádzame vopred
      const v = {active, wavesToday, allTime, record: rec ? {day: rec.day, n: rec.n} : null, kraje, krajeWeek, krajePP, moment: mo, towns, townsSmall, golden, teamsTop, weekTop};
    this._gameSnap = {d, at: now, v};
    return v;
  }
  cleanup(d, now) {
        this.sql.exec("DELETE FROM pres WHERE t < ?", now - 15 * 60e3);
        this.sql.exec("DELETE FROM waveby WHERE day < ?", d);
        const old = new Date(now - 8 * 86400e3).toISOString().slice(0, 10);
        this.sql.exec("DELETE FROM waves WHERE day < ?", old);
        this.sql.exec("DELETE FROM wavelog WHERE day < ?", old);
        this.sql.exec("DELETE FROM relay_waves WHERE t < ? OR (other='' AND t < ?)", now - 30 * 86400e3, now - 35 * 60e3);
        const oldestMission = this.week(now - 14 * 86400e3);
        this.sql.exec("DELETE FROM mission_waves WHERE week < ?", oldestMission);
        this.sql.exec("DELETE FROM mission_weeks WHERE week < ?", oldestMission);
        this.ensureMissionWeek(this.week(now));
        this.sql.exec("DELETE FROM momentby WHERE day < ?", old);
        for (const t of ["planes", "towns", "mails", "kraje"]) this.sql.exec(`DELETE FROM ${t} WHERE day < ?`, old);
        this.sql.exec("DELETE FROM heatp WHERE m < ?", new Date(Date.now() - 70 * 86400e3).toISOString().slice(0, 7));
        const mm = (this.row("SELECT MIN(mid) AS m FROM mails") || {}).m; const mmin = mm == null ? 1e15 : mm;
        this.sql.exec("DELETE FROM maildel WHERE mid < ?", mmin); this.sql.exec("DELETE FROM maildeliv WHERE mid < ?", mmin);
        this.sql.exec("DELETE FROM xfer WHERE t < ?", now - 10 * 60e3);
        this.sql.exec("DELETE FROM xfer_receipts WHERE t < ?", now - 86400e3);
        this.sql.exec("DELETE FROM account_codes WHERE expires<=?", now);
        this.sql.exec("DELETE FROM gcand WHERE day < ?", old);
        this.sql.exec("DELETE FROM msgs WHERE t < ?", now - 30 * 86400e3);
        this.sql.exec("DELETE FROM sig WHERE day < ?", new Date(now - 14 * 86400e3).toISOString().slice(0, 10));
        const yr = this.day(now - 365 * 86400e3);
        const inactive = this.sql.exec("SELECT id, pid FROM ids WHERE pid IS NOT NULL AND COALESCE(ls, '') < ? AND t < ? LIMIT 100", yr, now - 365 * 86400e3).toArray();
        for (const account of inactive) {
          const erase = () => this.erasePlayerData(account.id, account.pid);
          if (this.ctx.storage.transactionSync) this.ctx.storage.transactionSync(erase);
          else erase();
        }
        this.sql.exec("DELETE FROM duelres WHERE t < ?", now - 3 * 86400e3);
        this.sql.exec("DELETE FROM gifts WHERE used IS NULL AND t < ?", now - 14 * 86400e3);
        if (this.getMeta("catchClean") !== d) { this.setMeta("catchClean", d); this.sql.exec("DELETE FROM catches WHERE id NOT IN (SELECT id FROM ids)"); // 🏛️ uzávierka mesiaca: víťaz každého mesta ide do siene slávy a dostane odznak + upozornenie
          for (const w of this.sql.exec("SELECT m, town, id, MAX(n) AS n FROM mayorm WHERE m < ? GROUP BY m, town", d.slice(0, 7)).toArray()) {
            if (!w.n) continue; const nk = this.row("SELECT nick FROM nicks WHERE id=?", w.id), kid = this.isKid(w.id);
            this.sql.exec("INSERT OR IGNORE INTO mayorhof(m, town, id, nick, n) VALUES(?, ?, ?, ?, ?)", w.m, w.town, w.id, kid || !nk ? "Spotter" : nk.nick, w.n);
            if (!kid && this.row("SELECT 1 AS x FROM subs WHERE id=?", w.id)) this.notify(w.id, "🏛️ Si Starosta oblohy!", w.town + " – najaktívnejší spotter mesiaca (" + w.n + " 👋)", "./", true);
          }
          this.sql.exec("DELETE FROM mayorm WHERE m < ?", d.slice(0, 7)); this.sql.exec("DELETE FROM meta WHERE k LIKE 'la:%' AND k < ?", "la:" + d); this.sql.exec("DELETE FROM wavewhy WHERE t < ?", now - 7 * 86400e3); }
        if (this.getMeta("rlDay") !== d) { this.setMeta("rlDay", d); this.sql.exec("DELETE FROM rl"); this.sql.exec("DELETE FROM idday WHERE day < ?", old); }
        this.sql.exec("DELETE FROM funnel WHERE day < ?", new Date(now - 60 * 86400e3).toISOString().slice(0, 10));
        this.sql.exec("DELETE FROM errs WHERE day < ?", new Date(now - 14 * 86400e3).toISOString().slice(0, 10));
        this.sql.exec("DELETE FROM subs WHERE t < ?", now - 90 * 86400e3);
        this.sql.exec("DELETE FROM seen WHERE day < ?", new Date(now - 35 * 86400e3).toISOString().slice(0, 10));
        this.sql.exec("DELETE FROM reports WHERE t < ?", now - 30 * 86400e3);
  }
  admin(u, req, bodyKey) { const k = this.env.ADMIN_KEY; return !!k && sameStr(k, (req && req.headers.get("x-admin-key")) || bodyKey || ""); }
  flags() { try { return {santaPush: true, sunWave: true, social: "full", hideMil: false, ...JSON.parse(this.getMeta("flags") || "{}")}; } catch (e) { return {santaPush: true, sunWave: true, social: "full"}; } }
  // upozornenie majiteľovi na Telegram (max 1× za 6 h pre daný typ)
  async alert(kind, text) {
    const e = this.env; if (!e.TG_TOKEN || !e.TG_CHAT) return;
    const key = "al:" + kind, last = Number(this.getMeta(key) || 0);
    if (Date.now() - last < 6 * 3600e3) return;
    if (await this.telegram("⚠️ Čo to letí? – " + text)) this.setMeta(key, Date.now());
    else this.bump("telegram_fail");
  }
  week(t = Date.now()) { const d = new Date(this.day(t) + "T12:00:00Z"); const day = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - day * 86400e3).toISOString().slice(0, 10); }
  ensureMissionWeek(week) {
    const configured = Number(this.getMeta("mission_goal") || 0);
    if (!configured) return 0;
    const started = this.row("SELECT goal FROM mission_weeks WHERE week=?", week);
    if (started) return started.goal;
    this.sql.exec("INSERT INTO mission_weeks(week, goal) VALUES(?, ?)", week, configured);
    return configured;
  }
  missionResult(week, goal, id) {
    const total = this.row("SELECT COUNT(*) AS n FROM mission_waves WHERE week=?", week).n;
    const mine = id ? this.row("SELECT COUNT(*) AS n FROM mission_waves WHERE week=? AND id=?", week, id).n : null;
    return {week, goal, total, mine};
  }
  weeklyMission(now, id = "") {
    const week = this.week(now), goal = this.ensureMissionWeek(week);
    if (!goal) return null;
    const previousWeek = new Date(Date.parse(week + "T12:00:00Z") - 7 * 86400e3).toISOString().slice(0, 10);
    const previous = this.row("SELECT goal FROM mission_weeks WHERE week=?", previousWeek);
    return {...this.missionResult(week, goal, id), previous: previous ? this.missionResult(previousWeek, previous.goal, id) : null};
  }
  relayEnabled() { return (this.env.RELAY_PILOT ?? "1") === "1"; }
  relayWave(id, hex, vp, k, now) {
    const call = cleanCs(vp.call);
    if (!/^[a-f0-9]{6}$/.test(hex) || !/^[A-Z]{3}[0-9]{1,4}[A-Z]?$/.test(call)
      || !vp.type || vp.priv || vp.mil || vp.late || !Object.hasOwn(KRAJ_C,k) || this.isKid(id)) return;
    const start = now - 35 * 60e3;
    if (this.row("SELECT 1 AS x FROM relay_waves WHERE id=? AND hex=? AND call=? AND t>=? LIMIT 1", id, hex, call, start)) return;
    const match = this.row(`SELECT id, k, t FROM relay_waves
      WHERE hex=? AND call=? AND type=? AND t BETWEEN ? AND ? AND k<>? AND id<>? AND other=''
      ORDER BY t DESC LIMIT 1`, hex, call, vp.type, start, now - 120e3, k, id);
    if (!match) {
      this.sql.exec("INSERT OR IGNORE INTO relay_waves(id, hex, call, type, k, t) VALUES(?, ?, ?, ?, ?, ?)", id, hex, call, vp.type, k, now);
      return;
    }
    this.sql.exec("INSERT OR IGNORE INTO relay_waves(id, hex, call, type, k, t, other) VALUES(?, ?, ?, ?, ?, ?, ?)", id, hex, call, vp.type, k, now, match.k);
    this.sql.exec("UPDATE relay_waves SET other=? WHERE id=? AND hex=? AND t=? AND other=''", k, match.id, hex, match.t);
  }
  relayCards(id, now) {
    if (!this.relayEnabled() || !id || this.isKid(id)) return [];
    return this.sql.exec("SELECT type, k, other, t FROM relay_waves WHERE id=? AND t>=? AND other<>'' ORDER BY t DESC LIMIT 24", id, now - 30 * 86400e3).toArray();
  }
  goldenNow(d) { return this.row("SELECT * FROM golden WHERE day=? ORDER BY seq DESC LIMIT 1", d); }
  async pickGolden(d, now) {
    const g = this.goldenNow(d), n = (this.row("SELECT COUNT(*) AS c FROM golden WHERE day=?", d) || {c: 0}).c;
    const h = new Date(now).getUTCHours();
    if (g && g.state === 0) {
      // žreb: 10 minút po prvom prihlásenom mávnutí (alebo keď lietadlo zmizne)
      const first = this.row("SELECT MIN(t) AS t, COUNT(*) AS c FROM gcand WHERE day=? AND seq=?", d, g.seq);
      // 🏆 Zlatá posádka: žiadny žreb – odmenu dostane každý, kto zamával; spoločný bonus pri 20+ ľuďoch
      const draw = c => { const all = this.sql.exec("SELECT id FROM gcand WHERE day=? AND seq=?", d, g.seq).toArray();
        this.sql.exec("UPDATE golden SET state=1, crew=?, wt=? WHERE day=? AND seq=?", all.length, now, d, g.seq);
        for (const w of all.slice(0, 2000)) this.notify(w.id, "🏆 Zlatá posádka: " + all.length + " " + (all.length === 1 ? "človek" : all.length < 5 ? "ľudia" : "ľudí"), all.length >= 20 ? "Spolu ste to dali – každý dostáva +25 bodov navyše!" : "Zlaté lietadlo odletelo. Tvoja zlatá kartička ostáva ✨", "./"); this.bump("gold_crew"); };
      // okno 40 minút – lietadlo preletí celé Slovensko, šancu má aj východ
      if (first && first.c && now - first.t >= 40 * 60e3) { draw(); return; }
      let ac = null;
      { const j = await this.adsb("hex/" + g.hex); if (!j) return; ac = (j.ac || j.aircraft || [])[0] || null; }
      const out = !ac || ac.alt_baro === "ground" || ac.lat < 46.8 || ac.lat > 50.6 || ac.lon < 15.2 || ac.lon > 23.8;
      this.setMeta("upstream", now);
      if (out || now - g.t > 3 * 3600e3) { if (first && first.c) draw(); else this.sql.exec("UPDATE golden SET state=2 WHERE day=? AND seq=?", d, g.seq); }
      return;
    }
    if (h < 6 || h > 19 || n >= 4 || (g && now - (g.wt || g.t) < 25 * 60e3)) return;
    let list = [];
    try { const j = await this.adsb("point/48.7/19.5/160"); if (!j) return; list = (j.ac || j.aircraft || []).filter(a => !(a.dbFlags & 13) && !/^7[567]00$/.test(a.squawk || "") && !(a.emergency && a.emergency !== "none") && a.flight && typeof a.alt_baro === "number" && a.alt_baro > 12000 && a.gs > 250 && a.lat > 47.8 && a.lat < 49.5 && a.lon > 17 && a.lon < 22.4); } catch (e) { return; }
    this.legendAlert(list, d, now);
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
  async adsb(path) {
    const snapshot = await this.snapshot();
    if (snapshot && Date.now() - snapshot.t <= SNAPSHOT_AGE) {
      const separator = path.indexOf("/");
      const [kind, value] = [path.slice(0, separator), path.slice(separator + 1)];
      const ac = kind === "hex" ? [snapshot.m.get(value)].filter(Boolean)
        : [...snapshot.m.values()].filter(a => kind === "point" || cleanCs(a.flight) === value);
      const fresh = ac.filter(a => Date.now() - positionTime(a, snapshot.t) <= SNAPSHOT_AGE);
      if (fresh.length || kind === "point") return {ac: fresh};
    }
    if (path.startsWith("point/")) return null;
    let empty = null;
    for (const i of this.radarSources()) {
      const feed = await this.radarFeed(i, path);
      if (feed) {
        const ac = feed.ac.filter(a => Date.now() - positionTime(a, feed.at) <= SNAPSHOT_AGE);
        if (ac.length) return {ac};
        empty = {ac};
      }
    }
    return empty;
  }
  isKid(id) { return !!(this.row("SELECT kid FROM ids WHERE id=?", id) || {}).kid; }
  // ♛ legendárny poplach: epické/legendárne lietadlo nad SR → upozorni ľudí do 80 km (1× za lietadlo a deň)
  legendAlert(list, d, now) {
    for (const a of list) {
      const ty = String(a.t || ""), tr = tierOf(ty);
      if ((tr !== "l" && tr !== "e") || a.lat == null || (a.dbFlags & 12) || /^7[567]00$/.test(a.squawk || "") || (a.emergency && a.emergency !== "none")) continue; // LADD/PIA a núdza: žiadny poplach
      const hx = cleanHex(a.hex), key = "la:" + d + ":" + hx;
      if (this.getMeta(key)) continue; this.setMeta(key, String(now));
      const nm = TYPES_SRV[ty] || ty;
      for (const s of this.sql.exec("SELECT id, lat, lon FROM subs WHERE lat IS NOT NULL AND COALESCE(leg, 1) = 1 LIMIT 20000").toArray()) {
        const km = distKm(s.lat, s.lon, a.lat, a.lon);
        // max. 1 poplach o vzácnom lietadle denne na človeka
        if (km < 80 && this.rate("leg:" + s.id, 1, 86400e3)) this.notify(s.id, (tr === "l" ? "♛ Legendárne" : "⬟ Epické") + " lietadlo pri tebe!", `${nm} je asi ${Math.round(km)} km od teba. Pozri hore a zamávaj!`, "./");
      }
    }
  }
  // ✨ shiny = vlastnosť lietadla v daný deň (rovnaká pre všetkých, nedá sa prelosovať)
  async shinyOf(hex, d, tier) { const s = await crypto.subtle.sign("HMAC", await this.secret(), new TextEncoder().encode("sh:" + hex + ":" + d)); return new Uint16Array(s.slice(0, 2))[0] % 1000 < (SHINY_P[tier] || 15); }
  async secret() {
    if (this._sec) return this._sec;
    let raw = await this.ctx.storage.get("hmac");
    if (!raw) { raw = b64u(crypto.getRandomValues(new Uint8Array(32))); await this.ctx.storage.put("hmac", raw); }
    this._salt = raw;
    this._sec = await crypto.subtle.importKey("raw", new TextEncoder().encode(raw), {name: "HMAC", hash: "SHA-256"}, false, ["sign"]);
    return this._sec;
  }
  async pid(id) { return b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pid:" + id))).replace(/[^A-Za-z0-9]/g, "").slice(0, 16); }
  // pozvánkový kľúč: bez neho sa nedá stať niečím kamarátom len zo znalosti verejného id
  async fk(pd, day = this.day()) { return b64u(await crypto.subtle.sign("HMAC", await this.secret(), new TextEncoder().encode("fk:" + pd + ":" + day))).replace(/[^A-Za-z0-9]/g, "").slice(0, 10); }
  async fkOk(pd, fk) { for (const back of [0, 1, 2, 3, 4, 5, 6]) if (sameStr(await this.fk(pd, this.day(Date.now() - back * 86400e3)), String(fk || ""))) return true; return false; }
  hideReportedName(name, why, now) {
    this.sql.exec("INSERT OR IGNORE INTO banned(name, t, why, ok) VALUES(?, ?, ?, 0)", name, now, why);
    for (const r of this.sql.exec("SELECT id FROM nicks WHERE lc=? LIMIT 50", name).toArray()) this.sql.exec("INSERT OR REPLACE INTO hidden(id, name, t, appeal) VALUES(?, ?, ?, 0)", r.id, name, now);
    this.sql.exec("UPDATE nicks SET nick='Spotter', lc='spotter' WHERE lc=?", name); this.sql.exec("UPDATE tmembers SET nick='Spotter', lc='spotter' WHERE lc=?", name);
    this.sql.exec("UPDATE mails SET nick='', lc='' WHERE lc=?", name); this.sql.exec("UPDATE teams SET name='Tím ' || code, lc=lower('tím ' || code) WHERE lc=?", name);
    for (const r of this.sql.exec("SELECT rowid AS k, wnick AS v FROM golden").toArray()) if (lc(r.v) === name) this.sql.exec("UPDATE golden SET wnick='Spotter' WHERE rowid=?", r.k);
  }
  async revokedKey(id, token = "") {
    const signed = await crypto.subtle.sign("HMAC", await this.secret(), new TextEncoder().encode("revoked:" + id + (token ? ":" + token : "")));
    return b64u(signed);
  }
  erasePlayerData(id, pd) {
    this.sql.exec("DELETE FROM maildel WHERE mid IN (SELECT mid FROM mails WHERE id=?)", id);
    this.sql.exec("DELETE FROM maildeliv WHERE mid IN (SELECT mid FROM mails WHERE id=?)", id);
    this.sql.exec("DELETE FROM gifts WHERE id=?", id);
    this.sql.exec("UPDATE gifts SET used='deleted' WHERE used=?", id);
    this.sql.exec("DELETE FROM duelres WHERE pid=? OR src=?", pd, id);
    this.sql.exec("DELETE FROM friends WHERE a=? OR b=?", pd, pd);
    this.sql.exec("DELETE FROM refs WHERE pid=?", pd);
    this.sql.exec("DELETE FROM rl WHERE k LIKE ?", "%:" + id);
    this.sql.exec("DELETE FROM meta WHERE k=? OR k LIKE ?", "sp:" + id, "la:%:" + id);
    this.sql.exec("UPDATE golden SET wid=NULL, wnick='Spotter', wk=NULL, wtown='' WHERE wid=?", id);
    for (const table of PLAYER_DATA_TABLES) this.sql.exec(`DELETE FROM ${table} WHERE id=?`, id);
    this.sql.exec("UPDATE teams SET name='Tím ' || code, lc=lower('tím ' || code), owner=NULL WHERE owner=?", id);
    this.sql.exec("DELETE FROM account_codes WHERE id=? OR email_key IN (SELECT email_key FROM player_accounts WHERE id=?)", id, id);
    this.sql.exec("DELETE FROM player_accounts WHERE id=?", id);
    this.sql.exec("DELETE FROM xfer_receipts WHERE id=?", id);
    this.sql.exec("DELETE FROM queue WHERE id=?", id);
    this.sql.exec("DELETE FROM ids WHERE id=?", id);
    this._div = null;
  }
  unsubscribePlayer(id) {
    for (const table of ["subs", "msgs", "queue", "reminders", "tracks"]) this.sql.exec(`DELETE FROM ${table} WHERE id=?`, id);
  }
  enableKidMode(id, pd) {
    this.sql.exec("UPDATE ids SET kid=1 WHERE id=?", id);
    this.sql.exec("DELETE FROM friends WHERE a=? OR b=?", pd, pd);
    this.sql.exec("DELETE FROM duelres WHERE pid=? OR src=?", pd, id);
    this.sql.exec("UPDATE golden SET wnick='Spotter', wk=NULL, wtown='' WHERE wid=?", id);
    this.sql.exec("UPDATE mayorhof SET nick='Spotter' WHERE id=?", id);
    this.sql.exec("UPDATE mails SET nick='', lc='', town='', k='XX' WHERE id=?", id);
    this.sql.exec("UPDATE gcand SET nick='Spotter', k='XX', town='' WHERE id=?", id);
    for (const table of ["relay_waves", "nicks", "tmembers"]) this.sql.exec(`DELETE FROM ${table} WHERE id=?`, id);
    this.unsubscribePlayer(id);
  }
  async tokE(id, ep) { return b64u(await crypto.subtle.sign("HMAC", await this.secret(), new TextEncoder().encode("id:" + id + (ep ? ":" + ep : "")))).slice(0, 24); }
  async tok(id) { const r = this.row("SELECT ep FROM ids WHERE id=?", id); return this.tokE(id, r ? r.ep || 0 : 0); }
  async tokOld(id) { return b64u(await crypto.subtle.sign("HMAC", await this.secret(), new TextEncoder().encode("id:" + id))).slice(0, 24); }
  // token platí len pre existujúci účet a aktuálnu „epochu“ (po prenose alebo zmazaní prestane platiť)
  async authed(id, tok) {
    if (!id || id.length < 8 || !tok) return false;
    const r = this.row("SELECT ep FROM ids WHERE id=?", id);
    if (r) return sameStr(await this.tokE(id, r.ep || 0), tok);
    // platný token, ale účet chýba v tabuľke (starší alebo stratený záznam) – zaregistrovať a pustiť ďalej
    if (!Number(this.getMeta("player_reset_epoch") || 0) && id.length >= 16 && sameStr(await this.tokE(id, 0), tok) && !this.row("SELECT key FROM revoked_devices WHERE key=?", await this.revokedKey(id))) { this.sql.exec("INSERT OR IGNORE INTO ids(id, t, iph, ep) VALUES(?, ?, '', 0)", id, Date.now()); return true; }
    return false;
  }
  bump(k) { try { this.sql.exec("INSERT INTO sig(day, k, n) VALUES(?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1", this.day(), k); } catch (e) {} }
  async iph(ip) { await this.secret(); return b64u(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(this.day() + "|" + this._salt + "|" + ipKey(ip || "?")))).slice(0, 16); }
  // obmedzenie počtu požiadaviek: true = povolené
  rate(key, limit, winMs) {
    const w = Math.floor(Date.now() / winMs);
    if (winMs <= 3600e3) {
      const m = this.mem || (this.mem = new Map()), r = m.get(key);
      if (m.size > 50000) m.clear();
      if (!r || r.w !== w) { m.set(key, {w, n: 1}); return true; }
      if (r.n >= limit) return false; r.n++; return true;
    }
    const r = this.row("SELECT w, n FROM rl WHERE k=?", key);
    if (!r || r.w !== w) { this.sql.exec("INSERT INTO rl(k, w, n) VALUES(?, ?, 1) ON CONFLICT(k) DO UPDATE SET w=excluded.w, n=1", key, w); return true; }
    if (r.n >= limit) return false;
    this.sql.exec("UPDATE rl SET n = n + 1 WHERE k=?", key); return true;
  }
  radarSources() {
    return [0, ...[this.env.AIRPLANES_LIVE_ENABLED, this.env.ADSB_FI_ENABLED]
      .flatMap((enabled, i) => enabled === "1" ? [i + 1] : [])];
  }
  radarLimit(i) {
    const key = i === 0 ? this.env.ADSB_LOL_API_KEY : i === 1 ? this.env.AIRPLANES_LIVE_API_KEY : null;
    const configured = Number(this.env[["ADSB_LOL_DAILY_LIMIT", "AIRPLANES_LIVE_DAILY_LIMIT", "ADSB_FI_DAILY_LIMIT"][i]]);
    return Number.isSafeInteger(configured) && configured > 0 ? configured : i === 0 && !key ? 480 : 950;
  }
  radarStatus(i) {
    const utc = new Date(Date.now()).toISOString(), day = utc.slice(0, 10), hour = utc.slice(0, 13);
    const month = day.slice(0, 7);
    const week = new Date(Date.parse(day) - ((new Date(day).getUTCDay() + 6) % 7) * RADAR_DAY).toISOString().slice(0, 10);
    const previous = JSON.parse(this.getMeta("radar:" + i) || "{}");
    return {...previous, day, month, week, hour,
      count: previous.day === day ? previous.count || 0 : 0,
      monthCount: previous.month === month ? previous.monthCount || 0 : 0,
      weekCount: previous.week === week ? previous.weekCount || 0 : 0,
      hourCount: previous.hour === hour ? previous.hourCount || 0 : 0,
      dayBytes: previous.day === day ? previous.dayBytes || 0 : 0,
      monthBytes: previous.month === month ? previous.monthBytes || 0 : 0};
  }
  radarBudget(i) {
    const daily = this.radarLimit(i);
    if (i !== 0) return {daily, weekly: Infinity, monthly: Infinity};
    const keyed = !!this.env.ADSB_LOL_API_KEY;
    return {daily, weekly: Number(this.env.ADSB_LOL_WEEKLY_LIMIT) || (keyed ? Math.min(daily * 7, 4750) : daily * 7),
      monthly: Number(this.env.ADSB_LOL_MONTHLY_LIMIT) || (keyed ? 28500 : 14400)};
  }
  radarInterval() {
    if (!this.env.ADSB_LOL_API_KEY) return RADAR_ACTIVE_INTERVAL;
    const s = this.radarStatus(0), b = this.radarBudget(0);
    const daysLeft = Math.max(1, Math.ceil((Date.parse(s.week) + 7 * RADAR_DAY - Date.now()) / RADAR_DAY));
    return s.count >= b.daily * .45 || (b.weekly - s.weekCount) / daysLeft < b.daily * .6 || s.monthCount >= b.monthly * .8
      ? RADAR_SAVING_INTERVAL : RADAR_ACTIVE_INTERVAL;
  }
  async radarFeed(i, path, verification = false) {
    if (path === RADAR_REGION) return this.requestRadarFeed(i, path, verification);
    const cache = this._radarLookups || (this._radarLookups = new Map());
    const key = i + ":" + path, now = Date.now(), existing = cache.get(key);
    if (existing && now >= existing.at && now - existing.at < 12000)
      return existing.pending;
    if (cache.size >= 128) cache.delete(cache.keys().next().value);
    const pending = this.requestRadarFeed(i, path, verification).then(feed => {
      if (!feed && cache.get(key)?.pending === pending) cache.delete(key);
      return feed;
    });
    cache.set(key, {at: now, pending});
    return pending;
  }
  async requestRadarFeed(i, path, verification) {
    const now = Date.now(), key = "radar:" + i;
    const token = i === 0 ? this.env.ADSB_LOL_API_KEY : i === 1 ? this.env.AIRPLANES_LIVE_API_KEY : null;
    const authorized = !!token, limited = i === 0 && authorized;
    const stored = this.radarStatus(i);
    const status = stored.authorized === authorized ? stored : {...stored, authorized, until: 0, failures: 0};
    const budget = this.radarBudget(i);
    // Časť rozpočtu je vyhradená len na overenie úlovkov mimo spoločnej snímky.
    const share = limited ? (verification ? 1 : path === RADAR_REGION ? .9 : .8) : path === RADAR_REGION ? 1 : .8;
    if (now < (status.until || 0) || status.count >= Math.floor(budget.daily * share)
      || status.monthCount >= Math.floor(budget.monthly * share) || status.weekCount >= Math.floor(budget.weekly * share)
      || (limited && (status.hourCount >= (verification ? 260 : 235) || status.dayBytes >= 900e6 || status.monthBytes >= 3600e6))
      || now < (status.lastTry || 0) + (limited ? 1700 : 1100)) return null;
    this.setMeta(key, JSON.stringify({...status, count: status.count + 1, monthCount: status.monthCount + 1,
      weekCount: status.weekCount + 1, hourCount: status.hourCount + 1, lastTry: now}));
    const fi = path.startsWith("point/") ? "lat/" + path.split("/")[1] + "/lon/" + path.split("/")[2] + "/dist/" + path.split("/")[3] : path;
    try {
      const feed = await liveFeed(ADSB_ORIGINS[i] + (i === 2 ? fi : path), 3500, token);
      const latest = this.radarStatus(i);
      this.setMeta(key, JSON.stringify({...latest, dayBytes: latest.dayBytes + feed.bytes, monthBytes: latest.monthBytes + feed.bytes,
        lastSuccess: Date.now(), failures: 0, until: 0, status: 200}));
      return feed;
    } catch (e) {
      const latest = this.radarStatus(i), failures = (latest.failures || 0) + 1;
      const delay = e.status === 401 || e.status === 403 ? RADAR_HOUR
        : e.status === 429 ? retryDelay(e.retry, Date.now())
        : Math.min(120e3, 5e3 * 2 ** Math.min(failures - 1, 5));
      this.setMeta(key, JSON.stringify({...latest, failures, until: Date.now() + delay, status: e.status || 502}));
      return null;
    }
  }
  lastRadarSnapshot() {
    if (this._radarSnap !== undefined) return this._radarSnap;
    const saved = JSON.parse(this.getMeta("radar_snapshot") || "null");
    return this._radarSnap = saved ? {...saved, m: new Map(saved.ac.map(a => [cleanHex(a.hex), a]))} : null;
  }
  async snapshot() {
    const previous = this.lastRadarSnapshot();
    if (previous) {
      const age = Date.now() - previous.t;
      if (age < RADAR_ACTIVE_INTERVAL || (age < RADAR_SAVING_INTERVAL && age < this.radarInterval())) return previous;
    }
    if (this._radarSnapP) return this._radarSnapP;
    if (Date.now() < (this._radarSnapRetryAt || 0)) return previous;
    this._radarSnapP = this.refreshRadarSnapshot(previous).finally(() => { this._radarSnapP = null; });
    return this._radarSnapP;
  }
  async refreshRadarSnapshot(previous) {
    for (const i of this.radarSources()) {
      const feed = await this.radarFeed(i, RADAR_REGION);
      if (!feed || (previous && feed.at <= previous.t)) continue;
      // Veľká prázdna snímka po plnej oblohe môže byť výpadok pokrytia.
      if (!feed.ac.length && previous?.m.size > 10 && Date.now() - previous.t < RADAR_PREVIEW_AGE) continue;
      const ac = feed.ac.slice(0, 2000).map(a => {
        const clean = privateAircraft(a);
        if (clean.dbFlags & 12 || clean.hex.startsWith("~") || !clean.r || normalizeType(clean.t)) return clean;
        const last = previous?.m.get(cleanHex(clean.hex));
        const type = last && !(last.dbFlags & 12) && last.r === clean.r ? normalizeType(last.t) : "";
        return type ? {...clean, t: type} : clean;
      });
      const saved = {t: feed.at, provider: ADSB_NAMES[i], ac};
      this.setMeta("radar_snapshot", JSON.stringify(saved));
      this.setMeta("upstream", feed.at);
      return this._radarSnap = {t: saved.t, provider: saved.provider, m: new Map(ac.map(a => [cleanHex(a.hex), a]))};
    }
    this._radarSnapRetryAt = Date.now() + 12e3;
    this.bump("snap_fail");
    return previous;
  }
  async fillPlaneType(plane, hex) {
    if (plane.type || plane.priv || plane.ground || !/^[0-9a-f]{6}$/.test(hex)) return plane;
    const cache = this._aircraftTypes || (this._aircraftTypes = new Map());
    let entry = cache.get(hex);
    if (!entry || Date.now() >= entry.until) {
      if (cache.size >= 512) cache.delete(cache.keys().next().value);
      entry = {until: Date.now() + 2 * 60e3};
      entry.pending = (async () => {
        try {
          const response = await fetch("https://api.adsbdb.com/v0/aircraft/" + hex, {
            headers: {"User-Agent": UA}, signal: AbortSignal.timeout(1500)
          });
          if (!response.ok) return;
          const ac = (await response.json()).response?.aircraft;
          if (String(ac?.mode_s || "").toLowerCase() !== hex) return;
          // BL13 je interný kód presného modelu, ktorý zdroj eviduje len ako GLID.
          entry.type = normalizeType(ac.icao_type) || (/^L[ -]?13A?\s+BLAN[IÍ]K$/i.test(String(ac.type || "").trim()) ? "BL13" : "");
          if (entry.type) entry.until = Date.now() + 3600e3;
        } catch (e) {}
      })();
      cache.set(hex, entry);
    }
    await entry.pending;
    return entry.type ? {...plane, type: entry.type} : plane;
  }
  planeRes(a, la, lo) {
    if (a.alt_baro === "ground") return {known: true, found: true, ground: true, km: distKm(la, lo, a.lat, a.lon)};
    return {known: true, found: true, lat: a.lat, lon: a.lon, km: distKm(la, lo, a.lat, a.lon), call: a.dbFlags & 12 ? "" : String(a.flight || "").trim(), type: normalizeType(a.t), priv: !!(a.dbFlags & 12), alt: typeof a.alt_baro === "number" ? a.alt_baro : null, reg: a.dbFlags & 12 ? "" : String(a.r || "").toUpperCase().slice(0, 10), mil: !!(a.dbFlags & 1), emg: !!(a.emergency && a.emergency !== "none") || /^7[567]00$/.test(a.squawk || "")};
  }
  async verifyPlane(hex, la, lo) {
    const sn = await this.snapshot();
    let known = !!sn && Date.now() - sn.t <= SNAPSHOT_AGE;
    const observed = sn?.m.get(hex);
    if (known && observed && Date.now() - positionTime(observed, sn.t) <= SNAPSHOT_AGE)
      return this.fillPlaneType(this.planeRes(observed, la, lo), hex);
    for (const i of this.radarSources()) {
      const feed = await this.radarFeed(i, "hex/" + hex, true);
      if (!feed) continue;
      const a = feed.ac.find(item => cleanHex(item.hex) === hex);
      if (!a) { known = true; continue; }
      if (Date.now() - positionTime(a, feed.at) <= SNAPSHOT_AGE)
        return this.fillPlaneType(this.planeRes(a, la, lo), hex);
    }
    return {known, found: false};
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
  async sendPush(id, ttl) {
    const stored = this.row("SELECT sub FROM subs WHERE id=?", id);
    if (!stored) return {drop: true};
    let sub;
    try { sub = JSON.parse(stored.sub); } catch (error) { return {drop: true}; }
    if (!sub?.endpoint) return {drop: true};
    const endpoint = new URL(sub.endpoint), audience = endpoint.origin;
    if (!PUSH_HOSTS.some(host => endpoint.hostname === host || endpoint.hostname.endsWith("." + host))) return {drop: true};
    const k = await this.keys();
    const head = b64u(JSON.stringify({typ: "JWT", alg: "ES256"}));
    const body = b64u(JSON.stringify({aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "https://slovakiana.github.io/cotoleti-app/"}));
    const sig = await crypto.subtle.sign({name: "ECDSA", hash: "SHA-256"}, k.priv, new TextEncoder().encode(head + "." + body));
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 5000);
    try {
      const response = await fetch(sub.endpoint, {method: "POST", redirect: "manual", signal: ctl.signal,
        headers: {Authorization: `vapid t=${head}.${body}.${b64u(sig)}, k=${k.pub}`, TTL: String(ttl), Urgency: "high", "Content-Length": "0"}});
      if (response.ok) return {sent: true};
      if (response.status === 404 || response.status === 410) {
        this.sql.exec("DELETE FROM subs WHERE id=? AND sub=?", id, stored.sub);
        return {drop: true};
      }
      if (response.status === 429 || response.status >= 500) return {delay: retryDelay(response.headers.get("Retry-After"), Date.now())};
      return {drop: true};
    } catch (error) { return {}; }
    finally { clearTimeout(timer); }
  }
  notify(id, title, body, url = "./", force = false, expires = Date.now() + 15 * 60e3) {
    if (!force && !this.rate("ntf:" + id, 4, 86400e3)) { this.bump("ntf_cap"); return false; }
    const now = Date.now();
    if (expires <= now) return false;
    this.sql.exec("INSERT INTO queue(id, title, body, url, created, expires, next) VALUES(?, ?, ?, ?, ?, ?, ?)", id, title, body, url, now, expires, now);
    return true;
  }
  async kick() {
    const now = Date.now();
    const due = this.row("SELECT MIN(next) AS at FROM queue WHERE sent=0 AND expires>?", now)?.at;
    if (due == null) return;
    const when = Math.max(now + 200, due), alarm = await this.ctx.storage.getAlarm();
    if (!alarm || alarm <= now || alarm > when) await this.ctx.storage.setAlarm(when);
  }
  updatePushTrack(item, state) {
    if (item.url?.startsWith("./#let=")) this.sql.exec("UPDATE tracks SET notified=? WHERE id=? AND cs=? AND notified=2",
      state, item.id, cleanCs(item.url.slice("./#let=".length)));
  }
  async alarm() {
    try {
      const now = Date.now();
      const expired = this.sql.exec("SELECT id, url FROM queue WHERE sent=0 AND expires<=?", now).toArray();
      for (const item of expired) this.updatePushTrack(item, 3);
      this.sql.exec("DELETE FROM queue WHERE expires<=?", now);
      const rows = this.sql.exec("SELECT * FROM queue WHERE sent=0 AND next<=? ORDER BY next, qid LIMIT 40", now).toArray();
      // Jedno prebudenie na hráča. Každá správa zostáva samostatnou položkou pre service worker.
      const grouped = new Map();
      for (const row of rows) {
        if (!grouped.has(row.id)) grouped.set(row.id, []);
        grouped.get(row.id).push(row);
      }
      await Promise.all([...grouped.entries()].map(async ([id, items]) => {
        for (const item of items) this.sql.exec("UPDATE queue SET sending=1 WHERE qid=?", item.qid);
        const latest = items.at(-1);
        this.sql.exec("INSERT INTO msgs(id, title, body, url, t) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title=excluded.title, body=excluded.body, url=excluded.url, t=excluded.t WHERE excluded.t>=msgs.t",
          id, latest.title, latest.body, latest.url, latest.created);
        const ttl = Math.max(1, Math.min(900, Math.floor((Math.min(...items.map(item => item.expires)) - Date.now()) / 1000)));
        let result;
        try { result = await this.sendPush(id, ttl); } catch (error) { result = {}; }
        for (const item of items) {
          if (result?.sent) {
            this.sql.exec("UPDATE queue SET sent=1, sending=0 WHERE qid=?", item.qid);
            this.updatePushTrack(item, 1);
            this.bump("push_accepted");
            continue;
          }
          const attempts = item.attempts + 1;
          const next = Date.now() + Math.max(result?.delay || 0, Math.min(120e3, 5000 * 2 ** (attempts - 1)));
          if (result?.drop || attempts >= 6 || next >= item.expires) {
            this.sql.exec("DELETE FROM queue WHERE qid=?", item.qid);
            this.updatePushTrack(item, 3);
            this.bump("push_drop");
          } else {
            this.sql.exec("UPDATE queue SET attempts=?, next=?, sending=0 WHERE qid=?", attempts, next, item.qid);
            this.bump("push_retry");
          }
        }
      }));
    } finally { await this.kick(); }
  }
  async cron() {
    if (this._cronRun) return this._cronRun;
    this.setMeta("cronStart", Date.now());
    this._cronRun = (async () => {
      try {
        await this.runCron();
        await this.kick();
        this.setMeta("cron", Date.now());
        this.setMeta("cronError", "");
      } catch (error) {
        this.setMeta("cronError", String(Date.now()));
        this.bump("cron_fail");
        await this.kick().catch(() => {});
        throw error;
      }
    })().finally(() => { this._cronRun = null; });
    return this._cronRun;
  }
  async runCron() {
    const d = this.day(), now = Date.now();
    this.sql.exec("DELETE FROM queue WHERE sent=1 AND expires<=?", now);
    // Radar sa obnovuje len pri otvorení alebo pri hernom dopyte.
    if (this.getMeta("cleanH") !== String(Math.floor(now / 3600e3))) {
      this.cleanup(d, now); this.setMeta("cleanH", Math.floor(now / 3600e3));
      const S = {}; for (const r of this.sql.exec("SELECT k, n FROM sig WHERE day=?", d).toArray()) S[r.k] = r.n;
      const lim = {"401admin": 3, mint_block: 30, teleport: 200, vpn: 300, xclaim_bad: 50, "429:sky": 2000, "429:post": 1000, "429:wave": 300};
      for (const [k, n] of Object.entries(lim)) if ((S[k] || 0) >= n) await this.alert(k, `signál ${k}: ${S[k]}× dnes`);
    }
    // 🎅 Santa vzlietol (24.12. 15:00 SEČ = 14:00 UTC)
    const dt = new Date(now);
    const F = this.flags();
    if (F.santaPush && dt.getUTCMonth() === 11 && dt.getUTCDate() === 24 && dt.getUTCHours() >= 14 && this.getMeta("santa") !== String(dt.getUTCFullYear())) {
      this.setMeta("santa", dt.getUTCFullYear());
      for (const s of this.sql.exec("SELECT id FROM subs").toArray()) this.notify(s.id, "🎅 Santa práve vzlietol!", "Do 22:00 preletí aj nad vašou strechou. Zavolaj deti k oknu.", "./#santa");
    }
    // 🌊 nedeľná spoločná vlna o 18:00 slovenského času
    const skH = Number(new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Bratislava", hour: "2-digit", hour12: false}).format(dt)), skD = new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Bratislava", weekday: "short"}).format(dt);
    if (F.sunWave && skD === "Sun" && skH === 17 && dt.getUTCMinutes() >= 55 && this.getMeta("sunwave") !== d) {
      this.setMeta("sunwave", d);
      for (const s of this.sql.exec("SELECT id FROM subs WHERE moment=1").toArray()) this.notify(s.id, "🌊 O 5 minút mávame všetci", "Nedeľná vlna o 18:00. Pomôž svojmu kraju vyhrať.", "./");
    }
    // 🔥 séria v ohrození: séria z appky (≥ 3 dni), včera mával, dnes ešte nie – hodinu pred jeho obvyklým časom mávania (8–20 h), inak o 19:00
    if (skH >= 8 && skH <= 20 && this.getMeta("streakH") !== d + ":" + skH) {
      this.setMeta("streakH", d + ":" + skH);
      const y = this.day(now - 86400e3);
      const cand = this.sql.exec("SELECT s.id, k.n FROM subs s JOIN streaks k ON k.id = s.id WHERE COALESCE(s.streak, 1) = 1 AND k.day = ? AND k.n >= 3 LIMIT 3000", y).toArray();
      for (const c of cand) {
        if (this.getMeta("sp:" + c.id) === d) continue;
        const hrs = this.sql.exec("SELECT t FROM wavelog WHERE id=? AND t > ? ORDER BY t DESC LIMIT 14", c.id, now - 7 * 86400e3).toArray().map(r => Number(new Intl.DateTimeFormat("en-GB", {timeZone: "Europe/Bratislava", hour: "2-digit", hour12: false}).format(new Date(r.t)))).sort((a, b) => a - b);
        const usual = hrs.length ? hrs[Math.floor(hrs.length / 2)] : 20, at = Math.max(8, Math.min(20, usual - 1));
        if (skH !== at && !(skH === 20 && at < 20)) continue;
        if (this.row("SELECT 1 AS x FROM wavelog WHERE id=? AND day=?", c.id, d)) { this.setMeta("sp:" + c.id, d); continue; }
        this.setMeta("sp:" + c.id, d);
        this.notify(c.id, "🔥 " + c.n + " dní v rade", "Dnes ešte chýba jedno 👋 – pozri hore, lietadlá letia.", "./");
      }
    }
    // 🏛️ 3 dni pred koncom mesiaca: druhému v meste pošli, o koľko ho vedie prvý
    const dim = new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate();
    if (dim - +d.slice(8, 10) === 3 && skH === 18 && this.getMeta("mayor3") !== d) {
      this.setMeta("mayor3", d);
      for (const t of this.sql.exec("SELECT DISTINCT town FROM mayorm WHERE m=? LIMIT 2000", d.slice(0, 7)).toArray()) {
        const top = this.sql.exec("SELECT m.id, m.n, x.nick FROM mayorm m LEFT JOIN nicks x ON x.id = m.id WHERE m.m=? AND m.town=? ORDER BY m.n DESC LIMIT 2", d.slice(0, 7), t.town).toArray();
        if (top.length === 2 && this.row("SELECT 1 AS x FROM subs WHERE id=?", top[1].id)) this.notify(top[1].id, "🏛️ Do konca mesiaca 3 dni", (top[0].nick || "Spotter") + " ťa v meste " + t.town + " vedie o " + (top[0].n - top[1].n + 1) + " 👋");
      }
    }
    // 👯 predbehol ťa kamarát (raz za hodinu, len s upozorneniami)
    if (this.getMeta("frOver") !== String(Math.floor(now / 3600e3)) && skH >= 9 && skH <= 21) {
      this.setMeta("frOver", String(Math.floor(now / 3600e3)));
      const wk0 = this.day(now - ((new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7) * 86400e3);
      const cnt = pd => (this.row("SELECT COUNT(*) AS c FROM wavelog WHERE pid=? AND day>=? AND lg=1", pd, wk0) || {c: 0}).c;
      for (const s2 of this.sql.exec("SELECT id FROM subs LIMIT 500").toArray()) {
        const pd = await this.pid(s2.id), fr = this.sql.exec("SELECT b FROM friends WHERE a=? LIMIT 30", pd).toArray();
        if (!fr.length) continue;
        const mine = cnt(pd), ahead = fr.filter(f => cnt(f.b) > mine).map(f => f.b), key = "fo:" + pd, was = JSON.parse(this.getMeta(key) || "[]");
        const nw = ahead.filter(x => !was.includes(x)); this.setMeta(key, JSON.stringify(ahead));
        if (nw.length && was.length + nw.length > 0 && this.getMeta(key + ":wk") === wk0) {
          const wid = (this.row("SELECT id FROM wavelog WHERE pid=? LIMIT 1", nw[0]) || {}).id, nk = wid ? this.row("SELECT nick FROM nicks WHERE id=?", wid) : null;
          this.notify(s2.id, "👯 " + ((nk && nk.nick) || "Kamarát") + " ťa predbehol(a)", "V lige kamarátov ti chýba " + (cnt(nw[0]) - mine + 1) + " 👋", "./");
        }
        this.setMeta(key + ":wk", wk0);
      }
    }
    // 🛰️ pripomienky preletov (vypočítané v appke)
    for (const r of this.sql.exec("SELECT id, at, title, body FROM reminders WHERE at <= ? LIMIT 2000", now).toArray()) {
      this.sql.exec("DELETE FROM reminders WHERE id=? AND at=?", r.id, r.at);
      if (now - r.at < 10 * 60e3) this.notify(r.id, r.title, r.body, "./#vesmir");
    }
    // týždenný súhrn v pondelok ráno
    const wk = this.week(), prev = this.week(now - 7 * 86400e3);
    if (dt.getUTCDay() === 1 && dt.getUTCHours() >= 7 && this.getMeta("weekly") !== prev) {
      if (Number(this.getMeta("weeklyRetry") || 0) <= now) {
        const r = this.weekly(prev);
        this.setMeta("weeklyData", JSON.stringify(r));
        if (await this.postWeekly(r)) this.setMeta("weekly", prev);
        else { this.setMeta("weeklyRetry", now + 15 * 60e3); this.bump("telegram_fail"); }
      }
    }
    // 1) spoločný moment
    const m = this.moment(d);
    if (!m.sent && now >= m.start && now < m.start + MOMENT_MS) {
      this.sql.exec("UPDATE moments SET sent=1 WHERE day=?", d);
      for (const s of this.sql.exec("SELECT id FROM subs WHERE moment=1").toArray())
        this.notify(s.id, "👆 Pozri hore. Teraz.", "Celé Slovensko sa práve pozerá na oblohu. Máš 3 minúty.", "./#moment", true, m.start + MOMENT_MS);
    } else if (!m.sent && now >= m.start + MOMENT_MS) this.sql.exec("UPDATE moments SET sent=1 WHERE day=?", d);
    // 2) zlaté lietadlo dňa
    if (Math.floor(now / 60e3) % 5 === 0) await this.pickGolden(d, now);
    // 3) sledované lety
    this.sql.exec("DELETE FROM tracks WHERE t < ?", now - 36 * 3600e3);
    const css = this.sql.exec("SELECT cs, MIN(chk) AS c FROM tracks WHERE notified=0 GROUP BY cs ORDER BY c LIMIT 25").toArray().map(r => r.cs);
    for (const cs of css) this.sql.exec("UPDATE tracks SET chk=? WHERE cs=?", now, cs);
    const trackedSky = this.lastRadarSnapshot();
    const found = await Promise.all(css.map(async cs => {
      const cached = trackedSky && [...trackedSky.m.values()].find(a => cleanCs(a.flight) === cs
        && a.alt_baro !== "ground" && Date.now() - positionTime(a, trackedSky.t) <= SNAPSHOT_AGE);
      if (cached) return cached;
      const feed = await this.adsb("callsign/" + cs);
      return feed?.ac.find(a => a.alt_baro !== "ground") || null;
    }));
    for (let i = 0; i < css.length; i++) {
      const cs = css[i], ac = found[i];
      if (!ac) continue;
      for (const t of this.sql.exec("SELECT * FROM tracks WHERE cs=? AND notified=0", cs).toArray()) {
        if (ac.hex && t.hex !== ac.hex) this.sql.exec("UPDATE tracks SET hex=? WHERE id=? AND cs=?", ac.hex, t.id, cs);
        if (t.lat == null) continue;
        const a = approachMin(ac, t.lat, t.lon), who = t.label || cs;
        const soon = (a.t != null && a.t > 0 && a.t <= 12 && a.d <= 30) || a.now <= 25;
        if (soon) {
          const mins = a.t != null && a.t > 1 ? `o ~${Math.round(a.t)} min` : "práve teraz";
          const expires = now + Math.min(15, Math.max(3, (a.t || 0) + 2)) * 60e3;
          const queued = this.notify(t.id, `✈️ ${who} bude nad tebou ${mins}`, "Vybehni von a zamávaj. Ťukni a ukážeme ti, kam sa pozrieť.", "./#let=" + cs, false, expires);
          this.sql.exec("UPDATE tracks SET notified=? WHERE id=? AND cs=?", queued ? 2 : 3, t.id, cs);
        }
      }
    }
  }
  atlasLeaderboard(region, id) {
    // Preserve the existing single entry per public nickname. An authenticated player
    // sees their own points and position even if a legacy account uses the same name.
    const rows = this.sql.exec(`
      WITH scores AS (
        SELECT s.id, SUM(s.w) + 100 * SUM(s.seq = 1) AS sc, COUNT(*) AS n,
          CASE WHEN i.kid=1 OR COALESCE(NULLIF(x.nick,''), 'Spotter')='Spotter' THEN 'Spotter' ELSE x.nick END AS nick,
          CASE WHEN i.kid=1 OR COALESCE(NULLIF(x.nick,''), 'Spotter')='Spotter' THEN '#' || s.id
            ELSE ':' || COALESCE(NULLIF(x.lc,''), lower(x.nick)) END AS group_name
        FROM typeseq s
        LEFT JOIN nicks x ON x.id = s.id
        LEFT JOIN ids i ON i.id = s.id
        ${region ? "WHERE s.k=?" : ""}
        GROUP BY s.id
      ), representatives AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY group_name ORDER BY sc DESC, id) AS representative
        FROM scores
      ), ranked AS (
        SELECT id, sc, n, nick, RANK() OVER (ORDER BY sc DESC) AS rank,
          ROW_NUMBER() OVER (ORDER BY sc DESC, id) AS position
        FROM representatives WHERE representative=1
      ), own AS (
        SELECT s.*,
          1 + (SELECT COUNT(*) FROM ranked WHERE sc>s.sc) AS rank,
          1 + (SELECT COUNT(*) FROM ranked WHERE sc>s.sc OR (sc=s.sc AND id<s.id)) AS position,
          COALESCE((SELECT MIN(sc)-s.sc FROM ranked WHERE sc>s.sc), 0) AS gap,
          EXISTS(SELECT 1 FROM ranked WHERE sc=s.sc AND id<>s.id) AS tied
        FROM scores s WHERE s.id=?
      )
      SELECT r.sc, r.n, r.nick, r.rank, r.position, r.id=o.id AS me,
        r.position<=20 AS leader, ABS(r.position-o.position)<=2 AS nearby, o.gap, o.tied
      FROM ranked r LEFT JOIN own o ON 1=1
      WHERE r.position<=20 OR ABS(r.position-o.position)<=2
      UNION ALL
      SELECT o.sc, o.n, o.nick, o.rank, o.position, 1, 0, 1, o.gap, o.tied
      FROM own o WHERE NOT EXISTS(SELECT 1 FROM ranked WHERE id=o.id)
      ORDER BY position
    `, ...(region ? [region] : []), id).toArray();
    const publicRow = ({sc, n, nick, me, rank}) => ({sc, n, nick, me: !!me, rank});
    const mine = rows.find(row => row.me);
    return {
      top: rows.filter(row => row.leader).map(publicRow),
      nearby: rows.filter(row => row.nearby).map(publicRow),
      me: mine ? {sc: mine.sc, n: mine.n, rank: mine.rank, gap: mine.gap, tied: !!mine.tied} : null
    };
  }

  accountRollout() {
    if (!this.env.ACCOUNT_FROM || !this.env.RESEND_API_KEY) return "off";
    if (this.env.ACCOUNT_ROLLOUT === "public") return "public";
    return this.env.ACCOUNT_ROLLOUT === "pilot" && this.env.ACCOUNT_PILOT_EMAILS ? "pilot" : "off";
  }
  async accountDigest(message) {
    return b64u(await crypto.subtle.sign("HMAC", await this.secret(), TEXT_ENCODER.encode(message)));
  }
  async sendAccountCode(email, code) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {Authorization: "Bearer " + this.env.RESEND_API_KEY, "Content-Type": "application/json"},
      body: JSON.stringify({
        from: this.env.ACCOUNT_FROM, to: [email], subject: "Prihlasovací kód do Čo to letí?",
        text: "Tvoj kód je " + code + ". Platí 10 minút a môžeš ho použiť iba raz. Ak si ho nevyžiadal(a), správu môžeš ignorovať."
      }),
      signal: AbortSignal.timeout(8000)
    });
    return response.ok;
  }
  async accountRequest(path, req, body, iph, now) {
    const rollout = this.accountRollout();
    if (path === "/api/account/status" && req.method === "GET") return json({rollout});
    if (rollout === "off") return json({error: "disabled"}, 503);
    if (req.method !== "POST") return json({error: "method"}, 405);
    const {id: rawId, tok, mode} = body;
    const id = cleanId(rawId);
    if (path === "/api/account/backup") {
      if (!await this.authed(id, tok)) return json({error: "auth"}, 401);
      const current = this.row("SELECT rev, backup FROM player_accounts WHERE id=?", id);
      if (!current || this.isKid(id)) return json({error: "unlinked"}, 403);
      if (body.rev !== current.rev) return json({error: "conflict"}, 409);
      const backup = accountBackup(body.backup);
      if (!backup) return json({error: "backup"}, 400);
      if (current.backup === backup) return json({rev: current.rev});
      if (!this.rate("acct-backup:" + id, 60, 3600e3)) return json({error: "rate"}, 429);
      this.sql.exec("UPDATE player_accounts SET backup=?, rev=rev+1 WHERE id=? AND rev=?", backup, id, current.rev);
      return json({rev: current.rev + 1});
    }

    if (!["link", "login"].includes(mode)) return json({error: "mode"}, 400);
    if (mode === "link" && (!await this.authed(id, tok) || this.isKid(id))) return json({error: "auth"}, 403);
    if (path === "/api/account/start") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error: "email"}, 400);
      if (rollout === "pilot" && !String(this.env.ACCOUNT_PILOT_EMAILS).toLowerCase().split(/[\s,]+/).includes(email))
        return json({error: "pilot"}, 403);
      const emailKey = await this.accountDigest("acct-email:" + email);
      if (!this.rate("acct-send-ip:" + iph, 15, 3600e3) || !this.rate("acct-send-email:" + emailKey, 4, 3600e3))
        return json({error: "rate"}, 429);
      const challenge = b64u(crypto.getRandomValues(new Uint8Array(24)));
      const random = crypto.getRandomValues(new Uint32Array(1))[0];
      const code = String(random % 100_000_000).padStart(8, "0");
      const proof = await this.accountDigest("acct-code:" + challenge + ":" + code);
      this.sql.exec("DELETE FROM account_codes WHERE expires<=? OR (email_key=? AND mode=? AND id=?)", now, emailKey, mode, mode === "link" ? id : "");
      this.sql.exec("INSERT INTO account_codes(challenge,email_key,id,mode,proof,expires) VALUES(?,?,?,?,?,?)",
        challenge, emailKey, mode === "link" ? id : "", mode, proof, now + ACCOUNT_CODE_MS);
      try {
        if (await this.sendAccountCode(email, code)) return json({challenge});
      } catch (e) {}
      this.sql.exec("DELETE FROM account_codes WHERE challenge=?", challenge);
      return json({error: "delivery"}, 503);
    }

    if (path !== "/api/account/finish") return json({error: "route"}, 404);
    const {challenge, code} = body;
    if (typeof challenge !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(challenge) || typeof code !== "string" || !/^\d{8}$/.test(code))
      return json({error: "code"}, 400);
    if (!this.rate("acct-verify-ip:" + iph, 45, 3600e3)) return json({error: "rate"}, 429);
    const proof = await this.accountDigest("acct-code:" + challenge + ":" + code);
    const pending = this.row("SELECT * FROM account_codes WHERE challenge=?", challenge);
    if (!pending || pending.expires <= Date.now() || pending.attempts >= 5 || pending.mode !== mode || (mode === "link" && pending.id !== id))
      return json({error: "code"}, 400);
    if (!sameStr(proof, pending.proof)) {
      this.sql.exec("UPDATE account_codes SET attempts=attempts+1 WHERE challenge=?", challenge);
      return json({error: "code"}, 400);
    }
    const existing = this.row("SELECT a.id, a.backup, a.rev FROM player_accounts a JOIN ids i ON a.id=i.id WHERE a.email_key=? AND i.kid=0", pending.email_key);
    if (mode === "link") {
      const backup = accountBackup(body.backup);
      if (!backup) return json({error: "backup"}, 400);
      if (existing && existing.id !== id) return json({error: "already_linked"}, 409);
      const linked = this.row("SELECT email_key, rev FROM player_accounts WHERE id=?", id);
      if (linked && linked.email_key !== pending.email_key) return json({error: "already_linked"}, 409);
      if (this.isKid(id) || !this.row("SELECT id FROM ids WHERE id=?", id)) return json({error: "auth"}, 403);
      if (linked) {
        this.sql.exec("DELETE FROM account_codes WHERE challenge=?", challenge);
        // A lost response can be retried without replacing the confirmed backup.
        return json({rev: linked.rev, restored: true});
      }
      this.sql.exec("INSERT INTO player_accounts(id,email_key,backup) VALUES(?,?,?)", id, pending.email_key, backup);
    }
    this.sql.exec("DELETE FROM account_codes WHERE challenge=?", challenge);
    if (mode === "link") return json({rev: 1});
    if (!existing) return json({error: "unlinked"}, 404);
    const accountId = existing.id, pid = await this.pid(accountId), token = await this.tok(accountId), fk = await this.fk(pid);
    if (this.isKid(accountId) || !this.row("SELECT id FROM player_accounts WHERE id=? AND email_key=?", accountId, pending.email_key))
      return json({error: "unlinked"}, 404);
    return json({id: accountId, tok: token, pid, fk, epoch: Number(this.getMeta("player_reset_epoch") || 0),
      rev: existing.rev, backup: JSON.parse(existing.backup)});
  }
  async fetch(req) {
    const u = new URL(req.url), d = this.day(), now = Date.now(), p = u.pathname;
    let _b = null;
    const body = async () => _b ||= objectJSON(await req.text()) || {};
    const ip = req.headers.get("x-cc-ip") || "", country = req.headers.get("x-cc-country") || "", ipLat = num(req.headers.get("x-cc-lat")), ipLon = num(req.headers.get("x-cc-lon"));
    const iph = await this.iph(ip);
    const ipFar = (la, lo) => ipLat != null && la != null && distKm(la, lo, ipLat, ipLon) > 650;
    if (p.startsWith("/api/account/")) return this.accountRequest(p, req, await body(), iph, now);
    if (p === "/api/hello" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if (id.length < 16) return json({error: "bad"}, 400);
      const epoch=Number(this.getMeta("player_reset_epoch")||0);
      if (Number(b.epoch||0)!==epoch) return json({error:"reset",epoch},409);
      const ex = this.row("SELECT ep FROM ids WHERE id=?", id);
      if (!ex) {
        if (this.row("SELECT key FROM revoked_devices WHERE key=?", await this.revokedKey(id))) return json({error: "moved"}, 401);
        // starší používateľ s platným tokenom (z čias pred tabuľkou ids) – zaregistrovať bez limitu
        const legacy = epoch === 0 && !!b.tok && sameStr(await this.tokE(id, 0), b.tok);
        // limit nových zariadení na IP je vysoký: iCloud Private Relay a mobilní operátori zdieľajú IP medzi tisíckami ľudí
        // zdieľané IP (operátori, iCloud Private Relay) majú tisíce ľudí – brzdíme len nárazy, nie denný počet
        if (!legacy && (!this.rate("mintm:" + iph, 20, 60e3) || !this.rate("mint:" + iph, 5000, 86400e3))) { this.bump("mint_block"); return json({error: "rate"}, 429); }
        // Give each account created after a reset a fresh signing epoch.
        // Existing rows keep their epoch, so deploying this does not rotate active tokens.
        const [high, low] = epoch > 0 ? crypto.getRandomValues(new Uint32Array(2)) : [0, 0];
        const signingEpoch = epoch > 0 ? ((high & 0x000fffff) * 2 ** 32 + low + 1) : 0;
        this.sql.exec("INSERT INTO ids(id, t, iph, ep) VALUES(?, ?, '', ?)", id, now, signingEpoch);
        // pozvanie sa ráta len pri skutočne novom zariadení
        if (!legacy && /^[A-Za-z0-9]{16}$/.test(b.r || "") && this.rate("ref:" + iph, 3, 86400e3)) this.sql.exec("INSERT INTO refs(pid, n) VALUES(?, 1) ON CONFLICT(pid) DO UPDATE SET n = n + 1", b.r);
      } else if (ex.ep && !sameStr(await this.tokE(id, ex.ep), b.tok || "")) {
        // účet bol prenesený na iné zariadenie – staré zariadenie už token nedostane
        return json({error: "moved"}, 401);
      }
      const pd = await this.pid(id);
      this.sql.exec("UPDATE ids SET pid=? WHERE id=? AND pid IS NULL", pd, id);
      // detský režim sa z appky dá pri každom prihlásení len ZAPNÚŤ (vypnutie ide cez /api/kid)
      const wasKid = this.isKid(id), kid = wasKid || b.kid === 1;
      if (kid && !wasKid) this.enableKidMode(id, pd);
      const saved = kid ? null : this.row("SELECT nick, edited FROM nicks WHERE id=?", id);
      return json({tok: await this.tok(id), pid: pd, fk: await this.fk(pd), epoch,
        nickname: {name: saved?.nick || "", managed: !!saved?.edited, kid}});
    }
    if (p === "/api/ev" && req.method === "POST") return json({ok: true});
    if (p === "/api/err" && req.method === "POST") {
      const message = (await body()).m;
      if (typeof message !== "string" || !message || !this.rate("err:" + iph, 20, 3600e3)) return json({ok: true});
      let kind = "runtime";
      if (/^hello\b/i.test(message)) kind = "hello";
      if (/^wave fail\b/i.test(message)) kind = "wave";
      if (/^quota\b/i.test(message)) kind = "storage";
      this.sql.exec("INSERT INTO errs(day, msg, n) VALUES(?, ?, 1) ON CONFLICT(day, msg) DO UPDATE SET n = n + 1", d, kind);
      return json({ok: true});
    }
    if (p === "/api/xclaim" && req.method === "POST") return json({error: "update"}, 409);
    if ((p === "/api/xprepare" || p === "/api/xfinish") && req.method === "POST") {
      if (!this.rate("xclaim:" + iph, 60, 3600e3)) return json({error: "rate"}, 429);
      const b = await body(), code = String(b.code || "").toUpperCase();
      const claim = String(b.claim || "");
      if (!/^[0-9A-Z]{8}$/.test(code) || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(claim))
        return json({error: "code"}, 404);
      const transfer = this.row("SELECT id, data, t FROM xfer WHERE code=?", code);
      const live = transfer && now - transfer.t <= 10 * 60e3;
      if (p === "/api/xprepare") {
        if (!live) return json({error: "code"}, 404);
        const ticket = await this.revokedKey("xfer:" + code + ":" + transfer.id + ":" + transfer.t, claim);
        return json({id: transfer.id, data: transfer.data, ticket});
      }
      const id = cleanId(b.id), ticket = typeof b.ticket === "string" ? b.ticket : "";
      if (!id || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) return json({error: "code"}, 404);
      const proof = await this.revokedKey("xfer-finish:" + code + ":" + id, claim + ":" + ticket);
      const valid = live && transfer.id === id &&
        sameStr(await this.revokedKey("xfer:" + code + ":" + id + ":" + transfer.t, claim), ticket);
      const finish = () => {
        const current = this.row("SELECT ep FROM ids WHERE id=?", id);
        if (!current) return null;
        const ep = current.ep || 0;
        const receipt = this.row("SELECT id, proof, ep, t FROM xfer_receipts WHERE code=?", code);
        if (receipt) {
          return receipt.id === id && receipt.ep === ep && now - receipt.t <= 86400e3 &&
            sameStr(receipt.proof, proof) ? {ep} : null;
        }
        if (!valid || !this.row("SELECT 1 AS x FROM xfer WHERE code=? AND id=? AND t=?", code, id, transfer.t)) return null;
        const next = ep + 1;
        this.sql.exec("UPDATE ids SET ep=? WHERE id=?", next, id);
        for (const table of ["subs", "msgs", "queue"]) this.sql.exec(`DELETE FROM ${table} WHERE id=?`, id);
        this.sql.exec("INSERT INTO xfer_receipts(code, id, proof, ep, t) VALUES(?, ?, ?, ?, ?)", code, id, proof, next, now);
        this.sql.exec("DELETE FROM xfer WHERE code=?", code);
        return {ep: next};
      };
      const result = this.ctx.storage.transactionSync ? this.ctx.storage.transactionSync(finish) : finish();
      if (!result) return json({error: "code"}, 404);
      const pd = await this.pid(id);
      return json({id, tok: await this.tokE(id, result.ep), pid: pd, fk: await this.fk(pd),
        epoch: Number(this.getMeta("player_reset_epoch") || 0)});
    }
    const OPEN = ["/api/sky", "/api/msg", "/api/admin", "/api/stats"]; // /api/stats overuje ADMIN_KEY samostatne
    if (req.method === "POST" && p !== "/cron" && !OPEN.includes(p)) {
      if (!this.rate("post:" + iph, 1500, 60e3)) { this.bump("429:post"); return json({error: "rate"}, 429); }
      const b = await body();
      if (p !== "/api/forget" && !(await this.authed(cleanId(b.id), b.tok))) { this.bump("401"); return json({error: "auth"}, 401); }
    }
    // parametre z tela (POST) alebo z adresy (staré verzie appky)
    const B = req.method === "POST" ? await body() : {};
    const qp = k => B[k] != null ? String(B[k]) : u.searchParams.get(k);
    if (p === "/cron") { await this.cron(); return json({ok: true}); }
    if (p === "/api/health") {
      const c = Number(this.getMeta("cron") || 0);
      const cronStart = Number(this.getMeta("cronStart") || c);
      const cronError = Number(this.getMeta("cronError") || 0);
      const queued = this.row("SELECT COUNT(*) AS n, MIN(created) AS oldest FROM queue WHERE sent=0 AND expires>?", now);
      const awaitingDisplay = this.row("SELECT COUNT(*) AS n FROM queue WHERE sent=1 AND expires>?", now).n;
      const delivery = Object.fromEntries(this.sql.exec("SELECT k, n FROM sig WHERE day=? AND k IN ('push_accepted', 'push_displayed', 'push_retry', 'push_drop')", d).toArray().map(row => [row.k, row.n]));
      const push = {queued: queued.n, oldestSec: queued.oldest == null ? null : Math.max(0, Math.floor((now - queued.oldest) / 1000)),
        awaitingDisplay, acceptedToday: delivery.push_accepted || 0, displayedToday: delivery.push_displayed || 0,
        retriesToday: delivery.push_retry || 0, droppedToday: delivery.push_drop || 0};
      const up = Number(this.getMeta("upstream") || 0);
      const sn = this.lastRadarSnapshot();
      const radar = {ageSec: sn ? Math.max(0, Math.floor((now - sn.t) / 1000)) : null, provider: sn?.provider || null,
        sources: this.radarSources().map(i => {
          const st = this.radarStatus(i);
          return {name: ADSB_NAMES[i], requestsToday: st.count, requestsThisWeek: st.weekCount, requestsThisMonth: st.monthCount, dailyLimit: this.radarLimit(i), weeklyLimit: i === 0 ? this.radarBudget(i).weekly : null, monthlyLimit: i === 0 ? this.radarBudget(i).monthly : null, estimatedBytesToday: st.dayBytes, estimatedBytesThisMonth: st.monthBytes, status: st.status || null, retryAt: st.until || null};
        })};
      return json({radar, ok: now - c < 5 * 60e3 && !cronError, cronStart, cronError: cronError || null, push, version: VERSION, relayPilot: this.relayEnabled() && this.flags().social !== "min", lastCron: c, behindMin: Math.round((now - c) / 60e3), upstreamMin: up ? Math.round((now - up) / 60e3) : null, active: (this.row("SELECT COUNT(*) AS c FROM pres WHERE t > ?", now - 3 * 60e3) || {c: 0}).c});
    }
    if (p === "/api/planes") {
      // 🛩️ lietadlá okolo hráča zo spoločnej snímky oblohy nad SR (formát ako adsb.lol) – jedna požiadavka na sieť pre všetkých
      const coordinates = radarCoordinates(qp("lat"), qp("lon"), qp("r"));
      if (!coordinates) return json({error: "far"}, 404);
      const {la, lo, r} = coordinates;
      if (!this.rate("pl:" + iph, 400, 60e3)) return json({error: "rate"}, 429);
      const sn = await this.snapshot();
      const age = sn ? Date.now() - sn.t : Infinity;
      if (age > RADAR_PREVIEW_AGE) return json({state: "unavailable", error: "stale"}, 503, {"Retry-After": "15"});
      const stale = age > SNAPSHOT_AGE;
      const km = r * 1.852, ac = [];
      for (const a of sn.m.values()) if (distKm(la, lo, a.lat, a.lon) <= km && (stale || Date.now() - positionTime(a, sn.t) <= SNAPSHOT_AGE)) {
        const meta = this._aircraftTypes?.get(cleanHex(a.hex));
        ac.push(a.dbFlags & 12 ? privateAircraft(a)
          : !normalizeType(a.t) && meta?.type && meta.until > Date.now() ? {...a, t: meta.type} : a);
      }
      const body = {ac, now: sn.t, src: "sky", provider: sn.provider, state: stale ? "stale" : "live"};
      return stale ? json(body, 503, {"Retry-After": "15"}) : json(body, 200, {"Cache-Control": "public, max-age=5"});
    }
    if (p === "/api/radar-flight" && req.method === "GET") {
      const cs = qp("cs") || "";
      if (!/^[A-Z]{3}[0-9]{1,4}[A-Z]?$/.test(cs)) return json({error: "invalid flight"}, 400);
      if (!this.rate("radar-flight:" + iph, 18, 60e3)) return json({error: "rate"}, 429, {"Retry-After": "30"});
      const feed = await this.adsb("callsign/" + cs);
      return feed ? json({ac: feed.ac.filter(a => !(a.dbFlags & 12))})
        : json({error: "unavailable"}, 503, {"Retry-After": "15"});
    }
    if (p === "/api/heat") {
      // mapa mávania za tento a minulý mesiac – len štvorce s ≥ 5 hráčmi (k-anonymita)
      const m1 = d.slice(0, 7), m0 = new Date(new Date(d + "T12:00:00Z").setUTCDate(0)).toISOString().slice(0, 7);
      const c = this._heat; if (c && now - c.t < 600e3) return json(c.v);
      const cells = this.sql.exec("SELECT cell, COUNT(DISTINCT id) AS p FROM heatp WHERE m IN (?, ?) GROUP BY cell HAVING p >= 5 ORDER BY p DESC LIMIT 400", m1, m0).toArray().map(r => { const [a, o] = r.cell.split(","); return [Number(a), Number(o), r.p]; });
      this._heat = {t: now, v: {cells, k: 5}}; return json(this._heat.v);
    }
    if (p === "/api/specials") return json(JSON.parse(this.getMeta("specials") || '{"lv":{},"fi":[]}'));
    if (p === "/api/weekly") return json(JSON.parse(this.getMeta("weeklyData") || "null") || this.weekly(this.week()));
    if (p === "/api/tname") { const t = this.row("SELECT name FROM teams WHERE code=?", String(u.searchParams.get("c") || "").toUpperCase().slice(0, 6)); return json({name: t ? t.name : ""}); }
    if (p === "/api/stats") {
      if (!this.admin(u, req, B && B.key)) { this.bump("401admin"); return json({error:"auth",configured:!!this.env.ADMIN_KEY,keyReceived:!!((req.headers.get("x-admin-key"))||(B&&B.key))},401); }
      const days = [];
      for (let i = 0; i < 14; i++) {
        const dd = new Date(now - i * 86400e3).toISOString().slice(0, 10), prevD = new Date(now - (i + 1) * 86400e3).toISOString().slice(0, 10);
        const dau = (this.row("SELECT COUNT(*) AS c FROM seen WHERE day=?", dd) || {c: 0}).c;
        const s0 = Date.parse(prevD), born = (this.row("SELECT COUNT(*) AS c FROM ids WHERE t >= ? AND t < ?", s0, s0 + 86400e3) || {c: 0}).c;
        const back = (this.row("SELECT COUNT(*) AS c FROM ids i JOIN seen s ON s.id = i.id AND s.day = ? WHERE i.t >= ? AND i.t < ?", dd, s0, s0 + 86400e3) || {c: 0}).c;
        days.push({day: dd, dau, waves: (this.row("SELECT n FROM totals WHERE day=?", dd) || {n: 0}).n, d1: born ? Math.round(back / born * 100) + "%" : "–"});
      }
      const coh = (back) => { const born0 = Date.parse(this.day(now - back * 86400e3) + "T00:00:00Z") - 7 * 86400e3, born1 = born0 + 7 * 86400e3; const b = (this.row("SELECT COUNT(*) AS c FROM ids WHERE t >= ? AND t < ?", born0, born1) || {c: 0}).c; const r = (this.row("SELECT COUNT(DISTINCT i.id) AS c FROM ids i JOIN seen s ON s.id = i.id AND s.day >= ? WHERE i.t >= ? AND i.t < ?", this.day(now - 2 * 86400e3), born0, born1) || {c: 0}).c; return b ? Math.round(r / b * 100) + "% z " + b : "–"; };
      const funnel = {}; for (const r of this.sql.exec("SELECT step, SUM(n) AS n FROM funnel WHERE day >= ? GROUP BY step", this.day(now - 6 * 86400e3)).toArray()) funnel[r.step] = r.n;
      const errors = this.sql.exec("SELECT msg, SUM(n) AS n FROM errs GROUP BY msg ORDER BY n DESC LIMIT 10").toArray();
      return json({mission: this.weeklyMission(now), missionGoal: Number(this.getMeta("mission_goal") || 0), retencia: {d7: coh(7), d30: coh(30)}, lievik7dni: funnel, chyby: errors, users: (this.row("SELECT COUNT(*) AS c FROM ids") || {c: 0}).c, pushSubs: (this.row("SELECT COUNT(*) AS c FROM subs") || {c: 0}).c, teams: (this.row("SELECT COUNT(*) AS c FROM teams") || {c: 0}).c, days});
    }
    if (p === "/api/year") {
      // 🇸🇰 súhrn roka – spoločný pre všetkých, cache 10 min
      const Y = /^20\d\d$/.test(qp("y") || "") ? qp("y") : d.slice(0, 4);
      if (!this._year || this._year.y !== Y || now - this._year.at > 600e3) {
        const tot = this.row("SELECT SUM(n) AS s, COUNT(*) AS c FROM totals WHERE day LIKE ?", Y + "%") || {};
        const rec = this.row("SELECT day, n FROM totals WHERE day LIKE ? ORDER BY n DESC LIMIT 1", Y + "%");
        const kr = this.sql.exec("SELECT substr(k, 3) AS k, n FROM yagg WHERE y=? AND k LIKE 'k:%' AND k <> 'k:XX' ORDER BY n DESC LIMIT 8", Y).toArray();
        const tw = this.sql.exec("SELECT substr(k, 3) AS town, n FROM yagg WHERE y=? AND k LIKE 't:%' ORDER BY n DESC LIMIT 5", Y).toArray();
        const pl = this.sql.exec("SELECT hex, call, type, dest, n FROM yplane WHERE y=? ORDER BY n DESC LIMIT 3", Y).toArray();
        const yS = Date.parse(Y + "-01-01T00:00:00Z"), yE = Date.parse((+Y + 1) + "-01-01T00:00:00Z");
        const users = (this.row("SELECT COUNT(*) AS c FROM ids WHERE t >= ? AND t < ?", yS, yE) || {c: 0}).c;
        const gold = (this.row("SELECT COUNT(*) AS c FROM golden WHERE day LIKE ? AND state=1", Y + "%") || {c: 0}).c;
        this._year = {y: Y, at: now, v: {y: Y, waves: tot.s || 0, days: tot.c || 0, record: rec || null, kraje: kr, towns: tw, planes: pl, users, gold}};
      }
      return json(this._year.v);
    }
    if (p === "/api/cardstat") {
      // 🇸🇰 koľko ľudí má kartičku a kto ju objavil prvý (len overené úlovky)
      const ty = String(qp("type") || "").replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase();
      if (!ty) return json({error: "bad"}, 400);
      const kk = /^[A-Z]{2}$/.test(qp("k") || "") && qp("k") !== "XX" ? qp("k") : "";
      const c = this.cstat || (this.cstat = new Map()), hit = c.get(ty + kk);
      if (hit && now - hit.t < 600e3) return json(hit.v);
      const own = (this.row("SELECT COUNT(*) AS c FROM typeseq WHERE type=?", ty) || {c: 0}).c;
      const pl = this._players && now - this._players.t < 3600e3 ? this._players.n : (this._players = {t: now, n: (this.row("SELECT COUNT(DISTINCT id) AS c FROM typeseq") || {c: 0}).c}).n;
      const f = this.row("SELECT s.id, s.k, s.town, s.t, x.nick, i.kid FROM typeseq s LEFT JOIN nicks x ON x.id = s.id LEFT JOIN ids i ON i.id = s.id WHERE s.type=? AND s.seq=1", ty);
      const v = {own, players: pl, first: f ? {nick: f.kid || !f.nick ? "Spotter" : f.nick, town: f.town || "", t: f.t} : null};
      // 📍 lokálna vzácnosť: koľko hráčov z kraja ju má (až keď je v kraji aspoň 50 zberateľov – inak je to šum)
      if (kk) { const kp = this._kpl || (this._kpl = {}); if (!kp[kk] || now - kp[kk].t > 3600e3) kp[kk] = {t: now, n: (this.row("SELECT COUNT(DISTINCT id) AS c FROM typeseq WHERE k=?", kk) || {c: 0}).c};
        if (kp[kk].n >= 50) v.kraj = {k: kk, own: (this.row("SELECT COUNT(*) AS c FROM typeseq WHERE type=? AND k=?", ty, kk) || {c: 0}).c, players: kp[kk].n}; }
      if (c.size > 500) c.clear(); c.set(ty + kk, {t: now, v});
      return json(v);
    }
    if (p === "/api/atlasy") {
      const scope = qp("k") || "";
      const region = KRAJE.includes(scope) ? scope : "";
      const id = req.method === "POST" ? cleanId(B.id) : "";
      return json(this.atlasLeaderboard(region, id));
    }
    if (p === "/api/vapid") return json({key: (await this.keys()).pub});
    if (p === "/api/wave" && req.method === "POST") {
      const b = await body();
      const hex = cleanHex(b.hex), id = cleanId(b.id), la = num(b.lat), lo = num(b.lon);
      const emoji = EMO.includes(b.emoji) ? b.emoji : "👋";
      if (!hex || id.length < 8 || la == null || lo == null || Math.abs(la) > 90 || Math.abs(lo) > 180) return json({error: "bad"}, 400);
      if (!this.rate("wave:" + iph, 30000, 86400e3) || !this.rate("wid:" + id, 150, 86400e3)) { this.bump("429:wave"); return json({error: "rate"}, 429); }
      // 🔥 séria z appky (pre pripomienku s číslom)
      const st = num(b.st, 0) | 0; if (st > 0 && st < 3650) this.sql.exec("INSERT INTO streaks(id, n, day) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET n=excluded.n, day=excluded.day", id, st, d);
      const vp = await this.verifyPlane(hex, la, lo);
      // žiadna sieť neodpovedala – nezapisovať, appka mávnutie o chvíľu zopakuje
      if (!vp.known && (num(b.try, 0) | 0) < 3) { this.bump("wave_retry"); return json({error: "busy"}, 503, {"Retry-After": "15"}); }
      // odložené mávnutie (bez signálu / výpadok): poloha lietadla v čase mávnutia z mobilu – ak sedí s dnešnou polohou a rýchlosťou
      const tw = num(b.t, 0), sp = b.pl && typeof b.pl === "object" ? b.pl : null;
      if (vp.found && !vp.ground && tw && now - tw > 60e3 && now - tw < 15 * 60e3 && sp && isFinite(sp.la) && isFinite(sp.lo) && vp.lat != null) {
        const moved = distKm(+sp.la, +sp.lo, vp.lat, vp.lon), maxKm = (now - tw) / 3600e3 * 1100 + 10;
        if (moved <= maxKm) { vp.km = distKm(la, lo, +sp.la, +sp.lo); if (isFinite(sp.alt) && sp.alt > 0) vp.alt = Math.min(50000, +sp.alt); vp.late = 1; }
      }
      if (vp.found && (vp.ground || vp.km > 130)) return json({error: "far"}, 422);
      const pdx = await this.pid(id);
      // do súťaží sa ráta len poloha zo Slovenska, ktorá sedí s IP adresou, a nie z VPN/serverov
      const asn = Number(req.headers.get("x-cc-asn") || 0);
      let fair = country === "SK" && !ipFar(la, lo) && !DC_ASN.has(asn);
      if (country === "SK" && DC_ASN.has(asn)) this.bump("vpn");
      // jedno mesto a kraj na účet a deň (nedá sa „cestovať“ po rebríčkoch)
      let dd = this.row("SELECT town, k, n, la, lo FROM idday WHERE day=? AND id=?", d, id);
      if (b.gps !== true) fair = false;
      if (!dd && fair) { dd = {town: townOf(la, lo), k: krajOf(la, lo), n: 0, la, lo}; this.sql.exec("INSERT INTO idday(day, id, town, k, n, la, lo) VALUES(?, ?, ?, ?, 0, ?, ?)", d, id, dd.town, dd.k, la, lo); }
      // poloha je na deň zamknutá: ďalšie mávnutia sa rátajú len do 30 km od prvého (žiadne „teleportovanie“)
      const near = dd && dd.la != null ? distKm(la, lo, dd.la, dd.lo) <= 30 : true;
      if (dd && !near) this.bump("teleport");
      // do líg sa ráta max 25 mávnutí na účet a 60 na sieť za deň a len overené lietadlo
      // ochrana ligy pred skriptami: účet mladší ako 10 min sa ráta len pri lietadle, ktoré appka naozaj ukazovala
      const acc = this.row("SELECT t FROM ids WHERE id=?", id), sb = this.seenBy && this.seenBy.get(id);
      const trusted = !acc || now - (acc.t || 0) > 600e3 || (sb && now - sb.t < 300e3 && sb.h.has(hex));
      const league = trusted && fair && dd && near && vp.known && vp.found && vp.km <= 60 && dd.n < 25 && this.rate("lg:" + iph, 5000, 86400e3);
      const k = fair && dd ? dd.k : "XX";
      const kid = this.isKid(id), savedNick = kid ? null : this.row("SELECT nick, edited FROM nicks WHERE id=?", id);
      const nk = kid ? "" : savedNick?.edited ? savedNick.nick : this.nm(b.nick);
      // Starý klient môže priniesť prezývku v mávnutí. Výslovne uložené meno má prednosť.
      if (nk && !savedNick?.edited && lc(nk) !== "spotter") {
        this.sql.exec("INSERT INTO nicks(id, nick, lc) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET nick=excluded.nick, lc=excluded.lc WHERE nicks.nick IS NOT excluded.nick", id, nk, lc(nk));
        this.sql.exec("DELETE FROM hidden WHERE id=?", id);
      }
      // zápis prvý (atomicky) – dve rýchle mávnutia sa nezapočítajú dvakrát
      this.sql.exec("INSERT OR IGNORE INTO wavelog(day, hex, id, t, k, pid, lg) VALUES(?, ?, ?, ?, ?, ?, ?)", d, hex, id, now, k, pdx, league ? 1 : 0);
      const seen = !(this.row("SELECT changes() AS c") || {c: 0}).c;
      // dnes už mávnuté, ale ešte nie ulovené (napr. predtým nízko nad obzorom) → úlovok sa smie overiť teraz
      const previousCatch = this.row("SELECT type FROM catches WHERE id=? AND hex=?", id, hex);
      const fresh = !seen || !previousCatch || (!previousCatch.type && !!vp.type);
      let golden = false;
      // ✈️ úlovok overený serverom (lietadlo sme našli v sieti a je blízko)
      // výška nad obzorom počíta server – úlovok do súťaží len ≥ 8° (2° rezerva na oneskorenie dát)
      const sel = vp.found ? elevDeg(vp.km, vp.alt) : null, ty = vp.type || "";
      const cok = fresh && vp.found && (sel == null ? vp.km <= 60 : sel >= 8) && fair && near && b.gps === true;
      const tier = tierOf(ty), shiny = vp.found && (sel == null || sel >= 8) ? (await this.shinyOf(hex, d, tier)) : false;
      let seq = 0, firstK = false, firstT = false, ed = null, atlasPoints = 0;
      // prečo úlovok nie je overený (appka to ukáže hráčovi)
      const why = !fresh ? "" : !vp.found ? (vp.known ? "lietadlo sme v dátach o letoch nenašli" : "dáta o letoch boli dočasne nedostupné") : (sel != null && sel < 8) ? "nízko nad obzorom (" + Math.round(sel) + "°)" : b.gps !== true ? "poloha bola vybraná ručne, nie z GPS" : !fair ? "si mimo Slovenska alebo máš zapnutú VPN" : !near ? "viac ako 30 km od miesta, kde si dnes začal(a)" : "";
      if (fresh && vp.found && (sel == null || sel >= 8)) this.sql.exec("INSERT INTO catches(id, hex, t, type, reg, el, ok, shiny) VALUES(?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id, hex) DO UPDATE SET type=excluded.type, ok=MAX(catches.ok, excluded.ok) WHERE catches.type='' AND excluded.type<>''", id, hex, now, ty, vp.reg || "", sel, cok ? 1 : 0, shiny ? 1 : 0);
      if (cok && ty) {
        const had = this.row("SELECT seq FROM typeseq WHERE type=? AND id=?", ty, id);
        if (had) seq = had.seq;
        else {
          const kk = dd ? dd.k : "XX", tw = dd ? dd.town : "";
          firstK = !this.row("SELECT 1 AS x FROM typeseq WHERE type=? AND k=? LIMIT 1", ty, kk);
          firstT = !!tw && !this.row("SELECT 1 AS x FROM typeseq WHERE type=? AND town=? LIMIT 1", ty, tw);
          seq = ((this.row("SELECT MAX(seq) AS m FROM typeseq WHERE type=?", ty) || {}).m || 0) + 1;
          this.sql.exec("INSERT OR IGNORE INTO typeseq(type, id, seq, w, k, town, t) VALUES(?, ?, ?, ?, ?, ?, ?)", ty, id, seq, TIER_W[tier], kk, tw, now);
          if (this.row("SELECT changes() AS c")?.c) atlasPoints = TIER_W[tier] + (seq === 1 ? 100 : 0);
          if (this.cstat) this.cstat.delete(ty); this._players = null;
          if (seq === 1) this.bump("first_sk");
        }
      }
      // edícia „Bol som pri tom“ – stačí overené mávnutie (aj keď typ lietadla nepoznáme); odložené mávnutie sa ráta v čase mávnutia
      if (cok) {
        if (this.relayEnabled() && !vp.emg) this.relayWave(id, hex, vp, k, now);
        const te = vp.late ? tw : now;
        const missionWeek = this.week(te);
        if (this.ensureMissionWeek(this.week(now)) && this.row("SELECT 1 AS x FROM mission_weeks WHERE week=?", missionWeek)) {
          this.sql.exec("INSERT OR IGNORE INTO mission_waves(week, id, day, hex) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM ids WHERE id=?)",
            missionWeek, id, this.day(te), hex, id);
        }
        const ev = EVENTS.find(e => te >= Date.parse(e.from) && te < Date.parse(e.to));
        if (ev) {
          const h = this.row("SELECT no FROM edcatch WHERE ev=? AND id=?", ev.id, id);
          if (h) ed = {id: ev.id, n: ev.n, no: h.no};
          else { const no = ((this.row("SELECT MAX(no) AS m FROM edcatch WHERE ev=?", ev.id) || {}).m || 0) + 1; this.sql.exec("INSERT OR IGNORE INTO edcatch(ev, id, no, type, t) VALUES(?, ?, ?, ?, ?)", ev.id, id, no, ty, now); ed = {id: ev.id, n: ev.n, no}; }
        }
      }
      if (!seen) {
        const town = league ? dd.town : "";
        if (league) this.sql.exec("UPDATE idday SET n = n + 1 WHERE day=? AND id=?", d, id);
        if (!vp.priv) this.sql.exec("INSERT INTO planes(day, hex, call, type, dest) VALUES(?, ?, ?, ?, ?) ON CONFLICT(day, hex) DO UPDATE SET call=COALESCE(NULLIF(excluded.call,''), call), type=COALESCE(NULLIF(excluded.type,''), type), dest=COALESCE(NULLIF(excluded.dest,''), dest)",
          d, hex, (vp.call || String(b.call || "")).replace(/[^A-Z0-9]/gi, "").slice(0, 8), (vp.type || String(b.type || "")).replace(/[^A-Z0-9]/gi, "").slice(0, 6), cleanName(b.dest, 40) || "");
        if (town) this.sql.exec("INSERT INTO towns(day, town, n) VALUES(?, ?, 1) ON CONFLICT(day, town) DO UPDATE SET n = n + 1", d, town);
        // 🗺️ mapa mávania: štvorec ~5 km, verejne len keď v ňom mávalo aspoň 5 rôznych hráčov (deti sa nerátajú)
        if (league && num(b.lat) != null && num(b.lon) != null && !this.isKid(id)) this.sql.exec("INSERT OR IGNORE INTO heatp(m, cell, id) VALUES(?, ?, ?)", d.slice(0, 7), (Math.round(num(b.lat) * 20) / 20).toFixed(2) + "," + (Math.round(num(b.lon) * 20) / 20).toFixed(2), id);
        const tm = this.row("SELECT code, jt FROM tmembers WHERE id=?", id);
        if (tm && league && now - (tm.jt || 0) > 86400e3) this.sql.exec("INSERT INTO tweek(code, wk, n) VALUES(?, ?, 1) ON CONFLICT(code, wk) DO UPDATE SET n = n + 1", tm.code, this.week());
        const g = this.goldenNow(d);
        // zlaté lietadlo: overené blízko (GPS, ≤ 60 km), zo Slovenska, účet starší ako 10 min
        const acct = this.row("SELECT t FROM ids WHERE id=?", id);
        // aktívny pred vyhlásením, aspoň 2 dni v appke, max 1 výhra za týždeň; víťaza žrebujeme, nie rýchlosť
        const pr = this.row("SELECT t FROM pres WHERE id=?", id), wonWk = this.row("SELECT 1 AS x FROM golden WHERE wid=? AND day >= ?", id, this.day(now - 7 * 86400e3));
        const days = (this.row("SELECT COUNT(*) AS c FROM seen WHERE id=?", id) || {c: 0}).c;
        if (g && g.state === 0 && g.hex === hex && league && b.gps === true && vp.km <= 60 && acct && now - acct.t > 6 * 3600e3 && acct.t < g.t && pr && now - pr.t < 5 * 60e3 && days >= 2) {
          this.sql.exec("INSERT OR IGNORE INTO gcand(day, seq, id, nick, k, town, t) VALUES(?, ?, ?, ?, ?, ?, ?)", d, g.seq, id, nk || "Spotter", k, town, now); golden = "entered";
        } else if (g && g.state === 0 && g.hex === hex) {
          // vysvetli, prečo sa mávnutie do zlatej posádky nerátalo
          golden = "no:" + (b.gps !== true ? "gps" : !league ? "league" : vp.km > 60 ? "far" : !acct || now - acct.t <= 6 * 3600e3 || acct.t >= g.t ? "new" : days < 2 ? "days" : "active");
        }
        this.sql.exec("INSERT INTO waves(day, hex, emoji, n) VALUES(?, ?, ?, 1) ON CONFLICT(day, hex, emoji) DO UPDATE SET n = n + 1", d, hex, emoji);
        if (league) {
          this.sql.exec("INSERT INTO kraje(day, k, n) VALUES(?, ?, 1) ON CONFLICT(day, k) DO UPDATE SET n = n + 1", d, k);
          this.sql.exec("INSERT INTO totals(day, n) VALUES(?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1", d);
          // dlhodobé súhrny: starosta mesiaca a súhrn roka (denné tabuľky sa po týždni mažú)
          const Y = d.slice(0, 4), yi = (key) => this.sql.exec("INSERT INTO yagg(y, k, n) VALUES(?, ?, 1) ON CONFLICT(y, k) DO UPDATE SET n = n + 1", Y, key);
          if (town) { this.sql.exec("INSERT INTO mayorm(m, town, id, n) VALUES(?, ?, ?, 1) ON CONFLICT(m, town, id) DO UPDATE SET n = n + 1", d.slice(0, 7), town, id); yi("t:" + town); }
          yi("k:" + k);
          if (!vp.priv) { const pl = this.row("SELECT call, type, dest FROM planes WHERE day=? AND hex=?", d, hex) || {}; this.sql.exec("INSERT INTO yplane(y, hex, call, type, dest, n) VALUES(?, ?, ?, ?, ?, 1) ON CONFLICT(y, hex) DO UPDATE SET n = n + 1, call=COALESCE(NULLIF(excluded.call,''), call), dest=COALESCE(NULLIF(excluded.dest,''), dest)", Y, hex, pl.call || "", pl.type || "", pl.dest || ""); }
        }
      }
      // 👯 spoločné mávnutie: kamarát zamával tomu istému lietadlu za posledných 10 minút
      let together = null;
      if (!seen) { const fw = this.row("SELECT w.id AS id FROM wavelog w JOIN friends f ON f.b = w.pid WHERE f.a=? AND w.day=? AND w.hex=? AND w.t > ? AND w.id <> ? LIMIT 1", pdx, d, hex, now - 10 * 60e3, id); if (fw) { const nk = this.row("SELECT nick FROM nicks WHERE id=?", fw.id); together = {n: (nk && nk.nick) || "Kamarát"}; } }
      // 🔎 diagnostika overenia (pre /admin, 7 dní)
      if (fresh) this.sql.exec("INSERT INTO wavewhy(id, t, hex, type, el, ok, why) VALUES(?, ?, ?, ?, ?, ?, ?)", id, now, hex, ty || String(b.type || "").replace(/[^A-Z0-9]/gi, "").slice(0, 5).toUpperCase(), sel, cok ? 1 : 0, cok ? "" : why);
      return json({ok: true, dup: seen, golden, together, plane: this.plane(d, hex), shiny, seq, firstK, firstT, ed, atlasPoints, el: sel == null ? null : Math.round(sel), ver: cok ? 1 : 0, why: cok ? "" : why, type: ty});
    }
    if (p === "/api/nick" && req.method === "POST") {
      const id = cleanId(B.id);
      if (this.isKid(id)) return json({error: "kid"}, 403);
      const input = typeof B.nick === "string" ? B.nick.normalize("NFKC").trim() : "";
      if (input.length > 20) return json({error: "length"}, 400);
      const nick = this.nm(input);
      if (nick == null) return json({error: "name"}, 400);
      if ([...nick].length < 2) return json({error: "length"}, 400);
      if (lc(nick) === "spotter") return json({error: "default"}, 400);
      if (!this.rate("nick:" + id, 8, 3600e3)) return json({error: "rate"}, 429);
      const save = () => {
        this.sql.exec("INSERT INTO nicks(id, nick, lc, edited) VALUES(?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET nick=excluded.nick, lc=excluded.lc, edited=1", id, nick, lc(nick));
        this.sql.exec("UPDATE tmembers SET nick=?, lc=? WHERE id=?", nick, lc(nick), id);
        this.sql.exec("DELETE FROM hidden WHERE id=?", id);
      };
      if (this.ctx.storage.transactionSync) this.ctx.storage.transactionSync(save);
      else save();
      return json({ok: true, nick});
    }
    if (p === "/api/kid" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), on = b.on ? 1 : 0;
      if (on) this.enableKidMode(id, await this.pid(id));
      else this.sql.exec("UPDATE ids SET kid=0 WHERE id=?", id);
      return json({ok: true, kid: on});
    }
    if (p === "/api/division" && req.method === "POST") {
      // 🏅 divízie po 30: hráči s podobným počtom overených mávnutí tento týždeň (aj začiatočník má šancu byť prvý)
      const b = await body(), id = cleanId(b.id);
      if (!(await this.authed(id, b.tok))) return json({error: "auth"}, 401);
      const wk = this.week(now);
      const myS = (this.row("SELECT SUM(n) AS s FROM idday WHERE day >= ? AND id=?", wk, id) || {}).s | 0;
      if (!this._div || this._div.wk !== wk || now - this._div.t > 300e3 || (myS > 0 && !this._div.pos.has(id))) {
        const all = this.sql.exec("SELECT id, SUM(n) AS s FROM idday WHERE day >= ? GROUP BY id HAVING s > 0 ORDER BY s DESC, id LIMIT 30000", wk).toArray();
        const pos = new Map(); all.forEach((r, i) => pos.set(r.id, i)); this._div = {wk, t: now, all, pos};
      }
      const D = this._div, i = D.pos.get(id), dn = Math.ceil(D.all.length / 30);
      if (i == null) return json({div: null, divs: dn, players: D.all.length});
      const no = Math.floor(i / 30), part = D.all.slice(no * 30, no * 30 + 30);
      const rows = part.map(r => { const x = this.row("SELECT n.nick, i.kid FROM ids i LEFT JOIN nicks n ON n.id = i.id WHERE i.id=?", r.id) || {}; return {n: r.id === id ? "Ty" : (x.kid || !x.nick ? "Spotter" : x.nick), w: r.id === id ? Math.max(r.s, myS) : r.s, me: r.id === id}; }).sort((a, b) => b.w - a.w);
      return json({div: no + 1, divs: dn, rank: rows.findIndex(r => r.me) + 1, of: part.length, rows});
    }
    if (p === "/api/friends" && req.method === "POST") {
      const b = await body(), pd = await this.pid(cleanId(b.id));
      if (b.remove) { const o = String(b.remove).replace(/[^A-Za-z0-9]/g, "").slice(0, 16); this.sql.exec("DELETE FROM friends WHERE (a=? AND b=?) OR (a=? AND b=?)", pd, o, o, pd); return json({ok: true}); }
      // týždenné mávnutia overené serverom – súboj kamarátov sa nedá sfalšovať v mobile
      const cc = x => (this.row("SELECT COUNT(*) AS c FROM catches WHERE id=? AND ok=1", x) || {c: 0}).c;
      const wk0 = this.day(now - ((new Date(this.day(now) + "T12:00:00Z").getUTCDay() + 6) % 7) * 86400e3), wk = x => (this.row("SELECT COUNT(*) AS c FROM wavelog WHERE pid=? AND day>=? AND lg=1", x, wk0) || {c: 0}).c;
      const list = this.sql.exec("SELECT b FROM friends WHERE a=? LIMIT 50", pd).toArray();
      const out = [];
      for (const r of list) { let ids = this.sql.exec("SELECT id FROM wavelog WHERE pid=? LIMIT 1", r.b).toArray(); if (!ids.length) ids = this.sql.exec("SELECT id FROM ids WHERE pid=? LIMIT 1", r.b).toArray(); const nk = ids.length ? this.row("SELECT nick FROM nicks WHERE id=?", ids[0].id) : null; out.push({p: r.b, n: (nk && nk.nick) || "Kamarát", w: wk(r.b), c: ids.length ? cc(ids[0].id) : 0}); }
      return json({friends: out, me: wk(pd), meC: cc(cleanId(b.id))});
    }
    if (p === "/api/mydata" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), pd = await this.pid(id);
      const account = this.row("SELECT t, ls, kid FROM ids WHERE id=?", id);
      const out = {vytvorene: new Date(account.t).toISOString(), poslednaAktivita: account.ls, detskyRezim: !!account.kid};
      for (const table of PLAYER_DATA_TABLES) {
        if (table === "xfer") continue; // jednorazový prístupový kód
        out[table] = this.sql.exec(`SELECT * FROM ${table} WHERE id=?`, id).toArray().map(({id, lc, sub, other, edited, ...row}) => row);
      }
      const synced = this.row("SELECT backup FROM player_accounts WHERE id=?", id);
      if (synced) out.zalohaZbierky = JSON.parse(synced.backup);
      out.kamarati = (this.row("SELECT COUNT(*) AS c FROM friends WHERE a=?", pd) || {c: 0}).c;
      out.pozvanky = (this.row("SELECT n FROM refs WHERE pid=?", pd) || {n: 0}).n;
      out.gifts = this.sql.exec("SELECT type, t, CASE WHEN id=? THEN 'sent' ELSE 'received' END AS direction FROM gifts WHERE id=? OR used=?", id, id, id).toArray();
      out.duelres = this.sql.exec("SELECT t, res, CASE WHEN src=? THEN 'sent' ELSE 'received' END AS direction FROM duelres WHERE pid=? OR src=?", id, pd, id).toArray();
      out.teams = this.sql.exec("SELECT name, t FROM teams WHERE owner=?", id).toArray();
      out.golden = this.sql.exec("SELECT day, seq, type, wnick, wk, wtown, wt FROM golden WHERE wid=?", id).toArray();
      return json(out);
    }
    if (p === "/api/xfer" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), data = b.data;
      if (!this.rate("xfer:" + id, 10, 3600e3)) return json({error: "rate"}, 429);
      if (typeof data !== "string" || !objectJSON(data)) return json({error: "bad"}, 400);
      if (TEXT_ENCODER.encode(data).byteLength > TRANSFER_DATA_BYTES) return json({error: "big"}, 413);
      let code;
      do { code = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[b & 31]).join(""); }
      while (this.row("SELECT 1 AS x FROM xfer WHERE code=?", code) || this.row("SELECT 1 AS x FROM xfer_receipts WHERE code=?", code));
      this.sql.exec("DELETE FROM xfer WHERE id=? OR t < ?", id, now - 10 * 60e3);
      this.sql.exec("INSERT INTO xfer(code, id, data, t) VALUES(?, ?, ?, ?)", code, id, data, now);
      return json({code, ttl: 600});
    }

    if (p === "/api/admin" && req.method === "POST") {
      const b = await body(); if (!this.admin(u, req, b.key)) { this.bump("401admin"); return json({error:"auth",configured:!!this.env.ADMIN_KEY,keyReceived:!!((req.headers.get("x-admin-key"))||b.key)},401); }
      if (b.resetAction) {
      if (b.resetAction === "prepare") {
        const nonce = crypto.randomUUID();
        this.setMeta("wipe_nonce", nonce);
        this.setMeta("wipe_until", now + 5 * 60e3);
        const users = (this.row("SELECT COUNT(*) AS c FROM ids") || {}).c || 0;
        const cards = (this.row("SELECT COUNT(*) AS c FROM typeseq") || {}).c || 0;
        return json({ok:true,phase:"prepare",nonce,expires:now + 5 * 60e3,users,cards,epoch:Number(this.getMeta("player_reset_epoch")||0)});
      }
      if (b.resetAction !== "execute" || b.confirm !== "VYMAZAT VSETKY DATA"
        || typeof b.nonce !== "string"
        || !sameStr(b.nonce, this.getMeta("wipe_nonce") || "")
        || now > Number(this.getMeta("wipe_until") || 0)) return json({error:"confirm"}, 400);
      // Všetky herné tabuľky, identity, prvé overenia, štatistiky a ligy.
      // Whitelist: žiadne dynamicky zadané SQL názvy a žiadne systémové tabuľky.
      const wipe = ["waves","waveby","wavelog","relay_waves","kraje","totals","pres","nicks","subs",
        "tracks","msgs","queue","moments","momentby","planes","towns","mails","maildel",
        "maildeliv","golden","teams","tmembers","tweek","ids","rl","friends","reminders",
        "catches","heatp","typeseq","edcatch","wavewhy","gifts","mayorhof","mayorm",
        "yagg","yplane","seen","reports","banned","idday","funnel","refs","errs",
        "gcand","xfer","xfer_receipts","player_accounts","account_codes","sig","hidden","streaks","duelres","mission_waves","mission_weeks"];
      const nextEpoch = Number(this.getMeta("player_reset_epoch")||0) + 1;
      // Durable Object serializuje operácie; reset celého DB sa vykoná synchronne.
      for (const table of wipe) this.sql.exec("DELETE FROM " + table);
      this.sql.exec("DELETE FROM meta WHERE k NOT IN ('flags','specials','mig3','player_reset_epoch','mission_goal')");
      this.setMeta("player_reset_epoch", nextEpoch);
      this._gameSnap=null;this._wk=null;this._div=null;this._year=null;this._players=null;
      this.cstat=new Map();this._spec=null;
      return json({ok:true,phase:"complete",epoch:nextEpoch,clearedTables:wipe.length});
      }
      if (b.missionGoal !== undefined) {
        if (!Number.isSafeInteger(b.missionGoal) || b.missionGoal < 0 || b.missionGoal > 1000000)
          return json({error: "mission_goal"}, 400);
        const week = this.week(now);
        this.ensureMissionWeek(week);
        this.setMeta("mission_goal", b.missionGoal);
        return json({ok: true, missionGoal: b.missionGoal, currentGoal: this.ensureMissionWeek(week)});
      }
      if (b.flags && typeof b.flags === "object") this.setMeta("flags", JSON.stringify({santaPush: b.flags.santaPush !== false, sunWave: b.flags.sunWave !== false, social: b.flags.social === "min" ? "min" : "full", hideMil: b.flags.hideMil === true}));
      if (typeof b.specials === "string") {
        // 🎨 špeciálne nátery a 🥇 prvé lety – riadky „OM-ABC = Retro náter“ alebo „2026-12-15 WZZ1234 = Prvý let do Dubaja“
        const lv = {}, fi = [];
        for (const ln of b.specials.split(/\r?\n/).slice(0, 300)) { const m = ln.split("="); if (m.length < 2) continue; const l = m[0].trim().toUpperCase(), txt = cleanName(m.slice(1).join("=").trim(), 60); if (!txt) continue;
          const f = l.match(/^(\d{4}-\d{2}-\d{2})\s+([A-Z0-9]{3,8})$/); if (f) fi.push({d: f[1], call: f[2], txt}); else if (/^[A-Z0-9-]{3,8}$/.test(l)) lv[l] = txt; }
        this.setMeta("specials", JSON.stringify({lv, fi})); this._spec = null;
      }
      if (b.unban) { this.sql.exec("DELETE FROM banned WHERE name=?", lc(b.unban)); this.sql.exec("DELETE FROM reports WHERE name=?", lc(b.unban)); this.sql.exec("UPDATE hidden SET appeal=3 WHERE name=?", lc(b.unban)); } // 3 = meno vrátené (appka ho ukáže)
      if (b.hideReport) {
        const name = lc(b.hideReport);
        const report = this.row("SELECT why FROM reports WHERE name=? ORDER BY t DESC LIMIT 1", name);
        if (report) this.hideReportedName(name, report.why || "ine", now);
      }
      if (b.dismissReport) this.sql.exec("DELETE FROM reports WHERE name=?", lc(b.dismissReport));
      if (b.confirm) { this.sql.exec("UPDATE banned SET ok=1, appeal=0 WHERE name=?", lc(b.confirm)); this.sql.exec("UPDATE hidden SET appeal=2 WHERE name=?", lc(b.confirm)); } // 2 = zamietnuté
      const sig = this.sql.exec("SELECT day, k, n FROM sig WHERE day >= ? ORDER BY day DESC, n DESC", this.day(now - 3 * 86400e3)).toArray();
      const fronta = this.sql.exec("SELECT name, why || CASE WHEN COALESCE(appeal, 0)=1 THEN ' · ✋ ODVOLANIE' ELSE '' END AS why, t FROM banned WHERE COALESCE(ok, 0)=0 OR COALESCE(appeal, 0)=1 ORDER BY COALESCE(appeal, 0) DESC, t DESC LIMIT 30").toArray();
      const pending = this.sql.exec("SELECT name, MAX(t) AS t, COUNT(*) AS count FROM reports WHERE name NOT IN (SELECT name FROM banned) GROUP BY name ORDER BY t DESC LIMIT 30").toArray();
      let overenie = null;
      if (b.nick) { const ids = this.sql.exec("SELECT id FROM nicks WHERE lc=? LIMIT 3", lc(String(b.nick))).toArray().map(r => r.id);
        overenie = ids.map(i => ({karticky: (this.row("SELECT COUNT(*) AS c FROM typeseq WHERE id=?", i) || {c: 0}).c, mavnutia: this.sql.exec("SELECT t, type, el, ok, why FROM wavewhy WHERE id=? ORDER BY t DESC LIMIT 15", i).toArray()})); }
      return json({flags: this.flags(), naKontrolu: fronta, podnety: pending, signaly: sig, overenie, specials: JSON.parse(this.getMeta("specials") || '{"lv":{},"fi":[]}')});
    }
    if (p === "/api/appeal" && req.method === "POST") {
      // ✋ odvolanie: hráč, ktorému sme skryli meno, požiada o ľudskú kontrolu (raz)
      const b = await body(), id = cleanId(b.id);
      if (!(await this.authed(id, b.tok))) return json({error: "auth"}, 401);
      const h = this.row("SELECT name, appeal FROM hidden WHERE id=?", id);
      if (!h) return json({ok: false});
      if (!h.appeal) { this.sql.exec("UPDATE hidden SET appeal=1 WHERE id=?", id); this.sql.exec("UPDATE banned SET appeal=1, ok=0 WHERE name=?", h.name); }
      return json({ok: true, appeal: h.appeal || 1});
    }
    if (p === "/api/report" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), name = lc(b.name).slice(0, 24);
      if (!name || name === "spotter") return json({error: "name"}, 400);
      if (!this.rate("rep:" + id, 10, 86400e3) || !this.rate("repip:" + iph, 100, 86400e3)) return json({error: "rate"}, 429);
      const acct = this.row("SELECT t FROM ids WHERE id=?", id), days = (this.row("SELECT COUNT(*) AS c FROM seen WHERE id=?", id) || {c: 0}).c;
      const trusted = acct && now - acct.t >= 86400e3 && days >= 2;
      const exists = ["nicks", "teams", "mails", "tmembers"].some(t => this.row(`SELECT 1 AS x FROM ${t} WHERE lc=? LIMIT 1`, name));
      if (!exists) return json({error: "gone"}, 404);
      const why = ["urazlive", "sikana", "osobne", "sex", "ine"].includes(b.why) ? b.why : "ine";
      this.sql.exec("INSERT OR IGNORE INTO reports(name, id, t, why) VALUES(?, ?, ?, ?)", name, id, now, why);
      const n = (this.row("SELECT COUNT(*) AS c FROM reports r JOIN ids i ON i.id=r.id WHERE r.name=? AND i.t <= ? AND (SELECT COUNT(*) FROM seen s WHERE s.id=i.id) >= 2", name, now - 86400e3) || {c: 0}).c;
      const serious = why === "osobne" || why === "sex";
      const hidden = n >= 3 || (serious && !!trusted);
      if (hidden) {
        this.hideReportedName(name, why, now);
        this.bump("ban"); this.alert("ban", "🚩 Meno čaká na kontrolu v /admin");
      }
      return json({ok: true, hidden});
    }
    if (p === "/api/friend" && req.method === "POST") {
      const b = await body(), me = await this.pid(cleanId(b.id)), other = String(b.pid || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16);
      if (other.length !== 16 || other === me) return json({error: "bad"}, 400);
      if (!(await this.fkOk(other, b.fk))) return json({error: "expired"}, 400);
      if (this.isKid(cleanId(b.id)) || this.row("SELECT 1 AS x FROM ids WHERE pid=? AND kid=1", other)) return json({error: "kid"}, 403);
      if (!this.rate("friend:" + iph, 500, 86400e3)) return json({error: "rate"}, 429);
      this.sql.exec("INSERT OR IGNORE INTO friends(a, b) VALUES(?, ?)", me, other);
      this.sql.exec("INSERT OR IGNORE INTO friends(a, b) VALUES(?, ?)", other, me);
      return json({ok: true});
    }
    if (p === "/api/forget" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if (id.length < 8 || typeof b.tok !== "string" || !b.tok) return json({error: "auth"}, 401);
      const revokedKey = await this.revokedKey(id);
      const proof = await this.revokedKey(id, b.tok);
      const revoked = this.row("SELECT proof FROM revoked_devices WHERE key=?", revokedKey);
      if (revoked) return sameStr(revoked.proof || "", proof) ? json({ok: true}) : json({error: "auth"}, 401);
      if (!(await this.authed(id, b.tok))) return json({error: "auth"}, 401);
      const pd = await this.pid(id);
      const erase = () => {
        this.sql.exec("INSERT OR IGNORE INTO revoked_devices(key, proof) VALUES(?, ?)", revokedKey, proof);
        this.erasePlayerData(id, pd);
      };
      if (this.ctx.storage.transactionSync) this.ctx.storage.transactionSync(erase);
      else erase();
      return json({ok: true});
    }
    if (p === "/api/mail" && req.method === "POST") {
      if (this.isKid(cleanId((await body()).id))) return json({error: "kid"}, 403);
      const b = await body(), id = cleanId(b.id), hex = cleanHex(b.hex), msg = Math.max(0, Math.min(11, num(b.msg, 0) | 0)), la = num(b.lat), lo = num(b.lon);
      if (id.length < 8 || !hex || la == null || lo == null) return json({error: "bad"}, 400);
      if (!this.rate("mail:" + iph, 600, 86400e3)) return json({error: "limit"}, 429);
      const vp = await this.verifyPlane(hex, la, lo);
      if (vp.found && (vp.ground || vp.km > 130)) return json({error: "far"}, 422);
      const fair = country === "SK" && !ipFar(la, lo);
      const cnt = (this.row("SELECT COUNT(*) AS c FROM mails WHERE day=? AND id=?", d, id) || {c: 0}).c;
      if (cnt >= 30) return json({error: "limit"}, 429);
      if (this.row("SELECT 1 AS x FROM mails WHERE day=? AND hex=? AND id=?", d, hex, id)) return json({ok: true, dup: true});
      const MEMO = ["☀️","🇸🇰","✈️","👋","🌙","☁️","😊","🔥","🙏","🛋️","🌄","🪟"];
      this.sql.exec("INSERT INTO mails(day, hex, id, nick, town, k, msg, emoji, t, lc) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", d, hex, id, this.nm(b.nick) || "", fair ? townOf(la, lo) : "", fair ? krajOf(la, lo) : "XX", msg, MEMO[msg] || "✉️", now, lc(b.nick));
      const on = (this.row("SELECT COUNT(*) AS c FROM mails WHERE day=? AND hex=?", d, hex) || {c: 0}).c;
      return json({ok: true, on});
    }
    if (p === "/api/team" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if (id.length < 8) return json({error: "bad"}, 400);
      if (this.isKid(id) && b.action !== "leave") return json({error: "kid"}, 403);
      const managedNick = this.row("SELECT nick FROM nicks WHERE id=? AND edited=1", id);
      const nick = managedNick?.nick || this.nm(b.nick) || "Spotter";
      if (b.action === "create") {
        const name = this.nm(b.name, 24); if (!name) return json({error: "name"}, 400);
        if (!this.rate("team:" + iph, 40, 86400e3)) return json({error: "rate"}, 429);
        let code; do { code = Array.from({length: 6}, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join(""); } while (this.row("SELECT 1 AS x FROM teams WHERE code=?", code));
        this.sql.exec("INSERT INTO teams(code, name, t, lc, owner) VALUES(?, ?, ?, ?, ?)", code, name, now, lc(name), id);
        this.sql.exec("INSERT INTO tmembers(id, code, nick, lc, jt) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, nick=excluded.nick, lc=excluded.lc, jt=CASE WHEN tmembers.code=excluded.code THEN tmembers.jt ELSE excluded.jt END", id, code, nick, lc(nick), now);
        return json({ok: true, code, name});
      }
      if (b.action === "join") {
        if (!this.rate("tjoin:" + iph, 200, 3600e3)) return json({error: "rate"}, 429);
        const code = String(b.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6), t = this.row("SELECT * FROM teams WHERE code=?", code);
        if (!t) return json({error: "notfound"}, 404);
        this.sql.exec("INSERT INTO tmembers(id, code, nick, lc, jt) VALUES(?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET code=excluded.code, nick=excluded.nick, lc=excluded.lc, jt=CASE WHEN tmembers.code=excluded.code THEN tmembers.jt ELSE excluded.jt END", id, code, nick, lc(nick), now);
        return json({ok: true, code, name: t.name});
      }
      if (b.action === "leave") { this.sql.exec("DELETE FROM tmembers WHERE id=?", id); return json({ok: true}); }
      return json({error: "bad"}, 400);
    }
    if (p === "/api/remind" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), at = Math.round(num(b.at, 0));
      if (!this.row("SELECT 1 AS x FROM subs WHERE id=?", id)) return json({error: "nosub"}, 400);
      if (!(at > now && at < now + 48 * 3600e3)) return json({error: "bad"}, 400);
      if ((this.row("SELECT COUNT(*) AS c FROM reminders WHERE id=?", id) || {c: 0}).c >= 5) return json({error: "rate"}, 429);
      const nm = b.kind === "css" ? "Čínska stanica Tiangong" : "ISS";
      const dir = String(b.dir || "").replace(/[^a-záäčďéíĺľňóôŕšťúýž -]/gi, "").slice(0, 20), mx = Math.max(10, Math.min(90, Math.round(num(b.max, 30))));
      this.sql.exec("INSERT OR REPLACE INTO reminders(id, at, title, body) VALUES(?, ?, ?, ?)", id, at, `🛰️ ${nm} o 5 minút nad tebou`, `Pozri na ${dir || "oblohu"}, vystúpi až ${mx}° nad obzor. Jasná „hviezda“, ktorá nebliká.`);
      return json({ok: true});
    }
    if (p === "/api/mywhy" && req.method === "POST") {
      // 🔎 moje posledné mávnutia a prečo (ne)boli overené – len vlastné dáta
      const b = await body(), id = cleanId(b.id);
      const rows = this.sql.exec("SELECT t, type, el, ok, why FROM wavewhy WHERE id=? ORDER BY t DESC LIMIT 10", id).toArray();
      const dd = this.row("SELECT town, k FROM idday WHERE day=? AND id=?", d, id);
      const nk = this.row("SELECT nick FROM nicks WHERE id=?", id), tc = (this.row("SELECT COUNT(*) AS c FROM typeseq WHERE id=?", id) || {c: 0}).c;
      const wl = (this.row("SELECT COUNT(*) AS c FROM wavelog WHERE id=? AND day=?", id, d) || {c: 0}).c;
      return json({rows, today: dd ? {town: dd.town, k: dd.k} : null, country, fairNow: country === "SK", nick: nk ? nk.nick : "", verified: tc, wavesToday: wl, asn: Number(req.headers.get("x-cc-asn") || 0)});
    }
    if (p === "/api/mycards" && req.method === "POST") {
      // ✓ ktoré moje kartičky sú overené serverom (+ poradie na Slovensku)
      const b = await body(), id = cleanId(b.id);
      const rows = this.sql.exec("SELECT type, seq FROM typeseq WHERE id=? LIMIT 500", id).toArray();
      // ✨ lesklé typy a 📅 edície – aby sa obnovili aj po preinštalovaní / pri chýbajúcej kartičke
      const sh = this.sql.exec("SELECT DISTINCT type FROM catches WHERE id=? AND shiny=1 AND type<>'' LIMIT 500", id).toArray().map(r => tAlias(r.type));
      const eds = this.sql.exec("SELECT ev, no, type FROM edcatch WHERE id=? LIMIT 100", id).toArray().map(r => [r.ev, (EVENTS.find(e => e.id === r.ev) || {}).n || r.ev, r.no, tAlias(r.type || "")]);
      return json({cards: rows.map(r => [tAlias(r.type), r.seq]), sh, ed: eds});
    }
    if (p === "/api/duelres" && req.method === "POST") {
      // ⚔️ výsledok súboja kartičiek pre vyzývateľa (v appke + upozornenie)
      const b = await body(), id = cleanId(b.id), to = String(b.to || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16), res = String(b.res || "").replace(/[^0-9:]/g, "").slice(0, 5);
      if (!to || !res || this.isKid(id) || this.row("SELECT 1 AS x FROM ids WHERE pid=? AND kid=1", to) || !this.rate("dres:" + id, 20, 86400e3)) return json({ok: false});
      const nk = (this.row("SELECT nick FROM nicks WHERE id=?", id) || {}).nick || "Kamarát";
      this.sql.exec("INSERT INTO duelres(pid, t, n, res, src) VALUES(?, ?, ?, ?, ?)", to, now, nk, res, id);
      const wid = (this.row("SELECT id FROM wavelog WHERE pid=? LIMIT 1", to) || {}).id;
      if (wid && this.row("SELECT 1 AS x FROM subs WHERE id=?", wid)) { const [a1, b1] = res.split(":").map(Number); this.notify(wid, "⚔️ " + nk + (a1 > b1 ? " ťa porazil(a) " : a1 < b1 ? " prehral(a) s tebou " : " remizoval(a) ") + res, "Súboj kartičiek – daj si odvetu!", "./"); }
      return json({ok: true});
    }
    if (p === "/api/unsub" && req.method === "POST") {
      this.unsubscribePlayer(cleanId((await body()).id));
      return json({ok: true});
    }
    if (p === "/api/subopt" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if (!this.row("SELECT id FROM subs WHERE id=?", id)) return json({error: "subscription"}, 409);
      if (b.streak != null) this.sql.exec("UPDATE subs SET streak=? WHERE id=?", b.streak ? 1 : 0, id);
      if (b.leg != null) this.sql.exec("UPDATE subs SET leg=? WHERE id=?", b.leg ? 1 : 0, id);
      return json({ok: true});
    }
    if (p === "/api/gift" && req.method === "POST") {
      // 🎁 daruj kópiu: len z overených duplikátov, len bežné/nezvyčajné, max 3 denne
      const b = await body(), id = cleanId(b.id), ty = tAlias(String(b.type || "").replace(/[^A-Z0-9]/gi, "").slice(0, 6).toUpperCase());
      if (this.isKid(id)) return json({error: "kid"}, 403);
      if (!ty || !["c", "u"].includes(tierOf(ty))) return json({error: "tier"}, 400);
      const acct = this.row("SELECT t FROM ids WHERE id=?", id);
      if (!acct || now - acct.t < 7 * 86400e3) return json({error: "new"}, 403);
      const have = (this.row("SELECT COUNT(*) AS c FROM catches WHERE id=? AND type=? AND ok=1", id, ty) || {c: 0}).c;
      const given = (this.row("SELECT COUNT(*) AS c FROM gifts WHERE id=? AND type=?", id, ty) || {c: 0}).c;
      if (have - 1 - given < 1) return json({error: "dup"}, 400);
      if (!this.rate("gift:" + id, 3, 86400e3)) return json({error: "rate"}, 429);
      const code = b64u(crypto.getRandomValues(new Uint8Array(6))).replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
      this.sql.exec("INSERT INTO gifts(code, id, type, t) VALUES(?, ?, ?, ?)", code, id, ty, now);
      const gl = this.row("SELECT n FROM rl WHERE k=?", "gift:" + id);
      return json({code, left: gl ? Math.max(0, 3 - (gl.n | 0)) : null});
    }
    if (p === "/api/giftclaim" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), code = String(b.code || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
      if (this.isKid(id)) return json({error: "kid"}, 403);
      const g = this.row("SELECT * FROM gifts WHERE code=?", code);
      if (!g || g.used || now - g.t > 14 * 86400e3) return json({error: "gone"}, 410);
      if (g.id === id) return json({error: "self"}, 400);
      if (!this.rate("gclaim:" + id, 5, 86400e3)) return json({error: "rate"}, 429);
      this.sql.exec("UPDATE gifts SET used=? WHERE code=?", id, code);
      const nk = this.row("SELECT x.nick, i.kid FROM nicks x LEFT JOIN ids i ON i.id = x.id WHERE x.id=?", g.id);
      return json({type: g.type, from: nk && !nk.kid && nk.nick ? nk.nick : "Kamarát"});
    }
    if (p === "/api/sub" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      let host = ""; try { host = new URL(b.sub && b.sub.endpoint).hostname; } catch (e) {}
      if (id.length < 8 || !host || !/^https:\/\//.test(b.sub.endpoint) || !PUSH_HOSTS.some(h => host === h || host.endsWith("." + h))) return json({error: "bad"}, 400);
      if (!this.rate("sub:" + iph, 300, 86400e3)) return json({error: "rate"}, 429);
      if (this.isKid(id)) return json({error: "kid"}, 403); // detský režim: žiadne upozornenia (ani keď je na rodinnom mobile push zapnutý)
      if (b.keep && !this.row("SELECT id FROM subs WHERE id=?", id)) return json({error: "subscription"}, 409);
      if (b.keep) { this.sql.exec("UPDATE subs SET sub=?, t=? WHERE id=?", JSON.stringify({endpoint: b.sub.endpoint}).slice(0, 1000), now, id); return json({ok: true}); }
      this.sql.exec("INSERT INTO subs(id, sub, lat, lon, k, moment, t) VALUES(?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET sub=excluded.sub, lat=excluded.lat, lon=excluded.lon, k=excluded.k, moment=excluded.moment, t=excluded.t",
        id, JSON.stringify({endpoint: b.sub.endpoint}).slice(0, 1000), round2(b.lat), round2(b.lon), krajOf(num(b.lat), num(b.lon)), b.moment ? 1 : 0, now);
      if (b.streak != null) this.sql.exec("UPDATE subs SET streak=? WHERE id=?", b.streak ? 1 : 0, id);
      if (b.leg != null) this.sql.exec("UPDATE subs SET leg=? WHERE id=?", b.leg ? 1 : 0, id);
      // rodinné profily na jednom mobile: jeden prehliadač = jeden odber (inak chodia upozornenia 2–3×)
      this.sql.exec("DELETE FROM subs WHERE sub=? AND id<>?", JSON.stringify({endpoint: b.sub.endpoint}).slice(0, 1000), id);
      return json({ok: true});
    }
    if (p === "/api/subset" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id);
      if ("moment" in b) {
        if (!this.row("SELECT id FROM subs WHERE id=?", id)) return json({error: "subscription"}, 409);
        this.sql.exec("UPDATE subs SET moment=? WHERE id=?", b.moment ? 1 : 0, id);
      }
      if (b.lat != null) this.sql.exec("UPDATE subs SET lat=?, lon=? WHERE id=?", round2(b.lat), round2(b.lon), id);
      return json({ok: true});
    }
    if (p === "/api/track" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), cs = cleanCs(b.cs);
      if (id.length < 8) return json({error: "bad"}, 400);
      if (!cs || b.off) { this.sql.exec("DELETE FROM tracks WHERE id=?" + (cs ? " AND cs=?" : ""), ...(cs ? [id, cs] : [id])); return json({ok: true}); }
      if (this.isKid(id)) return json({error: "kid"}, 403);
      if ((this.row("SELECT COUNT(*) AS c FROM tracks WHERE id=? AND cs<>?", id, cs) || {c: 0}).c >= 5) return json({error: "limit"}, 429);
      if (!/^[A-Z]{2,3}[0-9][0-9A-Z]{0,4}$|^[A-Z0-9]{3,8}$/.test(cs) || !this.rate("trk:" + iph, 400, 86400e3)) return json({error: "limit"}, 429);
      this.sql.exec("INSERT INTO tracks(id, cs, label, lat, lon, notified, t) VALUES(?, ?, ?, ?, ?, 0, ?) ON CONFLICT(id, cs) DO UPDATE SET label=excluded.label, lat=excluded.lat, lon=excluded.lon, notified=0, t=excluded.t",
        id, cs, cleanName(b.label, 30) || "", round2(b.lat), round2(b.lon), now);
      return json({ok: true});
    }
    if (p === "/api/msg") {
      const mid = cleanId(qp("id"));
      const allowed = await this.authed(mid, qp("tok"));
      if (B.inbox || Array.isArray(B.ack)) {
        if (!allowed) return json({error: "auth"}, 401);
        if (Array.isArray(B.ack)) {
          for (const id of B.ack.slice(0, 40)) {
            if (!Number.isSafeInteger(id) || !this.row("SELECT 1 AS x FROM queue WHERE id=? AND qid=? AND (sent=1 OR sending=1)", mid, id)) continue;
            this.sql.exec("DELETE FROM queue WHERE qid=?", id);
            this.bump("push_displayed");
          }
          return json({ok: true});
        }
        const messages = this.sql.exec("SELECT qid, title, body, url, expires FROM queue WHERE id=? AND (sent=1 OR sending=1) AND expires>? ORDER BY qid LIMIT 40", mid, now).toArray();
        return json({messages});
      }
      const m = allowed ? this.row("SELECT title, body, url FROM msgs WHERE id=? AND t>?", mid, now - 15 * 60e3) : null;
      return json(m || {title: "✈️ Nad tebou sa niečo deje", body: "Ťukni a pozri, čo to letí.", url: "./"});
    }
    if (p === "/api/moment" && req.method === "POST") {
      const b = await body(), id = cleanId(b.id), m = this.moment(d);
      if (id.length >= 8 && now >= m.start && now < m.start + MOMENT_MS + 60e3) {
        const was = !!this.row("SELECT 1 AS x FROM momentby WHERE day=? AND id=?", d, id);
        if (!was) { this.sql.exec("INSERT INTO momentby(day, id) VALUES(?, ?)", d, id); this.sql.exec("UPDATE moments SET n = n + 1 WHERE day=?", d); }
      }
      const joined = !!this.row("SELECT 1 AS x FROM momentby WHERE day=? AND id=?", d, id);
      return json({ok: true, joined, n: (this.row("SELECT n FROM moments WHERE day=?", d) || {n: 0}).n});
    }
    if (p === "/api/sky") {
      if (!this.rate("sky:" + iph, 2000, 60e3)) { this.bump("429:sky"); return json({error: "rate"}, 429); }
      const okId = await this.authed(cleanId(qp("id")), qp("tok"));
      const id = okId ? cleanId(qp("id")) : "";
      const sla = num(qp("lat")), slo = num(qp("lon"));
      const k = sla != null && country === "SK" && !ipFar(sla, slo) ? krajOf(sla, slo) : "XX";
      if (id.length >= 8) { const pr = this.row("SELECT t FROM pres WHERE id=?", id); if (!pr || now - pr.t > 60e3) { this.sql.exec("INSERT INTO pres(id, t, k) VALUES(?, ?, ?) ON CONFLICT(id) DO UPDATE SET t = excluded.t, k = excluded.k", id, now, k); this.sql.exec("INSERT OR IGNORE INTO seen(day, id) VALUES(?, ?)", d, id); this.sql.exec("UPDATE ids SET ls=? WHERE id=?", d, id); } }
      const G = this.snap(d, now);
      const mission = this.weeklyMission(now, id);
      // šetriaci režim (vypínač v /admin): len spoločné údaje, žiadne osobné dotazy
      if (this.flags().social === "min") {
        // aj v šetriacom režime: počet pozvaných a výhra starostu (2 lacné dotazy podľa kľúča) – inak by sa nepripísali odznaky
        const pidM = id ? await this.pid(id) : "", prevM = new Date(new Date(d + "T12:00:00Z").setUTCDate(0)).toISOString().slice(0, 7);
        const myInvites = pidM ? (this.row("SELECT n FROM refs WHERE pid=?", pidM) || {n: 0}).n : 0;
        const won = id.length >= 8 ? (this.row("SELECT town FROM mayorhof WHERE id=? AND m=?", id, prevM) || {}).town || "" : "";
        return json({...G, mission, teamsTop: G.teamsTop.map(r => ({name: r.name, n: r.n})), planes: {}, friends: {}, now, mailsIn: [], mailsOut: [], mailOn: {}, myTeam: null, myInvites, goldMine: 0, mayor: won ? {won} : null, flags: this.flags()});
      }
      const hexes = (qp("hexes") || "").split(",").map(cleanHex).filter(Boolean).slice(0, 25);
      // čo hráč práve vidí na oblohe (pamäť pár minút) – liga verí mávnutiu nového účtu, len ak to lietadlo naozaj videl
      if (id && hexes.length) { this.seenBy = this.seenBy || new Map(); this.seenBy.set(id, {t: now, h: new Set(hexes)}); if (this.seenBy.size > 20000) this.seenBy.clear(); }
      const myPid = id ? await this.pid(id) : "";
      const friendIds = myPid ? this.sql.exec("SELECT b FROM friends WHERE a=? LIMIT 50", myPid).toArray().map(r => r.b) : [];
      const planes = {}, friends = {};
      if (hexes.length) for (const r of this.sql.exec(`SELECT hex, emoji, n FROM waves WHERE day=? AND hex IN (${hexes.map(() => "?").join(",")})`, d, ...hexes).toArray()) { const pl = planes[r.hex] || (planes[r.hex] = {total: 0, emoji: {}}); pl.emoji[r.emoji] = r.n; pl.total += r.n; }
      for (const h of hexes) {
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
        if (id.length >= 8 && sla != null && !this.isKid(id)) {
          const cand = this.sql.exec(`SELECT * FROM mails m WHERE m.day=? AND m.hex IN (${ph}) AND m.id<>? AND (m.town<>? OR m.town='' OR ?='') AND m.t < ? AND NOT EXISTS (SELECT 1 FROM maildel x WHERE x.mid=m.mid AND x.id=?) ORDER BY m.t DESC LIMIT 2`, d, ...hexes, id, myTown, myTown, now - 60e3, id).toArray();
          for (const m of cand) {
            if (m.town && myTown && m.town === myTown) continue;
            this.sql.exec("INSERT OR IGNORE INTO maildel(mid, id) VALUES(?, ?)", m.mid, id);
            this.sql.exec("UPDATE mails SET delivered = delivered + 1 WHERE mid=?", m.mid);
            this.sql.exec("INSERT INTO maildeliv(mid, town, k, t) VALUES(?, ?, ?, ?)", m.mid, myTown, k, now);
            mailsIn.push({nick: m.nick || "Niekto", town: "", k: m.k, msg: m.msg, emoji: m.emoji, hex: m.hex});
          }
        }
      }
      let mailsOut = [];
      if (id.length >= 8) {
        mailsOut = this.sql.exec("SELECT md.rowid AS rid, md.town, md.k, m.msg FROM maildeliv md JOIN mails m ON m.mid = md.mid WHERE m.id=? AND md.seen=0 ORDER BY md.t LIMIT 5", id).toArray();
        for (const r of mailsOut) this.sql.exec("UPDATE maildeliv SET seen=1 WHERE rowid=?", r.rid);
        mailsOut = mailsOut.map(r => ({town: r.town, k: r.k, msg: r.msg}));
      }
      const wk = this.week(), mt = id.length >= 8 ? this.row("SELECT code FROM tmembers WHERE id=?", id) : null;
      const teamsTop = G.teamsTop.map(r => ({name: r.name, n: r.n, me: !!(mt && mt.code === r.code)}));
      let myTeam = null;
      if (mt) {
        const t = this.row("SELECT * FROM teams WHERE code=?", mt.code);
        if (t) {
          const n = (this.row("SELECT n FROM tweek WHERE code=? AND wk=?", t.code, wk) || {n: 0}).n;
          const rank = (this.row("SELECT COUNT(*) AS c FROM tweek WHERE wk=? AND n > ?", wk, n) || {c: 0}).c + 1;
          const cnt = (this.row("SELECT COUNT(*) AS c FROM tmembers WHERE code=?", t.code) || {c: 0}).c;
          myTeam = {code: t.code, name: t.name, n, rank, members: [], count: cnt};
        }
      }
      const myInvites = myPid ? (this.row("SELECT n FROM refs WHERE pid=?", myPid) || {n: 0}).n : 0;
      const gw = id ? this.row("SELECT g.seq FROM golden g JOIN gcand c ON c.day = g.day AND c.seq = g.seq AND c.id = ? WHERE g.day=? AND g.state=1 AND g.crew >= 20 ORDER BY g.seq DESC LIMIT 1", id, d) : null;
      const goldIn = id && G.golden && G.golden.state === 0 ? !!this.row("SELECT 1 AS x FROM gcand WHERE day=? AND seq=? AND id=?", d, G.golden.seq, id) : false;
      // 🏛️ Starosta oblohy: najaktívnejší spotter mesta v tomto mesiaci (len overené mávnutia do líg, deti bez mena)
      let mayor = null;
      const mTown = (id.length >= 8 && (this.row("SELECT town FROM idday WHERE day=? AND id=?", d, id) || {}).town) || myTown;
      if (mTown) {
        const mc = this.mayorC || (this.mayorC = new Map()), c = mc.get(mTown);
        let top = c && now - c.t < 60e3 ? c.v : null;
        if (!top) {
          top = this.sql.exec("SELECT d.id, d.n, x.nick, i.kid FROM mayorm d LEFT JOIN nicks x ON x.id = d.id LEFT JOIN ids i ON i.id = d.id WHERE d.m=? AND d.town=? ORDER BY d.n DESC LIMIT 1", d.slice(0, 7), mTown).toArray()[0] || null;
          if (mc.size > 3000) mc.clear(); mc.set(mTown, {t: now, v: top});
        }
        const mine = id.length >= 8 ? (this.row("SELECT n FROM mayorm WHERE m=? AND town=? AND id=?", d.slice(0, 7), mTown, id) || {n: 0}).n || 0 : 0;
        const prevM = new Date(new Date(d + "T12:00:00Z").setUTCDate(0)).toISOString().slice(0, 7), hof = this.row("SELECT nick, n, id FROM mayorhof WHERE m=? AND town=?", prevM, mTown);
        mayor = {town: mTown, nick: top && top.n > 0 ? (top.kid || !top.nick ? "Spotter" : top.nick) : "", n: top ? top.n || 0 : 0, me: !!(top && top.id === id && top.n > 0), mine,
          prev: hof ? {nick: hof.nick, n: hof.n, me: hof.id === id} : null, won: id.length >= 8 ? (this.row("SELECT town FROM mayorhof WHERE id=? AND m=?", id, prevM) || {}).town || "" : "",
          left: Math.max(0, new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7), 0)).getUTCDate() - +d.slice(8, 10))};
      }
      let duelIn = [];
      if (myPid) { duelIn = this.sql.exec("SELECT n, res, t FROM duelres WHERE pid=? AND t > ? ORDER BY t DESC LIMIT 5", myPid, now - 3 * 86400e3).toArray(); if (duelIn.length) this.sql.exec("DELETE FROM duelres WHERE pid=?", myPid); }
      // 🏡 adoptovaná obec: dnešné a týždenné mávnutia (podľa mesta prvého mávnutia dňa)
      let adopt = null; const ad = cleanName(qp("ad") || "", 40);
      if (ad) { const wk = this.week(now); adopt = {town: ad, d: (this.row("SELECT n FROM towns WHERE day=? AND town=?", d, ad) || {n: 0}).n || 0, w: (this.row("SELECT SUM(n) AS s FROM towns WHERE day >= ? AND town=?", wk, ad) || {s: 0}).s || 0}; }
      const hid = id.length >= 8 ? this.row("SELECT name, appeal FROM hidden WHERE id=?", id) : null;
      return json({...G, mission, planes, friends, now, relay: this.relayCards(id, now), mailsIn, mailsOut, mailOn, teamsTop, myTeam, myInvites, goldMine: gw ? gw.seq : 0, goldIn, mayor, duelIn, adopt, myHidden: hid ? {name: hid.name, appeal: hid.appeal | 0} : null, flags: this.flags()});
    }
    return json({error: "not found"}, 404);
  }
}

function adminPage() {
  const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Čo to letí? – správa</title>
<style>body{font:16px system-ui;background:#0d1430;color:#fff;margin:0;padding:18px}input,button,select{font:inherit;padding:12px;border-radius:12px;border:0;margin:4px 0;width:100%;box-sizing:border-box}button{background:#6dffc7;font-weight:700}pre{white-space:pre-wrap;background:#ffffff14;padding:12px;border-radius:12px;font-size:13px}label{display:block;margin-top:10px}#statsSummary{display:grid;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr));gap:8px}#statsSummary div{background:#ffffff14;padding:12px;border-radius:12px}#statsSummary dd{margin:4px 0 0;font-size:22px;font-weight:700}#statsDetails{margin:14px 0 22px}#statsDetails summary{cursor:pointer;padding:10px 0}#statsStatus:empty,#o:empty{display:none}</style></head>
<body><h2>✈️ Správa appky</h2><input id="k" type="password" placeholder="ADMIN_KEY" autocomplete="current-password">
<button id="s">📊 Štatistiky</button>
<p id="statsStatus" role="status">Zadaj kľúč a načítaj štatistiky.</p>
<section id="stats" hidden aria-label="Štatistiky">
<dl id="statsSummary">
<div><dt>Herné účty</dt><dd id="statsUsers"></dd></div>
<div><dt>Odbery upozornení</dt><dd id="statsPush"></dd></div>
<div><dt>Tímy</dt><dd id="statsTeams"></dd></div>
</dl>
<p>Dnešné údaje sú priebežné. Zber udalostí beta lievika je vypnutý.</p>
<div id="g"></div>
<details id="statsDetails"><summary>Technické údaje (JSON)</summary><pre id="statsRaw"></pre></details>
</section>
<label>🎅 Santa push 24. 12.<select id="sp"><option value="1">zapnutý</option><option value="0">vypnutý</option></select></label>
<label>🌊 Nedeľná vlna<select id="sw"><option value="1">zapnutá</option><option value="0">vypnutá</option></select></label><label>🫡 Vojenské lety<select id="hm"><option value="0">zobraziť</option><option value="1">skryť (napäté obdobie)</option></select></label><label>🛟 Sociálne funkcie<select id="so"><option value="full">plné</option><option value="min">šetriaci režim</option></select></label>
<button id="f">💾 Uložiť vypínače</button>
<label for="missionGoal">Cieľ týždennej misie Slovenska (0 = vypnutá)</label>
<p>Po začiatku týždňa zmena cieľa platí od ďalšieho pondelka. Nula misiu pozastaví ihneď.</p>
<input id="missionGoal" type="number" min="0" max="1000000" step="1">
<button id="missionSave">Uložiť cieľ misie</button>
<p id="missionStatus" role="status"></p>
<section style="border:2px solid #f4a4a4;border-radius:14px;padding:12px;margin:20px 0;background:#4a1828">
<strong>⚠️ CELÁ HRA OD NULY – iba správca</strong>
<p>Nezvratne odstráni všetkých hráčov, ligy, overenia, kartičkové prvenstvá, históriu mávnutí a štatistiky. Zmena sa prejaví aj na starých zariadeniach po obnovení aplikácie. Predtým urob zálohu Durable Object databázy.</p>
<button id="wipePreview" style="background:#ffd9a8;color:#3b1f15">1. Skontrolovať rozsah resetu</button>
<pre id="wipeInfo">Reset sa nespustil.</pre>
<button id="wipeExecute" disabled style="background:#ff7183;color:#3a101a">2. Natrvalo vymazať všetkých hráčov</button>
</section><label>🎨 Špeciálne nátery a 🥇 prvé lety (riadok: <i>OM-ABC = Retro náter</i> alebo <i>2026-12-15 WZZ1234 = Prvý let do Dubaja</i>)<textarea id="spx" rows="5" style="width:100%;box-sizing:border-box;border-radius:12px;padding:10px;font:14px monospace"></textarea></label><button id="spb">💾 Uložiť nátery a prvé lety</button><button id="q">🚩 Skryté mená na kontrolu</button><div id="qb"></div><input id="nk" placeholder="Prezývka hráča (overenie kartičiek)"><button id="ov">🔎 Prečo nie sú kartičky overené</button><pre id="o" role="status"></pre>
<script>const $=i=>document.getElementById(i),o=$("o"),H=()=>({"Content-Type":"application/json","x-admin-key":$("k").value});
const bars=(t,rows,key,col)=>{const w=340,h=120,n=rows.length,mx=Math.max(1,...rows.map(r=>+r[key]||0)),bw=w/n;let sv="<svg viewBox='0 0 "+w+" "+(h+34)+"' style='width:100%;background:#ffffff0d;border-radius:12px'>";rows.forEach((r,i)=>{const v=+r[key]||0,bh=Math.round(v/mx*(h-18));sv+="<rect x='"+(i*bw+2)+"' y='"+(h-bh)+"' width='"+(bw-4)+"' height='"+bh+"' rx='3' fill='"+col+"'/><text x='"+(i*bw+bw/2)+"' y='"+(h-bh-4)+"' font-size='9' fill='#fff' text-anchor='middle'>"+v+"</text><text x='"+(i*bw+bw/2)+"' y='"+(h+14)+"' font-size='8' fill='#ffffffaa' text-anchor='middle'>"+r.day.slice(8)+"."+r.day.slice(5,7)+"</text>"});return "<h3 style='margin:14px 0 6px'>"+t+"</h3>"+sv+"</svg>"};
$("s").onclick=async()=>{
 const status=$("statsStatus");
 status.textContent="Overujem prihlásenie…";
 $("stats").hidden=true;
 $("statsDetails").open=false;
 try{
 const key=$("k").value;
 if(!key){status.textContent="Zadaj hodnotu ADMIN_KEY, nie názov premennej.";return}
 const r=await fetch("/api/stats",{method:"POST",headers:H(),body:JSON.stringify({key})});
 const j=await r.json();
 if(r.status===401){status.textContent=j.configured===false?"⚠️ Produkčný server nevidí ADMIN_KEY. Skontroluj, či je Secret aktívny v nasadení Workeru (nie iba uložený v Settings).":j.keyReceived===false?"⚠️ Server nedostal zadaný kľúč. Skontroluj pripojenie a aktuálne nasadenie.":"⚠️ Server ADMIN_KEY vidí, ale zadaná hodnota sa nezhoduje. Zadaj hodnotu Secret presne tak, ako bola uložená, bez ďalších medzier.";return}
 if(!r.ok){status.textContent="Server odpovedal chybou "+r.status+": "+(j.error||"neznáma");return}
 const d=(j.dni||j.days||[]).slice().reverse();$("g").innerHTML=d.length?bars("👤 Aktívni hráči za deň",d,"dau","#6dffc7")+bars("👋 Mávnutia za deň",d,"waves","#ffcf4f"):"";
 $("missionGoal").value=j.missionGoal??0;
 $("statsUsers").textContent=j.users??"–";
 $("statsPush").textContent=j.pushSubs??"–";
 $("statsTeams").textContent=j.teams??"–";
 $("statsRaw").textContent=JSON.stringify(j,null,1);
 $("stats").hidden=false;
 status.textContent="";
 }catch(e){status.textContent="Spojenie so serverom zlyhalo. Skús obnoviť stránku."}};
$("f").onclick=async()=>{o.textContent="…";const r=await fetch("/api/admin",{method:"POST",headers:H(),body:JSON.stringify({flags:{santaPush:$("sp").value==="1",sunWave:$("sw").value==="1",social:$("so").value,hideMil:$("hm").value==="1"}})});o.textContent=JSON.stringify(await r.json(),null,1)};
const A=async x=>{const r=await fetch("/api/admin",{method:"POST",headers:H(),body:JSON.stringify({...x,key:$("k").value})});return r.json()};
$("missionSave").onclick=async()=>{
  const input=$("missionGoal"), status=$("missionStatus");
  if(!input.value||!input.checkValidity()){status.textContent="Zadaj celý počet mávnutí od 0 do 1 000 000.";return}
  try{
    const j=await A({missionGoal:input.valueAsNumber});
    if(!j.ok)status.textContent="Cieľ sa nepodarilo uložiť. Skontroluj kľúč.";
    else if(!j.missionGoal)status.textContent="Misia je pozastavená.";
    else if(j.currentGoal===j.missionGoal)status.textContent="Cieľ na tento týždeň: "+j.currentGoal+" mávnutí.";
    else status.textContent="Tento týždeň: "+j.currentGoal+" mávnutí. Od pondelka: "+j.missionGoal+" mávnutí.";
  }catch(e){status.textContent="Spojenie so serverom zlyhalo."}
};
const Q=async x=>{const j=await A(x||{});const qb=$("qb");qb.innerHTML="";(j.naKontrolu||[]).forEach(z=>{const d=document.createElement("div");d.style.cssText="background:#ffffff14;border-radius:12px;padding:10px;margin:6px 0";d.textContent=z.name+" · "+z.why+" ";const ok=document.createElement("button");ok.textContent="✅ Ponechať zákaz";ok.onclick=()=>Q({confirm:z.name});const no=document.createElement("button");no.textContent="↩️ Meno je v poriadku";no.style.background="#ffcf4f";no.onclick=()=>Q({unban:z.name});d.append(ok,no);qb.append(d)});for(const z of j.podnety||[]){const d=document.createElement("div");d.style.padding="10px";d.textContent=z.name+" · nahlásenia: "+z.count+" ";const no=document.createElement("button");no.textContent="Uzavrieť podnet";no.onclick=()=>Q({dismissReport:z.name});const hide=document.createElement("button");hide.textContent="Skryť meno";hide.onclick=()=>Q({hideReport:z.name});d.append(hide,no);qb.append(d)}if(!qb.hasChildNodes())qb.textContent="Nič na kontrolu 👍"};
$("q").onclick=()=>Q();
$("spb").onclick=async()=>{o.textContent="…";const j=await A({specials:$("spx").value});const s=j.specials||{lv:{},fi:[]};o.textContent="Uložené: "+Object.keys(s.lv).length+" náterov, "+s.fi.length+" prvých letov"};
let wipeNonce="";
$("wipePreview").onclick=async()=>{
  wipeNonce="";$("wipeExecute").disabled=true;$("wipeInfo").textContent="Kontrolujem…";
  try{const r=await fetch("/api/admin",{method:"POST",headers:H(),body:JSON.stringify({resetAction:"prepare",key:$("k").value})}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||r.status);
    wipeNonce=j.nonce;$("wipeInfo").textContent="Pripravené na nezvratné zmazanie: "+j.users+" účtov, "+j.cards+" serverových kartičiek. Potvrdenie platí päť minút."; $("wipeExecute").disabled=false;
  }catch(e){$("wipeInfo").textContent="Chyba: "+e.message}
};
$("wipeExecute").onclick=async()=>{
  if(!wipeNonce)return;
  const text=prompt("NAPÍŠ PRESNE: VYMAZAT VSETKY DATA");
  if(text!=="VYMAZAT VSETKY DATA")return;
  if(!confirm("Naozaj navždy odstrániť údaje VŠETKÝCH hráčov?"))return;
  $("wipeExecute").disabled=true;
  try{const r=await fetch("/api/admin",{method:"POST",headers:H(),body:JSON.stringify({resetAction:"execute",nonce:wipeNonce,confirm:text,key:$("k").value})}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||r.status);
    $("wipeInfo").textContent="✅ Reset vykonaný. Nová sezóna: "+j.epoch+". Hráči sa po obnovení appky začnú od nuly.";
  }catch(e){$("wipeInfo").textContent="Reset zlyhal: "+e.message}finally{wipeNonce=""}
};
$("ov").onclick=async()=>{o.textContent="…";const j=await A({nick:$("nk").value});o.textContent=(j.overenie||[]).map(x=>"Overených typov: "+x.karticky+"\\n"+x.mavnutia.map(m=>new Date(m.t).toLocaleString("sk-SK")+" · "+(m.type||"?")+" · "+(m.el==null?"?":Math.round(m.el)+"°")+" · "+(m.ok?"✓ overené":"✗ "+m.why)).join("\\n")).join("\\n\\n")||"Hráč sa nenašiel."};</script></body></html>`;
  return new Response(html, {headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Frame-Options": "DENY", "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"}});
}
// jednoduchý limit v pamäti inštancie (prvá línia obrany pred zahltením)
const ISO = new Map();
function isoRate(k, perMin) {
  k = k.replace(/[0-9a-f:]{3,}$/i, ip => ip.includes(":") ? ip.split(":").slice(0, 4).join(":") : ip);
  const w = Math.floor(Date.now() / 60e3), r = ISO.get(k);
  if (ISO.size > 20000) { let i = 0; for (const key of ISO.keys()) { ISO.delete(key); if (++i > 5000) break; } }
  if (!r || r.w !== w) { ISO.delete(k); ISO.set(k, {w, n: 1}); return true; } return ++r.n <= perMin;
}
/* 🔗 pekný náhľad odkazu (WhatsApp, Messenger, Instagram) + presmerovanie do appky */
const APP_URL = "https://slovakiana.github.io/cotoleti-app/";
const OGI = "https://cotoleti-app.radovan-kudela.workers.dev/og/";
const he = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
function b64json(s) { try { const b = atob(String(s).replace(/-/g, "+").replace(/_/g, "/")); return JSON.parse(decodeURIComponent(Array.from(b, c => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""))); } catch (e) { return null; } }
async function sharePage(url, env, ctx) {
  const [, , kind, raw = ""] = url.pathname.split("/"), data = raw.slice(0, 1500);
  const nm = v => cleanName(v, 20) || "Kamarát";
  let title = "Čo to letí? · Kartičky zo skutočných preletov", desc = "Zamávaj skutočnému lietadlu. Získaj jeho kartičku.", img = "c/b738-v79", hash = "";
  let cardPreview = false;
  if (kind === "v" && /^[\w-]+$/.test(data)) { const j = b64json(data) || {}; hash = "vyzva=" + data; img = "vyzva";
    title = `⚔️ ${nm(j.n)} ťa vyzýva!`; desc = `Má ${Number(j.t) | 0} kartičiek lietadiel a ${Number(j.p) | 0} bodov. Prekonáš to?`; }
  else if (kind === "k" && /^[\w-]+$/.test(data)) { const j = b64json(data) || {}; hash = "kd=" + data; img = "duel";
    title = `🃏 ${nm(j.n)} ťa vyzýva na súboj kartičiek`; desc = "3 kolá, 3 lietadlá. Ktoré je rýchlejšie, väčšie, ďalej doletí? Trúfneš si?"; }
  else if (kind === "t" && /^[A-Z0-9]{6}$/.test(data)) { hash = "tim=" + data; img = "team"; let n = "";
    try { if (env.SKY) n = (await (await env.SKY.get(env.SKY.idFromName("slovensko")).fetch("https://do/api/tname?c=" + data)).json()).name; } catch (e) {}
    title = `👥 Pridaj sa do tímu${n ? " „" + n + "“" : ""}`; desc = "Mávame lietadlám a bojujeme o 1. miesto na Slovensku ✈️"; }
  else if (kind === "l" && /^[A-Z0-9]{2,8}$/i.test(data)) { const n = url.searchParams.get("n"); hash = "let=" + data.toUpperCase() + (n ? "&n=" + encodeURIComponent(nm(n)) : ""); img = "let";
    title = `✈️ ${n ? nm(n) + " je na ceste" : "Let " + data.toUpperCase()} – zamávaj, keď poletí nad tebou`; desc = "Upozorníme ťa, keď bude nad tebou. Vyjdi von a zamávaj 👋"; }
  else if (kind === "santa") { hash = "santa"; img = "santa"; const m0 = cleanName(url.searchParams.get("m"), 24) || "", m = TOWNS.some(x => x[0] === m0) ? m0 : ""; let t = String(url.searchParams.get("cas") || url.searchParams.get("t") || "").replace(/[^0-9:]/g, "").slice(0, 5); if (!/^(1[5-9]|2[0-2]):[0-5][0-9]$/.test(t)) t = "";
    title = m && t ? `🎅 ${m}: Santa preletí 24. 12. o ${t}` : "🎅 Santa nad Slovenskom"; desc = m && t ? "A potom každých 12 minút. Nastavte si budík a mávajte spolu." : "24. 12. od 15:00 preletí nad každým z nás. Zamávaj mu!"; }
  else if (kind === "p" && /^[0-9a-f]{6}$/.test(data)) { hash = "p=" + data; const q = k => { const v = cleanName(url.searchParams.get(k), 24) || ""; return k === "m" ? (TOWNS.some(t => t[0] === v) ? v : "") : /^[\p{L} .'-]{2,24}$/u.test(v) ? v : ""; }; const c = (url.searchParams.get("c") || "").replace(/[^A-Z0-9]/gi, "").slice(0, 8), dd = q("d"), m = q("m");
    title = `✈️ ${m ? m + ": práve letí" : "Práve letí"} ${c || "lietadlo"}${dd ? " → " + dd : ""}`; desc = "A čo letí nad tebou? Pozri hore."; }
  else if (kind === "c" && /^[A-Z0-9]{2,5}$/.test(data)) {
    const pilot = {B738: "Boeing 737-800", AT76: "ATR 72-600", A388: "Airbus A380", A320: "Airbus A320", B38M: "Boeing 737 MAX 8", E190: "Embraer E190"};
    const name = pilot[data] || TYPES_SRV[data] || data;
    img = pilot[data] ? "c/" + data.toLowerCase() + "-v79" : "c/c-" + tierOf(data);
    hash = "karta=" + data;
    title = name + " · Čo to letí?";
    cardPreview = true;
  }
  else if (kind === "g" && /^[A-Za-z0-9]{6,8}$/.test(data)) { hash = "dar=" + data; img = "gift"; const ty = String(url.searchParams.get("ty") || "").replace(/[^A-Z0-9]/g, "").slice(0, 5);
    title = `🎁 ${nm(url.searchParams.get("n"))} ti posiela kartičku${ty ? " " + (TYPES_SRV[ty] || ty) : ""}`; desc = "Otvor ju v appke Čo to letí? – a keď lietadlu sám zamávaš, bude celá tvoja."; }
  else if (kind === "rok") { hash = "rok"; img = "m/rok"; title = `🇸🇰 Slovensko ${new Date().getUTCMonth() < 1 ? new Date().getUTCFullYear() - 1 : new Date().getUTCFullYear()} na oblohe`; desc = "Koľkokrát sme zamávali, ktoré lietadlo bolo najobľúbenejšie a ktorý kraj vyhral? Pozri súhrn roka."; }
  // obrázok s mestom pre veľké mestá (pripravené v og/m/)
  { const m = cleanName(url.searchParams.get("m"), 24) || ""; if ((kind === "santa" || kind === "p") && BIG_TOWNS.includes(m)) img = "m/" + (kind === "santa" ? "santa-" : "let-") + m.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]+/g, "-"); }
  const r = /^[A-Za-z0-9]{16}$/.test(url.searchParams.get("r") || "") ? url.searchParams.get("r") : "";
  const to = APP_URL + (r ? "?r=" + r : "") + (hash ? "#" + hash : "");
  const html = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${he(title)}</title>
<meta property="og:title" content="${he(title)}"><meta property="og:description" content="${he(desc)}"><meta property="og:image" content="${OGI + img}.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${he(cardPreview ? url.origin + url.pathname : url.href)}"><meta property="og:type" content="website"><meta property="og:site_name" content="Čo to letí?"><meta name="twitter:card" content="summary_large_image">
${cardPreview ? "" : `<meta http-equiv="refresh" content="0;url=${he(to)}">`}<style>body{background:#0d1430;color:#fff;font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0}main{max-width:540px;padding:24px;text-align:center}img{display:block;width:100%;height:auto;border-radius:16px}h1{font-size:clamp(1.4rem,5vw,2rem)}a{display:inline-flex;align-items:center;min-height:44px;color:#6dffc7}</style></head>
<body><main>${cardPreview ? `<h1>${he(title)}</h1><img width="1200" height="630" src="${OGI + img}.jpg" alt=""><p>${he(desc)}</p>` : ""}<a href="${he(to)}">${cardPreview ? "Pozrieť kartičku v Atlase" : "Otvoriť Čo to letí?"}</a></main></body></html>`;
  return new Response(html, {headers: {"Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https:"}});
}

export default {
  async fetch(req, env, ctx) {
    if (req.method === "OPTIONS") return new Response(null, {headers: CORS});
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      if (!env.SKY) return json({error: "no sky"}, 503);
      if (req.method !== "GET" && req.method !== "POST") return json({error: "method"}, 405, {Allow: "GET, POST, OPTIONS"});
      const ip = req.headers.get("cf-connecting-ip") || "";
      if (!isoRate("api:" + ip, 3000) || (url.pathname === "/api/xfer" && !isoRate("xfer:" + ip, 20)))
        return json({error: "rate"}, 429, {"Retry-After": "30"});
      const h = new Headers();
      for (const [k, v] of req.headers) if (!k.toLowerCase().startsWith("x-cc-")) h.set(k, v);
      h.set("x-cc-ip", req.headers.get("cf-connecting-ip") || "");
      h.set("x-cc-country", (req.cf && req.cf.country) || "");
      h.set("x-cc-asn", String((req.cf && req.cf.asn) || ""));
      if (req.cf && req.cf.latitude) { h.set("x-cc-lat", String(req.cf.latitude)); h.set("x-cc-lon", String(req.cf.longitude)); }
      let payload;
      if (req.method === "POST") {
        const large = ["/api/xfer", "/api/account/finish", "/api/account/backup"].includes(url.pathname);
        try { payload = await boundedBody(req, large ? TRANSFER_BODY_BYTES : API_BODY_BYTES); }
        catch (e) { return json({error: "bad"}, 400); }
        if (payload === null) return json({error: "big"}, 413);
        if (!objectJSON(payload)) return json({error: "bad"}, 400);
        h.delete("content-length");
      }
      const fwd = new Request(req.url, {method: req.method, headers: h, body: payload});
      // ⚡ verejné odpovede bez osobných údajov z okrajovej cache Cloudflare (menej práce pre Durable Object)
      const EDGE = {"/api/planes": 5, "/api/radar-flight": 8, "/api/weekly": 300, "/api/heat": 600, "/api/specials": 600, "/api/year": 600, "/api/cardstat": 300, "/api/tname": 600};
      const ttl = typeof caches !== "undefined" && caches.default && ctx && req.method === "GET" && !url.searchParams.has("id") ? EDGE[url.pathname] : 0;
      let ck = null;
      if (ttl) {
        const cu = new URL(url.origin + url.pathname); const ks = [...url.searchParams.keys()].sort();
        for (const k of ks) { let v = url.searchParams.get(k); if (k === "lat" || k === "lon") v = (Math.round(Number(v) * 50) / 50).toFixed(2); cu.searchParams.set(k, v); }
        ck = new Request(cu.toString()); const hit = await caches.default.match(ck).catch(() => null); if (hit) return hit;
      }
      try {
        const r = await env.SKY.get(env.SKY.idFromName("slovensko")).fetch(fwd);
        if (ck && r.status === 200) { const out = new Response(r.body, r); out.headers.set("Cache-Control", "public, max-age=" + ttl); ctx.waitUntil(caches.default.put(ck, out.clone()).catch(() => {})); return out; }
        return r;
      }
      catch (e) { return json({error: "busy"}, 503, {"Retry-After": "20"}); }
    }
    if (url.pathname === "/admin") return adminPage();
    if (url.pathname.startsWith("/s/")) {
      // náhľady pre WhatsApp/Facebook/Telegram chodia z mála IP – tie nebrzdíme (pri virálnej vlne by odkazy ostali bez obrázka)
      const bot = /facebookexternalhit|facebot|WhatsApp|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|Applebot|SkypeUriPreview|viber/i.test(req.headers.get("user-agent") || "");
      if (!bot && !isoRate("s:" + (req.headers.get("cf-connecting-ip") || ""), 60)) return new Response("pomalšie", {status: 429}); return sharePage(url, env, ctx); }
    const raw = url.searchParams.get("url");
    if (!raw) {
      if (env.ASSETS) {
        const r = await env.ASSETS.fetch(req), h = new Headers(r.headers);
        h.set("X-Content-Type-Options", "nosniff");
        h.set("Referrer-Policy", "strict-origin-when-cross-origin");
        h.set("X-Frame-Options", "DENY");
        h.set("Permissions-Policy", "geolocation=(self), camera=(self), microphone=(self)");
        h.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: data:; connect-src 'self' https:; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
        return new Response(r.body, {status: r.status, headers: h});
      }
      return new Response("Čo to letí? server beží ✈️", {headers: CORS});
    }
    const origin = req.headers.get("origin");
    if (!isoRate("px:" + (req.headers.get("cf-connecting-ip") || ""), 300)) return new Response("pomalšie", {status: 429, headers: {...CORS, "Retry-After": "30"}});
    if (origin && !APP_ORIGINS.includes(origin)) return new Response("nepovolené", {status: 403, headers: CORS});
    let t;
    try { t = new URL(raw); } catch (e) { return new Response("zlá adresa", {status: 400, headers: CORS}); }
    const PATHS = {"api.adsbdb.com": /^\/v0\//, "celestrak.org": /^\/NORAD\/elements\/gp\.php$/, "api.open-meteo.com": /^\/v1\/forecast$/};
    if (t.protocol === "https:" && t.hostname === "api.adsb.lol" && !t.search && env.SKY) {
      const point = /^\/v2\/point\/(-?[0-9.]+)\/(-?[0-9.]+)\/([0-9]+)$/.exec(t.pathname);
      const call = /^\/v2\/callsign\/([A-Z]{3}[0-9]{1,4}[A-Z]?)$/.exec(t.pathname);
      if (point || call) {
        const query = new URLSearchParams(point ? {lat: point[1], lon: point[2], r: point[3]} : {cs: call[1]});
        const path = point ? "/api/planes" : "/api/radar-flight";
        return env.SKY.get(env.SKY.idFromName("slovensko")).fetch(new Request("https://do" + path + "?" + query,
          {headers: {"x-cc-ip": req.headers.get("cf-connecting-ip") || ""}}));
      }
    }
    if (t.protocol !== "https:" || !ALLOW.includes(t.hostname) || !PATHS[t.hostname].test(t.pathname)) return new Response("nepovolené", {status: 403, headers: CORS});
    try {
      const r = await fetch(t, {redirect: "manual", signal: AbortSignal.timeout(6000), headers: {"User-Agent": "cotoleti-app (github.com/Slovakiana/cotoleti-app)"}, cf: {cacheTtl: t.hostname === "celestrak.org" ? 3600 : t.hostname === "api.adsbdb.com" || t.hostname === "www.airport-data.com" ? 86400 : t.hostname === "api.open-meteo.com" ? 900 : 8, cacheEverything: true}});
      const h = new Headers(CORS);
      h.set("Content-Type", t.hostname === "celestrak.org" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8");
      h.set("X-Content-Type-Options", "nosniff");
      h.set("Content-Security-Policy", "sandbox; default-src 'none'");
      h.set("Cache-Control", "no-store");
      return new Response(r.body, {status: r.status, headers: h});
    } catch (e) {
      return json({error: "upstream"}, 502);
    }
  },
  async scheduled(event, env, ctx) {
    if (env.SKY) ctx.waitUntil((async () => {
      const response = await env.SKY.get(env.SKY.idFromName("slovensko")).fetch("https://do/cron");
      if (!response.ok) throw Error("cron HTTP " + response.status);
    })());
  }
};
