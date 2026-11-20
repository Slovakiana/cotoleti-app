"use strict";
/* ============ ✨ Moja obloha (príbeh v štýle Wrapped) ============ */
let LOG=LS.get("ctl_log",[]);
const LOGK=new Set(LOG.map(e=>e.d+e.h));
const CARGO_RX=/DHL|UPS|FedEx|Cargo|Kalitta|Atlas|ASL|Cargolux/;
function logSave(){if(LOG.length>3000)LOG=LOG.slice(-3000);LS.set("ctl_log",LOG)}
HOOKS.list.push(list=>{
  const d=new Date().toLocaleDateString("sv-SE");let ch=false;
  for(const a of list){
    if(a.el==null||a.el<25)continue;
    if(LOGK.has(d+a.hex))continue;
    LOGK.add(d+a.hex);ch=true;
    const rt=routeOf(a),h=new Date().getHours();
    LOG.push({d,t:Date.now(),h:a.hex,ty:a.type||"",tn:typeName(a,S.meta.get(a.hex)),c:a.call||"",al:airlineOf(a),pax:pax(a),alt:Math.round(a.alt||0),r:rarity(a),mil:a.mil?1:0,
      w:WIDE.has(a.type)?1:0,cg:CARGO_RX.test(airlineOf(a))?1:0,n:(h>=21||h<5)?1:0,
      dest:rt?citySk(rt.destination.municipality):"",dc:rt?rt.destination.country_iso_name:"",dla:rt?rt.destination.latitude:null,dlo:rt?rt.destination.longitude:null});
  }
  if(ch)logSave();
});
// doplň ciele, keď prídu trasy
setInterval(()=>{
  const d=new Date().toLocaleDateString("sv-SE");let ch=false;
  for(let i=LOG.length-1;i>=0&&LOG[i].d===d;i--){const e=LOG[i];if(e.dest)continue;const m=S.meta.get(e.h),rt=m&&m.route;
    if(rt&&rt.destination){e.dest=citySk(rt.destination.municipality);e.dc=rt.destination.country_iso_name;e.dla=rt.destination.latitude;e.dlo=rt.destination.longitude;ch=true}}
  if(ch)logSave();
},10000);

function weekLog(){const since=Date.now()-7*86400e3;return LOG.filter(e=>e.t>=since)}
function spotterType(L=weekLog()){
  const n=L.length;
  if(n<3)return {e:"🐣",n:"Začínajúci pozorovateľ",d:"Pozeraj hore častejšie a odhalíme tvoj typ."};
  const sh=k=>L.filter(e=>e[k]).length/n,rare=L.filter(e=>e.r==="r"||e.r==="l").length,cs=new Set(L.map(e=>e.dc).filter(Boolean)).size;
  if(sh("n")>=.4)return {e:"🦉",n:"Nočný lovec",d:"Keď ostatní spia, ty počítaš svetielka na oblohe."};
  if(rare>=3)return {e:"💎",n:"Zberateľ vzácností",d:"Bežné lietadlá ťa nebavia. Ty loviš legendy."};
  if(sh("w")>=.2)return {e:"🐋",n:"Lovec obrov",d:"Malé lietadlá? To nie je tvoja liga. Ty chceš širokotrupé monštrá."};
  if(sh("cg")>=.15)return {e:"📦",n:"Kuriér oblohy",d:"Polovicu tvojich balíkov si videl letieť ešte skôr, než prišli."};
  if(cs>=8)return {e:"🌍",n:"Svetobežník z gauča",d:"Precestoval si "+cs+" krajín bez jediného kufra."};
  if(n>=50)return {e:"🦅",n:"Strážca oblohy",d:"Nič ti neujde. Nebo nad tebou máš v malíčku."};
  return {e:"☁️",n:"Snívač v oblakoch",d:"Pozeráš hore, keď ostatní pozerajú do mobilu. Teda… aj ty do mobilu. Ale hore!"};
}
function weekStats(){
  const L=weekLog(),n=L.length,pax=L.reduce((s,e)=>s+(e.pax||0),0);
  const cnt={};L.forEach(e=>{if(e.al)cnt[e.al]=(cnt[e.al]||0)+1});
  const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]||null;
  let far=null;if(S.pos)L.forEach(e=>{if(e.dla!=null){const km=distBear(S.pos.lat,S.pos.lon,e.dla,e.dlo).d/1000;if(!far||km>far.km)far={km,city:e.dest}}});
  const ord={l:0,r:1,u:2,c:3},rare=L.slice().sort((a,b)=>ord[a.r]-ord[b.r]||b.alt-a.alt)[0]||null;
  const high=L.reduce((m,e)=>!m||e.alt>m.alt?e:m,null);
  const cs=new Set(L.map(e=>e.dc).filter(Boolean)).size;
  return {n,pax,top,far,rare,high,cs,type:spotterType(L)};
}

const WR={i:0,slides:[],timer:null,t0:0};
const BGS=["linear-gradient(160deg,#1b1464,#6a1b9a 55%,#ff4fd8)","linear-gradient(160deg,#00416a,#0a7cc4 55%,#6dffc7)","linear-gradient(160deg,#3a0647,#b5179e 60%,#ffb347)","linear-gradient(160deg,#0f2027,#2c5364 60%,#4fc3ff)","linear-gradient(160deg,#141e30,#243b55 50%,#ffcf4f)","linear-gradient(160deg,#1f1c2c,#7b5cff 55%,#ff8a4f)","linear-gradient(160deg,#000428,#004e92 60%,#a78bff)"];
function openWrapped(){
  const s=weekStats(),SL=[];
  SL.push({e:"✨",k:"Moja obloha",h:"Tvoj týždeň nad hlavou",p:"Pozri sa, čo všetko ti preletelo nad hlavou za posledných 7 dní."});
  if(!s.n){SL.push({e:"🌤️",k:"Zatiaľ ticho",h:"Obloha čaká",p:"Nechaj appku otvorenú, keď niečo letí nad tebou. Každé lietadlo vyššie ako 25° sa ti zapíše do príbehu."})}
  else{
    SL.push({e:"✈️",k:"Preletelo nad tebou",h:nf(s.n),p:(s.n===1?"lietadlo":s.n<5?"lietadlá":"lietadiel")+" priamo nad tvojou hlavou."});
    if(s.pax)SL.push({e:"🧑‍🤝‍🧑",k:"V nich sedelo",h:"~"+nf(s.pax),p:"ľudí. Niektorí z nich sa možno práve pozerali dole na teba. 👋"});
    if(s.top)SL.push({e:"🏆",k:"Najčastejšia aerolinka",h:s.top[0],p:"Preletela nad tebou "+s.top[1]+"×. Mala by ti platiť nájom."});
    if(s.far)SL.push({e:"🌍",k:"Najďalší cieľ",h:s.far.city||"Ďaleko",p:nf(s.far.km)+" km odtiaľto"+(s.cs>1?" · celkom "+s.cs+" krajín":"")+"."});
    if(s.rare)SL.push({e:s.rare.r==="l"?"🌟":s.rare.r==="r"?"💎":"🛩️",k:"Najvzácnejší úlovok",h:s.rare.tn||s.rare.ty||"Lietadlo",p:RAR[s.rare.r].n+(s.rare.c?" · "+s.rare.c:"")});
  }
  SL.push({e:s.type.e,k:"Tvoj spotter typ",h:s.type.n,p:s.type.d,last:true});
  WR.slides=SL;WR.stats=s;WR.i=0;
  $("wbars").innerHTML=SL.map(()=>"<i><b></b></i>").join("");
  $("wslides").innerHTML=SL.map((x,i)=>`<div class="wslide" style="background:${BGS[i%BGS.length]};display:none"><div class="e">${x.e}</div><div class="k">${esc(x.k)}</div><div class="h">${esc(x.h)}</div><div class="p">${esc(x.p)}</div></div>`).join("");
  $("wrap").classList.add("on");wrShow(0);haptic(15);
}
function wrShow(i){
  WR.i=Math.max(0,Math.min(WR.slides.length-1,i));
  [...$("wslides").children].forEach((el,k)=>el.style.display=k===WR.i?"flex":"none");
  [...$("wbars").children].forEach((el,k)=>el.firstChild.style.width=k<WR.i?"100%":"0");
  const last=WR.i===WR.slides.length-1;$("wacts").style.display=last?"flex":"none";
  clearInterval(WR.timer);WR.t0=Date.now();
  if(!last)WR.timer=setInterval(()=>{const p=(Date.now()-WR.t0)/5000;const b=$("wbars").children[WR.i];if(b)b.firstChild.style.width=Math.min(100,p*100)+"%";if(p>=1)wrShow(WR.i+1)},50);
  else{const b=$("wbars").children[WR.i];if(b)b.firstChild.style.width="100%";confetti(60);ping("r")}
}
function closeWrapped(){clearInterval(WR.timer);$("wrap").classList.remove("on")}
$("wnext").onclick=()=>wrShow(WR.i+1);$("wprev").onclick=()=>wrShow(WR.i-1);$("wclose").onclick=closeWrapped;
$("b-wrapped").onclick=openWrapped;
$("wduel").onclick=()=>sendDuel();
$("wshare").onclick=async()=>{
  const s=WR.stats||weekStats(),W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  try{await document.fonts.ready}catch(e){}
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#1b1464");g.addColorStop(.55,"#6a1b9a");g.addColorStop(1,"#ff4fd8");x.fillStyle=g;x.fillRect(0,0,W,H);
  for(let i=0;i<140;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.6})`;x.beginPath();x.arc(Math.random()*W,Math.random()*H*.5,Math.random()*2.4,0,7);x.fill()}
  x.textAlign="left";x.fillStyle="rgba(255,255,255,.8)";x.font="700 40px Inter, sans-serif";x.fillText("MOJA OBLOHA · TENTO TÝŽDEŇ",90,260);
  x.font="200px sans-serif";x.fillText(s.type.e,80,500);
  x.fillStyle="#fff";let fs=110;x.font=`900 ${fs}px Unbounded, sans-serif`;while(x.measureText(s.type.n).width>W-180&&fs>56){fs-=8;x.font=`900 ${fs}px Unbounded, sans-serif`}x.fillText(s.type.n,90,650);
  x.fillStyle="rgba(255,255,255,.85)";x.font="500 40px Inter, sans-serif";wrapText(x,s.type.d,90,730,W-180,54,3);
  const cells=[[nf(s.n),"lietadiel nad hlavou"],["~"+nf(s.pax),"ľudí na palube"],[s.top?s.top[0]:"—","najčastejšia aerolinka"],[s.far?s.far.city:"—",s.far?nf(s.far.km)+" km ďaleko":"najďalší cieľ"]];
  cells.forEach((q,i)=>{const cx=90+(i%2)*460,cy=960+Math.floor(i/2)*300;x.fillStyle="rgba(255,255,255,.12)";rr(x,cx,cy,440,260,40);x.fill();
    x.fillStyle="#fff";let f2=72;x.font=`800 ${f2}px Unbounded, sans-serif`;while(x.measureText(String(q[0])).width>380&&f2>34){f2-=6;x.font=`800 ${f2}px Unbounded, sans-serif`}x.fillText(String(q[0]),cx+34,cy+130);
    x.fillStyle="rgba(255,255,255,.8)";x.font="500 32px Inter, sans-serif";x.fillText(clip(x,q[1],380),cx+34,cy+200)});
  x.textAlign="center";x.fillStyle="#6dffc7";x.font="900 64px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,H-300);
  x.fillStyle="rgba(255,255,255,.85)";x.font="500 36px Inter, sans-serif";x.fillText("Aký spotter typ si ty? → "+APP_HOST,W/2,H-245);
  c.toBlob(b=>b&&shareBlob(b,"moja-obloha.png","Môj spotter typ: "+s.type.e+" "+s.type.n+" ✈️ Aký si ty? "+appLink()+TAGS),"image/png");
};
