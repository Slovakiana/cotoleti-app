"use strict";
/* ============ štart ============ */
// ⚡ posledná známa obloha (max. 3 min) – kým prídu čerstvé dáta, radar nie je prázdny
{const lk=LS.get("ctl_lastSky",null),p0=LS.get("ctl_pos",null);if(lk&&Array.isArray(lk.raw)&&Date.now()-lk.t>=0&&Date.now()-lk.t<RADAR_PREVIEW_AGE&&p0&&lk.p&&radarPositionKey({lat:lk.p[0],lon:lk.p[1]})===radarPositionKey(p0)){S.raw=lk.raw;S.rawT=lk.t;S.skyPosition=radarPositionKey({lat:lk.p[0],lon:lk.p[1]});S.lastKnown=true}}
// zbierka sa vykreslí, až keď je chvíľa (pri veľkej zbierke to inak brzdí štart)
applyTexts();syncToggles();showPos();if(S.view==="col")renderCol();renderHeroStatic(null);renderDaily();checkDuelLink();installHint();
setTimeout(checkAch,4000);
window.__ctlBooted=1;boot();if(S.lastKnown)setTimeout(()=>{if(S.lastKnown)setStatus(staleSkyLabel(),false)},50);
setInterval(()=>{if(!document.hidden&&S.raw.length)tick(false)},1000);
setInterval(()=>{if(!document.hidden)fetchPlanes()},15000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden){fetchPlanes();renderDaily()}});
window.addEventListener?.("online",()=>{if(!document.hidden)fetchPlanes()});
try{speechSynthesis.getVoices()}catch(e){}
// Pri skrytej appke neprepočítavaj počasie ani satelity; po návrate sa cyklus obnoví.
setInterval(()=>{if(document.hidden||S.view!=="now"||!S.pos)return;loadWx();if(Date.now()>(S.spNext||0)){S.spNext=Date.now()+60000;SPACE.init()}},5000);
