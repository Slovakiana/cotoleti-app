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
        if "/api/hello" in u:
            return route.fulfill(status=200, content_type="application/json", headers=h, body='{"tok":"test-token","pid":"tester","fk":"test-key","epoch":0}')
        if "/api/wave" in u:
            request = json.loads(route.request.post_data or "{}")
            return route.fulfill(status=200, content_type="application/json", headers=h, body=json.dumps({"ok": True, "ver": 1, "type": request["type"]}))
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
                    S.top = live;
                    reportFirstWave({ver: 1});
                    if (!$("firstWaveHint").hidden || !$("firstWaveResult").textContent.includes("overený")) throw Error("Chýba potvrdenie");
                    renderFirstWaveGuide(null);
                    if ($("firstWaveHint").hidden || !$("firstWaveHint").textContent.includes("Zatiaľ tu nie je"))
                        throw Error("Po úlovku chýba správa o prázdnej oblohe");
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
                    setView("col");
                    if (!($("atlasSection").compareDocumentPosition($("community")) & Node.DOCUMENT_POSITION_FOLLOWING))
                        throw Error("Zbierka neukazuje Atlas pred Komunitou");
                    $("community").open = true;
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
                    $("community").open = false;
                    setView("now");
                }""")
                print(f"✓ poradie kariet, šírka misie a dotykové ovládanie pri {width} px")
            pg.evaluate("""() => {
                const [selected, waved, untouched] = ["4ca123", "49d3c1", "abc123"].map(hex=>({hex, el: 30, bear: 90, alt: 10000, type: "B738"}));
                const oldTop = S.top;
                try {
                    S.top = selected;
                    SOC.waved["2000-01-01"+untouched.hex] = "👋";
                    renderList([selected, waved, untouched]);
                    const row = hex => $("list").querySelector('[data-hex="'+hex+'"]');
                    if ($("list").querySelector(".nearWaved")) throw Error("Stará história sa zobrazuje ako dnešná");
                    SOC.waved[dayKey()+waved.hex] = "👋";
                    renderList([selected, waved, untouched]);
                    const marked = row(waved.hex);
                    if (!marked.querySelector(".nearWaved") || !marked.getAttribute("aria-label").includes("Dnes zamávané")
                        || row(untouched.hex).querySelector(".nearWaved"))
                        throw Error("Zoznam nerozlišuje dnešné mávnutie");
                } finally {
                    delete SOC.waved[dayKey()+waved.hex];
                    delete SOC.waved["2000-01-01"+untouched.hex];
                    S.top = oldTop;
                    renderList(S.list);
                }
            }""")
            pg.set_viewport_size({"width": 320, "height": 844})
            pg.evaluate("""() => {
                const flight = S.list.find(a=>a.hex==="4ca123");
                if (!flight) throw Error("Chýba skúšobný Boeing");
                S.pick=flight.hex; tick(true);
                const selected=S.top;
                void doWave("👋");
                if (!$("firstWaveResult").textContent.includes("Spracúvam"))
                    throw Error("Mávnutie nemá okamžitú odozvu");
                if (S.top!==selected) throw Error("Zmenil sa vybraný let");
            }""")
            pg.locator("#cardBig h2").wait_for(timeout=7000)
            pg.evaluate("""() => {
                const h=$("cardBig").querySelector("h2");
                const illustration=$("cardBig").querySelector(".holoWrap svg");
                if (h.textContent!=="Boeing 737-800" || !illustration.textContent.includes("ATLAS OBLOHY")
                    || !COL.types.B738.ver || COL.types.B738.n!==1)
                    throw Error("Odhalenie nesedí s overeným úlovkom");
                const w=illustration.getBoundingClientRect();
                if (w.left<0 || w.right>document.documentElement.clientWidth)
                    throw Error("Kartička preteká na 320 px");
                window.savedCardAsset=null;
                shareBlob=async(blob,name,caption)=>{window.savedCardAsset={blob,name,caption};};
                $("cardShare").click();
            }""")
            for _ in range(30):
                if pg.evaluate("() => (window.savedCardAsset?.blob.size || 0) > 1000"):
                    break
                pg.wait_for_timeout(100)
            else:
                raise AssertionError("Export kartičky nevytvoril obrázok")
            pg.evaluate("""async () => {
                const {blob,caption}=window.savedCardAsset;
                const img=await createImageBitmap(blob);
                if(img.width!==1080||img.height!==1920||!caption.includes("/s/c/B738"))
                    throw Error("Zdieľanie neexportovalo zobrazenú kartu");
                img.close();
                $("cardCollection").click();
                if(S.view!=="col"||!$("c-types").querySelector('[data-k="B738"]'))
                    throw Error("Prvý úlovok sa nedá nájsť v Zbierke");
            }""")
            pg.evaluate("""async () => {
                setView("now");
                const previous = S.top;
                const source = S.list.find(a => a.hex === "4ca123");
                const second = {...source, hex:"4ca124", type:"B738"};
                S.top = second;
                await doWave("👋");
                if (COL.types.B738.n!==2 || !$("firstWaveResult").textContent.includes("2 z 5")
                    || $("cardM").classList.contains("on"))
                    throw Error("Ďalší stroj nepridal postup alebo znovu otvoril odhalenie");
                S.top = second;
                await doWave("👋");
                if (COL.types.B738.n!==2 || !$("firstWaveResult").textContent.includes("Dnes už zamávané"))
                    throw Error("Opakované mávnutie tomu istému stroju zmenilo úroveň");
                if (!cardCatchProgress("B738",{n:5}).includes("Nová hviezda")
                    || !cardCatchProgress("B738",{n:60}).includes("Najvyššia úroveň"))
                    throw Error("Chybná spätná väzba pri novej alebo poslednej hviezde");
                S.top = previous;
                openCard("B738");
                if (!$("cardBig").querySelector(".cardFirstCatch")?.textContent.includes("Prvý úlovok"))
                    throw Error("Chýba skutočný prvý úlovok");
                Object.defineProperty(navigator,"share",{configurable:true,value:async data=>{window.sharedCardLink=data.url}});
                $("cardBig").querySelector("[data-card-link]").click();
                if (!window.sharedCardLink.includes("/s/c/B738")) throw Error("Zdieľaný odkaz nesedí");
                $("cardClose").click();
                location.hash = "karta=A320";
            }""")
            pg.locator("#cardM.on.locked .lockSil > svg").wait_for(timeout=5000)
            pg.evaluate("""() => {
                if(S.view!=="col" || COL.types.A320 || location.hash || !$("cardBig").querySelector('[data-hunt-pick="A320"]'))
                    throw Error("Zdieľaný odkaz neotvoril správnu neulovenú kartičku");
                $("cardClose").click();
            }""")
            print("✓ druhý stroj, opakované mávnutie, hviezdy a otvorenie zdieľanej kartičky")
            pg.evaluate("""async () => {
                const cases=[cardSVG("B738",{n:1,ver:1}),cardSVG("B738",null),cardSVG("A321",{n:1}),cardMini("A321",{n:0,gift:{from:"Spotter"}})];
                if (!cases.every(svg=>svg.includes('viewBox="0 0 420 588"')&&svg.includes("ATLAS OBLOHY"))
                    || !cases[1].includes("Neulovená") || !cases[3].includes("Darovaná kópia"))
                    throw Error("Karty nepoužívajú jednotný rám alebo správny stav");
                const realPost=apiPost;
                const stamp=Date.now();
                const body={hex:"def123",type:"B738",t:stamp};
                SOC.waveHex=body.hex;
                LS.set("ctl_wq",[{d:dayKey(),b:body}]);
                try{
                    apiPost=async (path)=> {
                        if(path!=="/api/wave")return realPost(path);
                        if(!LS.get("ctl_wq",[]).some(x=>x.b.hex===body.hex))
                            throw Error("Fronta zmizla ešte pred odpoveďou");
                        return new Response(JSON.stringify({ok:true,ver:0,why:"bez GPS"}));
                    };
                    await flushWq();
                    if(LS.get("ctl_wq",[]).length||!$("firstWaveResult").textContent.includes("Neoverený úlovok: bez GPS"))
                        throw Error("Ukončené overenie stále čaká");
                    LS.set("ctl_wq",[{d:"2000-01-01",b:{...body,t:946684800000}}]);
                    await flushWq();
                    if(LS.get("ctl_wq",[]).length||!$("firstWaveResult").textContent.includes("vypršal"))
                        throw Error("Vypršaná fronta nemá konečný stav");
                }finally{apiPost=realPost;LS.set("ctl_wq",[]);}
            }""")
            print("✓ spoločný rám aj stavy odloženého mávnutia")
            pg.evaluate("""() => {
                setView("col");
                if ($("c-types").querySelector(".albumDiscovery")) throw Error("Album prekrýva kartičky");
                delete COL.albums;
                COL.cx.legacy={al:"RYR",dc:"it",oc:"AT"};
                const albums=collectionAlbums();
                rememberAlbumCatch({al:"RYR",dc:"IT"},albums);
                rememberAlbumCatch({al:"WZZ",dc:"FR"},albums);
                rememberAlbumCatch({al:"UNKNOWN",dc:""},albums);
                delete COL.cx.legacy;
                if (Object.keys(albums.airlines).length!==2||!albums.destinations.IT||!albums.destinations.FR
                    ||albums.destinations.AT||Object.keys(albums.destinations).length!==2)
                    throw Error("Pas nerozlišuje cieľ letu alebo ráta objav dvakrát");
                $("c-types").querySelector('[data-m="sets"]').click();
                $("c-types").querySelector('[data-alb="al"]').click();
                const airline=$("c-types").querySelector(".albumDiscovery");
                if (!airline.textContent.includes("Ryanair")||!airline.textContent.includes("Wizz Air"))
                    throw Error("Chýbajú objavené aerolinky");
                $("c-types").querySelector('[data-alb="ct"]').click();
                const passport=$("c-types").querySelector(".albumDiscovery");
                if (!passport.textContent.includes("Taliansko")||!passport.textContent.includes("Francúzsko")
                    ||passport.textContent.includes("Rakúsko")||$("c-types").querySelector(".albumExtras").open)
                    throw Error("Pas alebo zbalené tematické sady vyzerajú nesprávne");
                if (passport.getBoundingClientRect().right>document.documentElement.clientWidth)
                    throw Error("Pas preteká mimo obrazovku");
                $("c-types").querySelector('[data-m="mine"]').click();
                if ($("c-types").querySelector(".albumDiscovery")) throw Error("Album ostal viditeľný v Moje");
            }""")
            print("✓ aerolinky a letecký pas, starší úlovok a zbalené sady")
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
