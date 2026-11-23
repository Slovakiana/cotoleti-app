# Administrátorský reset všetkých hráčov – v68

Nové vydanie má v administrátorskom paneli Workeru (adresa `https://cotoleti-app.radovan-kudela.workers.dev/admin`) ovládanie na globálny reset.

**POZOR: Je to nevratné vymazanie reálnych údajov hráčov.** Nejde len o vyčistenie testovacích štatistík. Pred vykonaním treba zálohovať produkčnú Durable Object SQLite databázu cez Cloudflare. Bez overenej zálohy reset neodporúčame spustiť.

## Postup vlastníka
1. Po úspešnom nasadení webu **aj Workeru** otvor `/admin` na doméne Workeru a použi svoj existujúci `ADMIN_KEY`. Kľúč nevkladaj do GitHubu ani do chatu.
2. Klikni na **Skontrolovať rozsah resetu**. Server vygeneruje jednorazové potvrdenie platné päť minút a zobrazí počet účtov/kartičiek.
3. Až keď máš zálohu a naozaj chceš začať novú testovaciu sezónu, klikni **Natrvalo vymazať všetkých hráčov**, prepíš frázu `VYMAZAT VSETKY DATA` a potvrď ďalšie upozornenie.
4. Starým testerom povedz, nech aplikáciu zatvoria a znovu otvoria online: nová generácia servera zahodí staré lokálne zbierky, identitu a kľúče. Prvé pripojenie môže vyvolať automatické obnovenie aplikácie.
5. Over v administrátorských štatistikách, že starí hráči nie sú v tabuľkách; potom pozvi testerov.

**Reset som zatiaľ nespustil.** Táto zmena iba pridáva kontrolovaný nástroj. Nie je to zmenenie pravidiel získania kartičiek ani šance na raritu.

Ak Cloudflare Worker ešte nenasadil novú verziu, **reset nespúšťaj**. Staré verzie webu nepoznajú generácie a mohli by ukazovať staré lokálne dáta.
