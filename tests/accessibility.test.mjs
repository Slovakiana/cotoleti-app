// Kontrola názvov dialógov, formulárov a veľkosti dotykových prvkov.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const dialogs=[...html.matchAll(/<div class="modal" id="([^"]+)"([^>]*)>/g)];
assert.ok(dialogs.length>=15);
for(const [,id,attrs] of dialogs){
  assert.match(attrs,/role="dialog"/,id);
  assert.match(attrs,/aria-modal="true"/,id);
  assert.match(attrs,/aria-label="[^"]+"|aria-labelledby="[^"]+"/,id);
}
for(const id of ["mlat","mlon","trInput","trLabel"]){
  const tag=html.split("<input").find(x=>x.includes('id="'+id+'"'))||"";
  assert.match(tag,/aria-label="[^"]+"/,id);
}
assert.match(html,/nav button\\{[^}]*min-height:48px/);
assert.match(html,/id="statusPill"[^>]*aria-describedby="status"/);
assert.match(html,/id="map"[^>]*aria-label="Mapa letu"/);
console.log("✓ názvy dialógov, označenia vstupov a navigačné dotykové plochy");
