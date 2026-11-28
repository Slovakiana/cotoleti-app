"use strict";
/* ============ 🔔 Upozornenia + spoločný moment ============ */
const PUSH={on:LS.get("ctl_push",false),moment:LS.get("ctl_moment",true),joined:LS.get("ctl_momJoined","")};
const pushSupported=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1);
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const u8=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");s+="===".slice((s.length+3)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
async function swTell(){
  try{
    const reg=await navigator.serviceWorker.ready,tok=await ensureTok();
    if(tok&&PUSH.on&&!KID()&&storageCurrent())(reg.active||navigator.serviceWorker.controller)?.postMessage({cid:SOC.cid,tok});
  }catch(e){}
}
async function enablePush(silent,options={}){
  if(!SOC.api||KID())return false;
  if(!pushSupported()){
    if(!silent)toast(isIOS()&&!isStandalone()?"📲 Najprv si pridaj appku na plochu":"Upozornenia tu nefungujú",isIOS()&&!isStandalone()?"Ťukni Zdieľať ⬆️ → Pridať na plochu, potom ju otvor z plochy":"Skús iný prehliadač");
    return false;
  }
  try{
    const perm=Notification.permission==="granted"?"granted":await Notification.requestPermission();
    if(perm!=="granted"){if(!silent)toast("Upozornenia sú vypnuté","Povoľ ich v nastaveniach prehliadača");return false}
    const reg=await navigator.serviceWorker.ready;
    const {key}=await fetch(SOC.api+"/api/vapid").then(r=>r.json());
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(key)});
    const response=await apiPost("/api/sub",{sub:{endpoint:sub.toJSON().endpoint},...posR(),moment:options.moment??PUSH.moment,
      streak:options.streak??LS.get("ctl_streakp",true),leg:options.leg??LS.get("ctl_legp",true)});
    if(!response.ok||(await response.json()).ok!==true)throw Error("subscription");
    PUSH.on=true;LS.set("ctl_push",true);LS.set("ctl_pushT",Date.now());swTell();syncPushUI();
    return true;
  }catch(e){if(!silent)toast("Upozornenia sa nepodarilo zapnúť","Skontroluj, či máš appku pridanú na plochu, a skús znova.");return false}
}
$("b-push-off").onclick=async()=>{
  if(pushPrefBusy)return;
  pushPrefBusy=true;
  try{
    const response=await apiPost("/api/unsub",{});
    if(!response.ok||(await response.json()).ok!==true)throw Error("subscription");
  }catch(e){pushPrefBusy=false;toast("Upozornenia sa nepodarilo vypnúť","Skús znova, keď budeš online.");return}
  PUSH.on=false;LS.set("ctl_push",false);syncPushUI();
  try{
    const registration=await navigator.serviceWorker?.getRegistration();
    const subscription=await registration?.pushManager?.getSubscription();
    await subscription?.unsubscribe();
    await caches.delete("ctl-id");
  }catch(e){}
  pushPrefBusy=false;$("pushSettingsStatus").textContent="Upozornenia sú vypnuté.";
  toast("Upozornenia vypnuté","Ďalšie upozornenia z hry už tento profil nedostane.");
};
const pushPrefs={moment:["t-moment","ctl_moment"],streak:["t-streakp","ctl_streakp"],leg:["t-leg","ctl_legp"]};
let pushPrefBusy=false;
function syncPushUI(){
  $("pushOffRow").style.display=PUSH.on&&!KID()?"":"none";
  $("pushOffRow").hidden=!PUSH.on||KID();
  for(const [name,[id,key]] of Object.entries(pushPrefs)){
    const on=PUSH.on&&(name==="moment"?PUSH.moment:LS.get(key,true));
    $(id).classList.toggle("on",on);
    $(id).setAttribute("aria-checked",String(on));
  }
  $("momStat").textContent=PUSH.on&&PUSH.moment?"Zapnuté ✓ – dám ti vedieť":"Upozornenie, keď sa celé Slovensko pozrie hore";
}
async function changePushPref(name){
  if(pushPrefBusy||KID())return;
  const [id,key]=pushPrefs[name],button=$(id),status=$("pushSettingsStatus");
  const enabled=button.getAttribute("aria-checked")!=="true";
  if(!PUSH.on&&isIOS()&&!isStandalone()){installGuide();return}
  pushPrefBusy=true;button.setAttribute("aria-disabled","true");
  status.textContent="Ukladám nastavenie upozornenia…";
  try{
    if(!PUSH.on){
      if(!await enablePush(false,{[name]:enabled}))throw Error("push");
    }else{
      const r=await apiPost(name==="moment"?"/api/subset":"/api/subopt",{[name]:enabled});
      if(r.status===409){
        if(!await enablePush(false,{[name]:enabled}))throw Error("push");
      }else if(!r.ok||(await r.json()).ok!==true)throw Error("push");
    }
    if(name==="moment")PUSH.moment=enabled;
    LS.set(key,enabled);
    status.textContent=enabled?"Upozornenie je zapnuté.":"Upozornenie je vypnuté.";
  }catch(e){status.textContent="Zmenu sa nepodarilo potvrdiť. Skús znova."}
  finally{pushPrefBusy=false;button.removeAttribute("aria-disabled");syncPushUI()}
}
for(const [name,[id]] of Object.entries(pushPrefs))$(id).onclick=()=>changePushPref(name);
syncPushUI();
// ponuka (priming) – až pri 2. návšteve a len raz
function maybeAskPush(){
  // ponúkni hneď, keď človek niečo zažil (úlovok/mávnutie), nie až pri 2. návšteve
  if(!SOC.api||KID()||PUSH.on||LS.get("ctl_pushAsked",false)||!COL.n||document.querySelector(".modal.on"))return;
  // pri sérii 2+ ponúkni upozornenia ako strážcu série (najsilnejší dôvod)
  const st=typeof streakLive==="function"?streakLive().n:0;
  if(st>=2)$("pushAskTxt").textContent=`🔥 ${st} ${pl(st,"deň","dni","dní")} v rade! Mám ti pripomenúť, keď ti séria bude chýbať? Raz denne aj spoločný moment.`+(isIOS()&&!isStandalone()?" Na iPhone najprv pridaj appku na plochu (Zdieľať ⬆️ → Pridať na plochu).":"");
  else if(isIOS()&&!isStandalone())$("pushAskTxt").textContent="Raz denne ti v náhodnej chvíli dáme vedieť. Na iPhone treba appku najprv pridať na plochu (Zdieľať ⬆️ → Pridať na plochu).";
  $("pushAsk").classList.add("on");
}
$("pushYes").onclick=async()=>{LS.set("ctl_pushAsked",true);LS.set("ctl_streakp",true);$("pushAsk").classList.remove("on");PUSH.moment=true;LS.set("ctl_moment",true);if(isIOS()&&!isStandalone()){installGuide();return}if(await enablePush()){ev("push_ok");}if(PUSH.on)toast("🔔 Hotovo!","Dáme ti vedieť, keď sa celé Slovensko pozrie hore")};
$("pushNo").onclick=()=>{LS.set("ctl_pushAsked",true);$("pushAsk").classList.remove("on")};

// spoločný moment v appke
let momTimer=null,momentJoinPending=false,momentRetryAt=0;
function stopMomentUI(){
  $("momentBar").classList.remove("on");
  const wasLive=document.body.classList.contains("moment");
  document.body.classList.remove("moment");
  if(momTimer){clearInterval(momTimer);momTimer=null}
  if(wasLive&&!$("ar").classList.contains("on"))wakeOff();
}
async function joinMoment(day){
  momentJoinPending=true;momentRetryAt=Date.now()+10000;
  try{
    const response=await apiPost("/api/moment",{},true),result=response.data;
    if(!response.ok||result?.ok!==true||result.joined!==true||day!==dayKey()||!storageCurrent())return;
    await withCollectionStorage(()=>{
      if(!storageCurrent()||day!==dayKey()||!adoptCurrentCollection())return;
      const rewarded=COL.momentRewardDay===day||LS.get("ctl_momPts","")===day;
      if(!rewarded){
        COL.pts+=5;COL.momentRewardDay=day;LS.set("ctl_col",COL);
        if(!lsFlush())return;
      }
      PUSH.joined=day;LS.set("ctl_momJoined",day);
      if(SOC.data?.moment&&result.n)SOC.data.moment.n=result.n;
      if(rewarded)return;
      grantAch("moment");if(typeof streakTouch==="function")streakTouch();
      toast("👀 Si pri tom!",result.n>1?"Pozorovateľov spolu: "+nf(result.n):"Celé Slovensko sa teraz pozerá hore");
      confetti(60);haptic([30,60,30]);
    });
  }catch(e){}
  finally{momentJoinPending=false}
}
function momentUI(mo){
  const left=mo?.live?Math.ceil((mo.end-(Date.now()+(SOC.skew||0)))/1000):0;
  if(left<=0){
    if(mo?.live&&momTimer)setTimeout(socPoll,1500);
    stopMomentUI();return;
  }
  const bar=$("momentBar"),day=dayKey();
  if(!document.body.classList.contains("moment"))wakeOn();
  bar.classList.add("on");document.body.classList.add("moment");
  const mini=LS.get("ctl_momMini","")===day;bar.classList.toggle("mini",mini);
  const time=`${Math.floor(left/60)}:${String(left%60).padStart(2,"0")}`;
  bar.textContent=mini?time:"Pozri hore · "+time;
  if(!document.hidden&&PUSH.joined!==day&&!momentJoinPending&&Date.now()>=momentRetryAt&&LS.get("ctl_onb",0)&&S.pos)joinMoment(day);
  if(!momTimer)momTimer=setInterval(()=>{if(!document.hidden)momentUI(SOC.data?.moment)},1000);
}
// ťuk na pás: najprv vysvetlenie, potom kamera alebo zmenšenie pásu (nezakrýva obsah)
$("momentBar").onclick=()=>{haptic(10);const mo=SOC.data&&SOC.data.moment;$("momN").textContent=mo&&mo.n>1?"Práve sa hore pozerá "+nf(mo.n)+" "+ludia(mo.n)+" zo Slovenska.":"Celé Slovensko sa teraz na chvíľu pozerá hore.";$("momM").classList.add("on")};
$("momCam").onclick=()=>{$("momM").classList.remove("on");openAR()};
$("momMini").onclick=()=>{$("momM").classList.remove("on");LS.set("ctl_momMini",dayKey());$("momentBar").classList.add("mini")};
$("momClose").onclick=()=>$("momM").classList.remove("on");
ACH.push({id:"moment",i:"👀",n:"Spoločný moment",h:"Buď v appke počas spoločného momentu (červený pás Pozri hore)",c:()=>false});
HOOKS.social=HOOKS.social||[];HOOKS.social.push(D=>{if(D.now)SOC.skew=D.now-Date.now();momentUI(D.moment)});
// pri spustení: obnov prihlásenie raz denne a pošli SW identitu
setTimeout(()=>{syncPushUI();maybeAskPush();if(PUSH.on&&pushSupported()&&Notification.permission==="granted"){swTell();if(Date.now()-LS.get("ctl_pushT",0)>86400e3)enablePush(true)}},3000);
HOOKS.caught.push(()=>{if(COL.n===1)setTimeout(maybeAskPush,5000)});

// Staršie upozornenia na prelet otvoria radar.
if(location.hash==="#vesmir")history.replaceState(null,"",location.pathname+location.search);

// 👆 odkaz z upozornenia na spoločný moment (aj keď príde neskoro)
function momentFromHash(){if(!/#moment/.test(location.hash))return;try{history.replaceState(null,"",location.pathname)}catch(e){}
  setTimeout(async()=>{try{await socPoll()}catch(e){}const mo=SOC.data&&SOC.data.moment;if(mo&&mo.live)return;
    if(mo&&mo.end){const ago=Math.max(1,Math.round((Date.now()-mo.end)/60e3));toast("👀 Moment skončil pred "+ago+" min",(mo.n?"Pozeralo sa "+nf(mo.n)+" "+ludia(mo.n)+". ":"")+"Ďalší bude zajtra – nech ťa nezmešká 🔔")}},1200)}
momentFromHash();addEventListener("hashchange",momentFromHash);
