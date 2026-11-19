// Cloudflare Worker pre appku „Čo to letí?“
// /?url=…  → sprostredkuje dáta len z povolených zdrojov (s CORS hlavičkou)
// inak     → servíruje samotnú appku
const ALLOW = ["api.adsb.lol","api.airplanes.live","opendata.adsb.fi","opensky-network.org","api.adsbdb.com","celestrak.org","api.open-meteo.com"];
export default {
  async fetch(req, env) {
    const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS"};
    if (req.method === "OPTIONS") return new Response(null, {headers: cors});
    const raw = new URL(req.url).searchParams.get("url");
    if (!raw) {
      if (env && env.ASSETS) return env.ASSETS.fetch(req);
      return new Response("Čo to letí? server beží ✈️", {headers: cors});
    }
    let t;
    try { t = new URL(raw); } catch (e) { return new Response("zlá adresa", {status: 400, headers: cors}); }
    if (t.protocol !== "https:" || !ALLOW.includes(t.hostname)) return new Response("nepovolené", {status: 403, headers: cors});
    try {
      const r = await fetch(t, {headers: {"User-Agent": "cotoleti-app (github.com/Slovakiana/cotoleti-app)"}, cf: {cacheTtl: 5}});
      const h = new Headers(cors);
      h.set("Content-Type", r.headers.get("Content-Type") || "application/json");
      h.set("Cache-Control", "no-store");
      return new Response(r.body, {status: r.status, headers: h});
    } catch (e) {
      return new Response(JSON.stringify({error: String(e)}), {status: 502, headers: {...cors, "Content-Type": "application/json"}});
    }
  }
};
