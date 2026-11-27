"use strict";

const journalRegions=new Intl.DisplayNames(["sk"],{type:"region",fallback:"none"});
const journalDate=new Intl.DateTimeFormat("sk-SK",{year:"numeric",month:"long",day:"numeric",timeZone:"Europe/Bratislava"});
const journalPreferred=["RYR","WZZ","TVS","PGT","SXS","MSC","MNE","AXE","AUA","DLH","LOT","KLM","UAE","QTR","THY","EZY","CFG","SWR"];
const journalAssets={
  world:{path:"lib/journal-world.json",data:null,pending:null,error:false},
  brands:{path:"lib/journal-brands.json",data:null,pending:null,error:false}
};
let journalMode="ct",journalMap="world",journalFilter="mine",journalOpener=null,waveJournalDiscoveries=[];

function journalCountry(code){return /^[A-Z]{2}$/.test(code)?(journalRegions.of(code)||""):""}
function journalFlag(code){return String.fromCodePoint(...[...code].map(char=>127397+char.charCodeAt(0)))}
function journalBrandName(code,entry){return AIRLINES[code]||entry?.name||code}
const journalByName=(a,b)=>a.name.localeCompare(b.name,"sk");
function journalEntries(mode){
  const albums=collectionAlbums(),passport=mode==="ct";
  const ledger=passport?albums.destinations:albums.airlines;
  const entries=new Map();
  for(const [key,value] of Object.entries(ledger)){
    const code=passport?key:airlineBrand(key);
    const name=passport?journalCountry(code):journalBrandName(code,value);
    if(!name||(!passport&&(!/^[A-Z]{3}$/.test(code)||NON_AIRLINE_CODES.has(code)))||["XX","ZZ","EU","UN"].includes(code))continue;
    const old=entries.get(code),data=typeof value==="object"&&value?value:{};
    const first=!old||((data.t||0)>0&&(!old.t||data.t<old.t))?data:old;
    entries.set(code,{...first,code,name,fresh:!!(old?.fresh||data.fresh)});
  }
  // Staršie albumy mali iba zaškrtnutie. Ak je pôvodný let ešte v histórii,
  // zobraz jeho dátum a trasu bez toho, aby sme historický objav znova animovali.
  const legacy=new Set([...entries.values()].filter(entry=>!entry.t).map(entry=>entry.code));
  if(legacy.size){
    for(const item of Object.values(COL.cx||{})){
      const code=passport?String(item.dc||"").toUpperCase():airlineBrand(item.al);
      if(!legacy.has(code)||!item.t)continue;
      const entry=entries.get(code);
      if(!entry.t||item.t<entry.t)Object.assign(entry,{t:item.t,call:item.call,dest:item.dest,ap:item.ap});
    }
  }
  return [...entries.values()].sort((a,b)=>(b.t||0)-(a.t||0)||journalByName(a,b));
}

function journalLoad(key){
  const asset=journalAssets[key];
  if(asset.data||asset.pending||asset.error)return;
  asset.pending=fetch(asset.path+journalAssetVersion)
    .then(response=>{if(!response.ok)throw Error(response.status);return response.json()})
    .then(data=>{asset.data=data})
    .catch(()=>{asset.error=true})
    .finally(()=>{asset.pending=null;if(S.view==="journal"&&(journalMode==="ct")===(key==="world"))renderJournal()});
}
const journalAssetVersion=new URL(document.currentScript.src).search;

function journalPassport(entries){
  const data=journalAssets.world.data;
  const zoomed=journalMap==="europe";
  const viewBox=zoomed?"452 12 160 112":"-10 -10 1020 460";
  const unlocked=new Map(entries.map(entry=>[entry.code,entry]));
  const map=data?Object.entries(data.regions).map(([code,[shape,x,y]])=>{
    const entry=unlocked.get(code);
    if(!entry)return shape?`<path d="${shape}"/>`:"";
    return `<g class="journalLand${entry.fresh?" fresh":""}" data-journal-entry="${code}">
      ${shape?`<path d="${shape}"/>`:""}
      <circle class="journalPoint" cx="${x}" cy="${y}" r="${zoomed?1.25:3.2}"/>
      ${entry.fresh?`<circle class="journalPulse" cx="${x}" cy="${y}" r="${zoomed?5:15}"/>`:""}
    </g>`;
  }).join(""):"";
  const retry=journalAssets.world.error?'<button type="button" class="ghost" data-journal-retry="world">Načítať mapu znova</button>':"";
  const stamp=entry=>`<li><button type="button" class="journalStamp${entry.fresh?" fresh":""}" data-journal-entry="${entry.code}">
    <span class="journalFlag" aria-hidden="true">${journalFlag(entry.code)}</span><span><b>${esc(entry.name)}</b>${entry.dest?`<small>${esc(entry.dest)}</small>`:""}</span><span class="journalArrow" aria-hidden="true">›</span>
    </button></li>`;
  return `<section class="journalMapCard" aria-label="Mapa leteckého pasu">
    <div class="journalMapHead"><div><strong>${entries.length}</strong> ${pl(entries.length,"krajina","krajiny","krajín")}</div>
    <div class="journalToggle" role="group" aria-label="Výrez mapy">
      <button type="button" data-journal-map="world" aria-pressed="${!zoomed}">Svet</button>
      <button type="button" data-journal-map="europe" aria-pressed="${zoomed}">Európa</button>
    </div></div>
    <div class="journalMapStage">${data?`<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">
      ${data.base?`<path d="${data.base}"/>`:""}${map}</svg>`:
      `<div class="journalMapLoading">${retry||"Načítavam mapu…"}</div>`}</div>
    <p class="journalMapLegend"><span></span> Odhalené krajiny</p>
  </section>
  ${entries.length?`<section class="journalStampList" aria-label="Pečiatky">
    <h2>Pečiatky</h2><ul>${entries.slice(0,3).map(stamp).join("")}</ul>
    ${entries.length>3?`<details class="journalFold" data-journal-stamps><summary>Všetky pečiatky (${entries.length})</summary><ul>${entries.slice(3).map(stamp).join("")}</ul></details>`:""}
  </section>`:`<p class="journalEmpty">Prvú pečiatku získaš za cieľovú krajinu letu, ktorému zamávaš.</p>`}`;
}

function journalLogo(code){
  return `<span class="journalMonogram" aria-hidden="true">${esc(code)}</span>`;
}
function journalAirlines(entries){
  const owned=new Map(entries.map(entry=>[entry.code,entry]));
  const all=new Set([...Object.keys(AIRLINES).filter(code=>!NON_AIRLINE_CODES.has(code)).map(airlineBrand),...owned.keys()]);
  const others=[...all].filter(code=>!owned.has(code)).map(code=>({code,name:journalBrandName(code)}));
  const order=code=>journalPreferred.includes(code)?journalPreferred.indexOf(code):journalPreferred.length;
  others.sort((a,b)=>order(a.code)-order(b.code)||journalByName(a,b));
  const empty=journalFilter==="mine"&&!entries.length;
  const cards=journalFilter==="all"?[...entries,...others]:empty?others.slice(0,2):entries;
  const tile=entry=>{
    const has=owned.has(entry.code);
    return `<li><button type="button" class="journalBrand${has?" owned":""}${entry.fresh?" fresh":""}" data-journal-entry="${entry.code}"${has?"":' aria-label="'+esc(entry.name)+', neulovená"'}><span class="journalBrandLogo">${journalLogo(entry.code)}</span>
      <span class="journalBrandCaption"><b>${esc(entry.name)}</b><small>${entry.fresh?"Nový objav":has?entry.code:"Neulovená"}</small></span></button></li>`;
  };
  const retry=journalAssets.brands.error?'<button type="button" class="ghost" data-journal-retry="brands">Načítať údaje aeroliniek znova</button>':"";
  return `<section class="journalAirlines" aria-label="Album aeroliniek">
    <div class="journalAirHead"><div><strong>${entries.length}</strong> ${pl(entries.length,"značka","značky","značiek")}</div>
    <div class="journalToggle" role="group" aria-label="Filter aeroliniek">
      <button type="button" data-journal-filter="mine" aria-pressed="${journalFilter==="mine"}">Moje</button>
      <button type="button" data-journal-filter="all" aria-pressed="${journalFilter==="all"}">Katalóg</button>
    </div></div>
    ${retry}${empty?'<p class="journalEmpty">Zamávaj letu rozpoznanej aerolinky a odomkneš jej kartičku.</p>':""}
    <ul class="journalBrandGrid">${cards.map(tile).join("")}</ul>
  </section>`;
}

const recentObservationTime=new Intl.DateTimeFormat("sk-SK",{
  timeZone:"Europe/Bratislava", day:"numeric", month:"numeric", hour:"2-digit", minute:"2-digit"
});
function renderRecentObservations(){
  const now=Date.now();
  const rows=LOG.filter(entry=>{
    const time=entry&&observationTime(entry);
    return Number.isFinite(time)&&time>0&&time<=now;
  })
    .slice(-3).reverse().map(entry=>{
      const item=document.createElement("li");
      const title=document.createElement("span");
      const time=document.createElement("time");
      const date=new Date(observationTime(entry));
      title.textContent=entry.ty?catGuess(entry.ty).name:"Neznámy typ lietadla";
      time.dateTime=date.toISOString();
      time.textContent=recentObservationTime.format(date);
      item.append(title,time);
      return item;
    });
  $("journalRecent").replaceChildren(...rows);
  $("journalRecentEmpty").hidden=!!rows.length;
}

function renderJournal(focus){
  renderRecentObservations();
  const host=$("journalAlbum");
  const wasOpen=host.querySelector(".albumExtras")?.open,stampsOpen=host.querySelector("[data-journal-stamps]")?.open;
  const entries=journalEntries(journalMode);
  const key=journalMode==="ct"?"world":"brands";
  journalLoad(key);
  document.querySelectorAll("[data-journal]").forEach(button=>{
    const selected=button.dataset.journal===journalMode;
    const unread=selected?[]:journalEntries(button.dataset.journal).filter(entry=>entry.fresh);
    button.setAttribute("aria-pressed",String(selected));
    const badge=button.querySelector("span");
    badge.hidden=!unread.length;
    badge.textContent=unread.length?String(unread.length):"";
  });
  host.innerHTML=(journalMode==="ct"?journalPassport(entries):journalAirlines(entries))
    +`<details class="albumExtras journalFold"><summary>Tematické sady</summary>${setRows(journalMode)}</details>`;
  if(wasOpen)host.querySelector(".albumExtras").open=true;
  if(stampsOpen&&host.querySelector("[data-journal-stamps]"))host.querySelector("[data-journal-stamps]").open=true;
  if(focus)host.querySelector(focus)?.focus({preventScroll:true});
  if(journalAssets[key].data&&entries.some(entry=>entry.fresh)){
    const ledger=journalMode==="ct"?COL.albums.destinations:COL.albums.airlines;
    for(const entry of Object.values(ledger))if(entry?.fresh)delete entry.fresh;
    LS.set("ctl_col",COL);
  }
}

function openJournalEntry(code,trigger){
  const isPassport=journalMode==="ct",entry=journalEntries(journalMode).find(e=>e.code===code);
  if(isPassport&&!entry)return;
  if(!isPassport&&!entry&&(!Object.hasOwn(AIRLINES,code)||NON_AIRLINE_CODES.has(code)))return;
  const name=isPassport?entry.name:journalBrandName(code,entry);
  const brand=isPassport?null:journalAssets.brands.data?.[code];
  const date=entry?.t?journalDate.format(entry.t):"";
  const flight=entry?.call||"";
  const destination=entry?.dest||entry?.ap||"";
  const first=[date&&["Dátum",date],flight&&["Let",flight],destination&&["Cieľ letu",destination]].filter(Boolean);
  const facts=brand?[brand.country&&["Krajina",journalCountry(brand.country)],brand.hubs?.length&&["Hlavné letiská",brand.hubs.join(" · ")],brand.founded&&["Vznik",brand.founded]].filter(Boolean):[];
  const dataRows=rows=>`<dl class="journalFacts">${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`;
  const label=entry?(isPassport?"Pečiatka v pase":"V zbierke"):"Neulovená aerolinka";
  $("journalDetailBody").innerHTML=`<div class="journalDetailMark${isPassport?" passport":""}">
    ${isPassport?`<span aria-hidden="true">${journalFlag(code)}</span>`:journalLogo(code)}</div>
    <p class="journalDetailStatus">${label}</p><h2 id="journalDetailTitle">${esc(name)}</h2>
    ${brand?.fact?`<p class="journalFact">${esc(brand.fact)}</p>
      ${/^https:\/\//.test(brand.source||"")?`<a class="journalSource" href="${esc(brand.source)}" target="_blank" rel="noopener">Zdroj zaujímavosti</a>`:""}`:""}
    ${facts.length?dataRows(facts):""}
    ${entry?(first.length?`<h3>Prvý úlovok</h3>${dataRows(first)}`:""):
      "<p>Kartičku získaš, keď zamávaš letu tejto aerolinky.</p>"}`;
  journalOpener=trigger instanceof HTMLElement?trigger:$("journalAlbum").querySelector(`button[data-journal-entry="${code}"]`);
  $("journalDetail").showModal();
}

function journalWaveReward(added,append=false){
  const pending=[...(append?waveJournalDiscoveries:[]),...(added||[])];
  waveJournalDiscoveries=pending.filter((entry,index)=>pending.findIndex(item=>item.which===entry.which&&item.code===entry.code)===index);
  const discoveries=waveJournalDiscoveries;
  const button=$("waveJournalResult");
  button.hidden=!discoveries?.length;
  if(!discoveries?.length)return;
  button.textContent=discoveries.length>1?"2 nové objavy v Denníku":
    discoveries[0].which==="ct"?"Nová pečiatka v pase":"Nová aerolinka v Denníku";
  button.onclick=()=>{
    button.hidden=true;
    waveJournalDiscoveries=[];
    journalMode=discoveries.find(item=>item.which==="ct")?"ct":"al";
    if(journalMode==="ct")journalMap="world";
    if(journalMode==="al")journalFilter="mine";
    S.scroll=S.scroll||{};
    S.scroll.journal=0;
    setView("journal");
    document.querySelector(`[data-journal="${journalMode}"]`).focus({preventScroll:true});
  };
}

document.querySelectorAll("[data-journal]").forEach(button=>button.onclick=()=>{
  if(button.dataset.journal===journalMode)return;
  journalMode=button.dataset.journal;
  renderJournal();
});
$("journalAlbum").addEventListener("click",e=>{
  const selected=e.target.closest("[data-journal-entry],[data-journal-map],[data-journal-filter],[data-journal-retry]");
  if(!selected)return;
  const {journalEntry,journalMap:map,journalFilter:filter,journalRetry}=selected.dataset;
  if(journalEntry)openJournalEntry(journalEntry,selected);
  else if(map&&map!==journalMap){journalMap=map;renderJournal(`[data-journal-map="${map}"]`)}
  else if(filter&&filter!==journalFilter){journalFilter=filter;renderJournal(`[data-journal-filter="${filter}"]`)}
  else if(journalRetry){journalAssets[journalRetry].error=false;renderJournal()}
});
$("journalDetail").querySelector(".journalClose").onclick=()=>$("journalDetail").close();
$("journalDetail").addEventListener("click",e=>{if(e.target===$("journalDetail"))$("journalDetail").close()});
$("journalDetail").addEventListener("close",()=>{if($("journalDetail").open)return;journalOpener?.focus({preventScroll:true});journalOpener=null});
