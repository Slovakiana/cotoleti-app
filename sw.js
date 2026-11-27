// Offline obal appky + upozornenia. Vždy najprv skúša sieť, aby si mal najnovšiu verziu.
const V="cotoleti-v104";
const SHELL=["./","index.html","privacy.html","rules.html","lib/legal.css","fonts/inter.woff","fonts/unbounded.woff","js/core.js","js/ui.js","js/ar.js","js/space.js","js/weather.js","js/extras.js","js/social.js","js/atlas.js","js/account.js","js/wrapped.js","js/push.js","js/track.js","js/towns.js","js/catalog.js","js/cards.js","lib/card-art/classic.webp","lib/card-art/n.webp","lib/card-art/g.webp","lib/card-art/z.webp","lib/card-art/h.webp","lib/card-art/f.webp","lib/card-art/a388.webp","lib/card-art/a388-n.webp","lib/card-art/at76.webp","lib/card-art/at76-g.webp","lib/card-art/at76-z.webp","lib/card-art/at76-f.webp","lib/card-art/z43.webp","lib/card-art/z43-h.webp","lib/card-art/a318.webp","lib/card-art/a319.webp","lib/card-art/a320.webp","lib/card-art/a321.webp","lib/card-art/a20n.webp","lib/card-art/a21n.webp","lib/card-art/b737.webp","lib/card-art/b738.webp","lib/card-art/b739.webp","lib/card-art/b38m.webp","lib/card-art/b39m.webp","lib/card-art/ed-advent2026.webp","lib/card-art/ed-mikulas2026.webp","lib/card-art/ed-lucia2026.webp","lib/card-art/ed-zslnovrat2026.webp","lib/card-art/ed-vianoce2026.webp","lib/card-art/ed-santa2026.webp","js/journal.js","lib/journal.css","lib/experience.css","lib/brand.css","js/brand.js","lib/journal-world.json","lib/journal-brands.json","js/mail.js","js/golden.js","js/teams.js","js/duel.js","js/sound.js","js/santa.js","js/main.js","og/default.jpg","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
const REV=V.slice("cotoleti-v".length);
const REQUIRED=SHELL.filter(path=>path==="index.html"||/^(js\/.*\.js|lib\/(experience|brand|journal)\.css)$/.test(path));
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(V);
    const requests=REQUIRED.map(path=>new Request(new URL(path,self.registration.scope),{cache:"reload"}));
    await cache.addAll(requests);
    const index=await cache.match(new URL("index.html",self.registration.scope));
    if(!index||!(await index.text()).includes("js/core.js?v="+REV))throw Error("Neúplná verzia appky");
    await Promise.allSettled(SHELL.filter(path=>!REQUIRED.includes(path)).map(path=>cache.add(path)));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const older=(await caches.keys()).filter(key=>/^cotoleti-v\d+$/.test(key)&&key!==V)
      .sort((a,b)=>Number(b.slice(10))-Number(a.slice(10)));
    await Promise.all(older.slice(1).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=="GET"||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const path=url.pathname.slice(scope.pathname.length);
  if(/^(api|s|admin)(\/|$)/.test(path)||url.searchParams.has("url"))return;
  const navigation=request.mode==="navigate",revision=url.searchParams.get("v");
  const versioned=!navigation&&/^\d+$/.test(revision||"");
  event.respondWith((async()=>{
    const cache=await caches.open(V);
    if(versioned){
      const version="cotoleti-v"+revision;
      const bundle=version===V?cache:(await caches.keys()).includes(version)?await caches.open(version):null;
      const saved=bundle&&(await bundle.match(request)||await bundle.match(request,{ignoreSearch:true}));
      if(saved)return saved;
      // URL historickej verzie sa nesmie doplniť dnešným súborom z rovnakého path.
      if(version!==V)return Response.error();
    }
    const fallback=async()=>{
      if(navigation&&(!path||path==="index.html"))return cache.match(new URL("index.html",scope));
      const saved=await cache.match(request)||(!versioned&&await cache.match(request,{ignoreSearch:true}));
      return saved;
    };
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),navigation?3500:6000);
    try{
      const response=await fetch(request,{cache:"no-cache",signal:ctl.signal});
      if(response.status>=500)return await fallback()||response;
      if(response.ok&&response.type==="basic"&&path&&!REQUIRED.includes(path)&&!/\bno-store\b/i.test(response.headers.get("Cache-Control")||""))
        event.waitUntil(cache.put(request,response.clone()).catch(()=>{}));
      return response;
    }catch(error){
      return await fallback()||Response.error();
    }finally{clearTimeout(timer)}
  })());
});
const API="https://cotoleti-app.radovan-kudela.workers.dev";
async function pushIdentity(){
  const cache=await caches.open("ctl-id"),stored=await cache.match("/__id");
  return stored?stored.json():null;
}
async function pushApi(path,body){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5000);
  try{
    const response=await fetch(API+path,{method:"POST",cache:"no-store",headers:{"Content-Type":"text/plain"},body:JSON.stringify(body),signal:ctl.signal});
    if(!response.ok)throw Object.assign(Error("push HTTP "+response.status),{status:response.status});
    return await response.json();
  }finally{clearTimeout(timer)}
}
self.addEventListener("pushsubscriptionchange",event=>{
  event.waitUntil((async()=>{
    const identity=await pushIdentity();
    if(!identity?.tok)return;
    const options=event.oldSubscription?.options;
    const sub=event.newSubscription||(options&&await self.registration.pushManager.subscribe(options));
    if(sub)await pushApi("/api/sub",{id:identity.cid,tok:identity.tok,sub:sub.toJSON(),keep:1});
  })());
});
self.addEventListener("message",e=>{
  const d=e.data||{};if(!d.cid)return;
  try{if(e.source&&e.source.url&&!e.source.url.startsWith(self.registration.scope))return}catch(err){return}
  if(d.clear){e.waitUntil(caches.delete("ctl-id"));return}
  e.waitUntil(caches.open("ctl-id").then(c=>c.put("/__id",new Response(JSON.stringify({cid:d.cid,tok:d.tok||""})))));
});
async function showPushMessages(){
  const identity=await pushIdentity();
  const credentials=identity?.tok?{id:identity.cid,tok:identity.tok}:null;
  let messages;
  if(credentials){
    for(let attempt=0;attempt<2;attempt++){
      try{
        const result=await pushApi("/api/msg",{...credentials,inbox:1});
        messages=Array.isArray(result?.messages)?result.messages:result?.title?[result]:null;
        break;
      }catch(error){if(error.status&&error.status<500)break}
    }
  }
  if(!messages)messages=[{title:"✈️ Pozri hore!",body:"Otvor appku a pozri, čo sa deje.",url:"./"}];
  const shown=[];
  for(const message of messages){
    if(message.expires&&message.expires<=Date.now())continue;
    try{
      await self.registration.showNotification(message.title,{body:message.body,icon:"icons/icon-192.png",badge:"icons/icon-192.png",
        data:{url:message.url||"./"},tag:message.qid?"cotoleti-"+message.qid:"cotoleti",vibrate:[200,100,200]});
      if(message.qid)shown.push(message.qid);
    }catch(error){}
  }
  if(shown.length){
    try{await self.navigator.setAppBadge?.(shown.length)}catch(error){}
    if(credentials)await pushApi("/api/msg",{...credentials,ack:shown}).catch(()=>{});
  }
}
let pushWork=Promise.resolve();
self.addEventListener("push",event=>{
  pushWork=pushWork.catch(()=>{}).then(showPushMessages);
  event.waitUntil(pushWork);
});
self.addEventListener("notificationclick",e=>{
  e.notification.close();
  const scope=new URL(self.registration.scope);
  let url=scope.href;
  try{
    const target=new URL(e.notification.data?.url||"./",scope);
    if(target.origin===scope.origin&&target.pathname.startsWith(scope.pathname))url=target.href;
  }catch(err){}
  e.waitUntil((async()=>{
    const all=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const w of all){if(w.url.startsWith(self.registration.scope)){await w.focus();try{await w.navigate(url)}catch(err){}return}}
    await clients.openWindow(url);
  })());
});
