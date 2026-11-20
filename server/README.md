# Server pre „Čo to letí?“

Cloudflare Worker (`worker.js`) + databáza Durable Object. Nasadzuje sa **automaticky** z koreňového `wrangler.jsonc` pri každej zmene na GitHube (Cloudflare → Workers → cotoleti-app → Builds).

Pozri aj [RUNBOOK.md](../RUNBOOK.md) – čo robiť pri výpadku.
