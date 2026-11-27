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
  if (/^\s*(SELECT|WITH)\b/i.test(q)) { const rows = st.all(...p); return {toArray: () => rows}; }
  st.run(...p); return {toArray: () => []};
}};
const kv = new Map(); let alarm = null;
const storage = {sql, get: async k => kv.get(k), put: async (k, v) => kv.set(k, v), getAlarm: async () => alarm, setAlarm: async t => { alarm = t; }};
const sky = new mod.Sky({storage}, {ADMIN_KEY: "tajne"});
const env = {SKY: {idFromName: () => 1, get: () => ({fetch: r => sky.fetch(typeof r === "string" ? new Request(r) : r)})}};
const W = mod.default;

let plane = {hex: "aabbcc", flight: "WZZ123 ", t: "A21N", lat: 48.2, lon: 17.2, gs: 440, alt_baro: 36000};
globalThis.fetch = async u => { u = String(u);
  if (u.includes("/v2/point/") || u.includes("/v2/hex/")) return new Response(JSON.stringify({ac: [plane], now: Date.now()}));
  return new Response("{}"); };

const call = async (p, b, ip = "1.2.3.4", cc = "SK") => {
  sky._radarSnap = null; sky._radarSnapRetryAt = 0;
  db.exec("DELETE FROM meta WHERE k LIKE 'radar:%'"); // fixtures menia živé dáta aj čas
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
Date.now = () => fixed; sky._radarSnap = null; db.exec("DELETE FROM meta WHERE k LIKE 'radar:%'"); await sky.cron(); db.exec(`UPDATE ids SET t=${fixed - 60e3}`);
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
sky._radarSnapRetryAt = 0;
db.exec("DELETE FROM meta WHERE k LIKE 'radar:%'");
await t("kraj počíta server", () => assert.deepEqual(db.prepare("SELECT k FROM kraje").all().map(r => r.k), ["BA"]));
await t("obloha: jedna požiadavka na prehľad pre viac mávnutí; výpadok sietí = zopakovať", async () => {
  const of = globalThis.fetch; let n = 0;
  globalThis.fetch = async u => { n++; return of(u); };
  sky._radarSnap = null; await sky.verifyPlane("aabbcc", 48.15, 17.11); const n1 = n; const v2 = await sky.verifyPlane("aabbcc", 48.15, 17.11);
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
await t("dohľadanie typu podľa hexu a doplnenie staršieho úlovku", async () => {
  const original=globalThis.fetch, oldPlane=plane;
  const id="v81unknowntypetest00000001", ip="4.4.4.14";
  const tok=(await call("/api/hello",{id},ip)).j.tok;
  let mode="000000", lookups=0;
  plane={...plane,hex:"cc0001",t:"UNKN"};
  globalThis.fetch=async u=>{
    if(String(u).startsWith("https://api.adsbdb.com/v0/aircraft/")){
      lookups++;
      return Response.json({response:{aircraft:{mode_s:mode,icao_type:" d328 "}}});
    }
    return original(u);
  };
  try{
    const body={id,tok,hex:plane.hex,lat:48.15,lon:17.11,type:"B738"};
    const initial=await call("/api/wave",body,ip);
    assert.equal(initial.j.type,""); // nezhodná identita ani klient neurčia typ
    assert.equal(lookups,1);
    sky._aircraftTypes.clear();
    mode="CC0001";
    const resolved=await call("/api/wave",body,ip);
    assert.equal(resolved.j.type,"D328");
    assert.equal(resolved.j.dup,true);
    assert.equal(resolved.j.ver,1);
    await call("/api/wave",body,ip);
    assert.equal(lookups,2);
    assert.equal(db.prepare("SELECT type FROM catches WHERE id=? AND hex=?").get(id,plane.hex).type,"D328");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM wavelog WHERE id=? AND hex=?").get(id,plane.hex).n,1);
    const radar=await call("/api/planes?lat=48.15&lon=17.11");
    assert.equal(radar.j.ac[0].t,"D328");
    plane.dbFlags=4;
    const privateRadar=await call("/api/planes?lat=48.15&lon=17.11");
    assert.equal(privateRadar.j.ac[0].t,"UNKN");
    assert.equal((await sky.verifyPlane(plane.hex,48.15,17.11)).type,"");
    assert.equal(lookups,2);
  }finally{
    globalThis.fetch=original;
    plane=oldPlane;
    sky._radarSnap=null;
  }
});
await t("server rozlíši Blaník od všeobecného vetroňa a Vivatu", async () => {
  const original = globalThis.fetch;
  const aircraft = {
    "cc0010": {icao_type: "GLID", type: "L-13 BLANIK"},
    "cc0011": {icao_type: "GLID", type: "L-23 Super Blanik"},
    "cc0012": {icao_type: "L13S", type: "L-13 SE Vivat"},
  };
  globalThis.fetch = async url => {
    const hex = String(url).split("/").at(-1);
    return Response.json({response: {aircraft: {mode_s: hex, ...aircraft[hex]}}});
  };
  try {
    for (const [hex, type] of [["cc0010", "BL13"], ["cc0011", ""], ["cc0012", "L13S"]]) {
      const observed = sky.planeRes({...plane, hex, t: "GLID"}, 48.15, 17.11);
      assert.equal((await sky.fillPlaneType(observed, hex)).type, type);
    }
  } finally {
    globalThis.fetch = original;
  }
});
await t("radar prepne na dostupnú zálohu a skryje súkromné údaje", async () => {
  const before=globalThis.fetch, oldPlane=plane;
  sky.env.AIRPLANES_LIVE_ENABLED="1";
  plane={...plane,dbFlags:4,r:"OM-TEST",ownOp:"Privátna letka",squawk:"1200"};
  const attempts=[];
  globalThis.fetch=async u=>{
    const host=new URL(u).hostname;
    attempts.push(host);
    if(host==="api.adsb.lol")return Response.json({}, {status:429,headers:{"Retry-After":"120"}});
    return Response.json({ac:[plane],now:Date.now()});
  };
  try{
    const r=await call("/api/planes?lat=48.15&lon=17.11&r=25");
    assert.equal(r.s,200);assert.equal(r.j.provider,"airplanes.live");
    assert.deepEqual(attempts,["api.adsb.lol","api.airplanes.live"]);
    const throttle=sky.radarStatus(0);
    assert.ok(throttle.until>=Date.now()+117e3);
    assert.equal(await sky.radarFeed(0,"hex/"+plane.hex),null);
    assert.equal(r.j.ac[0].r,"");assert.equal(r.j.ac[0].flight,"");
    assert.equal(r.j.ac[0].squawk,undefined);
    const verified=await sky.verifyPlane(plane.hex,48.15,17.11);
    assert.equal(verified.found,true);assert.equal(verified.reg,"");
    assert.equal(attempts.length,2);
  }finally{
    globalThis.fetch=before;plane=oldPlane;sky._radarSnap=null;sky._radarSnapRetryAt=0;
    delete sky.env.AIRPLANES_LIVE_ENABLED;
  }
});
await t("anonymný radar zachová transport v86 a kľúč obíde zdieľanú cache", async () => {
  const original=globalThis.fetch;
  const options=[];
  globalThis.fetch=async (u,init)=>{
    options.push(init);
    return Response.json({ac:[plane],now:Date.now()});
  };
  try {
    db.exec("DELETE FROM meta WHERE k='radar:0'");
    await sky.radarFeed(0,"point/48.7/19.5/250");
    assert.deepEqual(options[0].cf,{cacheTtl:5,cacheEverything:true});
    assert.equal(options[0].cache,undefined);
    assert.equal(options[0].headers["x-api-key"],undefined);
    const st=sky.radarStatus(0);
    sky.setMeta("radar:0",JSON.stringify({...st,until:Date.now()+3600e3,lastTry:0}));
    sky.env.ADSB_LOL_API_KEY="fixture-key";
    assert.ok(await sky.radarFeed(0,"point/48.7/19.5/250"));
    assert.equal(options[1].headers["x-api-key"],"fixture-key");
    assert.equal(options[1].cache,"no-store");
    assert.equal(options[1].cf,undefined);
  } finally {
    delete sky.env.ADSB_LOL_API_KEY;
    globalThis.fetch=original;
  }
});
await t("ADSB šetrí kvótu, rezervuje overenia a zdieľa rovnaké vyhľadanie", async () => {
  const before=globalThis.fetch;
  const region="point/48.7/19.5/250";
  const env={...sky.env,ADSB_LOL_API_KEY:"fixture-key",ADSB_LOL_WEEKLY_LIMIT:"4750"};
  const radar=new mod.Sky({storage},env);
  let calls=0;
  globalThis.fetch=async()=>{calls++;return Response.json({ac:[plane],now:Date.now()})};
  try {
    db.exec("DELETE FROM meta WHERE k='radar:0'");
    const s=radar.radarStatus(0);
    radar.setMeta("radar:0",JSON.stringify({...s,authorized:true,count:855,weekCount:855,monthCount:855}));
    assert.equal(radar.radarInterval(),28000);
    assert.equal(await radar.radarFeed(0,region),null);
    const results=await Promise.all([radar.radarFeed(0,"hex/aabbcc",true),radar.radarFeed(0,"hex/aabbcc",true)]);
    assert.ok(results[0]?.ac.length);
    assert.equal(results[0],results[1]);
    assert.equal(calls,1);
    const latest=radar.radarStatus(0);
    assert.ok(latest.dayBytes>0);
    radar.setMeta("radar:0",JSON.stringify({...latest,lastTry:0,monthBytes:3600e6}));
    assert.equal(await radar.radarFeed(0,"hex/ffffff",true),null);
    assert.equal(calls,1);
  } finally {
    db.exec("DELETE FROM meta WHERE k='radar:0'");
    globalThis.fetch=before;
  }
});
await t("typ prežije výpadok metadát iba pri zhodnej registrácii", async () => {
  const before=globalThis.fetch;
  const radar=new mod.Sky({storage},sky.env);
  const old={...plane,r:"OM-AAA",t:"L13S"};
  const current={...old,t:"UNKN"};
  const previous={t:Date.now()-29000,m:new Map([[old.hex,old]])};
  let next=current;
  globalThis.fetch=async()=>Response.json({ac:[next],now:Date.now()});
  try {
    db.exec("DELETE FROM meta WHERE k='radar:0'");
    assert.equal((await radar.refreshRadarSnapshot(previous)).m.get(old.hex).t,"L13S");
    db.exec("DELETE FROM meta WHERE k='radar:0'");
    next={...current,r:"OM-BBB"};
    assert.equal((await radar.refreshRadarSnapshot(previous)).m.get(old.hex).t,"UNKN");
  } finally {
    db.exec("DELETE FROM meta WHERE k='radar:0'");
    globalThis.fetch=before;
  }
});
await t("pilot štafety spája len dve overené pozorovania rovnakého preletu", () => {
  const testEnv={...sky.env}, relay=new mod.Sky({storage},testEnv);
  const now=Date.now(), vp={type:"B738",call:"RYR123",priv:false};
  try {
    relay.relayWave(A,"aabbcc",vp,"TT",now-7*60e3);
    relay.relayWave(B,"aabbcc",vp,"TT",now-5*60e3);
    relay.relayWave(C,"aabbcc",{...vp,call:"RYR567"},"TN",now-4*60e3);
    relay.relayWave(C,"aabbcc",{...vp,priv:true},"TN",now-3*60e3);
    assert.deepEqual(relay.relayCards(A,now),[]);
    relay.relayWave(C,"aabbcc",vp,"TN",now);
    assert.deepEqual({...relay.relayCards(B,now)[0]},{type:"B738",k:"TT",other:"TN",t:now-5*60e3});
    assert.deepEqual({...relay.relayCards(C,now)[0]},{type:"B738",k:"TN",other:"TT",t:now});
    assert.deepEqual(relay.relayCards(A,now),[]);
    assert.equal(relay.relayEnabled(),true);
    testEnv.RELAY_PILOT="0";
    assert.equal(relay.relayEnabled(),false);
    assert.deepEqual(relay.relayCards(C,now),[]);
  } finally {db.exec("DELETE FROM relay_waves");}
});
await t("posledná snímka prežije reštart, údaje z hry a výpadok", async () => {
  const now=Date.now(), before=globalThis.fetch, clock=Date.now;
  try {
    Date.now=()=>now;
    const path="/api/planes?lat=48.15&lon=17.11&r=25";
    assert.equal((await call(path)).j.state,"live");
    const saved=sky._radarSnap;
    sky.snap(sky.day(),now);
    assert.equal(await sky.snapshot(),saved);
    const restarted=new mod.Sky({storage}, sky.env);
    assert.equal(restarted.lastRadarSnapshot().t,saved.t);
    Date.now=()=>now+31e3;
    globalThis.fetch=async()=>new Response("",{status:503});
    const stale=await restarted.fetch(new Request("https://x"+path));
    assert.equal(stale.status,503);
    assert.equal((await stale.json()).state,"stale");
    assert.equal((await restarted.verifyPlane(plane.hex,48.15,17.11)).found,false);
    Date.now=()=>now+121e3;
    const expired=await restarted.fetch(new Request("https://x"+path));
    assert.equal((await expired.json()).state,"unavailable");
  } finally {Date.now=clock;globalThis.fetch=before;sky._radarSnap=null;}
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
  const m = db.prepare("SELECT title FROM queue WHERE id=?").get(id);
  assert.ok(m && /7 dní v rade/.test(m.title), JSON.stringify(m));
});
await t("náhľady: kartička, darček, lietadlo s hashom; crawler bez limitu", async () => {
  const get = async (u, ua = "x") => { const r = new Request("https://x" + u, {headers: {"cf-connecting-ip": "8.8.8.8", "user-agent": ua}}); return (await W.fetch(r, env)).text(); };
  const c = await get("/s/c/A388?s=1&n=4&nk=Janka");
  assert.match(c, /Airbus A380 · Čo to letí/);
  assert.doesNotMatch(c, /Janka|Lesklá|č\. 4 na Slovensku|http-equiv="refresh"/);
  assert.match(c, /og\/c\/a388-v79\.jpg/);
  assert.match(c, /#karta=A388/);
  for(const key of ["B738","AT76","A320","B38M","E190"]){
    const preview=await get("/s/c/"+key);
    assert.ok(preview.includes("/og/c/"+key.toLowerCase()+"-v79.jpg"));
    assert.ok(preview.includes("#karta="+key));
  }
  assert.match(await get("/s/c/AT76?r=ABCDEFGHIJKLMNOP"), /\?r=ABCDEFGHIJKLMNOP/);
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
  const id = "v2dupedupedupedupedupedupe02";
  const {tok} = (await call("/api/hello", {id})).j;
  const own = (await call("/api/atlasy", {id, tok, k:"NR"})).j;
  assert.equal(own.top.find(row => row.nick === "Dvojník").sc, 300);
  assert.equal(own.me.sc, 200);
  assert.ok(own.nearby.some(row => row.me && row.sc === 200));

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
await t("detský režim zabráni novým odberom aj pripojeniu cez pozvánku", async () => {
  const id = "v2novydetskyprofil000001";
  const child = (await call("/api/hello", {id, kid: 1}, "11.12.13.14")).j;
  const post = (path, body) => call(path, {id, tok: child.tok, ...body}, "11.12.13.14");
  assert.equal((await post("/api/team", {action: "join", code: "TEST"})).s, 403);
  assert.equal((await post("/api/track", {cs: "WZZ321"})).s, 403);
  assert.equal((await post("/api/sub", {sub: {endpoint: "https://fcm.googleapis.com/fcm/send/child"}})).s, 403);
  assert.equal((await call("/api/friend", {id: A, tok: ha.tok, pid: child.pid, fk: child.fk})).s, 403);
  const reportTarget = "Podnet na kontrolu";
  await call("/api/team", {id: C, tok: hc.tok, action: "create", name: reportTarget}, "9.9.9.9");
  assert.deepEqual((await post("/api/report", {name: reportTarget, why: "osobne"})).j, {ok: true, hidden: false});
  const admin = await call("/api/admin", {key: "tajne"});
  assert.ok(admin.j.podnety.some(row => row.name === reportTarget.toLowerCase()));
  const dbTeam = db.prepare("SELECT code FROM teams WHERE name=?").get(reportTarget);
  db.prepare("DELETE FROM teams WHERE code=?").run(dbTeam.code);
  assert.equal((await post("/api/forget", {})).s, 200);
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
await t("analytický lievik je vypnutý a diagnostika zapisuje len pevné kódy", async () => {
  for (const step of ["open", "beta_open", "beta_verified"]) {
    assert.equal((await call("/api/ev", {step, v: "A"})).s, 200);
  }
  assert.equal(db.prepare("SELECT COUNT(*) c FROM funnel").get().c, 0);
  await call("/api/err", {m: "TypeError x at https://a.b/c.js"});
  await call("/api/err", {m: "wave fail 503/busy"});
  assert.deepEqual(db.prepare("SELECT msg FROM errs ORDER BY msg").all().map(r => r.msg), ["runtime", "wave"]);
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
await t("push odlíši prijatie, neplatný odber, dočasný výpadok a timeout", async () => {
  const id="v2push-provider-test-player";
  const endpoint="https://fcm.googleapis.com/fcm/send/example-fixture";
  const originalFetch=globalThis.fetch,originalTimer=globalThis.setTimeout;
  const add=()=>db.prepare("INSERT OR REPLACE INTO subs(id, sub) VALUES(?, ?)").run(id, JSON.stringify({endpoint}));
  const stored=()=>db.prepare("SELECT id FROM subs WHERE id=?").get(id);
  try {
    for (const status of [202,404,410,429,503,0]) {
      add();
      globalThis.fetch=async (url,options)=>{
        if(url!==endpoint)return originalFetch(url,options);
        assert.equal(options.headers.TTL,"90");
        if(!status)return new Promise((resolve,reject)=>options.signal.addEventListener("abort",()=>reject(options.signal.reason),{once:true}));
        return new Response(null,{status,headers:status===429?{"Retry-After":"25"}:{}});
      };
      globalThis.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===5000?5:ms,...args);
      const expected={202:{sent:true},404:{drop:true},410:{drop:true},429:{delay:25000},503:{delay:60000},0:{}}[status];
      assert.deepEqual(await sky.sendPush(id,90),expected);
      assert.equal(!!stored(),status!==404&&status!==410);
    }
  } finally {
    globalThis.fetch=originalFetch;globalThis.setTimeout=originalTimer;
    db.prepare("DELETE FROM subs WHERE id=?").run(id);
  }
});
await t("push uchová odlišné správy, rešpektuje retry a potvrdí iba zobrazené položky", async () => {
  const id="v2pushqueueplayerfixture1234";
  const hello=(await call("/api/hello",{id},"21.22.23.24")).j;
  const timestamp=Date.now();
  const originalNow=Date.now,originalSend=sky.sendPush;
  let time=timestamp,sent=0;
  Date.now=()=>time;
  try {
    sky.notify(id,"Moment","Teraz","./#moment",true,time+180000);
    sky.notify(id,"Sleduj let","Let A","./#let=RYR1234",true);
    sky.sendPush=async (owner,ttl)=>{
      if(owner!==id)return {drop:true};
      sent++;
      assert.ok(ttl>0&&ttl<=180);
      if(sent===1)return {delay:20000};
      const inbox=(await call("/api/msg",{id,tok:hello.tok,inbox:1})).j;
      assert.deepEqual(inbox.messages.map(m=>m.title),["Moment","Sleduj let"],"rýchla notifikácia môže prísť už počas fetchu");
      return {sent:true};
    };
    await sky.alarm();
    const pending=db.prepare("SELECT title, attempts, next FROM queue WHERE id=? ORDER BY qid").all(id);
    assert.ok(pending.every(item=>item.attempts===1&&item.next===time+20000));
    assert.equal(pending.length,2);
    time+=19000;await sky.alarm();assert.equal(sent,1);
    time+=1000;await sky.alarm();assert.equal(sent,2);
    const list=(await call("/api/msg",{id,tok:hello.tok,inbox:1})).j.messages;
    assert.deepEqual(list.map(m=>m.url),["./#moment","./#let=RYR1234"]);
    const before=(await call("/api/health")).j.push;
    assert.ok(before.awaitingDisplay>=2&&before.acceptedToday>=2&&before.retriesToday>=2);
    await call("/api/msg",{id:A,tok:ha.tok,ack:[list[0].qid]});
    await call("/api/msg",{id,tok:hello.tok,ack:[list[0].qid]});
    await call("/api/msg",{id,tok:hello.tok,ack:[list[0].qid]});
    const remaining=(await call("/api/msg",{id,tok:hello.tok,inbox:1})).j.messages;
    assert.deepEqual(remaining.map(m=>m.title),["Sleduj let"]);
    const after=(await call("/api/health")).j.push;
    assert.equal(after.awaitingDisplay,before.awaitingDisplay-1);
    assert.equal(after.displayedToday,before.displayedToday+1);
  } finally {
    Date.now=originalNow;sky.sendPush=originalSend;
    db.prepare("DELETE FROM queue WHERE id=?").run(id);
  }
});
await t("neúspešný cron sa odlíši od posledného úspechu a scheduled odmietne HTTP 503", async () => {
  const original=sky.runCron,prior=sky.getMeta("cron");
  sky.runCron=async ()=>{throw Error("fixture cron")};
  try {
    await assert.rejects(sky.cron(),/fixture cron/);
    const health=(await call("/api/health")).j;
    assert.equal(health.ok,false);
    assert.equal(health.lastCron,Number(prior||0));
    assert.ok(health.cronError);
  } finally {
    sky.runCron=original;sky.setMeta("cronError","");
  }
  let work;
  await W.scheduled(null,{SKY:{idFromName:()=>1,get:()=>({fetch:async()=>new Response(null,{status:503})})}},{
    waitUntil(promise){work=promise}
  });
  await assert.rejects(work,/cron HTTP 503/);
});

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
  assert.deepEqual(j.lievik7dni, {});
  assert.equal((await call("/api/export")).s, 404); // export celej databázy je zrušený
});
await t("moje údaje sa dajú stiahnuť", async () => { const r = await call("/api/mydata", {id: C, tok: hc.tok}); assert.equal(r.s, 200); assert.ok(Array.isArray(r.j.wavelog)); assert.ok(!JSON.stringify(r.j).includes(C)); });
await t("cudzí účet nie je možné vymazať bez jeho platného tokenu", async () => {
  assert.equal((await call("/api/forget", {id: A})).s, 401);
  assert.equal((await call("/api/forget", {id: A, tok: hb.tok})).s, 401);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM ids WHERE id=?").get(A).c, 1);
});
await t("zmazanie údajov zruší aj token", async () => {
  db.prepare("INSERT OR REPLACE INTO streaks(id, n, day) VALUES(?, 8, '2026-11-25')").run(A);
  db.prepare("INSERT INTO duelres(pid,t,n,res,src) VALUES(?,?,?,?,?)").run(hb.pid,Date.now(),"Vlastná prezývka","1:2",A);
  const exported = await call("/api/mydata", {id: A, tok: ha.tok});
  assert.equal(exported.j.streaks[0].n, 8);
  assert.equal(exported.j.duelres[0].direction, "sent");
  assert.equal((await call("/api/forget", {id: A, tok: ha.tok})).s, 200);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM ids WHERE id=?").get(A).c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM streaks WHERE id=?").get(A).c, 0);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM duelres WHERE src=?").get(A).c, 0);
  assert.equal((await call("/api/hello", {id: A})).s, 401);
  assert.equal((await call("/api/forget", {id: A, tok: ha.tok})).s, 200);
  assert.equal((await call("/api/forget", {id: A, tok: hb.tok})).s, 401);
  assert.equal(db.prepare("SELECT COUNT(*) c FROM wavelog WHERE id=?").get(A).c, 0);
  assert.equal((await call("/api/wave", {id: A, tok: ha.tok, hex: "aabbcc", lat: 48.15, lon: 17.11})).s, 401);
});
await t("prenos zbierky: jednorazový kód, starý mobil stratí prístup", async () => {
  const history=Array.from({length:2400},(_,i)=>({t:i,ty:"A21N",dest:"Košice",al:"WZZ",dc:"SK"}));
  const data=JSON.stringify({ctl_col:JSON.stringify({history})});
  assert.ok(Buffer.byteLength(data)>4096);
  assert.equal((await call("/api/sub",{id:B,tok:hb.tok,sub:{endpoint:"https://fcm.googleapis.com/fcm/send/test-sub"}}, "5.6.7.8")).s,200);
  assert.ok(db.prepare("SELECT id FROM subs WHERE id=?").get(B));
  const x = await call("/api/xfer", {id: B, tok: hb.tok, data}, "5.6.7.8");
  assert.equal(x.s,200);
  assert.equal(x.j.code.length, 8);
  const claim=crypto.randomUUID(),code=x.j.code;
  assert.equal((await call("/api/xclaim",{code},"8.8.8.8")).s,409,"starý klient nespustí nevratný prenos");
  const prepared=await call("/api/xprepare",{code,claim},"8.8.8.8");
  assert.equal(prepared.s,200);
  assert.equal(prepared.j.id,B);
  assert.equal(prepared.j.data,data);
  assert.equal(prepared.j.tok,undefined);
  assert.ok(db.prepare("SELECT id FROM subs WHERE id=?").get(B));
  assert.ok(await sky.authed(B,hb.tok),"po príprave staré zariadenie stále funguje");
  const finish={code,claim,id:B,ticket:prepared.j.ticket};
  assert.equal((await call("/api/xfinish",{...finish,claim:crypto.randomUUID()},"8.8.8.8")).s,404);
  const c1=await call("/api/xfinish",finish,"8.8.8.8");
  assert.equal(c1.s,200);
  assert.equal(c1.j.id,B);
  assert.ok(c1.j.tok!==hb.tok);
  assert.equal(c1.j.epoch,0);
  assert.equal(db.prepare("SELECT id FROM subs WHERE id=?").get(B),undefined);
  assert.equal((await call("/api/xprepare",{code,claim},"8.8.8.8")).s,404);
  const replay=await call("/api/xfinish",finish,"8.8.8.8");
  assert.equal(replay.s,200);
  assert.equal(replay.j.tok,c1.j.tok,"stratená odpoveď sa zopakuje bez ďalšej zmeny identity");
  assert.equal((await call("/api/xfinish",{...finish,claim:crypto.randomUUID()},"8.8.8.8")).s,404);
  assert.equal((await call("/api/wave", {id: B, tok: hb.tok, hex: "aabbcc", lat: 48.15, lon: 17.11}, "5.6.7.8")).s, 401);
  assert.equal((await call("/api/hello", {id: B}, "5.6.7.8")).s, 401); // starý mobil si nový token nevypýta
  assert.equal((await call("/api/sky", {id: B, tok: c1.j.tok, lat: 48.15, lon: 17.11, hexes: "aabbcc"})).s, 200);
});
await t("bežné API má oddelený limit a súkromné odpovede sa neukladajú", async () => {
  assert.equal((await call("/api/ev",{step:"open",note:"a".repeat(5000)})).s,413);
  const r=await W.fetch(new Request("https://x/api/mycards",{method:"POST",body:JSON.stringify({id:B})}),env);
  assert.equal(r.status,401);
  assert.match(r.headers.get("Cache-Control"),/no-store/);
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
  const pr = async (u, o) => (await W.fetch(new Request("https://x/?url=" + encodeURIComponent(u), {headers: o ? {origin: o} : {}}), env)).status;
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
await t("týždenná misia: overenie, jedinečné príspevky a hranica týždňa", async () => {
  const oldNow = Date.now, oldPlane = {...plane};
  const monday = Date.parse("2026-11-22T23:05:00Z"); // v Bratislave už pondelok
  Date.now = () => monday;
  const mission = async (body) => (await call("/api/sky", body, "9.9.9.9")).j.mission;
  const identity = {id: C, tok: hc.tok};
  const wave = (extra = {}) => call("/api/wave", {...identity, hex: plane.hex, lat: 48.15, lon: 17.11, ...extra}, "9.9.9.9");
  try {
    assert.equal(await mission(identity), null);
    assert.equal((await call("/api/admin", {missionGoal: 1})).s, 401);
    assert.equal((await adminReset({missionGoal: 1.5})).s, 400);
    Date.now = () => monday - 8 * 60e3;
    assert.equal((await adminReset({missionGoal: 1})).j.currentGoal, 1);
    assert.equal((await adminReset({missionGoal: 2})).j.currentGoal, 1);
    Date.now = () => monday;
    plane.hex = "aabb70";
    assert.equal((await wave({gps: false})).j.ver, 0);
    assert.equal((await mission(identity)).total, 0);
    plane.hex = "aabb71";
    assert.equal((await wave({t: monday - 8 * 60e3, pl: {la: plane.lat, lo: plane.lon, alt: plane.alt_baro}})).j.ver, 1);
    assert.deepEqual(await mission(identity), {week: "2026-11-23", goal: 2, total: 0, mine: 0, previous: {week: "2026-11-16", goal: 1, total: 1, mine: 1}});
    assert.equal(sky.weeklyMission(monday - 8 * 60e3, C).mine, 1);
    plane.hex = "aabb72";
    assert.equal((await wave()).j.ver, 1);
    await wave();
    assert.deepEqual(await mission(identity), {week: "2026-11-23", goal: 2, total: 1, mine: 1, previous: {week: "2026-11-16", goal: 1, total: 1, mine: 1}});
    assert.equal((await mission({id: C})).mine, null);
    assert.equal((await call("/api/mydata", identity, "9.9.9.9")).j.mission_waves.length, 2);
    await adminReset({missionGoal: 0});
    assert.equal(await mission(identity), null);

    Date.now = () => Date.parse("2026-03-23T10:00:00Z");
    await adminReset({missionGoal: 5});
    Date.now = () => Date.parse("2026-03-29T22:05:00Z"); // prvý pondelok po zmene na letný čas
    assert.equal((await mission(identity)).previous.week, "2026-03-23");
    await adminReset({missionGoal: 0});
  } finally {
    Date.now = oldNow;
    Object.assign(plane, oldPlane);
  }
});
await t("prezývka sa uloží ihneď, ostane pri starom mávnutí a detský profil ju nemôže uložiť", async () => {
  const id = "v2testnickname00000000001", ip = "11.12.13.61";
  const hello = (await call("/api/hello", {id}, ip)).j;
  const identity = {id, tok: hello.tok};
  const save = nick => call("/api/nick", {...identity, nick}, ip);
  assert.deepEqual(hello.nickname, {name: "", managed: false, kid: false});
  assert.equal((await call("/api/nick", {id, nick:"Vetronár"}, ip)).s, 401);
  assert.equal((await save(" ＳＰＯＴＴＥＲ ")).j.error, "default");
  assert.equal((await save("A")).j.error, "length");
  assert.equal((await save("x".repeat(21))).j.error, "length");
  db.prepare("INSERT INTO banned(name, t) VALUES(?, ?)").run("blokovanémeno", Date.now());
  assert.equal((await save("BlokovanéMeno")).j.error, "name");
  assert.equal((await call("/api/team", {...identity, action:"create", name:"Veterný tím"}, ip)).s, 200);
  assert.deepEqual((await save("  Veľký  Vetronár  ")).j, {ok:true, nick:"Veľký Vetronár"});
  assert.equal(db.prepare("SELECT nick FROM tmembers WHERE id=?").get(id).nick, "Veľký Vetronár");
  const legacy = await call("/api/wave", {...identity, nick:"Staré Meno", hex:plane.hex, lat:48.15, lon:17.11}, ip);
  assert.equal(legacy.s, 200);
  assert.equal(db.prepare("SELECT nick FROM nicks WHERE id=?").get(id).nick, "Veľký Vetronár");
  assert.deepEqual((await call("/api/hello", identity, ip)).j.nickname, {name:"Veľký Vetronár",managed:true,kid:false});
  assert.equal((await call("/api/kid", {...identity, on:1}, ip)).s, 200);
  assert.equal((await save("Vetronár")).s, 403);
  assert.deepEqual((await call("/api/hello", identity, ip)).j.nickname, {name:"",managed:false,kid:true});
});
await t("e-mail pripojí pôvodný účet, obnoví zálohu a neprenesie účty ani kódy iných hráčov", async () => {
  const start = "/api/account/start", finish = "/api/account/finish", backupPath = "/api/account/backup";
  assert.deepEqual((await call("/api/account/status")).j, {rollout:"off"});
  assert.equal((await call(start, {mode:"login",email:"pilot@example.com"})).s, 503);
  const provider = globalThis.fetch, oldEnv = {...sky.env}, outbox = [];
  Object.assign(sky.env, {ACCOUNT_FROM:"test@example.com",RESEND_API_KEY:"test",ACCOUNT_ROLLOUT:"pilot",ACCOUNT_PILOT_EMAILS:"pilot@example.com"});
  globalThis.fetch = async (url, opts) => {
    if (String(url) !== "https://api.resend.com/emails") return provider(url, opts);
    outbox.push(JSON.parse(opts.body));
    return new Response("{}", {status: 200});
  };
  try {
    const id = "v2testaccountpilot000000001", other = "v2testaccountpilot000000002";
    const a = (await call("/api/hello", {id}, "12.12.12.10")).j;
    const b = (await call("/api/hello", {id:other}, "12.12.12.11")).j;
    const email = "Pilot@example.com", ip = "12.12.12.12";
    const ask = (mode, fields={}) => call(start, {mode,email,...fields}, ip);
    const reply = (mode, challenge, fields={}, code=outbox.at(-1).text.match(/\d{8}/)[0]) =>
      call(finish, {mode,challenge,code,...fields}, ip);
    assert.equal((await ask("link", {id})).s, 403);
    assert.equal((await ask("login", {email:"excluded@example.com"})).s, 403);
    const linked = await ask("link", {id,tok:a.tok});
    assert.equal(linked.s, 200);
    assert.deepEqual(outbox[0].to, ["pilot@example.com"]);
    const snapshot = {ctl_col:{hex:{},types:{A320:{n:1}},pts:42,mi:17,n:1,ach:{wave:1}},
      ctl_log:[{type:"A320"}],ctl_daily:{done:true},ctl_tok:"must-not-be-backed-up"};
    assert.equal((await reply("link", linked.j.challenge, {id:other,tok:b.tok,backup:snapshot})).s, 400);
    assert.equal((await reply("link", linked.j.challenge, {id,tok:a.tok,backup:snapshot}, "xxxxxxxx")).s, 400);
    assert.deepEqual((await reply("link", linked.j.challenge, {id,tok:a.tok,backup:snapshot})).j, {rev:1});
    assert.equal((await reply("link", linked.j.challenge, {id,tok:a.tok,backup:snapshot})).s, 400);
    assert.equal((await call("/api/mycards", {id,tok:a.tok})).s, 200);
    const login = await ask("login");
    assert.equal(login.s, 200);
    const restored = await reply("login", login.j.challenge);
    assert.equal(restored.s, 200);
    assert.equal(restored.j.id, id);
    assert.equal(restored.j.pid, a.pid);
    assert.equal(restored.j.tok, a.tok);
    assert.deepEqual(restored.j.backup.ctl_col, snapshot.ctl_col);
    assert.deepEqual(restored.j.backup.ctl_log, snapshot.ctl_log);
    assert.equal(restored.j.backup.ctl_tok, undefined);
    assert.equal((await reply("login", login.j.challenge)).s, 400);
    assert.deepEqual((await call(backupPath, {id,tok:a.tok,rev:1,backup:{...snapshot,ctl_col:{...snapshot.ctl_col,pts:43}}})).j, {rev:2});
    assert.equal((await call(backupPath, {id,tok:a.tok,rev:1,backup:snapshot})).s, 409);
    assert.deepEqual((await call("/api/mydata", {id,tok:a.tok})).j.zalohaZbierky.ctl_col.pts, 43);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM player_accounts WHERE id=?").get(id).n, 1);
    await call("/api/forget", {id,tok:a.tok});
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM player_accounts WHERE id=?").get(id).n, 0);
  } finally {
    for (const key of ["ACCOUNT_FROM","RESEND_API_KEY","ACCOUNT_ROLLOUT","ACCOUNT_PILOT_EMAILS"]) delete sky.env[key];
    Object.assign(sky.env, oldEnv);
    globalThis.fetch = provider;
  }
});
await t("Atlas SR hneď vráti nový výsledok aj okolie hráča mimo popredia", async () => {
  const id = "v2atlasplayer0000000000001", ip = "17.2.3.4";
  const hello = (await call("/api/hello", {id}, ip)).j;
  const me = {id, tok:hello.tok};
  const insert = db.prepare("INSERT INTO typeseq(type,id,seq,w,k,town,t) VALUES(?,?,9,?,'BA','',0)");
  for (let i = 0; i < 23; i++) insert.run("A345", "v2atlasrival" + i, 80 - i);
  insert.run("A320", id, 3);
  const before = (await call("/api/atlasy", me, ip)).j;
  assert.equal(before.top.length, 20);
  assert.ok(before.me.rank > 20 && before.me.gap > 0);
  assert.ok(before.nearby.some(row => row.me && row.rank === before.me.rank));
  assert.ok(before.nearby.some(row => !row.me));
  assert.equal((await call("/api/atlasy")).j.me, null);
  const oldPlane = {...plane};
  try {
    Object.assign(plane, {hex:"af0971", t:"A338", lat:48.16, lon:17.12, alt_baro:23000});
    const wave = (await call("/api/wave", {...me, hex:plane.hex, lat:48.15, lon:17.11}, ip)).j;
    assert.equal(wave.ver, 1);
    assert.equal(wave.atlasPoints, 125);
    const after = (await call("/api/atlasy", me, ip)).j;
    assert.equal(after.me.sc, before.me.sc + wave.atlasPoints);
    assert.ok(after.me.rank < before.me.rank);
    plane.hex = "af0972";
    const repeat = (await call("/api/wave", {...me, hex:plane.hex, lat:48.15, lon:17.11}, ip)).j;
    assert.equal(repeat.ver, 1);
    assert.equal(repeat.atlasPoints, 0);
    assert.equal((await call("/api/atlasy", me, ip)).j.me.sc, after.me.sc);
  } finally {
    Object.assign(plane, oldPlane);
  }
});
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
  // Dôležité: existujúce tokeny už aktívnych testerov sa po nasadení nesmú meniť.
  assert.equal(await sky.tokOld(C),hc.tok,"podpis existujúcich tokenov ostáva stabilný");
  const done=await adminReset({resetAction:"execute",nonce:draft.j.nonce,confirm:"VYMAZAT VSETKY DATA"});
  assert.equal(done.j.ok,true);assert.equal(done.j.epoch,1);
  for(const table of ["ids","typeseq","wavelog","nicks","totals","tweek","refs","streaks","duelres","mission_waves","mission_weeks"])
    assert.equal(db.prepare("SELECT COUNT(*) c FROM "+table).get().c,0,table);
  assert.equal((await call("/api/hello",{id:"v2testresetgeneration000001"})).s,409);
  assert.equal((await call("/api/hello",{id:"v2testresetgeneration000001",epoch:1})).s,200);
  const before=db.prepare("SELECT COUNT(*) AS c FROM ids").get().c;
  assert.equal(await sky.authed(C,hc.tok),false,"vymazaný účet sa nesmie automaticky obnoviť");
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM ids").get().c,before,"starý token nesmie znovu vytvoriť účet");
  assert.equal((await call("/api/wave",{id:C,tok:hc.tok,hex:"aabbcc",lat:48.15,lon:17.11})).s,401);
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM ids").get().c,before);
  const minted=(await call("/api/hello",{id:"v2anotherresetgeneration00001",epoch:1})).j;
  assert.ok(minted.tok);
  assert.equal(await sky.authed("v2anotherresetgeneration00001",minted.tok),true,"nový token musí fungovať");
  assert.notEqual(minted.tok,await sky.tokOld("v2anotherresetgeneration00001"),"nový účet po resete musí mať vlastný podpis");
  const resumed=(await call("/api/hello",{id:"v2anotherresetgeneration00001",epoch:1,tok:minted.tok})).j;
  assert.equal(resumed.tok,minted.tok,"existujúci účet si pri prihlásení zachová token");
  const second=await adminReset({resetAction:"prepare"});
  const again=await adminReset({resetAction:"execute",nonce:second.j.nonce,confirm:"VYMAZAT VSETKY DATA"});
  assert.equal(again.j.epoch,2);
  assert.equal(await sky.authed("v2anotherresetgeneration00001",minted.tok),false,"každý ďalší reset zneplatní tokeny predošlej generácie");
  assert.equal(db.prepare("SELECT COUNT(*) AS c FROM ids").get().c,0);
});
