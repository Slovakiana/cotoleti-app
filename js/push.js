"use strict";
/* ============ 🔔 Upozornenia + spoločný moment ============ */
const PUSH={on:LS.get("ctl_push",false),moment:LS.get("ctl_moment",true),joined:LS.get("ctl_momJoined","")};
const pushSupported=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent);
const isStandalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const u8=s=>{s=s.replace(/-/g,"+").replace(/_/g,"/");s+="===".slice((s.length+3)%4);return Uint8Array.from(atob(s),c=>c.charCodeAt(0))};
async function swTell(){try{const r=await navigator.serviceWorker.ready;await ensureTok();(r.active||navigator.serviceWorker.controller)?.postMessage({cid:SOC.cid,api:SOC.api,tok:TOK})}catch(e){}}
async function enablePush(silent){
  if(!SOC.api)return false;
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
    await apiPost("/api/sub",{sub:{endpoint:sub.toJSON().endpoint},...posR(),moment:PUSH.moment});
    PUSH.on=true;LS.set("ctl_push",true);LS.set("ctl_pushT",Date.now());swTell();syncPushUI();
    return true;
  }catch(e){if(!silent)toast("Upozornenia sa nepodarilo zapnúť",String(e.message||e).slice(0,80));return false}
}
function syncPushUI(){
  $("t-moment").classList.toggle("on",PUSH.on&&PUSH.moment);
  $("momStat").textContent=PUSH.on&&PUSH.moment?"Zapnuté ✓ – dáme ti vedieť":"Upozornenie, keď sa celé Slovensko pozrie hore";
}
$("t-moment").onclick=async()=>{
  if(!(PUSH.on&&PUSH.moment)){PUSH.moment=true;LS.set("ctl_moment",true);if(await enablePush())toast("🔔 Spoločný moment zapnutý","Raz denne ti dáme vedieť, kedy sa pozrieť hore")}
  else{PUSH.moment=false;LS.set("ctl_moment",false);try{await apiPost("/api/subset",{id:SOC.cid,moment:false})}catch(e){}}
  syncPushUI();
};
// ponuka (priming) – až pri 2. návšteve a len raz
function maybeAskPush(){
  if(!SOC.api||PUSH.on||LS.get("ctl_pushAsked",false)||(LS.get("ctl_visits",0)|0)<2)return;
  if(isIOS()&&!isStandalone())$("pushAskTxt").textContent="Raz denne ti v náhodnej chvíli dáme vedieť. Na iPhone treba appku najprv pridať na plochu (Zdieľať ⬆️ → Pridať na plochu).";
  $("pushAsk").classList.add("on");
}
$("pushYes").onclick=async()=>{LS.set("ctl_pushAsked",true);$("pushAsk").classList.remove("on");PUSH.moment=true;LS.set("ctl_moment",true);if(await enablePush())toast("🔔 Hotovo!","Dáme ti vedieť, keď sa celé Slovensko pozrie hore")};
$("pushNo").onclick=()=>{LS.set("ctl_pushAsked",true);$("pushAsk").classList.remove("on")};

// spoločný moment v appke
let momTimer=null;
function momentUI(mo){
  const bar=$("momentBar");
  if(mo&&mo.live){
    const left=Math.max(0,Math.round((mo.end-(Date.now()+(SOC.skew||0)))/1000));
    bar.classList.add("on");document.body.classList.add("moment");
    bar.textContent=`🔴 SPOLOČNÝ MOMENT · ${Math.floor(left/60)}:${String(left%60).padStart(2,"0")} · ${nf(mo.n||0)} 👀`;
    const d=dayKey();
    if(PUSH.joined!==d){PUSH.joined=d;LS.set("ctl_momJoined",d);
      apiPost("/api/moment",{id:SOC.cid}).then(r=>r.json()).then(j=>{SOC.data.moment.n=j.n;toast("👀 Si pri tom!","Spolu s tebou sa práve pozerá hore "+nf(j.n)+" "+ludia(j.n));confetti(60);haptic([30,60,30]);grantAch("moment")}).catch(()=>{});
    }
    if(!momTimer)momTimer=setInterval(()=>momentUI(SOC.data&&SOC.data.moment),1000);
    if(left<=0){bar.classList.remove("on");document.body.classList.remove("moment");clearInterval(momTimer);momTimer=null;setTimeout(socPoll,1500)}
  }else{bar.classList.remove("on");document.body.classList.remove("moment");if(momTimer){clearInterval(momTimer);momTimer=null}}
}
$("momentBar").onclick=()=>{haptic(10);openAR()};
ACH.push({id:"moment",i:"👀",n:"Spoločný moment",c:()=>false});
HOOKS.social=HOOKS.social||[];HOOKS.social.push(D=>{if(D.now)SOC.skew=D.now-Date.now();momentUI(D.moment)});
// pri spustení: obnov prihlásenie raz denne a pošli SW identitu
setTimeout(()=>{syncPushUI();maybeAskPush();if(PUSH.on&&pushSupported()&&Notification.permission==="granted"){swTell();if(Date.now()-LS.get("ctl_pushT",0)>86400e3)enablePush(true)}},3000);
