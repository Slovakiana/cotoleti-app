"use strict";
/* ============ 🎵 Počúvaj oblohu – živá hudba z lietadiel nad tebou ============ */
const SND={on:false,ctx:null,master:null,fx:null,timer:null,sched:null,step:0,next:0,chord:-1,pad:[]};
/* harmónia: C dur, akordy Cmaj9 – Am9 – Fmaj9 – G6/9 (mäkký „lofi“ postup, nič neladí falošne) */
const MUS={
  prog:[{r:0,t:[0,4,7,11,14]},{r:-3,t:[-3,0,4,7,11]},{r:-7,t:[-7,-3,0,4,7]},{r:-5,t:[-5,-1,2,4,9]}],
  hz:m=>440*Math.pow(2,(m-69)/12),
  // melódia len z tónov aktuálneho akordu v dvoch oktávach -> vždy súzvuk
  tone(ci,idx){const t=MUS.prog[ci].t,n=t.length;return 60+t[((idx%n)+n)%n]+12*Math.floor(idx/n)},
  // efekty: kompresor + ozvena + dozvuk
  fx(ctx,dest){
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=3;comp.connect(dest);
    const dry=ctx.createGain();dry.connect(comp);
    const rev=ctx.createConvolver();rev.buffer=MUS.impulse(ctx);const wet=ctx.createGain();wet.gain.value=.45;rev.connect(wet).connect(comp);
    const dl=ctx.createDelay(2),fb=ctx.createGain(),dg=ctx.createGain(),lp=ctx.createBiquadFilter();
    lp.type="lowpass";lp.frequency.value=2500;fb.gain.value=.35;dg.gain.value=.3;
    dry.connect(dl);dl.connect(lp).connect(fb).connect(dl);lp.connect(dg).connect(comp);
    dry.connect(rev);
    return {in:dry,delay:dl};
  },
  impulse(ctx){const len=ctx.sampleRate*2.5|0,b=ctx.createBuffer(2,len,ctx.sampleRate);for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch);let x=0;for(let i=0;i<len;i++){x=x*.6+(Math.random()*2-1)*.4;d[i]=x*Math.pow(1-i/len,3)}}return b},
  // jemný „zvonček / marimba“ tón
  pluck(ctx,dest,t,m,vol,pan,bell){
    const f=MUS.hz(m),g=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=bell?6000:2400;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0005,t+(bell?2.6:1.4));
    let node=g;if(ctx.createStereoPanner&&pan){const p=ctx.createStereoPanner();p.pan.value=pan;g.connect(p);node=p}
    node.connect(dest);lp.connect(g);
    const parts=bell?[[1,1],[2,.35],[3,.12],[4.2,.06]]:[[1,1],[2,.25],[3,.06]];
    parts.forEach(([r,a])=>{const o=ctx.createOscillator(),og=ctx.createGain();o.type="sine";o.frequency.value=f*r;og.gain.value=a;
      if(r>1){og.gain.setValueAtTime(a,t);og.gain.exponentialRampToValueAtTime(.0005,t+.5)}o.connect(og).connect(lp);o.start(t);o.stop(t+(bell?2.8:1.6))});
  },
  // mäkký pad akordu + basa
  pad(ctx,dest,t,ci,dur,vol=.05){
    const c=MUS.prog[ci],g=ctx.createGain(),lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.setValueAtTime(500,t);lp.frequency.linearRampToValueAtTime(1100,t+dur/2);lp.frequency.linearRampToValueAtTime(600,t+dur);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+Math.min(1.5,dur*.3));g.gain.setValueAtTime(vol,t+dur-.4);g.gain.linearRampToValueAtTime(0,t+dur+1.2);
    lp.connect(g).connect(dest);
    c.t.slice(0,4).forEach((x,i)=>[-6,6].forEach(det=>{const o=ctx.createOscillator();o.type=i?"triangle":"sine";o.frequency.value=MUS.hz(48+x+(i>2?0:12));o.detune.value=det;o.connect(lp);o.start(t);o.stop(t+dur+1.4)}));
    const b=ctx.createOscillator(),bg=ctx.createGain();b.type="sine";b.frequency.value=MUS.hz(36+((c.r+12)%12));
    bg.gain.setValueAtTime(0,t);bg.gain.linearRampToValueAtTime(vol*2.2,t+.3);bg.gain.setValueAtTime(vol*2.2,t+dur-.3);bg.gain.linearRampToValueAtTime(0,t+dur+.6);
    b.connect(bg).connect(dest);b.start(t);b.stop(t+dur+.8);
  }
};
const hexN=h=>{let x=0;for(const ch of String(h))x=(x*31+ch.charCodeAt(0))>>>0;return x};
// noty z lietadiel: výška letu = výška tónu (z akordu), blízkosť = hustota a hlasitosť, smer = stereo
function skyNotes(ctx,dest,t,step,ci,planes){
  planes.forEach(a=>{
    const per=a.el>45?2:a.el>25?3:a.el>10?4:a.el>3?6:8,off=hexN(a.hex)%per;
    if(step%per!==off)return;
    const n=MUS.prog[ci].t.length,idx=Math.max(0,Math.min(2*n-1,Math.round((a.alt||0)/42000*(2*n-1))))+(step%(per*4)===off&&per<4?1:0);
    const pan=a.pan||0,vol=.05+Math.min(1,(a.el||0)/80)*.13;
    MUS.pluck(ctx,dest,t,MUS.tone(ci,idx),vol,pan,a.bell);
  });
}
const SKY_BPM=84,EIGHTH=60/SKY_BPM/2,BAR=16; // 16 osmín = 1 akord (~5,7 s)
function sndStart(){
  const ctx=SND.ctx=new (window.AudioContext||window.webkitAudioContext)();unlockAudio(ctx);
  const master=SND.master=ctx.createGain();master.gain.value=0;master.gain.linearRampToValueAtTime(.9,ctx.currentTime+2);master.connect(ctx.destination);
  SND.fx=MUS.fx(ctx,master);SND.fx.delay.delayTime.value=EIGHTH*3;
  SND.step=0;SND.next=ctx.currentTime+.15;SND.on=true;
  SND.sched=setInterval(sndSched,60);sndUpdate();SND.timer=setInterval(sndUpdate,1000);
}
function sndPlanes(){return S.list.filter(a=>a.el!=null&&a.el>0).slice(0,8).map(a=>({hex:a.hex,el:a.el,alt:a.alt,bell:rarity(a)!=="c",pan:Math.max(-1,Math.min(1,Math.sin(rad(wrap180(a.bear-(S.heading||0))))))}))}
function sndSched(){
  const c=SND.ctx;if(!c)return;
  while(SND.next<c.currentTime+.3){
    const ci=Math.floor(SND.step/BAR)%MUS.prog.length,t=SND.next;
    if(SND.step%BAR===0)MUS.pad(c,SND.fx.in,t,ci,BAR*EIGHTH,.045);
    skyNotes(c,SND.fx.in,t,SND.step,ci,sndPlanes());
    SND.step++;SND.next+=EIGHTH;
  }
}
function sndStop(){
  if(!SND.ctx)return;const c=SND.ctx;SND.master.gain.linearRampToValueAtTime(0,c.currentTime+1);
  clearInterval(SND.sched);clearInterval(SND.timer);
  setTimeout(()=>{try{c.close()}catch(e){}releaseAudio()},1300);SND.ctx=null;SND.on=false;
}
function sndUpdate(){
  if(!SND.ctx)return;const n=S.list.filter(a=>a.el!=null&&a.el>0).slice(0,8).length;
  $("b-sound").textContent=n?`🎵 Hrá ${n} ${n===1?"lietadlo":n<5?"lietadlá":"lietadiel"} · stop`:"🎵 Ticho na oblohe · stop";
}
/* hudba do auto-videa: rovnaká harmónia, k tomu jemný beat (dá sa vyrenderovať aj offline) */
function musicBed(ctx,dest,t0,dur){
  const bpm=100,beat=60/bpm,fx=MUS.fx(ctx,dest);fx.delay.delayTime.value=beat*.75;
  const beats=Math.ceil(dur/beat);
  for(let i=0;i<beats;i++){const t=t0+i*beat,ci=Math.floor(i/4)%4;
    if(i%4===0)MUS.pad(ctx,fx.in,t,ci,beat*4,.05);
    // kick
    if(i%2===0||i%8===7){const k=ctx.createOscillator(),kg=ctx.createGain();k.frequency.setValueAtTime(110,t);k.frequency.exponentialRampToValueAtTime(42,t+.18);kg.gain.setValueAtTime(.55,t);kg.gain.exponentialRampToValueAtTime(.001,t+.35);k.connect(kg).connect(dest);k.start(t);k.stop(t+.4)}
    // rimshot / hat
    const n=ctx.createBufferSource(),b=ctx.createBuffer(1,ctx.sampleRate*.04|0,ctx.sampleRate),d=b.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.pow(1-j/d.length,2);
    n.buffer=b;const hp=ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=i%2?7000:9000;const hg=ctx.createGain();hg.gain.value=i%2?.12:.05;n.connect(hp).connect(hg).connect(dest);n.start(t+beat/2);
    // arpeggio z tónov akordu
    [0,.5].forEach((h,k)=>{const idx=[0,2,4,1,3,5,2,4][(i*2+k)%8];MUS.pluck(ctx,fx.in,t+h*beat,MUS.tone(ci,idx+2),.07,(k?.3:-.3),i%8===0&&!k)});
  }
  // „whoosh“ preletu v strede videa
  const w=ctx.createBufferSource(),wb=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),wd=wb.getChannelData(0);for(let j=0;j<wd.length;j++)wd[j]=(Math.random()*2-1)*Math.sin(Math.PI*j/wd.length);
  w.buffer=wb;const bp=ctx.createBiquadFilter();bp.type="bandpass";bp.Q.value=.7;bp.frequency.setValueAtTime(250,t0+3);bp.frequency.exponentialRampToValueAtTime(2200,t0+6);const wg=ctx.createGain();wg.gain.value=.18;w.connect(bp).connect(wg).connect(fx.in);w.start(t0+3);
}
$("b-sound").onclick=()=>{haptic(8);if(SND.on){sndStop();$("b-sound").textContent="🎵 Počúvaj oblohu"}else{sndStart();toast("🎵 Počúvaš oblohu","Výška letu = výška tónu, blízkosť = hlasitosť. Zvýš hlasitosť 🔊")}};
