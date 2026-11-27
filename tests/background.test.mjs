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
const version=worker.match(/cotoleti-v(\d+)/)[1];
const scope="https://example.test/cotoleti-app/";
const listeners={},deleted=[],paths=[];
let network=0,skipped=0,claimed=0,complete=false,offline=true;
const cached=new Response("offline");
const storage={
  open:async()=>({
    async addAll(requests){
      assert.ok(requests.some(req=>req.url.endsWith("/js/core.js")));
      if(!complete)throw Error("precache incomplete");
    },
    async add(){},
    async match(request,opts){
      const url=request.url||request.href;
      paths.push(url);
      if(url?.endsWith("/index.html"))return new Response("js/core.js?v="+version);
      if(url?.includes("/lib/leaflet.js"))return cached;
      if(opts?.ignoreSearch&&url?.includes("/js/core.js"))return cached;
    },
  }),
  keys:async()=>["cotoleti-v12","cotoleti-v"+(Number(version)-1),"other-pwa-cache","ctl-id"],
  delete:async key=>deleted.push(key)
};
vm.runInNewContext(shell,{
  self:{registration:{scope},skipWaiting(){skipped++},clients:{claim(){claimed++}},addEventListener:(name,fn)=>listeners[name]=fn},
  caches:storage,URL,Request,Response,AbortController,clearTimeout,setTimeout,
  fetch:async()=>{network++;if(offline)throw Error("offline");return new Response("unavailable",{status:503})}
});
let work,response;
listeners.install({waitUntil:promise=>work=promise});
await assert.rejects(work,/precache incomplete/);
assert.equal(skipped,0);
complete=true;
listeners.install({waitUntil:promise=>work=promise});
await work;
assert.equal(skipped,1);
listeners.activate({waitUntil:promise=>work=promise});
await work;
assert.deepEqual(deleted,["cotoleti-v12"]);
assert.equal(claimed,1);
const request=(path,mode="cors")=>{
  response=null;
  listeners.fetch({request:{method:"GET",url:scope+path,mode},respondWith:p=>response=p});
  return response;
};
assert.equal(await request("js/core.js?v="+version),cached);
assert.equal(await request("js/core.js?v="+(Number(version)-1)),cached);
assert.equal(network,0,"verziované súbory má aj predchádzajúca cache");
assert.equal(await request("lib/leaflet.js"),cached);
assert.ok(paths.every(Boolean),"offline fallback musí dostať pôvodnú požiadavku");
offline=false;
assert.equal((await request("","navigate")).status,200,"HTTP 503 navigácie má použiť uložený shell");
assert.equal(request("api/mycards"),null);
console.log("✓ kompletný offline shell, predchádzajúca cache, odpojenie a HTTP 503");

const core=readFileSync(new URL("../js/core.js",import.meta.url),"utf8");
const mergeSource=core.slice(core.indexOf("const sameCollectionValue"),core.indexOf("function replaceCollectionModel"));
const merge=vm.runInNewContext(mergeSource+"\nmergeCollectionValue");
const base={pts:12,n:1,types:{A320:{n:1,first:100}},hex:{a:100}};
const one={pts:17,n:2,types:{A320:{n:2,first:100}},hex:{a:100,b:200}};
const two={pts:19,n:2,types:{A320:{n:1,first:100},B738:{n:1}},hex:{a:100,c:201}};
assert.deepEqual(JSON.parse(JSON.stringify(merge(base,one,two))),{
  pts:24,n:3,types:{A320:{n:2,first:100},B738:{n:1}},hex:{a:100,b:200,c:201}
});
console.log("✓ dve nezávislé zmeny zbierky zachovajú úlovky aj spoločné počítadlá");
