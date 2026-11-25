// Collector Edition v65 – skutočne odlišné motívy pre rarity a osobný lov.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const src=readFileSync(new URL("../js/cards.js",import.meta.url),"utf8");
const start=src.indexOf("const COLLECTOR_TIER={"),end=src.indexOf("function cardSVG(",start);
assert.ok(start>0&&end>start);
const ctx={typeTier:k=>({A320:"c",ATR:"u",A388:"r",AN124:"e",B779:"l"})[k],SVGE:x=>x,hash:s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h}};
vm.createContext(ctx);vm.runInContext(src.slice(start,end),ctx);
const arts=["A320","ATR","A388","AN124","B779"].map(k=>vm.runInContext('collectorEditionArt("'+k+'",{n:1},false)',ctx));
assert.equal(new Set(arts).size,5,"každá rarita má vlastný motív");
assert.match(arts[2],/circle/,"vzácna má radar");
assert.match(arts[3],/path/,"epická má geometriu");
assert.match(arts[4],/circle/,"legendárna má svätožiaru");
assert.equal(vm.runInContext('collectorEditionArt("A388",null,false)',ctx),"","zamknuté karty sa netvária ako ulovené");
assert.match(vm.runInContext('collectorRevealTitle("B779",{n:1})',ctx),/LEGENDA/);
assert.match(vm.runInContext('collectorRevealTitle("A320",{n:1})',ctx),/OBJAV/);
assert.match(vm.runInContext('collectorRevealTitle("A320",{n:1,seq:1})',ctx),/PRVÝ/);
assert.match(src,/function collectorHuntModel/);
assert.match(src,/data-hunt-pick/);
assert.match(src,/ctl_collectorHunt/);
assert.match(src,/function cardMini\(k,v\)\{return cardSVG/);
assert.match(src,/cardSVG\(k,null,\{id:"locked"\}\)/);
const forms=src.slice(src.indexOf("const FORMS="),src.indexOf("const SEATSX="));
vm.runInContext(forms,ctx);
const covers={
  'null':"",
  '{gift:1,forms:{n:1}}':"",
  '{n:1,night:4}':"n",
  '{n:1,forms:{n:3,g:6},coverForm:"n"}':"n",
  '{n:1,forms:{n:3,g:6},coverForm:"z"}':"g",
  '{n:1,forms:{n:3,g:6},coverForm:"-"}':""
};
for(const [data,expected] of Object.entries(covers))assert.equal(vm.runInContext(`cardCoverForm(${data})`,ctx),expected,data);
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
for(const form of ["classic","n","g","z","h","f"]){
  const file=`lib/card-art/${form}.webp`;
  assert.ok(sw.includes(file),`${file} je dostupné offline`);
  assert.equal(readFileSync(new URL("../"+file,import.meta.url)).toString("ascii",8,12),"WEBP");
}
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(html,/Collector Edition v65/);
console.log("✓ päť odlišných výtvarných motívov, poctivé odhalenia a osobný lov");
