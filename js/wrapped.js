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
  if(!s.n){SL.push({e:"🌤️",k:"Zatiaľ ticho",h:"Obloha čaká",p:"Keď nad tebou niečo letí, zamávaj mu – každé lietadlo, ktorému zamávaš, sa ti uloží do zbierky."})}
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
  const last=WR.i===WR.slides.length-1;$("wacts").style.display=last?"flex":"none";$("wshare").hidden=((WR.stats||weekStats()).n|0)<5; // s 1–4 lietadlami nikto nepostne
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
  const cells=[[nf(s.n),pl(s.n,"lietadlo","lietadlá","lietadiel")+" nad hlavou"],["~"+nf(s.pax),"ľudí na palube"],[s.top?s.top[0]:"—","najčastejšia aerolinka"],[s.far?s.far.city:"—",s.far?nf(s.far.km)+" km ďaleko":"najďalší cieľ"]];
  cells.forEach((q,i)=>{const cx=90+(i%2)*460,cy=960+Math.floor(i/2)*300;x.fillStyle="rgba(255,255,255,.12)";rr(x,cx,cy,440,260,40);x.fill();
    x.fillStyle="#fff";let f2=72;x.font=`800 ${f2}px Unbounded, sans-serif`;while(x.measureText(String(q[0])).width>380&&f2>34){f2-=6;x.font=`800 ${f2}px Unbounded, sans-serif`}x.fillText(String(q[0]),cx+34,cy+130);
    x.fillStyle="rgba(255,255,255,.8)";x.font="500 32px Inter, sans-serif";x.fillText(clip(x,q[1],380),cx+34,cy+200)});
  x.textAlign="center";x.fillStyle="#6dffc7";x.font="900 64px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,1570);
  x.fillStyle="rgba(255,255,255,.85)";x.font="500 36px Inter, sans-serif";x.fillText("Aký spotter typ si ty? → "+APP_HOST,W/2,1622);
  c.toBlob(b=>b&&shareBlob(b,"moja-obloha.png","Môj spotter typ: "+s.type.e+" "+s.type.n+" ✈️ Aký si ty? "+appLink()+TAGS),"image/png");
};

/* 🇸🇰 Slovensko <rok> na oblohe – spoločný súhrn (december a január) */
function yearOf(){const d=new Date();return d.getMonth()===0?d.getFullYear()-1:d.getFullYear()}
function yearShow(){const d=new Date(),m=d.getMonth();return (m===11||m===0||/rok/.test(location.hash))&&!!SOC.api}
function yearInit(){if(!$("b-year"))return;$("yearY").textContent=yearOf();$("b-year").hidden=!yearShow();if(/rok/.test(location.hash)&&yearShow())setTimeout(yearOpen,900)}
async function yearOpen(){
  $("yearM").classList.add("on");$("yearT").textContent="🇸🇰 Slovensko "+yearOf()+" na oblohe";
  try{
    const {ok,j}=await getJSON(SOC.api+"/api/year?y="+yearOf(),8000);if(!ok||!j)throw 0;
    const KN=k=>(KRAJ[k]||KRAJ.XX)[2];
    const fd=s=>s?new Date(s+"T12:00:00").toLocaleDateString("sk-SK",{day:"numeric",month:"long"}):"";
    $("yearBody").innerHTML=`<div class="lookSub">Spolu sme zamávali</div><div class="yBig">${nf(j.waves)}×</div>
      <div class="lookSub">${nf(j.users)} ${pl(j.users,"nový spotter","noví spotteri","nových spotterov")} · ${j.days} ${pl(j.days,"deň","dni","dní")} mávania${j.gold?" · "+j.gold+"× zlaté lietadlo":""}</div>
      ${j.record?`<div class="ySec">🏆 Rekordný deň</div><div class="yRow"><span>${fd(j.record.day)}</span><b>${nf(j.record.n)} 👋</b></div>`:""}
      ${j.kraje.length?`<div class="ySec">🗺️ Kraje</div>`+j.kraje.slice(0,3).map((k,i)=>`<div class="yRow"><span>${["🥇","🥈","🥉"][i]} ${esc(KN(k.k))}</span><b>${nf(k.n)}</b></div>`).join(""):""}
      ${j.towns.length?`<div class="ySec">🏙️ Mestá</div>`+j.towns.slice(0,3).map((t,i)=>`<div class="yRow"><span>${["🥇","🥈","🥉"][i]} ${esc(t.town)}</span><b>${nf(t.n)}</b></div>`).join(""):""}
      ${j.planes.length?`<div class="ySec">✈️ Najzamávanejšie lietadlá</div>`+j.planes.map((p,i)=>`<div class="yRow"><span>${["🥇","🥈","🥉"][i]} ${esc(p.call||p.hex)}${p.dest?" → "+esc(p.dest):""}</span><b>${nf(p.n)}</b></div>`).join(""):""}
      <div class="lookSub" style="margin-top:12px">Tvoj rok: ${nf(COL.n)} ${pl(COL.n,"úlovok","úlovky","úlovkov")} · ${nf(COL.pts)} ${pl(COL.pts,"bod","body","bodov")}</div>`;
    YEAR=j;
  }catch(e){$("yearBody").innerHTML='<div class="lookSub">Súhrn sa nepodarilo načítať. Skús to o chvíľu.</div>'}
}
let YEAR=null;
if($("b-year")){
  $("b-year").onclick=yearOpen;
  $("yearClose").onclick=()=>$("yearM").classList.remove("on");
  $("yearShare").onclick=async()=>{
    // 📸 obrázok do príbehu (1080×1920, obsah v bezpečnej zóne)
    if(YEAR){const j=YEAR,W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
      const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#0b4ea2");g.addColorStop(.55,"#0e1430");g.addColorStop(1,"#ee1c25");x.fillStyle=g;x.fillRect(0,0,W,H);
      x.textAlign="center";x.fillStyle="#fff";x.font="800 52px Unbounded, sans-serif";x.fillText("🇸🇰 Slovensko "+j.y+" na oblohe",W/2,300);
      x.font="500 40px Inter, sans-serif";x.fillStyle="rgba(255,255,255,.85)";x.fillText("Spolu sme zamávali",W/2,420);
      x.font="900 150px Unbounded, sans-serif";x.fillStyle="#ffcf4f";x.fillText(nf(j.waves)+"×",W/2,580);
      let y=720;const row=(a,b)=>{x.textAlign="left";x.fillStyle="#fff";x.font="600 42px Inter, sans-serif";x.fillText(a,150,y);x.textAlign="right";x.font="800 42px Inter, sans-serif";x.fillText(b,W-150,y);y+=70};
      if(j.kraje&&j.kraje[0]){x.textAlign="center";x.font="700 36px Inter, sans-serif";x.fillStyle="rgba(255,255,255,.7)";x.fillText("VÍŤAZNÝ KRAJ",W/2,y);y+=70;row("🥇 "+(KRAJ[j.kraje[0].k]||KRAJ.XX)[2],nf(j.kraje[0].n));y+=30}
      if(j.planes&&j.planes[0]){x.textAlign="center";x.font="700 36px Inter, sans-serif";x.fillStyle="rgba(255,255,255,.7)";x.fillText("LIETADLO ROKA",W/2,y);y+=70;row("✈️ "+(j.planes[0].call||j.planes[0].hex)+(j.planes[0].dest?" → "+j.planes[0].dest:""),nf(j.planes[0].n));y+=30}
      x.textAlign="center";x.font="700 36px Inter, sans-serif";x.fillStyle="rgba(255,255,255,.7)";x.fillText("MÔJ ROK",W/2,y);y+=70;
      row("🃏 "+Object.values(COL.types).filter(v=>v.n).length+" "+pl(Object.values(COL.types).filter(v=>v.n).length,"kartička","kartičky","kartičiek"),nf(COL.n)+" 👋");
      x.textAlign="center";x.fillStyle="#6dffc7";x.font="900 52px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,1560);x.fillStyle="#fff";x.font="500 32px Inter, sans-serif";x.fillText(APP_HOST,W/2,1608);
      const text=`🇸🇰 Slovensko ${j.y}: spolu sme lietadlám zamávali ${nf(j.waves)}×! ✈️ `+shareUrl("rok","")+TAGS;
      c.toBlob(b=>b&&shareBlob(b,"slovensko-"+j.y+".png",text),"image/png");return}
    const url=shareUrl("rok",""),text=YEAR?`🇸🇰 Slovensko ${YEAR.y}: spolu sme lietadlám zamávali ${nf(YEAR.waves)}×! Ja mám ${nf(COL.n)} ${pl(COL.n,"úlovok","úlovky","úlovkov")} ✈️`:"🇸🇰 Slovensko na oblohe – súhrn roka";
    try{if(navigator.share){await navigator.share({title:"Slovensko na oblohe",text,url});return}}catch(e){if(e.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho ďalej")}catch(e){}
  };
  yearInit();
}
