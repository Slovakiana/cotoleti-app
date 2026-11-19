// Offline obal appky + upozornenia. Vždy najprv skúša sieť, aby si mal najnovšiu verziu.
const V="cotoleti-v10";
const SHELL=["./","index.html","js/core.js","js/ui.js","js/ar.js","js/space.js","js/weather.js","js/extras.js","js/social.js","js/wrapped.js","js/push.js","js/track.js","js/towns.js","js/catalog.js","js/cards.js","js/mail.js","js/golden.js","js/teams.js","js/duel.js","js/sound.js","js/main.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=="ctl-id").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET"||u.origin!==location.origin)return; // dáta o lietadlách nikdy necachujeme
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));
});
// identita pre upozornenia (appka ju pošle cez postMessage)
self.addEventListener("message",e=>{
  const d=e.data||{};if(!d.cid||!d.api)return;
  e.waitUntil(caches.open("ctl-id").then(c=>c.put("/__id",new Response(JSON.stringify({cid:d.cid,api:d.api})))));
});
self.addEventListener("push",e=>{
  e.waitUntil((async()=>{
    let m={title:"✈️ Pozri hore!",body:"Niečo zaujímavé letí nad tebou.",url:"./"};
    try{
      const c=await caches.open("ctl-id"),r=await c.match("/__id");
      if(r){const id=await r.json();const j=await fetch(id.api+"/api/msg?id="+encodeURIComponent(id.cid),{cache:"no-store"}).then(x=>x.json());if(j&&j.title)m=j}
    }catch(err){}
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
