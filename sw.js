// Offline obal appky + upozornenia. Vždy najprv skúša sieť, aby si mal najnovšiu verziu.
const V="cotoleti-v55";
const SHELL=["./","index.html","fonts/inter.woff","fonts/unbounded.woff","js/core.js","js/ui.js","js/ar.js","js/space.js","js/weather.js","js/extras.js","js/social.js","js/wrapped.js","js/push.js","js/track.js","js/towns.js","js/catalog.js","js/cards.js","js/mail.js","js/golden.js","js/teams.js","js/duel.js","js/sound.js","js/santa.js","js/main.js","og/default.jpg","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=="ctl-id").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin)return; // dáta o lietadlách nikdy necachujeme
  if(/^\/(api|s|admin)(\/|$)/.test(u.pathname))return; // osobné odpovede servera do pamäte neukladáme
  const versioned=/\?v=\d+/.test(u.search);
  const nav=e.request.mode==="navigate";
  // sieť s limitom (vonku je často slabý signál) -> inak posledná uložená verzia
  const net=new Promise((res,rej)=>{const t=setTimeout(()=>rej(new Error("timeout")),nav?3500:6000);
    fetch(e.request,{cache:"no-cache"}).then(r=>{clearTimeout(t);res(r)},err=>{clearTimeout(t);rej(err)})});
  // súbory s verziou (?v=) sa nemenia -> najprv z pamäte (rýchly štart aj pri slabom signáli)
  if(versioned){e.respondWith(caches.match(e.request).then(c=>c||net.catch(err=>caches.match(e.request,{ignoreSearch:true}).then(x=>x||Promise.reject(err))).then(r=>{if(r.ok&&r.type==="basic"){const cp=r.clone();caches.open(V).then(x=>x.put(e.request,cp))}return r})));return}
  e.respondWith(net.then(r=>{if(r.ok&&r.type==="basic"){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp))}return r})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(nav?caches.match("index.html"):Response.error()))));
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
  const url=new URL((e.notification.data&&e.notification.data.url)||"./",self.registration.scope).href;
  e.waitUntil((async()=>{
    const all=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const w of all){if(w.url.startsWith(self.registration.scope)){await w.focus();try{await w.navigate(url)}catch(err){}return}}
    await clients.openWindow(url);
  })());
});
