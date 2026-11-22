# 🧯 Čo robiť, keď niečo nejde (všetko z iPhonu)

## 1. Ako zistím, že je problém
- **Strážca servera** (GitHub Actions) každých 30 min kontroluje server. Keď zlyhá, príde e-mail od GitHubu a (ak sú nastavené `TG_TOKEN` a `TG_CHAT` v GitHub → Settings → Secrets → Actions) aj správa na Telegram.
- Rýchla kontrola v Safari: `https://cotoleti-app.radovan-kudela.workers.dev/api/health`
  - `"ok":true` – server aj minútový časovač bežia
  - `upstreamMin` – pred koľkými minútami server naposledy dostal dáta o lietadlách (veľké číslo = výpadok zdroja adsb.lol, appka sa sama prepne na iný zdroj)

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

## 6. Zneužitie (spam, nevhodné mená)
- Mená miznú automaticky po 3 nahláseniach. Ak treba zasiahnuť ručne, napíš Claudovi meno – pridá ho na zoznam zakázaných.

## 7. Únik osobných údajov (GDPR)
- Do **72 hodín** oznám Úradu na ochranu osobných údajov SR (dataprotection.gov.sk → Oznámenie porušenia). Ak ide o vysoké riziko pre ľudí, informuj aj ich (oznámenie v appke).
- Zapíš si: čo sa stalo, kedy, aké údaje, koľko ľudí, čo si urobil. Napíš Claudovi, pomôže s textom.
- Okamžite: vymeň `ADMIN_KEY`, prípadne `TG_TOKEN`; ak unikli tokeny používateľov, Claude zmení podpisový kľúč (všetci dostanú nové tokeny automaticky).

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
