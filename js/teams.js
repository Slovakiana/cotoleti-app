"use strict";
/* ============ 👥 Tímy (trieda, firma, partia) ============ */
async function teamCall(body){
  const r=await fetch(SOC.api+"/api/team",{method:"POST",headers:{"Content-Type":"text/plain"},body:JSON.stringify({id:SOC.cid,nick:LS.get("ctl_nick","")||"Spotter",...body})});
  return r.json();
}
function teamRender(){
  const t=SOC.data&&SOC.data.myTeam,box=$("teamBox");
  if(!SOC.api){box.innerHTML='<div class="lookSub">Tímy potrebujú server.</div>';return}
  if(!t){
    $("teamRank").textContent="";
    box.innerHTML=`<div class="lookSub" style="margin-top:8px">Založ tím pre triedu, firmu alebo partiu. Každé mávnutie člena sa počíta do týždenného rebríčka tímov.</div>
      <div class="manual"><input id="tmName" maxlength="24" placeholder="Názov tímu, napr. 3.B Žilina"></div>
      <div class="trActs"><button class="p" id="tmCreate">👥 Založiť tím</button></div>
      <div class="manual"><input id="tmCode" maxlength="6" autocapitalize="characters" placeholder="Kód tímu (6 znakov)" value="${esc(LS.get("ctl_teamInvite",""))}"></div>
      <div class="trActs"><button id="tmJoin">Pridať sa</button></div>`;
    return;
  }
  $("teamRank").textContent=t.rank+". miesto";
  box.innerHTML=`<div class="trTitle">${esc(t.name)}</div>
    <div class="trLine">Tento týždeň ${nf(t.n)} 👋 · ${t.rank}. miesto na Slovensku · ${t.members.length} ${t.members.length===1?"člen":t.members.length<5?"členovia":"členov"}</div>
    <div class="trLine" style="margin-top:6px">${t.members.slice(0,12).map(esc).join(", ")}</div>
    <div class="trLine" style="margin-top:6px">Kód: <b style="color:#fff;letter-spacing:.1em">${esc(t.code)}</b></div>
    <div class="trActs"><button class="p" id="tmInvite">📤 Pozvi do tímu</button><button id="tmLeave">Odísť</button></div>`;
}
$("teamBox").onclick=async e=>{
  const id=e.target.id;
  try{
    if(id==="tmCreate"){const n=$("tmName").value.trim();if(!n){toast("Zadaj názov tímu","");return}const j=await teamCall({action:"create",name:n});if(j.ok){toast("👥 Tím založený!","Pozvi kamošov kódom "+j.code);grantAch("team");await socPoll();teamRender()}}
    if(id==="tmJoin"){const c=$("tmCode").value.trim();const j=await teamCall({action:"join",code:c});if(j.ok){LS.set("ctl_teamInvite","");toast("👥 Si v tíme "+j.name,"Každé tvoje mávnutie sa počíta");grantAch("team");await socPoll();teamRender()}else toast("Tím s týmto kódom neexistuje","Skontroluj kód")}
    if(id==="tmLeave"){await teamCall({action:"leave"});await socPoll();teamRender()}
    if(id==="tmInvite"){const t=SOC.data.myTeam,url=location.origin+location.pathname+"#tim="+t.code,text=`👥 Pridaj sa do tímu „${t.name}“ v appke Čo to letí? ✈️ Mávame lietadlám a bojujeme o 1. miesto na Slovensku!`;
      try{if(navigator.share){await navigator.share({title:"Čo to letí? – tím",text,url});return}}catch(er){if(er.name==="AbortError")return}
      try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","")}catch(er){prompt("Skopíruj odkaz:",url)}}
  }catch(er){toast("Nepodarilo sa","Skús znova")}
};
ACH.push({id:"team",i:"👥",n:"Tímový hráč",c:()=>false});
HOOKS.view.push(v=>{if(v==="col")teamRender()});
HOOKS.social=HOOKS.social||[];HOOKS.social.push(()=>{if(S.view==="col")teamRender()});
function tmFromHash(){const m=location.hash.match(/tim=([A-Za-z0-9]{6})/);if(!m)return;LS.set("ctl_teamInvite",m[1].toUpperCase());
  setTimeout(()=>{toast("👥 Pozvánka do tímu","Kód "+m[1].toUpperCase()+" – ťukni na Pridať sa");setView("col");teamRender();setTimeout(()=>$("teamCard").scrollIntoView({behavior:"smooth"}),300)},1500);
  try{history.replaceState(null,"",location.pathname)}catch(e){}}
tmFromHash();addEventListener("hashchange",tmFromHash);
