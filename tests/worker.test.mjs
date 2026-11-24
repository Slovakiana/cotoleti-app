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

await t("hello vráti token a verejné id", () => { assert.ok(ha.tok); assert.equal(ha.pid.length, 16); });
await t("mávnutie bez tokenu odmietnuté", async () => assert.equal((await call("/api/wave", {id: A, hex: "aabbcc", lat: 48.15, lon: 17.11})).s, 401));
await t("falošný token odmietnutý", async () => assert.equal((await call("/api/wave", {id: A, tok: "x", hex: "aabbcc", lat: 48.15, lon: 17.11})).s, 401));
await t("mávnutie vzdialenému lietadlu odmietnuté", async () => {
  plane.lat = 50.5; const r = await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11}); plane.lat = 48.2;
  assert.equal(r.j.error, "far");
});
const fixed = Date.parse(new Date().toISOString().slice(0, 10) + "T10:00:00Z"), realNow = Date.now;
Date.now = () => fixed; await sky.cron(); db.exec(`UPDATE ids SET t=${fixed - 60e3}`);
await t("čerstvý účet nevyhrá zlaté lietadlo", async () => { const r = await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11, gps: true}); assert.notEqual(r.j.golden, "entered", JSON.stringify(r.j)); });
Date.now = () => fixed + 20 * 60e3;
await t("zo zahraničia nevyhrá", async () => assert.equal(((await call("/api/wave", {id: B, tok: hb.tok, hex: "aabbcc", lat: 48.15, lon: 17.11, gps: true}, "5.6.7.8", "US")).j.golden) !== "entered", true));
db.exec(`UPDATE ids SET t=0 WHERE id='${C}'`);
db.exec(`INSERT OR IGNORE INTO seen(day, id) VALUES('2000-01-01', '${C}')`);
await call(`/api/sky?id=${C}&tok=${hc.tok}&lat=48.15&lon=17.11&hexes=aabbcc`, null, "9.9.9.9");
await t("poctivý hráč sa dostane do žrebu", async () => assert.equal((await call("/api/wave", {id: C, tok: hc.tok, hex: "aabbcc", lat: 48.15, lon: 17.11, gps: true, nick: "Maťo"}, "9.9.9.9")).j.golden, "entered"));
await t("zlatá posádka sa uzavrie po 40 minútach (bez žrebu)", async () => {
  Date.now = () => fixed + 35 * 60e3; await sky.cron(); assert.equal(db.prepare("SELECT state FROM golden").get().state, 0);
  Date.now = () => fixed + 65 * 60e3; await sky.cron();
  const g = db.prepare("SELECT state, crew FROM golden").get(); assert.equal(g.state, 1); assert.equal(g.crew, 1);
});
Date.now = realNow;
await t("kraj počíta server", () => assert.deepEqual(db.prepare("SELECT k FROM kraje").all().map(r => r.k), ["BA"]));
await t("obloha: jedna požiadavka na prehľad pre viac mávnutí; výpadok sietí = zopakovať", async () => {
  const of = globalThis.fetch; let n = 0;
  globalThis.fetch = async u => { n++; return of(u); };
  sky._snap = null; await sky.verifyPlane("aabbcc", 48.15, 17.11); const n1 = n; const v2 = await sky.verifyPlane("aabbcc", 48.15, 17.11);
  assert.ok(n1 <= 3); assert.equal(n, n1); assert.equal(v2.found, true);
  globalThis.fetch = async () => { throw new Error("down"); };
  const r = await call("/api/wave", {id: C, tok: hc.tok, hex: "dd0001", lat: 48.15, lon: 17.11});
  globalThis.fetch = of;
  assert.equal(r.s, 503); assert.equal(r.j.error, "busy");
  globalThis.fetch = async () => { throw new Error("down"); };
  const r2 = await call("/api/wave", {id: C, tok: hc.tok, hex: "dd0001", lat: 48.15, lon: 17.11, try: 3});
  globalThis.fetch = of;
  assert.equal(r2.s, 200); // po 3 pokusoch sa mávnutie zapíše aj bez overenia
});
await t("nízko zamávané lietadlo sa overí, keď je neskôr vysoko", async () => {
  const id = "v2lowhighlowhighlowhighlo01", tok = (await call("/api/hello", {id}, "4.4.4.4")).j.tok;
  plane.hex = "ee0001"; plane.lat = 48.9;
  const r1 = await call("/api/wave", {id, tok, hex: "ee0001", lat: 48.15, lon: 17.11}, "4.4.4.4");
  assert.ok(!r1.j.ver, JSON.stringify(r1.j));
  plane.lat = 48.2;
  const r2 = await call("/api/wave", {id, tok, hex: "ee0001", lat: 48.15, lon: 17.11}, "4.4.4.4");
  plane.hex = "aabbcc";
  assert.equal(r2.j.ver, 1, JSON.stringify(r2.j));
});
await t("odložené mávnutie sa overí podľa polohy lietadla v čase mávnutia", async () => {
  const id = "v2latelatelatelatelatelate01", tok = (await call("/api/hello", {id}, "4.4.4.5")).j.tok;
  plane.hex = "ee0002"; plane.lat = 49.2; // teraz už ďaleko a nízko
  const r = await call("/api/wave", {id, tok, hex: "ee0002", lat: 48.15, lon: 17.11, t: Date.now() - 8 * 60e3, pl: {la: 48.16, lo: 17.12, alt: 36000}}, "4.4.4.5");
  const r2 = await call("/api/wave", {id: "v2latelatelatelatelatelate02", tok: (await call("/api/hello", {id: "v2latelatelatelatelatelate02"}, "4.4.4.6")).j.tok, hex: "ee0002", lat: 48.15, lon: 17.11}, "4.4.4.6");
  plane.hex = "aabbcc"; plane.lat = 48.2;
  assert.equal(r.j.ver, 1, JSON.stringify(r.j)); assert.ok(!r2.j.ver, JSON.stringify(r2.j));
});
await t("liga: nový účet sa ráta len pri lietadle, ktoré appka ukazovala", async () => {
  const mk = async (id, ip) => (await call("/api/hello", {id}, ip)).j.tok;
  const i1 = "v2leagueleagueleagueleague01", t1 = await mk(i1, "3.3.3.1");
  await call("/api/wave", {id: i1, tok: t1, hex: "aabbcc", lat: 48.15, lon: 17.11}, "3.3.3.1");
  const i2 = "v2leagueleagueleagueleague02", t2 = await mk(i2, "3.3.3.2");
  await call("/api/sky", {id: i2, tok: t2, lat: 48.15, lon: 17.11, hexes: "aabbcc"}, "3.3.3.2");
  await call("/api/wave", {id: i2, tok: t2, hex: "aabbcc", lat: 48.15, lon: 17.11}, "3.3.3.2");
  const lg = id => (db.prepare("SELECT lg FROM wavelog WHERE id=?").get(id) || {}).lg;
  assert.equal(lg(i1), 0); assert.equal(lg(i2), 1);
});
await t("pripomienka série s číslom hodinu pred obvyklým časom", async () => {
  const id = "v2streakstreakstreakstreak01", old = Date.now;
  const base = Date.UTC(2026, 10, 25, 17, 30); // 18:30 v Bratislave
  db.prepare("INSERT OR REPLACE INTO subs(id, sub, moment, t) VALUES(?, '{}', 0, ?)").run(id, base);
  db.prepare("INSERT OR REPLACE INTO streaks(id, n, day) VALUES(?, 7, '2026-11-24')").run(id);
  db.prepare("INSERT INTO wavelog(day, hex, id, t, k, pid, lg) VALUES('2026-11-24', 'abc001', ?, ?, 'BA', 'p1', 1)").run(id, base - 86400e3 + 50 * 60e3);
  Date.now = () => base; try { await sky.cron(); } finally { Date.now = old; }
  const m = db.prepare("SELECT title FROM msgs WHERE id=?").get(id);
  assert.ok(m && /7 dní v rade/.test(m.title), JSON.stringify(m));
});
await t("náhľady: kartička, darček, lietadlo s hashom; crawler bez limitu", async () => {
  const get = async (u, ua = "x") => { const r = new Request("https://x" + u, {headers: {"cf-connecting-ip": "8.8.8.8", "user-agent": ua}}); return (await W.fetch(r, env)).text(); };
  const c = await get("/s/c/A388?s=1&n=4&nk=Janka");
  assert.match(c, /Lesklá kartička/); assert.match(c, /č\. 4 na Slovensku/); assert.match(c, /og\/c\/c-shiny\.jpg/);
  assert.match(await get("/s/g/ABC123?n=Janka&ty=A320"), /#dar=ABC123/);
  assert.match(await get("/s/p/abc123?c=RYR1"), /#p=abc123/);
  let last = ""; for (let i = 0; i < 70; i++) last = await get("/s/x/", "WhatsApp/2.23");
  assert.match(last, /og:image/);
});
await t("Atlasy: rovnaké meno sa v rebríčku zobrazí len raz", async () => {
  for (const [i, sc] of [[1, 300], [2, 200]]) { const id = "v2dupedupedupedupedupedupe0" + i; db.prepare("INSERT OR IGNORE INTO ids(id, t, iph, ep) VALUES(?, 0, '', 0)").run(id);
    db.prepare("INSERT OR REPLACE INTO nicks(id, nick, lc) VALUES(?, 'Dvojník', 'dvojník')").run(id);
    db.prepare("INSERT INTO typeseq(type, id, seq, w, k, town, t) VALUES(?, ?, 9, ?, 'NR', '', 0)").run("ZZ" + i, id, sc); }
  sky.atlC = {}; const r = await call("/api/atlasy?k=NR", null);
  assert.equal(r.j.top.filter(x => x.nick === "Dvojník").length, 1, JSON.stringify(r.j.top));
});
await t("zdieľaná sieť: 60 nových hráčov za deň prejde, náraz za minútu sa pribrzdí", async () => {
  const codes = []; for (let i = 0; i < 22; i++) codes.push((await call("/api/hello", {id: "v2zzzzzzzzzzzzzzzzzzz" + String(i).padStart(2, "0")}, "7.7.7.7")).s);
  assert.deepEqual(codes.slice(0, 20).filter(c => c !== 200), [], codes.join(","));
  assert.deepEqual(codes.slice(-2), [429, 429], codes.join(","));
  const old = Date.now; let off = 0; Date.now = () => old() + (off += 61e3);
  const more = []; for (let i = 0; i < 40; i++) more.push((await call("/api/hello", {id: "v2wwwwwwwwwwwwwwwwwww" + String(i).padStart(2, "0")}, "7.7.7.7")).s);
  Date.now = old;
  assert.deepEqual(more.filter(c => c !== 200), [], more.join(","));
});
await t("platný token bez záznamu účtu sa sám opraví (mávnutie prejde)", async () => {
  const id = "v2healhealhealhealhealheal01";
  const tok = (await call("/api/hello", {id}, "6.6.6.6")).j.tok;
  db.prepare("DELETE FROM ids WHERE id=?").run(id);
  const r = await call("/api/mywhy", {id, tok}, "6.6.6.6");
  assert.equal(r.s, 200);
});
await t("starý používateľ s platným tokenom sa zaregistruje aj nad limitom", async () => {
  const id = "v2legacylegacylegacylegacy01";
  const tok = await (await call("/api/hello", {id}, "8.8.8.8")).j.tok;
  db.prepare("DELETE FROM ids WHERE id=?").run(id);
  const r = await call("/api/hello", {id, tok}, "7.7.7.7");
  assert.equal(r.s, 200); assert.equal(r.j.tok, tok);
});
await t("kamarát vidí len prezývku", async () => {
  assert.equal((await call("/api/friend", {id: A, tok: ha.tok, pid: hc.pid})).s, 400); // bez kľúča z odkazu nie
  await call("/api/friend", {id: A, tok: ha.tok, pid: hc.pid, fk: hc.fk});
  const s = (await call(`/api/sky?id=${A}&tok=${ha.tok}&lat=48.15&lon=17.11&hexes=aabbcc`)).j;
  assert.deepEqual(s.friends.aabbcc, [{n: "Maťo"}]); assert.ok(Array.isArray(s.krajeWeek));
});
await t("spoločné mávnutie s kamarátom", async () => {
  db.exec(`DELETE FROM wavelog WHERE id='${A}'`); db.exec(`UPDATE wavelog SET t=${Date.now()} WHERE id='${C}'`);
  const r = await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11});
  assert.deepEqual(r.j.together, {n: "Maťo"});
});
await t("starosta oblohy", async () => {
  const s = (await call(`/api/sky?id=${C}&tok=${hc.tok}&lat=48.15&lon=17.11`, null, "9.9.9.9")).j;
  assert.ok(s.mayor && s.mayor.town); assert.ok(s.mayor.n >= 1); assert.ok(s.mayor.mine >= 1);
  db.exec(`UPDATE mayorm SET n = 50 WHERE id='${C}'`);
  const s2 = (await call(`/api/sky?id=${C}&tok=${hc.tok}&lat=48.15&lon=17.11&x=1`, null, "9.9.9.9")).j;
  assert.equal(s2.mayor.mine, 50);
});
await t("upozornenia len na povolené servery", async () => {
  assert.equal((await call("/api/sub", {id: A, tok: ha.tok, sub: {endpoint: "https://evil.com/x"}})).s, 400);
  assert.equal((await call("/api/sub", {id: A, tok: ha.tok, sub: {endpoint: "https://fcm.googleapis.com/fcm/send/abc"}, lat: 48.1234, lon: 17.5678})).s, 200);
});
await t("pripomienka preletu ISS", async () => {
  assert.equal((await call("/api/remind", {id: B, tok: hb.tok, at: Date.now() + 3600e3}, "5.6.7.8")).s, 400); // bez upozornení nie
  assert.equal((await call("/api/remind", {id: A, tok: ha.tok, at: Date.now() + 99 * 3600e3})).s, 400);
  const r = await call("/api/remind", {id: A, tok: ha.tok, at: Date.now() + 3600e3, kind: "iss", dir: "juhozápadnej<script>", max: 55});
  assert.equal(r.s, 200);
  const row = db.prepare("SELECT body FROM reminders WHERE id=?").get(A); assert.ok(!row.body.includes("<"));
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
  const codes = []; for (let i = 0; i < 42; i++) codes.push((await call("/api/hello", {id: "v2yyyyyyyyyyyyyyyyyyy" + String(i).padStart(2, "0")}, "2001:db8:1:2:" + (i % 9) + "::1")).s);
  assert.deepEqual(codes.slice(-2), [429, 429], codes.join(","));
});
await t("lievik a chyby sa počítajú anonymne", async () => {
  await call("/api/ev", {step: "open"}); await call("/api/ev", {step: "nieco"}); await call("/api/err", {m: "TypeError x at https://a.b/c.js"});
  assert.equal(db.prepare("SELECT n FROM funnel WHERE step='open'").get().n, 1);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM funnel").get().c, 1);
  assert.ok(!db.prepare("SELECT msg FROM errs").get().msg.includes("https"));
});
await t("vážne nahlásenie skryje meno hneď, admin ho vie vrátiť", async () => {
  await call("/api/team", {id: C, tok: hc.tok, action: "create", name: "Janka Novakova"}, "9.9.9.9");
  await call("/api/report", {id: A, tok: ha.tok, name: "Janka Novakova", why: "osobne"}, "1.1.1.1");
  assert.ok(db.prepare("SELECT 1 FROM banned WHERE name='janka novakova'").get());
  const r = await W.fetch(new Request("https://x/api/admin", {method: "POST", headers: {"x-admin-key": "tajne"}, body: JSON.stringify({unban: "Janka Novakova"})}), env);
  assert.equal(r.status, 200); assert.ok(!db.prepare("SELECT 1 FROM banned WHERE name='janka novakova'").get());
});
await t("ligy: na hráča a menšie mestá", async () => {
  const s = (await call(`/api/sky?id=${C}&tok=${hc.tok}&hexes=aabbcc`, null, "9.9.9.9")).j;
  assert.ok(Array.isArray(s.krajePP)); assert.ok(Array.isArray(s.townsSmall));
});
await t("zdravie servera", async () => assert.equal((await call("/api/health")).s, 200));
await t("štatistiky len s kľúčom", async () => {
  assert.equal((await call("/api/stats")).s, 401);
  assert.equal((await call("/api/stats?key=tajne")).s, 401); // kľúč v adrese už neplatí
  const p=await call("/api/stats",{key:"tajne"});
  assert.equal(p.s,200,"kľúč v POST tele autorizuje štatistiky aj keď proxy stratí hlavičku");
  const missing=await call("/api/stats");
  assert.equal(missing.j.configured,true);assert.equal(missing.j.keyReceived,false);
  const wrong=await call("/api/stats",{key:"zlý"});
  assert.equal(wrong.s,401);assert.equal(wrong.j.configured,true);assert.equal(wrong.j.keyReceived,true);

  const r = await W.fetch(new Request("https://x/api/stats", {headers: {"x-admin-key": "tajne"}}), env); const j = await r.json();
  assert.equal(r.status, 200); assert.ok(j.days.length === 14);
  assert.equal((await call("/api/export")).s, 404); // export celej databázy je zrušený
});
await t("moje údaje sa dajú stiahnuť", async () => { const r = await call("/api/mydata", {id: C, tok: hc.tok}); assert.equal(r.s, 200); assert.ok(Array.isArray(r.j.wavelog)); assert.ok(!JSON.stringify(r.j).includes(C)); });
await t("cudzí účet nie je možné vymazať bez jeho platného tokenu", async () => {
  assert.equal((await call("/api/forget", {id: A})).s, 401);
  assert.equal((await call("/api/forget", {id: A, tok: hb.tok})).s, 401);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM ids WHERE id=?").get(A).c, 1);
});
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
await (async () => {
  const r = await W.fetch(new Request("https://x.dev/s/santa?m=Banská%20Bystrica&cas=15:24"), {}, null);
  const h = await r.text(); assert.ok(h.includes("og/m/santa-banska-bystrica.jpg"), "OG s mestom");
  const r2 = await W.fetch(new Request("https://x.dev/s/rok"), {}, null); assert.ok((await r2.text()).includes("og/m/rok.jpg"));
  console.log("✓ OG obrázky s mestom");
})();
await (async () => {
  const y = (await call("/api/year")).j; assert.ok(y.waves >= 1 && Array.isArray(y.kraje) && y.planes.length >= 1, JSON.stringify(y));
  console.log("✓ súhrn roka");
})();
await (async () => {
  const f = (await call("/api/friends", {id: C, tok: hc.tok}, "9.9.9.9")).j;
  assert.ok(f.meC >= 1, JSON.stringify(f));
  console.log("✓ úlovky overené serverom");
})();
await (async () => {
  const ts = db.prepare("SELECT * FROM typeseq").all();
  assert.ok(ts.length >= 1 && ts[0].type === "A21N", JSON.stringify(ts));
  const cs = (await call("/api/cardstat?type=A21N")).j; assert.ok(cs.own >= 1, JSON.stringify(cs));
  const at = (await call("/api/atlasy", {id: C, tok: hc.tok}, "9.9.9.9")).j; assert.ok(at.top.length >= 1 && at.me && at.me.sc >= 3, JSON.stringify(at));
  const c = db.prepare("SELECT type, ok, el FROM catches WHERE id=?").get(C); assert.equal(c.type, "A21N"); assert.ok(c.el > 8);
  console.log("✓ zbierka na serveri: poradie, objaviteľ, atlasy");
  // dar: nový účet nesmie, starý s duplikátom áno
  db.exec(`UPDATE ids SET t=0 WHERE id='${C}'`);
  assert.equal((await call("/api/gift", {id: C, tok: hc.tok, type: "B744"}, "9.9.9.9")).j.error, "tier");
  db.exec(`INSERT INTO catches(id, hex, t, type, ok) VALUES('${C}', 'ffeedd', 1, 'A21N', 1)`);
  const g = (await call("/api/gift", {id: C, tok: hc.tok, type: "A21N"}, "9.9.9.9")).j; assert.ok(g.code, JSON.stringify(g));
  assert.equal((await call("/api/gift", {id: C, tok: hc.tok, type: "A388"}, "9.9.9.9")).j.error, "tier");
  const hd = (await call("/api/hello", {id: "v2dddddddddddddddddddddd4"}, "4.4.4.4")).j;
  const cl = (await call("/api/giftclaim", {id: "v2dddddddddddddddddddddd4", tok: hd.tok, code: g.code}, "4.4.4.4")).j; assert.equal(cl.type, "A21N");
  assert.equal((await call("/api/giftclaim", {id: "v2dddddddddddddddddddddd4", tok: hd.tok, code: g.code}, "4.4.4.4")).s, 410);
  console.log("✓ darovanie kópie");
})();
await (async () => {
  const mc = (await call("/api/mycards", {id: C, tok: hc.tok}, "9.9.9.9")).j; assert.ok(mc.cards.length >= 1 && mc.cards[0][0] === "A21N", JSON.stringify(mc));
  plane.hex = "abc123"; const r = (await call("/api/wave", {id: C, tok: hc.tok, hex: "abc123", lat: 48.15, lon: 17.11, gps: false}, "9.9.9.9")).j;
  assert.equal(r.ver, 0); assert.equal(r.why, "poloha bola vybraná ručne, nie z GPS", JSON.stringify(r));
  plane.hex = "abc124"; const r2 = (await call("/api/wave", {id: C, tok: hc.tok, hex: "abc124", lat: 48.15, lon: 17.11, gps: true}, "9.9.9.9")).j;
  assert.equal(r2.ver, 1, JSON.stringify(r2)); assert.equal(r2.why, "");
  console.log("✓ overenie: dôvod neoverenia aj úspešné overenie, zoznam overených kartičiek");
})();
await (async () => {
  // atlasy: rôzne kraje v cache nesmú spadnúť
  for (const k of ["BA", "KE", "BA"]) assert.equal((await call("/api/atlasy", {id: C, tok: hc.tok, k}, "9.9.9.9")).s, 200);
  // ručne vybrané mesto nezamkne deň a nesúťaží
  const E = "v2eeeeeeeeeeeeeeeeeeeeee5", he = (await call("/api/hello", {id: E}, "6.6.6.6")).j;
  await call("/api/wave", {id: E, tok: he.tok, hex: "abc124", lat: 48.15, lon: 17.11, gps: false}, "6.6.6.6");
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM idday WHERE id=?").get(E).c, 0);
  const w = (await call("/api/mywhy", {id: E, tok: he.tok}, "6.6.6.6")).j; assert.ok(w.rows.length && w.rows[0].why, JSON.stringify(w));
  console.log("✓ atlasy cache, ručné mesto, moje dôvody");
})();
await (async () => {
  // /api/planes: lietadlá zo spoločnej snímky okolo hráča, mimo SR → 404 (appka prejde na iný zdroj)
  const r = await call("/api/planes?lat=" + plane.lat + "&lon=" + plane.lon + "&r=40");
  assert.equal(r.s, 200, r.text); assert.ok(Array.isArray(r.j.ac) && r.j.ac.some(a => a.hex === plane.hex), r.text);
  assert.equal((await call("/api/planes?lat=40.4&lon=-3.7")).s, 404);
  console.log("✓ /api/planes zo snímky oblohy");
})();
await (async () => {
  // mapa mávania: štvorec sa ukáže až od 5 rôznych hráčov
  const m = new Date().toISOString().slice(0, 7);
  for (let i = 0; i < 4; i++) db.prepare("INSERT INTO heatp(m, cell, id) VALUES(?, ?, ?)").run(m, "48.40,17.60", "h" + i);
  for (let i = 0; i < 5; i++) db.prepare("INSERT INTO heatp(m, cell, id) VALUES(?, ?, ?)").run(m, "48.70,21.25", "k" + i);
  sky._heat = null; const r = (await call("/api/heat")).j;
  assert.deepEqual(r.cells.map(c => c.slice(0, 2).join(",")), ["48.7,21.25"], JSON.stringify(r));
  console.log("✓ mapa mávania: štvorec až od 5 hráčov");
})();
await (async () => {
  // /admin: skript stránky musí byť platný JavaScript (\n v šablóne ho raz celý rozbil)
  const r = await W.fetch(new Request("https://x/admin"), env); const html = await r.text();
  const js = html.split("<script>")[1].split("</script>")[0]; new Function(js);
  console.log("✓ /admin skript je platný");
})();
await (async () => {
  // nahlásené meno: hráč sa to dozvie a môže sa odvolať → admin to vidí na vrchu fronty
  const X = "v2xxxxxxxxxxxxxxxxxxxxxxx7", hx = (await call("/api/hello", {id: X}, "7.7.7.7")).j;
  db.prepare("INSERT OR REPLACE INTO nicks(id, nick, lc) VALUES(?, ?, ?)").run(X, "Zlemeno", "zlemeno");
  // nahlasovateľ: starý účet, 2 dni
  db.prepare("UPDATE ids SET t=? WHERE id=?").run(Date.now() - 5 * 86400e3, C);
  db.prepare("INSERT OR IGNORE INTO seen(day, id) VALUES('2026-01-01', ?), ('2026-01-02', ?)").run(C, C);
  await call("/api/report", {id: C, tok: hc.tok, name: "Zlemeno", why: "osobne"}, "9.9.9.9");
  const s1 = (await call("/api/sky", {id: X, tok: hx.tok}, "7.7.7.7")).j;
  assert.deepEqual(s1.myHidden, {name: "zlemeno", appeal: 0}, JSON.stringify(s1.myHidden));
  assert.equal((await call("/api/appeal", {id: X, tok: hx.tok}, "7.7.7.7")).j.ok, true);
  const a = (await call("/api/admin", {key: "tajne"}, "1.1.1.1")).j;
  assert.ok(a.naKontrolu[0].name === "zlemeno" && /ODVOLANIE/.test(a.naKontrolu[0].why), JSON.stringify(a.naKontrolu));
  console.log("✓ skryté meno: oznam hráčovi a odvolanie v /admin");
})();
await (async () => {
  // divízie po 30
  const r = (await call("/api/division", {id: C, tok: hc.tok}, "9.9.9.9")).j;
  assert.ok(r.div === null || (r.div >= 1 && r.rank >= 1 && r.rows.some(x => x.me)), JSON.stringify(r));
  console.log("✓ divízia");
})();
await (async () => {
  // špeciálne nátery a prvé lety z /admin
  await call("/api/admin", {key: "tajne", specials: "OM-ABC = Retro náter\n2026-12-15 wzz1234 = Prvý let do Dubaja\nzlý riadok"}, "1.1.1.1");
  const r = (await call("/api/specials")).j;
  assert.deepEqual(r, {lv: {"OM-ABC": "Retro náter"}, fi: [{d: "2026-12-15", call: "WZZ1234", txt: "Prvý let do Dubaja"}]}, JSON.stringify(r));
  console.log("✓ špeciálne nátery a prvé lety");
})();


const adminReset=async b=>{
  const r=await W.fetch(new Request("https://x/api/admin",{method:"POST",headers:{"x-admin-key":"tajne"},body:JSON.stringify({...b,key:"tajne"})}),env);
  return {s:r.status,j:await r.json()};
};
await t("globálny reset vyžaduje správcu, nonce a dvojité potvrdenie", async () => {
  assert.equal((await call("/api/admin",{resetAction:"prepare"})).s,401);
  assert.equal((await call("/api/admin",{resetAction:"execute",key:"nespravny"})).s,401);
  assert.equal(sky.admin(new URL("https://x"),new Request("https://x",{headers:{"x-admin-key":"tajne"}})),true,"owner key in direct Sky");
  const draft=await adminReset({resetAction:"prepare"});
  if(draft.s!==200)throw new Error("admin reset prepare: "+JSON.stringify(draft));
  assert.equal(draft.s,200);assert.ok(draft.j.nonce);
  assert.equal((await adminReset({resetAction:"execute",nonce:draft.j.nonce,confirm:"nie"})).s,400);
  assert.ok(db.prepare("SELECT COUNT(*) c FROM ids").get().c>0);
  // Pred resetom je token C platný. Po resete ho už nesmie akceptovať ani
  // samoopravná cesta authed(), ktorá kedysi obnovovala chýbajúce účty.
  assert.equal(await sky.authed(C,hc.tok),true);
  const done=await adminReset({resetAction:"execute",nonce:draft.j.nonce,confirm:"VYMAZAT VSETKY DATA"});
  assert.equal(done.j.ok,true);assert.equal(done.j.epoch,1);
  for(const table of ["ids","typeseq","wavelog","nicks","totals","tweek","refs","streaks","duelres"])
    assert.equal(db.prepare("SELECT COUNT(*) c FROM "+table).get().c,0,table);
  assert.equal((await call("/api/hello",{id:"v2testresetgeneration000001"})).s,409);
  assert.equal((await call("/api/hello",{id:"v2testresetgeneration000001",epoch:1})).s,200);
  const before=db.prepare("SELECT COUNT(*) AS c FROM ids").get().c;
  assert.equal(await sky.authed(C,hc.tok),false,"starý token musí byť po resete neplatný");
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM ids").get().c,before,"starý token nesmie znovu vytvoriť účet");
  assert.equal((await call("/api/wave",{id:C,tok:hc.tok,hex:"aabbcc",lat:48.15,lon:17.11})).s,401);
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM ids").get().c,before);
  const minted=(await call("/api/hello",{id:"v2anotherresetgeneration00001",epoch:1})).j;
  assert.ok(minted.tok);
  assert.equal(await sky.authed("v2anotherresetgeneration00001",minted.tok),true,"nový token musí fungovať");
  const second=await adminReset({resetAction:"prepare"});
  const again=await adminReset({resetAction:"execute",nonce:second.j.nonce,confirm:"VYMAZAT VSETKY DATA"});
  assert.equal(again.j.epoch,2);
  assert.equal(await sky.authed("v2anotherresetgeneration00001",minted.tok),false,"každý ďalší reset zneplatní tokeny predošlej generácie");
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM ids").get().c,0);
});
