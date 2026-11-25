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
    <div class="grid2" style="margin-top:10px"><div><b>${nf(sl/1000,1)} km</b><span>od tvojich uší</span></div><div><b>${nf(delay)} s</b><span>toľko k tebe letí zvuk</span></div></div>
    <div class="qbox">🤯 Zvuk je pomalší ako lietadlo. Počuješ ho tam, kde bolo pred ${nf(delay)} sekundami – odvtedy preletelo ďalších ${nf(back/1000,1)} km. Pozri sa ${a.trk!=null?"viac na "+dirL(a.trk):"pred zvuk"}!</div>`;
  ping("u");
}
$("b-shazam").onclick=shazam;
$("shzClose").onclick=()=>{shzStop();$("shz").classList.remove("on")};

/* ============ 🗺️ Mapa trasy ============ */
let LMAP=null,LLAYER=null,leafletLoading=null,mapLoading=null,mapRequest=0;
const mapAssetsVersion=new URL(document.currentScript.src).search;
const skMapBounds=[[47.68,16.74],[49.65,22.65]];
function loadLeaflet(){
  if(window.L)return Promise.resolve();
  if(leafletLoading)return leafletLoading;
  if(!document.querySelector('link[data-leaflet]')){
    const css=document.createElement("link");css.rel="stylesheet";css.href="lib/leaflet/leaflet.css"+mapAssetsVersion;css.dataset.leaflet="";document.head.appendChild(css);
  }
  leafletLoading=new Promise((resolve,reject)=>{
    const script=document.createElement("script");script.src="lib/leaflet/leaflet.js"+mapAssetsVersion;
    script.onload=()=>window.L?resolve():reject(Error("mapa sa nenačítala"));
    script.onerror=()=>{script.remove();reject(Error("mapa sa nenačítala"))};
    document.head.appendChild(script);
  }).finally(()=>{leafletLoading=null});
  return leafletLoading;
}
function loadGameMap(){
  if(LMAP)return Promise.resolve();
  if(mapLoading)return mapLoading;
  mapLoading=Promise.all([loadLeaflet(),fetch("lib/map-base.json"+mapAssetsVersion).then(r=>{
    if(!r.ok)throw Error("mapový podklad");return r.json();
  })]).then(([,world])=>{
    LMAP=L.map("map",{zoomControl:true,minZoom:2,maxZoom:11,attributionControl:true,worldCopyJump:false});
    L.geoJSON(world,{interactive:false,attribution:'<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>',
      style:f=>({weight:f.properties.country==="SK"?1.4:.75,color:"#7395a8",
        fillColor:f.properties.country==="SK"?"#294c50":"#243b4c",fillOpacity:1})}).addTo(LMAP);
    LLAYER=L.layerGroup().addTo(LMAP);
  }).finally(()=>{mapLoading=null});
  return mapLoading;
}
function mapSetup(attempt,title,open){
  const modal=$("mapM");modal.classList.add("on");
  $("map").setAttribute("aria-label",title);
  $("mapInfo").textContent="Načítavam mapu…";
  return loadGameMap().then(()=>attempt===mapRequest&&modal.classList.contains("on")).catch(()=>{
    if(attempt!==mapRequest)return false;
    $("mapInfo").innerHTML='Mapový podklad sa nepodarilo načítať. <button type="button" class="ghost" id="mapRetry">Skúsiť znova</button>';
    $("mapRetry").onclick=open;
    return false;
  });
}
function fitGameMap(attempt,points,options){
  requestAnimationFrame(()=>{
    if(attempt!==mapRequest||!$("mapM").classList.contains("on"))return;
    LMAP.invalidateSize({animate:false});LMAP.fitBounds(points,{animate:false,...options});
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
// 🗺️ Mapa mávania: kde na Slovensku sa máva (len štvorce ~5 km s aspoň 5 hráčmi – nikoho nevidno samostatne)
async function openHeat(){
  const attempt=++mapRequest;
  if(!await mapSetup(attempt,"Mapa mávania na Slovensku",openHeat))return;
  LLAYER.clearLayers();
  fitGameMap(attempt,skMapBounds,{padding:[15,16]});
  let j=null;
  try{const r=await fetch(DEFAULT_PROXY+"/api/heat",{signal:AbortSignal.timeout(5000)});if(r.ok)j=await r.json()}catch(e){}
  if(attempt!==mapRequest||!$("mapM").classList.contains("on"))return;
  const cells=(j&&j.cells)||[],max=Math.max(5,...cells.map(c=>c[2]));
  cells.forEach(([la,lo,p])=>L.circle([la,lo],{radius:2500+3500*Math.sqrt(p/max),stroke:false,fillColor:p>=max*.5?"#ffcf4f":"#ff4fd8",fillOpacity:.25+.45*p/max}).bindTooltip(p+" "+pl(p,"hráč","hráči","hráčov")).addTo(LLAYER));
  if(S.pos)L.circleMarker([S.pos.lat,S.pos.lon],{radius:6,color:"#6dffc7",fillColor:"#6dffc7",fillOpacity:.9}).bindTooltip("Ty").addTo(LLAYER);
  const town=typeof TOWNS!=="undefined"&&TOWNS.find(p=>p[0]===LS.get("ctl_adopt",""));
  if(town)L.circleMarker([town[1],town[2]],{radius:7,color:"#ffdb8c",fillColor:"#ffdb8c",fillOpacity:.9}).bindTooltip(esc(town[0]),{permanent:true,direction:"top"}).addTo(LLAYER);
  $("mapInfo").textContent=!j?"Údaje o mávaní sú dočasne nedostupné.":cells.length?"Miesta, kde tento alebo minulý mesiac mávalo aspoň 5 hráčov.":"Miesto sa ukáže, keď v ňom zamáva aspoň 5 hráčov.";
}
async function openMap(){
  const a=S.top,pos=S.pos;
  if(!a||!pos){toast("Nič na mape","Počkaj, kým niečo preletí");return}
  const attempt=++mapRequest;
  if(!await mapSetup(attempt,"Mapa letu",openMap))return;
  LLAYER.clearLayers();
  const stale=skyStale(),cur=enrich(Date.now()).find(x=>x.hex===a.hex)||a,m=S.meta.get(a.hex)||{},rt=stale?null:catchRoute(a),pts=[[pos.lat,pos.lon],[cur.lat,cur.lon]];
  L.circleMarker([pos.lat,pos.lon],{radius:7,color:"#6dffc7",fillColor:"#6dffc7",fillOpacity:.9}).bindTooltip("Ty",{permanent:true,direction:"bottom"}).addTo(LLAYER);
  let info=titleOf(a)+" · "+typeName(a,m);
  if(rt&&[rt.origin?.latitude,rt.origin?.longitude,rt.destination?.latitude,rt.destination?.longitude].every(x=>x!=null&&Number.isFinite(Number(x)))){
    const o=[rt.origin.latitude,rt.origin.longitude],d=[rt.destination.latitude,rt.destination.longitude];
    L.polyline(gcPath(o,[cur.lat,cur.lon]),{color:"#4fc3ff",weight:3}).addTo(LLAYER);
    L.polyline(gcPath([cur.lat,cur.lon],d),{color:"#ff4fd8",weight:3,dashArray:"6 8"}).addTo(LLAYER);
    [[o,rt.origin],[d,rt.destination]].forEach(([p,ap])=>L.circleMarker(p,{radius:5,color:"#fff",fillOpacity:1}).bindTooltip(esc((ap.iata_code||"")+" "+citySk(ap.municipality||ap.name||"")),{permanent:true,direction:"top"}).addTo(LLAYER));
    pts.push(o,d);
    const d1=distBear(o[0],o[1],cur.lat,cur.lon).d,d2=distBear(cur.lat,cur.lon,d[0],d[1]).d;
    info+=` · ${citySk(rt.origin.municipality||rt.origin.name)||rt.origin.iata_code} → ${citySk(rt.destination.municipality||rt.destination.name)||rt.destination.iata_code} · prejdených ${nf(d1/(d1+d2)*100)} % · zostáva ${nf(d2/1000)} km`;
    if(cur.spd)info+=` (asi ${Math.floor(d2/(cur.spd/3.6)/3600)} h ${Math.round(d2/(cur.spd/3.6)%3600/60)} min)`;
  }else info+=stale?" · Posledná známa poloha":" · trasa nedostupná";
  const ic=L.divIcon({className:"",html:`<div style="font-size:26px;transform:rotate(${(cur.trk??0)-45}deg);filter:drop-shadow(0 0 6px #6dffc7)">✈️</div>`,iconSize:[30,30],iconAnchor:[15,15]});
  L.marker([cur.lat,cur.lon],{icon:ic}).addTo(LLAYER);
  $("mapInfo").textContent=info;
  fitGameMap(attempt,pts,{padding:[36,36],maxZoom:9});
}
$("b-map").onclick=openMap;
$("mapClose").onclick=()=>$("mapM").classList.remove("on");

/* ============ 🎯 Denné výzvy ============ */
const DAILY_POOL=[
  {id:"wide",i:"🐋",n:"Zamávaj širokotrupému lietadlu",h:"Airbus A330/A350, Boeing 777/787…",t:a=>WIDE.has(a.type)},
  {id:"low",i:"🛬",n:"Zamávaj lietadlu nižšie ako 3 000 m",h:"Pristávajúce alebo štartujúce",t:a=>a.alt!=null&&a.alt<3000},
  {id:"high",i:"🏔️",n:"Zamávaj lietadlu vyššie ako 11 500 m",h:"To je viac ako 4× Gerlach",t:a=>a.alt!=null&&a.alt>11500},
  {id:"fast",i:"⚡",n:"Zamávaj lietadlu rýchlejšiemu ako 950 km/h",h:"S poriadnym chvostovým vetrom",t:a=>a.spd!=null&&a.spd>950},
  {id:"cargo",i:"📦",n:"Zamávaj nákladnému lietadlu",h:"DHL, UPS, FedEx…",t:a=>CARGO_RX.test(airlineOf(a))},
  {id:"five",i:"🖐️",n:"Zamávaj dnes 5 lietadlám",h:"Každé musí byť iné",need:5,t:()=>true},
  {id:"air3",i:"🎨",n:"Zamávaj lietadlám 3 rôznych aeroliniek",h:"Ryanair, Wizz, Lufthansa…",need:3,key:a=>airlineOf(a)},
  {id:"sun",i:"🏖️",n:"Zamávaj lietadlu, ktoré letí k moru",h:"Turecko, Egypt, Grécko, Španielsko, Chorvátsko…",t:a=>{const m=S.meta.get(a.hex),c=m&&m.route&&m.route.destination&&m.route.destination.country_iso_name;return ["TR","EG","GR","ES","HR","CY","PT","TN","IT","MT"].includes(c)}},
  {id:"far",i:"🌏",n:"Zamávaj lietadlu, ktoré letí mimo Európy",h:"Ázia, Amerika, Afrika…",t:a=>{const m=S.meta.get(a.hex),d=m&&m.route&&m.route.destination;return !!(d&&d.latitude!=null&&(d.longitude>45||d.longitude<-25||d.latitude<34))}},
  {id:"rare",i:"💎",n:"Zamávaj vzácnemu lietadlu",h:"Modré, fialové alebo zlaté na radare",t:a=>["r","e","l"].includes(rarity(a))},
  {id:"zen",i:"🎯",n:"Zamávaj lietadlu vyššie ako 70°",h:"Takmer priamo nad hlavou",t:a=>a.el>=70},
  {id:"shazam",i:"👂",n:"Vyskúšaj „Čo to hučí?“",h:"Keď počuješ lietadlo",ev:true},
  // 📅 sviatočné výzvy (len v daný deň, vždy ako prvá)
  {id:"miki",sp:"12-06",i:"🎅",n:"Mikulášska výzva: zamávaj 6 lietadlám",h:"Zamávaj 6-krát · odznak Mikuláš",need:6,ev:true,ach:"mikulas"},
  {id:"civil",sp:"12-07",i:"✈️",n:"Deň civilného letectva: 3 aerolinky",h:"Zamávaj lietadlám 3 rôznych aeroliniek",need:3,key:a=>airlineOf(a),ach:"civil"},
  {id:"stefanik",sp:"05-04",i:"🇸🇰",n:"Deň Štefánika: zamávaj lietadlu nad 11 500 m",h:"Na počesť prvého slovenského letca",t:a=>a.alt!=null&&a.alt>11500,ach:"stefanik"},
  {id:"snp",sp:"08-29",i:"🇸🇰",n:"Výročie SNP: zamávaj 5 lietadlám",h:"Zamávaj 5 rôznym lietadlám",need:5,t:()=>true},
  {id:"silvester",sp:"12-31",i:"🎆",n:"Silvester: zamávaj poslednému lietadlu roka",h:"Zamávaj ešte dnes aspoň jednému",ev:true,ach:"silvester"},
];
ACH.push({id:"mikulas",i:"🎁",n:"Mikulášsky spotter",h:"Len 6. 12.: splň Mikulášsku výzvu",c:()=>false},{id:"civil",i:"✈️",n:"Deň civilného letectva",h:"Len 7. 12.: splň výzvu Dňa civilného letectva",c:()=>false},{id:"stefanik",i:"⭐",n:"Na počesť Štefánika",h:"Len 4. 5.: splň výzvu na počesť Štefánika",c:()=>false},{id:"silvester",i:"🎆",n:"Posledné lietadlo roka",h:"Len 31. 12.: zamávaj aspoň jednému lietadlu",c:()=>false});
const today=()=>new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava"}).format(new Date());
let DAILY=LS.get("ctl_daily",null);
function dailyEnsure(){
  const d=today();
  if(!DAILY||DAILY.date!==d){
    const prev=DAILY||{streak:0,lastFull:null},h=hash(d),pool=DAILY_POOL.filter(q=>!q.sp),ids=[];
    const sp=DAILY_POOL.find(q=>q.sp===d.slice(5));if(sp)ids.push(sp.id);
    // prvá výzva vždy splniteľná aj na vidieku (nezávisí od toho, čo náhodou preletí)
    else{const easy=pool.filter(q=>["wave","five","air3","shazam"].includes(q.id));if(easy.length){const e=(Date.now()-LS.get("ctl_onbT",0)<7*864e5&&easy.find(q=>q.id==="wave"))||easy[h%easy.length];ids.push(e.id);pool.splice(pool.indexOf(e),1)}}
    for(let k=ids.length;k<3;k++){const i=(h>>>(k*5))%pool.length;ids.push(pool.splice(i,1)[0].id)}
    // séria dní, zmrazenie, rekord a oprava sa prenášajú do nového dňa (predtým sa mazali → séria stále 1)
    DAILY={...prev,date:d,ids,prog:{},done:{},swapped:0,streak:prev.streak||0,lastFull:prev.lastFull||null};
    LS.set("ctl_daily",DAILY);
  }
  return DAILY;
}
function dailyComplete(id){
  const D=dailyEnsure();if(D.done[id])return;
  D.done[id]=Date.now();COL.pts+=10;
  const x=DAILY_POOL.find(q=>q.id===id);
  if(x&&x.ach)setTimeout(()=>grantAch(x.ach),1500);
  toast("🎯 Výzva splnená! +10 bodov",x.n,"#6dffc7");confetti(40);ping("u");
  if(D.ids.every(i=>D.done[i])){
    D.lastFull=D.date;const bonus=15+Math.min(D.streak||0,7);COL.pts+=bonus;
    setTimeout(()=>{toast("🎉 Všetky 3 výzvy! +"+bonus+" bodov","Bonus za celý deň + séria","#ff4fd8");confetti(90)},typeof WB!=="undefined"&&WB?0:5600);
  }
  LS.set("ctl_daily",D);LS.set("ctl_col",COL);renderDaily();if(S.view==="col")renderCol();
}
/* 🔥 séria = deň, keď si zamával (nie výzvy – tie závisia od premávky) + ❄️ zmrazenie + míľniky */
const STREAK_MS={3:[20,""],7:[50,"streak7"],14:[80,""],30:[200,"streak30"],60:[300,""],100:[500,"streak100"]};
ACH.push({id:"streak7",i:"🔥",n:"Týždeň pod oblohou",h:"Mávaj 7 dní v rade",pr:()=>[Math.min(7,(LS.get("ctl_daily",0).streak|0)),7],c:()=>(LS.get("ctl_daily",0).best|0)>=7},{id:"streak30",i:"🌙",n:"Verný spotter (30 dní)",h:"Mávaj 30 dní v rade",pr:()=>[Math.min(30,(LS.get("ctl_daily",0).streak|0)),30],c:()=>(LS.get("ctl_daily",0).best|0)>=30},{id:"streak100",i:"🏔️",n:"Sto dní pod oblohou",h:"Mávaj 100 dní v rade",pr:()=>[Math.min(100,(LS.get("ctl_daily",0).streak|0)),100],c:()=>(LS.get("ctl_daily",0).best|0)>=100});
function dAgo(n){const d=new Date();d.setDate(d.getDate()-n);return d.toLocaleDateString("sv-SE",{timeZone:"Europe/Bratislava"})}
function streakTouch(){
  const D=dailyEnsure();
  if(D.lastDay===D.date){ // 🔧 oprava série: po výpadku stačia dnes 2 mávnutia (1× za 30 dní)
    if(D.repair&&D.repair.day===D.date){D.repair.cnt=(D.repair.cnt|0)+1;if(D.repair.cnt>=2){D.streak=D.repair.from+1;D.repairT=Date.now();D.repair=null;{const ms=STREAK_MS[D.streak];if(ms){COL.pts+=ms[0];if(ms[1])grantAch(ms[1]);LS.set("ctl_col",COL)}}toast("🔧 Séria opravená!","Pokračuješ: "+D.streak+" "+pl(D.streak,"deň","dni","dní")+" 🔥");LS.set("ctl_daily",D);streakChip()}else LS.set("ctl_daily",D)}
    return}
  const prev=D.streak||0;let used=false;
  // ❄️ zmrazenie pokryje toľko vynechaných dní, koľko ich máš (max. 3)
  const gap=D.lastDay?Math.round((new Date(D.date+"T12:00:00")-new Date(D.lastDay+"T12:00:00"))/864e5)-1:99;
  if(D.lastDay===dAgo(1))D.streak=prev+1;
  else if(gap>=1&&gap<=3&&(D.freeze|0)>=gap){D.freeze-=gap;D.streak=prev+1;used=gap}
  else{if(prev>=3)D.lost=prev;D.streak=1;if(prev>=3&&D.lastDay===dAgo(2)&&(!D.repairT||Date.now()-D.repairT>30*864e5))D.repair={from:prev,day:D.date,cnt:1}}
  D.best=Math.max(D.best|0,D.streak);
  D.lastDay=D.date;D.days=[D.date,...(D.days||[])].slice(0,14);
  if(D.streak%7===0&&(D.freeze|0)<2){D.freeze=(D.freeze|0)+1;toast("❄️ Zmrazenie série +1","Keď raz vynecháš deň, séria nespadne")}
  if(used)toast("❄️ Zmrazenie zachránilo sériu",(used>1?"Vynechal(a) si "+used+" dni":"Včera si nemával(a)")+", séria "+D.streak+" ide ďalej");
  const ms=STREAK_MS[D.streak];
  if(ms){COL.pts+=ms[0];if(ms[1])grantAch(ms[1]);toast("🔥 "+D.streak+" "+pl(D.streak,"deň","dni","dní")+" v rade! +"+ms[0]+" bodov")}
  else if(D.streak>1)toast("🔥 "+D.streak+" "+pl(D.streak,"deň","dni","dní")+" v rade",nextMs(D.streak));
  else if(D.lost)toast("🏅 Séria "+D.lost+" "+pl(D.lost,"deň","dni","dní")+" sa skončila",D.repair?"Zamávaj dnes ešte raz a séria sa obnoví 🔧":"Dnes začína nová séria");
  if(D.streak>1)D.lost=0;
  if(D.streak===2&&typeof maybeAskPush==="function")setTimeout(maybeAskPush,9000);
  LS.set("ctl_daily",D);LS.set("ctl_col",COL);renderDaily();streakChip();
}
// stav série jedným miestom: koľko, či je dnes hotová, či sa dá zachrániť
function streakLive(){const D=dailyEnsure(),n=D.streak|0,gap=D.lastDay?Math.round((new Date(D.date+"T12:00:00")-new Date(D.lastDay+"T12:00:00"))/864e5)-1:99;
  if(D.lastDay===D.date)return {n,st:"done"};
  if(gap===0)return {n,st:"pending"};
  if(gap>=1&&gap<=3&&(D.freeze|0)>=gap)return {n,st:"pending",freeze:gap};
  if(gap===1&&n>=3&&(!D.repairT||Date.now()-D.repairT>30*864e5))return {n,st:"repair"};
  return {n:0,st:"dead"}}
// ďalší míľnik série
function nextMs(n){const k=Object.keys(STREAK_MS).map(Number).sort((a,b)=>a-b).find(x=>x>n);return k?"ešte "+(k-n)+" "+pl(k-n,"deň","dni","dní")+" do 🔥"+k+" (+"+STREAK_MS[k][0]+" b)":""}
function streakChip(){
  const el=$("streakChip");if(!el)return;const L=streakLive(),D=dailyEnsure();
  el.hidden=L.st==="dead"||(L.n<2&&L.st!=="repair"&&L.st!=="pending");
  el.textContent=L.st==="repair"?"🔧 "+L.n+" · zachráň":"🔥 "+L.n+" "+pl(L.n,"deň","dni","dní")+((D.freeze|0)?" · ❄️ "+D.freeze:"");
  el.classList.toggle("pend",L.st!=="done"&&!(typeof KID==="function"&&KID()));
}
function dailyEvent(id){const D=dailyEnsure();if(!D.ids.includes(id)||D.done[id])return;const x=DAILY_POOL.find(q=>q.id===id);
  // výzvy s počtom (Mikuláš 6×) rátajú každé mávnutie
  if(x&&x.need){D.prog[id]=(D.prog[id]|0)+1;LS.set("ctl_daily",D);if(D.prog[id]<x.need){if(typeof renderDaily==="function")renderDaily();return}}dailyComplete(id)}
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
  const L=streakLive();
  $("dailyTxt").textContent=`🎯 Dnešné výzvy ${n}/3`+(L.n?` · 🔥 ${L.n}`:"")+(n===3?" ✅":"");
  // v hlavičke len krátky údaj, podrobnosti a pečiatky pod ňou (nie v riadku nadpisu)
  $("d-streak").textContent=L.st==="repair"?"🔧 "+L.n:L.n?"🔥 "+L.n+((D.freeze|0)?" · ❄️ "+D.freeze:""):"";streakChip();
  $("stampBox").innerHTML=(L.st==="repair"?`<div class="stNext">🔧 Séria ${L.n} ${pl(L.n,"deň","dni","dní")} sa dá zachrániť – dnes zamávaj 2 lietadlám</div>`:L.n?`<div class="stNext">🔥 ${L.n} ${pl(L.n,"deň","dni","dní")} v rade${nextMs(L.n)?" · "+nextMs(L.n):""}</div>`:"")+stampsHTML(D);
  $("d-list").innerHTML=D.ids.map(id=>{const x=DAILY_POOL.find(q=>q.id===id),p=D.prog[id],prog=x.need?` (${Array.isArray(p)?p.length:p||0}/${x.need})`:"";
    return `<div class="dl ${D.done[id]?"done":""}"><i>${D.done[id]?"✅":x.i}</i><div class="t">${x.n}${D.done[id]?"":prog}<small>${x.h}</small></div><b>+10</b>${!D.done[id]&&!D.swapped&&!x.sp?`<button class="swap" data-sw="${id}" aria-label="Vymeniť výzvu">🔄</button>`:""}</div>`}).join("");
  $("d-list").insertAdjacentHTML("beforeend",didYouKnow());
  if(n===3)$("d-list").insertAdjacentHTML("beforeend",`<div class="dyk">🌅 <b>Zajtra:</b> ${tomorrowIds().map(id=>{const q=DAILY_POOL.find(x=>x.id===id);return q?q.i+" "+esc(q.n):""}).join(" · ")}${L.n?` · séria ${L.n+1} 🔥`:""}</div>`);
}
// 🗓️ pečiatková karta Po–Ne: 5/7 = +1 ❄️, 7/7 = darovaná nezvyčajná kartička + 100 míľ
function weekDays(){const d=new Date(),wd=(d.getDay()+6)%7;return Array.from({length:7},(_,i)=>SKD.format(new Date(d.getTime()+(i-wd)*864e5)))}
function stampsHTML(D){const W=weekDays(),got=W.filter(x=>(D.days||[]).includes(x)).length;stampReward(D,W,got);
  return `<div class="stamps">${W.map((x,i)=>`<span class="${(D.days||[]).includes(x)?"on":x===D.date?"now":""}">${"PUSŠPSN"[i]}<b>${(D.days||[]).includes(x)?"✓":""}</b></span>`).join("")}</div><div class="lookSub" style="text-align:center;font-size:12px">Týždeň ${got}/7 · 5 dní = ❄️ · 7 dní = 🎁 kartička + 100 míľ</div>`}
function stampReward(D,W,got){const k=W[0];D.wkRew=D.wkRew||{};const r=D.wkRew[k]||(D.wkRew[k]={});let ch=false;
  if(got>=5&&!r[5]){r[5]=1;ch=true;if((D.freeze|0)<3)D.freeze=(D.freeze|0)+1;setTimeout(()=>toast("🗓️ 5 dní tento týždeň!","❄️ Zmrazenie série +1"),1200)}
  if(got>=7&&!r[7]){r[7]=1;ch=true;COL.mi=(COL.mi|0)+100;const miss=CATALOG.map(c=>c[0]).filter(k=>typeTier(k)==="u"&&!(COL.types[k]&&COL.types[k].n));const g=miss[hash(k)%Math.max(1,miss.length)];
    if(g){COL.types[g]=COL.types[g]||{n:0,r:"u",name:catGuess(g).name,first:Date.now()};COL.types[g].gift={from:"Týždeň 7/7",t:Date.now()}}LS.set("ctl_col",COL);
    setTimeout(()=>toast("🏆 Celý týždeň pod oblohou!","+100 míľ"+(g?" a kartička "+catGuess(g).name+" 🤝":"")),1500)}
  for(const x of Object.keys(D.wkRew))if(x<W[0]&&Object.keys(D.wkRew).length>4)delete D.wkRew[x];
  if(ch)LS.set("ctl_daily",D)}
// výzvy na zajtra (rovnaký výber ako dailyEnsure)
function tomorrowIds(){const d=SKD.format(new Date(Date.now()+864e5)),h=hash(d),pool=DAILY_POOL.filter(q=>!q.sp),ids=[];
  const sp=DAILY_POOL.find(q=>q.sp===d.slice(5));if(sp)ids.push(sp.id);
  else{const easy=pool.filter(q=>["wave","five","air3","shazam"].includes(q.id));if(easy.length){const e=(Date.now()-LS.get("ctl_onbT",0)<7*864e5&&easy.find(q=>q.id==="wave"))||easy[h%easy.length];ids.push(e.id);pool.splice(pool.indexOf(e),1)}}
  for(let k=ids.length;k<3;k++){const i=(h>>>(k*5))%pool.length;ids.push(pool.splice(i,1)[0].id)}return ids}
// 💡 Vieš, že…? – raz denne zaujímavosť, prednostne o kartičke, ktorá ti chýba
function didYouKnow(){
  const miss=CATALOG.filter(x=>!(COL.types[x[0]]&&COL.types[x[0]].n)&&!TROPHY.has(x[0])&&x[10]);
  const pool=(miss.length?miss:CATALOG.filter(x=>x[10])),x=pool[hash(dayKey()+"dyk")%pool.length];if(!x)return "";
  const have=COL.types[x[0]]&&COL.types[x[0]].n;
  return `<div class="dyk" data-dyk="${esc(x[0])}">💡 <b>Vieš, že…?</b> ${esc(x[1])}: ${esc(x[10])}${have?"":" <small>Zamávaj mu a kartička je tvoja.</small>"}</div>`}
$("dailyStrip").onclick=()=>openCollectionSection("dailyBox");

/* ============ ⚔️ Výzva pre kamaráta ============ */
const b64e=s=>btoa(unescape(encodeURIComponent(s))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/"))));
const nick=()=>($("nick").value||"").trim()||LS.get("ctl_nick","")||"Spotter";
function myScore(){return {n:nick(),p:COL.pts,t:Object.keys(COL.types).length,c:COL.n,l:lvlOf(COL.pts)+1,pid:(typeof PID!=="undefined"?PID:""),fk:(typeof FK!=="undefined"?FK:"")}}
// pred prvou pozvánkou: nech kamarát vie, od koho to je (nie „Spotter“)
function ensureNick(){if(typeof KID==="function"&&KID())return true;if(LS.get("ctl_nick",""))return true;
  const n=prompt("Ako ťa kamaráti poznajú? (prezývka, nie celé meno)","");if(n===null)return false;const v=String(n).trim().slice(0,20);
  if(v.length>=2){LS.set("ctl_nick",v);if($("nick"))$("nick").value=v;return true}toast("Prezývka musí mať aspoň 2 znaky","");return false}
async function sendDuel(){
  if(!ensureNick())return;
  if(typeof ensureTok==="function")await ensureTok();
  const me=myScore(),url=shareUrl("v",b64e(JSON.stringify(me)));
  const town=typeof townOf==="function"&&S.pos?townOf(S.pos):"";const text=`👋 Mávam lietadlám${town?" ("+town+")":""} a zbieram ich kartičky ✈️ Pridaj sa – keď zamávame tomu istému lietadlu do 10 minút, máme obaja bonus. Mám ${me.t} ${pl(me.t,"kartičku","kartičky","kartičiek")}, prekonáš ma?`;
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
  if(!LS.get("ctl_onb",0)){afterOnb(checkDuelLink);return}
  const m=location.hash.match(/vyzva=([\w-]+)/);if(!m)return;
  // detský režim: žiadne výzvy (meno) od cudzích ľudí
  if(typeof KID==="function"&&KID()){try{history.replaceState(null,"",location.pathname)}catch(e){}return}
  try{
    const r=JSON.parse(b64d(m[1]));if(typeof r.p!=="number")return;
    r.n=String(r.n||"Kamarát").replace(/[^\p{L}\p{N} ._-]/gu,"").slice(0,20)||"Kamarát";
    if(/kokot|pic[aeiu]|kurv|jeb|debil|chuj|hovn|srac|fuck|shit|negr|cigan|buzn|zmrd|retard/i.test(r.n.normalize("NFD").replace(/[\u0300-\u036f]/g,"")))r.n="Kamarát";
    LS.set("ctl_rival",r);
    // kamarátom až po ťuknutí (súhlas oboch: on poslal odkaz, ty potvrdíš)
    const canFr=r.pid&&/^[A-Za-z0-9]{16}$/.test(r.pid)&&/^[A-Za-z0-9]{10}$/.test(r.fk||"");
    const fr=canFr&&!LS.get("ctl_kid",false);$("duelFr").style.display="none";
    // jedno hlavné tlačidlo: prijať výzvu a rovno sa stať kamarátmi
    $("duelGo").textContent=fr?"💪 Prijímam a pridávam "+r.n:"Prijímam výzvu 💪";$("duelGo").className="btn pri";
    $("duelGo").onclick=()=>{$("duelM").classList.remove("on");if(fr)$("duelFr").onclick();else toast("💪 Výzva prijatá","Zamávaj lietadlám a prekonaj "+r.n)};
    $("duelFr").onclick=()=>{apiPost("/api/friend",{pid:r.pid,fk:r.fk}).then(async x=>{const j=await x.json().catch(()=>({}));if(x.ok)toast("👯 Ste kamaráti","Uvidíte, ktorým lietadlám ste dnes mávali. Odobrať sa dá v sekcii Ja.");else toast("Pozvánka už neplatí","Platí 7 dní – popros o novú")}).catch(()=>{});$("duelM").classList.remove("on")};
    $("duelT").textContent=r.n+" ťa vyzýva!";
    $("duelS").textContent=`Má ${r.p} b, ${r.c} ${pl(r.c,"úlovok","úlovky","úlovkov")} a ${r.t} ${pl(r.t,"typ","typy","typov")} (level ${r.l}). Prekonáš to?`;
    // výzvu ukáž až po prvom mávnutí – nech neprekryje prvý zážitok s lietadlom
    const show=()=>{if(document.querySelector(".modal.on")){setTimeout(show,1500);return}$("duelM").classList.add("on")};
    if((LS.get("ctl_waveN",0)|0)>0)show();else{const t=setInterval(()=>{if((LS.get("ctl_waveN",0)|0)>0){clearInterval(t);setTimeout(show,3500)}},2000);toast("⚔️ "+r.n+" ťa vyzýva","Najprv zamávaj prvému lietadlu 👋")}
  }catch(e){}
  try{history.replaceState(null,"",location.pathname)}catch(e){}
}
$("duelGo").onclick=()=>$("duelM").classList.remove("on");$("duelNo")&&($("duelNo").onclick=()=>$("duelM").classList.remove("on"));
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
  if(standalone()||LS.get("ctl_noinst",false)||inApp||(visits<2&&(LS.get("ctl_waveN",0)|0)<3))return;
  if(isIOS()){$("installBar").style.display="";$("installTxt").textContent="📲 Na plochu"}
}
$("installBar").onclick=async()=>{
  if(installEvt){installEvt.prompt();try{await installEvt.userChoice}catch(e){}installEvt=null;$("installBar").style.display="none"}
  else installGuide();
};
$("b-installX").onclick=e=>{e.stopPropagation();LS.set("ctl_noinst",true);$("installBar").style.display="none"};
// 🔄 nová verzia: pri návrate do appky sa skontroluje a keď sa prevezme, appka sa potichu obnoví (keď ju práve nepoužívaš)
if("serviceWorker" in navigator&&location.protocol==="https:"){navigator.serviceWorker.register("sw.js").then(reg=>{
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)reg.update().catch(()=>{})});setInterval(()=>reg.update().catch(()=>{}),30*60e3)}).catch(()=>{});
  const had=!!navigator.serviceWorker.controller;let pending=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!had)return;pending=true;
    const go=()=>{if(document.querySelector(".modal.on")||WB)return false;if(typeof lsFlush==="function")lsFlush();location.reload();return true};
    if(document.hidden)go();else document.addEventListener("visibilitychange",function h(){if(document.hidden&&pending&&go())document.removeEventListener("visibilitychange",h)})})}


// jedna výmena výzvy denne (keď je výzva v tvojom okolí nesplniteľná)
$("d-list").addEventListener("click",e=>{
  const b=e.target.closest("[data-sw]");if(!b)return;const D=dailyEnsure();if(D.swapped)return;{const q=DAILY_POOL.find(q=>q.id===b.dataset.sw);if(q&&q.sp)return}
  const pool=DAILY_POOL.filter(q=>!q.sp&&!D.ids.includes(q.id));if(!pool.length)return;
  const nw=pool[Math.floor(Math.random()*pool.length)];D.ids=D.ids.map(i=>i===b.dataset.sw?nw.id:i);D.swapped=1;LS.set("ctl_daily",D);renderDaily();haptic(8);toast("🔄 Nová výzva",nw.n);
});

/* ============ 🎨 špeciálne nátery a 🥇 prvé lety (zoznam zadáva majiteľ v /admin) ============ */
let SPECIAL=LS.get("ctl_spec",null);
(async()=>{if(SPECIAL&&Date.now()-SPECIAL.t<6*3600e3)return;try{const j=await fetch(DEFAULT_PROXY+"/api/specials").then(r=>r.json());SPECIAL={t:Date.now(),lv:j.lv||{},fi:j.fi||[]};LS.set("ctl_spec",SPECIAL)}catch(e){}})();
function specialOf(a){if(!a||!SPECIAL)return null;const reg=String(a.reg||"").toUpperCase();
  if(reg&&SPECIAL.lv&&SPECIAL.lv[reg])return {k:"lv",t:"🎨 Špeciálny náter: "+SPECIAL.lv[reg]};
  const d=dayKey(),c=String(a.call||"").toUpperCase(),f=(SPECIAL.fi||[]).find(x=>x.d===d&&x.call===c);
  return f?{k:"fi",t:"🥇 "+f.txt}:null}
HOOKS.heroStatic.push(a=>{const s=specialOf(a);if(s)setTimeout(()=>{if(S.top&&a&&S.top.hex===a.hex)$("h-quip").textContent=s.t+" – zamávaj mu!"},0)});
HOOKS.caught.push(a=>{const s=specialOf(a);if(!s)return;if(s.k==="lv")grantAch("livery");else grantAch("firstflight");toast(s.t,"Ulovil(a) si niečo výnimočné ✨")});
ACH.push({id:"livery",i:"🎨",n:"Lovec náterov",h:"Zamávaj lietadlu so špeciálnym náterom (zoznam v appke sa priebežne dopĺňa)",c:()=>false},
  {id:"firstflight",i:"🥇",n:"Bol(a) som pri prvom lete",h:"Zamávaj lietadlu v deň prvého letu novej linky",c:()=>false});
