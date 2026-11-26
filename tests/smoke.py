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
            return route.fulfill(status=200, content_type="application/json", headers=h, body=json.dumps({**PLANES, "now": int(time.time()*1000), "src": "sky"}))
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
                    if (firstWaveNext(null)[1] !== "Hľadať ďalej") throw Error("Chýba ďalší krok pri prázdnej oblohe");
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
            assert pg.locator("#onbKid").is_checked()
            for slug, title in [("privacy.html", "Súkromie"), ("rules.html", "Pravidlá hry")]:
                legal = ctx.new_page()
                legal.goto(f"http://localhost:8799/{slug}")
                assert legal.locator("h1").inner_text() == title
                assert legal.locator('a[href^="mailto:radovan.kudela@icloud.com"]').first.is_visible()
                legal.close()
            # 2) appka po úvode
            pg.evaluate("localStorage.setItem('ctl_onb','1')")
            pg.reload()
            pg.wait_for_timeout(3000)
            for v in ["journal", "col", "now"]:
                pg.click(f'nav [data-v="{v}"]', timeout=5000)
                pg.wait_for_timeout(1200)
            pg.wait_for_function("""() => {
                const state = $("radarState");
                return state.dataset.state === "live" && SKY.paintedT === S.rawT && SKY.pts.length > 0;
            }""")
            pg.evaluate("""async () => {
                if(radarRequest)await radarRequest.promise;
                const saved={...S},fetchSource=tryCombo;
                const position={lat:48.15,lon:17.11,alt:0};
                const next={lat:48.73,lon:19.14,alt:0};
                const first=radarPositionKey(position);
                const live=saved.raw.find(item=>item.hex==="4ca123");
                let resolveOld;
                const delayed=new Promise(resolve=>{resolveOld=resolve});
                try{
                    tryCombo=async (i,q)=>{
                        if(i!==0)throw Error("fixture");
                        if(q.position===first)await delayed;
                        return {i,list:[{...live,hex:q.position===first?"abc123":"abc456"}],age:0,ms:0};
                    };
                    S.pos=position;
                    const old=fetchPlanes(true);
                    S.pos=next;
                    await fetchPlanes(true);
                    resolveOld();
                    await old;
                    if(S.raw[0]?.hex!=="abc456"||S.skyPosition!==radarPositionKey(next))
                        throw Error("Staršia odpoveď prepísala nový radar");
                    $("h-call").textContent="→ Budapešť";
                    $("h-route").classList.add("on");
                    $("h-eta").classList.add("on");
                    S.rawT=Date.now()-46e3;
                    tick(false);
                    if(!$("b-wave").disabled||!$("status").textContent.includes("Posledná známa")
                        || $("h-position-age").hidden || !$("h-position-age").textContent.includes("Posledná známa poloha")
                        || $("h-call").textContent.startsWith("→") || $("h-route").classList.contains("on")
                        || $("h-eta").classList.contains("on"))
                        throw Error("Zastaraná poloha pôsobí na karte ako živý let");
                    renderHeroStatic(S.top);
                    if(!$("b-wave").disabled)throw Error("Aktualizácia údajov povolila mávnutie starej polohe");
                    const delivered=Date.now();
                    S.rawT=delivered;
                    S.raw=[{...live,positionAt:delivered-31000}];
                    S.lastKnown=false;
                    if(enrich(delivered).length)throw Error("Stará poloha z čerstvej snímky zostala živá");
                    S.lastKnown=true;
                    const frozen=enrich(delivered)[0];
                    if(frozen?.lat!==live.lat||frozen?.lon!==live.lon)
                        throw Error("Posledná známa poloha sa ďalej posúva");
                    S.rawT=Date.now()-121000;
                    tick(false);
                    if(S.raw.length||!$("status").textContent.includes("nedostupné"))
                        throw Error("Stará snímka sa nezmazala");
                    const hidden=normReadsb({ac:[{hex:"aa123b",lat:48,lon:17,dbFlags:4,flight:"ABC1",r:"OM-AAA",ownOp:"Ukážka"}]})[0];
                    if(hidden.call||hidden.reg||hidden.op)throw Error("Záložný zdroj ukazuje súkromné údaje");
                }finally{
                    tryCombo=fetchSource;
                    Object.assign(S,saved);
                    tick(true);
                    await fetchPlanes(true);
                }
            }""")
            print("✓ zmena polohy počas načítavania, starý radar a súkromie záložného zdroja")
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
            pg.evaluate("""async () => {
                const saved={...S}, oldTown=LS.get("ctl_adopt","");
                try {
                    const flight=S.list.find(a=>a.type==="B738")||{hex:"4ca123",type:"B738",lat:48.17,lon:17.15};
                    S.top=flight;S.pos={lat:48.15,lon:17.11};
                    await openMap();
                    if(!Object.values(LMAP._layers).some(layer=>layer instanceof L.GeoJSON)
                        || !LLAYER.getLayers().some(layer=>layer instanceof L.Marker)
                        || Object.values(LMAP._layers).some(layer=>layer instanceof L.TileLayer))
                        throw Error("Mapa letu nepoužíva lokálny podklad alebo chýba lietadlo");
                    $("mapClose").click();
                    LS.set("ctl_adopt","Žilina");
                    await openHeat();
                    if(!LLAYER.getLayers().some(layer=>layer.getTooltip()?.getContent()==="Žilina")
                        || !$("map").getAttribute("aria-label").includes("mávania"))
                        throw Error("Adoptovaná obec na mape mávania chýba");
                    $("mapClose").click();
                }finally{LS.set("ctl_adopt",oldTown);Object.assign(S,saved)}
            }""")
            print("✓ mapa letu a adopcia obce fungujú na lokálnom podklade bez dlaždíc")
            pg.evaluate("""async () => {
                const {from,to}=weekBounds(Date.parse("2026-03-29T23:30:00Z"));
                if(from!=="2026-03-30"||to!=="2026-04-06")throw Error("Týždeň sa neposúva podľa Bratislavy");
                const saved={cx:COL.cx,types:COL.types,log:LOG,lastKnown:S.lastKnown,share:shareBlob};
                const p=weekBounds(Date.now(),true),t=Date.parse(p.from+"T12:00:00Z");
                try{
                    COL.cx={dummy:{ty:"B738",t}};
                    COL.types={B738:{n:1,first:t,forms:{n:t}}};
                    LOG=[{d:p.from,h:"abc111",ty:"A388",t:t/1000,r:"r"}];
                    S.lastKnown=true;
                    recordWeekObservations([{hex:"bb0001",el:45,type:"AT76"}]);
                    if(LOG.length!==1)throw Error("Stará poloha vytvorila pozorovanie");
                    openWrapped();
                    const model=WR.model;
                    if(model.hero.ty!=="B738"||model.hero.form!=="n"||model.observations!==1
                        || $("wshare").hidden || !document.querySelector(".weekHeroCard svg"))
                        throw Error("Súhrn uprednostnil pozorovanie pred kartou alebo zakázal zdieľanie");
                    const i=WR.i;
                    $("wnext").click();
                    if(WR.i===i||!$("wslides").children[0].hidden)throw Error("Súhrn sa nedá listovať");
                    let exported=null;
                    shareBlob=async(blob,name)=>{exported={blob,name};};
                    await $("wshare").onclick();
                    if (!exported || exported.name!=="moj-tyzden.png")throw Error("Týždeň sa nedá exportovať");
                    const image=await createImageBitmap(exported.blob);
                    if(image.width!==1080||image.height!==1920)throw Error("PNG nemá formát príbehu");
                    image.close();
                    $("wclose").click();
                }finally{COL.cx=saved.cx;COL.types=saved.types;LOG=saved.log;S.lastKnown=saved.lastKnown;shareBlob=saved.share}
            }""")
            print("✓ osobný týždeň, Bratislava, pôvodná forma a ručné listovanie")
            for width in (320, 390, 768):
                pg.set_viewport_size({"width": width, "height": 844})
                pg.evaluate("""() => {
                    const ids = ["hero", "nearCard", "huntHome", "compPulse", "weeklyMission"];
                    const bounds = id => $(id).getBoundingClientRect();
                    if (!ids.slice(1).every((id, i) => $(ids[i]).compareDocumentPosition($(id)) & Node.DOCUMENT_POSITION_FOLLOWING))
                        throw Error("Herné karty odsunuli zoznam lietadiel");
                    skySize();
                    if (Math.abs(SKY.cx - bounds("stage").width/2)>2 || SKY.R<72
                        || bounds("radarTitle").right>bounds("radarState").left
                        || bounds("stage").bottom>bounds("hero").top)
                        throw Error("Radar nie je vycentrovaný alebo prekrýva kartu a stav");
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
            pg.set_viewport_size({"width": 1024, "height": 768})
            pg.evaluate("""() => {
                const box=id=>$(id).getBoundingClientRect();
                if(box("stage").right>box("hero").left||box("nearCard").top<box("stage").bottom)
                    throw Error("Lov nemá na širokom okne radar a detail vedľa seba");
                setView("col");
                if(box("atlasSection").right>box("b-wrapped").left)
                    throw Error("Atlas a pokrok nie sú na iPade vedľa seba");
                const report=$("b-wrapped");
                report.focus();
                report.click();
                if(!$("wrap").classList.contains("on")||$("wrap").getAttribute("role")!=="dialog")
                    throw Error("Súhrn nemá konzistentný vstup do dialógu");
                $("wclose").click();
                const saved=LOG;
                try{
                    LOG=[{t:Math.floor(Date.now()/1000),ty:"A320"}];
                    setView("journal");
                    if(!$("journalRecent").textContent.includes("A320"))
                        throw Error("V Denníku chýba zaznamenané pozorovanie");
                    if(box("journalRecent").right>document.documentElement.clientWidth)
                        throw Error("Pozorovania presahujú displej");
                    $("b-wrapped-journal").click();
                    if(!$("wrap").classList.contains("on"))throw Error("Týždeň sa z Denníka neotvoril");
                    $("wclose").click();
                }finally{LOG=saved}
                setView("col");
            }""")
            pg.set_viewport_size({"width": 390, "height": 844})
            pg.evaluate("""() => {
                if(S.view!=="col"||$("b-wrapped").getBoundingClientRect().top<$("atlasSection").getBoundingClientRect().bottom)
                    throw Error("Po zúžení okna sa nezachovala záložka a poradie Zbierky");
                setView("now");
            }""")
            print("✓ iPad na šírku, návrat na mobil a zdieľaný týždeň z Denníka aj Zbierky")
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
            pg.evaluate("""async () => {
                const h=$("cardBig").querySelector("h2");
                const illustration=$("cardBig").querySelector(".holoWrap svg");
                if (h.textContent!=="Boeing 737-800" || !illustration.textContent.includes("ATLAS OBLOHY")
                    || !COL.types.B738.ver || COL.types.B738.n!==1)
                    throw Error("Odhalenie nesedí s overeným úlovkom");
                const w=illustration.getBoundingClientRect();
                if (w.left<0 || w.right>document.documentElement.clientWidth)
                    throw Error("Kartička preteká na 320 px");
                const first=COL.types.B738;
                first.forms={...first.forms,n:100,g:200};
                first.coverForm="-";
                openCard("B738",undefined,"n");
                const root=$("cardBig"),form=()=>root.querySelector(".holoWrap svg").dataset.cardForm;
                if(form()!=="n"||first.coverForm!=="-")throw Error("Odhalenie zmenilo uložený vzhľad");
                const golden=root.querySelector('[data-card-form-choice="g"]');
                golden.click();
                if (form()!=="g" || golden.getAttribute("aria-pressed")!=="true"
                    || LS.get("ctl_col",{}).types.B738.coverForm!=="g"
                    || !root.querySelector(".holoWrap image").getAttribute("href").includes("/g.webp"))
                    throw Error("Výber formy nezmenil ilustráciu alebo sa neuložil");
                if (root.querySelector('[data-card-form-choice="z"]'))throw Error("Zamknutá forma sa dá vybrať");
                openCard("B738");
                if (form()!=="g")throw Error("Pri opätovnom otvorení sa stratil zvolený vzhľad");
                const parsed=document.createElement("template");
                for(const [n,level] of [[1,1],[5,2],[20,3],[60,4]]){
                    parsed.innerHTML=cardSVG("B738",{...first,n,shiny:1});
                    const card=parsed.content.firstElementChild;
                    if (+card.dataset.cardLevel!==level || card.dataset.cardTier!=="c" || card.dataset.cardForm!=="g"
                        || card.querySelectorAll('[data-level-star="earned"]').length!==level
                        || card.querySelectorAll('[data-level-star="empty"]').length!==4-level
                        || !card.querySelector("[data-card-foil]") || !card.textContent.includes("LESKLÁ"))
                        throw Error("Forma, vzácnosť, lesk alebo hviezdy sa na kartičke stratili");
                }
                parsed.innerHTML=cardSVG("A388",null,{artHref:""});
                if (parsed.content.querySelector("[data-level-star],[data-card-foil]"))
                    throw Error("Zamknutá kartička vyzerá ako získaná");
                const testTiers=["A320","AT76","A388","F16","B779"];
                for(const type of testTiers){
                    const sample=document.createElement("div");
                    sample.style.cssText="position:fixed;visibility:hidden;width:220px";
                    sample.innerHTML=cardSVG(type,{n:1},{artHref:""});
                    document.body.append(sample);
                    const text=sample.querySelector("[data-card-tier-label]");
                    const box=text.getBBox();
                    if (box.x+box.width>385) throw Error("Štítok vzácnosti preteká z rámu");
                    sample.remove();
                }
                const social=SOC.data;
                SOC.data={relay:[{type:"B738",k:"TT",other:"TN",t:Date.now()}]};
                try{
                    parsed.innerHTML=cardSVG("B738",{...first,ver:1},{artHref:""});
                    if (!parsed.content.querySelector("[data-relay-seal]"))
                        throw Error("Overená štafeta v kartičke chýba");
                }finally{SOC.data=social}
                const svg=await cardExportSVG("B738",shownCard(first),{public:true});
                if (new DOMParser().parseFromString(svg,"image/svg+xml").querySelector("parsererror"))
                    throw Error("Export kartičky neobsahuje platné SVG");
                if (!svg.includes('href="data:image/webp;base64,') || !svg.includes("Zlatá hodinka"))
                    throw Error("Export nepriložil ilustráciu zvolenej formy");
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
                if(S.view!=="col"||!$("c-types").querySelector('[data-k="B738"] [data-card-form="g"]'))
                    throw Error("Prvý úlovok alebo zvolená forma chýba v Zbierke");
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
                    || cardStarMilestone("B738",{n:5})!==2 || cardStarMilestone("B738",{n:6})!==0
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
            pg.evaluate("""async () => {
                setView("col");
                delete COL.albums;
                const t=Date.now();
                COL.cx.legacy={t,al:"RYR",dc:"it",oc:"AT",dest:"Rím",call:"RYR12"};
                const albums=collectionAlbums();
                const duplicate=rememberAlbumCatch({al:"RUK",dc:"IT"},albums,true);
                const fresh=rememberAlbumCatch({t,al:"WMT",dc:"FR",oc:"AT",dest:"Paríž",call:"WMT123"},albums,true);
                rememberAlbumCatch({al:"UNKNOWN",dc:""},albums,true);
                delete COL.cx.legacy;
                if (duplicate.length||fresh.length!==2||Object.keys(albums.airlines).length!==2||
                    !albums.destinations.IT||!albums.destinations.FR||albums.destinations.AT)
                    throw Error("Pas alebo alias aerolinky ráta objav dvakrát");
                $("c-types").querySelector('[data-m="sets"]').click();
                if ($("c-types").querySelector('[data-alb="al"],[data-alb="ct"],.journalMapCard'))
                    throw Error("Denník sa duplikuje v zbierke");
                journalWaveReward(fresh);
                if ($("waveJournalResult").hidden||!$("waveJournalResult").textContent.includes("2 nové objavy"))
                    throw Error("Na mávnutí chýba vstup do Denníka");
                $("waveJournalResult").click();
                await journalAssets.world.pending;
                const host=$("journalAlbum");
                const map=host.querySelector(".journalMapStage svg");
                if (S.view!=="journal"||!map?.querySelector('[data-journal-entry="FR"].fresh .journalPulse')||
                    !map.querySelector('[data-journal-entry="IT"]')||map.querySelector('[data-journal-entry="AT"]')||
                    !host.textContent.includes("Taliansko")||!host.textContent.includes("Francúzsko")||
                    host.querySelector(".albumExtras").open||albums.destinations.FR.fresh)
                    throw Error("Mapa, jednorazové odhalenie alebo historické pečiatky vyzerajú nesprávne");
                host.querySelector('[data-journal-map="europe"]').click();
                if (!(host.querySelector(".journalMapStage svg").viewBox.baseVal.width<500))
                    throw Error("Mapa sa nepriblížila na Európu");
                const stamp=host.querySelector('button[data-journal-entry="FR"]');
                stamp.click();
                if (!$("journalDetail").open||$("journalDetailTitle").textContent!=="Francúzsko"||
                    !$("journalDetailBody").textContent.includes("WMT123"))
                    throw Error("Pečiatka stratila detail prvého letu");
                $("journalDetail").close();
                document.querySelector('[data-journal="al"]').click();
                await journalAssets.brands.pending;
                if (host.querySelector('.journalBrand.owned[data-journal-entry="RYR"] .journalMonogram')?.textContent!=="RYR"||
                    host.querySelector('.journalBrand.fresh[data-journal-entry="WZZ"] .journalMonogram')?.textContent!=="WZZ"||
                    host.querySelector(".journalBrand img")||!host.textContent.includes("Wizz Air"))
                    throw Error("Album neukázal typografické značky a nové odhalenia");
                host.querySelector('button[data-journal-entry="RYR"]').click();
                if (!$("journalDetailBody").textContent.includes("Waterford")||
                    !$("journalDetailBody").querySelector(".journalSource"))
                    throw Error("Kartička aerolinky nemá zaujímavosť");
                $("journalDetail").close();
                host.querySelector('[data-journal-filter="all"]').click();
                for(const code of ["MSC","MNE","AXE","TVS","PGT","KMM","UZB"]){
                    if(host.querySelector('[data-journal-entry="'+code+'"] .journalMonogram')?.textContent!==code)
                        throw Error("V katalógu chýba značka dopravcu "+code);
                }
                for(const code of ["JAL","LOT","KMM","UZB"]){
                    host.querySelector('button[data-journal-entry="'+code+'"]').click();
                    if(!$("journalDetailBody").querySelector(".journalFact")||!$("journalDetailBody").querySelector(".journalSource"))
                        throw Error("V katalógu chýba zaujímavosť alebo zdroj dopravcu "+code);
                    $("journalDetail").close();
                }
                if (host.querySelector(".journalAirlines").getBoundingClientRect().right>document.documentElement.clientWidth)
                    throw Error("Album preteká mimo obrazovku");
                journalFilter="mine";
                setView("col");
                $("c-types").querySelector('[data-m="mine"]').click();
            }""")
            for width in (320, 1440):
                pg.set_viewport_size({"width": width, "height": 900})
                pg.evaluate("""(width) => {
                    journalMode="ct";
                    setView("journal");
                    const page=$("v-journal").getBoundingClientRect();
                    const map=$("journalAlbum").querySelector(".journalMapStage").getBoundingClientRect();
                    const album=$("journalAlbum");
                    const side=album.querySelector(".journalStampList,.journalEmpty").getBoundingClientRect();
                    const fits=page.left>=12&&page.right<=width-12&&map.height<=431&&map.right<=page.right;
                    const expected=width<880?Math.abs(map.width-page.width)<=3:side.left>map.right;
                    if(!fits||!expected)throw Error("Denník alebo mapa preteká pri "+width+" px");
                    journalMode="al";
                    renderJournal();
                    const cards=$("journalAlbum").querySelectorAll(".journalBrand");
                    if(cards.length<2||cards[0].getBoundingClientRect().top!==cards[1].getBoundingClientRect().top)
                        throw Error("Dve logá sa nezmestia vedľa seba pri "+width+" px");
                    setView("col");
                }""", width)
            pg.set_viewport_size({"width": 390, "height": 844})
            pg.emulate_media(reduced_motion="reduce")
            pg.evaluate("""async () => {
                const aircraft={hex:"aa123b",call:"QFA123",el:25,type:"B789"};
                let complete;
                S.meta.set(aircraft.hex,{call:aircraft.call,pending:new Promise(resolve=>{complete=resolve;})});
                waveBatchStart(aircraft.hex);
                SOC.waveHex=aircraft.hex;
                tryCatch(aircraft);
                waveBatchEnd();
                S.meta.set(aircraft.hex,{call:aircraft.call,route:{callsign_icao:aircraft.call,
                  origin:{country_iso_name:"AT"},destination:{country_iso_name:"AU",municipality:"Sydney",iata_code:"SYD"}}});
                complete();
                await new Promise(resolve=>setTimeout(resolve,0));
                if (COL.cx[aircraft.hex].dc!=="AU"||!COL.albums.destinations.AU)
                    throw Error("Neskorá trasa nedoplnila pas");
                journalMode="ct";
                setView("journal");
                const glow=$("journalAlbum").querySelector('[data-journal-entry="AU"].fresh .journalPulse');
                if(!glow||getComputedStyle(glow).animationName!=="none")
                    throw Error("Mapa nerešpektuje obmedzenie pohybu");
                if(catchAirline({call:"SAF123"},{callsign_icao:"SAF123",airline:{icao:"SAF",name:"Test Airways"}}).an!=="Test Airways"||
                    catchAirline({call:"SAF123"},{callsign_icao:"SAF124",airline:{icao:"SAF",name:"Test Airways"}}).an)
                    throw Error("Katalóg nerozlišuje overený ICAO kód a cudziu trasu");
                setView("col");
            }""")
            pg.emulate_media(reduced_motion="no-preference")
            print("✓ mapa, logá, prvý úlovok, oneskorená trasa a obmedzenie pohybu")
            pg.evaluate("""() => {
                const aircraft={hex:"abc149",type:"ZZZZ",el:28};
                S.meta.set(aircraft.hex,{ac:{mode_s:"abc148",icao_type:"M600"}});
                if(planeType(aircraft)||planeType({...aircraft,priv:true})||normalizeType("UNKN"))
                    throw Error("Typ sa nesmie doplniť z iného lietadla alebo z náhradného kódu");
                waveBatchStart(aircraft.hex);
                tryCatch({...aircraft,type:""});
                WB.result="Overený úlovok";
                waveBatchEnd();
                if (!$("firstWaveResult").textContent.includes("typ lietadla sa nepodarilo určiť"))
                    throw Error("Chýba vysvetlenie neznámeho typu");
                const n=COL.n,pts=COL.pts;
                S.meta.set(aircraft.hex,{ac:{mode_s:"ABC149",icao_type:" m600 "}});
                const type=planeType(aircraft);
                if(type!=="M600"||planeType({...aircraft,priv:true})||planeType({...aircraft,type:"at45"})!=="AT43")
                    throw Error("Chybné poradie zdrojov typu");
                waveBatchStart(aircraft.hex);
                tryCatch({...aircraft,type});
                tryCatch({...aircraft,type});
                waveBatchEnd();
                if(COL.cx[aircraft.hex].ty!==type||COL.types[type].name!=="Piper M600"
                    ||COL.types[type].n!==1||COL.n!==n||COL.pts!==pts)
                    throw Error("Doplnenie typu zmenilo počet úlovkov alebo body");
            }""")
            print("✓ dohľadanie typu podľa transpondéra a doplnenie zaznamenaného úlovku")
            pg.evaluate("""() => {
                const [glider]=normReadsb({ac:[{hex:"abc150",t:"GLID",lat:48.15,lon:17.11,alt_baro:2000}]});
                for(const [mode_s,type] of [["abc151","L-13 BLANIK"],["abc150","L-23 Super Blanik"]]){
                    S.meta.set(glider.hex,{ac:{mode_s,icao_type:"GLID",type}});
                    if(planeType(glider)) throw Error("Iný vetroň dostal kartičku Blaníka");
                }
                S.meta.set(glider.hex,{ac:{mode_s:glider.hex,icao_type:"GLID",type:"L-13 BLANIK"}});
                if(planeType(glider)!=="BL13"||planeType({...glider,priv:true})||planeType({...glider,type:"L13S"})!=="L13S")
                    throw Error("Modely vetroňov sa zamenili alebo unikli súkromné údaje");
                for(const code of ["Z43","BL13","L13S","C140","D328","M600"]){
                    openLocked(code);
                    if(!$("cardBig").querySelector(".lockSil svg")||!$("cardBig").textContent.includes(CAT[code].fact))
                        throw Error("Chýba karta Atlasu "+code);
                    $("cardClose").click();
                }
                const extras=cardExtras("BL13",{n:1});
                if(!extras.includes(CAT.BL13.fact)||extras.includes("Dolet")||CAT.B3XM.year!==2021)
                    throw Error("Nesprávne údaje v kartičke");
            }""")
            print("✓ aeroklubové karty a rozlíšenie vetroňov")
            src = pg.evaluate("S.src||''")
            if "Čo to letí" not in src:
                errs.append("lietadlá neprišli z vlastného servera: " + src)
            ok = pg.evaluate("""async () => {
                await document.fonts.load("16px Inter");
                return document.fonts.check("16px Inter");
            }""")
            if not ok:
                errs.append("písmo Inter sa nenačítalo z appky")
            # Prezývka sa ukladá samostatne, ešte pred prvým mávnutím.
            nick_ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                                     geolocation={"latitude": 48.15, "longitude": 17.11}, permissions=["geolocation"])
            nick_ctx.route("**/*", stub)
            profile = {"name": "Spotter", "managed": False, "kid": False}
            nick_ctx.route("**/api/hello", lambda route: route.fulfill(json={
                "tok": "test-nick-token", "pid": "test-profile", "fk": "test-key", "epoch": 0, "nickname": profile
            }, headers={"access-control-allow-origin": "*"}))
            def save_nickname(route):
                body = json.loads(route.request.post_data)
                assert body["tok"] == "test-nick-token"
                profile.update(name=body["nick"], managed=True)
                route.fulfill(json={"ok": True, "nick": profile["name"]}, headers={"access-control-allow-origin": "*"})
            nick_ctx.route("**/api/nick", save_nickname)
            nick_page = nick_ctx.new_page()
            nick_page.on("pageerror", lambda e: errs.append("PAGEERROR prezývka " + str(e)))
            nick_page.add_init_script("localStorage.setItem('ctl_onb','1')")
            nick_page.goto("http://localhost:8799/index.html")
            nickname_dialog = nick_page.locator("#nickDialog")
            nickname_dialog.wait_for(state="visible")
            nick_page.locator("#nickLater").click()
            assert not nickname_dialog.is_visible()
            nick_page.evaluate("() => lsFlush()")
            nick_page.reload()
            nick_page.wait_for_function("() => SOC.authVerified")
            nick_page.wait_for_timeout(1700)
            assert not nickname_dialog.is_visible()
            nick_page.evaluate("() => { LS.set('ctl_nick_prompt',0); scheduleNicknamePrompt(); }")
            nickname_dialog.wait_for(state="visible")
            nick_page.locator("#nick").fill("  sPoTtEr  ")
            nick_page.locator("#nickSave").click()
            assert "inú prezývku" in nick_page.locator("#nickStatus").inner_text()
            nick_page.locator("#nick").fill("Vetronár")
            nick_page.locator("#nickSave").click()
            nickname_dialog.wait_for(state="hidden")
            assert nick_page.evaluate("() => LS.get('ctl_nick','')") == "Vetronár"
            nick_page.evaluate("() => { LS.set('ctl_nick',''); lsFlush(); }")
            nick_page.reload()
            nick_page.wait_for_function("() => LS.get('ctl_nick','') === 'Vetronár'")
            assert not nickname_dialog.is_visible()
            nick_page.evaluate("() => { setView('col'); $('settings').open=true; }")
            nick_page.locator("#nickEdit").click()
            assert nick_page.locator("#nick").input_value() == "Vetronár"
            nick_page.locator("#nickLater").click()
            profile.update(name="", managed=False, kid=True)
            nick_page.evaluate("() => { LS.set('ctl_kid',true); lsFlush(); }")
            nick_page.reload()
            nick_page.wait_for_function("() => SOC.profileNickname?.kid")
            assert not nickname_dialog.is_visible()
            assert nick_page.locator("#nickSettings").is_hidden()
            nick_ctx.close()
            print("✓ výzva pre Spotter, uloženie a zmena prezývky, obnovenie zo servera a detský režim")
            # Nový prehliadač najprv načíta pozvánku bez registrácie a potom obnoví ten istý účet.
            account_ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                                        user_agent="Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile WhatsApp/2.25.2")
            account_ctx.route("**/*", stub)
            account_ctx.route("**/api/account/status", lambda route: route.fulfill(json={"rollout": "public"},
                              headers={"access-control-allow-origin": "*"}))
            old_id = "v2existingaccountfixture1234"
            old_tok = "original-account-token"
            starts, restores, hellos = [], [], []
            snapshot = {"ctl_col": {"hex": {}, "types": {"A320": {"n": 1}}, "pts": 60, "mi": 21, "n": 1, "ach": {}},
                        "ctl_log": [{"type": "A320"}], "ctl_nick": "Vetronár"}
            def account_start(route):
                starts.append(json.loads(route.request.post_data))
                route.fulfill(json={"challenge": "mock-challenge"}, headers={"access-control-allow-origin": "*"})
            def account_finish(route):
                restores.append(json.loads(route.request.post_data))
                route.fulfill(json={"id": old_id, "tok": old_tok, "pid": "original-profile", "fk": "test-key",
                                    "epoch": 0, "rev": 2, "backup": snapshot},
                              headers={"access-control-allow-origin": "*"})
            def account_hello(route):
                hellos.append(json.loads(route.request.post_data))
                route.fulfill(json={"tok": old_tok, "pid": "original-profile", "fk": "test-key", "epoch": 0,
                                    "nickname": {"name": "Vetronár", "kid": False, "managed": True}},
                              headers={"access-control-allow-origin": "*"})
            account_ctx.route("**/api/account/start", account_start)
            account_ctx.route("**/api/account/finish", account_finish)
            account_ctx.route("**/api/hello", account_hello)
            account_page = account_ctx.new_page()
            account_page.on("pageerror", lambda e: errs.append("PAGEERROR konto " + str(e)))
            account_page.goto("http://localhost:8799/index.html?r=ABCDEFGHIJKLMNOP")
            account_page.locator("#accountOnboarding").wait_for(state="visible")
            account_page.wait_for_function("() => accountNeedsChoice()")
            assert not hellos
            account_page.locator("#accountOnboarding").click(force=True)
            account_page.locator("#accountEmail").fill("pilot@example.com")
            account_page.locator("#accountContinue").click()
            account_page.locator("#accountCode").fill("12345678")
            with account_page.expect_navigation():
                account_page.locator("#accountContinue").click()
            account_page.wait_for_function("() => SOC.authVerified && COL.pts === 60 && COL.mi === 21")
            assert account_page.evaluate("() => LS.get('ctl_log',[])[0].type") == "A320"
            assert account_page.evaluate("() => LS.get('ctl_ref','')") == "ABCDEFGHIJKLMNOP"
            assert account_page.evaluate("() => LS.get('ctl_cid','')") == old_id
            assert starts == [{"mode": "login", "email": "pilot@example.com"}]
            assert restores == [{"mode": "login", "challenge": "mock-challenge", "code": "12345678"}]
            assert hellos and all(hello["id"] == old_id for hello in hellos)
            print("✓ vstup z WhatsAppu nevytvorí nový účet a obnoví pôvodnú zbierku i pozvánku")
            account_ctx.close()
            atlas_ctx = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True,
                                      geolocation={"latitude": 48.15, "longitude": 17.11}, permissions=["geolocation"])
            atlas_ctx.route("**/*", stub)
            rank = {"sc": 40, "rank": 24, "n": 8, "gap": 3}
            def serve_atlas(route):
                data = json.loads(route.request.post_data or "{}")
                assert data.get("k", "") == ""
                route.fulfill(json={"top": [{"nick": "Vetronár", "rank": 1, "sc": 500}],
                                    "me": rank, "nearby": [
                                        {"nick": "Súper", "rank": rank["rank"] - 1, "sc": rank["sc"] + rank["gap"]},
                                        {**rank, "me": True}
                                    ]}, headers={"access-control-allow-origin": "*"})
            atlas_ctx.route("**/api/atlasy", serve_atlas)
            atlas_page = atlas_ctx.new_page()
            atlas_page.on("pageerror", lambda e: errs.append("PAGEERROR Atlas SR " + str(e)))
            atlas_page.add_init_script("localStorage.setItem('ctl_onb','1')")
            atlas_page.goto("http://localhost:8799/index.html")
            atlas_page.wait_for_function("() => $('atlasQuickPlace').textContent.includes('24. miesto')")
            assert "4 b" in atlas_page.locator("#atlasQuickPlace").inner_text()
            atlas_page.locator("#atlasQuick").click()
            atlas_page.locator("#atlasRankDialog").wait_for(state="visible")
            assert "24." in atlas_page.locator("#atlasNearby").inner_text()
            assert "Vetronár" in atlas_page.locator("#atlasPodium").inner_text()
            atlas_page.locator("#atlasRankClose").click()
            rank.update(sc=48, rank=22, n=9, gap=5)
            atlas_page.evaluate("() => reportFirstWave({ver:1,atlasPoints:8,type:'A320'})")
            atlas_page.wait_for_function("() => $('atlasWaveText').textContent.includes('24. → 22.')")
            atlas_page.evaluate("() => setView('col')")
            atlas_page.locator("#atlasCollection").click()
            assert "22." in atlas_page.locator("#atlasMineText").inner_text()
            atlas_ctx.close()
            print("✓ Atlas SR z Lovu aj Zbierky, najbližší súper a okamžitý posun po overenom type")
            brand_ctx = b.new_context(viewport={"width": 320, "height": 660}, is_mobile=True,
                                       geolocation={"latitude": 48.15, "longitude": 17.11}, permissions=["geolocation"])
            brand_ctx.route("**/*", stub)
            brand_page = brand_ctx.new_page()
            brand_page.on("pageerror", lambda e: errs.append("PAGEERROR značka " + str(e)))
            brand_page.goto("http://localhost:8799/index.html")
            brand_page.locator("#onbTitle").wait_for(state="visible")
            assert brand_page.locator("#onbTitle").inner_text() == "Pozri hore."
            assert brand_page.locator("#go").inner_text() == "Otvoriť radar"
            brand_page.evaluate("localStorage.setItem('ctl_onb','1')")
            brand_page.reload()
            brand_page.evaluate("""() => {
                LS.set("ctl_nick","Vetronár");
                LS.set("ctl_kid",false);
                COL.types.A320={n:1,ver:1,name:"Airbus A320",first:Date.now()};
                COL.n=1;
                setView("col");
            }""")
            assert brand_page.locator("#spotterIdentityName").inner_text() == "Vetronár"
            assert brand_page.locator("#spotterTypes").inner_text() == "1"
            brand_page.locator("#spotterOpen").click()
            assert brand_page.locator("#spotterPreviewName").inner_text() == "Moja obloha"
            brand_page.locator("#spotterShareName").check()
            assert brand_page.locator("#spotterPreviewName").inner_text() == "Vetronár"
            brand_page.locator("#spotterClose").click()
            brand_page.locator("#spotterOpen").click()
            assert brand_page.locator("#spotterPreviewName").inner_text() == "Moja obloha"
            brand_page.evaluate("""() => {
                window.testedSpotterCard = null;
                shareBlob=async (blob,name,text)=>{
                    const image=await createImageBitmap(blob);
                    window.testedSpotterCard={name,text,width:image.width,height:image.height};
                    image.close();
                };
            }""")
            brand_page.locator("#spotterShare").click()
            brand_page.wait_for_function("() => testedSpotterCard")
            export = brand_page.evaluate("() => testedSpotterCard")
            assert export["name"] == "moja-obloha.png" and export["width"] == 1080 and export["height"] == 1350
            assert "Vetronár" not in export["text"] and "Pozri hore." in export["text"]
            brand_page.evaluate("""() => { LS.set("ctl_kid",true); kidApply(); }""")
            assert brand_page.locator("#spotterOpen").is_hidden()
            assert brand_page.locator("#spotterIdentityName").inner_text() == "Môj profil"
            brand_ctx.close()
            print("✓ značka pri vstupe, profilová kartička, predvolené súkromie, PNG a detský režim")
            b.close()
    finally:
        srv.terminate()
    if errs:
        print("\n".join(errs[:20]))
        sys.exit(1)
    print("✓ appka sa spustí a záložky fungujú bez chyby")

main()
