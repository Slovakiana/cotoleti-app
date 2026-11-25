# 🧯 Čo robiť, keď niečo nejde (všetko z iPhonu)

## 1. Ako zistím, že je problém
- **Strážca servera** (GitHub Actions) každých 30 min kontroluje server. Keď zlyhá, príde e-mail od GitHubu a (ak sú nastavené `TG_TOKEN` a `TG_CHAT` v GitHub → Settings → Secrets → Actions) aj správa na Telegram.
- Rýchla kontrola v Safari: `https://cotoleti-app.radovan-kudela.workers.dev/api/health`
  - `"ok":true` – server aj minútový časovač bežia
  - `radar.ageSec` je vek uloženej regionálnej snímky. Pri neaktívnom radare môže byť vyšší. Čerstvosť pri otvorení overí požiadavka na `/api/planes?lat=48.7&lon=19.5&r=40`.
  - `radar.sources` uvádza stav, spotrebu a termín ďalšieho pokusu pri každom zapnutom zdroji. Kód 403 vyžaduje kontrolu prístupu, pri 429 server čaká podľa poskytovateľa.

### Prístupy k dátovým zdrojom

- Hodnotu kľúča ADS-B.lol vlož do Cloudflare ako Secret `ADSB_LOL_API_KEY`. Pre vyšší plán nastav `ADSB_LOL_DAILY_LIMIT`, `ADSB_LOL_WEEKLY_LIMIT` a `ADSB_LOL_MONTHLY_LIMIT` s rezervou pod kvótami poskytovateľa. Ide o interné limity v kalendárnych obdobiach. Naďalej platia limity poskytovateľa vrátane prenesených dát.
- Záložný zdroj zapni až po schválení prístupu. Pre Airplanes.live nastav `AIRPLANES_LIVE_ENABLED=1`, `AIRPLANES_LIVE_DAILY_LIMIT` a podľa dohody kľúč `AIRPLANES_LIVE_API_KEY`, ak poskytovateľ používa hlavičku `x-api-key`. Pre adsb.fi slúžia `ADSB_FI_ENABLED=1` a `ADSB_FI_DAILY_LIMIT`.
- Bez kľúča sa regionálna snímka obnovuje na požiadanie. S kľúčom sa tiež obnovuje len na požiadanie radaru alebo hry. V šetriacom režime používa snímku do 28 sekúnd. Posledných 10 % dopytovej kvóty je vyhradených na overenie úlovkov. Worker odhaduje objem z tiel úspešných odpovedí a pre adhoc plán zastaví ďalšie dopyty pri odhadovaných 0,9 GB denne alebo 3,6 GB mesačne. Pri úplnom výpadku sa náhľad zobrazuje najviac 2 minúty. Mávnutie vyžaduje čerstvé údaje.

## 2. Nová verzia niečo pokazila
- **Server:** Cloudflare (appka alebo web) → Workers & Pages → cotoleti-app → **Deployments** → pri predchádzajúcej verzii ⋯ → **Rollback**.
- **Appka (GitHub Pages):** GitHub → repozitár → Commits → posledný commit → ⋯ → **Revert**. Alebo napíš Claudovi „vráť poslednú zmenu“.
- Pozor: zmeny tabuliek v databáze sa rollbackom nevrátia (nevadí – nové stĺpce staršia verzia ignoruje).

## 3. Server je preťažený / došiel bezplatný limit
- Cloudflare → Workers → cotoleti-app → **Metrics**. Ak je veľa chýb 1027/limit: prejdi na **Workers Paid (5 $/mes.)** – Settings → Plans.
- Zapni si upozornenia: Cloudflare → Notifications → *Usage based billing* a *Workers*.

## 4. Stratené dáta
- Databáza (Durable Object) sa dá vrátiť do ľubovoľného bodu za posledných 30 dní (Point-in-time recovery). Napíš Claudovi, pripraví to.
- Zbierky ľudí sú v ich mobiloch – tie sa nestratia.

## 5. Tajné kľúče (Cloudflare → cotoleti-app → Settings → Variables and Secrets)
- `ADMIN_KEY` – prístup na **správcovskú stránku** `https://cotoleti-app.radovan-kudela.workers.dev/admin` (kľúč sa píše do políčka, nikdy nie do adresy). Tam sú štatistiky, signály podozrivej aktivity a **vypínače** (Santa push, nedeľná vlna, šetriaci režim).
- `TG_TOKEN`, `TG_CHAT` – týždenný súhrn na Telegram. Ak token unikne: v Telegrame @BotFather → /revoke a nový vlož sem.

## 6. Nahlásenia a odvolania

- Priebežne otváraj správcu `/admin` a e-mail uvedený v pravidlách. Fronta ukáže dočasne skryté mená, odvolania aj nahlásenia čakajúce na rozhodnutie. Podnet priradíš k obsahu podľa názvu alebo prezývky.
- Zaznamenaj rozhodnutie, dôvod a dátum. Pri e-mailovom podnete potvrď prijatie a odpovedz na adresu oznamovateľa. Dotknutému hráčovi oznám dôvod zásahu a spôsob odvolania. Nikdy nepreposielaj identitu oznamovateľa dotknutému hráčovi.
- Zaznamenaj aj podnety, ktoré sa týkajú iného obsahu než mena. Tlačidlo v hre slúži na nahlásenie mena. Všeobecné podnety a odvolania prijíma zverejnený e-mail.

## 7. Osobné údaje

- Žiadosti posúď po primeranom overení vlastníka účtu. Odpovedaj bez zbytočného odkladu a spravidla do jedného mesiaca. Rozšírenie lehoty pri zložitom prípade oznám v prvom mesiaci.
- Pri porušení ochrany osobných údajov zaznamenaj rozsah, dopad, čas zistenia a opatrenia. Úradu oznamuj bez zbytočného odkladu, podľa možností do 72 hodín od zistenia, pokiaľ nie je nepravdepodobné riziko pre dotknutých ľudí. Pri vysokom riziku informuj aj dotknutých ľudí, pokiaľ neplatí zákonná výnimka.
- Po núdzovej obnove databázy over, že obnovou znovu nesprístupníš predtým vymazané účty. Ak sa do obnovenej databázy dostanú, odstráň ich pred sprístupnením služby.
- Pred verejnou propagáciou založ do interných záznamov skutočné nastavenia uchovávania a prístupu, podmienky spracovateľov (najmä Cloudflare a GitHub), mechanizmy prenosu mimo EHP, licenciu konkrétneho dátového plánu a autorské práva k používaným podkladom. Doplň overené prenosy do zásad súkromia. Posúď právny základ jednotlivých funkcií vrátane GPS pre deti, potrebu posúdenia vplyvu a postavenie služby podľa DSA. Aplikácia používa lokálny PIN na nastavenia profilu.
- Únik kľúča poskytovateľa rieš jeho rotáciou v službe poskytovateľa a aktualizáciou v Cloudflare Secrets. Po rotácii over úspešný dopyt v diagnostike.

## 8. Podozrivá aktivita (Telegram hlási sám, max. 1× za 6 h na typ)
- `401admin` – niekto skúša admin kľúč → vymeň ho.
- `mint_block`, `xclaim_bad` – niekto vyrába účty / hádže kódy → nič netreba, limity držia; pri opakovaní napíš Claudovi.
- `teleport`, `vpn` – podvádzanie s polohou → body sa nerátajú automaticky.
- `ban` – zakázané meno po nahláseniach → skontroluj, či to bolo oprávnené.

## 9. Štedrý deň (24. 12.) – deň D
- **17. 12. generálka:** otvor appku s `#santatest` na konci adresy, skontroluj Santu na oblohe a zdieľanie; v /admin skontroluj štatistiky.
- **Pred 1. 12.:** Workers Paid zapnutý, notifikácie v Cloudflare, 2FA na všetkých účtoch.
- **24. 12. ráno:** `/api/health` → `"ok":true`. Od 12:00 do 22:00 **nenasadzovať žiadne zmeny**.
- **14:45:** /admin → Santa push „zapnutý“. Ak by server nestíhal: /admin → Sociálne funkcie → **šetriaci režim** (Santa a lietadlá idú ďalej, len bez rebríčkov).
- **Ak sa niečo pokazí:** Cloudflare → Deployments → Rollback na verziu z 23. 12.

## Nasadenie len pri zelených testoch
- Testy (`.github/workflows/test.yml`) bežia pri každom pushi: syntax, verzia, server, identita, odznaky a dymový test appky v prehliadači (`tests/smoke.py`, Playwright).
- **Appka (GitHub Pages):** workflow `pages.yml` nasadí stránku až po zelených testoch. Zapnutie (raz): Settings → Pages → Source = **GitHub Actions**, potom Settings → Secrets and variables → Actions → **Variables** → `PAGES_Z_TESTOV` = `1`. Vrátenie: Source späť na „Deploy from a branch“ (main).
- **Server (Cloudflare Builds):** nasadzuje sa pri pushi nezávisle od testov. Pred pushom zmeny servera spusti `node tests/worker.test.mjs`.

## Prevádzkové meranie

A/B meranie a analytický lievik sú vypnuté. Staršie klienty dostanú pri volaní `/api/ev` úspešnú odpoveď bez zápisu. Počítadlo prevádzkových chýb ukladá kategórie `hello`, `wave`, `storage` a `runtime`.

## Pilot Letová štafeta

Pilot je predvolene zapnutý. Vypína ho produkčná premenná `RELAY_PILOT=0`; `/api/health` uvádza účinný stav v poli `relayPilot`. Dve čerstvé overené mávnutia s GPS z rôznych krajov sa môžu spojiť, ak sa zhoduje identifikátor stroja, volací znak a typ a medzi mávnutiami uplynuli 2 až 35 minút. Páry sa zobrazujú z existujúceho `/api/sky` iba účastníkom. Pilot neposiela ďalšie dopyty do ADSB.lol a označenia uchováva do 30 dní.
