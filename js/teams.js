"use strict";
/* ============ 👥 Tímy (trieda, firma, partia) ============ */
async function teamCall(body){
  const r=await apiPost("/api/team",{id:SOC.cid,nick:LS.get("ctl_nick","")||"Spotter",...body});
  return r.json();
}
function teamRender(){
  const t=SOC.data&&SOC.data.myTeam,box=$("teamBox");
  if(!SOC.api){box.innerHTML='<div class="lookSub">Tímy teraz nefungujú, skús to neskôr.</div>';return}
  if(!t){
    $("teamRank").textContent="";
    box.innerHTML=`<div class="lookSub" style="margin-top:8px">Založ tím pre triedu, firmu alebo partiu. Každé mávnutie člena sa počíta do týždenného rebríčka tímov.</div>
      <div class="manual"><input id="tmName" maxlength="24" placeholder="Názov tímu, napr. Leteckí sokoli"></div>
      <div class="trActs"><button class="p" id="tmCreate">👥 Založiť tím</button></div>
      <div class="manual"><input id="tmCode" maxlength="6" autocapitalize="characters" placeholder="Kód tímu (6 znakov)" value="${esc(LS.get("ctl_teamInvite",""))}"></div>
      <div class="trActs"><button id="tmJoin">Pridať sa</button></div>`;
    return;
  }
  $("teamRank").textContent=t.rank+". miesto";grantAch("team");
  box.innerHTML=`<div class="trTitle">${esc(t.name)}</div>
    <div class="trLine">Tento týždeň ${nf(t.n)} 👋 · ${t.rank}. miesto na Slovensku · ${(t.count||t.members.length)} ${(t.count||t.members.length)===1?"člen":(t.count||t.members.length)<5?"členovia":"členov"}</div>

    <div class="trLine" style="margin-top:6px">Kód: <b style="color:#fff;letter-spacing:.1em">${esc(t.code)}</b></div>
    <div class="trActs"><button class="p" id="tmInvite">📤 Pozvi do tímu</button><button id="tmLeave">Odísť</button></div>`;
}
$("teamBox").onclick=async e=>{
  const id=e.target.id;
  try{
    if(id==="tmCreate"){const n=$("tmName").value.trim();if(!n){toast("Zadaj názov tímu","");return}const j=await teamCall({action:"create",name:n});if(j.ok){toast("👥 Tím založený!","Pozvi kamarátov kódom "+j.code);grantAch("team");await socPoll();teamRender()}else toast("Tím sa nepodarilo založiť",{name:"Tento názov nejde – skús iný",rate:"Dnes už bolo založených veľa tímov, skús zajtra",kid:"V detskom režime sa tímy nezakladajú – pridaj sa kódom"}[j.error]||"Skús to o chvíľu")}
    if(id==="tmJoin"){const c=$("tmCode").value.trim();const j=await teamCall({action:"join",code:c});if(j.ok){LS.set("ctl_teamInvite","");toast("👥 Si v tíme "+j.name,"Počítajú sa overené mávnutia do ligy, od zajtra");grantAch("team");await socPoll();teamRender()}else toast(j.error==="notfound"?"Tím s týmto kódom neexistuje":"Nepodarilo sa pridať",j.error==="notfound"?"Skontroluj kód":"Skús to o chvíľu")}
    if(id==="tmLeave"){if(!confirm("Naozaj odísť z tímu?"))return;await teamCall({action:"leave"});await socPoll();teamRender()}
    if(id==="tmInvite"){if(typeof ensureNick==="function"&&!ensureNick())return;const t=SOC.data.myTeam,url=shareUrl("t",t.code),text=`👥 Pridaj sa do tímu „${t.name}“ v appke Čo to letí? ✈️ Mávame lietadlám a bojujeme o 1. miesto na Slovensku!`;
      try{if(navigator.share){await navigator.share({title:"Čo to letí? – tím",text,url});return}}catch(er){if(er.name==="AbortError")return}
      try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","")}catch(er){prompt("Skopíruj odkaz:",url)}}
  }catch(er){toast("Nepodarilo sa","Skús znova")}
};
ACH.push({id:"team",i:"👥",n:"Tímový hráč",h:"Založ tím alebo sa pridaj kódom",soc:1,c:()=>false});
HOOKS.view.push(v=>{if(v==="col")teamRender()});
HOOKS.social=HOOKS.social||[];HOOKS.social.push(()=>{if(S.view==="col")teamRender()});
function tmFromHash(){const m=location.hash.match(/tim=([A-Za-z0-9]{6})/);if(!m)return;if(!LS.get("ctl_onb",0)){afterOnb(tmFromHash);return}
  if(typeof KID==="function"&&KID()){try{history.replaceState(null,"",location.pathname)}catch(e){}setTimeout(()=>toast("👥 Pozvánka do tímu","V detskom režime sa do tímov cez odkaz nepridáva"),1500);return}
  LS.set("ctl_teamInvite",m[1].toUpperCase());
  const show=()=>{toast("👥 Pozvánka do tímu","Kód "+m[1].toUpperCase()+" – ťukni na Pridať sa");setView("col");teamRender();setTimeout(()=>$("teamCard").scrollIntoView({behavior:"smooth"}),300)};
  // nový hráč: najprv obloha a prvé mávnutie, až potom tím (inak po úvode skončí v záložke Ja)
  if((LS.get("ctl_waveN",0)|0)>0)setTimeout(show,1500);else{toast("👥 Pozvánka do tímu uložená","Najprv zamávaj prvému lietadlu 👋");const t=setInterval(()=>{if((LS.get("ctl_waveN",0)|0)>0){clearInterval(t);setTimeout(show,6000)}},2000)}
  try{history.replaceState(null,"",location.pathname)}catch(e){}}
tmFromHash();addEventListener("hashchange",tmFromHash);
