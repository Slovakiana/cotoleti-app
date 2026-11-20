"use strict";
/* ============ 👋 Mávanie lietadlám + živé Slovensko ============ */
const SOC={api:MYPROXY||"",data:null,busy:false,waved:LS.get("ctl_waved",{}),local:{}};
// tajné id (nikdy neodchádza v odkazoch) – staré id z odkazov sa nahrádza novým
SOC.cid=(()=>{let v=LS.get("ctl_cid","");if(!/^v2[A-Za-z0-9]{30}$/.test(v)){const b=new Uint8Array(24);crypto.getRandomValues(b);v="v2"+Array.from(b,x=>"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"[x%56]).join("").slice(0,30);LS.set("ctl_cid",v);LS.set("ctl_tok","");LS.set("ctl_pid","")}return v})();
/* identita: server vydá podpísaný token, bez neho sa nič nezapočíta */
let TOK=LS.get("ctl_tok",""),PID=LS.get("ctl_pid",""),FK=LS.get("ctl_fk","");
async function ensureTok(){
  if((TOK&&FK)||!SOC.api)return TOK;
  try{const r=await fetch(SOC.api+"/api/hello",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({id:SOC.cid})});const j=await r.json();if(j.tok){TOK=j.tok;LS.set("ctl_tok",TOK);PID=j.pid||"";LS.set("ctl_pid",PID);FK=j.fk||"";LS.set("ctl_fk",FK)}}catch(e){}
  return TOK;
}
async function apiPost(path,obj){
  await ensureTok();
  const r=await fetch(SOC.api+path,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({...obj,id:SOC.cid,tok:TOK})});
  if(r.status===401){TOK="";LS.set("ctl_tok","")}
  return r;
}
const posR=()=>S.pos?{lat:Math.round(S.pos.lat*100)/100,lon:Math.round(S.pos.lon*100)/100}:{};
const KRAJ={BA:[48.15,17.11,"Bratislavský"],TT:[48.38,17.59,"Trnavský"],TN:[48.89,18.04,"Trenčiansky"],NR:[48.31,18.08,"Nitriansky"],ZA:[49.22,18.74,"Žilinský"],BB:[48.74,19.15,"Banskobystrický"],PO:[49.0,21.24,"Prešovský"],KE:[48.72,21.26,"Košický"],XX:[0,0,"Zo zahraničia"]};
function krajOf(p){
  if(!p||p.lat<47.72||p.lat>49.62||p.lon<16.83||p.lon>22.57)return "XX";
  let best="BA",bd=1e9;
  for(const [k,v] of Object.entries(KRAJ)){if(k==="XX")continue;const d=Math.hypot(p.lat-v[0],(p.lon-v[1])*Math.cos(rad(48.7)));if(d<bd){bd=d;best=k}}
  return best;
}
const dayKey=()=>new Date().toLocaleDateString("sv-SE");
const ludia=n=>n===1?"človek":n>=2&&n<=4?"ľudia":"ľudí";

ACH.push({id:"wave",i:"👋",n:"Prvé mávnutie",c:()=>false},{id:"wave10",i:"🙌",n:"10 mávnutí",c:()=>false},{id:"recruit",i:"🤝",n:"Náborár (pozval si kamaráta)",c:()=>false});
if(typeof DAILY_POOL!=="undefined")DAILY_POOL.push({id:"wave",i:"👋",n:"Zamávaj lietadlu",h:"Ťukni na „Mávni“ pri lietadle nad tebou",ev:true});

async function socPoll(){
  if(!SOC.api||SOC.busy||document.hidden)return;
  SOC.busy=true;
  try{
    const hs=S.list.filter(a=>a.el>0).slice(0,15).map(a=>a.hex);
    if(typeof TR!=="undefined"&&TR&&TR.hex&&!hs.includes(TR.hex))hs.push(TR.hex);
    await ensureTok();const pr=posR();
    const r=await fetch(`${SOC.api}/api/sky?id=${SOC.cid}&tok=${encodeURIComponent(TOK)}${pr.lat!=null?`&lat=${pr.lat}&lon=${pr.lon}`:""}&hexes=${hs.join(",")}`,{cache:"no-store"});
    if(r.ok){SOC.back=1;SOC.data=await r.json();socRender();if(SOC.data.myInvites>0)grantAch("recruit")}
    else if(r.status===429||r.status>=500)SOC.back=Math.min(8,(SOC.back||1)*2);
  }catch(e){SOC.back=Math.min(8,(SOC.back||1)*2)}
  SOC.busy=false;
}
function planeWaves(hex){
  const d=SOC.data&&SOC.data.planes&&SOC.data.planes[hex],l=SOC.local[hex];
  if(!d&&!l)return {total:0,emoji:{}};
  if(!d)return l;if(!l)return d;
  return d.total>=l.total?d:l;
}
function socRender(){
  const D=SOC.data;
  if(D){
    const a=D.active||0,w=D.wavesToday||0;
    $("liveLine").innerHTML=(a?`🟢 ${nf(a)} ${ludia(a)} na Slovensku práve ${a===1?"pozerá":a<5?"pozerajú":"pozerá"} hore`:"🟢 Buď prvý, kto sa dnes pozrie hore")+(w?` · 👋 ${nf(w)} dnes`:"");
    const kr=(D.kraje||[]).filter(x=>x.n>0);
    $("krajeCard").style.display=kr.length||D.allTime?"":"none";
    const rec=D.record;
    $("recBox").innerHTML=rec&&rec.n?`<div class="recBar"><i style="width:${Math.min(100,w/rec.n*100)}%"></i></div><div class="recLine">${w>rec.n?"🏆 <b>NOVÝ NÁRODNÝ REKORD!</b>":"🏆 Rekord dňa: "+nf(rec.n)+" ("+new Date(rec.day).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+") · chýba "+nf(Math.max(0,rec.n-w+1))}</div><div class="recLine">Spolu sme už zamávali ${nf(D.allTime||0)}× 🇸🇰</div>`:(D.allTime?`<div class="recLine">Spolu sme už zamávali ${nf(D.allTime)}× 🇸🇰</div>`:"");
    if(rec&&rec.n&&w>rec.n&&LS.get("ctl_recCel","")!==dayKey()){LS.set("ctl_recCel",dayKey());toast("🇸🇰 NOVÝ NÁRODNÝ REKORD!","Dnes sme zamávali už "+nf(w)+"× – viac ako kedykoľvek predtým","#ffcf4f");confetti(90)}
    renderLeague();
  }
  waveInfo(S.top);
  if(D&&HOOKS.social)HOOKS.social.forEach(f=>{try{f(D)}catch(e){console.error(e)}});
}
let LG="k";
function renderLeague(){
  const D=SOC.data;if(!D)return;
  const bar=(name,n,max,me,i,rep)=>`<div class="kr${me?" me":""}"><div class="nm">${i===0?"👑 ":""}${esc(name)}${rep?` <button class="rep" data-rep="${esc(name)}" aria-label="Nahlásiť nevhodný názov">🚩</button>`:""}</div><div class="bar"><i style="width:${max?n/max*100:0}%"></i></div><div class="v">${nf(n)}</div></div>`;
  let rows=[];
  if(LG==="k"||LG==="w"){const me=krajOf(S.pos);rows=((LG==="w"?D.krajeWeek:D.kraje)||[]).filter(x=>x.n>0&&x.k!=="XX").slice(0,8).map(x=>[(KRAJ[x.k]||KRAJ.XX)[2],x.n,x.k===me])}
  else if(LG==="m"){const me=typeof townOf==="function"?townOf(S.pos):"";rows=(D.towns||[]).map(x=>[x.town,x.n,x.town===me])}
  else rows=(D.teamsTop||[]).map(x=>[x.name,x.n,x.me,!x.me]);
  const max=Math.max(1,...rows.map(r=>r[1]));
  $("kraje").innerHTML=rows.length?rows.map((r,i)=>bar(r[0],r[1],max,r[2],i,r[3])).join(""):`<div class="lookSub" style="padding:8px 0">${LG==="t"?"Tento týždeň zatiaľ žiadny tím nemával. Založ si tím v sekcii Ja 👥":"Dnes ešte nikto nemával. Buď prvý 👋"}</div>`;
}
$("kraje").onclick=e=>{const b=e.target.closest("[data-rep]");if(b)reportName(b.dataset.rep,b)};
// nahlásenie nevhodného mena (po 3 nahláseniach od rôznych ľudí zmizne všade)
async function reportName(name,btn){
  if(!name)return;if(btn&&!btn.dataset.arm){btn.dataset.arm=1;btn.textContent="Nahlásiť?";setTimeout(()=>{if(btn.isConnected){btn.textContent="🚩";delete btn.dataset.arm}},3500);return}
  try{await apiPost("/api/report",{name})}catch(e){}
  if(btn)btn.remove();toast("🚩 Ďakujeme za nahlásenie","Ak to nahlásia viacerí, meno zmizne");
}
$("lgTabs").onclick=e=>{const b=e.target.closest("button");if(!b)return;LG=b.dataset.t;[...$("lgTabs").children].forEach(x=>x.classList.toggle("on",x===b));renderLeague();haptic(6)};
function waveInfo(a){
  if(!SOC.api){$("waveInfo").textContent="";return}
  if(!a){$("waveInfo").textContent="";$("waveN").style.display="none";return}
  const p=planeWaves(a.hex),mine=SOC.waved[dayKey()+a.hex];
  $("waveN").style.display=p.total?"":"none";$("waveN").textContent=nf(p.total);
  const em=Object.entries(p.emoji||{}).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([e,n])=>e+" "+n).join("  ");
  const fr=SOC.data&&SOC.data.friends&&SOC.data.friends[a.hex];
  const frTxt=fr&&fr.length?`<div class="frLine">👯 ${fr.slice(0,3).map(f=>esc(f.n)).join(", ")} ${fr.length===1?"mu dnes zamával":"mu dnes zamávali"}</div>`:"";
  const mOn=SOC.data&&SOC.data.mailOn&&SOC.data.mailOn[a.hex];
  const mailTxt=mOn?`<div class="frLine" style="color:#ffcf8a">✉️ Nesie ${mOn} ${mOn===1?"pozdrav":mOn<5?"pozdravy":"pozdravov"} po Slovensku</div>`:"";
  $("waveInfo").innerHTML=(p.total?`${mine?"Ty a ďalší – zamávalo":"Zamávalo"} mu už <b>${nf(p.total)} ${ludia(p.total)}</b> · ${em}`:"Buď prvý, kto mu dnes zamáva 👋")+frTxt+mailTxt;
}
HOOKS.heroStatic.push(a=>waveInfo(a));

function flyEmoji(e,fromEl){
  if(typeof RM==="function"&&RM())return;
  const r=fromEl.getBoundingClientRect(),top=SKY.pts.find(p=>S.top&&p.hex===S.top.hex),cv=$("sky").getBoundingClientRect();
  const tx=top?cv.left+top.x:innerWidth/2,ty=top?cv.top+top.y:80;
  for(let i=0;i<7;i++){
    const el=document.createElement("div");el.className="flyE";el.textContent=e;
    const sx=r.left+r.width/2-17+(Math.random()*40-20),sy=r.top-10;
    el.style.left=sx+"px";el.style.top=sy+"px";el.style.animationDelay=i*70+"ms";
    el.style.setProperty("--fx",(tx-sx-17+(Math.random()*30-15))+"px");el.style.setProperty("--fy",(ty-sy-17)+"px");
    document.body.appendChild(el);setTimeout(()=>el.remove(),1600+i*70);
  }
}
async function doWave(e){
  const a=S.top;if(!a)return;
  $("wavePick").classList.remove("on");
  haptic([18,40,18]);flyEmoji(e,$("b-wave"));
  if(a.santa){toast("🎅 Ho-ho-ho!","Santa ti zamával späť 👋","#ff4f6d");grantAch("santa");confetti(60);return}
  const key=dayKey()+a.hex,already=!!SOC.waved[key];
  const rt=routeOf(a),to=rt?" → "+citySk(rt.destination.municipality):"";
  if(already){toast(e+" Zamával si znova","Lietadlu"+to+" si už dnes zamával – počíta sa raz");return}
  ping("u");
  // body a výzvy sa pripíšu až keď server mávnutie prijme (alebo keď sme offline)
  const credit=()=>{
    SOC.waved[key]=e;
    for(const k of Object.keys(SOC.waved))if(k.slice(0,10)!==dayKey())delete SOC.waved[k];
    LS.set("ctl_waved",SOC.waved);
    COL.pts+=2;LS.set("ctl_col",COL);
    const n=(LS.get("ctl_waveN",0)|0)+1;LS.set("ctl_waveN",n);
    grantAch("wave");if(n>=10)grantAch("wave10");ev("wave1");
    if(typeof dailyEvent==="function")dailyEvent("wave");
    if(typeof maybeAskPush==="function")setTimeout(maybeAskPush,4000);
  };
  if(!SOC.api){credit();toast(e+" Zamával si lietadlu"+to,"+2 body");return}
  let r,j={};
  try{
    const body={hex:a.hex,emoji:e,...posR(),gps:!S.manual,nick:LS.get("ctl_nick",""),call:a.call||"",type:a.type||"",dest:rt?citySk(rt.destination.municipality):""};
    r=await apiPost("/api/wave",body);
    if(r.status===401)r=await apiPost("/api/wave",body); // nový token a ešte raz
    j=await r.json().catch(()=>({}));
  }catch(err){ // bez internetu – mávnutie platí aspoň u teba
    credit();const cur=planeWaves(a.hex),em={...cur.emoji};em[e]=(em[e]||0)+1;SOC.local[a.hex]={total:cur.total+1,emoji:em};waveInfo(a);
    toast(e+" Zamával si lietadlu"+to,"+2 body (offline)");return}
  if(j.error==="far"){toast("Toto lietadlo je od teba priďaleko","Mávať sa dá len lietadlám nad tebou");return}
  if(j.error==="rate"){toast("Pomalšie 🙂","Skús o chvíľu");return}
  if(!r.ok||!j.ok){toast("Mávnutie sa nepodarilo odoslať","Skús to o chvíľu znova");return}
  credit();
  if(j.golden&&typeof goldenWon==="function")goldenWon(a);
  if(j.plane){SOC.data=SOC.data||{planes:{}};SOC.data.planes=SOC.data.planes||{};SOC.data.planes[a.hex]=j.plane;delete SOC.local[a.hex]}
  waveInfo(a);
  const tot=j.plane?j.plane.total:1;
  toast(e+" Zamával si lietadlu"+to,tot>1?`Si ${nf(tot)}. človek zo Slovenska, ktorý mu dnes zamával · +2 b`:"Si prvý, kto mu dnes zamával! +2 body");
  setTimeout(socPoll,800);
}
$("b-wave").onclick=()=>{if(!S.top)return;haptic(8);$("wavePick").classList.toggle("on")};
$("wavePick").onclick=ev=>{const b=ev.target.closest("button");if(!b)return;if(b.dataset.mail){$("wavePick").classList.remove("on");if(typeof openMail==="function")openMail();return}doWave(b.textContent)};
if(SOC.api){(function loop(){setTimeout(async()=>{if(!document.hidden)await socPoll();loop()},(45000+Math.random()*18000-9000)*Math.min(8,SOC.back||1))})();setTimeout(socPoll,2500);document.addEventListener("visibilitychange",()=>{if(!document.hidden)socPoll()})}
