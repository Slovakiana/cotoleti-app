"use strict";
/* ============ štart ============ */
// ⚡ posledná známa obloha (max. 3 min) – kým prídu čerstvé dáta, radar nie je prázdny
{const lk=LS.get("ctl_lastSky",null),p0=LS.get("ctl_pos",null);if(lk&&lk.raw&&lk.raw.length&&Date.now()-lk.t<180e3&&p0&&lk.p&&Math.abs(lk.p[0]-p0.lat)<.2&&Math.abs(lk.p[1]-p0.lon)<.3){S.raw=lk.raw;S.rawT=lk.t;S.lastKnown=true}}
// zbierka sa vykreslí, až keď je chvíľa (pri veľkej zbierke to inak brzdí štart)
const idle=f=>(window.requestIdleCallback?requestIdleCallback(f,{timeout:2500}):setTimeout(f,300));
applyTexts();syncToggles();showPos();if(S.view==="col")renderCol();else idle(()=>renderCol());renderHeroStatic(null);renderDaily();checkDuelLink();installHint();
setTimeout(checkAch,4000);
boot();if(S.lastKnown)setTimeout(()=>{if(S.lastKnown)setStatus("🕒 Posledná známa obloha",false)},50);
setInterval(()=>{if(!document.hidden&&S.raw.length)tick(false)},1000);
setInterval(()=>{if(!document.hidden)fetchPlanes()},15000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)fetchPlanes()});
try{speechSynthesis.getVoices()}catch(e){}
// Pri skrytej appke neprepočítavaj počasie ani satelity; po návrate sa cyklus obnoví.
setInterval(()=>{if(document.hidden||!S.pos)return;loadWx();if(Date.now()>(S.spNext||0)){S.spNext=Date.now()+60000;SPACE.init()}},5000);
