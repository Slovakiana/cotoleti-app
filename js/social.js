"use strict";
/* ============ 👋 Mávanie lietadlám + živé Slovensko ============ */
const SOC={api:MYPROXY||"",data:null,busy:false,waved:LS.get("ctl_waved",{}),local:{}};
// tajné id (nikdy neodchádza v odkazoch) – staré id z odkazov sa nahrádza novým
SOC.cid=(()=>{let v=LS.get("ctl_cid","");// pozor: staré id majú 26 znakov (24 B) – musia ostať platné, inak by appka pri každom spustení vyrobila nového hráča
if(!/^v2[A-Za-z0-9]{24,30}$/.test(v)){const b=new Uint8Array(30);crypto.getRandomValues(b);v="v2"+Array.from(b,x=>"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"[x%56]).join("").slice(0,30);LS.set("ctl_cid",v);LS.set("ctl_tok","");LS.set("ctl_pid","")}return v})();
/* identita: server vydá podpísaný token, bez neho sa nič nezapočíta */
let TOK=LS.get("ctl_tok",""),PID=LS.get("ctl_pid",""),FK=LS.get("ctl_fk","");
// pozvánkový kľúč platí 24 h – obnov ho, ak je starší
if(Date.now()-LS.get("ctl_fkT",0)>12*3600e3)FK="";
function newIdentity(){["ctl_cid","ctl_tok","ctl_pid","ctl_fk"].forEach(k=>LS.set(k,""));location.reload()}
// Overenie identity po štarte, návrate z pozadia a návrate internetu.
// Neplatnosť účtu potvrdzuje výhradne server; výpadok siete nikdy nemaže zbierku.
SOC.authVerified=false;SOC.authChecked=0;SOC.resetting=false;SOC.moved=false;
async function ensureTok(force=false){
  if(!SOC.api||SOC.resetting||SOC.moved)return "";
  if(SOC.helloP)return SOC.helloP;
  if(!force&&TOK&&FK&&SOC.authVerified&&Date.now()-SOC.authChecked<60000)return TOK;
  if(!navigator.onLine)return "";
  if(SOC.helloNext&&Date.now()<SOC.helloNext)return "";
  SOC.helloP=(async()=>{
    const fail=er=>{SOC.helloErr=er;SOC.helloFail=(SOC.helloFail||0)+1;SOC.helloNext=Date.now()+Math.min(120e3,10e3*SOC.helloFail);SOC.authVerified=false;try{navigator.sendBeacon(DEFAULT_PROXY+"/api/err",JSON.stringify({m:"hello "+er}))}catch(x){}};
    try{
      const r=await fetch(SOC.api+"/api/hello",{method:"POST",headers:{"Content-Type":"text/plain"},cache:"no-store",body:JSON.stringify({id:SOC.cid,tok:LS.get("ctl_tok0",""),epoch:LS.get("ctl_reset_epoch",0),r:LS.get("ctl_ref",""),kid:typeof KID==="function"&&KID()?1:0})});
      const j=await r.json().catch(()=>({error:"json"}));
      if(r.status===409&&j.error==="reset"&&Number.isSafeInteger(j.epoch)&&j.epoch>Number(LS.get("ctl_reset_epoch",0))){
        // Presne overená vyššia generácia. Počas prechodu nepúšťame ďalšie API volania.
        SOC.resetting=true;SOC.authVerified=false;
        LSP.clear();try{for(const k of Object.keys(localStorage))if(k.startsWith("ctl_")||k.startsWith("nm_"))localStorage.removeItem(k)}catch(e){}
        LS.set("ctl_reset_epoch",j.epoch);TOK="";PID="";FK="";SOC.cid="";
        toast("🆕 Nová testovacia sezóna","Všetci hráči začínajú od nuly.");
        setTimeout(()=>location.reload(),150);
        return "";
      }
      if(j.error==="moved"&&r.status===401){
        // Prenos na iné zariadenie NESMIE sám zmazať lokálnu zbierku.
        SOC.moved=true;SOC.authVerified=false;
        toast("🔁 Účet je na inom zariadení","Táto zbierka ostala v mobile. Kontaktuj podporu pred vytvorením novej.");
        return "";
      }
      if(!r.ok||!j.tok||!j.pid){fail(r.status+"/"+(j.error||"?"));return ""}
      const was=!!SOC.helloFail;SOC.helloErr="";SOC.helloFail=0;SOC.helloNext=0;
      LS.set("ctl_reset_epoch",j.epoch||0);LS.set("ctl_tok0",j.tok);TOK=j.tok;LS.set("ctl_tok",TOK);
      PID=j.pid;LS.set("ctl_pid",PID);FK=j.fk||"";LS.set("ctl_fk",FK);LS.set("ctl_fkT",Date.now());
      SOC.authVerified=true;SOC.authChecked=Date.now();
      if(was)setTimeout(()=>typeof flushWq==="function"&&flushWq(),500);
    }catch(e){fail("net")}
    return SOC.authVerified?TOK:"";
  })().finally(()=>{SOC.helloP=null});
  return SOC.helloP;
}
async function apiPost(path,obj){
  const tok=await ensureTok();
  if(!tok||!SOC.authVerified||SOC.resetting||SOC.moved)throw Error("auth_pending");
  const r=await fetch(SOC.api+path,{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({...obj,id:SOC.cid,tok})});
  if(r.status===401){SOC.authVerified=false;SOC.authChecked=0;SOC.helloNext=0}
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
// deň podľa slovenského času (rovnako ako server), aj keď je mobil v inom pásme
const SKD=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava"});
const dayKey=()=>SKD.format(new Date());
const dayAgo=n=>SKD.format(new Date(Date.now()-n*864e5));
const ludia=n=>n===1?"človek":n>=2&&n<=4?"ľudia":"ľudí";
// sloveso k počtu ľudí: 1 zamával, 2–4 zamávali, 5+ zamávalo
const zam=n=>n===1?"zamával":n>=2&&n<=4?"zamávali":"zamávalo";

ACH.push({id:"discover",i:"🧭",n:"Objaviteľ – prvý na Slovensku",h:"Buď prvý na Slovensku, kto overí tento typ lietadla",c:()=>false},{id:"mayor",i:"🏛️",n:"Starosta oblohy",h:"Maj najviac mávnutí vo svojom meste za celý mesiac",c:()=>false},{id:"together",i:"👯",n:"Spoločné mávnutie s kamarátom",h:"Zamávaj tomu istému lietadlu ako tvoj kamarát",soc:1,c:()=>false},{id:"wave",i:"👋",n:"Prvé mávnutie",h:"Ťukni na 👋 Mávni pri lietadle nad tebou",pr:()=>[LS.get("ctl_waveN",0)|0,1],c:()=>(LS.get("ctl_waveN",0)|0)>=1},{id:"wave10",i:"🙌",n:"10 mávnutí",h:"Zamávaj 10-krát",pr:()=>[LS.get("ctl_waveN",0)|0,10],c:()=>(LS.get("ctl_waveN",0)|0)>=10},{id:"recruit",i:"🤝",n:"Náborár · priviesť kamaráta",h:"Pošli kamarátovi odkaz – keď si appku otvorí, odznak je tvoj",soc:1,c:()=>false});
if(typeof DAILY_POOL!=="undefined")DAILY_POOL.push({id:"wave",i:"👋",n:"Zamávaj lietadlu",h:"Ťukni na „Mávni“ pri lietadle nad tebou",ev:true});

async function socPoll(){
  if(!SOC.api||SOC.busy||document.hidden)return;
  SOC.busy=true;
  try{
    const hs=S.list.filter(a=>a.el>0).slice(0,15).map(a=>a.hex);
    if(typeof TR!=="undefined"&&TR&&TR.hex&&!hs.includes(TR.hex))hs.push(TR.hex);
    await ensureTok();const pr=posR();
    // id a token v tele požiadavky, nie v adrese (nekončia v záznamoch)
    const r=await fetch(`${SOC.api}/api/sky`,{method:"POST",cache:"no-store",headers:{"Content-Type":"text/plain"},body:JSON.stringify({id:SOC.cid,tok:TOK,...pr,hexes:hs.join(","),ad:LS.get("ctl_adopt","")||undefined})});
    if(r.ok){SOC.data=await r.json();SOC.back=SOC.data.flags&&SOC.data.flags.social==="min"?4:1;socRender();if(SOC.data.myInvites>0)grantAch("recruit");
      // 👋 koľko ľudí prišlo cez tvoje odkazy (a ozvi sa, keď pribudne)
      {const n=SOC.data.myInvites|0,was=LS.get("ctl_inv",0)|0,el=$("invCount");if(el){el.hidden=!n;el.textContent=n?`👋 Cez tvoje odkazy ${n===1?"prišiel":n<5?"prišli":"prišlo"} ${n} ${ludia(n)}`:""}
        // 🎁 za každého nového spottera cez tvoj odkaz +100 míľ
        if(n>was){LS.set("ctl_inv",n);if(LS.get("ctl_invSeen",0)){COL.mi=(COL.mi|0)+100*(n-was);LS.set("ctl_col",COL);toast("👋 Cez tvoj odkaz prišiel nový spotter!","+"+100*(n-was)+" míľ ✈ · spolu už "+n)}LS.set("ctl_invSeen",1)}}
      const gk=dayKey()+SOC.data.goldMine;if(SOC.data.goldMine&&LS.get("ctl_goldWon","")!==gk&&typeof goldenWon==="function")goldenWon(null)}
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

/* 🏆 Súťažný pulz: iba overené týždenné mávnutia z existujúcej divízie; bez nových herných odmien. */
function competitionPulseModel(j){
  if(!j||!j.div)return {eyebrow:"🏅 Tvoja týždenná liga",title:"Nastúp do divízie",detail:"Zamávaj overenému lietadlu s GPS a získaš prvé miesto v ligovej tabuľke.",pct:0};
  const rows=Array.isArray(j.rows)?j.rows:[],my=rows.find(r=>r.me);
  if(!my)return {eyebrow:"🏅 Divízia "+j.div,title:"Pozri svoje poradie",detail:"Prebieha aktualizácia výsledkov tvojej divízie.",pct:0};
  const rank=rows.findIndex(r=>r.me)+1,up=rank>1?rows[rank-2]:null,down=rank===1?rows[1]:null;
  const count=Math.max(1,j.of||rows.length),mine=Math.max(0,Number(my.w)||0);
  if(up){const gap=Math.max(1,Math.floor((Number(up.w)||0)-mine)+1);
    return {eyebrow:"🏅 Divízia "+j.div+" · "+rank+". z "+count,title:"Do vyššieho miesta: "+gap+" 👋",detail:"Najbližší súper: "+String(up.n||"Spotter")+". Rátajú sa overené mávnutia, najviac 25 za deň.",pct:Math.max(0,Math.min(100,Math.round(100*mine/Math.max(mine+gap,Number(up.w)||1))))};}
  if(down){const lead=Math.max(0,mine-(Number(down.w)||0));
    return {eyebrow:"👑 Divízia "+j.div+" · 1. z "+count,title:"Vedieš svoju divíziu!",detail:lead?"Pred druhým hráčom máš náskok "+lead+" 👋. Udrž si prvenstvo do konca týždňa.":"O prvenstvo sa delíš počtom mávnutí. Každý overený úlovok rozhoduje.",pct:100};}
  return {eyebrow:"🏅 Divízia "+j.div,title:"Si prvý v divízii 👑",detail:"Zatiaľ si tu sám. Pozvi ďalších spotterov a začnite súťažiť.",pct:100};
}
function renderCompetitionPulse(){
  const el=$("compPulse");if(!el||!SOC.api||!SOC.data)return;
  el.hidden=false;
  const old=SOC.dv,j=old&&old.j,model=competitionPulseModel(j);
  $("compPulseEyebrow").textContent=model.eyebrow;
  $("compPulseTitle").textContent=model.title;
  $("compPulseDetail").textContent=model.detail;
  $("compPulseBar").style.width=model.pct+"%";
  if(!old||Date.now()-old.t>120e3){
    if(!SOC.pulseLoading&&(!SOC.pulseRetry||Date.now()>SOC.pulseRetry)){
      SOC.pulseLoading=true;
      apiPost("/api/division",{}).then(r=>{if(!r.ok)throw Error("division "+r.status);return r.json()}).then(j=>{
        SOC.dv={t:Date.now(),j};SOC.pulseRetry=0;SOC.pulseLoading=false;
        renderCompetitionPulse();if(LG==="d")renderLeague();
      }).catch(()=>{SOC.pulseLoading=false;SOC.pulseRetry=Date.now()+120e3;
        $("compPulseDetail").textContent="Poradie sa teraz nedá obnoviť. Môžeš ďalej zbierať kartičky."});
    }
  }
}

function socRender(){
  const D=SOC.data;
  if(D){
    const a=D.active||0,w=D.wavesToday||0;
    $("liveLine").innerHTML=(a?`🟢 ${nf(a)} ${ludia(a)} na Slovensku práve ${a===1?"pozerá":a<5?"pozerajú":"pozerá"} hore`:"🟢 Buď prvý, kto sa dnes pozrie hore")+(w?` · 👋 ${nf(w)} dnes`:"");
    const kr=(D.kraje||[]).filter(x=>x.n>0);
    $("krajeCard").style.display=kr.length||D.allTime?"":"none";
    const rec=D.record;
    $("recBox").innerHTML=rec&&rec.n?`<div class="recBar"><i style="width:${Math.min(100,w/rec.n*100)}%"></i></div><div class="recLine">${w>rec.n?"🏆 <b>NOVÝ NÁRODNÝ REKORD!</b>":"🏆 Denný rekord: "+nf(rec.n)+" ("+new Date(rec.day).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+") · do rekordu chýba "+nf(Math.max(0,rec.n-w+1))+" 👋"}</div><div class="recLine">Spolu sme už zamávali ${nf(D.allTime||0)}× 🇸🇰</div>`:(D.allTime?`<div class="recLine">Spolu sme už zamávali ${nf(D.allTime)}× 🇸🇰</div>`:"");
    if(rec&&rec.n&&w>rec.n&&LS.get("ctl_recCel","")!==dayKey()){LS.set("ctl_recCel",dayKey());toast("🇸🇰 NOVÝ NÁRODNÝ REKORD!","Dnes sme zamávali už "+nf(w)+"× – viac ako kedykoľvek predtým","#ffcf4f");confetti(90)}
    renderLeague();renderMayor();renderAdopt();renderHidden();renderCompetitionPulse();
  }
  waveInfo(S.top);
  if(D&&HOOKS.social)HOOKS.social.forEach(f=>{try{f(D)}catch(e){console.error(e)}});
}
let LG="k";let LG_ATLAS_SCOPE="region";
// počet obyvateľov krajov (približne, ŠÚ SR 2024) – pre derby na obyvateľa
const KRAJ_POP={BA:736e3,TT:565e3,TN:570e3,NR:666e3,ZA:688e3,BB:615e3,PO:809e3,KE:778e3};
const LG_HEAD={k:"🇸🇰 Dnes mávalo Slovensko",w:"🇸🇰 Kraje tento týždeň",m:"🏙️ Mestá dnes",s:"🏘️ Menšie mestá dnes",a:"🃏 Zberatelia v kraji",d:"🏅 Tvoja divízia (30 hráčov)",f:"👯 Kamaráti tento týždeň",p:"⚖️ Kraje na hráča",o:"🏁 Derby krajov (na obyvateľa)",t:"👥 Tímy tento týždeň"};
const LG_RULES={
  k:"Do súťaže sa za deň započíta najviac 25 overených mávnutí od každého hráča (nie 25 na celý kraj). Ostatné mávnutia môžeš ďalej zbierať do Atlasu. Na ligu treba GPS na Slovensku; mesto sa na deň určí podľa prvého mávnutia.",
  w:"Súčet ligových mávnutí za týždeň (pondelok–nedeľa) s GPS na Slovensku; najviac 25 započítaných mávnutí denne od jedného hráča, nie od celého kraja.",
  m:"Mávnutia z GPS podľa mesta, kde si dnes prvýkrát zamával(a). Menšie mestá súťažia zvlášť.",
  s:"Mestá do 20 000 obyvateľov. Mávnutia z GPS podľa mesta prvého mávnutia dňa.",
  a:"V rebríčku sú iba typy lietadiel overené serverom pomocou GPS. Každý typ sa ráta raz: bežná 3, nezvyčajná 8, vzácna 25, epická 45, legendárna 80 bodov. Prvý overený typ na Slovensku pridá 100 b. Kraj sa určuje podľa miesta prvého overenia typu, nie aktuálneho pobytu hráča. Toto nie je zoznam všetkých používateľov.",
  f:"Overené mávnutia do ligy od pondelka. Kamaráti ste cez pozvánku – obaja ste ju potvrdili.",
  d:"Hráči sú zoradení podľa overených mávnutí od pondelka a rozdelení po 30 – súperíš s ľuďmi, ktorí mávajú podobne ako ty. Ako mávaš, posúvaš sa medzi divíziami.",
  p:"Mávnutia kraja delené počtom aktívnych hráčov – aj malý kraj môže vyhrať.",
  o:"Mávnutia kraja tento týždeň na 100 000 obyvateľov (počty obyvateľov približne podľa ŠÚ SR) – férové derby veľkých aj malých krajov.",
  t:"Overené mávnutia do ligy všetkých členov tímu tento týždeň. Nový člen sa ráta od nasledujúceho dňa."};
// 📈 posun v poradí oproti predošlému dňu (len v mobile): „▲ 2 od včera“
function lgDelta(key,rank){const A=LS.get("ctl_lgRank",{}),d=dayKey(),o=A[key];if(!o||o.d!==d){A[key]={d,r:rank,p:o&&(key!=="d"||o.d>=SKD.format(new Date(Date.now()-((new Date().getDay()+6)%7)*864e5)))?o.r:0,l:o&&o.d===dayAgo(1)?"od včera":"od minule"};LS.set("ctl_lgRank",A)}else if(o.r!==rank){o.r=rank;LS.set("ctl_lgRank",A)}
  const p=A[key].p,l=A[key].l||"od včera";return !p||p===rank?"":p>rank?` · <b style="color:#7be08a">▲ ${p-rank}</b> ${l}`:` · <b style="color:#ff8a8a">▼ ${rank-p}</b> ${l}`}
function renderLeague(){
  const D=SOC.data;if(!D)return;let note="";
  if($("lgNote"))$("lgNote").innerHTML="";if($("lgAtlasScope"))$("lgAtlasScope").hidden=LG!=="a";if($("recBox"))$("recBox").style.display=LG==="k"?"":"none";if($("lgHead"))$("lgHead").textContent=LG==="a"&&LG_ATLAS_SCOPE==="sk"?"🇸🇰 Zberatelia na Slovensku":LG_HEAD[LG]||LG_HEAD.k;if($("lgRules"))$("lgRules").textContent=LG_RULES[LG]||LG_RULES.k;
  const bar=(name,n,max,me,i,rep,position)=>`<div class="kr${me?" me":""}"><div class="nm">${i===0?"👑 ":""}${LG==="a"?(position||i+1)+". ":""}${esc(String(name).split(" · ")[0])}${rep?`<button class="rep" data-rep="${esc(String(name).split(" · ")[0])}" aria-label="Nahlásiť nevhodný názov">🚩</button>`:""}${String(name).includes(" · ")?"<small>"+esc(String(name).split(" · ").slice(1).join(" · "))+"</small>":""}</div><div class="bar"><i style="width:${max?n/max*100:0}%"></i></div><div class="v">${nf(n,n%1?1:0)}</div></div>`;
  let rows=[];
  if(LG==="k"||LG==="w"){const me=krajOf(S.pos),all=((LG==="w"?D.krajeWeek:D.kraje)||[]).filter(x=>x.n>0&&x.k!=="XX");rows=all.slice(0,8).map(x=>[(KRAJ[x.k]||KRAJ.XX)[2],x.n,x.k===me]);
    const mi=all.findIndex(x=>x.k===me);if(mi>=8)rows.push([(mi+1)+". "+(KRAJ[me]||KRAJ.XX)[2]+" (tvoj kraj)",all[mi].n,true])}
  else if(LG==="a"){
    // 🃏 rebríček zberateľov v kraji: vzácnosť rôznych typov (overené serverom) + 100 b za každé prvenstvo v SR
    const kk=LG_ATLAS_SCOPE==="sk"?"":krajOf(S.pos);
    if($("lgAtlasScope"))$("lgAtlasScope").querySelectorAll("button[data-scope]").forEach(b=>{const on=b.dataset.scope===LG_ATLAS_SCOPE;b.classList.toggle("on",on);b.setAttribute("aria-pressed",String(on))});
    if(!SOC.atl||SOC.atl.k!==kk||Date.now()-SOC.atl.t>300e3){if(!SOC.atlL){SOC.atlL=1;apiPost("/api/atlasy",{k:kk}).then(r=>r.json()).then(j=>{SOC.atlL=0;if(!j||!j.top){SOC.atl={k:kk,t:Date.now()-270e3,err:1};if(LG==="a")renderLeague();return}SOC.atl={k:kk,t:Date.now(),j};if(LG==="a")renderLeague()}).catch(()=>{SOC.atlL=0;SOC.atl={k:kk,t:Date.now()-270e3,err:1};if(LG==="a")renderLeague()})}}
    if(SOC.atl&&SOC.atl.err){$("kraje").innerHTML='<div class="lookSub" style="padding:8px 0">Rebríček sa nepodarilo načítať. Skúsim znova o chvíľu.</div>';return}
    const j=SOC.atl&&SOC.atl.j;if(!j){$("kraje").innerHTML='<div class="lookSub" style="padding:8px 0">Načítavam…</div>';return}
    const kd=typeof KID==="function"&&KID();rows=(j.top||[]).map((r,i)=>[(kd&&!r.me?"Zberateľ":r.nick)+" · "+r.n+" "+pl(r.n,"typ","typy","typov"),r.sc,r.me,!kd&&!r.me&&r.nick!=="Spotter",i+1]);
    if(j.me&&!(j.top||[]).some(r=>r.me))rows.push(["Ty · "+j.me.n+" "+pl(j.me.n,"typ","typy","typov"),j.me.sc,true,false,j.me.rank||null]);
    note=`<b>${rows.length} zobrazených zberateľov</b> · ${LG_ATLAS_SCOPE==="sk"?"celé Slovensko":"tvoj kraj"}. Tu vidíš overených zberateľov, nie všetkých používateľov. ${j.me?`Ty: <b>${j.me.rank||"?"}. miesto</b> · ${j.me.gap?"k ďalšiemu ti chýba "+nf(j.me.gap)+" b":"si na čele! 👑"}${j.me.rank?lgDelta("a"+(kk||"SK"),j.me.rank):""}`:"Tvoj prvý overený úlovok ťa zaradí do rebríčka."}`;
    if(!rows.length){$("kraje").innerHTML='<div class="lookSub" style="padding:8px 0">Zatiaľ nikto v tvojom kraji nemá overené kartičky. Zamávaj a buď prvý 🃏'+(S.manual?'<br>⚠️ Máš ručne vybrané mesto – do súťaží sa ráta len poloha z GPS.':'')+'</div>';return}
  }
  else if(LG==="d"){
    if(!SOC.dv||Date.now()-SOC.dv.t>120e3){if(!SOC.dvL){SOC.dvL=1;apiPost("/api/division",{}).then(r=>r.json()).then(j=>{SOC.dv={t:Date.now(),j};SOC.dvL=0;if(LG==="d")renderLeague()}).catch(()=>{SOC.dvL=0})}}
    const j=SOC.dv&&SOC.dv.j;if(!j){$("kraje").innerHTML='<div class="lookSub" style="padding:8px 0">Načítavam…</div>';return}
    if(!j.div){$("kraje").innerHTML=`<div class="lookSub" style="padding:8px 0">Tento týždeň ešte nemáš overené mávnutie. Zamávaj a zaradíme ťa do divízie s hráčmi, ktorí mávajú podobne ako ty 👋</div>`;return}
    {const me=(j.rows||[]).findIndex(r=>r.me),up=me>0?j.rows[me-1].w-j.rows[me].w+1:0;
    note=`🏅 Divízia ${j.div} z ${j.divs} (1 = najlepšia) · si <b>${j.rank}.</b> z ${j.of}${up?` · na ${j.rank-1}. miesto ti chýba ${up} 👋`:j.rank===1?" · vedieš 👑":""}${lgDelta("d",j.rank)}`}
    rows=(j.rows||[]).map(r=>[r.n,r.w,r.me,!r.me&&r.n!=="Spotter"]);
  }
  else if(LG==="f"){
    if(!SOC.frw||Date.now()-SOC.frw.t>120e3){if(!SOC.frwL){SOC.frwL=1;apiPost("/api/friends",{}).then(r=>r.json()).then(j=>{SOC.frw={t:Date.now(),j};SOC.frwL=0;if(LG==="f")renderLeague()}).catch(()=>{SOC.frwL=0})}}
    const j=SOC.frw&&SOC.frw.j;if(!j){$("kraje").innerHTML='<div class="lookSub" style="padding:8px 0">Načítavam…</div>';return}
    if(!(j.friends||[]).length){$("kraje").innerHTML='<div class="lookSub" style="padding:8px 0">Zatiaľ nemáš kamarátov. Pošli niekomu výzvu – keď ju otvorí, budete súperiť každý týždeň 👯</div><button class="btn sec" id="lgInvite" style="width:100%;margin-top:6px">⚔️ Pozvi kamaráta</button>';$("lgInvite").onclick=()=>typeof sendDuel==="function"&&sendDuel();return}
    const FS=LS.get("ctl_famScore",{}),wkS=SKD.format(new Date(Date.now()-((new Date().getDay()+6)%7)*864e5));
    rows=[...j.friends.map(f=>[f.n+(FS[f.n]&&FS[f.n].wk===wkS?` · ⚔️ ${FS[f.n].w}:${FS[f.n].l}`:""),f.w|0,false,false]),["Ty",j.me|0,true]].sort((a,b)=>b[1]-a[1]);
    {const i=rows.findIndex(r=>r[2]),dl=7-((new Date().getDay()+6)%7),end=dl===1?"týždeň končí dnes o polnoci":"týždeň končí o "+(dl-1)+" "+pl(dl-1,"deň","dni","dní");
      note=i>0?`${esc(String(rows[i-1][0]).split(" · ")[0])} ti uniká o ${rows[i-1][1]-rows[i][1]+1} 👋 · ${end}`:rows.length>1?`Vedieš o ${rows[0][1]-rows[1][1]} 👋 · ${end}`:end}
  }
  else if(LG==="m"||LG==="s"){const me=typeof townOf==="function"?townOf(S.pos):"";rows=((LG==="s"?D.townsSmall:D.towns)||[]).map(x=>[x.town,x.n,x.town===me])}
  else if(LG==="o"){const me=krajOf(S.pos);rows=((D.krajeWeek||[]).filter(x=>KRAJ_POP[x.k])).map(x=>({k:x.k,v:Math.round(x.n/KRAJ_POP[x.k]*1e5*10)/10})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v).slice(0,8).map(x=>[(KRAJ[x.k]||KRAJ.XX)[2],x.v,x.k===me])}
  else if(LG==="p"){const me=krajOf(S.pos);rows=(D.krajePP||[]).slice(0,8).map(x=>[(KRAJ[x.k]||KRAJ.XX)[2]+` · ${x.p} ${pl(x.p,"hráč","hráči","hráčov")}`,x.n,x.k===me])}
  else rows=(D.teamsTop||[]).map(x=>[x.name,x.n,x.me,!x.me]);
  const max=Math.max(1,...rows.map(r=>r[1]));
  if($("lgNote"))$("lgNote").innerHTML=note;
  $("kraje").innerHTML=rows.length?rows.map((r,i)=>bar(r[0],r[1],max,r[2],i,r[3],r[4])).join(""):`<div class="lookSub" style="padding:8px 0">${LG==="f"?"Tento týždeň ešte nikto z vás nemával. Začni ty 👋":LG==="t"?"Tento týždeň zatiaľ žiadny tím nemával. Založ si tím v záložke Ja 👥":LG==="o"||LG==="w"?"Tento týždeň ešte nikto nemával. Začni ty 👋":LG==="p"?"Kraj sa ukáže, keď v ňom dnes mávajú aspoň 3 hráči. Pozvi kamarátov z kraja 👯":"Dnes ešte nikto nemával. Začni ty 👋"}</div>`;
}
// 🏡 Adoptuj obec: fandi jednej obci (napr. rodnej) a sleduj, koľko sa v nej máva
// ✋ skryté meno: hráč sa dozvie, prečo a môže požiadať o ľudskú kontrolu
function renderHidden(){
  const el=$("hidBox");if(!el)return;const H=SOC.data&&SOC.data.myHidden,nk=LS.get("ctl_nick","");
  if(!H||!nk||nk.toLowerCase()!==H.name){el.hidden=true;return}
  el.hidden=false;
  el.innerHTML=H.appeal===3?`✅ Tvoje meno „${esc(nk)}“ sme po kontrole vrátili. Ukáže sa pri ďalšom mávnutí.`
    :H.appeal===2?`🚩 Meno „${esc(nk)}“ ostáva skryté – podľa kontroly porušuje pravidlá. Ostatní ťa vidia ako „Spotter“. Vyber si prosím iné meno.`
    :H.appeal===1?`⏳ Tvoju žiadosť o kontrolu mena „${esc(nk)}“ preverí človek, zvyčajne do 48 hodín.`
    :`🚩 Tvoje meno „${esc(nk)}“ sme po nahlásení skryli – ostatní ťa vidia ako „Spotter“. Vyber si iné meno, alebo <button class="linkBtn" id="hidAppeal" style="display:inline;margin:0">požiadaj o kontrolu človekom</button>, ak je podľa teba v poriadku.`;
  if(!LS.get("ctl_hidSeen","")||LS.get("ctl_hidSeen","")!==H.name+H.appeal){LS.set("ctl_hidSeen",H.name+H.appeal);if(!H.appeal)toast("🚩 Tvoje meno je skryté","Pozri záložku Ja – nastavenia")}}
document.addEventListener("click",async e=>{if(e.target.id!=="hidAppeal")return;e.target.disabled=true;
  try{const j=await (await apiPost("/api/appeal",{})).json();if(j&&j.ok){if(SOC.data&&SOC.data.myHidden)SOC.data.myHidden.appeal=1;renderHidden();toast("✋ Žiadosť odoslaná","Meno preverí človek, zvyčajne do 48 h")}else toast("Nepodarilo sa","Skús to neskôr")}catch(err){toast("Nepodarilo sa","Skús to, keď budeš online")}});
function renderAdopt(){
  const el=$("adopt");if(!el)return;const t=LS.get("ctl_adopt",""),A=SOC.data&&SOC.data.adopt;
  const hb=`<button class="linkBtn" id="heatBtn">🗺️ Mapa mávania na Slovensku</button>`;
  if(!t){el.innerHTML=`<label class="lookSub">🏡 <select id="adSel" aria-label="Adoptuj obec"><option value="">Adoptuj obec a fanď jej…</option>${TOWNS.map(x=>x[0]).sort((a,b)=>a.localeCompare(b,"sk")).map(n=>`<option>${esc(n)}</option>`).join("")}</select></label>`+hb;return}
  const d=A&&A.town===t?A:{d:"…",w:"…"};
  el.innerHTML=`🏡 Tvoja obec <b>${esc(t)}</b>: dnes ${d.d} 👋 · tento týždeň ${d.w} 👋 <button class="linkBtn" id="adOff">zmeniť</button><br><small>Ráta sa mesto prvého mávnutia dňa každého hráča. Pozvi susedov 😉</small>`+hb}
document.addEventListener("change",e=>{if(e.target.id!=="adSel"||!e.target.value)return;LS.set("ctl_adopt",e.target.value);toast("🏡 Adoptoval(a) si obec "+e.target.value,"Uvidíš, koľko sa v nej dnes máva");renderAdopt();socPoll()});
document.addEventListener("click",e=>{if(e.target.id==="heatBtn"&&typeof openHeat==="function"){openHeat();return}if(e.target.id!=="adOff")return;LS.set("ctl_adopt","");renderAdopt()});
function renderMayor(){
  const M=SOC.data&&SOC.data.mayor,el=$("mayor");if(!el)return;
  const was=LS.get("ctl_mayor","");
  // odznak a titul až po uzávierke mesiaca (server: sieň slávy) – aj v šetriacom režime servera (bez mesta)
  if(M&&M.won&&was!=="won:"+M.won+dayKey().slice(0,7)){LS.set("ctl_mayor","won:"+M.won+dayKey().slice(0,7));grantAch("mayor");setTimeout(()=>{toast("🏛️ Si Starosta oblohy!",M.won+" – minulý mesiac si bol(a) najaktívnejší spotter","#ffcf4f");confetti(80)},1500)}
  if(!M||!M.town){el.hidden=true;return}
  el.hidden=false;
  const end=M.left!=null?(M.left===0?" · mesiac končí dnes":" · do konca mesiaca "+M.left+" "+pl(M.left,"deň","dni","dní")):"";
  const kd=typeof KID==="function"&&KID();if(kd&&M.nick)M.nick="Spotter";
  const hof=M.prev?`<br><small>🏆 Starosta minulého mesiaca: ${M.prev.me?"<b>ty</b>":kd?"Spotter":esc(M.prev.nick)} (${M.prev.n} 👋)</small>`:"";
  el.innerHTML=(M.me?`🏛️ <b>Vedieš v meste ${esc(M.town)}</b> – na Starostu oblohy (${M.n} 👋)<br><small>Udrž si náskok do konca mesiaca${end}.</small>`
    :M.nick?`🏛️ Vedie v meste ${esc(M.town)}: <b>${esc(M.nick)}</b>${M.nick!=="Spotter"?` <button class="rep" data-rep="${esc(M.nick)}" aria-label="Nahlásiť nevhodné meno">🚩</button>`:""} (${M.n}\u00a0👋)<br><small>Ty máš tento mesiac ${M.mine|0} ${pl(M.mine|0,"mávnutie","mávnutia","mávnutí")}.${M.n-(M.mine|0)+1>0?" Na vedenie ti chýba ešte "+(M.n-(M.mine|0)+1)+".":""}${end}</small>`
    :`🏛️ <b>${esc(M.town)}</b> tento mesiac ešte nikto nevedie<br><small>Kto bude mať na konci mesiaca najviac mávnutí, bude Starosta oblohy${end}.</small>`)+hof;
}
$("kraje").onclick=e=>{const b=e.target.closest("[data-rep]");if(b)reportName(b.dataset.rep,b)};
// nahlásenie nevhodného mena (po 3 nahláseniach od rôznych ľudí zmizne všade)
let REP=null;
function reportName(name,btn){
  if(!name)return;REP={name,btn};$("repName").textContent="„"+name+"“";$("repM").classList.add("on");haptic(10);
}
$("repM").addEventListener("click",async e=>{
  const b=e.target.closest("[data-why]");if(e.target.id==="repClose"||e.target===$("repM")){$("repM").classList.remove("on");return}
  if(!b||!REP)return;$("repM").classList.remove("on");
  try{await apiPost("/api/report",{name:REP.name,why:b.dataset.why})}catch(err){}
  if(REP.btn)REP.btn.remove();
  toast("🚩 Ďakujeme za nahlásenie",b.dataset.why==="osobne"||b.dataset.why==="sex"?"Meno sme hneď skryli, preveríme ho do 24 h":"Preveríme ho. Ak ho nahlásia viacerí, zmizne hneď");REP=null;
});
$("lgTabs").onclick=e=>{const b=e.target.closest("button");if(!b)return;
  if(b.dataset.more){const m=$("lgTabs").classList.toggle("more");b.setAttribute("aria-expanded",m);b.textContent=m?"×":"⋯";return}
  LG=b.dataset.t;[...$("lgTabs").children].forEach(x=>x.classList.toggle("on",x===b));renderLeague();haptic(6)};
$("compPulseGo").onclick=()=>{LG="d";[...$("lgTabs").children].forEach(x=>x.classList.toggle("on",x.dataset.t==="d"));$("krajeCard").style.display="";renderLeague();$("krajeCard").scrollIntoView({behavior:typeof RM==="function"&&RM()?"auto":"smooth",block:"start"});haptic(6)};
$("lgAtlasScope").onclick=e=>{const b=e.target.closest("button[data-scope]");if(!b||LG_ATLAS_SCOPE===b.dataset.scope)return;LG_ATLAS_SCOPE=b.dataset.scope;SOC.atl=null;renderLeague();haptic(6)};
function waveInfo(a){
  if(!SOC.api){$("waveInfo").textContent="";return}
  if(!a){$("waveInfo").textContent="";$("waveN").style.display="none";return}
  const p=planeWaves(a.hex),mine=SOC.waved[dayKey()+a.hex];
  $("waveN").style.display=p.total?"":"none";if($("waveN").textContent!==nf(p.total)){$("waveN").textContent=nf(p.total);$("waveN").classList.remove("bump");void $("waveN").offsetWidth;$("waveN").classList.add("bump")}
  // stav tlačidla: po mávnutí je jasné, že je hotovo
  const again=mine&&!COL.hex[a.hex]&&(a.el??0)>=10;$("b-wave").classList.toggle("waved",!!mine&&!again);$("waveLbl").textContent=again?"👋 Mávni – teraz do zbierky":mine?"✓ Zamávané":a&&a.el!=null&&a.el<10&&!COL.hex[a.hex]?"👋 Mávni · nízko "+Math.max(0,Math.round(a.el))+"°":waveMood(a);
  $("waveHint").style.display=mine||(LS.get("ctl_waveN",0)|0)>=3?"none":"";
  const em=Object.entries(p.emoji||{}).sort((x,y)=>y[1]-x[1]).slice(0,4).map(([e,n])=>e+" "+n).join("  ");
  const fr=SOC.data&&SOC.data.friends&&SOC.data.friends[a.hex];
  const frTxt=fr&&fr.length?`<div class="frLine">👯 ${fr.slice(0,3).map(f=>esc(f.n)).join(", ")} ${fr.length===1?"mu dnes zamával":"mu dnes zamávali"}</div>`:"";
  const mOn=SOC.data&&SOC.data.mailOn&&SOC.data.mailOn[a.hex];
  const mailTxt=mOn?`<div class="frLine" style="color:#ffcf8a">✉️ Nesie ${mOn} ${mOn===1?"pozdrav":mOn<5?"pozdravy":"pozdravov"} po Slovensku</div>`:"";
  if(!(LS.get("ctl_waveN",0)|0))return void($("waveInfo").innerHTML=p.total?`Dnes mu ${zam(p.total)} <b>${nf(p.total)} ${ludia(p.total)}</b>`:"");
  $("waveInfo").innerHTML=(p.total?`Dnes mu ${zam(p.total)} <b>${nf(p.total)} ${ludia(p.total)}</b>${mine?" vrátane teba":""} · ${em}`:"Dnes mu ešte nikto nemával. Začni ty 👋")+frTxt+mailTxt;
}
HOOKS.heroStatic.push(a=>{waveInfo(a);cardHint(a)});
/* 🃏 čo ti zamávanie prinesie – ešte PRED mávnutím (prepojenie hlavnej akcie a zbierky) */
// 📉 nízke lietadlo: zapamätaj si ho a ozvi sa, keď vystúpi nad 10°
HOOKS.live.push(()=>{const w=SOC.lowWatch;if(!w)return;if(Date.now()-w.t>20*60e3){SOC.lowWatch=null;return}
  const p=S.list&&S.list.find(x=>x.hex===w.hex);if(!p)return;
  if(p.el>=10&&!COL.hex[p.hex]){SOC.lowWatch=null;S.pick=p.hex;try{tick(true)}catch(e){}toast("📈 "+(p.call||titleOf(p))+" je teraz "+Math.round(p.el)+"° nad tebou","Zamávaj – teraz už pôjde do zbierky 👋");haptic([40,40,40])}});
$("cardHint")&&$("cardHint").addEventListener("click",e=>{if(e.target.closest("[data-gps]")&&$("placeGps"))$("placeGps").click()});
// kam lietadlo doletí v najbližších 20 minútach (podľa kurzu a rýchlosti) → prvé veľké mesto pod ním
// 🌙☁️ hlavné tlačidlo podľa podmienok: v noci svetlám, pri zamračenej oblohe tomu, čo počuješ (mávnutie platí rovnako)
function waveMood(a){const c=typeof WX!=="undefined"&&WX.data&&WX.data.current,dark=typeof SPACE!=="undefined"?SPACE.sunAlt()<-6:c&&!c.is_day;
  if(dark)return "👋 Mávni svetlám";
  if(c&&a&&((c.cloud_cover_low>80&&(a.alt||0)>1500)||(c.cloud_cover_mid>80&&(a.alt||0)>5000)))return "👋 Mávni – počuješ ho?";
  return "👋 Mávni"}
function relayOf(a){if(!a||a.lat==null||a.trk==null||!a.spd||a.spd<250||typeof CITIES==="undefined"||!S.pos)return null;
  const me=typeof townOf==="function"?townOf(S.pos):"",br=rad(a.trk),kmPerMin=a.spd/60;
  for(let m=3;m<=20;m++){const d=kmPerMin*m,la=a.lat+d/111.2*Math.cos(br),lo=a.lon+d/(111.2*Math.cos(rad(a.lat)))*Math.sin(br);
    for(const c of CITIES.slice(0,12)){if(c[0]===me)continue;if(distBear(la,lo,c[1],c[2]).d<9000&&distBear(S.pos.lat,S.pos.lon,c[1],c[2]).d>30000)return {town:c[0],min:m}}}
  return null}
$("cardHint")&&$("cardHint").addEventListener("click",async e=>{const r=e.target.closest("[data-relay]");if(!r||!S.top)return;const a=S.top,town=r.dataset.relay,eta=r.dataset.eta;
  const url=shareUrl("p",a.hex,["c="+encodeURIComponent(a.call||""),"m="+encodeURIComponent(town)].join("&")),text=`✈️ ${a.call||titleOf(a)} bude o ~${eta} min nad mestom ${town}! Vyjdi von a zamávaj mu 👋`;
  try{if(navigator.share){await navigator.share({text,url});return}}catch(er){if(er.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("📋 Skopírované","Pošli to niekomu v meste "+town)}catch(er){prompt("Skopíruj:",url)}});
function cardHint(a){
  const el=$("cardHint");if(!el)return;if(!a||a.santa){el.innerHTML="";return}
  const ty=a.type,v=ty&&COL.types[ty]&&COL.types[ty].n?COL.types[ty]:null,c=ty&&CAT[ty],out=[];
  if(a.el!=null&&a.el<10)out.push(`<span class="low">📉 Je nízko (${Math.max(0,Math.round(a.el))}°) – do zbierky až nad 10°</span>`);
  else if(COL.hex[a.hex])out.push(`<span>✓ Toto lietadlo už máš v zbierke</span>`);
  else if(!v&&c)out.push(`<span class="new">🃏 Nová ${(RAR[typeTier(a.type)]||RAR.c).n} kartička!${TROPHY.has(a.type)?" 🏆 trofej":" č. "+String(c.no).padStart(3,"0")}</span>`);
  else if(!v)out.push(`<span class="new">🃏 Nové lietadlo do zbierky</span>`);
  else{const nx=nextLv(v.n,ty);out.push(`<span>${stars(cardLvl(v.n,ty))}${nx?" · ešte "+(nx-v.n)+"× do ďalšej ★":" · max. úroveň"}</span>`)}
  // ⏳ neoverený typ nad tebou – šanca overiť ho
  if(v&&!v.ver&&!COL.hex[a.hex]&&!(a.el!=null&&a.el<10))out.unshift(`<span class="new">⏳ Tvoj ${esc(catGuess(ty).name||ty)} ešte nie je overený – zamávaj a overí sa</span>`);
  // ✈️ štafeta: lietadlo onedlho preletí nad iným mestom – pošli ho tam niekomu
  {const rl=relayOf(a);if(rl&&!(typeof KID==="function"&&KID()))out.push(`<span class="new" data-relay="${esc(rl.town)}" data-eta="${rl.min}" role="button">📲 O ~${rl.min} min bude nad mestom ${esc(rl.town)} – pošli to tam niekomu</span>`)}
  // 📍 ručne vybrané mesto = bez overenia
  if(S.manual)out.push(`<span class="low" data-gps="1" role="button">📍 Bez GPS sa kartička neoverí · Zapnúť</span>`);
  try{const r=rarity(a);if(RORD[r]>=2&&!COL.hex[a.hex])out.push(`<span class="new">${RAR[r].s} ${RAR[r].n} +${RAR[r].p} b</span>`);
    // 🌅/🎯 chýbajúca forma, ktorá sa dá získať práve teraz
    if(v&&!COL.hex[a.hex]){const fm=v.forms||{},sa=typeof SPACE!=="undefined"?SPACE.sunAlt():null;
      if(!fm.g&&sa!=null&&sa>-4&&sa<6)out.push('<span class="new">🌅 Zlatá hodinka – chýba ti táto forma</span>');
      else if(!fm.z&&a.el>=80)out.push('<span class="new">🎯 Je priamo nad hlavou – zamávaj a máš novú formu!</span>')}
    // 📚 dokončí sadu?
    if(!v&&typeof SETS!=="undefined"){const st=SETS.find(s=>!(COL.sets||{})[s.id]&&s.t&&s.t.includes(ty)&&s.t.filter(k=>k!==ty).every(k=>COL.types[k]));if(st)out.push(`<span class="new">📚 Dokončí sadu ${esc(st.n)}</span>`)}
  }catch(e){}
  try{const D=dailyEnsure();if(!COL.hex[a.hex]&&(a.el??0)>=10&&D.ids.some(id=>{const x=DAILY_POOL.find(q=>q.id===id);return x&&!D.done[id]&&!x.ev&&!x.need&&!x.key&&x.t&&x.t(a)}))out.push(`<span class="new">🎯 Splní výzvu +10</span>`)}catch(e){}
  const h=out.join("");if(el.innerHTML!==h)el.innerHTML=h;
}
HOOKS.live.push(()=>cardHint(S.top));

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
// odmeny z odpovede servera (živé mávnutie, opakované mávnutie aj odložené z fronty)
function waveRewards(j,a){
  const k=j.type||a.type||"?",v=COL.types[k];
  if(j.seq===1&&j.ver&&!(v&&v.discShown)){grantAch("discover");confetti(160);if(v){v.discShown=1;LS.set("ctl_col",COL)}}
  if(j.together&&j.together.n){COL.pts+=2;LS.set("ctl_col",COL);grantAch("together");WB&&WB.items.push(["👯 Spoločné mávnutie s kamarátmi ("+j.together.n+")"]);confetti(40)}
  if(j.golden==="entered"){const gs=(SOC.data&&SOC.data.golden&&SOC.data.golden.seq)||dayKey();COL.goldSeq=COL.goldSeq||[];
    // +25 b za každé zlaté lietadlo (aj druhé rovnakého typu), zlatá kartička len raz za typ
    if(!COL.goldSeq.includes(gs)){COL.goldSeq.push(gs);COL.goldSeq=COL.goldSeq.slice(-60);COL.pts+=25;if(v&&!v.gold)v.gold=Date.now();LS.set("ctl_col",COL);grantAch("golden")}
    WB&&WB.items.push(["🏆 Si v zlatej posádke"])}
}
function reportFirstWave(j){
  if(j.ver)showFirstWaveResult("Úlovok je overený. Kartičku nájdeš v zbierke.",true);
  else showFirstWaveResult("Mávnutie uložené. Úlovok sa neoveril"+(j.why?": "+j.why+".":"."));
}

async function doWave(e){
  const a=S.top;if(!a)return;
  if(S.lastKnown){toast("⏳ Načítavam aktuálnu oblohu…","Zamávaj o sekundu – teraz ukazujem poslednú známu polohu lietadiel");return}
  if(SOC.inflight===a.hex)return; // dvojťuk: druhé mávnutie počas odosielania ignoruj
  SOC.inflight=a.hex;try{return await doWave1(e,a)}finally{SOC.inflight=null}
}
async function doWave1(e,a){LASTWAVE=null;
  // trasa letu (krajina cieľa) pre odznak 🏠 a formy – chvíľu počkaj, ak sa ešte načítava
  if(typeof routeOf==="function"&&!routeOf(a)&&typeof loadMeta==="function")await Promise.race([loadMeta(a).catch(()=>{}),new Promise(r=>setTimeout(r,1200))]);
  $("wavePick").classList.remove("on");
  haptic([18,40,18]);flyEmoji(e,$("b-wave"));
  if(a.santa){tryCatch(a);toast("🎅 Ho-ho-ho!","Santa ti zamával späť 👋","#ff4f6d");grantAch("santa");confetti(60);return}
  const key=dayKey()+a.hex,already=!!SOC.waved[key];
  const rt=routeOf(a),to=rt?" → "+citySk(rt.destination.municipality):"";
  if(already){
    // predtým bolo nízko a kartička nepribudla – teraz je vysoko: pošli znova, nech sa úlovok overí (body sa nerátajú druhýkrát)
    if(!COL.hex[a.hex]&&(a.el??0)>=10&&SOC.api){
      try{const r=await apiPost("/api/wave",{hex:a.hex,emoji:e,...posR(),gps:!S.manual,nick:LS.get("ctl_nick",""),call:a.call||"",type:a.type||""});const j=await r.json().catch(()=>({}));
        if(r.ok&&j.ok&&j.type&&j.type!==a.type&&/^[A-Z0-9]{2,5}$/.test(j.type)&&(CAT[j.type]||!CAT[a.type]))a.type=j.type;
        LASTWAVE=r.ok&&j.ok?{hex:a.hex,...j}:null;tryCatch(a);
        if(j.ver){const v=COL.types[j.type||a.type||"?"];if(v){v.ver=1;if(j.seq&&!v.seq)v.seq=j.seq;LS.set("ctl_col",COL)}}
        if(r.ok&&j.ok){reportFirstWave(j);waveRewards(j,a)}
      }catch(x){tryCatch(a)}
      return}
    tryCatch(a);toast("👋 Dnes už zamávané","Každému lietadlu sa ráta 1 mávnutie denne");return}
  ping("u");
  // body a výzvy sa pripíšu až keď server mávnutie prijme (alebo keď sme offline)
  const credit=()=>{
    SOC.waved[key]=e;waveBatchStart();
    // úlovok = zamávanie (nie automaticky, keď appka len beží)
    if(!COL.hex[a.hex]){if((a.el??0)>=10)tryCatch(a);else{WB.low=a.el??0;SOC.lowWatch={hex:a.hex,t:Date.now()}}}
    if(typeof streakTouch==="function")streakTouch();
    for(const k of Object.keys(SOC.waved))if(k.slice(0,10)!==dayKey())delete SOC.waved[k];
    LS.set("ctl_waved",SOC.waved);
    // body za mávanie: +1, najviac 10 denne (hra je o pozeraní hore, nie o ťukaní)
    {const wd=LS.get("ctl_wpd",{d:"",n:0});if(wd.d!==dayKey()){wd.d=dayKey();wd.n=0}if(wd.n<10){COL.pts+=1;wd.n++}LS.set("ctl_wpd",wd)}LS.set("ctl_col",COL);
    const n=(LS.get("ctl_waveN",0)|0)+1;LS.set("ctl_waveN",n);
    if(n>=1)grantAch("wave");if(n>=10)grantAch("wave10");ev("wave1");if(n===1&&typeof inAppBar==="function")setTimeout(inAppBar,6000);
    if(typeof dailyEvent==="function"){dailyEvent("wave");dailyEvent("silvester");dailyEvent("miki")}
    if(typeof maybeAskPush==="function")setTimeout(maybeAskPush,8000);
  };
  const fin=(soc)=>{if(WB&&soc)WB.social=soc;setTimeout(()=>waveBatchEnd(e),60)};
  if(!SOC.api){showFirstWaveResult("Mávnutie uložené v tomto zariadení.");credit();fin(to?"smer"+to.replace("→","").replace(/^\s*/," "):"");return}
  let r,j={},body;
  try{
    body={hex:a.hex,emoji:e,...posR(),gps:!S.manual,nick:LS.get("ctl_nick",""),call:a.call||"",type:a.type||"",dest:rt?citySk(rt.destination.municipality):"",t:Date.now(),st:typeof streakLive==="function"?(L=>L.st==="done"?L.n:L.st==="dead"?1:L.n+1)(streakLive()):0,pl:a.lat!=null?{la:Math.round(a.lat*1e3)/1e3,lo:Math.round(a.lon*1e3)/1e3,alt:a.alt!=null?Math.round(a.alt/.3048):null}:null};
    showFirstWaveResult("Overujem mávnutie…");
    r=await apiPost("/api/wave",body);
    if(r.status===401)r=await apiPost("/api/wave",body); // nový token a ešte raz
    j=await r.json().catch(()=>({}));
  }catch(err){ // bez internetu – mávnutie platí aspoň u teba a odošle sa neskôr
    showFirstWaveResult(wqPush(body)?"Mávnutie čaká na overenie po obnovení spojenia.":"Mávnutie sa nepodarilo odložiť na overenie.");
    credit();const cur=planeWaves(a.hex),em={...cur.emoji};em[e]=(em[e]||0)+1;SOC.local[a.hex]={total:cur.total+1,emoji:em};waveInfo(a);
    fin("odošlem, keď budeš online");return}
  if(j.error==="far"){showFirstWaveResult("Lietadlo je príliš ďaleko. Skús mávnuť bližšiemu.");toast("Toto lietadlo je od teba priďaleko","Mávať sa dá len lietadlám nad tebou");return}
  if(j.error==="rate"){showFirstWaveResult("Mávnuť môžeš znova o chvíľu.");toast("Spomaľ 🙂","Mávať môžeš znova o chvíľu");return}
  if(!r.ok||!j.ok){
    const code=r.status+(j.error?"/"+j.error:"")+(SOC.helloErr?" h"+SOC.helloErr:"");
    try{navigator.sendBeacon&&navigator.sendBeacon(DEFAULT_PROXY+"/api/err",JSON.stringify({m:"wave fail "+code}))}catch(x){}
    // server nemáva? zbierka a body aspoň u teba, aby hra fungovala
    // prihlásenie/server zlyhali – mávnutie si odložíme a o chvíľu ho pošleme znova (overí sa, kým je lietadlo blízko)
    const queued=(r.status===401||r.status>=500||r.status===429)&&wqPush(body);
    if(queued)setTimeout(flushWq,15000);
    showFirstWaveResult(queued?"Mávnutie čaká na overenie.":"Mávnutie sa nepodarilo overiť. Skús znova.");
    {const cur=planeWaves(a.hex),em={...cur.emoji};em[e]=(em[e]||0)+1;SOC.local[a.hex]={total:cur.total+1,emoji:em};waveInfo(a)}
    LASTWAVE=null;credit();fin(j.error==="busy"?"siete sú preťažené – overím o chvíľu":"overím o chvíľu");return}
  // server pozná typ z overených dát – kartička dostane ten istý typ, aby sedelo overenie
  if(j.type&&j.type!==a.type&&/^[A-Z0-9]{2,5}$/.test(j.type)&&(CAT[j.type]||!CAT[a.type]))a.type=j.type;
  LASTWAVE={hex:a.hex,...j};
  reportFirstWave(j);
  // server overil (≥ 8°), hoci mobil ukazuje menej ako 10° → kartička aj tak patrí hráčovi
  if(j.ver&&a.el!=null&&a.el<10){a={...a,el:10}}
  credit();
  // 🏅 liga hneď po mávnutí: obnov rebríčky a pochváľ posun v divízii
  if(!j.dup){const old=SOC.dv&&SOC.dv.j&&SOC.dv.j.rank;SOC.dv=SOC.frw=null;if(j.ver)SOC.atl=null;
    if(old)setTimeout(()=>apiPost("/api/division",{}).then(r=>r.json()).then(x=>{SOC.dv={t:Date.now(),j:x};renderCompetitionPulse();if(x&&x.rank&&x.rank<old)toast("🏅 Divízia: si "+x.rank+". (bol(a) si "+old+".)","Len tak ďalej 👋");if(LG==="d")renderLeague()}).catch(()=>{}),2500)}
  if(j.ver){const v=COL.types[j.type||a.type||"?"];if(v){v.ver=1;if(j.seq&&!v.seq)v.seq=j.seq;LS.set("ctl_col",COL)}}
  else if(j.why&&!j.dup&&COL.cx&&COL.cx[a.hex])WB&&WB.items.push(["⏳ neoverené: "+j.why]);
  if(j.seq===1)WB&&WB.items.push(["🧭 PRVÝ NA SLOVENSKU!"]);else if(j.firstK)WB&&WB.items.push(["🧭 Prvý v kraji"]);else if(j.firstT)WB&&WB.items.push(["🧭 Prvý v meste"]);else if(j.seq&&j.seq<=100)WB&&WB.items.push(["č. "+j.seq+" na Slovensku"]);
  waveRewards(j,a);
  if(typeof j.golden==="string"&&j.golden.startsWith("no:")){const GW={gps:"poloha musí byť z GPS",league:"mávnutie sa nerátalo do ligy (nový účet alebo mimo Slovenska)",far:"lietadlo bolo ďalej ako 60 km",new:"posádka je pre hráčov, ktorí mali appku už pred vyhlásením lietadla",days:"posádka je pre hráčov, ktorí appku používajú aspoň 2 dni",active:"appku treba mať otvorenú, keď lietadlo vyhlásime"};
    setTimeout(()=>toast("🏆 Do zlatej posádky sa to nerátalo",GW[j.golden.slice(3)]||""),4500)}
  if(j.plane){SOC.data=SOC.data||{planes:{}};SOC.data.planes=SOC.data.planes||{};SOC.data.planes[a.hex]=j.plane;delete SOC.local[a.hex]}
  waveInfo(a);
  const tot=j.plane?j.plane.total:1;
  fin(tot>1?`si ${nf(tot)}., kto mu dnes mával`:"prvé mávnutie dňa je tvoje");
  setTimeout(socPoll,800);
}
{let lp=null,long=false;const bw=$("b-wave");
  bw.addEventListener("pointerdown",()=>{long=false;clearTimeout(lp);lp=setTimeout(()=>{if(!S.top)return;long=true;haptic(12);$("wavePick").classList.add("on")},380)});
  ["pointerup","pointerleave","pointercancel"].forEach(t=>bw.addEventListener(t,()=>clearTimeout(lp)));
  bw.addEventListener("contextmenu",e=>e.preventDefault());
  bw.onclick=()=>{if(!S.top||long){long=false;return}haptic(8);$("wavePick").classList.remove("on");doWave("👋")};
  document.addEventListener("click",e=>{if($("wavePick").classList.contains("on")&&!e.target.closest("#wavePick,#b-wave"))$("wavePick").classList.remove("on")});}
$("wavePick").onclick=ev=>{const b=ev.target.closest("button");if(!b)return;if(b.dataset.mail){$("wavePick").classList.remove("on");if(typeof openMail==="function")openMail();return}doWave(b.textContent)};
if(SOC.api){(function loop(){setTimeout(async()=>{if(!document.hidden)await socPoll();loop()},(45000+Math.random()*18000-9000)*Math.min(8,SOC.back||1))})();setTimeout(socPoll,2500);document.addEventListener("visibilitychange",()=>{if(!document.hidden)socPoll()})}

/* 👯 zoznam kamarátov s možnosťou odobrať */
async function friendsRender(){
  const box=$("frList");if(!box||!SOC.api)return;
  try{const r=await apiPost("/api/friends",{});const j=await r.json();const fr=j.friends||[];
    if(!fr.length){box.innerHTML='<div class="lookSub">Zatiaľ žiadni kamaráti. Pošli niekomu výzvu.</div>';return}
    const all=[...fr,{n:"Ty",w:j.me|0,c:j.meC|0,me:1}].sort((a,b)=>(b.w|0)-(a.w|0));
    box.innerHTML='<div class="lookSub">Súboj týždňa · mávnutia overené serverom</div>'+all.map((f,i)=>`<div class="sr"${f.me?' style="font-weight:800"':""}><div>${["🥇","🥈","🥉"][i]||"👯"} ${esc(f.n)} · ${f.w|0}\u00a0👋<small>${f.c|0} ${pl(f.c|0,"overený úlovok","overené úlovky","overených úlovkov")} ✈️</small></div>${f.me?"":`<button class="ghost" data-unf="${esc(f.p)}">Odobrať</button>`}</div>`).join("");
  }catch(e){}
}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-unf]");if(!b)return;await apiPost("/api/friends",{remove:b.dataset.unf}).catch(()=>{});toast("Kamarát odobratý","Už neuvidíte svoje mávnutia");friendsRender()});
if($("friendsBox"))$("friendsBox").addEventListener("toggle",()=>{if($("friendsBox").open)friendsRender()});

/* 📴 mávnutia bez internetu: odoslať, keď sa signál vráti (server má kontrolu duplicít) */
// fronta odložených mávnutí: platí do 1 h po polnoci (mávnutie z 23:50 sa nestratí)
const wqFresh=x=>x.d===dayKey()||Date.now()-(x.b&&x.b.t||0)<3600e3;
function wqPush(b){
  const q=LS.get("ctl_wq",[]).filter(wqFresh);
  if(!b||q.length>=20)return false;
  q.push({d:dayKey(),b});
  return lsWrite("ctl_wq",JSON.stringify(q));
}
async function flushWq(){
  if(SOC.flushing)return;
  const q=LS.get("ctl_wq",[]).filter(wqFresh);if(!q.length||!SOC.api||!navigator.onLine)return;
  SOC.flushing=1;LS.set("ctl_wq",[]);
  let ok=0,ver=0,back=0;const bad=[],res=[];
  try{for(const x of q){try{x.b.try=(x.b.try|0)+1;let r=await apiPost("/api/wave",x.b);if(r.status===401)r=await apiPost("/api/wave",x.b);
      const j=await r.json().catch(()=>({}));
      if(r.ok&&j.ok){ok++;reportFirstWave(j);
        // rovnaké zjednotenie typu ako pri živom mávnutí
        let k=x.b.type||"?";if(j.type&&j.type!==k&&/^[A-Z0-9]{2,5}$/.test(j.type)&&(CAT[j.type]||!CAT[k])){if(COL.types[k]&&!COL.types[j.type]){COL.types[j.type]=COL.types[k];delete COL.types[k]}k=j.type}
        const v=COL.types[k];
        if(v){if(j.ver){v.ver=1;if(j.seq&&!v.seq)v.seq=j.seq;ver++}if(j.shiny&&!v.shiny)v.shiny=Date.now()}if(j.ed)edAdd(k,j.ed)
        try{waveRewards(j,{hex:x.b.hex,type:k})}catch(er){}
        res.push((j.shiny?"✨ ":"")+(j.ver?"✓ "+(catGuess(k).name||k)+(j.seq?" · č. "+j.seq+" na Slovensku":""):"⏳ "+(catGuess(k).name||k)+(j.why?": "+j.why:""))+(j.ed?" · 📅 "+j.ed.n+" č. "+j.ed.no:""))}
      else if((r.status===401||r.status>=500||(r.status===429&&j.error!=="rate"))&&x.b.try<6){LS.set("ctl_wq",LS.get("ctl_wq",[]).concat([x]));back++}
      else if(r.status===429){LS.set("ctl_wq",LS.get("ctl_wq",[]).concat([x]));back++}
      else bad.push(j.error==="far"?"lietadlo už bolo ďaleko":j.error||("kód "+r.status))
    }catch(e){LS.set("ctl_wq",LS.get("ctl_wq",[]).concat([x]));back++}}
  }finally{SOC.flushing=0}
  if(ok||ver)LS.set("ctl_col",COL);
  if(back)setTimeout(flushWq,30000);
  if(ok){toast("✅ Odložené mávnutia odoslané",res.slice(0,3).join(" · ")+(res.length>3?" · …":""));if(S.view==="col"&&typeof renderCol==="function")renderCol()}
  if(bad.length&&!back&&!ok)showFirstWaveResult("Odložené mávnutie sa nepodarilo overiť. Skús znova.");
  if(bad.length)setTimeout(()=>toast("⚠️ "+bad.length+" "+pl(bad.length,"mávnutie sa nepodarilo","mávnutia sa nepodarili","mávnutí sa nepodarilo")+" overiť",bad[0]),ok?4200:0);
}
addEventListener("online",()=>setTimeout(flushWq,1500));setTimeout(flushWq,5000);

$("mayor").addEventListener("click",e=>{const b=e.target.closest("[data-rep]");if(b)reportName(b.dataset.rep,b)});
$("waveInfo").addEventListener("click",e=>{const b=e.target.closest("[data-rep]");if(b)reportName(b.dataset.rep,b)});
$("frList")&&$("frList").addEventListener("click",e=>{const b=e.target.closest("[data-rep]");if(b)reportName(b.dataset.rep,b)});

/* ✓ synchronizácia overených kartičiek zo servera (poradie v SR aj pre staršie úlovky) */
async function syncCards(){
  if(!SOC.api||!navigator.onLine)return;
  try{const r=await apiPost("/api/mycards",{});const j=await r.json();if(!j.cards)return;let ch=0;
    setTimeout(checkAch,500);for(const [ty0,sq] of j.cards){const ty=T_ALIAS[ty0]||ty0;let v=COL.types[ty];
      // overený typ na serveri, ktorý v mobile chýba (iný prah výšky, prenos, stará chyba identity) → doplniť kartičku
      if(!v&&/^[A-Z0-9]{2,5}$/.test(ty)){v=COL.types[ty]={n:1,r:typeTier(ty),name:catGuess(ty).name||ty,first:Date.now(),srv:1};ch=1}
      if(!v.ver||v.seq!==sq){v.ver=1;v.seq=sq;ch=1}}
    // ✨ lesklé a 📅 edície zo servera – len pridáva, nič neuberá
    for(const ty of j.sh||[]){const v=COL.types[ty];if(v&&!v.shiny){v.shiny=Date.now();ch=1}}
    for(const [id,n,no,ty] of j.ed||[])if(edAdd(ty,{id,n,no}))ch=1;
    if(ch){LS.set("ctl_col",COL);if(S.view==="col")renderCol()}}catch(e){}
}
setTimeout(syncCards,4000);HOOKS.view.push(v=>{if(v==="col")syncCards()});
// Pri otvorení ešte pred ďalšími hernými požiadavkami, a po návrate zo spánku,
// vždy skontroluj generáciu na serveri (bez vymazania pri výpadku siete).
function verifyPlayerOnResume(){
  if(document.hidden||!navigator.onLine||SOC.resetting||SOC.moved)return;
  if(!SOC.authVerified||Date.now()-SOC.authChecked>=60000)ensureTok(true).catch(()=>{});
}
setTimeout(verifyPlayerOnResume,0);
addEventListener("online",verifyPlayerOnResume);
document.addEventListener("visibilitychange",verifyPlayerOnResume);

