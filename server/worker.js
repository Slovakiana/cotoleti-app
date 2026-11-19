// Cloudflare Worker pre appku „Čo to letí?“
// Sprostredkuje dáta len z týchto zdrojov a pridá hlavičku, aby ich prehliadač pustil.
const ALLOW = ["api.adsb.lol","api.airplanes.live","opendata.adsb.fi","opensky-network.org","api.adsbdb.com","celestrak.org","api.open-meteo.com"];
export default {
  async fetch(req) {
    const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS"};
    if (req.method === "OPTIONS") return new Response(null, {headers: cors});
    let t;
    try { t = new URL(new URL(req.url).searchParams.get("url")); }
    catch (e) { return new Response("Čo to letí? server beží ✈️", {headers: cors}); }
    if (t.protocol !== "https:" || !ALLOW.includes(t.hostname)) return new Response("nepovolené", {status: 403, headers: cors});
    const r = await fetch(t, {headers: {"User-Agent": "cotoleti-app"}, cf: {cacheTtl: 5}});
    const h = new Headers(cors);
    h.set("Content-Type", r.headers.get("Content-Type") || "application/json");
    return new Response(r.body, {status: r.status, headers: h});
  }
};
