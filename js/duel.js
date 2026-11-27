"use strict";
/* ============ ⚔️ Súboj kartičiek (Top Trumps cez odkaz) ============ */
const CD_CATS=[["spd","Rýchlosť","km/h"],["range","Dolet","km"],["span","Rozpätie","m"],["len","Dĺžka","m"],["seats","Kapacita",""]];
const LOAN=["A320","B738","AT76"];
let CD=null;
// nákladné lietadlá v kategórii „Miesta/kapacita“: 1 t nosnosti = 2 body; vlastné kartičky: +3 % za ★, +5 % za shiny
const cdStat=(k,cat,mine)=>{const c=catGuess(k);let v=cat==="seats"&&!c.seats?(SEATSX[k]||0)*2:(c[cat]||0);const o=mine&&COL.types[k];if(o&&o.n)v*=1+.03*(cardLvl(o.n,k)-1)+(o.shiny?.05:0);return Math.round(v*10)/10};
const safeNick=n=>{n=String(n||"").replace(/https?:\S+|www\.\S+|@\S+|\b\S+\.(sk|com|cz|net)\b/gi,"").replace(/\d{4,}/g,"").replace(/[<>]/g,"").trim().slice(0,16);return n.length>=2?n:"Kamarát"};
const cdVal=(k,cat,mine)=>{const v=cdStat(k,cat,mine),u=cat==="seats"&&!catGuess(k).seats?"b (náklad · 1 t = 2 b)":CD_CATS.find(x=>x[0]===cat)[2];return nf(v,cat==="span"||cat==="len"?1:0)+(u?" "+u:"")};
function myDeck(){const own=Object.keys(COL.types).filter(k=>k!=="?");return own.length>=3?own:[...new Set([...own,...LOAN])]}
// vybrané karty: poradie 1/2/3, ostatné stlmené
function cdMark(){const sel=CD.sel;[...$("cdPick").children].forEach(b=>{const i=sel.indexOf(b.dataset.k);b.classList.toggle("sel",i>=0);b.dataset.n=i>=0?String(i+1):"";b.classList.toggle("dim",sel.length>=3&&i<0)})}
function cdMini(k,v){return cardSVG(k,v===undefined?COL.types[k]||{n:0,r:cardRar(k),first:Date.now()}:v,{id:"cd"})}
function cdOpen(html){$("cdBox").innerHTML=html;$("cdM").classList.add("on")}
function cdClose(){$("cdM").classList.remove("on");CD=null}
/* vyzývateľ: vyber 3 kartičky */
function cdStart(){
  const deck=myDeck();CD={mode:"pick",sel:[]};
  cdOpen(`<div class="lbl"><span>⚔️ Súboj kartičiek</span></div>
    <div class="trTitle" style="margin-top:10px">Vyber 3 kartičky do súboja</div>
    <div class="lookSub">Kamarát v každom kole dostane kategóriu (rýchlosť, dolet…) a tipne, ktorou kartou ťa prebije.${Object.keys(COL.types).length<3?" Kým nemáš 3 vlastné, požičiame ti štartovacie karty.":""}</div>
    <div class="cdPick" id="cdPick">${deck.map(k=>`<button data-k="${esc(k)}">${cdMini(k)}</button>`).join("")}</div>
    <div class="lookSub" style="margin-top:4px">Poradie je dôležité: 1. karta hrá v 1. kole, 2. v 2. kole…</div>
    <div class="acts">${KIDM()?"":`<button class="btn pri" id="cdSend" disabled style="opacity:.5">⚔️ Vyzvi (0/3)</button>`}<button class="btn ${KIDM()?"pri":"sec"}" id="cdLocal" disabled style="opacity:.5">📱 Na jednom mobile</button><button class="btn ico" id="cdX" style="flex:0 0 56px">✕</button></div>`);
}
const KIDM=()=>typeof KID==="function"&&KID();
// 🏠 súboj na jednom mobile: hráč 1 vyberie, podá mobil, hráč 2 odohrá (bez odkazu, bez servera – aj pre deti)
function cdLocalHandoff(){
  const seed=Math.floor(Math.random()*1e6),cats=[0,1,2].map(i=>CD_CATS[hash(String(seed)+i)%CD_CATS.length][0]);
  const pf=typeof profState==="function"&&LS.get("ctl_profs",null)?profState():null,p={n:pf?pf.n[pf.cur]:"Hráč 1",c:CD.sel.slice(),k:cats,s:seed,local:1};
  cdOpen(`<div style="text-align:center;font-size:64px;margin-top:10px">👉📱</div><div class="cdScore">Podaj mobil súperovi</div>
    <div class="lookSub" style="text-align:center">Tvoje karty sú skryté. Súper si vyberie svoje 3 a odohrá 3 kolá.</div>
    <div class="acts"><button class="btn pri" id="cdLocalGo">Som súper – hrám</button><button class="btn ico" id="cdX" style="flex:0 0 56px">✕</button></div>`);
  CD={mode:"handoff",p};
}
async function cdSendLink(){
  if(typeof ensureNick==="function"&&!(await ensureNick()))return;
  const seed=Math.floor(Math.random()*1e6),cats=[0,1,2].map(i=>CD_CATS[hash(String(seed)+i)%CD_CATS.length][0]);
  await ensureTok();const p={n:nick(),c:CD.sel,k:cats,s:seed,pid:(typeof PID!=="undefined"?PID:"")};
  const url=shareUrl("k",b64e(JSON.stringify(p)));
  const text=`⚔️ ${p.n} ťa vyzýva na súboj kartičiek lietadiel v appke Čo to letí? ✈️ Trúfneš si?`;
  cdClose();
  try{if(navigator.share){await navigator.share({title:"Súboj kartičiek",text,url});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho kamarátovi")}catch(e){prompt("Skopíruj odkaz:",url)}
}
/* súper: odohraj 3 kolá */
function cdAccept(p){
  // férovo: aj ty si najprv naslepo vyberieš 3 kartičky (nevieš kategórie) a hráš len s nimi
  const deck=myDeck();CD={mode:"rpick",p,sel:[],round:0,used:[],score:[0,0],log:[]};
  cdOpen(`<div class="lbl"><span>⚔️ ${esc(p.n)} vs. ty</span></div>
    <div class="trTitle" style="margin-top:10px">Vyber svoje 3 kartičky</div>
    <div class="lookSub">Kategórie uvidíš až v kolách – rovnako ako ${esc(p.n)}.</div>
    <div class="cdPick" id="cdPick">${deck.map(k=>`<button data-k="${esc(k)}">${cdMini(k)}</button>`).join("")}</div>
    <div class="acts"><button class="btn pri" id="cdPlay" disabled style="opacity:.5">Hrať (0/3)</button></div>`);
}
function cdRound(){
  const {p,round}=CD,cat=CD_CATS.find(x=>x[0]===(CD.tb?CD.tb.k:p.k[round])),deck=CD.mine||myDeck();
  cdOpen(`<div class="lbl"><span>⚔️ ${esc(p.n)} vs. ty</span><span>${CD.score[1]} : ${CD.score[0]}</span></div>
    <div class="lookSub" style="margin-top:10px">${CD.tb?"⚡ Rozstrel":"Kolo "+(round+1)+" z 3"} · vyhráva vyššie číslo</div>
    <div class="cdCat">${cat[1]} 📊</div>
    <div class="lookSub">Vyber kartu, ktorou prebiješ súperovu skrytú kartu.</div>
    <div class="cdPick" id="cdPick">${deck.map(k=>`<button data-k="${esc(k)}" ${CD.used.includes(k)&&!CD.tb?"disabled":""}>${cdMini(k)}<b class="cdV">${cdVal(k,cat[0],1)}</b></button>`).join("")}</div>
    <div class="acts"><button class="btn ico" id="cdX" style="flex:1">Vzdať sa</button></div>`);
}
function cdReveal(mine){
  const {p,round}=CD,cat=CD.tb?CD.tb.k:p.k[round],theirs=CD.tb?CD.tb.c:p.c[round],a=cdStat(mine,cat,1),b=cdStat(theirs,cat),win=a>b?1:a<b?0:-1;
  CD.used.push(mine);if(win===1)CD.score[1]++;else if(win===0)CD.score[0]++;
  CD.log.push(win);haptic(win===1?[20,40,20]:60);if(win===1)ping("u");
  const catN=CD_CATS.find(x=>x[0]===cat)[1];
  cdOpen(`<div class="lbl"><span>${CD.tb?"Rozstrel":"Kolo "+(round+1)} · ${catN}</span><span>${CD.score[1]} : ${CD.score[0]}</span></div>
    <div class="cdRow"><div><div class="lookSub" style="text-align:center;margin-bottom:6px">Ty · <b>${cdVal(mine,cat,1)}</b></div><div class="cdCard">${cdMini(mine)}</div></div><div class="vs">VS</div>
    <div><div class="lookSub" style="text-align:center;margin-bottom:6px">${esc(p.n)} · <b>${cdVal(theirs,cat)}</b></div><div class="cdCard">${cdMini(theirs,{n:1,r:cardRar(theirs),first:Date.now()})}</div></div></div>
    <div class="cdScore">${win===1?"🎉 Bod pre teba!":win===0?"😬 "+esc(p.n)+" berie bod":"🤝 Remíza"}</div>
    <div class="acts"><button class="btn pri" id="cdNext">${round<2&&!CD.tb?"Ďalšie kolo →":"Výsledok 🏁"}</button></div>`);
}
function cdResult(){
  const [them,me]=CD.score,p=CD.p,w=me>them,draw=me===them;
  // ⚡ remíza po 3 kolách → jedno rozhodujúce kolo s náhodnou kategóriou a súperovou najsilnejšou kartou v nej
  if(draw&&!CD.tb){const k=CD_CATS[hash(String(p.s)+"tb")%CD_CATS.length][0];const c=p.c.slice().sort((x,y)=>cdStat(y,k)-cdStat(x,k))[0];CD.tb={k,c};cdRound();return}
  const key="kd"+hash(JSON.stringify(p)),done=LS.get("ctl_kdDone",[]);
  // odmena max. 3× denne a 1× denne od toho istého súpera (proti farmeniu bodov); na jednom mobile bez bodov
  const dd=LS.get("ctl_kdDay",{d:"",n:0,who:[]});if(dd.d!==dayKey()){dd.d=dayKey();dd.n=0;dd.who=[]}
  const paid=w&&!p.local&&!done.includes(key)&&dd.n<3&&!dd.who.includes(p.n);
  if(paid){grantAch("cardduel");COL.pts+=15;dd.n++;dd.who.push(p.n);LS.set("ctl_kdDay",dd);LS.set("ctl_col",COL);confetti(100)}else if(w&&!p.local)grantAch("cardduel");
  if(!done.includes(key)){done.push(key);LS.set("ctl_kdDone",done.slice(-200))}
  CD.res=`${me}:${them}`;
  // výsledok sa dozvie aj vyzývateľ (raz za súboj)
  if(!p.local&&p.pid&&/^[A-Za-z0-9]{16}$/.test(p.pid)&&!done.includes(key+"r")&&typeof apiPost==="function"){done.push(key+"r");LS.set("ctl_kdDone",done.slice(-200));apiPost("/api/duelres",{to:p.pid,res:`${me}:${them}`}).catch(()=>{})}
  // 👨‍👩‍👧 bilancia s týmto súperom tento týždeň (len v mobile)
  const wk=weekBounds().from,FS=LS.get("ctl_famScore",{}),nm=p.n;
  if(!done.includes(key+"s")){const r=FS[nm]&&FS[nm].wk===wk?FS[nm]:{wk,w:0,l:0,d:0};if(w)r.w++;else if(draw)r.d++;else r.l++;FS[nm]=r;LS.set("ctl_famScore",FS);done.push(key+"s");LS.set("ctl_kdDone",done.slice(-200))}
  const bal=FS[nm]&&FS[nm].wk===wk?FS[nm]:null;
  cdOpen(`<div style="text-align:center;font-size:64px;margin-top:6px">${w?"🏆":draw?"🤝":"😅"}</div>
    <div class="cdScore">${w?"Výhra! 🏆":draw?"Remíza":"Tentoraz nie"} ${me}:${them}</div>
    <div class="lookSub" style="text-align:center">${w?(paid?"+15 bodov. ":"")+(p.local?"Gratulujeme!":esc(p.n)+" bude zúriť 😄"):draw?"Vyrovnaný súboj – skúste odvetu!":"Nabudúce! Zbieraj silnejšie kartičky – pozeraj hore."}</div>
    ${bal?`<div class="lookSub" style="text-align:center;margin-top:4px">Tento týždeň s ${p.local?"týmto súperom":"hráčom "+esc(p.n)}: <b>${bal.w}:${bal.l}</b>${bal.d?" · remízy "+bal.d:""}</div>`:""}
    <div class="acts">${p.local?`<button class="btn pri" id="cdAgain">🔁 Ešte raz</button>`:`<button class="btn pri" id="cdBrag">📤 Pošli výsledok a odvetu</button>`}</div>
    <div class="acts">${p.local?"":`<button class="btn sec" id="cdBack">⚔️ Vyzvi späť</button>`}<button class="btn ico" id="cdX" style="flex:0 0 56px">✕</button></div>`);
}
$("cdBox").onclick=async e=>{
  const t=e.target.closest("button");if(!t)return;
  if(t.id==="cdX"){cdClose();return}
  if(CD&&CD.mode==="pick"&&t.dataset.k){const k=t.dataset.k,i=CD.sel.indexOf(k);if(i>=0)CD.sel.splice(i,1);else if(CD.sel.length<3)CD.sel.push(k);
    cdMark();
    for(const id of ["cdSend","cdLocal"]){const s=$(id);if(!s)continue;s.disabled=CD.sel.length<3;s.style.opacity=CD.sel.length<3?.5:1}
    if($("cdSend"))$("cdSend").textContent=`⚔️ Vyzvi (${CD.sel.length}/3)`;haptic(6);return}
  if(t.id==="cdLocal"&&CD&&CD.sel.length===3){cdLocalHandoff();return}
  if(t.id==="cdLocalGo"&&CD&&CD.mode==="handoff"){cdAccept(CD.p);return}
  if(t.id==="cdAgain"){cdStart();return}
  if(t.id==="cdSend"&&CD&&CD.sel.length===3){cdSendLink();return}
  if(CD&&CD.mode==="rpick"&&t.dataset.k){const k=t.dataset.k,i=CD.sel.indexOf(k);if(i>=0)CD.sel.splice(i,1);else if(CD.sel.length<3)CD.sel.push(k);
    cdMark();const s=$("cdPlay");s.disabled=CD.sel.length<3;s.style.opacity=CD.sel.length<3?.5:1;s.textContent=`Hrať (${CD.sel.length}/3)`;haptic(6);return}
  if(t.id==="cdPlay"&&CD&&CD.sel.length===3){CD.mine=CD.sel.slice();CD.mode="play";cdRound();return}
  if(CD&&CD.mode==="play"&&t.dataset.k&&!t.disabled){cdReveal(t.dataset.k);return}
  if(t.id==="cdNext"){if(CD.tb){cdResult();return}CD.round++;if(CD.round<3)cdRound();else cdResult();return}
  if(t.id==="cdBrag"){
    // výsledok + odveta: nový odkaz s mojimi kartami
    const [them,me]=CD.score,res=me>them?"výhra":me===them?"remíza":"prehra";
    const seed=Math.floor(Math.random()*1e6),cats=[0,1,2].map(i=>CD_CATS[hash(String(seed)+i)%CD_CATS.length][0]);
    await ensureTok();const url=shareUrl("k",b64e(JSON.stringify({n:nick(),c:CD.mine,k:cats,s:seed,pid:(typeof PID!=="undefined"?PID:"")})));
    const text=`⚔️ Súboj kartičiek s hráčom ${CD.p.n}: ${res} ${me}:${them}. Odveta? ✈️`;
    try{if(navigator.share){await navigator.share({text,url});return}}catch(er){if(er.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text+" "+url);toast("Skopírované 📋","Pošli to súperovi")}catch(er){}return}
  if(t.id==="cdBack"){cdStart();return}
};
$("b-cduel").onclick=()=>{haptic(8);cdStart()};
ACH.push({id:"cardduel",i:"🃏",n:"Víťaz súboja kartičiek",h:"Vyhraj súboj kartičiek s kamarátom cez odkaz",soc:1,c:()=>false});
function cdFromHash(){const m=location.hash.match(/kd=([\w-]+)/);if(!m)return;if(!LS.get("ctl_onb",0)){afterOnb(cdFromHash);return}
  // detský režim: žiadne výzvy od cudzích ľudí
  if(typeof KID==="function"&&KID()){try{history.replaceState(null,"",location.pathname)}catch(e){}return}
  try{const p=JSON.parse(b64d(m[1]));if(!Array.isArray(p.c)||p.c.length!==3||!Array.isArray(p.k)||p.k.length!==3)return;
    if(!p.c.every(x=>CAT[x])||new Set(p.c).size!==3)return; // len skutočné kartičky z atlasu, každá raz
    p.n=safeNick(p.n);p.pid=/^[A-Za-z0-9]{16}$/.test(p.pid||"")?p.pid:"";p.c=p.c.map(x=>String(x).slice(0,6));p.k=p.k.map(x=>CD_CATS.find(c=>c[0]===x)?x:"spd");
    setTimeout(()=>{cdOpen(`<div style="text-align:center;font-size:56px">⚔️</div><div class="cdScore" style="font-size:26px">${esc(p.n)} ťa vyzýva na súboj kartičiek!</div>
      <div class="lookSub" style="text-align:center">3 kolá. V každom dostaneš kategóriu a vyberieš kartu, ktorou prebiješ jeho skrytú kartu.</div>
      <div class="acts"><button class="btn pri" id="cdGo">Hrať ⚔️</button></div>`);
      $("cdGo").onclick=()=>cdAccept(p)},1600);
  }catch(e){}
  try{history.replaceState(null,"",location.pathname)}catch(e){}}
cdFromHash();addEventListener("hashchange",cdFromHash);

// 👨‍👩‍👧 skóre súbojov tento týždeň (pod tlačidlom Súboj kartičiek)
function famScoreRender(){const el=$("famScore");if(!el)return;const wk=weekBounds().from,FS=LS.get("ctl_famScore",{});
  const rows=Object.entries(FS).filter(([,r])=>r.wk===wk).slice(0,4);el.innerHTML=rows.length?"Tento týždeň: "+rows.map(([n,r])=>`${esc(n)} <b>${r.w}:${r.l}</b>`).join(" · "):""}
HOOKS.view.push(v=>{if(v==="col")famScoreRender()});

// ⚔️ výsledky súbojov, ktoré dohrali tvoji súperi (zo servera)
HOOKS.social=HOOKS.social||[];HOOKS.social.push(D=>{for(const x of (D&&D.duelIn)||[]){const [a,b]=String(x.res).split(":").map(Number);if(a<b)grantAch("cardduel");
  const FS=LS.get("ctl_famScore",{}),wk=weekBounds().from,r=FS[x.n]&&FS[x.n].wk===wk?FS[x.n]:{wk,w:0,l:0,d:0};if(a>b)r.l++;else if(a<b)r.w++;else r.d++;FS[x.n]=r;LS.set("ctl_famScore",FS);
  toast("⚔️ "+x.n+(a>b?" ťa porazil(a) ":a<b?" prehral(a) s tebou ":" remizoval(a) ")+x.res,"Súboj kartičiek – daj si odvetu v záložke Ja");famScoreRender()}});
