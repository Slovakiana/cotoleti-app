"use strict";
/* ============ AR obloha na canvase (dá sa nahrávať) ============ */
const AR={auto:false,cd:0,maxS:30,music:null,facing:"environment",stream:null,raf:null,rec:null,chunks:[],recStart:0,cv:null,ctx:null,vid:null,d:1,hint:"",calib:LS.get("ctl_arcal",0)};
const HFOV=52,VFOV=68;

async function openAR(){
  $("ar").classList.add("on");
  enableCompass();
  AR.cv=$("arCanvas");AR.ctx=AR.cv.getContext("2d");AR.vid=$("arVid");
  sizeAR();
  cancelAnimationFrame(AR.raf);arFrame();
  wakeOn();
  await arCam();
}
// iPhone pri prepnutí appky vypne kameru aj zvuk – po návrate ich obnovíme
document.addEventListener("visibilitychange",()=>{
  if(!$("ar").classList.contains("on"))return;
  if(document.hidden){if(AR.rec&&AR.rec.state==="recording")stopRec();return}
  const dead=!AR.stream||AR.stream.getVideoTracks().every(t=>t.readyState==="ended");
  if(dead)arCam();else AR.vid.play().catch(()=>{});
  try{AR.actx&&AR.actx.state!=="running"&&AR.actx.resume()}catch(e){}
});
async function arCam(){
  if(AR.stream){AR.stream.getTracks().forEach(x=>x.stop());AR.stream=null}
  try{
    AR.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:AR.facing},width:{ideal:1280},height:{ideal:720}},audio:false});
    AR.vid.srcObject=AR.stream;await AR.vid.play().catch(()=>{});
  }catch(e){toast("Kamera nie je povolená","Ukážem aspoň štítky na oblohe")}
}
function sizeAR(){const d=Math.min(2,window.devicePixelRatio||1);AR.d=d;AR.cv.width=Math.round(innerWidth*d);AR.cv.height=Math.round(innerHeight*d)}
addEventListener("resize",()=>{if(AR.cv&&$("ar").classList.contains("on"))sizeAR()});
function closeAR(){
  if(AR.rec&&AR.rec.state==="recording")stopRec();
  $("ar").classList.remove("on");cancelAnimationFrame(AR.raf);if(!document.body.classList.contains("moment"))wakeOff();
  if(AR.stream){AR.stream.getTracks().forEach(x=>x.stop());AR.stream=null}
  if(S.view==="ar")setView("now");
}

function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}

function drawLabel(c,x,y,lines,col){
  c.font="700 14px Unbounded, sans-serif";
  let w=c.measureText(lines[0]).width;
  c.font="500 11.5px Inter, sans-serif";
  for(let i=1;i<lines.length;i++)w=Math.max(w,c.measureText(lines[i]).width);
  w+=18;const h=22+(lines.length-1)*15;
  const bx=Math.max(4,Math.min(x-w/2,c.canvas.width/AR.d-w-4));
  c.fillStyle="rgba(0,0,0,.62)";rrect(c,bx,y,w,h,10);c.fill();
  c.strokeStyle=col;c.lineWidth=1.2;c.stroke();
  c.textAlign="left";c.fillStyle="#fff";c.font="700 14px Unbounded, sans-serif";c.fillText(lines[0],bx+9,y+17);
  c.fillStyle="#dfe6ff";c.font="500 11.5px Inter, sans-serif";
  for(let i=1;i<lines.length;i++)c.fillText(lines[i],bx+9,y+17+i*15);
}

function drawPlane(c,x,y,a,night,now,isTop){
  const col=isTop?"#6dffc7":RAR[rarity(a)].col;
  if(night){
    // nočné svetlá: biely záblesk, červená a zelená na krídlach
    const blink=(now%1200)<120,rot=rad((a.trk??0)-(S.camHead||0));
    const ox=Math.cos(rot)*9,oy=Math.sin(rot)*9;
    c.fillStyle="#ff3b3b";c.beginPath();c.arc(x-ox,y-oy,3,0,7);c.fill();
    c.fillStyle="#3bff6a";c.beginPath();c.arc(x+ox,y+oy,3,0,7);c.fill();
    if(blink){c.fillStyle="#fff";c.shadowColor="#fff";c.shadowBlur=20;c.beginPath();c.arc(x,y,5,0,7);c.fill();c.shadowBlur=0}
    c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();c.arc(x,y,20,0,7);c.stroke();
  }else{
    c.shadowColor=col;c.shadowBlur=16;c.strokeStyle=col;c.lineWidth=2.5;c.beginPath();c.arc(x,y,isTop?26:21,0,7);c.stroke();c.shadowBlur=0;
    c.font="20px sans-serif";c.textAlign="center";c.textBaseline="middle";c.fillText("✈️",x,y+1);c.textBaseline="alphabetic";
  }
  const m=S.meta.get(a.hex),rt=m&&m.route;
  const l3=[a.alt!=null?nf(a.alt)+" m":"",nf(a.dist/1000,1)+" km",rt&&rt.destination?"→ "+(rt.destination.municipality||rt.destination.iata_code||""):""].filter(Boolean).join(" · ");
  drawLabel(c,x,y+(isTop?32:27),[titleOf(a),typeName(a,m),l3],col);
}

function drawSat(c,x,y,s,now){
  const vis=s.sunlit,col=s.kind==="iss"||s.kind==="css"?"#ffcf4f":s.kind==="starlink"?"#c77dff":"#ffffff";
  c.globalAlpha=vis?1:.45;
  c.shadowColor=col;c.shadowBlur=vis?18:0;c.fillStyle=col;c.beginPath();c.arc(x,y,s.kind==="iss"?6:3.5,0,7);c.fill();c.shadowBlur=0;
  if(s.kind==="iss"||s.kind==="css"){
    c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();c.arc(x,y,16+3*Math.sin(now/300),0,7);c.stroke();
    drawLabel(c,x,y+22,[s.short,(vis?"svieti na slnku ✨":"v tieni Zeme")+" · "+nf(s.range)+" km"],col);
  }else if(s.kind==="starlink"){
    c.font="500 10px Inter, sans-serif";c.fillStyle=col;c.textAlign="left";c.fillText(s.short,x+7,y+3);
  }else{c.font="500 10px Inter, sans-serif";c.fillStyle=col;c.textAlign="left";c.fillText(s.short,x+7,y+3)}
  c.globalAlpha=1;
}

function arFrame(){
  AR.raf=requestAnimationFrame(arFrame);
  const tq=performance.now();if(tq-(AR.lastF||0)<32)return;AR.lastF=tq; // max ~30 snímok/s – šetrí batériu
  const c=AR.ctx,d=AR.d,W=AR.cv.width/d,H=AR.cv.height/d,now=Date.now();
  c.setTransform(d,0,0,d,0,0);
  const v=AR.vid;
  const selfie=AR.facing==="user";
  if(v&&v.readyState>=2&&v.videoWidth){const k=Math.max(W/v.videoWidth,H/v.videoHeight),w=v.videoWidth*k,h=v.videoHeight*k;
    if(selfie){c.save();c.translate(W,0);c.scale(-1,1);c.drawImage(v,(W-w)/2,(H-h)/2,w,h);c.restore()}else c.drawImage(v,(W-w)/2,(H-h)/2,w,h)}
  else{const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,"#070b18");g.addColorStop(1,"#1b2a6b");c.fillStyle=g;c.fillRect(0,0,W,H)}
  const night=typeof SPACE!=="undefined"&&SPACE.sunAlt()<-4;
  let hint="";
  if(selfie){hint=selfieSticker(c,W,H,now)}
  else if(S.camHead==null){hint="Čakám na kompas… pohni mobilom do osmičky"}
  else{
    const head=S.camHead+AR.calib,pitch=S.camPitch;
    const proj=(az,el)=>{const dx=wrap180(az-head),dy=el-pitch;return {dx,dy,x:W/2+dx/HFOV*W,y:H/2-dy/VFOV*H,in:Math.abs(dx)<HFOV/2+6&&Math.abs(dy)<VFOV/2+6}};
    // obzor
    const hy=H/2+pitch/VFOV*H;
    if(hy>0&&hy<H){c.strokeStyle="rgba(255,255,255,.3)";c.lineWidth=1;c.setLineDash([6,8]);c.beginPath();c.moveTo(0,hy);c.lineTo(W,hy);c.stroke();c.setLineDash([]);
      c.fillStyle="rgba(255,255,255,.6)";c.font="600 11px Inter, sans-serif";c.textAlign="left";c.fillText("obzor",8,hy-5)}
    // svetové strany
    c.font="700 13px Unbounded, sans-serif";c.textAlign="center";
    [["S",0],["SV",45],["V",90],["JV",135],["J",180],["JZ",225],["Z",270],["SZ",315]].forEach(([n,az])=>{const p=proj(az,pitch+VFOV/2-6);if(Math.abs(p.dx)<HFOV/2){c.fillStyle=n==="S"?"#ff4f6d":"rgba(255,255,255,.75)";c.fillText(n,p.x,92)}});
    // satelity
    if(typeof SPACE!=="undefined")SPACE.visibleNow().forEach(s=>{const p=proj(s.az,s.el);if(p.in)drawSat(c,p.x,p.y,s,now)});
    // lietadlá
    const list=enrich(now).filter(a=>a.el!=null&&a.el>-3).slice(0,25);let inView=0,top=null;
    list.slice().reverse().forEach(a=>{const p=proj(a.bear,a.el),isTop=!!(S.top&&a.hex===S.top.hex);if(isTop)top={a,p};if(!p.in)return;inView++;drawPlane(c,p.x,p.y,a,night,now,isTop)});
    if(top&&!top.p.in){
      const ang=Math.atan2(-top.p.dy,top.p.dx),rx=W/2-40,ry=H/2-140;
      const k=Math.min(rx/Math.max(1e-6,Math.abs(Math.cos(ang))),ry/Math.max(1e-6,Math.abs(Math.sin(ang))));
      c.save();c.translate(W/2+Math.cos(ang)*k,H/2+Math.sin(ang)*k);c.rotate(ang);
      c.fillStyle="#6dffc7";c.shadowColor="#6dffc7";c.shadowBlur=14;c.beginPath();c.moveTo(18,0);c.lineTo(-10,-12);c.lineTo(-4,0);c.lineTo(-10,12);c.closePath();c.fill();c.restore();c.shadowBlur=0;
      const dy=top.p.dy,dx=top.p.dx;
      hint=[dy>12?"vyššie":dy<-12?"nižšie":"",Math.abs(dx)>12?(dx>0?"doprava":"doľava"):""].filter(Boolean).join(" a ");
      hint=(hint?hint.charAt(0).toUpperCase()+hint.slice(1):"Tam")+" → "+titleOf(top.a);
    }else hint=inView?(inView===1?"1 lietadlo v zábere":inView+" "+pl(inView,"lietadlo","lietadlá","lietadiel")+" v zábere"):"Namier mobil na oblohu 👆";
  }
  // 🎯 automatický záber nad hlavou
  if(AR.auto&&!selfie){
    const recOn=AR.rec&&AR.rec.state==="recording";
    const tp=S.top&&enrich(now).find(a=>a.hex===S.top.hex);
    if(!recOn&&!AR.cd&&tp){const ap=approach(tp);
      if(tp.el>=55||(ap&&ap.t>0&&ap.t<4&&ap.el>=45))AR.cd=now+3000;
      else{const sec=ap&&ap.t>0?Math.round(ap.t):null;hint="🎯 Čakám na lietadlo nad tebou"+(sec&&sec<900?` · ~${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`:"")}}
    if(AR.cd&&!recOn){const left=Math.ceil((AR.cd-now)/1000);
      if(left<=0){AR.cd=0;startRec({auto:true})}
      else{c.fillStyle="rgba(0,0,0,.35)";c.fillRect(0,0,W,H);c.fillStyle="#fff";c.textAlign="center";c.font="900 140px Unbounded, sans-serif";c.fillText(String(left),W/2,H/2+50);hint="Priprav sa… mier hore 👆"}}
    if(recOn&&now-AR.recStart<2500){c.fillStyle="#6dffc7";c.textAlign="center";c.font="900 30px Unbounded, sans-serif";c.shadowColor="#000";c.shadowBlur=12;c.fillText("NADO MNOU ↑",W/2,150);c.shadowBlur=0}
  }
  // zameriavač
  c.strokeStyle="rgba(255,255,255,.45)";c.lineWidth=1;c.beginPath();c.arc(W/2,H/2,16,0,7);c.stroke();
  // vodoznak (viditeľný aj vo videu)
  c.textAlign="left";c.fillStyle="rgba(255,255,255,.9)";c.font="900 15px Unbounded, sans-serif";c.fillText(t("title")+" ✈️",14,H-205);
  c.fillStyle="rgba(255,255,255,.65)";c.font="500 11px Inter, sans-serif";c.fillText(APP_HOST,14,H-189);
  // nahrávanie
  if(AR.rec&&AR.rec.state==="recording"){
    const s=(now-AR.recStart)/1000;
    c.fillStyle="#ff4f6d";c.beginPath();c.arc(W-74,110,6,0,7);c.fill();
    c.fillStyle="#fff";c.font="700 13px Inter, sans-serif";c.textAlign="left";c.fillText("REC "+Math.floor(s)+" s",W-62,115);
    if(s>=AR.maxS)stopRec();
  }
  if(hint!==AR.hint){AR.hint=hint;$("arHint").textContent=hint}
}

/* ---- nahrávanie a fotka ---- */
function pickMime(){
  if(!window.MediaRecorder||!MediaRecorder.isTypeSupported)return "";
  return ["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"].find(m=>MediaRecorder.isTypeSupported(m))||"";
}
function arMusic(){
  try{
    const ctx=AR.actx||(AR.actx=new (window.AudioContext||window.webkitAudioContext)());unlockAudio(ctx);
    const dst=ctx.createMediaStreamDestination(),out=ctx.createGain();out.gain.value=.5;out.connect(dst);out.connect(ctx.destination);
    musicBed(ctx,out,ctx.currentTime+.05,12);
    return {track:dst.stream.getAudioTracks()[0],stop:()=>{try{out.gain.setTargetAtTime(0,ctx.currentTime,.1);setTimeout(()=>{try{out.disconnect()}catch(e){}},400)}catch(e){}releaseAudio()}};
  }catch(e){return null}
}
function startRec(opt={}){
  if(!AR.cv.captureStream||!window.MediaRecorder){toast("Nahrávanie tu nejde","Tento prehliadač ho nepodporuje – skús fotku 📷");return}
  const mime=pickMime();AR.chunks=[];AR.maxS=opt.auto?10:30;
  const st=AR.cv.captureStream(30);
  if(opt.auto){AR.music=arMusic();if(AR.music&&AR.music.track)st.addTrack(AR.music.track)}
  try{AR.rec=new MediaRecorder(st,mime?{mimeType:mime,videoBitsPerSecond:5e6}:undefined)}
  catch(e){ // niektoré prehliadače nevedia nahrať zvuk z webu – skúsime bez neho
    try{st.getAudioTracks().forEach(t=>st.removeTrack(t));AR.rec=new MediaRecorder(st,mime?{mimeType:mime}:undefined);toast("🎵 Video bude bez hudby","Tento prehliadač nevie nahrať zvuk")}catch(e2){toast("Nahrávanie zlyhalo",e2.message);return}}
  AR.rec.ondataavailable=e=>{if(e.data&&e.data.size)AR.chunks.push(e.data)};
  AR.rec.onstop=()=>{
    if(AR.music){AR.music.stop();AR.music=null}
    if(AR.auto){AR.auto=false;$("arAuto").classList.remove("on");$("arAuto").textContent="🎯 Auto-záber";grantAch("autoshot")}
    const type=(AR.rec.mimeType||mime||"video/webm").split(";")[0],blob=new Blob(AR.chunks,{type});
    if(!blob.size){toast("Video je prázdne","Skús to znova");return}
    grantAch("video");
    shareBlob(blob,"co-to-leti."+(type.includes("mp4")?"mp4":"webm"),"Pozri, čo mi letelo nad hlavou ✈️ "+(S.top?planeLink(S.top):appLink())+TAGS);
  };
  AR.rec.start(500);AR.recStart=Date.now();$("arRec").classList.add("on");
  if(navigator.vibrate)navigator.vibrate(40);
}
function stopRec(){try{if(AR.rec&&AR.rec.state==="recording")AR.rec.stop()}catch(e){}$("arRec").classList.remove("on")}
function snapAR(){AR.cv.toBlob(b=>b&&shareBlob(b,"co-to-leti.png","Pozri, čo mi letí nad hlavou ✈️ "+(S.top?planeLink(S.top):appLink())+TAGS),"image/png")}

async function shareBlob(blob,name,text){
  const file=new File([blob],name,{type:blob.type});
  try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text});return}}catch(e){if(e.name==="AbortError")return}
  const url=URL.createObjectURL(blob),isV=blob.type.startsWith("video");
  $("shareImg").style.display=isV?"none":"";$("shareVid").style.display=isV?"":"none";
  if(isV){$("shareVid").src=url;$("shareVid").play().catch(()=>{})}else $("shareImg").src=url;
  $("shareDl").href=url;$("shareDl").download=name;
  $("shareTxt").textContent=isV?"Video je hotové. Stiahni si ho a pridaj na TikTok alebo do Reels.":"Podrž prst na obrázku a ulož ho, alebo ho stiahni.";
  $("shareDl").style.display="";
  if(typeof inApp!=="undefined"&&inApp){$("shareDl").style.display="none";$("shareTxt").textContent=isV?"Video ulož cez Safari/Chrome: ⋯ → Otvoriť v prehliadači.":"Podrž prst na obrázku → Uložiť obrázok."}
  $("shareM").classList.add("on");
}

$("arRec").onclick=()=>{if(AR.rec&&AR.rec.state==="recording")stopRec();else startRec()};
$("arSnap").onclick=snapAR;
// kalibrácia: namier na najbližšie lietadlo/ISS v strede a ťukni
$("arFlip").onclick=()=>{AR.facing=AR.facing==="user"?"environment":"user";haptic(10);arCam()};
if($("arCal"))$("arCal").onclick=()=>{
  if(S.camHead==null){toast("Kompas ešte nebeží","Pohni mobilom do osmičky");return}
  const target=S.top||null;
  if(!target){AR.calib=0;LS.set("ctl_arcal",0);toast("Kalibrácia zrušená","");return}
  const a=enrich(Date.now()).find(x=>x.hex===target.hex)||target;
  AR.calib=wrap180(a.bear-S.camHead);LS.set("ctl_arcal",AR.calib);
  toast("🧭 Skalibrované","Namieril si na "+titleOf(a)+" – štítky už sedia s oblohou");
};

/* ---- 🤳 selfie s lietadlom nad hlavou ---- */
function selfieSticker(c,W,H,now){
  const a=S.top;
  // šípka hore
  const ay=110+6*Math.sin(now/300);
  c.fillStyle="#6dffc7";c.shadowColor="#6dffc7";c.shadowBlur=20;c.beginPath();c.moveTo(W/2,ay);c.lineTo(W/2+22,ay+30);c.lineTo(W/2+8,ay+30);c.lineTo(W/2+8,ay+58);c.lineTo(W/2-8,ay+58);c.lineTo(W/2-8,ay+30);c.lineTo(W/2-22,ay+30);c.closePath();c.fill();c.shadowBlur=0;
  const bx=16,bw=W-32,by=H-385,bh=150;
  c.fillStyle="rgba(5,7,15,.62)";rrect(c,bx,by,bw,bh,24);c.fill();c.strokeStyle="rgba(255,255,255,.25)";c.lineWidth=1;c.stroke();
  c.textAlign="left";c.fillStyle="rgba(255,255,255,.75)";c.font="700 12px Inter, sans-serif";c.fillText("NADO MNOU PRÁVE LETÍ ↑",bx+18,by+28);
  if(!a){c.fillStyle="#fff";c.font="900 26px Unbounded, sans-serif";c.fillText("Čisté nebo ☁️",bx+18,by+70);return "Selfie s oblohou 🤳"}
  const m=S.meta.get(a.hex),rt=routeOf(a),al=airlineOf(a);
  let big=rt?"→ "+citySk(rt.destination.municipality):(al||titleOf(a)),fs=32;
  c.fillStyle="#fff";c.font=`900 ${fs}px Unbounded, sans-serif`;while(c.measureText(big).width>bw-36&&fs>18){fs-=2;c.font=`900 ${fs}px Unbounded, sans-serif`}c.fillText(big,bx+18,by+72);
  c.fillStyle="rgba(255,255,255,.85)";c.font="500 14px Inter, sans-serif";
  c.fillText([al,typeName(a,m)].filter(Boolean).join(" · "),bx+18,by+100);
  const p=pax(a);c.fillText([a.alt!=null?nf(a.alt/1000,1)+" km nado mnou":"",p>=10?"~"+nf(p)+" ľudí na palube":""].filter(Boolean).join(" · "),bx+18,by+124);
  return "Selfie s lietadlom nad hlavou 🤳 – nahraj alebo odfoť";
}

$("arAuto").onclick=()=>{
  // zvuk musí vzniknúť priamo pri ťuknutí, inak ho iPhone zablokuje
  try{AR.actx=AR.actx||new (window.AudioContext||window.webkitAudioContext)();unlockAudio(AR.actx)}catch(e){}
  if(AR.facing==="user"){AR.facing="environment";arCam()}
  AR.auto=!AR.auto;AR.cd=0;haptic(10);
  $("arAuto").textContent=AR.auto?"🎯 Auto: čakám…":"🎯 Auto-záber";
  if(AR.auto)toast("🎯 Auto-záber zapnutý","Namier mobil hore. Keď bude lietadlo nad tebou, sám natočí 10 s aj s hudbou 🎵");
};
ACH.push({id:"autoshot",i:"🎯",n:"Auto-záber",c:()=>false});
