"use strict";
/* ============ UI základ ============ */
function setStatus(x,live){$("status").textContent=x;$("dot").className="dot"+(live?" live":"")}
function err(x){$("err").textContent=x||"";$("heroErr").textContent=x||""}
let toastT;
const TQ=[];let tBusy=false;
function toast(a,b,col){
  if(TQ.some(q=>q[0]===a)||(tBusy&&$("toastT").textContent===a))return; // bez duplicít
  TQ.push([a,b,col]);if(TQ.length>4)TQ.splice(1,TQ.length-4);if(!tBusy)toastNext();
}
function toastNext(){
  const q=TQ.shift();if(!q){tBusy=false;return}tBusy=true;
  $("toastT").textContent=q[0];$("toastS").textContent=q[1]||"";$("toast").style.borderColor=q[2]||"";$("toast").classList.add("on");
  clearTimeout(toastT);toastT=setTimeout(()=>{$("toast").classList.remove("on");setTimeout(toastNext,450)},TQ.length?2400:3200);
}
const RM=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
function confetti(n){if(RM())n=Math.min(n,8);const cols=["#6dffc7","#4fc3ff","#ff4fd8","#ffcf4f","#fff"];for(let i=0;i<n;i++){const e=document.createElement("i");e.className="cf";e.style.left=Math.random()*96+"%";e.style.background=cols[i%cols.length];e.style.setProperty("--dx",(Math.random()*160-80)+"px");e.style.animationDelay=Math.random()*.4+"s";e.style.borderRadius=Math.random()<.5?"50%":"2px";$("fx").appendChild(e);setTimeout(()=>e.remove(),2200)}}
let actx;
function ping(r){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const notes=r==="l"?[523,659,784,1047]:r==="r"?[523,784,1047]:[784,1047];notes.forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,actx.currentTime+i*.09);g.gain.exponentialRampToValueAtTime(.15,actx.currentTime+i*.09+.02);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+i*.09+.25);o.connect(g).connect(actx.destination);o.start(actx.currentTime+i*.09);o.stop(actx.currentTime+i*.09+.3)})}catch(e){}}
/* zvuk na iPhone: hrať ako médium (aj pri tichom režime) a odomknúť v rámci ťuknutia */
let SILENT=null;
function silentWav(){const sr=8000,n=sr/2,b=new ArrayBuffer(44+n),v=new DataView(b),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  w(0,"RIFF");v.setUint32(4,36+n,true);w(8,"WAVE");w(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,"data");v.setUint32(40,n,true);for(let i=0;i<n;i++)v.setUint8(44+i,128);
  return URL.createObjectURL(new Blob([b],{type:"audio/wav"}))}
function unlockAudio(ctx){
  try{if(navigator.audioSession)navigator.audioSession.type="playback"}catch(e){}
  try{if(!SILENT){SILENT=new Audio(silentWav());SILENT.loop=true;SILENT.setAttribute("playsinline","")}SILENT.play().catch(()=>{})}catch(e){}
  try{if(ctx&&ctx.state!=="running")ctx.resume()}catch(e){}
}
function releaseAudio(){try{SILENT&&SILENT.pause()}catch(e){}}
const haptic=p=>{try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}};
function applyTexts(){$("logo").textContent=t("title");$("lookupBadge").textContent=t("look");document.title=t("title")+" ✈️"}

/* ============ koľko ľudí sedí v lietadle ============ */
const SEATS={A318:110,A319:144,A320:180,A20N:186,A321:220,A21N:230,BCS1:115,BCS3:145,B733:140,B734:160,B737:149,B738:189,B739:200,B37M:172,B38M:189,B39M:200,B3XM:220,
  A306:260,A310:220,A332:270,A333:300,A338:250,A339:290,A343:280,A346:320,A359:320,A35K:360,A388:510,B742:400,B744:410,B748:400,B752:200,B753:240,B762:220,B763:260,B764:290,
  B772:320,B77W:380,B77L:300,B778:380,B779:420,B788:250,B789:290,B78X:330,E170:76,E75L:80,E190:100,E195:120,E290:104,E295:132,AT72:70,AT75:70,AT76:72,AT43:48,DH8D:78,
  CRJ2:50,CRJ7:70,CRJ9:90,CRJX:100,SU95:98,MD11:290};
function pax(a){
  if(a.ground)return 0;
  if(/DHL|UPS|FedEx|Cargo|Kalitta|Atlas|ASL|Cargolux/.test(airlineOf(a)))return 2;
  if(a.mil)return 6;
  if(isHeli(a))return 3;
  if(a.cat==="A1")return 2;if(a.cat==="A2")return 5;
  if(/^(GLF|GL|CL|FA|F9|C25|C56|C68|C700|PC12|PC24|LJ|E55|H25)/.test(a.type||""))return 6;
  const s=SEATS[a.type];if(s)return Math.round(s*.85);
  if(a.cat==="A3"||a.cat==="A4"||a.cat==="A5"||airlineOf(a))return 150;
  return 4;
}
const CITY_SK={"London":"Londýn","Vienna":"Viedeň","Wien":"Viedeň","Paris":"Paríž","Rome":"Rím","Roma":"Rím","Prague":"Praha","Praha":"Praha","Munich":"Mníchov","München":"Mníchov","Frankfurt am Main":"Frankfurt","Frankfurt":"Frankfurt","Warsaw":"Varšava","Budapest":"Budapešť","Athens":"Atény","Milan":"Miláno","Venice":"Benátky","Brussels":"Brusel","Copenhagen":"Kodaň","Kyiv":"Kyjev","Bucharest":"Bukurešť","Belgrade":"Belehrad","Zurich":"Zürich","Zürich":"Zürich","Geneva":"Ženeva","Lisbon":"Lisabon","Naples":"Neapol","Cologne":"Kolín","Nuremberg":"Norimberg","Dubai":"Dubaj","Cairo":"Káhira","Thessaloniki":"Solún","Krakow":"Krakov","Kraków":"Krakov","Kosice":"Košice","Košice":"Košice","Zilina":"Žilina","Stockholm":"Štokholm","Beijing":"Peking","Tokyo":"Tokio","Seoul":"Soul","Singapore":"Singapur","Moscow":"Moskva","Tel Aviv-Yafo":"Tel Aviv","Tel Aviv":"Tel Aviv","Hamburg":"Hamburg","Berlin":"Berlín","Amsterdam":"Amsterdam","Madrid":"Madrid","Barcelona":"Barcelona","Istanbul":"Istanbul","Antalya":"Antalya","Hurghada":"Hurghada","Larnaca":"Larnaka","Heraklion":"Heraklion","Split":"Split","Dubrovnik":"Dubrovník","Zagreb":"Záhreb","Ljubljana":"Ľubľana","Sofia":"Sofia","Dublin":"Dublin","Oslo":"Oslo","Helsinki":"Helsinki","Riga":"Riga","Vilnius":"Vilnius","Tallinn":"Tallinn","Doha":"Dauha","Abu Dhabi":"Abú Zabí","New York":"New York","Bangkok":"Bangkok","Malaga":"Málaga","Palma":"Mallorca","Palma De Mallorca":"Mallorca","Tenerife":"Tenerife","Bratislava":"Bratislava","Poprad":"Poprad","Lyon":"Lyon","Nice":"Nice","Marseille":"Marseille","Manchester":"Manchester","Edinburgh":"Edinburgh","Bologna":"Bologna","Catania":"Catania","Bari":"Bari","Porto":"Porto","Gdansk":"Gdansk","Katowice":"Katovice","Wroclaw":"Vroclav","Eindhoven":"Eindhoven","Charleroi":"Charleroi","Dusseldorf":"Düsseldorf","Düsseldorf":"Düsseldorf","Stuttgart":"Stuttgart","Salzburg":"Salzburg","Innsbruck":"Innsbruck","Graz":"Graz","Linz":"Linz"};
const citySk=n=>n?(CITY_SK[n]||n):"";
const routeOf=a=>{const m=S.meta.get(a.hex);return m&&m.route&&m.route.origin&&m.route.destination?m.route:null};

/* ============ farba oblohy podľa slnka ============ */
function skyGrad(sa){
  const st=sa>10?["#2c7be5","#79bdfc"]:sa>0?["#3767c9","#f0a46c"]:sa>-6?["#1b2b72","#f2786a"]:sa>-12?["#0c1640","#47306e"]:["#05070f","#0f1838"];
  return `linear-gradient(180deg,${st[0]} 0%,${st[1]} 42%,#05070f 78%)`;
}
let lastSkyKey="";
function paintSky(){
  const sa=typeof SPACE!=="undefined"&&S.pos?SPACE.sunAlt():-20;
  const key=sa>10?"d":sa>0?"g":sa>-6?"s":sa>-12?"t":"n";
  if(key!==lastSkyKey){lastSkyKey=key;$("bg").style.setProperty("--skyGrad",skyGrad(sa));document.querySelector('meta[name=theme-color]').content=key==="d"?"#2c7be5":key==="g"?"#3767c9":key==="s"?"#1b2b72":"#05070f"}
  return sa;
}

/* ============ živá obloha (canvas) ============ */
const SKY={cv:null,c:null,d:1,W:0,H:0,cx:0,cy:0,R:0,trails:new Map(),stars:[],pts:[],raf:0};
function skySize(){const cv=$("sky"),d=Math.min(2,devicePixelRatio||1),r=cv.getBoundingClientRect();SKY.d=d;SKY.W=r.width;SKY.H=r.height;cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);
  SKY.R=Math.min(SKY.H*.37,SKY.W*.33);SKY.cx=SKY.W-SKY.R-18;SKY.cy=Math.max(SKY.H*.56,SKY.R+40);
  SKY.stars=Array.from({length:70},()=>({x:Math.random()*SKY.W,y:Math.random()*SKY.H*.8,r:Math.random()*1.3+.2,p:Math.random()*6}))}
function skyProj(az,el){const rot=S.heading!=null?-S.heading:0,r=(90-Math.max(-2,el))/90*SKY.R,an=rad(az+rot);return {x:SKY.cx+r*Math.sin(an),y:SKY.cy-r*Math.cos(an)}}
function skyFrame(){
  SKY.raf=requestAnimationFrame(skyFrame);
  if(S.view!=="now"||document.hidden)return;
  const tNow=performance.now();if(tNow-(SKY.last||0)<33)return;SKY.last=tNow; // max ~30 fps
  const c=SKY.c,d=SKY.d,W=SKY.W,H=SKY.H,now=Date.now(),sa=paintSky();
  c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,W,H);
  if(sa<-6){for(const s of SKY.stars){c.globalAlpha=.35+.35*Math.sin(now/900+s.p);c.fillStyle="#fff";c.beginPath();c.arc(s.x,s.y,s.r,0,7);c.fill()}c.globalAlpha=1}
  const {cx,cy,R}=SKY;
  // kupola
  const g=c.createRadialGradient(cx,cy,0,cx,cy,R);g.addColorStop(0,"rgba(255,255,255,.10)");g.addColorStop(1,"rgba(255,255,255,.02)");
  c.fillStyle=g;c.beginPath();c.arc(cx,cy,R,0,7);c.fill();
  c.strokeStyle="rgba(255,255,255,.28)";c.lineWidth=1;c.stroke();
  c.setLineDash([3,5]);c.strokeStyle="rgba(255,255,255,.14)";[60,30].forEach(e=>{c.beginPath();c.arc(cx,cy,(90-e)/90*R,0,7);c.stroke()});c.setLineDash([]);
  // svetové strany
  c.font="700 11px Inter, sans-serif";c.textAlign="center";c.textBaseline="middle";
  [["S",0],["V",90],["J",180],["Z",270]].forEach(([n,az])=>{const p=skyProj(az,-9);c.fillStyle=n==="S"?"#ff6b81":"rgba(255,255,255,.7)";c.fillText(n,p.x,p.y)});
  // satelity
  if(typeof SPACE!=="undefined")SPACE.visibleNow().forEach(s=>{const p=skyProj(s.az,s.el),big=s.kind==="iss"||s.kind==="css";
    c.globalAlpha=s.sunlit||big?1:.5;c.fillStyle=big?"#ffcf4f":s.kind==="starlink"?"#c7a8ff":"#fff";c.font=(big?"14":"9")+"px sans-serif";c.fillText("★",p.x,p.y);
    if(big){c.font="700 10px Inter, sans-serif";c.textAlign="left";c.fillText(s.kind==="iss"?"ISS":"Tiangong",p.x+9,p.y);c.textAlign="center"}c.globalAlpha=1});
  // lietadlá
  const list=enrich(now).filter(a=>a.el!=null&&a.el>-2).slice(0,45);SKY.pts=[];
  const topHex=S.top&&S.top.hex;
  list.slice().reverse().forEach(a=>{
    const p=skyProj(a.bear,a.el),isTop=a.hex===topHex,isGold=typeof goldenHex==="function"&&a.hex===goldenHex(),col=isGold?"#ffcf4f":isTop?"#6dffc7":RAR[rarity(a)].col;
    if(isGold){c.fillStyle="rgba(255,207,79,.25)";c.beginPath();c.arc(p.x,p.y,22+4*Math.sin(now/200),0,7);c.fill()}
    SKY.pts.push({hex:a.hex,x:p.x,y:p.y});
    // stopa
    let tr=SKY.trails.get(a.hex);if(!tr){tr=[];SKY.trails.set(a.hex,tr)}
    if(!tr.length||now-tr[tr.length-1].t>1500){tr.push({t:now,az:a.bear,el:a.el});if(tr.length>24)tr.shift()}
    if(tr.length>1){c.beginPath();tr.forEach((q,i)=>{const pp=skyProj(q.az,q.el);i?c.lineTo(pp.x,pp.y):c.moveTo(pp.x,pp.y)});c.lineTo(p.x,p.y);
      c.strokeStyle=isTop?"rgba(109,255,199,.55)":"rgba(255,255,255,.22)";c.lineWidth=isTop?2.2:1.2;c.stroke()}
    if(isTop){const pr=10+5*Math.sin(now/260);c.strokeStyle="rgba(109,255,199,.8)";c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,pr+6,0,7);c.stroke();
      c.fillStyle="rgba(109,255,199,.18)";c.beginPath();c.arc(p.x,p.y,13,0,7);c.fill()}
    c.save();c.translate(p.x,p.y);c.rotate(rad((a.trk??0)+(S.heading!=null?-S.heading:0)));
    const s=isTop?1.5:1;c.fillStyle=col;c.beginPath();c.moveTo(0,-7*s);c.lineTo(5*s,6*s);c.lineTo(0,3.5*s);c.lineTo(-5*s,6*s);c.closePath();c.fill();c.restore();
    if(isTop||list.length<8||a.el>45){const rt=routeOf(a),hide=$("guess").classList.contains("on")&&$("guess").dataset.hex===a.hex,lab=titleOf(a)+(isTop&&rt&&!hide?" → "+citySk(rt.destination.municipality):"");
      c.font=(isTop?"700 12px":"600 10px")+" Inter, sans-serif";c.textAlign="left";c.fillStyle=isTop?"#fff":"rgba(255,255,255,.75)";
      c.lineWidth=3;c.strokeStyle="rgba(0,0,0,.45)";c.lineJoin="round";c.strokeText(lab,p.x+(isTop?18:9),p.y);c.fillText(lab,p.x+(isTop?18:9),p.y)}
  });
  // ty
  c.fillStyle="#fff";c.beginPath();c.arc(cx,cy,4,0,7);c.fill();
  c.strokeStyle="rgba(255,255,255,"+(.5-.4*((now%2000)/2000))+")";c.lineWidth=1.5;c.beginPath();c.arc(cx,cy,4+16*((now%2000)/2000),0,7);c.stroke();
  c.font="600 9px Inter, sans-serif";c.fillStyle="rgba(255,255,255,.8)";c.textAlign="center";c.fillText("TY",cx,cy+13);
  if(now%5000<40)for(const k of SKY.trails.keys())if(!list.find(a=>a.hex===k))SKY.trails.delete(k);
}
function skyTap(ev){
  const r=$("sky").getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;
  let best=null,bd=34;for(const p of SKY.pts){const dd=Math.hypot(p.x-x,p.y-y);if(dd<bd){bd=dd;best=p}}
  if(best){S.pick=best.hex;haptic(12);tick(true);document.getElementById("hero").scrollIntoView({behavior:"smooth",block:"nearest"})}
  else if(S.pick){S.pick=null;tick(true)}
}

/* ============ hlavná karta ============ */
function heroEmpty(){
  $("guess").classList.remove("on");
  $("h-lbl").textContent=t("now");$("h-rar").style.display="none";
  $("h-call").textContent=S.pos?t("empty"):"Pozri hore";
  $("h-type").textContent=S.pos?(S.raw.length?t("emptySub"):"Hľadám lietadlá…"):"Čakám na polohu…";
  $("h-quip").textContent="";["h-st3","h-dir","h-eta"].forEach(id=>$(id).style.display="none");
  $("b-wave").disabled=true;$("b-wave").style.opacity=.5;
  $("h-route").classList.remove("on");$("h-photo").classList.remove("on");$("h-links").innerHTML="";$("hero").classList.remove("overhead","emerg");
}
function renderHeroStatic(a){
  if(!a){heroEmpty();HOOKS.heroStatic.forEach(f=>{try{f(null)}catch(e){}});return}
  ["h-st3","h-dir"].forEach(id=>$(id).style.display="");$("b-wave").disabled=false;$("b-wave").style.opacity=1;
  const m=S.meta.get(a.hex)||{},r=rarity(a),rt=routeOf(a),al=airlineOf(a)||(m.route&&m.route.airline&&m.route.airline.name)||"";
  $("h-lbl").textContent=S.pick&&S.pick===a.hex?"Vybrané lietadlo":t("now");
  $("h-rar").style.display=r==="c"&&!a.mil?"none":"";$("h-rar").textContent=(a.mil?"VOJENSKÉ · ":"")+RAR[r].n.toUpperCase();$("h-rar").style.color=RAR[r].col;
  $("h-call").textContent=rt?"→ "+citySk(rt.destination.municipality||rt.destination.name):(al||titleOf(a));
  $("h-type").textContent=[rt&&al?al:"",typeName(a,m),rt||al?titleOf(a):""].filter(Boolean).join(" · ");
  if(rt){$("r-o").textContent=rt.origin.iata_code||rt.origin.icao_code||"?";$("r-on").textContent=citySk(rt.origin.municipality||rt.origin.name);
    $("r-d").textContent=rt.destination.iata_code||rt.destination.icao_code||"?";$("r-dn").textContent=citySk(rt.destination.municipality||rt.destination.name);$("h-route").classList.add("on")}
  else $("h-route").classList.remove("on");
  const ph=m.ac&&(m.ac.url_photo||m.ac.url_photo_thumbnail);
  if(ph){const img=new Image();img.onload=()=>{if(S.top&&S.top.hex===a.hex){$("h-photo").style.backgroundImage="url('"+ph.replace(/'/g,"%27")+"')";$("h-photo").classList.add("on")}};img.src=ph}
  else $("h-photo").classList.remove("on");
  $("h-quip").textContent=quip(a,m);
  $("hero").classList.toggle("emerg",a.sq==="7700");
  guessUI(a,rt);
  $("h-links").innerHTML=`<a href="https://globe.adsb.lol/?icao=${esc(a.hex)}" target="_blank" rel="noopener">Mapa letu ↗</a>`+
    (a.call?`<a href="https://www.flightradar24.com/${encodeURIComponent(a.call)}" target="_blank" rel="noopener">Flightradar24 ↗</a>`:"")+
    (a.reg?`<a href="https://www.jetphotos.com/registration/${encodeURIComponent(a.reg)}" target="_blank" rel="noopener">Fotky ↗</a>`:"");
  HOOKS.heroStatic.forEach(f=>{try{f(a)}catch(e){console.error(e)}});
}
function renderHeroLive(a){
  renderPax();
  if(!a)return;
  const el=Math.max(0,a.el??0);
  $("hero").classList.toggle("overhead",el>=60);
  $("h-look").textContent=el>=75?t("overhead"):`Pozri na ${dirL(a.bear)} · ${nf(el)}° hore`;
  $("h-lookSub").textContent=S.heading!=null?"Šípka ukazuje, kam sa otočiť":"Ťukni na kompas a šípka ťa navedie";
  $("h-gauge").style.width=Math.min(100,el/90*100)+"%";
  $("arrow").style.transform=`rotate(${S.heading!=null?a.bear-S.heading:a.bear}deg)`;
  $("compN").style.display=S.heading!=null?"none":"";
  $("g-alt").textContent=a.alt!=null?(a.alt>=1000?nf(a.alt/1000,1)+" km":nf(a.alt)+" m"):"—";$("g-altC").textContent=a.alt!=null&&a.alt>=GERLACH?"výška · "+nf(a.alt/GERLACH,1)+"× Gerlach":"výška";
  const p=pax(a);$("g-pax").textContent=p>=10?"~"+nf(p):p?String(p):"—";
  $("g-dist").textContent=nf(Math.hypot(a.dist,a.alt||0)/1000,1)+" km";
  $("g-spd").textContent=a.spd!=null?nf(a.spd)+" km/h":"—";$("g-spdC").textContent=spdCompare(a.spd);
  $("g-trk").textContent=a.trk!=null?dirS(a.trk)+" "+nf(a.trk)+"°":"—";
  $("g-trkC").textContent=a.vr>300?"letí smerom · stúpa ↗":a.vr<-300?"letí smerom · klesá ↘":"letí smerom";
  const ap=approach(a),eta=$("h-eta");eta.style.display="";
  if(ap&&ap.t>3&&ap.t<900&&ap.el!=null&&ap.el>=20){const mm=Math.floor(ap.t/60),ss=Math.floor(ap.t%60);eta.innerHTML=`⏱ Najbližšie k tebe o <b>${mm}:${String(ss).padStart(2,"0")}</b> · ${nf(ap.el)}° nad obzorom`;eta.classList.add("on")}
  else if(ap&&ap.t<=3&&ap.t>-60&&el>=40){eta.innerHTML="🎯 Práve je najbližšie k tebe!";eta.classList.add("on")}
  else eta.classList.remove("on");
}
let paxKey="";
function renderPax(){
  const up=S.list.filter(a=>a.el!=null&&a.el>0),n=up.length,tot=up.reduce((s,a)=>s+pax(a),0);
  const key=n+"|"+tot;if(key===paxKey)return;paxKey=key;
  if(!S.raw.length&&!S.rawT){$("paxLine").innerHTML="";return}
  $("paxLine").innerHTML=n?`Nad tebou práve letí<b>~${nf(tot)} ${tot===1?"človek":tot<5?"ľudia":"ľudí"}</b>v ${n} ${n===1?"lietadle":"lietadlách"}`:`Obloha nad tebou<b>je prázdna</b>`;
}
function renderList(list){
  const rest=list.filter(a=>!S.top||a.hex!==S.top.hex).slice(0,12);
  $("radarCnt").textContent=list.filter(a=>a.el>0).length+" nad obzorom";
  $("list").innerHTML=rest.length?rest.map(a=>{const m=S.meta.get(a.hex),rt=routeOf(a);return `<div class="row" data-hex="${esc(a.hex)}"><div class="l"><b><span class="badge" style="background:${RAR[rarity(a)].col}"></span>${esc(rt?"→ "+citySk(rt.destination.municipality):titleOf(a))}</b><div>${esc([airlineOf(a),typeName(a,m)].filter(Boolean).join(" · "))}</div></div>
    <div class="r"><b>${a.alt!=null?nf(a.alt/1000,1)+" km":"—"}</b><br>${dirS(a.bear)} · ${nf(Math.max(0,a.el??0))}°</div></div>`}).join(""):'<div class="lookSub">Nič ďalšie v okolí.</div>';
}
$("list").onclick=e=>{const r=e.target.closest(".row");if(r&&r.dataset.hex){S.pick=r.dataset.hex;haptic(10);tick(true);window.scrollTo({top:0,behavior:"smooth"})}};

function renderCol(){
  const l=lvlOf(COL.pts),a=lvlPts(l),b=lvlPts(l+1);
  $("c-lvl").textContent="Lvl "+(l+1)+" · "+LEVELS[l];$("c-pts").textContent=COL.pts+" "+(COL.pts===1?"bod":COL.pts>1&&COL.pts<5?"body":"bodov");
  $("c-bar").style.width=(l>=LEVELS.length-1?100:Math.min(100,(COL.pts-a)/(b-a)*100))+"%";
  $("c-next").textContent=l>=LEVELS.length-1?"Si na vrchole. Respekt. 🫡":"Ďalší level: "+LEVELS[l+1]+" (ešte "+(b-COL.pts)+" b)";
  const types=Object.entries(COL.types);
  $("c-n").textContent=COL.n;$("c-t").textContent=types.length;$("c-r").textContent=types.filter(([,v])=>v.r==="r"||v.r==="l").reduce((s,[,v])=>s+v.n,0);
  $("c-ach").innerHTML=ACH.map(x=>`<div class="${COL.ach[x.id]?"got":""}"><i>${x.i}</i>${x.n}</div>`).join("");
  $("c-achN").textContent=Object.keys(COL.ach).length+"/"+ACH.length;
  const order={l:0,r:1,u:2,c:3};
  if(typeof renderCards==="function")renderCards();
  const nk=LS.get("ctl_nick","");$("meName").textContent=nk||"Spotter";
  if(typeof spotterType==="function"){const st=spotterType();$("c-type").textContent=st.e+" "+st.n}
}

/* ============ hlavná slučka ============ */
function tick(fresh){
  const now=Date.now();
  S.list=enrich(now);
  let best=null;
  if(S.pick){best=S.list.find(a=>a.hex===S.pick)||null;if(!best)S.pick=null}
  if(!best){best=S.list.find(a=>a.el!=null)||S.list[0]||null;
    if(best&&S.top){const cur=S.list.find(a=>a.hex===S.top.hex);if(cur&&cur.el!=null&&best.el-cur.el<2)best=cur}}
  const changed=(best&&best.hex)!==(S.top&&S.top.hex);
  S.top=best;
  if(changed||fresh){renderHeroStatic(best);if(best){loadMeta(best);if(changed)announce(best,false)}}
  renderHeroLive(best);
  if(fresh||now%5000<1000){const up=S.list.filter(a=>a.el>0);$("sky").setAttribute("aria-label",up.length?`Obloha: ${up.length} lietadiel nad obzorom${best?`, najbližšie ${titleOf(best)} na ${dirL(best.bear)}, ${Math.round(best.el)} stupňov nad obzorom`:""}`:"Obloha nad tebou je prázdna")}
  HOOKS.live.forEach(f=>{try{f(best,fresh)}catch(e){console.error(e)}});
  if(HOOKS.list)HOOKS.list.forEach(f=>{try{f(S.list)}catch(e){console.error(e)}});
  if(fresh||now%3000<1000)renderList(S.list);
  S.list.forEach(tryCatch);
  if(best&&best.el>=60&&!S.buzzed.has(best.hex)){S.buzzed.add(best.hex);if(S.vib)haptic([120,60,120,60,240])}
  if(fresh){S.list.slice(0,8).forEach(a=>loadMeta(a));HOOKS.fresh.forEach(f=>{try{f()}catch(e){console.error(e)}})}
}
/* ============ hlas ============ */
function voiceSay(txt){
  try{const u=new SpeechSynthesisUtterance(txt);const vs=speechSynthesis.getVoices();
    u.voice=vs.find(v=>/^sk/i.test(v.lang))||vs.find(v=>/^cs/i.test(v.lang))||null;u.lang=u.voice?u.voice.lang:"sk-SK";u.rate=1.02;
    speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}
}
function announce(a,metaArrived){
  if(!S.voice||!a)return;
  const m=S.meta.get(a.hex);
  if(m&&m.loading)return; // počkaj na trasu
  if(S.announced.has(a.hex))return;S.announced.add(a.hex);
  const d=m&&m.route&&m.route.destination,al=airlineOf(a);
  let s=(S.vych?"Nad tebu ľeci ":"Nad tebou letí ")+typeName(a,m).replace(/-/g," ");
  if(al)s+=", "+al;
  if(d)s+=", smer "+(d.municipality||d.name);
  if(a.alt!=null)s+=", vo výške "+Math.round(a.alt/100)*100+" metrov";
  voiceSay(s+".");
}


/* ============ kompas a orientácia ============ */
let oriBound=false,hasAbs=false;
function onOri(e){
  if(e.type==="deviceorientation"&&hasAbs&&e.webkitCompassHeading==null)return;
  let alpha=null;
  if(e.webkitCompassHeading!=null)alpha=360-e.webkitCompassHeading;
  else if(e.absolute||e.type==="deviceorientationabsolute")alpha=e.alpha;
  if(alpha==null||e.beta==null)return;
  if(e.type==="deviceorientationabsolute")hasAbs=true;
  const A=rad(alpha),B=rad(e.beta),G=rad(e.gamma||0);
  const cA=Math.cos(A),sA=Math.sin(A),cB=Math.cos(B),sB=Math.sin(B),cG=Math.cos(G),sG=Math.sin(G);
  // smer zadnej kamery
  const E=-(cA*sG+sA*sB*cG),N=-(sA*sG-cA*sB*cG),U=-cB*cG;
  const camH=(deg(Math.atan2(E,N))+360)%360,camP=deg(Math.asin(Math.max(-1,Math.min(1,U))));
  // smer hornej hrany mobilu (keď ho držíš naplocho)
  const topH=(deg(Math.atan2(-sA*cB,cA*cB))+360)%360;
  const h=Math.abs(cB)>.35?topH:camH;
  const lp=(o,n,k)=>o==null?n:(o+wrap180(n-o)*k+360)%360;
  S.heading=lp(S.heading,h,.25);
  S.camHead=lp(S.camHead,camH,.3);
  S.camPitch=S.camPitch==null?camP:S.camPitch+(camP-S.camPitch)*.3;
  S.compassOn=true;
}
function bindOri(){if(oriBound)return;oriBound=true;
  if("ondeviceorientationabsolute" in window)window.addEventListener("deviceorientationabsolute",onOri);
  window.addEventListener("deviceorientation",onOri);}
async function enableCompass(){
  bindOri(); // poslucháče hneď – na Androide netreba povolenie
  try{
    if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){
      const r=await DeviceOrientationEvent.requestPermission();if(r!=="granted")throw new Error("zamietnuté");
    }
    $("compStat").textContent="Zapnutý ✓ (ak šípka blbne, sprav s mobilom osmičku)";$("b-comp").textContent="Zapnutý";
    return true;
  }catch(e){if(S.compassOn)return true;$("compStat").textContent="Kompas nie je povolený: "+e.message;return false}
}


/* ============ zdieľanie ============ */
async function share(){
  const a=S.top;if(!a){toast("Nič na zdieľanie","Počkaj, kým niečo preletí");return}
  const m=S.meta.get(a.hex)||{},rt=m.route,W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  try{await document.fonts.ready}catch(e){}
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#0d1430");g.addColorStop(.55,"#1b2a6b");g.addColorStop(1,"#5a1f6b");x.fillStyle=g;x.fillRect(0,0,W,H);
  const rg=x.createRadialGradient(W*.8,H*.2,0,W*.8,H*.2,700);rg.addColorStop(0,"rgba(109,255,199,.35)");rg.addColorStop(1,"rgba(109,255,199,0)");x.fillStyle=rg;x.fillRect(0,0,W,H);
  for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.7})`;x.beginPath();x.arc(Math.random()*W,Math.random()*H*.6,Math.random()*2.2,0,7);x.fill()}
  x.textAlign="left";x.fillStyle="#97a3c7";x.font="600 38px Inter, sans-serif";x.fillText((S.vych?"TERAZ NAD MNU ĽECI":"PRÁVE NADO MNOU LETÍ"),90,300);
  x.fillStyle="#fff";let fs=150;const call=titleOf(a);x.font="900 "+fs+"px Unbounded, sans-serif";while(x.measureText(call).width>W-180&&fs>60){fs-=10;x.font="900 "+fs+"px Unbounded, sans-serif"}x.fillText(call,90,470);
  x.fillStyle="#dfe6ff";x.font="500 46px Inter, sans-serif";x.fillText(typeName(a,m),90,550);
  const al=airlineOf(a)||(rt&&rt.airline&&rt.airline.name)||"";if(al){x.fillStyle="#97a3c7";x.fillText(al,90,615)}
  let y=760;
  if(rt&&rt.origin&&rt.destination){
    x.fillStyle="rgba(0,0,0,.3)";rr(x,90,y-110,W-180,260,40);x.fill();
    x.fillStyle="#fff";x.font="800 110px Unbounded, sans-serif";x.fillText(rt.origin.iata_code||"?",140,y+30);x.textAlign="right";x.fillText(rt.destination.iata_code||"?",W-140,y+30);
    x.font="500 34px Inter, sans-serif";x.fillStyle="#97a3c7";x.fillText(clip(x,rt.destination.municipality||"",360),W-140,y+95);x.textAlign="left";x.fillText(clip(x,rt.origin.municipality||"",360),140,y+95);
    x.textAlign="center";x.font="70px sans-serif";x.fillText("✈️",W/2,y+20);x.textAlign="left";y+=260;
  }
  const stats=[[a.alt!=null?nf(a.alt)+" m":"—",altCompare(a.alt)],[a.spd!=null?nf(a.spd)+" km/h":"—",spdCompare(a.spd)],[nf(a.dist/1000,1)+" km","odo mňa"],[nf(Math.max(0,a.el))+"°","nad obzorom"]];
  stats.forEach((s,i)=>{const cx=90+(i%2)*((W-200)/2+20),cy=y+Math.floor(i/2)*220;x.fillStyle="rgba(255,255,255,.07)";rr(x,cx,cy,(W-200)/2,190,32);x.fill();
    x.fillStyle="#fff";x.font="800 60px Unbounded, sans-serif";x.fillText(s[0],cx+36,cy+90);x.fillStyle="#97a3c7";x.font="500 30px Inter, sans-serif";x.fillText(clip(x,s[1],(W-200)/2-60),cx+36,cy+145)});
  y=Math.min(y+480,H-480);
  x.fillStyle="rgba(255,79,216,.2)";rr(x,90,y,W-180,230,36);x.fill();
  x.fillStyle="#fff";x.font="600 44px Inter, sans-serif";wrapText(x,quip(a,m),130,y+80,W-260,58,3);
  x.fillStyle="#6dffc7";x.font="900 56px Unbounded, sans-serif";x.textAlign="center";x.fillText(t("title"),W/2,H-165);
  x.fillStyle="#97a3c7";x.font="500 36px Inter, sans-serif";x.fillText(location.host||"",W/2,H-110);
  x.fillStyle="#fff";x.font="500 30px Inter, sans-serif";x.fillText(new Date().toLocaleString("sk-SK",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}),W/2,H-60);
  c.toBlob(async blob=>{
    const file=new File([blob],"co-to-leti.png",{type:"image/png"});
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:"Práve nado mnou letí "+titleOf(a)+" ✈️ "+location.href});return}}catch(e){if(e.name==="AbortError")return}
    shareBlob(blob,"co-to-leti.png","Práve nado mnou letí "+titleOf(a)+" ✈️ "+location.href);
  },"image/png");
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function clip(x,s,w){s=String(s);while(s.length>1&&x.measureText(s).width>w)s=s.slice(0,-2)+"…";return s}
function wrapText(x,s,a,b,w,lh,max){
  const lines=[];let line="";
  for(const wd of String(s).split(" ")){const tst=line?line+" "+wd:wd;if(x.measureText(tst).width>w&&line){lines.push(line);line=wd}else line=tst}
  if(line)lines.push(line);
  if(lines.length>max){lines.length=max;lines[max-1]+="…"}
  lines.forEach((l,i)=>x.fillText(clip(x,l,w),a,b+i*lh));
}


/* ============ poloha ============ */
let watchId=null;
function startGps(){
  S.manual=false;
  if(!("geolocation" in navigator)){err("Prehliadač nepodporuje polohu. Zadaj ju ručne v Nastaveniach.");return}
  setStatus("Hľadám polohu…",false);
  if(watchId!=null)navigator.geolocation.clearWatch(watchId);
  navigator.geolocation.getCurrentPosition(p=>{if(!S.manual)gotPos(p,true)},posErr,{enableHighAccuracy:false,maximumAge:600000,timeout:15000});
  watchId=navigator.geolocation.watchPosition(p=>{
    if(S.manual)return;
    const first=!S.pos||!S.raw.length;
    gotPos(p,first);
  },posErr,{enableHighAccuracy:true,maximumAge:15000,timeout:30000});
}
function gotPos(p,first){
  S.pos={lat:p.coords.latitude,lon:p.coords.longitude,alt:p.coords.altitude||0};LS.set("ctl_pos",S.pos);showPos();
  $("posBtns").style.display="none";err("");
  if(!S.raw.length){$("h-type").textContent="Poloha OK ✓ Hľadám lietadlá…";setStatus("Načítavam lietadlá…",false)}
  if(first)fetchPlanes();
}
function posErr(e){
  if(S.raw.length&&e.code!==1)return;
  $("posBtns").style.display="flex";
  if(!S.raw.length)$("h-type").textContent="Bez polohy to nepôjde 🙈";
  err(e.code===1?"Poloha je zablokovaná. iPhone: Nastavenia → Súkromie → Polohové služby → Safari → „Pri používaní“. Android: ťukni na zámok vedľa adresy → Povolenia → Poloha. Potom stránku obnov."
    :e.code===3?"Poloha sa hľadá príliš dlho (si vnútri?). Skúšam znova – alebo zadaj polohu ručne.":"Polohu sa nepodarilo zistiť. Skontroluj, či máš zapnutú polohu v mobile.");
  setStatus("Chýba poloha",false);
}
function showPos(){if(S.pos){$("posTxt").textContent=(S.manual?"ručne · ":"GPS · ")+S.pos.lat.toFixed(3)+", "+S.pos.lon.toFixed(3);$("mlat").placeholder=S.pos.lat.toFixed(4);$("mlon").placeholder=S.pos.lon.toFixed(4)}}


/* ============ navigácia a ovládanie ============ */
function setView(v){
  if(v==="ar"){openAR();return}
  S.view=v;
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===v));
  ["now","space","col"].forEach(k=>$("v-"+k).classList.toggle("on",k===v));
  if(v==="col")renderCol();
  HOOKS.view.forEach(f=>{try{f(v)}catch(e){}});
  window.scrollTo({top:0});
  if(v==="now")requestAnimationFrame(skySize);
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{haptic(8);setView(b.dataset.v)});
$("b-ar").onclick=()=>{haptic(10);openAR()};$("arClose").onclick=()=>closeAR();
$("b-share").onclick=share;$("shareClose").onclick=()=>{$("shareM").classList.remove("on");try{$("shareVid").pause()}catch(e){}};
function syncToggles(){$("t-voice").classList.toggle("on",S.voice);$("t-vib").classList.toggle("on",S.vib);$("t-vych").classList.toggle("on",S.vych);$("b-voice").innerHTML=(S.voice?"<i>🔊</i>Hlas zap.":"<i>🔇</i>Hlas")}
function toggleVoice(){S.voice=!S.voice;LS.set("ctl_voice",S.voice);syncToggles();if(S.voice){S.announced.clear();voiceSay(S.vych?"Hlas zapnuti. Ňič ci ňeujďe.":"Hlas zapnutý. Nič ti neujde.");setTimeout(()=>S.top&&announce(S.top),2500)}else try{speechSynthesis.cancel()}catch(e){}}
$("b-voice").onclick=toggleVoice;$("t-voice").onclick=toggleVoice;
$("t-vib").onclick=()=>{S.vib=!S.vib;LS.set("ctl_vib",S.vib);syncToggles();if(S.vib)haptic(80)};
$("t-vych").onclick=()=>{S.vych=!S.vych;LS.set("ctl_vych",S.vych);syncToggles();applyTexts();renderHeroStatic(S.top);if(S.vych)toast("Východniarsky mód","Šicko po našemu 🥟")};
$("b-comp").onclick=enableCompass;
$("compass").onclick=()=>{if(S.heading==null)enableCompass()};
$("radius").value=String(LS.get("ctl_radius",25));$("radius").onchange=()=>{LS.set("ctl_radius",+$("radius").value);fetchPlanes(true)};
function setManual(la,lo,name){S.manual=true;S.pos={lat:la,lon:lo,alt:0};LS.set("ctl_pos",S.pos);LS.set("ctl_manual",true);err("");showPos();$("posBtns").style.display="none";fetchPlanes(true);toast("📍 "+(name||"Poloha nastavená"),name?"Ukazujem oblohu nad týmto miestom":la.toFixed(3)+", "+lo.toFixed(3))}
$("mset").onclick=()=>{
  const la=parseFloat(($("mlat").value||"").replace(",",".")),lo=parseFloat(($("mlon").value||"").replace(",","."));
  if(isNaN(la)||isNaN(lo)||Math.abs(la)>90||Math.abs(lo)>180){err("Zadaj platné súradnice, napr. 48.1486 a 17.1077.");return}
  setManual(la,lo);
};
$("mgps").onclick=()=>{err("");LS.set("ctl_manual",false);startGps()};
let resetArm=0;
$("b-reset").onclick=()=>{if(Date.now()-resetArm<3000){COL={hex:{},types:{},pts:0,ach:{},n:0};LS.set("ctl_col",COL);renderCol();$("b-reset").textContent="Vymazané";toast("Zbierka vymazaná","Začínaš od nuly")}else{resetArm=Date.now();$("b-reset").textContent="Naozaj? Ťukni znova"}};
$("b-pos").onclick=()=>{err("");LS.set("ctl_manual",false);startGps()};
$("b-man").onclick=()=>{showCities(true)};
$("sky").addEventListener("click",skyTap);

/* ============ onboarding ============ */
const CITIES=[["Bratislava",48.1486,17.1077],["Košice",48.7164,21.2611],["Prešov",48.9984,21.2339],["Žilina",49.2231,18.7394],["Banská Bystrica",48.7363,19.1462],["Nitra",48.3061,18.0764],["Trnava",48.3774,17.5872],["Trenčín",48.8945,18.0444],["Poprad",49.0598,20.2976],["Martin",49.0636,18.9214],["Praha",50.0755,14.4378],["Viedeň",48.2082,16.3738]];
function showCities(onb){
  const box=onb&&$("onb").style.display!=="none"?$("cities"):null;
  if(box){box.innerHTML=CITIES.map(c=>`<button data-c="${c[0]}">${c[0]}</button>`).join("");box.classList.add("on");return}
  // mimo onboardingu: jednoduchý výber cez toast-modal
  setView("col");$("settings").open=true;$("mlat").focus();
}
$("cities").onclick=e=>{const b=e.target.closest("button");if(!b)return;const c=CITIES.find(x=>x[0]===b.dataset.c);if(!c)return;closeOnb();setManual(c[1],c[2],c[0])};
$("noGps").onclick=()=>showCities(true);
function closeOnb(){LS.set("ctl_onb",1);$("onb").classList.add("hide");setTimeout(()=>$("onb").style.display="none",460);try{actx=actx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}bindOri()}
$("go").onclick=()=>{closeOnb();LS.set("ctl_manual",false);startGps();if(S.pos)fetchPlanes(true)};
async function boot(){
  SKY.cv=$("sky");SKY.c=SKY.cv.getContext("2d");skySize();addEventListener("resize",()=>skySize());skyFrame();
  paintSky();
  let state="prompt";
  try{if(navigator.permissions){const p=await navigator.permissions.query({name:"geolocation"});state=p.state}}catch(e){}
  const manual=LS.get("ctl_manual",false)&&S.pos;
  if(manual){S.manual=true;showPos();fetchPlanes(true);bindOri()}
  else if(LS.get("ctl_onb",0)&&state==="granted"){startGps();if(S.pos)fetchPlanes(true);bindOri()}
  else if(LS.get("ctl_onb",0)&&S.pos){startGps();fetchPlanes(true);bindOri()}
  else{$("onb").style.display="flex"}
}

/* ============ 🤔 Tipovačka „Kam letí?“ ============ */
const GPOOL=["Londýn","Paríž","Rím","Antalya","Istanbul","Dubaj","Barcelona","Madrid","Amsterdam","Frankfurt","Mníchov","Viedeň","Varšava","Atény","Miláno","Kodaň","Štokholm","Dublin","Lisabon","Tel Aviv","Káhira","Hurghada","Larnaka","Bukurešť","Sofia","Belehrad","Moskva","Kyjev","Doha","Málaga","Mallorca","Tenerife","Helsinki","Oslo","Zürich","Brusel","Praha","Budapešť","Krakov","Neapol","Benátky","Split","New York","Bangkok"];
S.guess=LS.get("ctl_guess",true);const guessReady=()=>COL.n>=3;let GUESSED=LS.get("ctl_guessed",{});
function guessUI(a,rt){
  const box=$("guess");
  if(!S.guess||!guessReady()||!rt||GUESSED[a.hex]){box.classList.remove("on");return}
  const right=citySk(rt.destination.municipality||rt.destination.name);if(!right){box.classList.remove("on");return}
  const h=hash(a.hex),pool=GPOOL.filter(c=>c!==right),opts=[right,pool[h%pool.length],pool[(h>>>7)%pool.length]===pool[h%pool.length]?pool[(h+3)%pool.length]:pool[(h>>>7)%pool.length]];
  const sh=opts.map((c,i)=>({c,k:hash(a.hex+c)})).sort((x,y)=>x.k-y.k).map(x=>x.c);
  $("h-call").textContent="Kam letí? 🤔";$("h-quip").textContent="";
  $("gOpts").innerHTML=sh.map(c=>`<button data-c="${esc(c)}">${esc(c)}</button>`).join("");
  box.classList.add("on");box.dataset.hex=a.hex;box.dataset.right=right;
}
function guessDone(hex){GUESSED[hex]=Date.now();const ks=Object.keys(GUESSED);if(ks.length>300)ks.slice(0,ks.length-300).forEach(k=>delete GUESSED[k]);LS.set("ctl_guessed",GUESSED);$("guess").classList.remove("on");if(S.top)renderHeroStatic(S.top)}
$("gOpts").onclick=e=>{
  const b=e.target.closest("button");if(!b)return;const box=$("guess"),ok=b.dataset.c===box.dataset.right;
  if(ok){const st=(LS.get("ctl_gstreak",0)|0)+1;LS.set("ctl_gstreak",st);COL.pts+=5;LS.set("ctl_col",COL);toast("🎯 Trafil si! +5 bodov",st>1?"Séria "+st+" za sebou 🔥":"Letí do "+box.dataset.right,"#6dffc7");haptic([20,40,20]);confetti(st>=3?60:25);ping("u");if(st>=5)grantAch("oracle")}
  else{LS.set("ctl_gstreak",0);toast("😅 Vedľa!","Letí do "+box.dataset.right);haptic(60)}
  guessDone(box.dataset.hex);
};
$("gSkip").onclick=()=>guessDone($("guess").dataset.hex);
ACH.push({id:"oracle",i:"🔮",n:"Jasnovidec (5×)",c:()=>false});
$("t-guess").classList.toggle("on",S.guess);
$("t-guess").onclick=()=>{S.guess=!S.guess;LS.set("ctl_guess",S.guess);$("t-guess").classList.toggle("on",S.guess);if(S.top)renderHeroStatic(S.top)};

/* ============ 🔒 súkromie a zmazanie údajov ============ */
const openPriv=e=>{if(e)e.preventDefault();$("privM").classList.add("on")};
$("b-privacy").onclick=openPriv;$("f-privacy").onclick=openPriv;$("onb-privacy").onclick=openPriv;$("privClose").onclick=()=>$("privM").classList.remove("on");
let forgetArm=0;
$("b-forget").onclick=async()=>{
  if(Date.now()-forgetArm>4000){forgetArm=Date.now();$("b-forget").textContent="Naozaj? Ťukni znova";return}
  try{if(typeof apiPost==="function")await apiPost("/api/forget",{})}catch(e){}
  try{const r=await navigator.serviceWorker?.getRegistration();const sub=await r?.pushManager?.getSubscription();await sub?.unsubscribe()}catch(e){}
  try{Object.keys(localStorage).filter(k=>k.startsWith("ctl_")||k.startsWith("nm_")).forEach(k=>localStorage.removeItem(k))}catch(e){}
  toast("🗑️ Údaje zmazané","Zo servera aj z tohto mobilu");setTimeout(()=>location.reload(),1500);
};

/* ============ 🌙 nočný režim ============ */
function nightApply(){
  const m=LS.get("ctl_night","auto"),dark=typeof SPACE!=="undefined"&&S.pos?SPACE.sunAlt()<-8:false;
  const mode=m==="auto"?(dark?"warm":"off"):m;
  document.body.classList.toggle("n-warm",mode==="warm");document.body.classList.toggle("n-red",mode==="red");
}
$("nightSel").value=LS.get("ctl_night","auto");
$("nightSel").onchange=()=>{LS.set("ctl_night",$("nightSel").value);nightApply();haptic(6)};
setInterval(nightApply,60000);setTimeout(nightApply,3000);
const openFriends=()=>{if(/tim=|vyzva=/.test(location.hash))$("friendsBox").open=true};
openFriends();addEventListener("hashchange",openFriends);
