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
const TRK={ac:null,t:0,busy:null,next:0,failures:0};
const TRACK_LIVE_AGE=60e3;
const TR_NOTICE={track:null,pending:false,text:""};
async function trFetch(cs){
  try{
    const {ok,j}=await getJSON(DEFAULT_PROXY+"/api/radar-flight?cs="+encodeURIComponent(cs),9000);
    if(ok&&Array.isArray(j?.ac))return j.ac.find(a=>a.lat!=null)||null;
  }catch(e){}
  return undefined;
}
async function trPoll(){
  const track=TR;
  if(!track||TRK.busy===track||Date.now()<TRK.next||!navigator.onLine)return;
  TRK.busy=track;
  const ac=await trFetch(track.cs);
  if(TRK.busy===track)TRK.busy=null;
  if(TR!==track)return;
  if(ac===undefined){
    TRK.next=Date.now()+Math.min(120e3,10000*2**Math.min(4,TRK.failures++));
    trRender();return;
  }
  TRK.failures=0;TRK.next=Date.now()+45000;
  if(ac&&ac.alt_baro!=="ground"){
    TRK.ac=normReadsb({ac:[ac]})[0];TRK.t=Date.now();
    if(!track.seen)track.seen=Date.now();
    track.hex=TRK.ac.hex;track.lastSeen=Date.now();track.landed=false;LS.set("ctl_track",track);
  }else{
    TRK.ac=null;
    if(track.seen&&!track.landed&&(ac&&ac.alt_baro==="ground"||Date.now()-(track.lastSeen||0)>20*60e3)){
      track.landed=Date.now();LS.set("ctl_track",track);trLanded();
    }
  }
  trRender();
}
function trGeom(){
  const a=TRK.ac;if(!a||!S.pos)return null;
  const age=Date.now()-TRK.t,stale=age>TRACK_LIVE_AGE;
  const dt=stale?0:Math.max(0,Math.min(20,age/1000));let lat=a.lat,lon=a.lon;
  if(a.spd!=null&&a.trk!=null){const m=a.spd/3.6*dt;lat+=m*Math.cos(rad(a.trk))/111320;lon+=m*Math.sin(rad(a.trk))/(111320*Math.cos(rad(lat)))}
  const {d,b}=distBear(S.pos.lat,S.pos.lon,lat,lon);
  const g={...a,lat,lon,dist:d,bear:b,el:a.alt!=null?elev(d,a.alt,S.pos.alt):null};
  return {g,age,stale,ap:stale?null:approach(g)};
}
function trName(){return TR.label||TR.disp||TR.cs}
function trRender(){
  const card=$("trackCard");
  if(!TR){card.classList.remove("on");return}
  card.classList.add("on");
  $("trKick").textContent=TR.me?"🧳 Môj let":"👀 Sleduješ let";
  $("trTitle").textContent=(TR.me?"Ja · ":TR.label?TR.label+" · ":"")+(TR.disp||TR.cs);
  const w=TR.hex&&typeof planeWaves==="function"?planeWaves(TR.hex).total:0;
  $("trWaves").textContent=w?`👋 ${TR.me?"Tebe":"Tomuto lietadlu"} dnes ${zam(w)} ${nf(w)} ${ludia(w)} zo Slovenska`:(TR.me?"Pošli odkaz kamarátom, nech ti zamávajú, keď budeš nad nimi 👋":"");
  const notify=$("trNotify"),hideNotify=TR.me||(PUSH.on&&TR.notifyConfirmed);
  if(hideNotify&&document.activeElement===notify)$("trShare").focus({preventScroll:true});
  notify.hidden=!!hideNotify;
  notify.setAttribute("aria-disabled",String(TR_NOTICE.track===TR&&TR_NOTICE.pending));
  const notice=TR_NOTICE.track===TR?TR_NOTICE.text:"";
  $("trStatus").textContent=notice;
  $("trStatus").hidden=!notice;
  $("trShare").textContent=TR.me?"📤 Zamávajte mi!":"📤 Pošli odkaz";
  if(TR.landed){
    $("trLine").textContent="🛬 Lietadlo pristálo.";
    $("trEta").textContent=w?`Počas letu ${TR.me?"ti":"mu"} ${zam(w)} ${nf(w)} ${ludia(w)} 🥹`:"";return;
  }
  const G=trGeom();
  if(!G){$("trLine").textContent=TR.seen?"Lietadlo práve nevysiela polohu. Skúšam znova…":"Lietadlo ešte nevzlietlo alebo nevysiela polohu. Skúšam každú minútu.";$("trEta").textContent="";return}
  const {g,ap,age,stale}=G,km=g.dist/1000;
  if(stale){
    $("trLine").textContent=`Posledná známa poloha · pred ${Math.floor(age/60000)} min · ${nf(km)} km od teba`;
    $("trEta").textContent="";
    return;
  }
  $("trLine").textContent=`${nf(km)} km od teba · ${g.alt!=null?nf(g.alt/1000,1)+" km výška":""}${g.spd?" · "+nf(g.spd)+" km/h":""}`;
  let eta="";
  if(km<30&&g.el>5)eta="🎉 Je nad tebou! Pozri na "+dirL(g.bear)+" a zamávaj 👋";
  else if(ap&&ap.t>0&&ap.t<4*3600){const mins=Math.round(ap.t/60),dk=ap.d/1000;eta=dk<35?`⏱ Nad tebou o ~${mins>=60?Math.floor(mins/60)+" h "+(mins%60)+" min":mins+" min"}`:`Nepreletí priamo nad tebou – najbližšie ${nf(dk)} km o ~${mins} min`}
  else if(ap&&ap.t<=0)eta="Už sa od teba vzďaľuje";
  $("trEta").textContent=eta;
  // je v dosahu appky → zvýrazni na oblohe
  if(!TR.me&&TR.hex&&!TR.alerted&&!skyStale()&&S.list.find(a=>a.hex===TR.hex&&a.el>3)){
    TR.alerted=1;LS.set("ctl_track",TR);S.pick=TR.hex;tick(true);
    toast(`✈️ ${trName()} je nad tebou!`,"Zamávaj 👋 – ťukni na Mávni","#6dffc7");haptic([200,100,200,100,400]);confetti(70);
  }
}
function trLanded(){
  const w=TR.hex&&typeof planeWaves==="function"?planeWaves(TR.hex).total:0;
  toast(`🛬 ${TR.me?"Si na zemi":trName()+" je na zemi"}!`,w?`Počas letu ${zam(w)} ${nf(w)} ${ludia(w)} 👋`:"Šťastný návrat","#6dffc7");
}
function trUnregister(cs){
  return apiPost("/api/track",{cs,off:1}).catch(()=>{});
}
async function trServer(track=TR,requestPermission=false){
  if(!SOC.api||!track||track.me||KID()||TR_NOTICE.track===track&&TR_NOTICE.pending)return;
  Object.assign(TR_NOTICE,{track,pending:true,text:"Nastavujem upozornenie…"});
  trRender();
  try{
    if(requestPermission&&!await enablePush()){
      if(TR===track)TR_NOTICE.text="Upozornenie ešte nie je zapnuté. Skontroluj povolenia prehliadača.";
      return;
    }
    if(TR!==track)return;
    if(!S.pos)throw Error("position");
    const response=await apiPost("/api/track",{cs:track.cs,label:track.label||"",...posR()});
    const result=await response.json();
    if(!response.ok||result.ok!==true)throw Error("registration");
    if(TR!==track){
      if(TR?.cs!==track.cs)await trUnregister(track.cs);
      return;
    }
    track.notifyConfirmed=true;delete track.srv;LS.set("ctl_track",track);
    TR_NOTICE.text="Upozornenie je zapnuté. Dáme ti vedieť, keď bude let blízko.";
  }catch(error){
    if(TR!==track&&TR?.cs!==track.cs){await trUnregister(track.cs)}
    else if(TR===track){
      delete track.notifyConfirmed;LS.set("ctl_track",track);
      TR_NOTICE.text=error.message==="position"?
        "Na upozornenie treba polohu. Vyber miesto a skús znova.":
        "Upozornenie sa nepodarilo nastaviť. Skús znova.";
    }
  }finally{
    if(TR_NOTICE.track===track)TR_NOTICE.pending=false;
    if(TR===track)trRender();
  }
}
function trStart(cs,disp,label,me){
  TR={cs,disp,label:label||"",me:!!me,t:Date.now()};LS.set("ctl_track",TR);TRK.ac=null;TRK.t=0;TRK.next=0;TRK.failures=0;
  $("trackM").classList.remove("on");trRender();trPoll();
  if(!me&&PUSH.on)trServer(TR);
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
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho kamarátom")}catch(e){prompt("Skopíruj odkaz:",url)}
}
$("b-track").onclick=()=>{haptic(8);if(TR&&!TR.landed){$("trackCard").scrollIntoView({behavior:"smooth",block:"center"});return}trOpen()};
$("trFriend").onclick=()=>trSubmit(false);$("trMe").onclick=()=>trSubmit(true);$("trCancel").onclick=()=>$("trackM").classList.remove("on");
$("trShare").onclick=trShareLink;
$("trNotify").onclick=()=>trServer(TR,!PUSH.on);
$("trClose").onclick=()=>{
  const track=TR;TR=null;TRK.ac=null;
  LS.set("ctl_track",null);trRender();
  if((track?.notifyConfirmed||track?.srv)&&SOC.api)trUnregister(track.cs);
};
// odkaz #let=…
function trFromHash(){
  const m=location.hash.match(/let=([A-Za-z0-9]+)/);if(!m)return;
  let n=(location.hash.match(/[&#]n=([^&]+)/)||[])[1];
  if(typeof KID==="function"&&KID())n="";
  try{n=n?encodeURIComponent((typeof safeNick==="function"?safeNick:(x=>x))(decodeURIComponent(n)).replace(/[<>\u0000-\u001f\u200b-\u200f\u202a-\u202e]/g,"").trim().slice(0,20)):""}catch(e){n=""}
  const cs=toCallsign(m[1])||m[1].toUpperCase();
  trStart(cs,cs,n?decodeURIComponent(n):"",false);
  toast("👀 Sleduješ let "+(n?decodeURIComponent(n):cs),"Ťukni na „Upozorni ma“ a dám ti vedieť, keď bude nad tebou");
  try{history.replaceState(null,"",location.pathname)}catch(e){}
}
setInterval(()=>{if(TR&&!document.hidden){trRender();trPoll()}},5000);
document.addEventListener("visibilitychange",()=>{if(TR&&!document.hidden){trRender();trPoll()}});
addEventListener("online",()=>{if(TR&&!document.hidden){TRK.next=0;trPoll()}});
setTimeout(()=>{trFromHash();if(TR)trPoll()},1200);
addEventListener("hashchange",trFromHash);
