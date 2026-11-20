# Nedokončené odporúčania expertov (stav 20. 11. 2026)

Plná verzia s tabuľkami: dokument „Čo to letí? – nedokončené odporúčania expertov“ (https://claude.ai/artifact/6HsNcvNfy2LqKf25hJvUHT).

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
