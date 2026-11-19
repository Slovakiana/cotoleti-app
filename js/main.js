"use strict";
/* ============ štart ============ */
applyTexts();syncToggles();showPos();renderCol();renderHeroStatic(null);renderDaily();checkDuelLink();installHint();
boot();
setInterval(()=>{if(!document.hidden&&S.raw.length)tick(false)},1000);
setInterval(()=>{if(!document.hidden)fetchPlanes()},10000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)fetchPlanes()});
try{speechSynthesis.getVoices()}catch(e){}
setInterval(()=>{if(!S.pos)return;loadWx();SPACE.init()},5000);
