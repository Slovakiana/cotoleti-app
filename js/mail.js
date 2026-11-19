"use strict";
/* ============ ✉️ Lietadlo ako poštár ============ */
const MAILS=["Pekný deň! ☀️","Pozdrav zo Slovenska 🇸🇰","Šťastnú cestu! ✈️","Mávam ti zdola 👋","Dobrú noc 🌙","Ľúbim ťa ❤️","Usmej sa 😊","Si super! 🔥","Bezpečný let 🙏","Ahoj z gauča 🛋️","Vidím ťa! 👀","Zober ma so sebou 🥺"];
const MAIL_EMO=["☀️","🇸🇰","✈️","👋","🌙","❤️","😊","🔥","🙏","🛋️","👀","🥺"];
const POSTQ=[];let postCur=null;
function openMail(){
  const a=S.top;if(!a){toast("Nič nad tebou nelieta","Počkaj na lietadlo");return}
  const rt=routeOf(a);
  $("mailTo").textContent=`Lietadlo ${rt?"→ "+citySk(rt.destination.municipality):titleOf(a)} ho doručí ľuďom, nad ktorými preletí`;
  $("mailList").innerHTML=MAILS.map((m,i)=>`<button data-i="${i}">${esc(m)}</button>`).join("");
  $("mailM").classList.add("on");haptic(8);
}
$("mailClose").onclick=()=>$("mailM").classList.remove("on");
$("mailList").onclick=async e=>{
  const b=e.target.closest("button");if(!b)return;const i=+b.dataset.i,a=S.top;$("mailM").classList.remove("on");if(!a)return;
  haptic([20,40,20]);flyEmoji("✉️",$("b-wave"));
  if(!SOC.api){toast("✉️ Pozdrav odoslaný","");return}
  try{
    const r=await apiPost("/api/mail",{hex:a.hex,msg:i,...posR(),nick:LS.get("ctl_nick","")});
    const j=await r.json();
    if(j.dup)toast("✉️ Tomuto lietadlu si už pozdrav dal","Skús ďalšie lietadlo");
    else if(j.error==="limit")toast("Na dnes stačilo 😊","Pošli ďalšie zajtra");
    else if(j.error==="far")toast("Toto lietadlo je od teba priďaleko","Pozdrav pošli lietadlu nad tebou");
    else if(j.error)toast("Pozdrav sa nepodarilo poslať","Skús o chvíľu");
    else{toast("✉️ Pozdrav je na palube!","Keď ho lietadlo doručí, dáme ti vedieť 📬");grantAch("mail");if(typeof dailyEvent==="function")dailyEvent("mail");COL.pts+=3;LS.set("ctl_col",COL);setTimeout(socPoll,800)}
  }catch(err){toast("Pozdrav sa nepodarilo poslať","Skús znova")}
};
function showPost(){
  if(postCur||!POSTQ.length)return;postCur=POSTQ.shift();const m=postCur,pl=S.list.find(x=>x.hex===m.hex);
  $("postCard").innerHTML=`<div class="stamp">${esc(m.emoji||"✉️")}</div><div class="k">✉️ Lietadlo ti prinieslo pozdrav</div>
    <div class="m">${esc(MAILS[m.msg]||"Ahoj!")}</div><div class="f">od <b>${esc(m.nick||"niekoho")}</b>${m.town?" · "+esc(m.town):m.k&&KRAJ[m.k]?" · "+esc(KRAJ[m.k][2])+" kraj":""}</div>
    <div class="via">✈️ doručil ${esc(pl?[airlineOf(pl),titleOf(pl)].filter(Boolean).join(" "):"let nad tebou")} · ${new Date().toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}</div>`;
  $("postM").classList.add("on");haptic([30,60,30]);ping("r");grantAch("post");
}
$("postClose").onclick=()=>{$("postM").classList.remove("on");postCur=null;setTimeout(showPost,400)};
$("postReply").onclick=()=>{$("postM").classList.remove("on");postCur=null;openMail()};
$("postShare").onclick=()=>{
  const m=postCur;if(!m)return;const W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#1b2a6b");g.addColorStop(1,"#ff8a4f");x.fillStyle=g;x.fillRect(0,0,W,H);
  x.fillStyle="#fff8ec";rr(x,90,460,900,900,50);x.fill();x.setLineDash([18,14]);x.strokeStyle="rgba(193,120,40,.5)";x.lineWidth=5;rr(x,120,490,840,840,36);x.stroke();x.setLineDash([]);
  x.fillStyle="#b06a1e";x.font="700 34px Inter, sans-serif";x.textAlign="left";x.fillText("✉️ LIETADLO MI PRINIESLO POZDRAV",160,600);
  x.fillStyle="#2b1d0e";x.font="900 76px Unbounded, sans-serif";wrapText(x,MAILS[m.msg]||"Ahoj!",160,760,760,92,3);
  x.fillStyle="#6b4a2a";x.font="500 40px Inter, sans-serif";x.fillText("od "+(m.nick||"niekoho")+(m.town?" · "+m.town:""),160,1180);
  x.font="160px sans-serif";x.textAlign="right";x.fillText(m.emoji||"✉️",940,1290);
  x.textAlign="center";x.fillStyle="#fff";x.font="900 60px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,H-200);
  x.font="500 36px Inter, sans-serif";x.fillText("Lietadlá roznášajú pozdravy po Slovensku → "+location.host,W/2,H-130);
  c.toBlob(b=>b&&shareBlob(b,"pozdrav.png","Lietadlo mi prinieslo pozdrav "+(m.town?"z "+m.town:"")+" ✉️✈️ "+location.href),"image/png");
};
ACH.push({id:"mail",i:"✉️",n:"Prvý pozdrav lietadlom",c:()=>false},{id:"post",i:"📬",n:"Prišiel mi pozdrav",c:()=>false});
if(typeof DAILY_POOL!=="undefined")DAILY_POOL.push({id:"mail",i:"✉️",n:"Pošli pozdrav lietadlom",h:"Mávni → ✉️",ev:true});
HOOKS.social=HOOKS.social||[];
HOOKS.social.push(D=>{
  (D.mailsIn||[]).forEach(m=>POSTQ.push(m));showPost();
  const out=D.mailsOut||[];
  if(out.length){const places=[...new Set(out.map(o=>o.town||(KRAJ[o.k]?KRAJ[o.k][2]+" kraj":"Slovensko")))];toast("📬 Tvoj pozdrav doručený!","Lietadlo ho prinieslo: "+places.join(", "),"#ffcf8a");confetti(40)}
});
