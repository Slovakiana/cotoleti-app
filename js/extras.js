"use strict";
/* ============ 👂 Shazam na lietadlá ============ */
let shzStream=null,shzRaf=null;
async function shazam(){
  $("shz").classList.add("on");
  $("shzRes").innerHTML='<div class="big" style="font-size:24px">Počúvam…</div><div class="lookSub">Drž mobil smerom k zvuku</div>';
  const cv=$("shzWave"),c=cv.getContext("2d");let an=null,buf=null;
  try{
    shzStream=await navigator.mediaDevices.getUserMedia({audio:true});
    const ac=new (window.AudioContext||window.webkitAudioContext)(),src=ac.createMediaStreamSource(shzStream);
    an=ac.createAnalyser();an.fftSize=256;src.connect(an);buf=new Uint8Array(an.frequencyBinCount);
  }catch(e){}
  const t0=Date.now();
  const draw=()=>{
    c.clearRect(0,0,cv.width,cv.height);
    const n=48,w=cv.width/n;
    if(an)an.getByteFrequencyData(buf);
    for(let i=0;i<n;i++){
      const v=an?buf[Math.floor(i*buf.length/n/1.6)]/255:(.25+.6*Math.abs(Math.sin(Date.now()/180+i*.5))*Math.random());
      const h=Math.max(4,v*cv.height);
      const g=c.createLinearGradient(0,cv.height,0,0);g.addColorStop(0,"#4fc3ff");g.addColorStop(1,"#ff4fd8");
      c.fillStyle=g;c.fillRect(i*w+2,(cv.height-h)/2,w-4,h);
    }
    if(Date.now()-t0<3200)shzRaf=requestAnimationFrame(draw);else shzDone();
  };
  draw();
}
function shzStop(){cancelAnimationFrame(shzRaf);if(shzStream){shzStream.getTracks().forEach(x=>x.stop());shzStream=null}}
function shzDone(){
  shzStop();
  const C=343; // rýchlosť zvuku m/s
  const cands=enrich(Date.now()).filter(a=>a.alt!=null).map(a=>{const sl=Math.hypot(a.dist,a.alt);return {a,sl,score:(a.alt<3000?2.5:1)/(sl*sl)}}).filter(x=>x.sl<25000).sort((x,y)=>y.score-x.score);
  if(!cands.length){
    $("shzRes").innerHTML='<div class="big" style="font-size:22px">Nič blízko nelieta 🤷</div><div class="lookSub">Hučí asi diaľnica, vietor alebo sused s vysávačom. 🚗</div>';return;
  }
  const {a,sl}=cands[0],delay=sl/C,m=S.meta.get(a.hex);
  // kde bolo lietadlo, keď z neho vyšiel zvuk, ktorý práve počuješ
  const back=a.spd!=null?a.spd/3.6*delay:0;
  grantAch("shazam");if(window.dailyEvent)dailyEvent("shazam");
  $("shzRes").innerHTML=`<div class="lbl" style="margin-top:4px"><span>Počuješ</span></div>
    <div class="big" style="font-size:30px">${esc(titleOf(a))}</div>
    <div class="sub">${esc(typeName(a,m))}${airlineOf(a)?" · "+esc(airlineOf(a)):""}</div>
    <div class="grid2" style="margin-top:10px"><div><b>${nf(sl/1000,1)} km</b><span>od tvojich uší</span></div><div><b>${nf(delay)} s</b><span>trvá zvuku cesta k tebe</span></div></div>
    <div class="qbox">🤯 Zvuk je pomalší ako lietadlo. Počuješ ho tam, kde bolo pred ${nf(delay)} sekundami – odvtedy preletelo ďalších ${nf(back/1000,1)} km. Pozri sa ${a.trk!=null?"viac na "+dirL(a.trk):"pred zvuk"}!</div>`;
  ping("u");
}
$("b-shazam").onclick=shazam;
$("shzClose").onclick=()=>{shzStop();$("shz").classList.remove("on")};

/* ============ 🗺️ Mapa trasy ============ */
let LMAP=null,LLAYER=null;
function loadLeaflet(){
  return new Promise((res,rej)=>{
    if(window.L)return res();
    const css=document.createElement("link");css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(css);
    const urls=["https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js","https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"];let i=0;
    const next=()=>{if(i>=urls.length)return rej(new Error("mapa sa nenačítala"));const s=document.createElement("script");s.src=urls[i++];s.onload=()=>window.L?res():next();s.onerror=next;document.head.appendChild(s)};next();
  });
}
function gcPath(a,b,n=64){
  const toV=p=>{const la=rad(p[0]),lo=rad(p[1]);return [Math.cos(la)*Math.cos(lo),Math.cos(la)*Math.sin(lo),Math.sin(la)]};
  const A=toV(a),B=toV(b),d=Math.acos(Math.max(-1,Math.min(1,A[0]*B[0]+A[1]*B[1]+A[2]*B[2])));
  if(d<1e-6)return [a,b];
  const out=[];
  for(let i=0;i<=n;i++){const f=i/n,s1=Math.sin((1-f)*d)/Math.sin(d),s2=Math.sin(f*d)/Math.sin(d);
    const x=s1*A[0]+s2*B[0],y=s1*A[1]+s2*B[1],z=s1*A[2]+s2*B[2];out.push([deg(Math.atan2(z,Math.hypot(x,y))),deg(Math.atan2(y,x))])}
  return out;
}
async function openMap(){
  const a=S.top;if(!a){toast("Nič na mape","Počkaj, kým niečo preletí");return}
  $("mapM").classList.add("on");$("mapInfo").textContent="Načítavam mapu…";
  try{await loadLeaflet()}catch(e){$("mapInfo").textContent="Mapa sa nenačítala: "+e.message;return}
  if(!LMAP){
    LMAP=L.map("map",{zoomControl:false,attributionControl:true});
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{attribution:"© OpenStreetMap © CARTO",subdomains:"abcd",maxZoom:18}).addTo(LMAP);
    LLAYER=L.layerGroup().addTo(LMAP);
  }
  LLAYER.clearLayers();
  const cur=enrich(Date.now()).find(x=>x.hex===a.hex)||a,m=S.meta.get(a.hex)||{},rt=m.route,pts=[[S.pos.lat,S.pos.lon],[cur.lat,cur.lon]];
  L.circleMarker([S.pos.lat,S.pos.lon],{radius:7,color:"#6dffc7",fillColor:"#6dffc7",fillOpacity:.9}).bindTooltip("Ty",{permanent:true,direction:"bottom"}).addTo(LLAYER);
  let info=titleOf(a)+" · "+typeName(a,m);
  if(rt&&rt.origin&&rt.destination&&rt.origin.latitude!=null){
    const o=[rt.origin.latitude,rt.origin.longitude],d=[rt.destination.latitude,rt.destination.longitude];
    L.polyline(gcPath(o,[cur.lat,cur.lon]),{color:"#4fc3ff",weight:3}).addTo(LLAYER);
    L.polyline(gcPath([cur.lat,cur.lon],d),{color:"#ff4fd8",weight:3,dashArray:"6 8"}).addTo(LLAYER);
    [[o,rt.origin],[d,rt.destination]].forEach(([p,ap])=>L.circleMarker(p,{radius:5,color:"#fff",fillOpacity:1}).bindTooltip((ap.iata_code||"")+" "+(ap.municipality||""),{permanent:true,direction:"top"}).addTo(LLAYER));
    pts.push(o,d);
    const d1=distBear(o[0],o[1],cur.lat,cur.lon).d,d2=distBear(cur.lat,cur.lon,d[0],d[1]).d;
    info+=` · ${rt.origin.municipality||rt.origin.iata_code} → ${rt.destination.municipality||rt.destination.iata_code} · prejdených ${nf(d1/(d1+d2)*100)} % · zostáva ${nf(d2/1000)} km`;
    if(cur.spd)info+=` (asi ${Math.floor(d2/(cur.spd/3.6)/3600)} h ${Math.round(d2/(cur.spd/3.6)%3600/60)} min)`;
  }else info+=" · trasu pre tento let nepoznáme";
  const ic=L.divIcon({className:"",html:`<div style="font-size:26px;transform:rotate(${(cur.trk??0)-45}deg);filter:drop-shadow(0 0 6px #6dffc7)">✈️</div>`,iconSize:[30,30],iconAnchor:[15,15]});
  L.marker([cur.lat,cur.lon],{icon:ic}).addTo(LLAYER);
  $("mapInfo").textContent=info;
  setTimeout(()=>{LMAP.invalidateSize();LMAP.fitBounds(pts,{padding:[40,40],maxZoom:9})},60);
}
$("b-map").onclick=openMap;
$("mapClose").onclick=()=>$("mapM").classList.remove("on");

/* ============ 🎯 Denné výzvy ============ */
const DAILY_POOL=[
  {id:"wide",i:"🐋",n:"Ulov širokotrupé lietadlo",h:"Airbus A330/A350, Boeing 777/787…",t:a=>WIDE.has(a.type)},
  {id:"low",i:"🛬",n:"Ulov lietadlo nižšie ako 3 000 m",h:"Pristávajúce alebo štartujúce",t:a=>a.alt!=null&&a.alt<3000},
  {id:"high",i:"🏔️",n:"Ulov lietadlo vyššie ako 11 500 m",h:"To je viac ako 4× Gerlach",t:a=>a.alt!=null&&a.alt>11500},
  {id:"fast",i:"⚡",n:"Ulov lietadlo rýchlejšie ako 950 km/h",h:"S poriadnym chvostovým vetrom",t:a=>a.spd!=null&&a.spd>950},
  {id:"cargo",i:"📦",n:"Ulov nákladné lietadlo",h:"DHL, UPS, FedEx…",t:a=>/DHL|UPS|FedEx|Cargo|Kalitta|Atlas|ASL/.test(airlineOf(a))},
  {id:"five",i:"🖐️",n:"Ulov dnes 5 lietadiel",h:"Akékoľvek",need:5,t:()=>true},
  {id:"air3",i:"🎨",n:"Ulov 3 rôzne aerolinky",h:"Ryanair, Wizz, Lufthansa…",need:3,key:a=>airlineOf(a)},
  {id:"sun",i:"🏖️",n:"Nájdi let k moru",h:"Turecko, Egypt, Grécko, Španielsko, Chorvátsko…",t:a=>{const m=S.meta.get(a.hex),c=m&&m.route&&m.route.destination&&m.route.destination.country_iso_name;return ["TR","EG","GR","ES","HR","CY","PT","TN","IT","MT"].includes(c)}},
  {id:"far",i:"🌏",n:"Nájdi let mimo Európy",h:"Ázia, Amerika, Afrika…",t:a=>{const m=S.meta.get(a.hex),d=m&&m.route&&m.route.destination;return !!(d&&d.latitude!=null&&(d.longitude>45||d.longitude<-25||d.latitude<34))}},
  {id:"rare",i:"💎",n:"Ulov vzácne lietadlo",h:"Fialové alebo zlaté na radare",t:a=>["r","l"].includes(rarity(a))},
  {id:"zen",i:"🎯",n:"Ulov lietadlo vyššie ako 70°",h:"Takmer priamo nad hlavou",t:a=>a.el>=70},
  {id:"shazam",i:"👂",n:"Vyskúšaj „Čo to hučí?“",h:"Keď počuješ lietadlo",ev:true},
];
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava"}).format(new Date());
let DAILY=LS.get("ctl_daily",null);
function dailyEnsure(){
  const d=today();
  if(!DAILY||DAILY.date!==d){
    const prev=DAILY||{streak:0,lastFull:null},h=hash(d),pool=DAILY_POOL.slice(),ids=[];
    for(let k=0;k<3;k++){const i=(h>>>(k*5))%pool.length;ids.push(pool.splice(i,1)[0].id)}
    DAILY={date:d,ids,prog:{},done:{},streak:prev.streak||0,lastFull:prev.lastFull||null};
    LS.set("ctl_daily",DAILY);
  }
  return DAILY;
}
function dailyComplete(id){
  const D=dailyEnsure();if(D.done[id])return;
  D.done[id]=Date.now();COL.pts+=15;
  const x=DAILY_POOL.find(q=>q.id===id);
  toast("🎯 Výzva splnená! +15 b",x.n,"#6dffc7");confetti(40);ping("u");
  // séria rastie už pri prvej splnenej výzve dňa (včera = kalendárny deň, funguje aj pri zmene času)
  if(D.lastDay!==D.date){
    const yd=new Date();yd.setDate(yd.getDate()-1);const y=yd.toLocaleDateString("sv-SE");
    D.streak=(D.lastDay===y||D.lastFull===y)?D.streak+1:1;D.lastDay=D.date;
    if(D.streak>1)setTimeout(()=>toast("🔥 Séria "+D.streak+(D.streak<5?" dni":" dní"),"Príď aj zajtra a splň aspoň jednu výzvu","#ff4fd8"),3400);
  }
  if(D.ids.every(i=>D.done[i])){
    D.lastFull=D.date;COL.pts+=25;
    setTimeout(()=>{toast("🎉 Všetky 3 výzvy! +25 b","Bonus za celý deň","#ff4fd8");confetti(90)},5600);
  }
  LS.set("ctl_daily",D);LS.set("ctl_col",COL);renderDaily();if(S.view==="col")renderCol();
}
function dailyEvent(id){const D=dailyEnsure();if(D.ids.includes(id))dailyComplete(id)}
HOOKS.caught.push(a=>{
  const D=dailyEnsure();
  D.ids.forEach(id=>{
    if(D.done[id])return;const x=DAILY_POOL.find(q=>q.id===id);if(!x||x.ev)return;
    if(x.key){const k=x.key(a);if(!k)return;const arr=D.prog[id]||[];if(!arr.includes(k))arr.push(k);D.prog[id]=arr;if(arr.length>=x.need)dailyComplete(id)}
    else if(x.need){D.prog[id]=(D.prog[id]||0)+1;if(D.prog[id]>=x.need)dailyComplete(id)}
    else if(x.t(a))dailyComplete(id);
  });
  LS.set("ctl_daily",D);renderDaily();
});
function renderDaily(){
  const D=dailyEnsure(),n=D.ids.filter(i=>D.done[i]).length;
  $("dailyTxt").textContent=`🎯 Dnešné výzvy ${n}/3`+(D.streak?` · 🔥 ${D.streak}`:"")+(n===3?" ✅":"");
  $("d-streak").textContent=D.streak?"🔥 séria "+D.streak:"";
  $("d-list").innerHTML=D.ids.map(id=>{const x=DAILY_POOL.find(q=>q.id===id),p=D.prog[id],prog=x.need?` (${Array.isArray(p)?p.length:p||0}/${x.need})`:"";
    return `<div class="dl ${D.done[id]?"done":""}"><i>${D.done[id]?"✅":x.i}</i><div class="t">${x.n}${D.done[id]?"":prog}<small>${x.h}</small></div><b>+15</b>${!D.done[id]&&!D.swapped?`<button class="swap" data-sw="${id}" aria-label="Vymeniť výzvu">🔄</button>`:""}</div>`}).join("");
}
$("dailyStrip").onclick=()=>setView("col");

/* ============ ⚔️ Výzva pre kamaráta ============ */
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
const nick=()=>($("nick").value||"").trim()||LS.get("ctl_nick","")||"Spotter";
function myScore(){return {n:nick(),p:COL.pts,t:Object.keys(COL.types).length,c:COL.n,l:lvlOf(COL.pts)+1,pid:(typeof PID!=="undefined"?PID:""),fk:(typeof FK!=="undefined"?FK:"")}}
async function sendDuel(){
  if(typeof ensureTok==="function")await ensureTok();
  const me=myScore(),url=shareUrl("v",b64e(JSON.stringify(me)));
  const text=`⚔️ ${me.n} ťa vyzýva v appke Čo to letí? ✈️ Mám ${me.p} bodov, ${me.c} ulovených lietadiel a ${me.t} typov. Prekonáš ma?`;
  try{if(navigator.share){await navigator.share({title:"Čo to letí? – výzva",text,url});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho kamarátovi")}catch(e){prompt("Skopíruj odkaz:",url)}
}
function renderDuel(){
  const r=LS.get("ctl_rival",null);if(!r){return}
  const me=myScore(),max=Math.max(me.p,r.p,1),lead=me.p-r.p;
  $("duel").innerHTML=`<div class="duelRow"><b>Ty (${esc(me.n)})</b> · ${me.p} b<div class="bar"><i style="width:${me.p/max*100}%"></i></div></div>
    <div class="duelRow"><b>${esc(r.n)}</b> · ${r.p} b<div class="bar"><i style="width:${r.p/max*100}%;background:linear-gradient(90deg,#ffcf4f,#ff4f6d)"></i></div></div>
    <div class="lookSub" style="margin-top:8px">${lead>0?"🏆 Vedieš o "+lead+" b. Pošli mu výzvu späť!":lead===0?"Remíza! Kto uloví ďalšie?":"Chýba ti "+(-lead)+" b. Hor sa pod oblohu! ✈️"}</div>`;
}
function checkDuelLink(){
  const m=location.hash.match(/vyzva=([\w-]+)/);if(!m)return;
  try{
    const r=JSON.parse(b64d(m[1]));if(typeof r.p!=="number")return;
    r.n=String(r.n||"Kamoš").slice(0,20);LS.set("ctl_rival",r);
    // kamarátom až po ťuknutí (súhlas oboch: on poslal odkaz, ty potvrdíš)
    const canFr=r.pid&&/^[A-Za-z0-9]{16}$/.test(r.pid)&&/^[A-Za-z0-9]{10}$/.test(r.fk||"");
    $("duelFr").style.display=canFr?"":"none";
    $("duelFr").onclick=()=>{apiPost("/api/friend",{pid:r.pid,fk:r.fk}).then(x=>x.ok&&toast("👯 Ste kamaráti","Uvidíš, ktorým lietadlám dnes mával – a on tebe")).catch(()=>{});$("duelM").classList.remove("on")};
    $("duelT").textContent=r.n+" ťa vyzýva!";
    $("duelS").textContent=`Má ${r.p} bodov, ${r.c} ulovených lietadiel a ${r.t} typov (level ${r.l}). Dokážeš ho prekonať?`;
    $("duelM").classList.add("on");
  }catch(e){}
  try{history.replaceState(null,"",location.pathname)}catch(e){}
}
$("duelGo").onclick=()=>$("duelM").classList.remove("on");
addEventListener("hashchange",()=>checkDuelLink());
$("b-duel").onclick=sendDuel;
$("nick").value=LS.get("ctl_nick","");
$("nick").onchange=()=>LS.set("ctl_nick",$("nick").value.trim());
HOOKS.view.push(v=>{if(v==="col"){renderDaily();renderDuel()}});

/* ============ 📲 Inštalácia na plochu + offline ============ */
let installEvt=null;
const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone;
const visits=(LS.get("ctl_visits",0)|0)+1;LS.set("ctl_visits",visits);
addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;if(!standalone()&&!LS.get("ctl_noinst",false)&&visits>=2){$("installBar").style.display="";$("installTxt").textContent="📲 Pridať na plochu"}});
function installHint(){
  if(standalone()||LS.get("ctl_noinst",false)||visits<2)return;
  if(isIOS()){$("installBar").style.display="";$("installTxt").textContent="📲 Na plochu"}
}
$("installBar").onclick=async()=>{
  if(installEvt){installEvt.prompt();try{await installEvt.userChoice}catch(e){}installEvt=null;$("installBar").style.display="none"}
  else installGuide();
};
$("b-installX").onclick=e=>{e.stopPropagation();LS.set("ctl_noinst",true);$("installBar").style.display="none"};
if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});


// jedna výmena výzvy denne (keď je výzva v tvojom okolí nesplniteľná)
$("d-list").addEventListener("click",e=>{
  const b=e.target.closest("[data-sw]");if(!b)return;const D=dailyEnsure();if(D.swapped)return;
  const pool=DAILY_POOL.filter(q=>!D.ids.includes(q.id));if(!pool.length)return;
  const nw=pool[Math.floor(Math.random()*pool.length)];D.ids=D.ids.map(i=>i===b.dataset.sw?nw.id:i);D.swapped=1;LS.set("ctl_daily",D);renderDaily();haptic(8);toast("🔄 Nová výzva",nw.n);
});
