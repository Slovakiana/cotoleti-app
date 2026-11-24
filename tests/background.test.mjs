// Regresný test: na pozadí nevoláme počasie ani satelity, po návrate áno.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const src=readFileSync(new URL("../js/main.js", import.meta.url),"utf8");
const intervals=[];let weather=0,space=0,collection=0;
const document={hidden:true,addEventListener(){}};
const S={raw:[],view:"now",pos:{lat:48.15,lon:17.11},lastKnown:false};
const ctx={
  LS:{get:()=>null},S,document,
  window:{},setTimeout:()=>0,setInterval:fn=>{intervals.push(fn);return intervals.length},
  applyTexts(){},syncToggles(){},showPos(){},renderCol(){collection++},renderHeroStatic(){},
  renderDaily(){},checkDuelLink(){},installHint(){},checkAch(){},boot(){},
  setStatus(){},tick(){},fetchPlanes(){},
  speechSynthesis:{getVoices:()=>[]},
  loadWx(){weather++},SPACE:{init(){space++}}
};
vm.runInNewContext(src,ctx,{filename:"js/main.js"});
assert.equal(collection,0,"Lov nenačítava skrytú zbierku");
assert.equal(intervals.length,3,"očakávame tri pravidelné intervaly");
intervals[2]();
assert.equal(weather,0,"na pozadí sa počasie neobnovuje");
assert.equal(space,0,"na pozadí sa satelity neobnovujú");
document.hidden=false;S.view="journal";
intervals[2]();
assert.equal(weather,0);assert.equal(space,0);
S.view="now";intervals[2]();
assert.equal(weather,1,"po návrate sa počasie obnovuje");
assert.equal(space,1,"po návrate sa satelity obnovujú");
console.log("✓ počasie a satelity sa na pozadí pozastavia a po návrate obnovia");

const worker=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
const shell=worker.slice(0,worker.indexOf('self.addEventListener("pushsubscriptionchange"'));
const listeners={},deleted=[];
let network=0;
const cached={text:()=>Promise.resolve("offline")};
const storage={
  open:async()=>({match:async(_req,opts)=>opts?.ignoreSearch?cached:null}),
  keys:async()=>["cotoleti-v12","other-pwa-cache","ctl-id"],
  delete:async key=>deleted.push(key)
};
vm.runInNewContext(shell,{
  self:{registration:{scope:"https://example.test/cotoleti-app/"},clients:{claim(){}},addEventListener:(name,fn)=>listeners[name]=fn},
  caches:storage,URL,Response,AbortController,clearTimeout,setTimeout,
  fetch:async()=>{network++;throw Error("offline")}
});
let activation, response;
listeners.activate({waitUntil:promise=>activation=promise});
await activation;
assert.deepEqual(deleted,["cotoleti-v12"]);
const version=worker.match(/cotoleti-v(\d+)/)[1];
listeners.fetch({request:{method:"GET",url:"https://example.test/cotoleti-app/js/core.js?v="+version},respondWith:p=>response=p});
assert.equal(await response,cached);
assert.equal(network,0,"versioned cached assets must not start a network fetch");
response=null;
listeners.fetch({request:{method:"GET",url:"https://example.test/cotoleti-app/api/mycards"},respondWith:p=>response=p});
assert.equal(response,null);
console.log("✓ cache bez zbytočnej siete a so zachovaním úložísk iných appiek");
