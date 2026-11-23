// Regresný test: na pozadí nevoláme počasie ani satelity, po návrate áno.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const src=readFileSync(new URL("../js/main.js", import.meta.url),"utf8");
const intervals=[];let weather=0,space=0;
const document={hidden:true,addEventListener(){}};
const S={raw:[],view:"now",pos:{lat:48.15,lon:17.11},lastKnown:false};
const ctx={
  LS:{get:()=>null},S,document,
  window:{},setTimeout:()=>0,setInterval:fn=>{intervals.push(fn);return intervals.length},
  applyTexts(){},syncToggles(){},showPos(){},renderCol(){},renderHeroStatic(){},
  renderDaily(){},checkDuelLink(){},installHint(){},checkAch(){},boot(){},
  setStatus(){},tick(){},fetchPlanes(){},
  speechSynthesis:{getVoices:()=>[]},
  loadWx(){weather++},SPACE:{init(){space++}}
};
vm.runInNewContext(src,ctx,{filename:"js/main.js"});
assert.equal(intervals.length,3,"očakávame tri pravidelné intervaly");
intervals[2]();
assert.equal(weather,0,"na pozadí sa počasie neobnovuje");
assert.equal(space,0,"na pozadí sa satelity neobnovujú");
document.hidden=false;
intervals[2]();
assert.equal(weather,1,"po návrate sa počasie obnovuje");
assert.equal(space,1,"po návrate sa satelity obnovujú");
console.log("✓ počasie a satelity sa na pozadí pozastavia a po návrate obnovia");
