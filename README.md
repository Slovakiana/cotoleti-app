# ✈️ Čo to letí?

Webová appka, ktorá ti ukáže, čo ti práve letí nad hlavou: lietadlá (odkiaľ, kam, výška, rýchlosť), ISS, Tiangong a satelity Starlink.

**Spusti:** https://slovakiana.github.io/cotoleti-app/

- AR obloha s nahrávaním videa
- predpoveď kondenzačnej čiary a viditeľnosti podľa počasia
- „Čo to hučí?“ – zistí, ktoré lietadlo počuješ
- zbieranie lietadiel, levely, odznaky, denné výzvy a súboj s kamarátom
- inštalácia na plochu (PWA)

Dáta: adsb.lol, airplanes.live, OpenSky, adsbdb.com, CelesTrak, Open-Meteo.

### Zdroje Leteckého denníka

- Mapa vychádza z [Natural Earth 1:50m Admin 0 Map Units v5.1.2](https://github.com/nvkelso/natural-earth-vector/tree/v5.1.2/geojson). Súradnice sa premietajú projekciou Equal Earth a obrysy sa zjednodušujú na vykresľovanie v mobile. [Podmienky Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/).
- Identifikačné logá pochádzajú z [Letiska Bratislava](https://www.bts.aero/kontakty/pre-cestujucich/letecke-spolocnosti/), [Airline Logos Dataset](https://github.com/imgmongelli/airlines-logos-dataset/tree/7b001fb8d5d0a2f875d57b2b5a8a8056b2fbc63a) a [Airline and Operator Logos](https://github.com/Jxck-S/airline-logos). Logá zostávajú značkami príslušných dopravcov. Profilové údaje používa appka zo [Soaring Symbols](https://github.com/soaring-symbols/soaring-symbols/tree/5c1afb975910be5a834386faed9c8ff27a338003). Záznamy používajú kódy ICAO, odkazy na zdroje zaujímavostí sú v detailoch kartičiek.
