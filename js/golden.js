"use strict";
/* ============ 🏆 Zlaté lietadlo dňa + 🥇 lietadlo týždňa ============ */
const GOLD={g:null,alerted:LS.get("ctl_goldAlert",""),won:LS.get("ctl_goldWon","")};
function goldActive(){return GOLD.g&&GOLD.g.state===0}
function goldenHex(){return goldActive()?GOLD.g.hex:null}
function goldRender(){
  const g=GOLD.g,ch=$("goldChip");
  if(!g){ch.style.display="none";return}
  ch.style.display="";ch.classList.toggle("goldOn",g.state===0);
  ch.textContent=g.state===0?`🏆 Zlaté lietadlo: ${g.call} · zamávaj a si v žrebovaní`:g.state===1?`🏆 Zlaté lietadlo získal spotter${g.winner&&g.winner.k&&KRAJ[g.winner.k]&&g.winner.k!=="XX"?" ("+KRAJ[g.winner.k][2]+" kraj)":""}`:"🏆 Zlatému lietadlu dnes nikto nezamával 😢";
  // je nad nami?
  const here=goldActive()&&S.list.find(a=>a.hex===g.hex&&a.el>2);
  $("hero").classList.toggle("golden",!!(here&&S.top&&S.top.hex===g.hex));
  if(here&&S.top&&S.top.hex===g.hex)ch.style.display="none";
  const key=dayKey()+g.seq;
  if(here&&GOLD.alerted!==key&&LS.get("ctl_onb",0)&&(LS.get("ctl_waveN",0)|0)>0){GOLD.alerted=key;LS.set("ctl_goldAlert",key);S.pick=g.hex;tick(true);toast("🏆 Zlaté lietadlo je nad tebou!","Zamávaj – jeden z mávajúcich dostane +100 bodov 👋","#ffcf4f");haptic([100,60,100,60,300]);confetti(60)}
}
async function goldTap(){
  const g=GOLD.g;if(!g)return;
  if(g.state!==0){toast(g.state===1?"🏆 Toto už má víťaza":"🏆 Uletelo","Zlaté lietadlá sú 4 denne – ďalšie príde neskôr");return}
  const here=S.list.find(a=>a.hex===g.hex);
  if(here){S.pick=g.hex;tick(true);window.scrollTo({top:0,behavior:"smooth"});return}
  toast("🏆 Hľadám zlaté lietadlo…",g.call);
  const ac=await trFetch(g.call);
  if(!ac||!S.pos){toast("🏆 "+g.call,"Práve nevysiela polohu – skús o chvíľu");return}
  const {d,b}=distBear(S.pos.lat,S.pos.lon,ac.lat,ac.lon);
  toast("🏆 "+g.call+" je "+nf(d/1000)+" km od teba","Smer "+dirL(b)+(d<60000?" – môže preletieť blízko!":" – sleduj, či sa priblíži"));
}
$("goldChip").onclick=goldTap;
function goldenWon(a){
  const seq=SOC.data&&SOC.data.goldMine||(GOLD.g?GOLD.g.seq:"");const key=dayKey()+seq;if(GOLD.won===key)return;GOLD.won=key;LS.set("ctl_goldWon",key);
  COL.pts+=100;LS.set("ctl_col",COL);grantAch("golden");
  setTimeout(()=>{toast("🏆 Zlaté lietadlo dňa je tvoje!","+100 bodov – žreb padol na teba","#ffcf4f");confetti(160);haptic([80,50,80,50,80,50,400]);ping("l")},600);
}
ACH.push({id:"golden",i:"🏆",n:"Zlaté lietadlo",c:()=>false});
// lietadlo týždňa
function weekRender(w){
  if(!w||!w.n){$("weekCard").style.display="none";return}
  $("weekCard").style.display="";
  const al=w.call?AIRLINES[w.call.slice(0,3)]||"":"",tn=TYPES[w.type]||w.type||"";
  $("weekT").textContent=(al?al+" ":"")+(w.call||w.hex.toUpperCase())+(w.dest?" → "+w.dest:"");
  $("weekS").textContent=[tn,`zamávalo mu ${nf(w.n)} ${ludia(w.n)}`].filter(Boolean).join(" · ");
  $("weekN").textContent=nf(w.n)+" 👋";
  GOLD.week=w;
}
$("weekShare").onclick=()=>{
  const w=GOLD.week;if(!w)return;const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#2a1d00");g.addColorStop(.5,"#b8860b");g.addColorStop(1,"#ffcf4f");x.fillStyle=g;x.fillRect(0,0,W,H);
  x.textAlign="center";x.fillStyle="#fff";x.font="200px sans-serif";x.fillText("🥇",W/2,520);
  x.font="700 40px Inter, sans-serif";x.fillText("NAJZAMÁVANEJŠIE LIETADLO TÝŽDŇA",W/2,640);
  const al=w.call?AIRLINES[w.call.slice(0,3)]||"":"";
  x.font="900 110px Unbounded, sans-serif";x.fillText(w.call||"",W/2,820);
  x.font="600 50px Inter, sans-serif";x.fillText([al,TYPES[w.type]||w.type].filter(Boolean).join(" · "),W/2,910);
  if(w.dest){x.font="800 64px Unbounded, sans-serif";x.fillText("→ "+w.dest,W/2,1030)}
  x.font="900 150px Unbounded, sans-serif";x.fillText(nf(w.n)+" 👋",W/2,1300);
  x.font="600 44px Inter, sans-serif";x.fillText("ľudí zo Slovenska mu zamávalo",W/2,1380);
  x.fillStyle="#2a1d00";x.font="900 60px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,H-440);
  x.font="600 36px Inter, sans-serif";x.fillText(APP_HOST,W/2,H-380);
  c.toBlob(b=>b&&shareBlob(b,"lietadlo-tyzdna.png",`🥇 Najzamávanejšie lietadlo týždňa: ${w.call}${al?" ("+al+")":""} – zamávalo mu ${w.n} ľudí zo Slovenska! ✈️👋 ${appLink()}${TAGS}`),"image/png");
};
HOOKS.social=HOOKS.social||[];
HOOKS.social.push(D=>{GOLD.g=D.golden||null;goldRender();weekRender(D.weekTop)});
HOOKS.live.push(()=>{if(goldActive())goldRender()});
