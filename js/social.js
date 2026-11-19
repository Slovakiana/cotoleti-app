"use strict";
/* ============ 👋 Mávanie lietadlám + živé Slovensko ============ */
const SOC={api:MYPROXY||"",data:null,busy:false,waved:LS.get("ctl_waved",{}),local:{}};
SOC.cid=LS.get("ctl_cid",null)||(()=>{const v=(Math.random().toString(36).slice(2)+Date.now().toString(36)+Math.random().toString(36).slice(2)).slice(0,24);LS.set("ctl_cid",v);return v})();
const KRAJ={BA:[48.15,17.11,"Bratislavský"],TT:[48.38,17.59,"Trnavský"],TN:[48.89,18.04,"Trenčiansky"],NR:[48.31,18.08,"Nitriansky"],ZA:[49.22,18.74,"Žilinský"],BB:[48.74,19.15,"Banskobystrický"],PO:[49.0,21.24,"Prešovský"],KE:[48.72,21.26,"Košický"],XX:[0,0,"Zo zahraničia"]};
function krajOf(p){
  if(!p||p.lat<47.72||p.lat>49.62||p.lon<16.83||p.lon>22.57)return "XX";
  let best="BA",bd=1e9;
  for(const [k,v] of Object.entries(KRAJ)){if(k==="XX")continue;const d=Math.hypot(p.lat-v[0],(p.lon-v[1])*Math.cos(rad(48.7)));if(d<bd){bd=d;best=k}}
  return best;
}
const dayKey=()=>new Date().toISOString().slice(0,10);
const ludia=n=>n===1?"človek":n>=2&&n<=4?"ľudia":"ľudí";

ACH.push({id:"wave",i:"👋",n:"Prvé mávnutie",c:()=>false},{id:"wave10",i:"🙌",n:"10 mávnutí",c:()=>false});
if(typeof DAILY_POOL!=="undefined")DAILY_POOL.push({id:"wave",i:"👋",n:"Zamávaj lietadlu",h:"Ťukni na „Mávni“ pri lietadle nad tebou",ev:true});

async function socPoll(){
  if(!SOC.api||SOC.busy||document.hidden)return;
  SOC.busy=true;
  try{
    const hs=S.list.filter(a=>a.el>0).slice(0,15).map(a=>a.hex);
    if(typeof TR!=="undefined"&&TR&&TR.hex&&!hs.includes(TR.hex))hs.push(TR.hex);
    const fr=LS.get("ctl_friends",[]).map(f=>f.id).filter(Boolean).slice(0,40).join(",");
    const r=await fetch(`${SOC.api}/api/sky?id=${SOC.cid}&k=${krajOf(S.pos)}&town=${encodeURIComponent(typeof townOf==="function"?townOf(S.pos):"")}&hexes=${hs.join(",")}${fr?"&f="+fr:""}`,{cache:"no-store"});
    if(r.ok){SOC.data=await r.json();socRender()}
  }catch(e){}
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
    $("liveLine").innerHTML=`🟢 ${nf(a)} ${ludia(a)} na Slovensku práve ${a===1?"pozerá":a<5?"pozerajú":"pozerá"} hore`+(w?` · 👋 ${nf(w)} dnes`:"");
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
  const bar=(name,n,max,me,i)=>`<div class="kr${me?" me":""}"><div class="nm">${i===0?"👑 ":""}${esc(name)}</div><div class="bar"><i style="width:${max?n/max*100:0}%"></i></div><div class="v">${nf(n)}</div></div>`;
  let rows=[];
  if(LG==="k"){const me=krajOf(S.pos);rows=(D.kraje||[]).filter(x=>x.n>0).slice(0,9).map(x=>[(KRAJ[x.k]||KRAJ.XX)[2],x.n,x.k===me])}
  else if(LG==="m"){const me=typeof townOf==="function"?townOf(S.pos):"";rows=(D.towns||[]).map(x=>[x.town,x.n,x.town===me])}
  else rows=(D.teamsTop||[]).map(x=>[x.name,x.n,x.me]);
  const max=Math.max(1,...rows.map(r=>r[1]));
  $("kraje").innerHTML=rows.length?rows.map((r,i)=>bar(r[0],r[1],max,r[2],i)).join(""):`<div class="lookSub" style="padding:8px 0">${LG==="t"?"Tento týždeň zatiaľ žiadny tím nemával. Založ si tím v sekcii Ja 👥":"Dnes ešte nikto nemával. Buď prvý 👋"}</div>`;
}
$("lgTabs").onclick=e=>{const b=e.target.closest("button");if(!b)return;LG=b.dataset.t;[...$("lgTabs").children].forEach(x=>x.classList.toggle("on",x===b));renderLeague();haptic(6)};
function waveInfo(a){
  if(!SOC.api){$("waveInfo").textContent="";return}
  if(!a){$("waveInfo").textContent="";$("waveN").style.display="none";return}
  const p=planeWaves(a.hex),mine=SOC.waved[dayKey()+a.hex];
  $("waveN").style.display=p.total?"":"none";$("waveN").textContent=nf(p.total);
  const em=Object.entries(p.emoji||{}).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([e,n])=>e+" "+n).join("  ");
  const fr=SOC.data&&SOC.data.friends&&SOC.data.friends[a.hex];
  const frTxt=fr&&fr.length?`<div class="frLine">👯 ${fr.slice(0,3).map(f=>esc(f.n)).join(", ")} ${fr.length===1?"mu zamával":"mu zamávali"} ${(()=>{const m=Math.round((Date.now()-Math.max(...fr.map(f=>f.t)))/60000);return m<1?"práve teraz":"pred "+m+" min"})()}</div>`:"";
  const mOn=SOC.data&&SOC.data.mailOn&&SOC.data.mailOn[a.hex];
  const mailTxt=mOn?`<div class="frLine" style="color:#ffcf8a">✉️ Nesie ${mOn} ${mOn===1?"pozdrav":mOn<5?"pozdravy":"pozdravov"} po Slovensku</div>`:"";
  $("waveInfo").innerHTML=(p.total?`${mine?"Ty a ďalší – zamávalo":"Zamávalo"} mu už <b>${nf(p.total)} ${ludia(p.total)}</b> · ${em}`:"Buď prvý, kto mu dnes zamáva 👋")+frTxt+mailTxt;
}
HOOKS.heroStatic.push(a=>waveInfo(a));

function flyEmoji(e,fromEl){
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
  const key=dayKey()+a.hex,already=!!SOC.waved[key];
  if(!already){
    SOC.waved[key]=e;
    // upratovanie starých záznamov
    for(const k of Object.keys(SOC.waved))if(k.slice(0,10)!==dayKey())delete SOC.waved[k];
    LS.set("ctl_waved",SOC.waved);
    const cur=planeWaves(a.hex),em={...cur.emoji};em[e]=(em[e]||0)+1;SOC.local[a.hex]={total:cur.total+1,emoji:em};
    COL.pts+=2;LS.set("ctl_col",COL);
    const n=(LS.get("ctl_waveN",0)|0)+1;LS.set("ctl_waveN",n);
    grantAch("wave");if(n>=10)grantAch("wave10");
    if(typeof dailyEvent==="function")dailyEvent("wave");
  }
  waveInfo(a);
  const rt=routeOf(a),to=rt?" → "+citySk(rt.destination.municipality):"";
  if(already){toast(e+" Zamával si znova","Lietadlu"+to+" si už dnes zamával – počíta sa raz");return}
  ping("u");
  if(!SOC.api){toast(e+" Zamával si lietadlu"+to,"+2 body");return}
  try{
    const r=await fetch(`${SOC.api}/api/wave`,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({hex:a.hex,id:SOC.cid,emoji:e,k:krajOf(S.pos),nick:LS.get("ctl_nick",""),town:typeof townOf==="function"?townOf(S.pos):"",call:a.call||"",type:a.type||"",dest:rt?citySk(rt.destination.municipality):""})});
    const j=await r.json();
    if(j&&j.golden&&typeof goldenWon==="function")goldenWon(a);
    if(j&&j.plane){SOC.data=SOC.data||{planes:{}};SOC.data.planes=SOC.data.planes||{};SOC.data.planes[a.hex]=j.plane;delete SOC.local[a.hex];waveInfo(a)}
    const tot=j&&j.plane?j.plane.total:1;
    toast(e+" Zamával si lietadlu"+to,tot>1?`Si ${nf(tot)}. človek zo Slovenska, ktorý mu dnes zamával`:"Si prvý, kto mu dnes zamával! +2 body");
    setTimeout(socPoll,800);
  }catch(err){toast(e+" Zamával si lietadlu"+to,"+2 body")}
}
$("b-wave").onclick=()=>{if(!S.top)return;haptic(8);$("wavePick").classList.toggle("on")};
$("wavePick").onclick=ev=>{const b=ev.target.closest("button");if(!b)return;if(b.dataset.mail){$("wavePick").classList.remove("on");if(typeof openMail==="function")openMail();return}doWave(b.textContent)};
if(SOC.api){setInterval(socPoll,20000);setTimeout(socPoll,2500);document.addEventListener("visibilitychange",()=>{if(!document.hidden)socPoll()})}
