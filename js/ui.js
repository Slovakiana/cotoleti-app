"use strict";
/* ============ UI základ ============ */
function setStatus(x,live){$("status").textContent=x;$("dot").className="dot"+(live?" live":"")}
function err(x){$("err").textContent=x||"";$("heroErr").textContent=x||""}
let toastT;
const TQ=[];let tBusy=false;
/* 👋 po mávnutí: všetky odmeny v JEDNOM oznámení (namiesto 4–5 toastov za sebou) */
let WB=null;
function waveBatchStart(){WB={t0:COL.pts,items:[],caught:null,low:null,social:"",col:null}}
function waveBatchEnd(e){
  const B=WB;WB=null;if(!B)return;
  const got=COL.pts-B.t0,c=B.caught;
  let T,Sub=[];
  if(c){T=c.newType?"🃏 Nová kartička: "+c.name:"👋 Ulovené: "+c.title;}
  else if(B.low!=null)T=(e||"👋")+" Zamávané · do zbierky až nad 10°";
  else T=(e||"👋")+" Zamávané!";
  if(got>0)Sub.push("+"+got+" "+(got===1?"bod":got<5?"body":"bodov"));
  const lab=q=>{const t=q[0]||"",em=(t.match(/^\p{Extended_Pictographic}/u)||[""])[0];
    if(/^🎯/.test(t)&&q[1])return "✅ Výzva: "+q[1];
    return (em?em+" ":"")+t.replace(/^[^\p{L}\d]+/u,"").replace(/^(Nový odznak|Odznak):\s*/,"").replace(/\s*\+\d+\s*(bod\w*|b)\b/,"").replace(/!$/,"").trim()};
  // overenie a poradie na Slovensku majú prednosť pred odznakmi
  const pri=x=>/^(⏳|✓|🧭|č\. |PRVÝ)/.test(x)?0:1;
  const its=B.items.map(lab).filter(Boolean).sort((x,y)=>pri(x)-pri(y));
  Sub.push(...its.slice(0,3));if(its.length>3)Sub.push("ďalšie nájdeš v záložke Ja");
  if(!its.length&&B.social)Sub.push(B.social);
  // veta podľa cieľa letu (len keď je v toaste miesto)
  if(c&&Sub.length<3&&S.top&&typeof routeOf==="function"&&routeOf(S.top)){const d=citySk(routeOf(S.top).destination.municipality);if(d)Sub.push("✈️ smer "+d)}
  if(B.low!=null&&!c)Sub.push("je len "+Math.max(0,Math.round(B.low))+"° nad obzorom");
  toast(T,Sub.join(" · "),c?RAR[c.r].col:B.col);
  // chvíľa po mávnutí = najlepší moment poslať lietadlo ďalej
  if(S.top&&!S.top.santa&&!(typeof KID==="function"&&KID())){const sn=$("shareNudge");sn.hidden=false;sn.dataset.hex=S.top.hex;clearTimeout(sn._t);sn._t=setTimeout(()=>sn.hidden=true,12000)}
  // 👯 pozvanie v správnej chvíli: po 3. overenej kartičke alebo prvej lesklej (raz)
  {const vn=Object.values(COL.types).filter(v=>v.ver).length,sh=Object.values(COL.types).some(v=>v.shiny);
    if(!LS.get("ctl_invNudge",0)&&!(typeof KID==="function"&&KID())&&(vn>=3||sh)){LS.set("ctl_invNudge",1);setTimeout(()=>{let el=$("invNudge");if(!el){el=document.createElement("button");el.id="invNudge";el.className="pill glass";document.body.appendChild(el)}
      el.textContent="👯 Zbieraj s kamarátom – spoločné mávnutie = bonus";el.hidden=false;el.onclick=()=>{el.hidden=true;typeof sendDuel==="function"&&sendDuel()};setTimeout(()=>el.hidden=true,12000)},6000)}}
  if(c&&c.newType&&typeof openCard==="function")setTimeout(()=>{if(!document.querySelector(".modal.on")){cardK=c.type;openCard(c.type,true)}},2400);
}
function toast(a,b,col){
  if(WB){WB.items.push([a,b,col]);return}
  if(TQ.some(q=>q[0]===a)||(tBusy&&$("toastT").textContent===a))return; // bez duplicít
  // viac odznakov naraz = jedno oznámenie
  if(/^🏅/.test(a)){const q=TQ.find(x=>/^🏅/.test(x[0]));if(q){const n=(q.n||1)+1;q.n=n;q[0]=`🏅 ${n} ${n<5?"nové odznaky":"nových odznakov"}`;q[1]="Pozri si ich v záložke Ja";return}}
  TQ.push([a,b,col]);if(TQ.length>4)TQ.splice(1,TQ.length-4);if(!tBusy)toastNext();
}
function toastNext(){
  if(document.querySelector(".modal.on")&&TQ.length&&!/^(📬|🔁|Kód|Bez)/.test(TQ[0][0])){tBusy=true;setTimeout(toastNext,900);return}
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
const haptic=p=>{try{if(S.vib===false)return;if(navigator.userActivation&&!navigator.userActivation.hasBeenActive)return;if(navigator.vibrate)navigator.vibrate(p)}catch(e){}};
function applyTexts(){$("logo").textContent=t("title");$("lookupBadge").textContent=t("look");document.title=t("title")+" ✈️"}

/* ============ koľko ľudí sedí v lietadle ============ */
const SEATS={A318:110,A319:144,A320:180,A20N:186,A321:220,A21N:230,BCS1:115,BCS3:145,B733:140,B734:160,B737:149,B738:189,B739:200,B37M:172,B38M:189,B39M:200,B3XM:220,
  A306:260,A310:220,A332:270,A333:300,A338:250,A339:290,A343:280,A346:320,A359:320,A35K:360,A388:510,B742:400,B744:410,B748:400,B752:200,B753:240,B762:220,B763:260,B764:290,
  B772:320,B77W:380,B77L:300,B778:380,B779:420,B788:250,B789:290,B78X:330,E170:76,E75L:80,E190:100,E195:120,E290:104,E295:132,AT72:70,AT75:70,AT76:72,AT43:48,DH8D:78,
  CRJ2:50,CRJ7:70,CRJ9:90,CRJX:100,SU95:98,MD11:290};
function pax(a){
  if(a.ground)return 0;
  if(/DHL|UPS|FedEx|Cargo|Kalitta|Atlas|ASL|Cargolux/.test(airlineOf(a)))return 2;
  if(/^(CLX|GEC|BOX|ABW|ICV|CKS|FDX|UPS|DHK|BCS|GTI|SQC|CAO|CKK|MPH|TAY|SWN|NPT|QAC|AZG|CMB|RCH|EXS|LGL|AHK|DHX|BDA|SRR|TPA)/.test((a.call||"").toUpperCase())||/F$/.test(a.type||""))return 2;
  if(a.mil)return 6;
  if(isHeli(a))return 3;
  if(a.cat==="A1")return 2;if(a.cat==="A2")return 5;
  if(/^(GLF|GA[5-8]C|GL|CL|FA|F9|C25|C56|C68|C700|PC12|PC24|LJ|E55|H25)/.test(a.type||""))return 6;
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
  if(key!==lastSkyKey){lastSkyKey=key;document.body.dataset.sky=key;$("bg").style.setProperty("--skyGrad",skyGrad(sa));document.querySelector('meta[name=theme-color]').content=key==="d"?"#2c7be5":key==="g"?"#3767c9":key==="s"?"#1b2b72":"#05070f"}
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
      c.lineWidth=3;c.strokeStyle="rgba(0,0,0,.45)";c.lineJoin="round";
      // štítok sa nezmestí doprava → nakresli ho vľavo od lietadla (malé displeje)
      const off=isTop?18:9,lw=c.measureText(lab).width,cw=c.canvas.width/(window.devicePixelRatio||1),lx=p.x+off+lw>cw-4?(c.textAlign="right",p.x-off):p.x+off;
      c.strokeText(lab,lx,p.y);c.fillText(lab,lx,p.y);c.textAlign="left"}
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
  $("h-type").textContent=S.pos?(S.raw.length||S.loaded?t("emptySub"):"Hľadám lietadlá…"):"Čakám na polohu…";
  if($("cardHint"))$("cardHint").innerHTML="";
  // namiesto slepej uličky: čo sa blíži
  if(S.pos&&S.list&&S.list.length){
    const nx=S.list.map(a=>({a,p:approach(a)})).filter(x=>x.p&&x.p.t>20&&x.p.t<1200&&x.p.el!=null&&x.p.el>12).sort((x,y)=>x.p.t-y.p.t)[0];
    if(nx){const m=Math.max(1,Math.round(nx.p.t/60));$("h-call").textContent="O "+m+" min priletí";$("h-type").textContent=titleOf(nx.a)+" · priletí zo smeru "+dirS(nx.a.bear)+" · "+Math.round(nx.p.el)+"° nad obzorom"}
  }
  $("h-quip").textContent="";["h-st3","h-dir","h-eta"].forEach(id=>$(id).style.display="none");
  $("b-wave").disabled=true;$("b-wave").style.opacity=.5;
  if(S.pos&&(S.raw.length||S.loaded)&&$("h-call").textContent===t("empty")){$("h-quip").innerHTML='<span class="emptyActs"><button class="ghost" id="eRad">📡 Hľadať ďalej (93 km)</button><button class="ghost" id="eSpace">🛰️ Pozri ISS</button></span>';
    $("eRad").onclick=()=>{$("radius").value="50";$("radius").dispatchEvent(new Event("change"));fetchPlanes(true);toast("📡 Hľadám ďalej","Okruh 93 km")};$("eSpace").onclick=()=>setView("space")}
  $("h-route").classList.remove("on");$("h-photo").classList.remove("on");$("h-links").innerHTML="";$("hero").classList.remove("overhead","emerg");
}
function renderHeroStatic(a){
  if(!a){heroEmpty();HOOKS.heroStatic.forEach(f=>{try{f(null)}catch(e){}});return}
  ["h-st3","h-dir"].forEach(id=>$(id).style.display="");$("b-wave").disabled=false;$("b-wave").style.opacity=1;
  const m=S.meta.get(a.hex)||{},r=rarity(a),rt=routeOf(a),al=airlineOf(a)||(m.route&&m.route.airline&&m.route.airline.name)||"";
  $("h-lbl").textContent=S.pick&&S.pick===a.hex?"Vybrané lietadlo":t("now");
  $("h-rar").style.display=r==="c"&&!a.mil?"none":"";$("h-rar").textContent=(a.mil?"VOJENSKÉ · ":"")+RAR[r].n.toUpperCase();$("h-rar").style.color=RAR[r].col;
  $("h-call").textContent=rt?"→ "+citySk(rt.destination.municipality||rt.destination.name):(al||titleOf(a));
  $("h-type").textContent=[rt&&al?al:"",typeName(a,m),rt||al?(a.priv?"":titleOf(a)):""].filter(Boolean).join(" · ");
  // núdzový kód: žiadna hra ani zdieľanie, neutrálny text
  const emg=!!a.emg;$("b-wave").disabled=emg;$("b-wave").style.opacity=emg?.5:1;$("b-share").style.display=emg||a.priv?"none":"";
  if(emg)setTimeout(()=>{if(S.top&&S.top.hex===a.hex)$("h-quip").textContent="Lietadlo hlási neobvyklý kód. Hra je pre tento let vypnutá."},0);
  $("spotLine").textContent=[a.priv?"":a.reg,a.fl!=null?"FL"+String(a.fl).padStart(3,"0"):"",a.kt!=null?a.kt+" kt":"",a.vr!=null?(a.vr>0?"+":"")+Math.round(a.vr)+" ft/min":"",a.sq&&!a.priv?"sq "+a.sq:""].filter(Boolean).join(" · ");
  if(rt){$("r-o").textContent=rt.origin.iata_code||rt.origin.icao_code||"?";$("r-on").textContent=citySk(rt.origin.municipality||rt.origin.name);
    $("r-d").textContent=rt.destination.iata_code||rt.destination.icao_code||"?";$("r-dn").textContent=citySk(rt.destination.municipality||rt.destination.name);$("h-route").classList.add("on")}
  else $("h-route").classList.remove("on");
  $("h-photo").classList.remove("on");
  if(!a.priv)photoOf(a.hex).then(p=>{
    if(!p||!S.top||S.top.hex!==a.hex)return;
    const img=new Image();img.onload=()=>{if(S.top&&S.top.hex===a.hex){$("h-photo").style.backgroundImage="url('"+img.src.replace(/'/g,"%27")+"')";$("h-photo").classList.add("on");
      $("h-photo").querySelector("small").innerHTML='foto © '+esc(p.by)+' · <a href="'+esc(p.link)+'" target="_blank" rel="noopener">airport-data.com</a>'}};img.onerror=()=>{if(img.src!==p.thumb){p.img=p.thumb;img.src=p.thumb}};img.src=p.img});
  $("h-quip").textContent=quip(a,m);
  $("hero").classList.toggle("emerg",a.sq==="7700");
  guessUI(a,rt);
  $("h-links").innerHTML=(a.call?`<a href="https://www.flightradar24.com/${encodeURIComponent(a.call)}" target="_blank" rel="noopener">Flightradar24 ↗</a>`:"")+
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
  if(ap&&ap.t>3&&ap.t<900&&ap.el!=null&&ap.el>=20){const mm=Math.floor(ap.t/60),ss=Math.floor(ap.t%60);eta.innerHTML=`⏱ Najbližšie k tebe o <b>${mm?mm+" min ":""}${ss} s</b> · ${nf(ap.el)}° nad obzorom`;eta.classList.add("on")}
  else if(ap&&ap.t<=3&&ap.t>-60&&el>=40){eta.innerHTML="🎯 Práve je najbližšie k tebe!";eta.classList.add("on")}
  else eta.classList.remove("on");
}
let paxKey="";
function renderPax(){
  const up=S.list.filter(a=>a.el!=null&&a.el>0),n=up.length,tot=up.reduce((s,a)=>s+pax(a),0);
  const key=n+"|"+tot;if(key===paxKey)return;paxKey=key;
  if(!S.raw.length&&!S.rawT){$("paxLine").innerHTML="";return}
  $("paxLine").innerHTML=n?`Nad tebou práve letí<b>~${nf(tot)} ${ludia(tot)}</b>v ${n} ${n===1?"lietadle":"lietadlách"}`:`Obloha nad tebou<b>je prázdna</b>`;
}
function renderList(list){
  const rest=list.filter(a=>!S.top||a.hex!==S.top.hex).slice(0,12);
  $("radarCnt").textContent=list.filter(a=>a.el>0).length+" nad obzorom";
  $("list").innerHTML=rest.length?rest.map(a=>{const m=S.meta.get(a.hex),rt=routeOf(a);return `<div class="row" role="button" tabindex="0" aria-label="${esc(titleOf(a)+", "+RAR[rarity(a)].n+", "+dirL(a.bear)+", "+nf(Math.max(0,a.el??0))+" stupňov")}" data-hex="${esc(a.hex)}"><div class="l"><b><span class="badge" style="background:${RAR[rarity(a)].col}"></span>${esc(rt?"→ "+citySk(rt.destination.municipality):titleOf(a))}</b><div>${esc([airlineOf(a),typeName(a,m)].filter(Boolean).join(" · "))}</div></div>
    <div class="r">${a.type&&!COL.types[a.type]&&!a.santa?'<span class="newTag">NOVÁ</span> ':""}<b>${a.alt!=null?nf(a.alt/1000,1)+" km":"—"}</b><br>${dirS(a.bear)} · ${nf(Math.max(0,a.el??0))}°</div></div>`}).join(""):'<div class="lookSub">Nič ďalšie v okolí.</div>';
}
$("list").onclick=e=>{const r=e.target.closest(".row");if(r&&r.dataset.hex){S.pick=r.dataset.hex;haptic(10);tick(true);window.scrollTo({top:0,behavior:"smooth"})}};

function renderCol(){
  const l=lvlOf(COL.pts),a=lvlPts(l),b=lvlPts(l+1);
  $("c-lvl").textContent="Level "+(l+1)+" · "+lvlName(l);$("c-pts").textContent=COL.pts+" "+(COL.pts===1?"bod":COL.pts>1&&COL.pts<5?"body":"bodov");
  $("c-bar").style.width=Math.max(0,Math.min(100,(COL.pts-a)/(b-a)*100))+"%";
  $("c-next").textContent="Ďalší level: "+lvlName(l+1)+" (ešte "+(b-COL.pts)+" b)";
  {const z=seasonUpd(),T=[100,300,600],next=T.find(x=>z.pts<x),prev=[0,...T].filter(x=>x<=z.pts).pop(),pct=next?Math.round((z.pts-prev)/(next-prev)*100):100;
    $("c-season").innerHTML=`<b>${z.e} ${z.name}</b> · ${z.pts} b v sezóne${z.left<=7?` · <b style="color:#ffcf4f">končí o ${z.left} ${pl(z.left,"deň","dni","dní")}</b>`:" · končí "+z.end}${z.best?` · rekord ${z.best} b`:""}
      <div class="xp" style="margin-top:6px"><i style="width:${pct}%"></i></div><small>${next?"Stupeň "+(T.indexOf(next)+1)+": "+next+" b → odmena "+SEAS_REW[T.indexOf(next)]:"🏆 Všetky stupne sezóny hotové!"}</small>`}
  {const sd=seenSum();$("c-seen").innerHTML=sd?sd:"";$("c-seen").hidden=!sd}
  const types=Object.entries(COL.types);
  const typesOwn=types.filter(([,v])=>v.n);$("c-n").textContent=COL.n;$("c-t").textContent=typesOwn.length;const rr=types.filter(([k,v])=>v.n&&RORD[typeTier(k)]>=2).length;$("c-r").textContent=rr;
  {const sp=id=>$(id)&&$(id).nextElementSibling;if(sp("c-n"))sp("c-n").textContent=pl(COL.n,"úlovok","úlovky","úlovkov");if(sp("c-t"))sp("c-t").textContent=pl(typesOwn.length,"typ","typy","typov");if(sp("c-r"))sp("c-r").textContent=pl(rr,"vzácny","vzácne","vzácnych")}
  // odznaky: získané (najnovšie hore), potom zamknuté s návodom a pokrokom; v detskom režime bez sociálnych
  {const kid=typeof KID==="function"&&KID(),L=ACH.filter(x=>!(kid&&x.soc)),got=L.filter(x=>COL.ach[x.id]).sort((a,b)=>COL.ach[b.id]-COL.ach[a.id]),rest=L.filter(x=>!COL.ach[x.id]);
    const prog=x=>{try{const p=x.pr&&x.pr();return p?`<b class="achP">${Math.min(p[0],p[1])}/${p[1]}</b>`:""}catch(e){return ""}};
    $("c-ach").innerHTML=[...got,...rest].map(x=>`<div class="${COL.ach[x.id]?"got":""}" data-ach="${x.id}" role="button"><i>${x.i}</i>${esc(x.n)}${COL.ach[x.id]?"":(x.h?`<small>${esc(x.h)}</small>`:"")+prog(x)}</div>`).join("");
    $("c-achN").textContent=got.length+"/"+L.length}
  const order={l:0,r:1,u:2,c:3};
  if(typeof renderCards==="function")renderCards();
  const nk=LS.get("ctl_nick","");$("meName").textContent=nk||"Spotter";
  if(typeof spotterType==="function"){const st=spotterType();$("c-type").textContent="Tento týždeň: "+st.e+" "+st.n;$("c-type").hidden=/Začínajúci/.test(st.n)}
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
  if(fresh||now%5000<1000){const up=S.list.filter(a=>a.el>0);$("sky").setAttribute("aria-label",up.length?`Obloha: ${up.length} ${pl(up.length,"lietadlo","lietadlá","lietadiel")} nad obzorom${best?`, najbližšie ${titleOf(best)} na ${dirL(best.bear)}, ${Math.round(best.el)} stupňov nad obzorom`:""}`:"Obloha nad tebou je prázdna")}
  HOOKS.live.forEach(f=>{try{f(best,fresh)}catch(e){console.error(e)}});
  if(HOOKS.list)HOOKS.list.forEach(f=>{try{f(S.list)}catch(e){console.error(e)}});
  if(fresh||now%3000<1000)renderList(S.list);
  // lietadlá sa už nezbierajú samé – úlovok len zamávaním (hra je o pozeraní hore)
  if(fresh)seenLog(S.list);
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
    $("compStat").textContent="Zapnutý ✓ (ak šípka blúdi, pohni mobilom do osmičky)";$("b-comp").textContent="Zapnutý";
    return true;
  }catch(e){if(S.compassOn)return true;$("compStat").textContent="Kompas nie je povolený – povoľ pohyb a orientáciu v nastaveniach Safari.";return false}
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
    x.font="500 34px Inter, sans-serif";x.fillStyle="#97a3c7";x.fillText(clip(x,citySk(rt.destination.municipality||""),360),W-140,y+95);x.textAlign="left";x.fillText(clip(x,citySk(rt.origin.municipality||""),360),140,y+95);
    x.textAlign="center";x.font="70px sans-serif";x.fillText("✈️",W/2,y+20);x.textAlign="left";y+=230;
  }
  const stats=[[a.alt!=null?nf(a.alt)+" m":"—",altCompare(a.alt)],[a.spd!=null?nf(a.spd)+" km/h":"—",spdCompare(a.spd)],[nf(a.dist/1000,1)+" km","odo mňa"],[nf(Math.max(0,a.el))+"°","nad obzorom"]];
  stats.forEach((s,i)=>{const cx=90+(i%2)*((W-200)/2+20),cy=y+Math.floor(i/2)*195;x.fillStyle="rgba(255,255,255,.07)";rr(x,cx,cy,(W-200)/2,175,32);x.fill();
    x.fillStyle="#fff";x.font="800 56px Unbounded, sans-serif";x.fillText(s[0],cx+36,cy+82);x.fillStyle="#97a3c7";x.font="500 30px Inter, sans-serif";x.fillText(clip(x,s[1],(W-200)/2-60),cx+36,cy+134)});
  y=y+410;
  x.fillStyle="rgba(255,79,216,.2)";rr(x,90,y,W-180,170,36);x.fill();
  x.fillStyle="#fff";x.font="600 40px Inter, sans-serif";wrapText(x,quip(a,m),130,y+72,W-260,54,2);
  x.fillStyle="#6dffc7";x.font="900 56px Unbounded, sans-serif";x.textAlign="center";x.fillText(t("title"),W/2,H-300);
  x.fillStyle="#97a3c7";x.font="500 36px Inter, sans-serif";x.fillText(APP_HOST,W/2,H-250);x.font="500 24px Inter, sans-serif";x.fillStyle="rgba(151,163,199,.8)";x.fillText("Dáta: adsb.lol (ODbL 1.0) · nie sme spojení s aerolinkami",W/2,H-205);
  x.fillStyle="#fff";x.font="500 30px Inter, sans-serif";x.textAlign="right";x.fillStyle="#97a3c7";x.fillText(new Date().toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"}),W-90,300);
  c.toBlob(async blob=>{
    const file=new File([blob],"co-to-leti.png",{type:"image/png"});
    const txt="Práve nado mnou letí "+titleOf(a)+" ✈️ A čo letí nad tebou? "+planeLink(a)+TAGS;ev("share");
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:txt});return}}catch(e){if(e.name==="AbortError")return}
    shareBlob(blob,"co-to-leti.png",txt);
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
  ev("gps_ok");
  S.pos={lat:p.coords.latitude,lon:p.coords.longitude,alt:p.coords.altitude||0};LS.set("ctl_pos",S.pos);showPos();
  $("posBtns").style.display="none";err("");
  if(!S.raw.length){$("h-type").textContent="Poloha OK ✓ Hľadám lietadlá…";setStatus("Načítavam lietadlá…",false)}
  if(first)fetchPlanes();
}
function posErr(e){
  if(S.manual)return;
  if(e.code===1)ev("gps_deny");
  if(S.raw.length&&e.code!==1)return;
  $("posBtns").style.display="flex";
  if(!S.raw.length)$("h-type").textContent="Bez polohy to nepôjde 🙈";
  if(e.code===1&&!S.raw.length){heroCities();$("err").innerHTML='<details><summary>Ako povoliť polohu?</summary>iPhone: Nastavenia → Súkromie → Polohové služby → Safari → „Pri používaní“. Android: ťukni na zámok vedľa adresy → Povolenia → Poloha. Potom stránku obnov.</details>';setStatus("Chýba poloha",false);$("b-man").className="solid";$("b-pos").className="ghost";return}
  err(e.code===1?"Poloha je zablokovaná. iPhone: Nastavenia → Súkromie → Polohové služby → Safari → „Pri používaní“. Android: ťukni na zámok vedľa adresy → Povolenia → Poloha. Potom stránku obnov."
    :e.code===3?"Poloha sa ešte hľadá – si vnútri? Skúšam znova, alebo vyber mesto.":"Polohu sa nepodarilo zistiť. Skontroluj, či máš zapnutú polohu v mobile.");
  setStatus("Chýba poloha",false);
}
function showPos(){if(S.pos){$("posTxt").textContent=(S.manual?"ručne · ":"GPS · ")+S.pos.lat.toFixed(3)+", "+S.pos.lon.toFixed(3);$("mlat").placeholder=S.pos.lat.toFixed(4);$("mlon").placeholder=S.pos.lon.toFixed(4)}}


/* ============ navigácia a ovládanie ============ */
function setView(v){
  if(v==="ar"){openAR();return}
  const prev=S.view;S.scroll=S.scroll||{};if(prev&&prev!==v)S.scroll[prev]=scrollY;
  S.view=v;
  document.querySelectorAll("nav button").forEach(b=>{b.classList.toggle("on",b.dataset.v===v);b.setAttribute("aria-current",b.dataset.v===v?"page":"false")});
  ["now","space","col"].forEach(k=>$("v-"+k).classList.toggle("on",k===v));
  if(v==="col")renderCol();
  HOOKS.view.forEach(f=>{try{f(v)}catch(e){}});
  // každá záložka si pamätá, kde si skončil; opakované ťuknutie = hore
  window.scrollTo({top:prev===v?0:(S.scroll[v]||0)});
  if(v==="now")requestAnimationFrame(skySize);
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{haptic(8);if(document.startViewTransition&&S.view!==b.dataset.v&&!(typeof RM==="function"&&RM()))document.startViewTransition(()=>setView(b.dataset.v));else setView(b.dataset.v)});
$("b-ar").onclick=()=>{haptic(10);openAR()};$("arClose").onclick=()=>closeAR();
$("b-share").onclick=share;$("shareClose").onclick=()=>{$("shareM").classList.remove("on");try{$("shareVid").pause()}catch(e){}};
function syncToggles(){$("t-voice").classList.toggle("on",S.voice);$("t-vib").classList.toggle("on",S.vib);$("t-vych").classList.toggle("on",S.vych);$("b-voice").innerHTML=(S.voice?"<i>🔊</i>Čítam nahlas":"<i>🔈</i>Čítaj nahlas")}
// prepínače hlásia stav čítačkám (VoiceOver)
new MutationObserver(ms=>ms.forEach(m=>{const t=m.target;if(t.classList&&t.classList.contains("tog"))t.setAttribute("aria-checked",String(t.classList.contains("on")))})).observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
document.querySelectorAll(".tog").forEach(t=>t.setAttribute("aria-checked",String(t.classList.contains("on"))));
function toggleVoice(){S.voice=!S.voice;LS.set("ctl_voice",S.voice);syncToggles();if(S.voice){S.announced.clear();voiceSay(S.vych?"Hlas zapnuti. Ňič ci ňeujďe.":"Hlas zapnutý. Nič ti neujde.");setTimeout(()=>S.top&&announce(S.top),2500)}else try{speechSynthesis.cancel()}catch(e){}}
$("b-voice").onclick=toggleVoice;$("t-voice").onclick=toggleVoice;
$("t-vib").onclick=()=>{S.vib=!S.vib;LS.set("ctl_vib",S.vib);syncToggles();if(S.vib)haptic(80)};
$("t-vych").onclick=()=>{S.vych=!S.vych;LS.set("ctl_vych",S.vych);syncToggles();applyTexts();renderHeroStatic(S.top);if(S.vych)toast("Východniarsky mód","Šicko po našemu 🥟")};
$("b-comp").onclick=enableCompass;
$("compass").onclick=()=>{if(S.heading==null)enableCompass()};
$("radius").value=String(LS.get("ctl_radius",25));$("radius").onchange=()=>{LS.set("ctl_radius",+$("radius").value);fetchPlanes(true)};
function setManual(la,lo,name){S.manual=true;ev("manual");if(watchId!=null){navigator.geolocation.clearWatch(watchId);watchId=null}S.pos={lat:la,lon:lo,alt:0};LS.set("ctl_pos",S.pos);LS.set("ctl_manual",true);err("");showPos();$("posBtns").style.display="none";fetchPlanes(true);toast("📍 "+(name||"Poloha nastavená"),name?"Ukazujem oblohu nad týmto miestom":la.toFixed(3)+", "+lo.toFixed(3))}
$("mset").onclick=()=>{
  const la=parseFloat(($("mlat").value||"").replace(",",".")),lo=parseFloat(($("mlon").value||"").replace(",","."));
  if(isNaN(la)||isNaN(lo)||Math.abs(la)>90||Math.abs(lo)>180){err("Zadaj platné súradnice, napr. 48.1486 a 17.1077.");return}
  setManual(la,lo);
};
$("mgps").onclick=()=>{err("");LS.set("ctl_manual",false);startGps()};
let resetArm=0;
$("b-reset").onclick=()=>{if(Date.now()-resetArm<3000){if(!kidPinOk("vymazať zbierku"))return;COL={hex:{},types:{},pts:0,ach:{},n:0};LS.set("ctl_col",COL);localStorage.removeItem("ctl_season");renderCol();$("b-reset").textContent="Vymazané";toast("Zbierka vymazaná","Začínaš od nuly")}else{resetArm=Date.now();$("b-reset").textContent="Naozaj? Ťukni znova"}};
$("b-pos").onclick=()=>{err("");LS.set("ctl_manual",false);startGps()};
$("b-man").onclick=()=>{showCities(true)};
$("sky").addEventListener("click",skyTap);

/* ============ onboarding ============ */
const CITIES=[["Bratislava",48.1486,17.1077],["Košice",48.7164,21.2611],["Prešov",48.9984,21.2339],["Žilina",49.2231,18.7394],["Banská Bystrica",48.7363,19.1462],["Nitra",48.3061,18.0764],["Trnava",48.3774,17.5872],["Trenčín",48.8945,18.0444],["Poprad",49.0598,20.2976],["Martin",49.0636,18.9214],["Praha",50.0755,14.4378],["Viedeň",48.2082,16.3738]];
function showCities(onb){
  const box=onb&&$("onb").style.display!=="none"?$("cities"):null;
  if(!box){heroCities();return}
  if(box){box.innerHTML=CITIES.map(c=>`<button data-c="${c[0]}">${c[0]}</button>`).join("");box.classList.add("on");return}
  // mimo onboardingu: jednoduchý výber cez toast-modal
  setView("col");$("settings").open=true;$("mlat").focus();
}
$("cities").onclick=e=>{const b=e.target.closest("button");if(!b)return;const c=CITIES.find(x=>x[0]===b.dataset.c);if(!c)return;closeOnb();setManual(c[1],c[2],c[0])};
$("noGps").onclick=()=>showCities(true);
// 🎁 uvítací darček pre toho, kto prišiel cez pozvánku kamaráta: bežná kartička 🤝 (celá bude jeho, keď jej typu zamává)
function welcomeGift(){if(!LS.get("ctl_ref","")||LS.get("ctl_welcome",0)||(typeof KID==="function"&&KID()))return;LS.set("ctl_welcome",1);
  const pool=["A320","B738","A21N","A319","B38M","E190"].filter(k=>!(COL.types[k]&&COL.types[k].n)),k=pool[Math.floor(Math.random()*pool.length)];if(!k)return;
  COL.types[k]=COL.types[k]||{n:0,r:typeTier(k),name:catGuess(k).name,first:Date.now()};COL.types[k].gift={from:"kamarát (uvítanie)",t:Date.now()};LS.set("ctl_col",COL);
  setTimeout(()=>toast("🎁 Uvítací darček od kamaráta","Kartička "+catGuess(k).name+" 🤝 – keď takému lietadlu zamávaš, bude celá tvoja"),5000)}
function closeOnb(){LS.set("ctl_onb",1);onbDone();setTimeout(welcomeGift,1000);$("onb").classList.add("hide");setTimeout(()=>$("onb").style.display="none",460);try{actx=actx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}bindOri()}
$("go").onclick=()=>{closeOnb();ev("onboard");LS.set("ctl_manual",false);startGps();if(S.pos)fetchPlanes(true)};
// kompas sa pýta až keď ho treba (ťuk na kompas / Nájdi) – nie dva systémové dialógy po sebe
/* 📍 zmena miesta jedným ťukom na pilulku hore */
$("statusPill").onclick=()=>{haptic(10);$("placeCities").innerHTML=CITIES.map(c=>`<button data-c="${c[0]}">${c[0]}</button>`).join("");$("placeM").classList.add("on")};
$("placeClose").onclick=()=>$("placeM").classList.remove("on");
$("placeCities").onclick=e=>{const b=e.target.closest("button");if(!b)return;const c=CITIES.find(x=>x[0]===b.dataset.c);if(!c)return;$("placeM").classList.remove("on");setManual(c[1],c[2],c[0])};
$("placeGps").onclick=()=>{$("placeM").classList.remove("on");S.manual=false;LS.set("ctl_manual",false);startGps();toast("📍 Hľadám tvoju polohu…","Ukážem, čo letí priamo nad tebou")};
$("streakChip").onclick=()=>{setView("col");setTimeout(()=>{const d=$("dailyBox")||$("d-list");d&&d.scrollIntoView({behavior:"smooth",block:"center"})},300)};
async function boot(){
  SKY.cv=$("sky");SKY.c=SKY.cv.getContext("2d");skySize();addEventListener("resize",()=>skySize());skyFrame();
  paintSky();
  let state="prompt";
  try{if(navigator.permissions){const p=await navigator.permissions.query({name:"geolocation"});state=p.state}}catch(e){}
  const manual=LS.get("ctl_manual",false)&&S.pos;
  if(manual){S.manual=true;showPos();fetchPlanes(true);bindOri()}
  else if(LS.get("ctl_onb",0)&&state==="granted"){startGps();if(S.pos)fetchPlanes(true);bindOri()}
  else if(LS.get("ctl_onb",0)&&S.pos){startGps();fetchPlanes(true);bindOri()}
  // vracajúci sa hráč bez polohy: krátka voľba miesta namiesto celého úvodu
  else if(LS.get("ctl_onb",0)){setTimeout(()=>{$("statusPill").onclick();toast("📍 Kde si?","Zapni GPS alebo vyber mesto")},400)}
  else{$("onb").style.display="flex";onbModal()}
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
  if(ok){const st=(LS.get("ctl_gstreak",0)|0)+1;LS.set("ctl_gstreak",st);const gd=LS.get("ctl_gday",{d:"",n:0});if(gd.d!==dayKey()){gd.d=dayKey();gd.n=0}const gp=gd.n<5?2+(st>=3?1:0):0;gd.n++;LS.set("ctl_gday",gd);COL.pts+=gp;LS.set("ctl_col",COL);toast(gp?"🎯 Trafené! +"+gp+" body":"🎯 Trafené!",st>1?"Séria "+st+" za sebou 🔥":"Cieľ: "+box.dataset.right,"#6dffc7");haptic([20,40,20]);confetti(st>=3?60:25);ping("u");if(st>=5)grantAch("oracle")}
  else{LS.set("ctl_gstreak",0);toast("😅 Vedľa!","Cieľ: "+box.dataset.right);haptic(60)}
  guessDone(box.dataset.hex);
};
$("gSkip").onclick=()=>guessDone($("guess").dataset.hex);
ACH.push({id:"oracle",i:"🔮",n:"Jasnovidec (5×)",h:"5× za sebou správne uhádni, kam lietadlo letí",pr:()=>[LS.get("ctl_gstreak",0)|0,5],c:()=>false});
$("t-guess").classList.toggle("on",S.guess);
$("t-guess").onclick=()=>{S.guess=!S.guess;LS.set("ctl_guess",S.guess);$("t-guess").classList.toggle("on",S.guess);if(S.top)renderHeroStatic(S.top)};

/* ============ 🔒 súkromie a zmazanie údajov ============ */
const openPriv=e=>{if(e)e.preventDefault();$("privM").classList.add("on")};
$("b-privacy").onclick=openPriv;$("f-privacy").onclick=openPriv;$("onb-privacy").onclick=openPriv;$("privClose").onclick=()=>$("privM").classList.remove("on");
let forgetArm=0;
$("b-forget").onclick=async()=>{
  if(Date.now()-forgetArm>4000){forgetArm=Date.now();$("b-forget").textContent="Naozaj? Ťukni znova";return}
  if(!kidPinOk("zmazať údaje"))return;
  try{if(typeof apiPost==="function")await apiPost("/api/forget",{})}catch(e){}
  try{const r=await navigator.serviceWorker?.getRegistration();const sub=await r?.pushManager?.getSubscription();await sub?.unsubscribe()}catch(e){}
  try{await caches.delete("ctl-id")}catch(e){}
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

/* ============ 📊 anonymné meranie (bez id, bez IP) + hlásenie chýb ============ */
// 🧪 A/B test: každé zariadenie dostane natrvalo skupinu A alebo B; lievik v /admin ukáže kroky zvlášť (napr. wave1:A vs wave1:B)
const ABV=(()=>{let v=LS.get("ctl_ab","");if(!/^[AB]$/.test(v)){v=Math.random()<.5?"A":"B";LS.set("ctl_ab",v)}return v})();
// aktuálny pokus: text hlavného tlačidla v úvode
if(ABV==="B"&&$("go"))$("go").textContent="📍 Ukáž mi, čo letí nado mnou";
function ev(step){
  try{const done=LS.get("ctl_ev",{});if(done[step])return;done[step]=1;LS.set("ctl_ev",done);
    fetch(DEFAULT_PROXY+"/api/ev",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({step,r:LS.get("ctl_ref",""),v:ABV}),keepalive:true}).catch(()=>{})}catch(e){}
}
{let errN=0;const rep=m=>{if(errN++>5)return;try{navigator.sendBeacon&&navigator.sendBeacon(DEFAULT_PROXY+"/api/err",JSON.stringify({m:String(m).slice(0,200)}))}catch(e){}};
  addEventListener("error",e=>rep((e.message||"err")+" @"+String(e.filename||"").split("/").pop()+":"+e.lineno));
  addEventListener("unhandledrejection",e=>rep("promise: "+(e.reason&&e.reason.message||e.reason)));}
// kto ma pozval (odkaz ?r=)
{const r=new URLSearchParams(location.search).get("r");
  if(r&&/^[A-Za-z0-9]{16}$/.test(r)&&!LS.get("ctl_ref","")&&!LS.get("ctl_onb",0)){LS.set("ctl_ref",r);ev("ref_join")}
  if(r)try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}}
ev("open");
{const last=LS.get("ctl_lastDay",""),td=new Date().toLocaleDateString("sv-SE");if(last&&last!==td)ev("day2");LS.set("ctl_lastDay",td)}
if(matchMedia("(display-mode: standalone)").matches||navigator.standalone)ev("install");
HOOKS.caught.push(()=>{ev("catch1");if(COL.n>=5)ev("catch5")});
// pamätaj si údaje natrvalo (Safari inak po 7 dňoch nečinnosti maže)
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}

/* ============ 📱 iPhone a prehliadače v appkách ============ */
const UA=navigator.userAgent,isIPad=/Macintosh/.test(UA)&&navigator.maxTouchPoints>1;
const inApp=/FBAN|FBAV|Instagram|musical_ly|Bytedance|TikTok|Messenger|Snapchat|Line\//i.test(UA);
function inAppBar(){
  if(!inApp||LS.get("ctl_inappX",false)||document.querySelector(".inappBar"))return;
  const b=document.createElement("div");b.className="inappBar glass";
  b.innerHTML=`<b>Uložiť si body?</b><span>Otvor appku v Safari alebo Chrome: ťukni na ⋯ → „Otvoriť v prehliadači“. Tu sa body môžu stratiť.</span><button aria-label="Zavrieť">✕</button>`;
  b.querySelector("button").onclick=()=>{LS.set("ctl_inappX",true);b.remove()};document.body.appendChild(b);
}// až po prvom mávnutí (nech to nepreruší prvý zážitok)
if((LS.get("ctl_waveN",0)|0)>0)setTimeout(inAppBar,4000);

// obrazovka nezhasne počas AR a spoločného momentu
const WAKE={l:null,want:false};
async function wakeOn(){WAKE.want=true;try{if(navigator.wakeLock&&!WAKE.l){WAKE.l=await navigator.wakeLock.request("screen");WAKE.l.addEventListener("release",()=>{WAKE.l=null})}}catch(e){}}
function wakeOff(){WAKE.want=false;try{WAKE.l&&WAKE.l.release()}catch(e){}WAKE.l=null}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&WAKE.want)wakeOn()});

/* ============ 🔁 prenos zbierky jednorazovým kódom (platí 10 min, starý mobil stratí prístup) ============ */
const XKEYS={ctl_col:"object",ctl_nick:"string",ctl_daily:"object",ctl_log:"object",ctl_waveN:"number",ctl_gstreak:"number",ctl_team:"object",ctl_track:"object",ctl_season:"object",ctl_streakp:"boolean"};
async function xferMake(){
  if(typeof apiPost!=="function")return;
  const data={};for(const k of Object.keys(XKEYS)){const v=localStorage.getItem(k);if(v!=null)data[k]=v}
  try{const r=await apiPost("/api/xfer",{data:JSON.stringify(data)});const j=await r.json();
    if(!j.code){toast("Kód sa nepodarilo vytvoriť","Skús o chvíľu");return}
    $("xCode").textContent=j.code.slice(0,4)+" "+j.code.slice(4);$("xM").classList.add("on");
  }catch(e){toast("Bez internetu","Prenos potrebuje pripojenie")}
}
async function xferClaim(){
  const code=(prompt("Zadaj 8-miestny kód z druhého mobilu:")||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(code.length!==8)return;
  if(!confirm("Prenesiem sem zbierku z druhého mobilu. Tvoja súčasná zbierka v tomto mobile sa nahradí. Pokračovať?"))return;
  try{const r=await fetch(DEFAULT_PROXY+"/api/xclaim",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({code})});const j=await r.json();
    if(!j.id){toast("Kód je neplatný alebo vypršal","Vytvor v druhom mobile nový – platí 10 minút a len raz");return}
    let data={};try{data=JSON.parse(j.data||"{}")}catch(e){}
    for(const [k,t] of Object.entries(XKEYS)){if(typeof data[k]!=="string")continue;try{const v=JSON.parse(data[k]);if(typeof v===t&&v!==null)localStorage.setItem(k,data[k])}catch(e){}}
    LS.set("ctl_cid",j.id);LS.set("ctl_tok",j.tok);LS.set("ctl_tok0",j.tok);LS.set("ctl_pid",j.pid);LS.set("ctl_fk",j.fk);LS.set("ctl_onb",1);
    toast("🔁 Zbierka prenesená","Vitaj späť!");setTimeout(()=>location.reload(),1200);
  }catch(e){toast("Bez internetu","Prenos potrebuje pripojenie")}
}
$("b-transfer").onclick=()=>{if(kidPinOk("prenos zbierky"))xferMake()};$("b-claim").onclick=()=>{if(kidPinOk("prenos zbierky"))xferClaim()};$("xClose").onclick=()=>$("xM").classList.remove("on");
/* návod na pridanie na plochu */
function installGuide(){
  const ios=/iPhone|iPod/.test(UA)||isIPad,crios=/CriOS/.test(UA);
  $("instSteps").innerHTML=ios?`<li>Ťukni na <b>Zdieľať</b> ${crios?"(⬆️ hore vpravo)":"(⬆️ dole v strede, v novom iOS pod ⋯)"}</li><li>Posuň nižšie a vyber <b>Pridať na plochu</b></li><li>Ťukni <b>Pridať</b>. Potom otvor appku z plochy a v Nastaveniach → <b>Prenos zbierky</b> zadaj kód, ak chceš zachovať body.</li>`
    :`<li>Ťukni na <b>⋮</b> vpravo hore</li><li>Vyber <b>Pridať na plochu</b> alebo <b>Inštalovať aplikáciu</b></li>`;
  $("instM").classList.add("on");
}
$("instClose").onclick=()=>$("instM").classList.remove("on");
$("instCopy").onclick=()=>{$("instM").classList.remove("on");xferMake()};
// modálne okná: zatvorenie klávesom Esc a návrat zamerania
function closeModal(m){if(!m)return;if(m.id==="shz"){const c=m.querySelector("#shzClose,[data-close],.ghost");if(c){c.click();return}}m.classList.remove("on");if(m.id==="ar"&&typeof closeAR==="function")closeAR();if(m.id==="cdM"&&typeof CD!=="undefined")CD=null}
addEventListener("keydown",e=>{
  const top=[...document.querySelectorAll(".modal.on")].pop();if(!top)return;
  if(e.key==="Escape"){closeModal(top);return}
  // Tab zostáva v okne (VoiceOver / klávesnica)
  if(e.key!=="Tab")return;const f=[...top.querySelectorAll(FOCUSABLE)].filter(x=>x.offsetParent!==null);if(!f.length)return;
  const i=f.indexOf(document.activeElement);
  if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&(i===-1||i===f.length-1)){e.preventDefault();f[0].focus()}});
// fokus: pri otvorení okna na jeho prvý prvok, po zatvorení späť na tlačidlo, ktoré ho otvorilo
const FOCUSABLE='button:not([disabled]),[href],input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';
{const ret=new Map();
  const mo=new MutationObserver(ms=>{for(const m of ms){const el=m.target;if(!el.classList||!el.classList.contains("modal"))continue;
    const on=el.classList.contains("on");
    if(on&&!ret.has(el)){ret.set(el,document.activeElement);el.setAttribute("role",el.getAttribute("role")||"dialog");el.setAttribute("aria-modal","true");
      setTimeout(()=>{if(!el.classList.contains("on")||el.contains(document.activeElement))return;const t=el.querySelector("h2,h3,.mcard")||el;if(!t.hasAttribute("tabindex"))t.setAttribute("tabindex","-1");try{t.focus({preventScroll:true})}catch(e){}},60)}
    else if(!on&&ret.has(el)){const r=ret.get(el);ret.delete(el);if(r&&r.focus&&document.contains(r)&&!document.querySelector(".modal.on"))try{r.focus({preventScroll:true})}catch(e){}}}});
  document.querySelectorAll(".modal").forEach(el=>mo.observe(el,{attributes:true,attributeFilter:["class"]}))}
// zatvorenie ťuknutím vedľa (na tmavé pozadie)
document.addEventListener("click",e=>{const m=e.target;if(m.classList&&m.classList.contains("modal")&&m.classList.contains("on"))closeModal(m)});
// zatvorenie potiahnutím okna nadol (za úchyt), keď je obsah na vrchu
{let y0=null,card=null,dy=0;
  document.addEventListener("touchstart",e=>{const c=e.target.closest(".modal.on .mcard");if(!c||c.scrollTop>0||e.target.closest("input,textarea,.cdPick,canvas,#mapBox,.leaflet-container")){y0=null;return}card=c;y0=e.touches[0].clientY;dy=0},{passive:true});
  document.addEventListener("touchmove",e=>{if(y0==null||!card)return;dy=e.touches[0].clientY-y0;if(dy>0&&card.scrollTop<=0){card.style.transform=`translateY(${dy*.6}px)`;card.style.transition="none"}},{passive:true});
  document.addEventListener("touchend",()=>{if(!card)return;const c=card;card=null;c.style.transition="transform .2s";if(dy>110){closeModal(c.closest(".modal"));setTimeout(()=>{c.style.transform="";c.style.transition=""},250)}else c.style.transform="";y0=null},{passive:true});}
// odznak na ikone zmizne, keď otvoríš appku
try{navigator.clearAppBadge&&navigator.clearAppBadge()}catch(e){}

/* ============ 🧒 režim pre deti do 16 rokov (bez prezývky, pošty, kamarátov a upozornení) ============ */
const KID=()=>LS.get("ctl_kid",false);
function kidApply(){const k=KID();document.body.classList.toggle("kid",k);$("t-kid").classList.toggle("on",k);$("nick").disabled=k;if(k){LS.set("ctl_nick","");$("nick").value="";LS.set("ctl_pushAsked",true)}}
function kidSet(on){LS.set("ctl_kid",on);kidApply();if(typeof apiPost==="function")apiPost("/api/kid",{on:on?1:0}).catch(()=>{})}
// 🔒 rodičovský PIN: chráni vypnutie detského režimu, prenos zbierky a mazanie
const pinH=p=>String(hash("cotoleti-pin:"+p));
function kidPinSet(){if(LS.get("ctl_kpin",""))return;const p=prompt("Rodič: nastav 4-miestny PIN.\nBude treba na vypnutie detského režimu, prenos a mazanie zbierky.","");if(p&&/^\d{4}$/.test(p.trim()))LS.set("ctl_kpin",pinH(p.trim()));else if(p!==null)toast("PIN musí mať 4 číslice","Nastavíš ho pri ďalšom zapnutí")}
function kidPinOk(what){const h=LS.get("ctl_kpin","");if(!KID()||!h)return true;const p=prompt("🔒 Rodičovský PIN ("+what+"):","");if(p===null)return false;if(pinH(String(p).trim())===h)return true;toast("🔒 Nesprávny PIN","Požiadaj rodiča");haptic([60,40,60]);return false}
$("t-kid").onclick=()=>{
  if(KID()){if(LS.get("ctl_kpin","")){if(!kidPinOk("vypnúť detský režim"))return}else if(!confirm("Naozaj máš 16 alebo viac rokov? Ak nie, nechaj tento režim zapnutý – chráni ťa."))return;kidSet(false);LS.set("ctl_kpin","")}
  else{kidSet(true);setTimeout(kidPinSet,300)}
  haptic(6)};
if($("onbKid"))$("onbKid").onchange=e=>{kidSet(e.target.checked);if(e.target.checked)setTimeout(kidPinSet,300)};
kidApply();
$("b-mydata").onclick=async()=>{
  try{const r=await apiPost("/api/mydata",{});const j=await r.json();
    const sum=`Na serveri o tebe máme:\n• ${j.wavelog?j.wavelog.length:0} ${pl(j.wavelog?j.wavelog.length:0,"mávnutie","mávnutia","mávnutí")} (posledných 8 dní)\n• ${j.subs&&j.subs.length?"zapnuté upozornenia":"žiadne upozornenia"}\n• ${j.nicks&&j.nicks[0]?"prezývku „"+j.nicks[0].nick+"“":"žiadnu prezývku"}\n• ${j.kamarati||0} kamarátov\n\nStiahnuť všetko ako súbor?`;
    if(!confirm(sum))return;
    const blob=new Blob([JSON.stringify({zariadenie:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith("ctl_")&&!/tok|cid|fk/.test(k)).map(k=>[k,localStorage.getItem(k)])),server:j},null,1)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="moje-udaje-cotoleti.json";a.click();toast("📄 Údaje stiahnuté","Súbor moje-udaje-cotoleti.json");
  }catch(e){toast("Bez internetu","Skús to znova")}
};

/* onboarding: živé číslo ešte pred otázkou na polohu */
(async()=>{try{if(LS.get("ctl_onb",0))return;const r=await fetch(DEFAULT_PROXY+"/api/sky",{cache:"no-store"});const j=await r.json();
  const w=j.wavesToday||0,a=j.active||0;if(!w&&!a)return;
  $("onbLive").innerHTML=(w?`Dnes už ${zam(w)} <b>${nf(w)}</b> ${ludia(w)}`:"")+(w&&a?" · ":"")+(a?`práve sa pozerá <b>${nf(a)}</b>`:"");}catch(e){}})();
/* poloha nedostupná: hneď ponúknuť mestá (nie súradnice) */
function heroCities(){
  const box=$("heroErr");box.innerHTML=`<div style="margin:6px 0 8px">Nevadí! Vyber mesto a hneď uvidíš, čo nad ním letí 👇</div><div class="cities on" id="heroCities">${CITIES.map(c=>`<button data-c="${c[0]}">${c[0]}</button>`).join("")}</div>`;
  box.style.display="block";
  $("heroCities").onclick=e=>{const b=e.target.closest("button");if(!b)return;const c=CITIES.find(x=>x[0]===b.dataset.c);if(c){box.innerHTML="";setManual(c[1],c[2],c[0])}};
}

function onbModal(){const onb=$("onb");if(!onb||LS.get("ctl_onb",0))return;const Q="main,nav,#top,header,#fabWave,#momentBar";onb.setAttribute("role","dialog");onb.setAttribute("aria-modal","true");document.querySelectorAll(Q).forEach(e=>e.inert=true);
  const rel=()=>document.querySelectorAll(Q).forEach(e=>e.inert=false);new MutationObserver(()=>{if(onb.style.display==="none"||onb.classList.contains("hide"))rel()}).observe(onb,{attributes:true});}
$("list").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){const r=e.target.closest(".row");if(r){e.preventDefault();r.click()}}});

/* ============ 👋 plávajúce Mávni (keď karta lietadla zmizne pri scrolle) ============ */
{const fab=$("fabWave");let heroVis=true;
  new IntersectionObserver(es=>{heroVis=es[0].isIntersecting;upd()},{threshold:.15}).observe($("hero"));
  function upd(){const a=S.top,ok=S.view==="now"&&!heroVis&&a&&!a.emg&&!$("b-wave").disabled&&!$("b-wave").classList.contains("waved");
    fab.classList.toggle("on",!!ok);if(ok)fab.textContent="👋 Mávni · "+(a.call||titleOf(a))}
  fab.onclick=()=>{haptic(8);if(typeof doWave==="function")doWave("👋");setTimeout(upd,600)};
  HOOKS.live.push(upd);HOOKS.view.push(upd);
  // počas oznámenia sa tlačidlo skryje, aby sa neprekrývali
  new MutationObserver(()=>document.body.classList.toggle("toastOn",$("toast").classList.contains("on"))).observe($("toast"),{attributes:true,attributeFilter:["class"]});}

/* ============ ↓ potiahni nadol = nové lietadlá ============ */
{const ptr=$("ptr");let y0=null,dy=0,busyP=false;
  addEventListener("touchstart",e=>{if(S.view!=="now"||scrollY>0||document.querySelector(".modal.on")||busyP)return;y0=e.touches[0].clientY;dy=0},{passive:true});
  addEventListener("touchmove",e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);ptr.style.transform=`translate(-50%,${Math.min(dy,90)-60}px)`;ptr.style.rotate=(dy*3)+"deg"},{passive:true});
  addEventListener("touchend",async()=>{if(y0==null)return;y0=null;
    if(dy>70){busyP=true;haptic(12);ptr.classList.add("spin");ptr.style.transform="translate(-50%,24px)";try{await fetchPlanes(true)}catch(e){}
      setTimeout(()=>{ptr.classList.remove("spin");ptr.style.transform="";ptr.style.rotate="";busyP=false},500)}
    else{ptr.style.transform="";ptr.style.rotate=""}},{passive:true});}

/* 📷 fotka lietadla len s menom autora (autorské práva) */
const PHOTO=new Map();
function photoOf(hex){
  if(PHOTO.has(hex))return PHOTO.get(hex);
  const pr=getJSON(MYPROXY+"/?url="+encodeURIComponent("https://www.airport-data.com/api/ac_thumb.json?m="+hex.toUpperCase()+"&n=1"),6000).then(({ok,j})=>{
    const d=ok&&j&&j.data&&j.data[0];if(!d||!d.photographer||!/^https:\/\//.test(d.image||""))return null;
    return {img:d.image.replace("/thumbnails/","/"),thumb:d.image,by:String(d.photographer).slice(0,40),link:/^https:\/\//.test(d.link||"")?d.link:"https://www.airport-data.com/"};
  }).catch(()=>null);
  PHOTO.set(hex,pr);return pr;
}

/* 👀 zazreté (bez bodov) – „Včera nad tebou“; uloviť sa dá len zamávaním */
function seenLog(list){
  const d=dayKey(),L=LS.get("ctl_seen",{});let ch=false;
  const t=L[d]||(L[d]={n:0,h:{},best:null,bestR:0});
  const RO={c:0,u:1,r:2,l:3};
  for(const a of list){if(a.el==null||a.el<10||a.santa||t.h[a.hex])continue;
    if(t.n<400){t.h[a.hex]=COL.hex[a.hex]?2:1}t.n++;ch=true;
    const r=rarity(a);if(RO[r]>=t.bestR&&!a.priv){t.bestR=RO[r];t.best=titleOf(a)}}
  if(!ch)return;
  for(const k of Object.keys(L))if(k<dayAgo(3))delete L[k];
  LS.set("ctl_seen",L);
}
function seenSum(){
  const L=LS.get("ctl_seen",{}),y=L[dayAgo(1)],t=L[dayKey()];
  // ulovené dnes = aj tie, ktoré sme v zozname nezachytili (rovnaký prah 10° ako zbierka)
  const caught=(x,d)=>x?new Set([...Object.keys(x.h).filter(h=>COL.hex[h]),...Object.keys(COL.hex).filter(h=>COL.hex[h]&&SKD.format(new Date(COL.hex[h]))===d)]).size:0;
  const parts=[];
  if(t&&t.n)parts.push(`<b>Dnes nad tebou:</b> ${t.n} ✈️ · ulovené ${caught(t,dayKey())} 👋`);
  if(y&&y.n)parts.push(`<b>Včera:</b> ${y.n} ✈️ · ulovené ${caught(y,dayAgo(1))}${y.best?" · najvzácnejšie "+esc(y.best):""}`);
  return parts.length?parts.join("<br>")+'<br><small>Do zbierky pribudne každé lietadlo, ktorému zamávaš 👋</small>':"";
}

/* 🗓️ sezóny (každé 3 mesiace) – zbierka sa nikdy nemaže, len sa začína nové počítadlo */
const SEAS_REW=["+50 míľ a odznak","+120 míľ","+250 míľ a odznak"];
const SEAS=[["Zima","❄️"],["Jar","🌱"],["Leto","☀️"],["Jeseň","🍂"]];
function seasonNow(d=new Date()){
  const m=d.getMonth(),i=m===11||m<2?0:m<5?1:m<8?2:3,y=m===11?d.getFullYear()+1:d.getFullYear();
  const endM=[2,5,8,11][i],end=new Date(i===0?y:y,endM,0);
  return {k:y+"-"+i,name:SEAS[i][0]+(i===0?" "+(y-1)+"/"+String(y).slice(2):" "+y),e:SEAS[i][1],end:end.getDate()+". "+(end.getMonth()+1)+".",endY:i===0?y:y,endM};
}
function seasonUpd(){
  const n=seasonNow(),st=LS.get("ctl_season",null);
  let z=st;
  if(!z){z={k:n.k,base:COL.pts,best:0,hist:[]}}
  else if(z.k!==n.k){
    const got=COL.pts-z.base,old=z.k;
    z.hist=(z.hist||[]).concat([{k:old,p:got}]).slice(-8);z.best=Math.max(z.best||0,got);z.k=n.k;z.base=COL.pts;
    // súhrn uzavretej sezóny ako karta
    if(got>0)setTimeout(()=>{$("cdBox").innerHTML=`<div style="text-align:center;font-size:56px">🗓️</div><div class="cdScore">Sezóna skončila</div><div class="lookSub" style="text-align:center">Získal(a) si <b>${got} b</b>${got>=(z.best||0)?" – tvoj rekord! 🏆":""}.<br>Začína ${esc(n.name)} – zbierka ti zostáva celá, body sezóny idú od nuly.</div><div class="acts"><button class="btn pri" id="cdX">Ideme na to 💪</button></div>`;$("cdM").classList.add("on")},3000);
    if(got>=100)setTimeout(()=>grantAch("season100"),0);
  }
  // 🏅 stupne sezóny 100/300/600 b: míle a odznaky (raz za sezónu)
  const pts=Math.max(0,COL.pts-z.base);z.tiers=z.tiers&&z.tierK===n.k?z.tiers:[];z.tierK=n.k;
  [100,300,600].forEach((t,i)=>{if(pts>=t&&!z.tiers.includes(t)){z.tiers.push(t);COL.mi=(COL.mi|0)+[50,120,250][i];LS.set("ctl_col",COL);LS.set("ctl_season",z);/* uložiť hneď – grantAch prekreslí Ja a znova zavolá seasonUpd */if(i===0)setTimeout(()=>grantAch("season100"),0);if(i===2)setTimeout(()=>grantAch("season600"),0);
    setTimeout(()=>toast("🏅 Stupeň sezóny "+(i+1)+"/3",t+" b · odmena "+SEAS_REW[i]),2000)}});
  LS.set("ctl_season",z);
  const endD=new Date(n.endY,n.endM,0),left=Math.max(0,Math.ceil((endD.setHours(23,59,59)-Date.now())/864e5));
  return {...n,pts,best:z.best||0,left};
}
if(typeof ACH!=="undefined")ACH.push({id:"season100",i:"🗓️",n:"100 bodov za jednu sezónu",h:"Získaj 100 bodov v jednej sezóne",c:()=>false},{id:"season600",i:"🏅",n:"600 bodov za jednu sezónu",h:"Získaj 600 bodov v jednej sezóne",c:()=>false});

/* 🔠 veľkosť písma: systémová (Dynamic Type na iPhone) × vlastné „Väčšie písmo“ */
function fsApply(){
  let sys=1;
  try{const pr=document.createElement("div");pr.style.cssText="font:-apple-system-body;position:absolute;visibility:hidden";document.body.appendChild(pr);
    const px=parseFloat(getComputedStyle(pr).fontSize);pr.remove();if(px&&CSS.supports("font","-apple-system-body"))sys=px/17}catch(e){}
  const big=LS.get("ctl_big",false),f=Math.max(.9,Math.min(1.35,sys*(big?1.15:1)));
  document.documentElement.style.setProperty("--fs",f.toFixed(3));
  if($("t-big"))$("t-big").classList.toggle("on",big),$("t-big").setAttribute("aria-checked",big);
}
if($("t-big"))$("t-big").onclick=()=>{LS.set("ctl_big",!LS.get("ctl_big",false));fsApply();haptic(10)};
fsApply();addEventListener("pageshow",fsApply);

/* ⚙️ nastavenia jedným ťukom z hlavičky Ja */
$("b-gear").onclick=()=>{const st=$("settings");st.open=true;haptic(8);setTimeout(()=>st.scrollIntoView({behavior:"smooth",block:"start"}),60)};

$("shareNudge").onclick=async()=>{
  const a=S.list.find(x=>x.hex===$("shareNudge").dataset.hex)||S.top;if(!a)return;$("shareNudge").hidden=true;
  const rt=routeOf(a),to=rt?" → "+citySk(rt.destination.municipality):"",n=planeWaves(a.hex).total||1;
  const text=`👋 Mávam lietadlu ${a.call||""}${to}. Dnes mu už ${zam(n)} ${n} ${ludia(n)} – letí aj nad tebou? Zamávaj aj ty ✈️`;
  const url=planeLink(a);
  try{if(navigator.share){await navigator.share({title:"Čo to letí?",text,url});ev("nudgeShare");return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho kamarátovi")}catch(e){}
};
HOOKS.heroStatic.push(a=>{const sn=$("shareNudge");if(sn&&!sn.hidden&&(!a||a.hex!==sn.dataset.hex))sn.hidden=true});
// prišiel si z odkazu od kamaráta? povedz to už na úvode
// pozvánka pred úvodom: meno pozývajúceho z odkazu (ak sa dá prečítať)
if(!LS.get("ctl_onb",0)&&/(vyzva|kd|tim|let|dar|p)=/.test(location.hash)){const d=document.createElement("div");d.className="onbInvite";
  const who=(()=>{const m=location.hash.match(/(?:vyzva|kd)=([\w-]+)/);if(!m)return "";try{const j=JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g,"+").replace(/_/g,"/")))));return String(j.n||"").replace(/[^\p{L}\p{N} ._-]/gu,"").slice(0,16)}catch(e){return ""}})()||"Kamarát";
  const h=location.hash;
  d.textContent=/kd=/.test(h)?"⚔️ "+who+" ťa vyzval(a) na súboj kartičiek – najprv zisti, čo letí nad tebou":/tim=/.test(h)?"👥 Dostal(a) si pozvánku do tímu – najprv zisti, čo letí nad tebou":/let=/.test(h)?"✈️ Kamarát ti posiela let – najprv povoľ polohu, nech vieš, kedy bude nad tebou":/dar=/.test(h)?"🎁 Máš darček – kartičku lietadla. Najprv zisti, čo letí nad tebou":/(^|#|&)p=/.test(h)?"✈️ Kamarát ti posiela lietadlo – povoľ polohu a uvidíš, či letí aj nad tebou":"⚔️ "+who+" ťa vyzýva – najprv zisti, čo letí nad tebou";
  const go=$("go");go&&go.parentNode.insertBefore(d,go)}
// ✈️ odkaz na konkrétne lietadlo (#p=hex): ukáž ho, ak je nad tebou, inak povedz, kde je
function planeFromHash(){const m=location.hash.match(/(?:^|[#&])p=([0-9a-f]{6})/);if(!m)return;
  if(!LS.get("ctl_onb",0)){afterOnb(planeFromHash);return}
  try{history.replaceState(null,"",location.pathname)}catch(e){}
  const hx=m[1],look=n=>{const a=S.list&&S.list.find(x=>x.hex===hx);if(a){S.pick=hx;try{tick(true)}catch(e){}window.scrollTo({top:0,behavior:"smooth"});toast("✈️ "+titleOf(a)+" je nad tebou!",Math.round(a.el)>0?Math.round(a.el)+"° nad obzorom – zamávaj 👋":"Je za obzorom, chvíľu počkaj");return}
    if(n>0)setTimeout(()=>look(n-1),3000);else toast("✈️ To lietadlo už nad tebou neletí","Pozri, čo letí práve teraz – zamávaj mu 👋")};look(5)}
planeFromHash();addEventListener("hashchange",planeFromHash);

/* 👨‍👩‍👧 rodinné profily na jednom mobile: každý má vlastnú zbierku, sériu aj identitu na serveri */
const PKEYS=["ctl_col","ctl_daily","ctl_season","ctl_waved","ctl_waveN","ctl_nick","ctl_kid","ctl_kpin","ctl_cid","ctl_tok","ctl_tok0","ctl_pid","ctl_fk","ctl_fkT","ctl_seen","ctl_log","ctl_wq","ctl_famScore","ctl_kdDone","ctl_kdDay","ctl_gstreak","ctl_gday","ctl_streakp","ctl_team","ctl_track","ctl_goldAlert","ctl_adopt","ctl_momJoined","ctl_momPts","ctl_goldWon","ctl_mayor","ctl_wanted","ctl_wantedK","ctl_inv","ctl_invSeen"];
function profState(){return LS.get("ctl_profs",{cur:"A",n:{A:"Ja",B:"Dieťa"}})}
function profRender(){const P=profState(),o=P.cur==="A"?"B":"A";const el=$("profTxt");if(!el)return;el.innerHTML=`Hrá: <b>${esc(P.n[P.cur])}</b>`;$("b-prof").textContent="Prepnúť na: "+P.n[o]}
function profSwitch(){
  const P=profState(),o=P.cur==="A"?"B":"A";
  if(!kidPinOk("prepnúť profil"))return;
  for(const k of PKEYS){const v=localStorage.getItem(k);if(v==null)localStorage.removeItem("ctl_p"+P.cur+":"+k);else localStorage.setItem("ctl_p"+P.cur+":"+k,v)}
  const fresh=!PKEYS.some(k=>localStorage.getItem("ctl_p"+o+":"+k)!=null);
  for(const k of PKEYS){const v=localStorage.getItem("ctl_p"+o+":"+k);if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}
  P.cur=o;if(fresh){const nm=prompt("Meno profilu (napr. Miško):",P.n[o]);if(nm&&nm.trim())P.n[o]=nm.trim().slice(0,16);if(confirm("Je to profil dieťaťa do 16 rokov? (zapne sa detský režim)")){LS.set("ctl_kid",true);LS.set("ctl_needPin",1)}}
  LS.set("ctl_profs",P);location.reload()}
if($("b-prof")){$("b-prof").onclick=profSwitch;profRender()}
if(LS.get("ctl_needPin",0)&&KID()){LS.set("ctl_needPin",0);setTimeout(kidPinSet,1500)}

/* 📶 stav zdrojov dát v nastaveniach + ručné prepnutie */
function srcRender(){const el=$("srcStat");if(!el||typeof COMBOS==="undefined")return;
  el.innerHTML=COMBOS.map((c,i)=>{const st=SRCST[i]||{},nm=c.s.name+(c.rt.name!=="priamo"?" cez "+c.rt.name:"");return `${i===comboIdx?"▶ ":""}${esc(nm)}: ${st.ok?"✓"+(st.ms?" "+st.ms+" ms":""):st.err?"✗ "+esc(st.err):"–"}`}).join("<br>")}
if($("b-src"))$("b-src").onclick=()=>{haptic(8);const n=COMBOS.length;let k=(comboIdx+1)%n;for(let j=0;j<n;j++){const st=SRCST[(comboIdx+1+j)%n];if(!st||!st.err){k=(comboIdx+1+j)%n;break}}
  comboIdx=k;LS.set("ctl_combo",k);toast("📶 Skúšam iný zdroj",COMBOS[k].s.name);fetchPlanes(true).then(srcRender)};
HOOKS.view.push(v=>{if(v==="col")srcRender()});setInterval(()=>{if(S.view==="col"&&$("settings")&&$("settings").open)srcRender()},5000);

// ťuk na odznak: ako ho získať / kedy si ho získal
$("c-ach")&&$("c-ach").addEventListener("click",e=>{const d=e.target.closest("[data-ach]");if(!d)return;const x=ACH.find(q=>q.id===d.dataset.ach);if(!x)return;haptic(6);
  toast(x.i+" "+x.n,COL.ach[x.id]?"Získaný "+new Date(COL.ach[x.id]).toLocaleDateString("sk-SK"):(x.h||"Zatiaľ zamknutý"))});
