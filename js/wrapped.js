"use strict";
/* Osobný týždeň používa bratislavské kalendárne dni a zaznamenané úlovky. */
let LOG=LS.get("ctl_log",[]);
const LOGK=new Set(LOG.map(e=>e.d+e.h));
const WEEK_DAY=86400000;
const weekLabel=new Intl.DateTimeFormat("sk-SK",{timeZone:"Europe/Bratislava",day:"numeric",month:"short"});
const weekDayKey=t=>SKD.format(new Date(t));
const weekHour=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Bratislava",hour:"numeric",hourCycle:"h23"});
const calendarKey=t=>new Date(t).toISOString().slice(0,10);
function weekBounds(now=Date.now(),previous=false){
  const today=Date.parse(weekDayKey(now));
  const monday=today-((new Date(today).getUTCDay()+6)%7)*WEEK_DAY-(previous?7*WEEK_DAY:0);
  return {from:calendarKey(monday),to:calendarKey(monday+7*WEEK_DAY),
    label:weekLabel.format(monday+12*3600000)+" – "+weekLabel.format(monday+6.5*WEEK_DAY)};
}
const weekContains=(period,time)=>{
  if(!Number.isFinite(Number(time))||!time)return false;
  const day=weekDayKey(Number(time));
  return day>=period.from&&day<period.to;
};
const observationTime=e=>e.t<1e11?e.t*1e3:e.t;
function weekLog(period=weekBounds()){return LOG.filter(e=>weekContains(period,observationTime(e)))}
function recordWeekObservations(list){
  if(S.view!=="now"||skyStale()||!S.loaded||S.failN||!navigator.onLine)return;
  const now=Date.now(),d=weekDayKey(now),h=+weekHour.format(now);
  let changed=false;
  for(const a of list){
    if(a.el==null||a.el<25||a.priv||a.santa||LOGK.has(d+a.hex))continue;
    LOGK.add(d+a.hex);changed=true;
    LOG.push({d,t:Math.floor(now/1000),h:a.hex,ty:a.type||"",r:rarity(a),w:WIDE.has(a.type)?1:0,
      cg:CARGO_RX.test(airlineOf(a))?1:0,n:h>=21||h<5?1:0});
  }
  if(changed){
    const since=now-21*WEEK_DAY;
    LOG=LOG.filter(e=>observationTime(e)>=since).slice(-3000);
    LOGK.clear();
    for(const e of LOG)LOGK.add(e.d+e.h);
    LS.set("ctl_log",LOG);
  }
}
HOOKS.list.push(recordWeekObservations);
function spotterType(L=weekLog()){
  const n=L.length,share=k=>L.filter(e=>e[k]).length/n;
  if(n<3)return {e:"🐣",n:"Začínajúci pozorovateľ"};
  if(share("n")>=.4)return {e:"🦉",n:"Nočný lovec"};
  if(L.filter(e=>["r","e","l"].includes(e.r)).length>=3)return {e:"💎",n:"Zberateľ vzácností"};
  if(share("w")>=.2)return {e:"🐋",n:"Lovec obrov"};
  if(share("cg")>=.15)return {e:"📦",n:"Kuriér oblohy"};
  if(new Set(L.map(e=>e.dc).filter(Boolean)).size>=8)return {e:"🌍",n:"Svetobežník z gauča"};
  if(n>=50)return {e:"🦅",n:"Strážca oblohy"};
  return {e:"☁️",n:"Snívač v oblakoch"};
}
function weekModel(previous){
  const period=weekBounds(Date.now(),previous),observed=weekLog(period);
  const history=Object.values(COL.cx||{}).filter(c=>c?.ty&&c.ty!=="?"&&COL.types[c.ty]?.n);
  const recordedTypes=new Set(history.map(c=>c.ty));
  // Niektoré staršie karty majú zachovaný iba prvý úlovok.
  for(const [type,v] of Object.entries(COL.types)){
    const t=v.fp?.t||v.first;
    if(type!=="?"&&v.n&&t&&!recordedTypes.has(type))history.push({...v.fp,ty:type,t});
  }
  const events=[],counts=new Map(),totals=new Map();
  for(const c of history)totals.set(c.ty,(totals.get(c.ty)||0)+1);
  const catches=history.sort((a,b)=>a.t-b.t).map(c=>{
    const v=COL.types[c.ty],n=(counts.get(c.ty)||0)+1;
    counts.set(c.ty,n);
    const form=FORMS.find(([key])=>hasCardForm(v,key)&&Math.abs(Number(v.forms?.[key]||(key==="n"&&v.night))-c.t)<=60000)?.[0];
    const shiny=!!v.shiny&&Math.abs(Number(v.shiny)-c.t)<=60000;
    const name=catGuess(c.ty).name;
    if(weekContains(period,c.t)&&totals.get(c.ty)===v.n&&cardStarMilestone(c.ty,{n})){
      events.push({label:"Nová hviezda · "+name,priority:3,t:c.t});
    }
    return {...c,name,form,shiny,n:Math.min(n,v.n),score:(shiny?8:0)+2*RORD[typeTier(c.ty)]+(form?1:0)};
  }).filter(c=>weekContains(period,c.t));
  catches.sort((a,b)=>b.score-a.score||b.t-a.t);
  for(const item of journalEntries("ct").filter(e=>weekContains(period,e.t)).slice(0,3))
    events.push({label:"Pečiatka · "+item.name,priority:2,t:item.t});
  for(const item of journalEntries("al").filter(e=>weekContains(period,e.t)).slice(0,3))
    events.push({label:"Aerolinka · "+item.name,priority:1,t:item.t});
  for(const relay of (SOC.data?.relay||[]).filter(e=>weekContains(period,e.t)).slice(0,3))
    events.push({label:"Letová štafeta · "+catGuess(relay.type).name,priority:4,t:relay.t});
  events.sort((a,b)=>b.priority-a.priority||b.t-a.t);
  const high=observed.filter(e=>e.ty).sort((a,b)=>(RORD[b.r]??0)-(RORD[a.r]??0))[0];
  return {period,observations:observed.length,observationType:high?.ty||"",catches,hero:catches[0]||null,moments:events.slice(0,2)};
}
const WR={i:0,model:null,slides:[],previous:true};
function weekCard(m){
  const h=m.hero,v=COL.types[h.ty];
  return {...v,n:h.n,coverForm:h.form||"-",shiny:h.shiny,ver:0};
}
function renderWeekEntry(){
  const period=weekBounds(Date.now(),true);
  const possible=LOG.some(e=>weekContains(period,observationTime(e)))||
    Object.values(COL.cx||{}).some(e=>weekContains(period,e?.t))||
    Object.values(COL.types).some(v=>v?.n&&weekContains(period,v.fp?.t||v.first));
  const unread=possible&&LS.get("ctl_wrSeen","")!==period.from;
  for(const id of ["weekNew","weekJournalNew"]){
    const label=$(id);
    label.hidden=!unread;
    label.textContent=unread?"Nový súhrn":"";
  }
}
function openWrapped(){
  const closed=weekModel(true),current=weekModel(false);
  WR.previous=!!(closed.hero||closed.observations||closed.moments.length)||!(current.hero||current.observations||current.moments.length);
  const modal=$("wrap");modal.returnFocus=document.activeElement;modal.classList.add("on");
  renderWeek(WR.previous?closed:current);haptic(12);
}
function renderWeek(m){
  WR.model=m;
  const h=m.hero,slides=[];
  $("weekPeriod").textContent=m.period.label;
  $("weekSwitch").textContent=WR.previous?"Tento týždeň":"Minulý týždeň";
  if(WR.previous){LS.set("ctl_wrSeen",m.period.from);renderWeekEntry()}
  if(h)slides.push(`<article class="weekSlide"><h3>Úlovok týždňa</h3><div class="weekHeroCard">${cardSVG(h.ty,weekCard(m),{mini:true})}</div><p>${esc(h.name)} · ${esc(weekLabel.format(h.t))}</p></article>`);
  if(m.moments.length)slides.push(`<article class="weekSlide"><h3>Čo pribudlo</h3><ul>${m.moments.map(e=>`<li>${esc(e.label)}</li>`).join("")}</ul></article>`);
  if(m.observations||!slides.length)slides.push(`<article class="weekSlide weekOverview"><h3>${m.observations?"Pozorovania":"Obloha čaká"}</h3>${m.observations?
    `<strong>${nf(m.observations)}</strong><p>Zaznamenané pozorovania počas otvoreného Lovu.</p>${m.observationType?`<p>Zaznamenaný typ · ${esc(catGuess(m.observationType).name)}</p>`:""}`:
    "<p>V tomto týždni ešte nemáš zaznamenaný úlovok ani pozorovanie.</p>"}</article>`);
  WR.slides=slides;$("wslides").innerHTML=slides.join("");
  $("wshare").hidden=!h&&!m.moments.length;
  wrShow(0);
}
function wrShow(i){
  WR.i=Math.max(0,Math.min(WR.slides.length-1,i));
  [...$("wslides").children].forEach((el,k)=>{el.hidden=k!==WR.i});
  $("weekPage").textContent=(WR.i+1)+" / "+WR.slides.length;
  $("wprev").disabled=WR.i===0;
  $("wnext").disabled=WR.i===WR.slides.length-1;
  $("weekNav").hidden=WR.slides.length<=1;
}
$("b-wrapped").onclick=$("b-wrapped-journal").onclick=openWrapped;
$("weekSwitch").onclick=()=>{WR.previous=!WR.previous;renderWeek(weekModel(WR.previous))};
$("wnext").onclick=()=>wrShow(WR.i+1);
$("wprev").onclick=()=>wrShow(WR.i-1);
$("wclose").onclick=()=>closeModal($("wrap"));
$("wrap").addEventListener("keydown",e=>{
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();wrShow(WR.i+(e.key==="ArrowRight"?1:-1))}
});
HOOKS.view.push(v=>{if(v==="col"||v==="journal")renderWeekEntry()});
$("wshare").onclick=async()=>{
  const m=WR.model,button=$("wshare");if(!m||button.disabled)return;
  button.disabled=true;
  try{
    const c=document.createElement("canvas");c.width=1080;c.height=1920;
    const x=c.getContext("2d"),g=x.createLinearGradient(0,0,1080,1920);
    g.addColorStop(0,"#0b1729");g.addColorStop(.65,"#163245");g.addColorStop(1,"#211930");
    x.fillStyle=g;x.fillRect(0,0,1080,1920);
    x.textAlign="center";x.fillStyle="#aeeadf";x.font="700 40px Inter,sans-serif";
    x.fillText("ČO TO LETÍ? · "+m.period.label,540,285);
    x.fillStyle="#fff";x.font="800 68px Inter,sans-serif";x.fillText("Môj týždeň na oblohe",540,380,900);
    if(m.hero){
      const svg=await cardExportSVG(m.hero.ty,weekCard(m),{mini:true,public:true});
      const img=new Image();img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);await img.decode();
      x.drawImage(img,210,460,660,924);
    }else{
      x.font="800 146px Inter,sans-serif";x.fillText(nf(m.observations),540,800);
      x.font="650 46px Inter,sans-serif";x.fillText("Zaznamenané pozorovania",540,889,900);
    }
    x.fillStyle="#e9f7f6";x.font="650 42px Inter,sans-serif";
    m.moments.forEach((e,i)=>x.fillText(e.label,540,(m.hero?1465:1050)+i*62,870));
    const blob=await new Promise(resolve=>c.toBlob(resolve,"image/png"));
    if(!blob)throw Error("export");
    if(!$("wrap").classList.contains("on")||WR.model!==m)return;
    await shareBlob(blob,"moj-tyzden.png","Môj týždeň na oblohe "+m.period.label+" ✈️ "+appLink());
  }catch(e){if($("wrap").classList.contains("on")&&WR.model===m)toast("Obrázok sa nepodarilo vytvoriť","Skús zdieľanie otvoriť znova")}
  finally{button.disabled=false}
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

// PM-04: v nedeľu večer pripomenúť zdieľanie týždňa (raz za týždeň, len keď je čo ukázať)
function weekStoryNudge(){
  try{
    const now=new Date(),key=weekBounds(Date.now(),false).from;
    if(now.getDay()!==0||now.getHours()<17||LS.get("ctl_weekNudge","")===key)return;
    const m=weekModel(false);if((m.catches||[]).length<3)return;
    LS.set("ctl_weekNudge",key);
    toast("📸 Tvoj týždeň na oblohe je hotový",m.catches.length+" "+pl(m.catches.length,"lietadlo","lietadlá","lietadiel")+" – ťukni na „Môj týždeň na oblohe“ a pošli ho rodine");
  }catch(e){}
}
setTimeout(weekStoryNudge,8000);
