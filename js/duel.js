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
    <div class="acts"><button class="btn pri" id="cdSend" disabled style="opacity:.5">⚔️ Vyzvi (0/3)</button><button class="btn ico" id="cdX" style="flex:0 0 56px">✕</button></div>`);
}
async function cdSendLink(){
  const seed=Math.floor(Math.random()*1e6),cats=[0,1,2].map(i=>CD_CATS[hash(String(seed)+i)%CD_CATS.length][0]);
  await ensureTok();const p={n:nick(),c:CD.sel,k:cats,s:seed};
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
  const {p,round}=CD,cat=CD_CATS.find(x=>x[0]===p.k[round]),deck=CD.mine||myDeck();
  cdOpen(`<div class="lbl"><span>⚔️ ${esc(p.n)} vs. ty</span><span>${CD.score[1]} : ${CD.score[0]}</span></div>
    <div class="lookSub" style="margin-top:10px">Kolo ${round+1} z 3 · vyhráva vyššie číslo</div>
    <div class="cdCat">${cat[1]} 📊</div>
    <div class="lookSub">Vyber kartu, ktorou prebiješ súperovu skrytú kartu.</div>
    <div class="cdPick" id="cdPick">${deck.map(k=>`<button data-k="${esc(k)}" ${CD.used.includes(k)?"disabled":""}>${cdMini(k)}</button>`).join("")}</div>
    <div class="acts"><button class="btn ico" id="cdX" style="flex:1">Vzdať sa</button></div>`);
}
function cdReveal(mine){
  const {p,round}=CD,cat=p.k[round],theirs=p.c[round],a=cdStat(mine,cat,1),b=cdStat(theirs,cat),win=a>b?1:a<b?0:-1;
  CD.used.push(mine);if(win===1)CD.score[1]++;else if(win===0)CD.score[0]++;
  CD.log.push(win);haptic(win===1?[20,40,20]:60);if(win===1)ping("u");
  const catN=CD_CATS.find(x=>x[0]===cat)[1];
  cdOpen(`<div class="lbl"><span>Kolo ${round+1} · ${catN}</span><span>${CD.score[1]} : ${CD.score[0]}</span></div>
    <div class="cdRow"><div><div class="lookSub" style="text-align:center;margin-bottom:6px">Ty · <b>${cdVal(mine,cat,1)}</b></div><div class="cdCard">${cdMini(mine)}</div></div><div class="vs">VS</div>
    <div><div class="lookSub" style="text-align:center;margin-bottom:6px">${esc(p.n)} · <b>${cdVal(theirs,cat)}</b></div><div class="cdCard">${cdMini(theirs,{n:1,r:cardRar(theirs),first:Date.now()})}</div></div></div>
    <div class="cdScore">${win===1?"🎉 Bod pre teba!":win===0?"😬 "+esc(p.n)+" berie bod":"🤝 Remíza"}</div>
    <div class="acts"><button class="btn pri" id="cdNext">${round<2?"Ďalšie kolo →":"Výsledok 🏁"}</button></div>`);
}
function cdResult(){
  const [them,me]=CD.score,p=CD.p,w=me>them;
  const key="kd"+hash(JSON.stringify(p)),done=LS.get("ctl_kdDone",[]);
  // odmena max. 3× denne a 1× denne od toho istého súpera (proti farmeniu bodov)
  const dd=LS.get("ctl_kdDay",{d:"",n:0,who:[]});if(dd.d!==dayKey()){dd.d=dayKey();dd.n=0;dd.who=[]}
  const paid=w&&!done.includes(key)&&dd.n<3&&!dd.who.includes(p.n);
  if(paid){grantAch("cardduel");COL.pts+=15;dd.n++;dd.who.push(p.n);LS.set("ctl_kdDay",dd);LS.set("ctl_col",COL);confetti(100)}else if(w)grantAch("cardduel");
  if(!done.includes(key)){done.push(key);LS.set("ctl_kdDone",done.slice(-200))}
  CD.res=`${me}:${them}`;
  cdOpen(`<div style="text-align:center;font-size:64px;margin-top:6px">${w?"🏆":me===them?"🤝":"😅"}</div>
    <div class="cdScore">${w?"Výhra! 🏆":me===them?"Remíza":"Tentoraz nie"} ${me}:${them}</div>
    <div class="lookSub" style="text-align:center">${w?(paid?"+15 bodov. ":"")+esc(p.n)+" bude zúriť 😄":"Nabudúce! Zbieraj silnejšie kartičky – pozeraj hore."}</div>
    <div class="acts"><button class="btn pri" id="cdBrag">📤 Pošli výsledok</button></div>
    <div class="acts"><button class="btn sec" id="cdBack">⚔️ Vyzvi ho späť</button><button class="btn ico" id="cdX" style="flex:0 0 56px">✕</button></div>`);
}
$("cdBox").onclick=async e=>{
  const t=e.target.closest("button");if(!t)return;
  if(t.id==="cdX"){cdClose();return}
  if(CD&&CD.mode==="pick"&&t.dataset.k){const k=t.dataset.k,i=CD.sel.indexOf(k);if(i>=0)CD.sel.splice(i,1);else if(CD.sel.length<3)CD.sel.push(k);
    [...$("cdPick").children].forEach(b=>b.classList.toggle("sel",CD.sel.includes(b.dataset.k)));
    const s=$("cdSend");s.disabled=CD.sel.length<3;s.style.opacity=CD.sel.length<3?.5:1;s.textContent=`⚔️ Vyzvi (${CD.sel.length}/3)`;haptic(6);return}
  if(t.id==="cdSend"&&CD&&CD.sel.length===3){cdSendLink();return}
  if(CD&&CD.mode==="rpick"&&t.dataset.k){const k=t.dataset.k,i=CD.sel.indexOf(k);if(i>=0)CD.sel.splice(i,1);else if(CD.sel.length<3)CD.sel.push(k);
    [...$("cdPick").children].forEach(b=>b.classList.toggle("sel",CD.sel.includes(b.dataset.k)));const s=$("cdPlay");s.disabled=CD.sel.length<3;s.style.opacity=CD.sel.length<3?.5:1;s.textContent=`Hrať (${CD.sel.length}/3)`;haptic(6);return}
  if(t.id==="cdPlay"&&CD&&CD.sel.length===3){CD.mine=CD.sel.slice();CD.mode="play";cdRound();return}
  if(CD&&CD.mode==="play"&&t.dataset.k&&!t.disabled){cdReveal(t.dataset.k);return}
  if(t.id==="cdNext"){CD.round++;if(CD.round<3)cdRound();else cdResult();return}
  if(t.id==="cdBrag"){const text=`⚔️ Súboj kartičiek lietadiel s ${CD.p.n}: ${CD.score[1]>CD.score[0]?"vyhral som":"prehral som"} ${CD.res} ✈️ Zahraj si aj ty:`;
    try{if(navigator.share){await navigator.share({text,url:location.origin+location.pathname});return}}catch(er){if(er.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text+" "+location.origin+location.pathname);toast("Skopírované 📋","")}catch(er){}return}
  if(t.id==="cdBack"){cdStart();return}
};
$("b-cduel").onclick=()=>{haptic(8);cdStart()};
ACH.push({id:"cardduel",i:"🃏",n:"Víťaz súboja kartičiek",c:()=>false});
function cdFromHash(){const m=location.hash.match(/kd=([\w-]+)/);if(!m)return;if(!LS.get("ctl_onb",0)){afterOnb(cdFromHash);return}
  // detský režim: žiadne výzvy od cudzích ľudí
  if(typeof KID==="function"&&KID()){try{history.replaceState(null,"",location.pathname)}catch(e){}return}
  try{const p=JSON.parse(b64d(m[1]));if(!Array.isArray(p.c)||p.c.length!==3||!Array.isArray(p.k)||p.k.length!==3)return;
    if(!p.c.every(x=>CAT[x])||new Set(p.c).size!==3)return; // len skutočné kartičky z atlasu, každá raz
    p.n=safeNick(p.n);p.c=p.c.map(x=>String(x).slice(0,6));p.k=p.k.map(x=>CD_CATS.find(c=>c[0]===x)?x:"spd");
    setTimeout(()=>{cdOpen(`<div style="text-align:center;font-size:56px">⚔️</div><div class="cdScore" style="font-size:26px">${esc(p.n)} ťa vyzýva na súboj kartičiek!</div>
      <div class="lookSub" style="text-align:center">3 kolá. V každom dostaneš kategóriu a vyberieš kartu, ktorou prebiješ jeho skrytú kartu.</div>
      <div class="acts"><button class="btn pri" id="cdGo">Hrať ⚔️</button></div>`);
      $("cdGo").onclick=()=>cdAccept(p)},1600);
  }catch(e){}
  try{history.replaceState(null,"",location.pathname)}catch(e){}}
cdFromHash();addEventListener("hashchange",cdFromHash);
