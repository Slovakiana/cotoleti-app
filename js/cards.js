"use strict";
/* ============ 🃏 Holografické zberateľské kartičky ============ */
const CARD_BG={c:"linear-gradient(150deg,#2b3a67,#16213e)",u:"linear-gradient(150deg,#0f4c81,#1c92d2 60%,#6dd5fa)",r:"linear-gradient(150deg,#41295a,#8e2de2 55%,#ff4fd8)",l:"linear-gradient(150deg,#b8860b,#ffcf4f 45%,#fff3b0 60%,#e0a800)"};
const cardEmoji=k=>HELI.has(k)?"🚁":LEG.has(k)?"🛸":WIDE.has(k)||/^(A38|B74)/.test(k)?"🛫":/^(C1|PA|P28|DA|SR2|C72|C82)/.test(k)?"🛩️":"✈️";
function cardHTML(k,v){
  const seats=SEATS[k];
  return `<div class="hcard ${v.r}" style="--cg:${CARD_BG[v.r]}" data-k="${esc(k)}"><span class="rr">${RAR[v.r].n.toUpperCase()}</span>
    <div class="em">${cardEmoji(k)}</div>
    <div><div class="nm">${esc(v.name||k)}</div><div class="mt">${esc(k)}${seats?" · "+seats+" miest":""}</div><div class="mt">prvýkrát ${new Date(v.first||Date.now()).toLocaleDateString("sk-SK")}</div></div>
    <span class="cnt">${v.n}×</span></div>`;
}
function renderCards(){
  const types=Object.entries(COL.types),order={l:0,r:1,u:2,c:3};
  const n=types.length;$("c-cardsN").textContent=n?n+" "+(n===1?"kartička":n<5?"kartičky":"kariet"):"";
  $("c-types").innerHTML=types.length?types.sort((x,y)=>order[x[1].r]-order[y[1].r]||y[1].n-x[1].n).map(([k,v])=>cardHTML(k,v)).join(""):'<div class="lookSub" style="grid-column:1/-1">Zatiaľ prázdna. Každý nový typ lietadla nad tebou = nová kartička.</div>';
}
HOOKS.view.push(v=>{if(v==="col")renderCards()});
let cardK=null;
$("c-types").onclick=e=>{const c=e.target.closest(".hcard");if(!c)return;cardK=c.dataset.k;$("cardBig").innerHTML=cardHTML(cardK,COL.types[cardK]);$("cardM").classList.add("on");haptic(15);bindTilt()};
$("cardClose").onclick=()=>$("cardM").classList.remove("on");
function tiltTo(rx,ry){const c=$("cardBig").firstElementChild;if(!c)return;c.style.setProperty("--rx",rx+"deg");c.style.setProperty("--ry",ry+"deg");c.style.setProperty("--mx",(50+ry*3)+"%");c.style.setProperty("--my",(50-rx*3)+"%");c.style.setProperty("--ang",(ry*8)+"deg")}
let tiltBound=false;
function bindTilt(){
  if(tiltBound)return;tiltBound=true;
  addEventListener("deviceorientation",e=>{if(!$("cardM").classList.contains("on")||e.beta==null)return;tiltTo(Math.max(-18,Math.min(18,(e.beta-45)/2)),Math.max(-18,Math.min(18,(e.gamma||0)/1.5)))});
  $("cardBig").addEventListener("pointermove",e=>{const r=$("cardBig").firstElementChild.getBoundingClientRect();tiltTo(-((e.clientY-r.top)/r.height-.5)*30,((e.clientX-r.left)/r.width-.5)*30)});
}
$("cardShare").onclick=async()=>{
  const v=COL.types[cardK];if(!v)return;
  const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  try{await document.fonts.ready}catch(e){}
  x.fillStyle="#05070f";x.fillRect(0,0,W,H);
  const cols={c:["#2b3a67","#16213e"],u:["#0f4c81","#6dd5fa"],r:["#41295a","#ff4fd8"],l:["#b8860b","#fff3b0"]}[v.r];
  const g=x.createLinearGradient(140,300,940,1500);g.addColorStop(0,cols[0]);g.addColorStop(1,cols[1]);
  x.fillStyle=g;rr(x,140,300,800,1100,60);x.fill();
  const sh=x.createLinearGradient(140,300,940,1400);sh.addColorStop(.35,"rgba(255,255,255,0)");sh.addColorStop(.5,"rgba(255,255,255,.35)");sh.addColorStop(.65,"rgba(255,255,255,0)");x.fillStyle=sh;rr(x,140,300,800,1100,60);x.fill();
  x.strokeStyle="rgba(255,255,255,.5)";x.lineWidth=4;rr(x,140,300,800,1100,60);x.stroke();
  x.fillStyle="#fff";x.textAlign="center";x.font="260px sans-serif";x.fillText(cardEmoji(cardK),540,780);
  x.font="700 34px Inter, sans-serif";x.fillText(RAR[v.r].n.toUpperCase(),540,420);
  let fs=72;x.font=`900 ${fs}px Unbounded, sans-serif`;while(x.measureText(v.name||cardK).width>700&&fs>40){fs-=6;x.font=`900 ${fs}px Unbounded, sans-serif`}x.fillText(v.name||cardK,540,1020);
  x.font="500 38px Inter, sans-serif";x.fillText(`${cardK}${SEATS[cardK]?" · "+SEATS[cardK]+" miest":""} · ulovené ${v.n}×`,540,1100);
  x.fillStyle="#6dffc7";x.font="900 60px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",540,1640);
  x.fillStyle="rgba(255,255,255,.8)";x.font="500 36px Inter, sans-serif";x.fillText("Ulovil som ho nad hlavou → "+location.host,540,1710);
  c.toBlob(b=>b&&shareBlob(b,"kartička.png","Nová kartička v zbierke: "+(v.name||cardK)+" "+cardEmoji(cardK)+" "+location.href),"image/png");
};
