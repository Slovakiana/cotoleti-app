# Nedokončené odporúčania expertov (stav 27. 11. 2026, verzia 101)

## ▶ Stav 27. 11. 2026 – verzia 101 (prehľad pre ďalšiu prácu)

**Appka dnes:** 3 záložky – **Lov** (radar, hlavné lietadlo, osobný lov, Atlas SR, súťažný pulz s rivalom, týždenná misia Slovenska, liga a kraje, tímy), **Denník** (letecký denník a pas: krajiny, aerolinky, mapa sveta) a **Zbierka** (kartičky Collector Edition, Klenotnica, sady, edície, odznaky, profilová kartička „Moja obloha“, nastavenia, rodinné profily). Vesmír už nie je samostatná záložka. Ďalej privacy.html a rules.html.

**Kód:** 24 klasických skriptov so spoločným globálnym scope (core, ui, ar, space, weather, extras, account, social, atlas, wrapped, push, track, towns, catalog, cards, journal, mail, golden, teams, duel, sound, santa, brand, main) + server `server/worker.js` (Cloudflare Worker, SQLite Durable Object „Sky“, 46 API). Knižnice v `lib/`, písma v `fonts/`.

**Testy:** 15 node testov v `tests/` + Playwright `tests/smoke.py`, všetko v CI pri každom pushi (zelené). Verzia: `node tests/bump.mjs`.

**Premenné servera:** ADMIN_KEY · zdroje dát ADSB_LOL_API_KEY (+ limity), AIRPLANES_LIVE_ENABLED, ADSB_FI_ENABLED · piloty RELAY_PILOT (štafeta, predvolene zapnutá) a ACCOUNT_ROLLOUT (prihlásenie a záloha zbierky, odosielanie cez Resend – podrobnosti v RUNBOOK). A/B a lievik sú vypnuté.

**Pribudlo v63–v101:** Klenotnica, Collector Edition, osobný lov, Atlas liga, súťažný pulz, bezpečný reset hráčov (v68) a ochrana účtov po resete (v69), upozornenie pre WhatsApp, týždenná misia, Letecký denník a pas, kartičky aeroliniek a aeroklubov, nový radar so serverovým zdrojom, rytiny vzácnosti, štafeta, súkromie a pravidlá, výzva na prezývku, pilot účtu so zálohou, „Pozri hore“.

**Overené, že zostali opravy z 22. 11.:** level (lvlB, lvlWatch), edície vrátane Adventu a Vianoc, /api/planes, Mapa mávania, QR darček, odvolanie skrytého mena, Derby krajov, 3 profily, špeciálne nátery.

**Otvorené – majiteľ a testeri:**
- PLAN-V69-V72.md: ručný test WhatsApp na iPhone a Androide · odkaz 3–5 testerom bez návodu (zamietnutá poloha, výpadok siete) · vyhodnotiť štatistiky po bete · zvoliť cieľ týždennej misie v /admin (0 = vypnutá).
- TESTOVANIE-V66.md: scenáre pre testerov.
- Pilot účtu: overiť odosielaciu doménu a skutočné doručenie pred otvorením.
- Prevádzka: Workers Paid, UptimeRobot, notifikácie Cloudflare, TG_TOKEN/TG_CHAT · 2FA, ruleset, secret scanning · údaje prevádzkovateľa v súkromí, DPA · PR Santa do 5. 12., generálka 17. 12. (#santatest) · OZ, doména.

**Otvorené – Claude:**
- znova spustiť test „každý klik“ a iPhone SE / slabý signál na v101 (v r4 im došiel limit).
- Context7, Serena a Repomix tu nejdú nainštalovať (inštalácia balíkov je vypnutá); Context7 sa dá pripojiť ako konektor na claude.ai.

---


Plná verzia s tabuľkami: dokument „Čo to letí? – nedokončené odporúčania expertov“ (https://claude.ai/artifact/6HsNcvNfy2LqKf25hJvUHT).


## ▶ Stav 22. 11. 2026 – čo z tohto zoznamu ešte zostáva
Hotové zo starších sekcií: spoločné mávnutie · push séria v ohrození / ISS / legendárne lietadlo · sezóny so stupňami · „Letím“ · video odhalenia bez hudby · nápoveda ďalšej kartičky (štítky, hľadaná kartička dňa) · odpočet Santu, OG s mestom, Mikuláš, súhrn roka · automatická verzia + aktualizácia · odobrať kamaráta · offline fronta mávnutí · Dynamic Type, zatváranie okien, vzácnosť textom · štafeta, pondelkový súboj, album krajín, Daruj kópiu · testy servera, identity a odznakov v CI.

Claude – hotové 22. 11. večer (v53–v59): tichý režim (pozvaní, starosta) · písma, satellite.js a Leaflet lokálne · Playwright v CI + voliteľné nasadenie Pages po testoch · /api/planes + okrajová cache · fokus v modáloch · OpenSky typ/registrácia · Adoptuj obec, Derby krajov, Mapa mávania, /admin grafy, A/B · nočné/oblačné tlačidlo · odvolanie skrytého mena, LADD/PIA na serveri · darček cez QR, divízie po 30, lokálna vzácnosť · špeciálne nátery a prvé lety v /admin · oprava neplatného skriptu /admin.

Majiteľ – zostáva: Workers Paid, UptimeRobot, notifikácie, TG_TOKEN · passkey/2FA, ruleset, secret scanning · súkromie (meno, e-mail), DPA, abuse@ · PR Santa do 5. 12., OZ, doména · rozhodnutia (Spotter+, čo vidí kamarát).

## Otvorené po v80

- Pri úprave preveriť aj výpadok zdieľanej snímky `/api/planes` a návrat zo záložného zdroja. Chýbajúce dáta a chýbajúci názov v Atlase sú samostatné prípady.

## Otvorené po mobilnom playteste v88

- Hotové vo v91: karta ukáže vek poslednej známej polohy a skryje trasu a odpočet do najbližšieho priblíženia.

## Majiteľ
Workers Paid 5 $ · ADMIN_KEY · TG_TOKEN/TG_CHAT (Cloudflare + GitHub Secrets) · Cloudflare notifikácie · UptimeRobot · občianske združenie (2 %) · licencie dát pred zarábaním · vlastná doména.

## Do 5. 12. – Santa a PR
PR balík (tlačová správa, B-roll, demo #santatest) · TV/online médiá (uvádzať, že je to hra) · charita · odpočet od 1. 12. · rodinný tím + OG obrázok s mestom · Mikuláš · ročný súhrn „Slovensko 2026“.

## Január – rast a návraty
Spoločné mávnutie · Adoptuj obec · push ISS večer · push „séria v ohrození“ / legendárne lietadlo · derby krajov na obyvateľa · „Letím“ na letisku · nočný/oblačný režim hlavnej akcie · nápoveda ďalšej kartičky · mesačné sezóny · verejné počítadlo a heatmapa (k≥5) · video odhalenia shiny, video bez hudby · A/B testy · /admin grafy.

## Technika
Fonty a knižnice lokálne · jeden plánovač časovačov · /api/planes zdieľaná snímka · rebríčky cez edge cache · testy appky (Playwright v CI) · náhľadové nasadenie + nasadenie len pri zelených testoch · automatická verzia + toast „Nová verzia“ · fokus v modáloch · kamarátovi len počet.

## Biznis, školy, komunita
Sponzorované sezóny · Spotter+ · školský balík a liga · partnerstvá (SAV, hvezdárne, múzeum, IT Valley) · tlačené kartičky · kiosk pre letiská · ambasádori krajov · kalendár udalostí · stránka pre rodičov · Záber týždňa.

## Rozhodnutia
Úlovok len po Mávni? · čo vidí kamarát · kedy Spotter+ · doména.

## Vlna 3 – IT a bezpečnosť (zostáva)
Majiteľ: passkey/2FA (GitHub, Cloudflare, iCloud) · ruleset pre main · secret scanning + Dependabot alerts · Actions permissions Read · App len pre toto repo · meno prevádzkovateľa a e-mail do textu o súkromí · Cloudflare DPA, ROPA, DPIA · generálka 17. 12.
Claude: knižnice a fonty lokálne + SRI · /api/planes + edge cache rebríčkov · moduly servera a verzované migrácie · viac DO · liga podľa spotterov + shadow-ban · testy klienta a Playwright v CI · nasadenie len pri zelených testoch · výkon oblohy a AR · outbox offline · passkey · odobrať kamaráta · vlastná doména (WAF, Bot Fight) · podmienky, DSA pravidlá, bezpečnostná politika, prístupnosť, NIS2.

## UX/UI vlna (zostáva)
Dynamic Type (rem) · pull-to-refresh · zmenšovanie lišty pri scrolle · plávajúce „Mávni“ · modály (fokus, zatváracia animácia, swipe) · skeleton + radar sweep · rarita aj textom · design tokeny naplno (52 inline štýlov) · prázdna obloha: väčší okruh + mávnutie najbližšiemu · onboarding: živý počet lietadiel nad SR.

## Vlna 4 (zostáva)
Majiteľ: OZ v decembri · granty ESET/Orange/Erasmus+ 2027 · abuse@ e-mail a kontakt (DSA) · rešerš názvu + známka + .sk doména · pred monetizáciou OpenSky/CARTO/súhlasy · krízové vyhlásenia do Poznámok.
Claude: i18n (hu, cs, en) a CZ kraje · nahlásenie s dôvodom + ľudská kontrola + odvolanie · LADD/PIA aj na serveri, potvrdenie núdzového kódu · zberateľské sady a mesačné výzvy · liga na hráča a dedín · sezóny · encyklopédia, „včera nad domom“, dráha ISS · body na serveri · Twemoji v OG.

## Hotové 20. 11. 2026 (v21)
- Úlovok iba zamávaním (nie pasívne), min. 10° nad obzorom; „Dnes/Včera nad tebou“ (zazreté vs. ulovené)
- Server overuje lietadlo v 3 sieťach; ak ho nenájde, mávnutie prijme, ale nepočíta do ligy
- iCloud Private Relay (Cloudflare ASN 13335) už nie je považovaný za VPN
- Chyba mávania ukáže kód a zapíše sa do /api/err; mávnutie sa vtedy zaráta aspoň lokálne
- Fotky lietadiel len s menom fotografa (airport-data.com cez proxy)
- Splash obrazovky pre iPhony + samostatná maskable ikona

## Hotové 20. 11. 2026 (v22)
- Oprava mávania „401/auth“: starší používatelia s platným tokenom sa zaregistrujú bez limitu; limit nových zariadení na IP zvýšený na 40/deň (Private Relay, operátori)
- Chyba prihlásenia sa zapíše do /api/err a ukáže v kóde chyby
- Sezóny (Zima/Jar/Leto/Jeseň) bez mazania zbierky + odznak 100 b za sezónu
- Súboj kamarátov: mávnutia za týždeň overené serverom

## Hotové 20. 11. 2026 (v23)
- Spoločné mávnutie: kamarát zamával tomu istému lietadlu do 10 min → +2 body a odznak
- Push „🔥 séria v ohrození“ o 19:00 (kto včera mával a dnes ešte nie)
- Sviatočné výzvy: Mikuláš 6. 12., Deň civilného letectva 7. 12., Silvester, Štefánik 4. 5., SNP 29. 8. + odznaky
- Encyklopédia: neulovené lietadlo v atlase ukáže parametre, zaujímavosť a kde ho hľadať
- Preklady odložené – zatiaľ len slovenský trh

## Hotové 20. 11. 2026 (v24)
- Starosta oblohy: najaktívnejší spotter mesta v mesiaci (len overené mávnutia, deti bez mena) + odznak
- Pripomienka preletu ISS/Tiangong: appka vypočíta čas, server pošle upozornenie 5 min vopred (max 5 pripomienok)

## Hotové 20. 11. 2026 (v25)
- Dynamic Type: písmo sa riadi veľkosťou textu v iPhone + prepínač „Väčšie písmo“ v nastaveniach

## Hotové 20. 11. 2026 (v26)
- Úlovky overené serverom (tabuľka catches) – v súboji kamarátov
- Súhrn roka „Slovensko 2026 na oblohe“ (december–január, /api/year, zdieľanie /s/rok s vlastným obrázkom)
- Starosta oblohy počíta celý mesiac (tabuľka mayorm – denné tabuľky sa mažú)
- OG obrázky s mestom pre 10 najväčších miest (Santa aj „práve letí“)
- 🎬 6 s video s odhalením kartičky (shiny so žiarou), bez hudby, zdieľanie do TikTok/Reels
- Zostáva: knižnice a fonty priamo v appke (potrebuje sieť na stiahnutie súborov)

## Vlna 5 – 10 agentov preklikalo appku (21. 11. 2026) · hotové vo v27
- Po mávnutí 1 súhrnné oznámenie (body, odznak, výzva) namiesto 4–5 toastov; nová kartička sa odhalí s animáciou „Nová kartička! N. z 84“
- Pred mávnutím štítok: „🃏 Nová kartička č. 010“, „★★☆☆ ešte 2×“, „◆ Vzácne +15 b“, „🎯 Splní výzvu“, „📉 Je nízko“
- Séria sa ráta za mávnutie (nie za výzvy), ❄️ zmrazenie každých 7 dní (max 2), míľniky 3/7/14/30/60/100, čip 🔥 v hlavičke
- Prvá denná výzva vždy splniteľná; „ulov“ → „zamávaj“ všade, rodovo neutrálne texty, appka hovorí „ja“
- Zmena mesta ťukom na pilulku hore (GPS alebo mesto); ⚙️ v hlavičke Ja
- Atlas: 6 kartičiek + „Celý atlas“, záložka Sady s rozkliknutím (čo chýba), chýbajúce od najľahších, najnovšie úlovky prvé
- Liga: záložka 👯 Kamaráti, taby sa zalamujú, tvoj kraj aj mimo top 8
- 🚩 pri mene starostu a kamarátov; detský režim skryje kamarátov, tímy a súboje
- Toast hore, moment v 1 riadku, bez toastu cez úvod, tipovačka v riadku, denný kontrast skla, rozmazané pozadie modálov
- Odkazy od kamarátov čakajú, kým človek prejde úvodom (+ banner na úvode); pozvánka hovorí o zážitku; kľúč kamaráta platí 7 dní
- „📤 Pošli kamarátovi“ hneď po mávnutí; Santa sa 24. 12. sám ukáže ako hlavné lietadlo
- Prístupnosť: onboarding ako modálne okno, mená kartičiek pre VoiceOver, väčšie ťukacie plochy, skryté plávajúce tlačidlo mimo čítačky
- Bugy: [hidden] prekrývané CSS (🎬, pripomienka ISS), prázdna obloha zaseknutá na „Hľadám…“, offline mávnutia sa teraz naozaj odošlú, Moja obloha zdieľanie v in-app prehliadači, kompas sa nepýta pri štarte

### Zostáva z vlny 5 (väčšie)
- Cestovný pas (krajiny/mestá/aerolínie z trás), „Hľadá sa“ – lovené lietadlo dňa pre celé SR, spoločný týždenný cieľ Slovenska
- Sezónny pas s pečiatkami a odmenami, level odomyká veci (reakcie, rámy, tituly), prestíž po L20
- Feed úlovkov kamarátov s reakciou, pondelkový výsledok súboja, štafeta „pošli lietadlo ďalej“, „Letíš? Zamávajte mi“ pri letisku
- Hlavná karta kratšia (slot „Teraz“ namiesto čipov, detail letu ako panel), menší radar
- Jeden systém tlačidiel a zaoblení, jednotné zatváranie modálov, nadpisy h2 pre VoiceOver, „Jednoduchý režim“, vyhľadávanie v appke
- Mini kartičky ako vlastný náhľad, varianty (bežná/nočná/shiny) ako sloty, „Daruj kópiu“, „Tvoj štamgast“, rozlúčka s lietadlom

## Vlna 6 – gamifikácia kartičiek (21. 11. 2026) · hotové vo v28
- 5 stupňov vzácnosti ● Bežná / ◆ Nezvyčajná / ▲ Vzácna / ⬟ Epická / ♛ Legendárna (vzácnosť podľa typu, nie podľa prvého úlovku); exemplár OM-/vojenský o stupeň vyššie
- Server: úlovok s typom, registráciou a výškou nad obzorom (overený ≥ 8°), poradové číslo „#37 na Slovensku“, Objaviteľ (prvý v SR/kraji/meste), „Má ju X % hráčov“
- ✨ Shiny určuje server pre lietadlo a deň (rovnaké pre všetkých), šanca podľa vzácnosti
- Formy kartičky 🌙🌅🎯🏠❄️, pamäť prvého úlovku, aerolinky na kartičke, OM- registrácie + odznaky
- Nový vzhľad: tierové rámy, holo len v ilustrácii, zlatá legenda, mini kartičky, odhalenie „rub → otoč“ s napätím podľa stupňa, vitrína 3 kartičiek
- Katalóg: + L-410, C-27J, An-2, An-12, Phenom 300, Citation Excel, King Air, TBM 900, Caravan, G550; Su-95 von; trofejná polička (An-124, Beluga, Dreamlifter, F-35) mimo 100 %; číslovanie po stupňoch
- Albumy: Typy (19 sád, pokryjú celú sériu), Chvosty (aerolinky), Pečiatky (krajiny), Rekordy, Skryté sady s hádankou; odmena 1,5× hodnota sady; mesačná výzva „3 nové objavy“
- Edície „Bol som pri tom“ číslované serverom (Silvester, Nový rok, Valentín, Štefánik, zatmenie 2027, Perzeidy, SNP…) + Santa ročník
- Ekonomika: body c3/u8/r25/e45/l80 (×2 za nový typ), nová krivka levelov (50 mien, level sa pri prechode neznížil), limity na mávnutia, tipy, pozdravy a súboje; míle ✈ a obchod (zmrazenie, výmena výzvy, vitrína, kozmetické rámy)
- Liga „🃏 Atlasy“ – rebríček zberateľov v kraji podľa vzácnosti (overené serverom)
- Zlaté lietadlo bez žrebu: Zlatá posádka (zlatá kartička +25 b každému, spoločný bonus pri 20+), okno 40 min
- Séria mäkšia: rekord ostáva, oprava série 2 mávnutiami, týždeň X/7, pripomienka série len pri 3+ dňoch a dá sa vypnúť
- Súboj kartičiek: detský režim bez výziev, filter mien, len skutočné kartičky, obaja si vyberajú naslepo, kapacita pre nákladné, ★/shiny bonus, max. 3 odmenené výhry denne
- 🎁 Daruj kópiu (len overené duplikáty, bežné/nezvyčajné, od 7. dňa, max 3 denne) – darovaná kartička sa stane celou, keď jej zamávaš sám
- ♛ Legendárny poplach: push ľuďom do 80 km, keď nad SR letí epické/legendárne lietadlo

### Zostáva z vlny 6
- Výmena cez QR na mieste a „Dvor“ (burza triedy), rodinný/triedny spoločný atlas
- Divízie po 30 hráčoch v pásmach oblohy, domovské mesto na sezónu
- Lov špeciálnych náterov (treba overený zoznam registrácií), prvé lety z BTS/KSC a SIAF cez /admin (dátumy zadá majiteľ)
- Lokálna vzácnosť podľa kraja (z dát po pár týždňoch prevádzky)

## v36–v47 (3. preklikávací run, 10 agentov) – hotové
- KRITICKÉ: identita sa pri každom spustení menila (regex 30 vs. 26 znakov) → neoverené kartičky, viac účtov; séria dní sa každý deň vracala na 1.
- Overenie: zoznam podmienok v „Prečo?“, odložené mávnutia podľa polohy v čase mávnutia, upozornenie keď nízke lietadlo vystúpi, chip na overenie typu, prah 8/10°, jedno prihlásenie naraz.
- Texty: skloňovanie (pl, zam), jednotné názvy (lesklá, č. N na Slovensku, záložka Ja), ľudské dôvody, Vieš, že…?
- Deti a rodina: rodičovský PIN, rodinné profily, súboj na jednom mobile, rozstrel, odveta, týždenné skóre, výsledok súboja vyzývateľovi.
- Okná: zatváranie potiahnutím/ťuknutím vedľa, moment s vysvetlením a zmenšiteľným pásom, kompaktný iPhone SE.
- Liga: pravidlá, poradie a odstup, starosta po uzávierke + sieň slávy, ochrana pred skriptami, dôvod mimo zlatej posádky.
- Upozornenia: max. 4 denne, séria s číslom v obvyklom čase, predbehol ťa kamarát, 3 dni do konca starostu, vzácne lietadlo 1× denne (prepínač).
- Zbierka: hľadaná kartička dňa, 👀 dnes preletelo, strážca typu 🔔, popros kamaráta, výber do vitríny, rámy fungujú.
- Návyky: pečiatky Po–Ne, zmrazenie na viac dní, záchrana série, stupne sezóny, týždenný príbeh so Slovenskom.
- Zdieľanie: osobná kartička, IG bezpečné zóny, odkaz do schránky, /s/c a /s/g náhľady, štafeta „bude nad mestom“, uvítací darček, +100 míľ za pozvaného, súhrn roka obrázok.
- Výkon: plná pamäť, odložený zápis zbierky, posledná známa obloha, stav zdrojov, aktualizácia verzie, tests/bump.mjs.
- Nedá sa bez siete v build prostredí: lokálne satellite.js a písma (Google Fonts) – zostáva.

## v48–v52 (21.–22. 11. 2026) – hotové
- Atlasy: to isté meno len raz, rozloženie pečiatok a série, väčšie ťukacie plochy.
- Odznaky (audit 10 agentov): návod a pokrok, opravy udeľovania (široké, nákladné, vojenské, séria, sezóna, hľadaná, video, tím, súboj), doplatenie, viac odznakov v jednom toaste, tests/ach.test.mjs v CI.
- Atlas (rešerš 5 agentov): +52 kartičiek (146 spolu) – Zlín, Čmelák, Shark, Viper, Dynamic, biznis jety, Mi-24, Chinook, C-390, 777-9…; zlúčenie kódov typov (T_ALIAS), opravy faktov, vzácnosť server = appka.
