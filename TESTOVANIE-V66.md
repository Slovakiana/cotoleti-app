# TESTOVANIE V67: skupina nových testerov

## Nemaž spoločnú produkčnú databázu
Zbierky a nastavenia sú prevažne v localStorage zariadenia. Server však uchováva overené úlovky, identity, prvenstvá a ligové rebríčky. Vymazanie Safari dát nevynuluje rebríček.

## Noví testeri
Každý tester na novom zariadení začína s novou osobnou identitou a zbierkou. Nemusíme nič mazať. Ak testeri potrebujú úplne prázdne **spoločné rebríčky**, používajte samostatný Cloudflare Worker a vlastnú prázdnu Durable Object databázu; nestačí skopírovať iba GitHub Pages HTML.

## Existujúci tester chce začať odznovu
Vo vlastnom účte je v aplikácii **Ja → Súkromie → Zmazať moje údaje**. Táto akcia sa týka jeho vlastných lokálnych a serverových údajov, môže byť nezvratná; neaktivujte ju bez predchádzajúceho exportu a vedomého súhlasu testera. Nevymazávajte Safari dáta všetkých webov. V balíku v67 server vyžaduje token vlastníka a mobil nevymaže lokálne dáta, ak server zmazanie nepotvrdí.

## Scenáre
- [ ] Nový hráč: prvé spustenie a prístup ku GPS
- [ ] Prvá kartička: či rozpozná rozdiel Classic / Rare / Epic / Legendary / Shiny
- [ ] Výber osobného lovu v Atlase a zobrazenie na hlavnej obrazovke
- [ ] Živý radar ukazuje „cieľ je na oblohe“ iba pri reálnom prelete nad 10°
- [ ] Po úlovku „Lov úspešný“, bez duplicitnej odmeny
- [ ] Súťažný pulz: poradie, najbližší súper, limit 25 na hráča
- [ ] Atlas Môj kraj / Celé Slovensko a súťaže
- [ ] Slabý internet, PWA offline a návrat z pozadia
- [ ] Rodinný režim

## Spätná väzba
Pýtajte sa: Prečo chceš ďalšiu kartičku? Vieš, ako sa dostaneš v lige vyššie? Rozumieš, či ide o overený úlovok? Máš chuť vrátiť sa zajtra?
