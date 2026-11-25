// Offline obal appky + upozornenia. Vždy najprv skúša sieť, aby si mal najnovšiu verziu.
const V="cotoleti-v90";
const SHELL=["./","index.html","fonts/inter.woff","fonts/unbounded.woff","js/core.js","js/ui.js","js/ar.js","js/space.js","js/weather.js","js/extras.js","js/social.js","js/wrapped.js","js/push.js","js/track.js","js/towns.js","js/catalog.js","js/cards.js","lib/card-art/classic.webp","lib/card-art/n.webp","lib/card-art/g.webp","lib/card-art/z.webp","lib/card-art/h.webp","lib/card-art/f.webp","js/journal.js","lib/journal.css","lib/journal-world.json","lib/journal-brands.json","js/mail.js","js/golden.js","js/teams.js","js/duel.js","js/sound.js","js/santa.js","js/main.js","og/default.jpg","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys()
  .then(keys=>Promise.all(keys.filter(key=>/^cotoleti-v\d+$/.test(key)&&key!==V).map(key=>caches.delete(key))))
  .then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url),scope=new URL(self.registration.scope);
  if(e.request.method!=="GET"||u.origin!==scope.origin||!u.pathname.startsWith(scope.pathname))return;
  const path=u.pathname.slice(scope.pathname.length);
  if(/^(api|s|admin)(\/|$)/.test(path)||u.searchParams.has("url"))return;
  const nav=e.request.mode==="navigate",rev=u.searchParams.get("v");
  e.respondWith((async()=>{
    const cache=await caches.open(V);
    if(!nav&&/^\d+$/.test(rev||"")){
      const saved=await cache.match(e.request)||
        (V==="cotoleti-v"+rev&&await cache.match(e.request,{ignoreSearch:true}));
      if(saved)return saved;
    }
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),nav?3500:6000);
    try{
      const response=await fetch(e.request,{cache:"no-cache",signal:ctl.signal});
      if(response.ok&&response.type==="basic"&&!/\bno-store\b/i.test(response.headers.get("Cache-Control")||""))
        e.waitUntil(cache.put(e.request,response.clone()).catch(()=>{}));
      return response;
    }catch(e){
      const saved=await cache.match(e.request)||(!rev&&await cache.match(e.request,{ignoreSearch:true}));
      return saved||(nav&&await cache.match(new URL("index.html",scope)))||Response.error();
    }finally{clearTimeout(timer)}
  })());
});
self.addEventListener("pushsubscriptionchange",e=>{
  e.waitUntil((async()=>{try{const sub=await self.registration.pushManager.subscribe(e.oldSubscription&&e.oldSubscription.options||{userVisibleOnly:true});
    const c=await caches.open("ctl-id"),r=await c.match("/__id");if(!r||!sub)return;const id=await r.json();
    await fetch(API+"/api/sub",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({id:id.cid,tok:id.tok,sub:sub.toJSON(),keep:1})})}catch(err){}})());
});
// identita pre upozornenia (appka ju pošle cez postMessage)
// adresa servera je pevná – stránka ju nemôže podvrhnúť
const API="https://cotoleti-app.radovan-kudela.workers.dev";
self.addEventListener("message",e=>{
  const d=e.data||{};if(!d.cid)return;
  try{if(e.source&&e.source.url&&!e.source.url.startsWith(self.registration.scope))return}catch(err){return}
  if(d.clear){e.waitUntil(caches.delete("ctl-id"));return}
  e.waitUntil(caches.open("ctl-id").then(c=>c.put("/__id",new Response(JSON.stringify({cid:d.cid,tok:d.tok||""})))));
});
self.addEventListener("push",e=>{
  e.waitUntil((async()=>{
    let m={title:"✈️ Pozri hore!",body:"Niečo zaujímavé letí nad tebou.",url:"./"};
    try{
      const c=await caches.open("ctl-id"),r=await c.match("/__id");
      if(r){const id=await r.json();const j=await fetch(API+"/api/msg",{method:"POST",cache:"no-store",headers:{"Content-Type":"text/plain"},body:JSON.stringify({id:id.cid,tok:id.tok||""})}).then(x=>x.json());if(j&&j.title)m=j}
    }catch(err){}
    try{self.navigator.setAppBadge&&self.navigator.setAppBadge(1)}catch(err){}
    await self.registration.showNotification(m.title,{body:m.body,icon:"icons/icon-192.png",badge:"icons/icon-192.png",data:{url:m.url||"./"},tag:"cotoleti",renotify:true,vibrate:[200,100,200]});
  })());
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
