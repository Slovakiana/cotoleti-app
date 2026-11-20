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
- `ADMIN_KEY` – prístup k štatistikám: `…/api/stats` s hlavičkou `x-admin-key` alebo `?key=` (odkaz nikomu neposielaj).
- `TG_TOKEN`, `TG_CHAT` – týždenný súhrn na Telegram. Ak token unikne: v Telegrame @BotFather → /revoke a nový vlož sem.

## 6. Zneužitie (spam, nevhodné mená)
- Mená miznú automaticky po 3 nahláseniach. Ak treba zasiahnuť ručne, napíš Claudovi meno – pridá ho na zoznam zakázaných.
