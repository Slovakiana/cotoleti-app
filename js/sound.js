"use strict";
/* ============ 🎵 Počúvaj oblohu – živá hudba z lietadiel nad tebou ============ */
const SND={on:false,ctx:null,master:null,voices:new Map(),pad:null,timer:null};
const SCALE=[0,2,4,7,9,12,14,16,19,21,24,26,28];// pentatonika
function sndImpulse(ctx){const len=ctx.sampleRate*3,b=ctx.createBuffer(2,len,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.5)}return b}
function sndStart(){
  const ctx=SND.ctx=new (window.AudioContext||window.webkitAudioContext)();
  const master=SND.master=ctx.createGain();master.gain.value=0;master.gain.linearRampToValueAtTime(.8,ctx.currentTime+2);
  const rev=ctx.createConvolver();rev.buffer=sndImpulse(ctx);const wet=ctx.createGain();wet.gain.value=.6;
  master.connect(ctx.destination);master.connect(rev);rev.connect(wet);wet.connect(ctx.destination);
  // nízky dron
  const pad=ctx.createOscillator(),pg=ctx.createGain(),pf=ctx.createBiquadFilter();pad.type="sawtooth";pad.frequency.value=55;pf.type="lowpass";pf.frequency.value=300;pg.gain.value=.05;pad.connect(pf).connect(pg).connect(master);pad.start();SND.pad=pad;
  SND.on=true;sndUpdate();SND.timer=setInterval(sndUpdate,1000);
}
function sndStop(){
  if(!SND.ctx)return;const c=SND.ctx;SND.master.gain.linearRampToValueAtTime(0,c.currentTime+1);
  setTimeout(()=>{try{c.close()}catch(e){}},1200);SND.ctx=null;SND.voices.clear();clearInterval(SND.timer);SND.on=false;
}
function sndUpdate(){
  const c=SND.ctx;if(!c)return;const now=c.currentTime,list=S.list.filter(a=>a.el!=null&&a.el>0).slice(0,8),seen=new Set();
  list.forEach(a=>{
    seen.add(a.hex);let v=SND.voices.get(a.hex);
    if(!v){const o=c.createOscillator(),g=c.createGain(),p=c.createStereoPanner?c.createStereoPanner():null,lfo=c.createOscillator(),lg=c.createGain();
      o.type=rarity(a)==="c"?"sine":"triangle";g.gain.value=0;lfo.frequency.value=.2;lg.gain.value=.03;lfo.connect(lg).connect(g.gain);
      if(p){o.connect(g).connect(p).connect(SND.master)}else o.connect(g).connect(SND.master);o.start();lfo.start();v={o,g,p,lfo};SND.voices.set(a.hex,v)}
    const step=SCALE[Math.min(SCALE.length-1,Math.max(0,Math.round((a.alt||0)/1000)))],f=220*Math.pow(2,step/12);
    v.o.frequency.setTargetAtTime(f,now,.5);
    v.g.gain.setTargetAtTime(Math.min(.16,.02+a.el/90*.16),now,.8);
    v.lfo.frequency.setTargetAtTime(.1+(a.spd||300)/900,now,1);
    if(v.p){const rel=wrap180(a.bear-(S.heading||0));v.p.pan.setTargetAtTime(Math.max(-1,Math.min(1,Math.sin(rad(rel)))),now,.5)}
  });
  for(const [h,v] of SND.voices)if(!seen.has(h)){v.g.gain.setTargetAtTime(0,now,.6);setTimeout(()=>{try{v.o.stop();v.lfo.stop()}catch(e){}},3000);SND.voices.delete(h)}
  $("b-sound").textContent=list.length?`🎵 Hrá ${list.length} ${list.length===1?"lietadlo":list.length<5?"lietadlá":"lietadiel"} · stop`:"🎵 Ticho na oblohe · stop";
}
$("b-sound").onclick=()=>{haptic(8);if(SND.on){sndStop();$("b-sound").textContent="🎵 Počúvaj oblohu"}else{sndStart();toast("🎵 Počúvaš oblohu","Každé lietadlo hrá svoj tón: výška = výška tónu, blízkosť = hlasitosť. Najlepšie so slúchadlami 🎧")}};
