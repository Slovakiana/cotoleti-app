"use strict";
/* ============ štart ============ */
applyTexts();syncToggles();showPos();renderCol();renderHeroStatic(null);renderDaily();checkDuelLink();installHint();
boot();
setInterval(()=>{if(!document.hidden&&S.raw.length)tick(false)},1000);
setInterval(()=>{if(!document.hidden)fetchPlanes()},15000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)fetchPlanes()});
try{speechSynthesis.getVoices()}catch(e){}
setInterval(()=>{if(!S.pos)return;loadWx();if(Date.now()>(S.spNext||0)){S.spNext=Date.now()+60000;SPACE.init()}},5000);
