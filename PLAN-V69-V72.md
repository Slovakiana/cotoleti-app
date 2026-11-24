# Plán vydaní v69–v72 – beta testovanie

> Stav aktualizovať pri každom PR. **Nič z tohto plánu nie je automatickým súhlasom na produkčné nasadenie ani vymazanie dát.**
> Aktuálna produkčná vetva pred začiatkom: v68, commit `8cf6fd4`.

## v69 – Bezpečný štart bety

### Časť A: integrita účtov a reset (teraz)
- [x] Analýza: starý podpis hráčskeho tokenu môže prežiť `/api/admin` globálny reset.
- [x] Po resete zakázať automatické znovuvytvorenie vymazaného účtu zo starého tokenu (bez zmeny podpisu fungujúcich účtov).
- [x] Regresné testy: zmazaný účet nevznikne zo starého tokenu; nový účet funguje; opakovaný reset nezrekonštruuje účty; podpisy už existujúcich tokenov sa nemenia.
- [x] Kompletné CI na vetve + pull request – PR #15 (časť A, pred pridaním B).
- [ ] Kontrola a vedomé schválenie produkčného nasadenia.
- [ ] Po nasadení overiť Cloudflare Worker samostatne.

### Časť B: vstup z WhatsAppu
- [x] Detekovať WhatsApp a ďalšie identifikovateľné in-app prehliadače (UA/referrer; niektoré iOS prehliadače neidentifikovateľné).
- [x] Pred prvým úlovkom upozorniť na riziko novej identity a ponúknuť skopírovanie odkazu do Safari/Chrome.
- [x] Pridať automatizované testy pre iPhone/Android UA, bežný prehliadač a zobrazenie pred prvým mávnutím.
- [ ] Ručný test na skutočnom iPhone a Androide s WhatsAppom.
- [ ] Zelené CI po časti B, kontrola a schválenie nasadenia.

### Časť C: synchronizácia účtu a strata spojenia
- [x] Pri štarte a návrate online overiť generáciu cez serverové `/api/hello`, aj keď je token vo vyrovnávacej pamäti.
- [x] Bezpečný prechod po resete: lokálne dáta vyčistiť iba po overenej odpovedi `409 reset` s vyššou generáciou; pri výpadku ponechať identitu.
- [x] Offline/online, prenos zbierky vrátane epochy, opätovné spustenie, 401, presunutý účet: regresné testy.
- [ ] Vysvetliť rozdiel medzi „Vymazať lokálnu zbierku“ a „Zmazať moje údaje“.

## v70 – Prvých 5 minút hráča
- [ ] Skrátiť onboarding a vysvetliť prvé zamávanie.
- [ ] Jasne odlíšiť lokálne mávnutie od serverom overeného úlovku.
- [ ] Zrozumiteľné stavy prázdnej oblohy, nepovolenej GPS a slabého signálu.
- [ ] Používateľský test prvého úlovku a zrozumiteľnosti odmeny.

## v71 – Pozorovateľnosť beta testovania
- [ ] Bez osobných identifikátorov merať prvé spustenie → GPS → mávnutie → overená karta → návrat.
- [ ] Doplniť agregovaný dashboard do administrácie.
- [ ] Overiť retenciu D1/D7, kontrolu počtov a súkromie údajov.

## v72 – Nová herná mechanika (podľa výsledkov bety)
- [ ] Vyhodnotiť testerov a najväčšiu prekážku návratu do aplikácie.
- [ ] Návrh „Spoločná týždenná misia Slovenska“ len so skutočnými overenými mávnutiami.
- [ ] Ekonomika odmien, ochrana pred podvádzaním, serverové testy.
- [ ] Až potom implementácia a samostatné schválenie nasadenia.

## Pravidlá vydania
1. Každá časť samostatná vetva/PR; pred zlúčením úspešné serverové aj prehliadačové testy.
2. Frontend (GitHub Pages) a backend (Cloudflare Workers) overovať osobitne.
3. Nikdy nespúšťať globálny reset databázy v rámci migrácie alebo deploya.
4. Neprepisovať identitu existujúcemu hráčovi pri chybe siete; radšej zobrazovať zrozumiteľný stav.
5. Po získaní spätnej väzby z WhatsApp komunity upraviť priority zostávajúcich úloh.
