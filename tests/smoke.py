# Dymový test appky v prehliadači (Playwright, Chromium ako iPhone).
# Spustí appku z lokálneho servera, siete a server podvrhne, preklikne hlavné záložky
# a zlyhá pri akejkoľvek chybe JavaScriptu. Spúšťa sa v GitHub Actions pri každom pushi.
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOW = int(time.time() * 1000)
PLANES = {"ac": [
    {"hex": "4ca123", "flight": "RYR4KX ", "r": "EI-DCL", "t": "B738", "lat": 48.17, "lon": 17.15, "gs": 430, "track": 90, "alt_baro": 36000, "alt_geom": 36500},
    {"hex": "49d3c1", "flight": "OKSAR1", "r": "OM-ATA", "t": "B429", "lat": 48.14, "lon": 17.09, "gs": 110, "track": 200, "alt_baro": 1500, "category": "A7"},
], "now": NOW}
SKY = {"now": NOW, "towns": [], "teamsTop": [], "kraje": [], "planes": {}, "friends": {}, "mailsIn": [], "mailsOut": [], "mailOn": {}, "flags": {}}

def stub(route):
    u = route.request.url
    if u.startswith("http://localhost"):
        return route.continue_()
    h = {"access-control-allow-origin": "*"}
    if "/v2/" in u or "adsb" in u and "adsbdb" not in u:
        return route.fulfill(status=200, content_type="application/json", headers=h, body=json.dumps(PLANES))
    if "workers.dev" in u:
        if "/api/sky" in u:
            return route.fulfill(status=200, content_type="application/json", headers=h, body=json.dumps(SKY))
        return route.fulfill(status=200, content_type="application/json", headers=h, body='{"ok":true}')
    return route.fulfill(status=200, content_type="application/json", headers=h, body="{}")

def main():
    srv = subprocess.Popen([sys.executable, "-m", "http.server", "8799", "-d", ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1)
    errs = []
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True,
                                geolocation={"latitude": 48.15, "longitude": 17.11}, permissions=["geolocation"])
            ctx.route("**/*", stub)
            pg = ctx.new_page()
            pg.on("pageerror", lambda e: errs.append("PAGEERROR " + str(e)))
            pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" and "Failed to load resource" not in m.text else None)
            # 1) prvé spustenie (úvod)
            pg.goto("http://localhost:8799/index.html")
            pg.wait_for_timeout(2500)
            # 2) appka po úvode
            pg.evaluate("localStorage.setItem('ctl_onb','1')")
            pg.reload()
            pg.wait_for_timeout(3000)
            for v in ["space", "col", "now"]:
                pg.click(f'nav [data-v="{v}"]', timeout=5000)
                pg.wait_for_timeout(1200)
            ok = pg.evaluate("document.fonts.check('16px Inter')")
            if not ok:
                errs.append("písmo Inter sa nenačítalo z appky")
            b.close()
    finally:
        srv.terminate()
    if errs:
        print("\n".join(errs[:20]))
        sys.exit(1)
    print("✓ appka sa spustí a záložky fungujú bez chyby")

main()
