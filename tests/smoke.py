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
            # 2) appka po úvode
            pg.evaluate("localStorage.setItem('ctl_onb','1')")
            pg.reload()
            pg.wait_for_timeout(3000)
            for v in ["journal", "col", "now"]:
                pg.click(f'nav [data-v="{v}"]', timeout=5000)
                pg.wait_for_timeout(1200)
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
                if (!host.querySelector('.journalBrand.owned[data-journal-entry="RYR"] img')||
                    !host.querySelector('.journalBrand.fresh[data-journal-entry="WZZ"] img')||
                    !host.textContent.includes("Wizz Air"))
                    throw Error("Album neukázal skutočné logá a nové odhalenia");
                host.querySelector('button[data-journal-entry="RYR"]').click();
                if (!$("journalDetailBody").textContent.includes("Waterford")||
                    !$("journalDetailBody").querySelector(".journalSource"))
                    throw Error("Kartička aerolinky nemá zaujímavosť");
                $("journalDetail").close();
                host.querySelector('[data-journal-filter="all"]').click();
                for(const code of ["MSC","MNE","AXE","TVS","PGT","KMM","UZB"]){
                    if(!host.querySelector('[data-journal-entry="'+code+'"] img'))
                        throw Error("V katalógu chýba logo dopravcu "+code);
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
                    if(page.left<12||page.width>880||map.height>431||Math.abs(map.width-page.width)>3)
                        throw Error("Denník alebo mapa preteká pri "+width+" px");
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
            b.close()
    finally:
        srv.terminate()
    if errs:
        print("\n".join(errs[:20]))
        sys.exit(1)
    print("✓ appka sa spustí a záložky fungujú bez chyby")

main()
