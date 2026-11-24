// Klenotnica: status získava len typ s reálnou vzácnosťou či špeciálnym úlovkom.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const src=readFileSync(new URL("../js/cards.js",import.meta.url),"utf8");
const first=src.indexOf("const collectorFormCount");
const last=src.indexOf("/* 🔭 Živý osobný lov:",first);
assert.ok(first>=0&&last>first);
const tier={A320:"c",A388:"r",B779:"l"};
const COL={ed:{},types:{}};
const context=vm.createContext({COL,RORD:{c:0,u:1,r:2,e:3,l:4},
 RAR:{c:{s:"●",n:"Bežná"},r:{s:"▲",n:"Vzácna"},l:{s:"♛",n:"Legendárna"}},
 typeTier:k=>tier[k]||"c",cardLvl:()=>2,pl:(n,a,b,c)=>n===1?a:n<5?b:c,
 esc:s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"),
});
vm.runInContext(src.slice(first,last),context);
function run(expr,values={}){Object.assign(context,values);return vm.runInContext(expr,context)}
const common={n:1,ver:false,forms:{}};
assert.equal(run('collectorSpecial("A320",v)',{v:common}),false,"bežná karta nie je exkluzívna");
assert.equal(run('collectorSpecial("A388",v)',{v:common}),true,"vzácny typ je klenot");
assert.equal(run('collectorSpecial("A320",v)',{v:{...common,shiny:Date.now()}}),true,"lesklá je klenot");
assert.equal(run('collectorSpecial("A320",v)',{v:{...common,forms:{n:1,g:2,z:3}}}),true,"tri formy sú klenot");
assert.equal(run('collectorSpecial("A320",v)',{v:{...common,seq:4}}),true,"skutočná prvá desiatka je klenot");
assert.equal(run('collectorSpecial("A320",v)',{v:{...common,seq:42}}),false,"vysoké poradové číslo samo osebe nie je klenot");
COL.ed.event={ty:"A320",n:"Nočná edícia",no:12};
assert.equal(run('collectorSpecial("A320",v)',{v:common}),true,"edícia je klenot");
COL.ed={};
const html=run('collectorDossier("A320",v)',{v:{...common,first:1710000000000,ver:true,seq:2,shiny:0}});
assert.match(html,/Overená/);
assert.match(html,/Číslo 2 v SR/);
assert.doesNotMatch(html,/Lesklá/);
const before=JSON.stringify(COL);
const vault=run('collectorVaultHTML(["A320","A388"],owned)',{owned:{A320:common,A388:{...common,ver:true}}});
assert.match(vault,/Klenotnica/);
assert.match(vault,/1 klenot/);
assert.equal(JSON.stringify(COL),before,"vitrína nemení zbierku ani body");
assert.match(src,/class="revealScene/,"nové odhalenie existuje");
assert.match(src,/type="button" class="cardBack/,"odhalenie je ovládateľné");
assert.match(src,/atlasMode==="vault"/,"nová záložka Atlasu existuje");
console.log("✓ Klenotnica rozpoznáva skutočné vzácnosti, certifikát a nemení údaje");
