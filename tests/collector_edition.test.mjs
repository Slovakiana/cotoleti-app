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
const illustrations=vm.runInContext("Object.entries(CARD_ILLUSTRATIONS)",ctx);
const illustratedForms=new Set(illustrations.map(([key])=>key.split(":")[1]));
assert.deepEqual([...illustratedForms].sort(),["","f","g","h","n","z"]);
ctx.CARD_ART_REV="?v=test";
for(const [key,asset] of illustrations){
  const [code,form]=key.split(":");
  const file=`lib/card-art/${asset}.webp`;
  assert.equal(vm.runInContext(`cardArtURL("${form}","${code}")`,ctx),file+"?v=test");
  assert.ok(sw.includes(`"${file}"`),`${file} je dostupné offline`);
  assert.equal(readFileSync(new URL("../"+file,import.meta.url)).toString("ascii",8,12),"WEBP");
}
// forma bez vlastnej ilustrácie: ilustrácia typu (forma sa naznačí tónom); typ bez ilustrácie: pozadie formy
assert.equal(vm.runInContext('cardArtURL("n","B738")',ctx),"lib/card-art/b738.webp?v=test");
assert.equal(vm.runInContext('cardArtURL("n","CRJ9")',ctx),"lib/card-art/n.webp?v=test");
const catalog=readFileSync(new URL("../js/catalog.js",import.meta.url),"utf8");
ctx.TYPES={};
vm.runInContext(catalog,ctx);
const section=(from,to)=>src.slice(src.indexOf(from),src.indexOf(to,src.indexOf(from)));
vm.runInContext(section("const SETS_T=","// album Chvosty"),ctx);
vm.runInContext(section("const SET_COVERS=","function setCover("),ctx);
vm.runInContext(section("const EDS=","// zapíše edíciu"),ctx);
vm.runInContext(section("const EDITION_DESIGN=","function editionCard("),ctx);
for(const [key] of illustrations){
  const [code]=key.split(":");
  assert.ok(vm.runInContext(`Object.hasOwn(CAT,"${code}")`,ctx),key);
}
for(const [id,,name] of vm.runInContext("EDS",ctx)){
  const style=vm.runInContext(`EDITION_DESIGN["${id}"]`,ctx);
  assert.ok(style,`Chýba návrh edície ${name}`);
  if(style[3]){
    const file=`lib/card-art/ed-${id}.webp`;
    assert.ok(sw.includes(`"${file}"`),`${file} je dostupné offline`);
    assert.equal(readFileSync(new URL("../"+file,import.meta.url)).toString("ascii",8,12),"WEBP");
  }
}
for(const set of vm.runInContext("SETS_T",ctx)){
  const cover=vm.runInContext(`SET_COVERS["${set.id}"]`,ctx);
  assert.ok(cover&&set.t.includes(cover[0]),`Obálka ${set.n} má reprezentanta zo sady`);
}
const coverage=vm.runInContext(`[Object.keys(CARD_ILLUSTRATIONS).filter(k=>k.endsWith(":")).length,CATALOG.length,Object.values(EDITION_DESIGN).filter(d=>d[3]).length,EDS.length]`,ctx);
console.log(`✓ Vlastné ilustrácie ${coverage[0]}/${coverage[1]} typov a ${coverage[2]}/${coverage[3]} edícií`);
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
assert.match(html,/Collector Edition v65/);
console.log("✓ päť odlišných výtvarných motívov, poctivé odhalenia a osobný lov");
// UX-04: ku každej ilustrácii existuje náhľad pre mriežku (lib/card-art/sm/)
{
  const {readdirSync} = await import("node:fs");
  const big = readdirSync(new URL("../lib/card-art/", import.meta.url)).filter(f => f.endsWith(".webp"));
  const small = new Set(readdirSync(new URL("../lib/card-art/sm/", import.meta.url)));
  assert.deepEqual(big.filter(f => !small.has(f)), [], "chýba náhľad – spusti: python3 tests/make_thumbs.py");
  console.log(`✓ ${big.length} ilustrácií má aj náhľad pre mriežku`);
}
