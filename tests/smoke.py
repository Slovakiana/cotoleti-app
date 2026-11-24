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
        if "/api/planes" in u:
            return route.fulfill(status=200, content_type="application/json", headers=h, body=json.dumps({**PLANES, "src": "sky"}))
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
            pg.evaluate("""() => {
                const live = {el: 30};
                const before = {...S};
                try {
                    S.pos = null;
                    if (firstWaveNext(live)[1] !== "Vybrať polohu") throw Error("Chýba voľba polohy");
                    Object.assign(S, {pos: {lat: 48.15, lon: 17.11}, loaded: true, lastKnown: false, failN: 0});
                    if (firstWaveNext(null)[1] !== "Pozrieť ISS") throw Error("Chýba ďalší krok pri prázdnej oblohe");
                    S.manual = true;
                    if (firstWaveNext(live)[1] !== "Použiť GPS") throw Error("Chýba prechod na GPS");
                    S.manual = false;
                    if (!firstWaveNext(live)[0].includes("Mávni")) throw Error("Chýba pokyn na mávnutie");
                    reportFirstWave({ver: 0, why: "nízko nad obzorom"});
                    if (!$("firstWaveResult").textContent.includes("nízko nad obzorom")) throw Error("Chýba dôvod");
                    reportFirstWave({ver: 1});
                    if (!$("firstWaveHint").hidden || !$("firstWaveResult").textContent.includes("overený")) throw Error("Chýba potvrdenie");
                } finally {
                    Object.assign(S, before);
                }
            }""")
            # 2) appka po úvode
            pg.evaluate("localStorage.setItem('ctl_onb','1')")
            pg.reload()
            pg.wait_for_timeout(3000)
            for v in ["space", "col", "now"]:
                pg.click(f'nav [data-v="{v}"]', timeout=5000)
                pg.wait_for_timeout(1200)
            pg.evaluate("""() => {
                renderWeeklyMission({total: 3, goal: 3, mine: 1});
                if ($("weeklyMission").hidden || $("weeklyMissionDone").hidden
                    || $("weeklyMissionProgress").value !== 3 || !$("weeklyMissionMine").textContent.endsWith("1"))
                    throw Error("Chybný stav dokončenej misie");
                renderWeeklyMission({total: 1, goal: 3, mine: null});
                if (!$("weeklyMissionDone").hidden || !$("weeklyMissionMine").hidden)
                    throw Error("Neoverený hráč vidí osobný postup alebo predčasnú odmenu");
                renderWeeklyMission(null);
                if (!$("weeklyMission").hidden) throw Error("Vypnutá misia je viditeľná");
            }""")
            for width in (320, 390, 768):
                pg.set_viewport_size({"width": width, "height": 844})
                pg.evaluate("""() => {
                    const ids = ["hero", "nearCard", "huntHome", "compPulse", "weeklyMission"];
                    const bounds = id => $(id).getBoundingClientRect();
                    if (!ids.slice(1).every((id, i) => $(ids[i]).compareDocumentPosition($(id)) & Node.DOCUMENT_POSITION_FOLLOWING))
                        throw Error("Herné karty odsunuli zoznam lietadiel");
                    renderWeeklyMission({goal: 100, total: 28, mine: 2, previous: {goal: 100, total: 104, mine: 4}});
                    const past = $("weeklyMissionPrevious");
                    if (past.hidden || past.open || !past.textContent.includes("Cieľ splnený"))
                        throw Error("Výsledok minulého týždňa má byť dostupný a zbalený");
                    past.querySelector("summary").click();
                    if (!past.open || bounds("weeklyMissionRecap").height === 0)
                        throw Error("Výsledok minulého týždňa sa nedá rozbaliť");
                    if (bounds("weeklyMission").right > document.documentElement.clientWidth
                        || bounds("weeklyMissionProgress").right > bounds("weeklyMission").right
                        || past.querySelector("summary").getBoundingClientRect().height < 44)
                        throw Error("Misia sa nezmestí do šírky alebo má malý dotykový cieľ");
                    past.open = false;
                    renderWeeklyMission(null);
                }""")
                print(f"✓ poradie kariet, šírka misie a dotykové ovládanie pri {width} px")
            src = pg.evaluate("S.src||''")
            if "Čo to letí" not in src:
                errs.append("lietadlá neprišli z vlastného servera: " + src)
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
