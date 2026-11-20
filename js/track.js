"use strict";
/* ============ ✈️ Sleduj let (blízky alebo môj) ============ */
const IATA={FR:"RYR",RK:"RUK",W6:"WZZ",W4:"WMT",W9:"WUK",OS:"AUA",LH:"DLH",EW:"EWG",DE:"CFG",U2:"EZY",EC:"EJU",DS:"EZS",BA:"BAW",AF:"AFR",KL:"KLM",HV:"TRA",TO:"TVF",TK:"THY",PC:"PGT",XQ:"SXS",
  EK:"UAE",QR:"QTR",EY:"ETD",FZ:"FDB",LO:"LOT",OK:"CSA",QS:"TVS",LX:"SWR",AZ:"ITY",IB:"IBE",VY:"VLG",SK:"SAS",AY:"FIN",A3:"AEE",RO:"ROT",BT:"BTI",JU:"ASL",OU:"CTN",SN:"BEL",TP:"TAP",EI:"EIN",
  DY:"NOZ",D8:"NSZ",X3:"TUI",BY:"TOM",LS:"EXS",MS:"MSR",LY:"ELY",SV:"SVA",ET:"ETH",AI:"AIC",SQ:"SIA",CX:"CPA",CA:"CCA",KE:"KAL",AA:"AAL",UA:"UAL",DL:"DAL",AC:"ACA",FB:"LZB",H2:"SKU",ZB:"MON",E4:"ENT",SM:"MSC",QR2:"QTR"};
function toCallsign(inp){
  const s=String(inp||"").toUpperCase().replace(/[\s-]/g,"");
  let m=s.match(/^([A-Z]{3})(\d{1,4}[A-Z]?)$/);if(m)return m[1]+m[2].replace(/^0+(?=\d)/,"");
  m=s.match(/^([A-Z0-9]{2})(\d{1,4}[A-Z]?)$/);if(m&&IATA[m[1]])return IATA[m[1]]+m[2].replace(/^0+(?=\d)/,"");
  return null;
}
let TR=LS.get("ctl_track",null);
const TRK={ac:null,t:0,busy:false,lostT:0};
async function trFetch(cs){
  const srcs=[`https://api.adsb.lol/v2/callsign/${cs}`,`https://api.airplanes.live/v2/callsign/${cs}`];
  for(const u of srcs)for(const rt of ROUTES.slice(0,3)){
    try{const {ok,j}=await getJSON(rt.wrap(u),8000);if(ok&&j){const arr=(j.ac||j.aircraft||[]).filter(a=>a.lat!=null);return arr[0]||null}}catch(e){}
  }
  return undefined; // nevieme (výpadok)
}
async function trPoll(){
  if(!TR||TRK.busy)return;TRK.busy=true;
  const ac=await trFetch(TR.cs);TRK.busy=false;
  if(ac===undefined){trRender();return}
  if(ac&&ac.alt_baro!=="ground"){
    TRK.ac=normReadsb({ac:[ac]})[0];TRK.t=Date.now();
    if(!TR.seen){TR.seen=Date.now();}
    TR.hex=TRK.ac.hex;TR.lastSeen=Date.now();TR.landed=false;LS.set("ctl_track",TR);
  }else{
    TRK.ac=null;
    if(TR.seen&&!TR.landed&&(ac&&ac.alt_baro==="ground"||Date.now()-(TR.lastSeen||0)>20*60e3)){TR.landed=Date.now();LS.set("ctl_track",TR);trLanded()}
  }
  trRender();
}
function trGeom(){
  const a=TRK.ac;if(!a||!S.pos)return null;
  const dt=(Date.now()-TRK.t)/1000;let lat=a.lat,lon=a.lon;
  if(a.spd!=null&&a.trk!=null){const m=a.spd/3.6*dt;lat+=m*Math.cos(rad(a.trk))/111320;lon+=m*Math.sin(rad(a.trk))/(111320*Math.cos(rad(lat)))}
  const {d,b}=distBear(S.pos.lat,S.pos.lon,lat,lon);
  const g={...a,lat,lon,dist:d,bear:b,el:a.alt!=null?elev(d,a.alt,S.pos.alt):null};
  return {g,ap:approach(g)};
}
function trName(){return TR.label||TR.disp||TR.cs}
function trRender(){
  const card=$("trackCard");
  if(!TR){card.classList.remove("on");return}
  card.classList.add("on");
  $("trKick").textContent=TR.me?"🧳 Môj let":"👀 Sleduješ let";
  $("trTitle").textContent=(TR.me?"Ja · ":TR.label?TR.label+" · ":"")+(TR.disp||TR.cs);
  const w=TR.hex&&typeof planeWaves==="function"?planeWaves(TR.hex).total:0;
  $("trWaves").textContent=w?`👋 ${TR.me?"Tebe":"Tomuto lietadlu"} dnes zamávalo ${nf(w)} ${ludia(w)} zo Slovenska`:(TR.me?"Pošli odkaz kamošom, nech ti zamávajú, keď budeš nad nimi 👋":"");
  $("trNotify").style.display=TR.me||(PUSH.on&&TR.srv)?"none":"";
  $("trShare").textContent=TR.me?"📤 Zamávajte mi!":"📤 Pošli odkaz";
  if(TR.landed){
    $("trLine").textContent="🛬 Lietadlo pristálo.";
    $("trEta").textContent=w?`Počas letu ${TR.me?"ti":"mu"} zamávalo ${nf(w)} ${ludia(w)} 🥹`:"";return;
  }
  const G=trGeom();
  if(!G){$("trLine").textContent=TR.seen?"Lietadlo práve nevysiela polohu. Skúšam znova…":"Lietadlo ešte nevzlietlo alebo nevysiela polohu. Skúšam každú minútu.";$("trEta").textContent="";return}
  const {g,ap}=G,km=g.dist/1000;
  $("trLine").textContent=`${nf(km)} km od teba · ${g.alt!=null?nf(g.alt/1000,1)+" km výška":""}${g.spd?" · "+nf(g.spd)+" km/h":""}`;
  let eta="";
  if(km<30&&g.el>5)eta="🎉 Je nad tebou! Pozri na "+dirL(g.bear)+" a zamávaj 👋";
  else if(ap&&ap.t>0&&ap.t<4*3600){const mins=Math.round(ap.t/60),dk=ap.d/1000;eta=dk<35?`⏱ Nad tebou o ~${mins>=60?Math.floor(mins/60)+" h "+(mins%60)+" min":mins+" min"}`:`Nepreletí priamo nad tebou – najbližšie ${nf(dk)} km o ~${mins} min`}
  else if(ap&&ap.t<=0)eta="Už sa od teba vzďaľuje";
  $("trEta").textContent=eta;
  // je v dosahu appky → zvýrazni na oblohe
  if(!TR.me&&TR.hex&&!TR.alerted&&S.list.find(a=>a.hex===TR.hex&&a.el>3)){
    TR.alerted=1;LS.set("ctl_track",TR);S.pick=TR.hex;tick(true);
    toast(`✈️ ${trName()} je nad tebou!`,"Zamávaj 👋 – ťukni na Mávni","#6dffc7");haptic([200,100,200,100,400]);confetti(70);
  }
}
function trLanded(){
  const w=TR.hex&&typeof planeWaves==="function"?planeWaves(TR.hex).total:0;
  toast(`🛬 ${TR.me?"Pristál si":trName()+" pristál(a)"}!`,w?`Počas letu zamávalo ${nf(w)} ${ludia(w)} 👋`:"Šťastný návrat","#6dffc7");
}
async function trServer(){
  if(!SOC.api||!TR||TR.me)return;
  try{await apiPost("/api/track",{cs:TR.cs,label:TR.label||"",...posR()});TR.srv=1;LS.set("ctl_track",TR)}catch(e){}
}
function trStart(cs,disp,label,me){
  TR={cs,disp,label:label||"",me:!!me,t:Date.now()};LS.set("ctl_track",TR);TRK.ac=null;
  $("trackM").classList.remove("on");trRender();trPoll();
  if(!me&&PUSH.on)trServer();
  setView("now");setTimeout(()=>$("trackCard").scrollIntoView({behavior:"smooth",block:"center"}),300);
}
function trOpen(){$("trErr").textContent="";$("trackM").classList.add("on");setTimeout(()=>$("trInput").focus(),200)}
function trSubmit(me){
  const raw=$("trInput").value,cs=toCallsign(raw);
  if(!cs){$("trErr").textContent="Zadaj číslo letu, napr. FR1234 (Ryanair), W6 2201 (Wizz Air) alebo OS 812.";return}
  trStart(cs,raw.toUpperCase().replace(/\s+/g," ").trim(),$("trLabel").value.trim(),me);
  if(me)setTimeout(trShareLink,600);
}
async function trShareLink(){
  if(!TR)return;
  const nn=TR.me&&LS.get("ctl_nick","")?LS.get("ctl_nick",""):TR.label||"";
  const url=shareUrl("l",encodeURIComponent(TR.cs),nn?"n="+encodeURIComponent(nn):"");
  const text=TR.me?`✈️ Letím ${TR.disp||TR.cs}! Keď budem letieť nad tebou, zamávaj mi 👋 Appka ti dá vedieť:`:`✈️ Sleduj let ${TR.disp||TR.cs}${TR.label?" ("+TR.label+")":""} a zamávaj, keď bude nad tebou 👋`;
  try{if(navigator.share){await navigator.share({title:"Čo to letí?",text,url});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho kamošom")}catch(e){prompt("Skopíruj odkaz:",url)}
}
$("b-track").onclick=()=>{haptic(8);if(TR&&!TR.landed){$("trackCard").scrollIntoView({behavior:"smooth",block:"center"});return}trOpen()};
$("trFriend").onclick=()=>trSubmit(false);$("trMe").onclick=()=>trSubmit(true);$("trCancel").onclick=()=>$("trackM").classList.remove("on");
$("trShare").onclick=trShareLink;
$("trNotify").onclick=async()=>{if(await enablePush()){await trServer();toast("🔔 Dáme ti vedieť","Keď bude "+trName()+" blízko, príde upozornenie");trRender()}};
$("trClose").onclick=()=>{if(TR&&SOC.api&&TR.srv)apiPost("/api/track",{id:SOC.cid,cs:TR.cs,off:1}).catch(()=>{});TR=null;LS.set("ctl_track",null);trRender()};
// odkaz #let=…
function trFromHash(){
  const m=location.hash.match(/let=([A-Za-z0-9]+)/);if(!m)return;
  let n=(location.hash.match(/[&#]n=([^&]+)/)||[])[1];
  try{n=n?encodeURIComponent(decodeURIComponent(n).replace(/[<>\u0000-\u001f\u200b-\u200f\u202a-\u202e]/g,"").trim().slice(0,20)):""}catch(e){n=""}
  const cs=toCallsign(m[1])||m[1].toUpperCase();
  trStart(cs,cs,n?decodeURIComponent(n):"",false);
  toast("👀 Sleduješ let "+(n?decodeURIComponent(n):cs),"Ťukni na „Upozorni ma“ a dáme ti vedieť, keď bude nad tebou");
  try{history.replaceState(null,"",location.pathname)}catch(e){}
}
setInterval(()=>{if(TR&&!document.hidden){if(Date.now()-TRK.t>45000)trPoll();else trRender()}},5000);
setTimeout(()=>{trFromHash();if(TR)trPoll()},1200);
addEventListener("hashchange",trFromHash);
