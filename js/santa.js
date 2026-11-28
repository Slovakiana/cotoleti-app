"use strict";
/* ============ 🎅 Santa nad Slovenskom – 24. 12. 15:00–22:00 preletí nad každým ============ */
const SANTA={hex:"5a17a0",P:12*60e3,L:180000,force:/santatest/.test(location.hash)||sessionStorage.getItem("ctl_santatest")==="1"};
if(SANTA.force)try{sessionStorage.setItem("ctl_santatest","1")}catch(e){}
function santaWin(now=Date.now()){
  const d=new Date(now),y=d.getFullYear(),start=new Date(y,11,24,15,0).getTime(),end=new Date(y,11,24,22,0).getTime();
  return {start,end,live:SANTA.force||(now>=start&&now<end),soon:!SANTA.force&&now>=new Date(y,11,19).getTime()&&now<start};
}
// každých 12 minút preletí presne nad tebou, zakaždým z iného smeru
function santaRaw(now){
  if(!S.pos||!santaWin(now).live)return null;
  const k=Math.floor(now/SANTA.P),f=(now%SANTA.P)/SANTA.P,h=(k*137+43)%360;
  const s=(f-.5)*SANTA.L,o=900,dn=s*Math.cos(rad(h))-o*Math.sin(rad(h)),de=s*Math.sin(rad(h))+o*Math.cos(rad(h));
  const lat=S.pos.lat+dn/111320,lon=S.pos.lon+de/(111320*Math.cos(rad(S.pos.lat)));
  return {hex:SANTA.hex,call:"SANTA",reg:"HO-HO-HO",type:"SLEIGH",desc:"Santove sane 🎅 · vianočná hra",lat,lon,alt:2400,spd:900,trk:h,vr:0,ground:false,santa:true,cat:"A0"};
}
// prvý prelet nad tebou 24. 12. po 15:00
function santaFirst(){const w=santaWin(),P=SANTA.P;return (Math.ceil(w.start/P-.5)+.5)*P}
function santaNext(now=Date.now()){const f=(now%SANTA.P)/SANTA.P;return Math.round(((f<.5?.5-f:1.5-f)*SANTA.P)/60000)}
// vloženie do zoznamu lietadiel
{const base=enrich;enrich=function(now){
  const out=base(now),r=santaRaw(now);if(!r)return out;
  const {d,b}=distBear(S.pos.lat,S.pos.lon,r.lat,r.lon);out.push({...r,dist:d,bear:b,el:elev(d,r.alt,S.pos.alt)});
  return out.sort((x,y)=>(y.el??-99)-(x.el??-99));
}}
{const base=loadMeta;loadMeta=async a=>{if(a&&a.santa){S.meta.set(a.hex,{ac:null,route:{origin:{iata_code:"NP",municipality:"Severný pól"},destination:{iata_code:"SK",municipality:"Slovensko"}}});return}return base(a)}}
{const base=quip;quip=(a,m)=>a&&a.santa?["Ho-ho-ho! Sane ťahá 9 sobov, Rudolf svieti vpredu 🔴","Za jednu noc obletí celý svet – nad Slovenskom spomalí, aby si mu stihol zamávať.","Darčeky na palube: neúrekom. Batožina navyše: zadarmo."][Math.floor(Date.now()/20000)%3]:base(a,m)}
LEG.add("SLEIGH");TYPES.SLEIGH="Santove sane 🎅";SEATS.SLEIGH=1;
CAT.SLEIGH={code:"SLEIGH",name:"Santove sane",maker:"Severný pól",fam:"ga",len:6,span:4,spd:900,range:40075,seats:1,year:null,fact:"Za jednu noc obletí celý svet – a nad Slovenskom spomalí, aby si mu stihol zamávať.",no:null};
ACH.push({id:"santa",i:"🎅",n:"Videl som Santu",h:"24. 12. od 15:00 do 22:00 zamávaj Santovým saniam",c:e=>e&&e.santa});
// čip s odpočtom / výzvou
function santaChip(){
  const w=santaWin(),c=$("santaChip");if(!c)return;
  if(w.live){c.style.display="";const n=santaNext();c.textContent=n<=1?"🎅 Santa je nad tebou – pozri hore!":`🎅 Santa nad tebou o ${n} min`}
  else if(w.soon){c.style.display="";const ms=w.start-Date.now(),d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);c.textContent=`🎅 Santa nad tebou 24. 12. o ${new Date(santaFirst()).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})} · pošli rodine`}
  else c.style.display="none";
}
$("santaChip").onclick=async()=>{
  const w=santaWin();haptic(8);
  if(w.live){toast("🎅 Santa letí nad Slovenskom","Každých 12 minút preletí presne nad tebou. Zamávaj mu 👋");return}
  const t1=santaFirst(),hm=new Date(t1).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"}),town=typeof townOf==="function"&&S.pos?townOf(S.pos):"";
  const url=shareUrl("santa","",town?"m="+encodeURIComponent(town)+"&cas="+encodeURIComponent(hm):""),text=`${town?"📍 "+town+": ":""}🎅 Santa preletí 24. 12. o ${hm} a potom každých 12 minút – v appke Čo to letí? mu môžete s deťmi zamávať ✈️`;ev("share");
  try{if(navigator.share){await navigator.share({title:"Santa nad Slovenskom",text,url});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho rodine")}catch(e){}
};
santaChip();setInterval(()=>{if(!document.hidden)santaChip()},30000);
// 24. 12.: keď sú sane nad obzorom, automaticky ich ukáž ako hlavné lietadlo (raz za prelet)
HOOKS.live.push(()=>{const s=S.list&&S.list.find(a=>a.santa&&a.el>5);if(!s){SANTA._picked=false;return}if(SANTA._picked||S.pick)return;SANTA._picked=true;S.pick=s.hex;try{tick(true)}catch(e){}toast("🎅 Santa je nad tebou!","Zamávaj mu – kartička Santových saní je legendárna","#ff4f6d")});

/* ============ 🕯️ Adventný kalendár (1.–24. 12.) – PM-03 ============ */
const ADVENT_FACTS=["Najväčšie dopravné lietadlo sveta je Airbus A380 – má dve celé paluby.","Dopravné lietadlá letia väčšinou 10–12 km vysoko, nad väčšinou oblakov.","Kondenzačná čiara je zamrznutá vodná para z motorov – vzniká len v mraze vysoko na oblohe.","Milan Rastislav Štefánik bol letec, astronóm aj generál – po ňom sa volá letisko v Bratislave.","Lietadlá štartujú a pristávajú proti vetru – tak im stačí kratšia dráha.","Mikuláš! Nad Slovenskom preletia každý deň stovky lietadiel – koľko z nich máš?","Boeing 747 sa prezýva „Kráľovná oblohy“.","Pri rýchlosti 850 km/h by let z Bratislavy do Košíc trval asi 25 minút.","Piloti a dispečeri sa na celom svete rozprávajú po anglicky.","Slovenské lietadlá majú registráciu, ktorá začína na OM-.","V noci spoznáš lietadlo podľa svetiel: červené je na ľavom krídle, zelené na pravom.","Vrtuľník nepotrebuje dráhu – vzlietne kolmo hore.","Medzinárodná vesmírna stanica obletí Zem asi za 90 minút.","Čierna skrinka je v skutočnosti oranžová, aby sa dala ľahko nájsť.","Do lietadla občas udrie blesk – je na to stavané a cestujúcim sa nič nestane.","Volací znak RYR patrí Ryanairu, WZZ Wizz Airu a TVS Smartwings.","Krídla Boeingu 787 sa za letu ohýbajú nahor aj o niekoľko metrov.","An-225 Mrija bolo najťažšie lietadlo sveta – zničili ho v roku 2022.","Najrýchlejšie lietadlá letia rýchlejšie ako zvuk.","Letiská majú vlastných hasičov, ktorí sú pripravení za pár minút.","Na sever ukazuje červené S na radare v appke – otoč sa a hľadaj lietadlo.","Zimný slnovrat: najdlhšia noc roka – lietadlá dnes uvidíš hlavne podľa svetiel.","Zajtra lieta Santa! Od 15:00 ho v appke uvidíš nad svojím mestom.","Šťastné a veselé! Santa je dnes na oblohe – zamávaj mu 👋"];
function adventOn(){const k=dayKey();return /-12-(0[1-9]|1\d|2[0-4])$/.test(k)||location.hash==="#adventtest"}
function adventDay(){const k=dayKey();return location.hash==="#adventtest"&&!/-12-/.test(k)?24:Number(k.slice(8,10))}
function renderAdvent(){
  const box=$("adventCard");if(!box)return;if(!adventOn()){box.hidden=true;return}box.hidden=false;
  const A=LS.get("ctl_advent",{}),today=adventDay(),waved=LS.get("ctl_adventWave","")===dayKey();
  $("adventTxt").textContent=A[today]?"Dnešné okienko je otvorené. Zajtra ďalšie 🕯️":waved?"Zamávané! Ťukni na dnešné okienko.":"Zamávaj dnes lietadlu a otvor okienko č. "+today+".";
  $("adventGrid").innerHTML=Array.from({length:24},(_,i)=>{const d=i+1,open=!!A[d],ready=!open&&d<=today&&waved;
    return `<button type="button" data-adv="${d}" class="${open?"open":""}${d===today?" today":""}${ready?" ready":""}" ${d>today?"disabled":""} aria-label="Okienko ${d}${open?", otvorené":d>today?", zatiaľ zamknuté":""}">${open?"⭐":d}</button>`}).join("");
}
HOOKS.caught.push(()=>{if(!adventOn())return;if(LS.get("ctl_adventWave","")!==dayKey()){LS.set("ctl_adventWave",dayKey());renderAdvent();toast("🕯️ Adventné okienko je pripravené","Otvor ho na Love v Adventnom kalendári")}});
document.addEventListener("click",e=>{const b=e.target.closest("[data-adv]");if(!b)return;
  const d=Number(b.dataset.adv),A=LS.get("ctl_advent",{}),today=adventDay();haptic(8);
  if(A[d]){toast("🕯️ Okienko "+d,ADVENT_FACTS[d-1]);return}
  if(LS.get("ctl_adventWave","")!==dayKey()){toast("🕯️ Najprv zamávaj","Okienko sa otvorí po dnešnom mávnutí lietadlu");return}
  if(d>today)return;
  const pts=d===24?50:d===today?15:5;A[d]=Date.now();LS.set("ctl_advent",A);COL.pts+=pts;LS.set("ctl_col",COL);
  if(Object.keys(A).length>=12)grantAch("advent12");
  confetti(d===24?80:30);toast("🕯️ Okienko "+d+" · +"+pts+" b",ADVENT_FACTS[d-1]);renderAdvent();if(typeof renderCol==="function"&&S.view==="col")renderCol()});
ACH.push({id:"advent12",i:"🕯️",n:"Adventník",h:"Otvor 12 okienok adventného kalendára (1.–24. 12.)",pr:()=>[Object.keys(LS.get("ctl_advent",0)||0).length,12],c:()=>false});
renderAdvent();setInterval(()=>{if(!document.hidden)renderAdvent()},600000);document.addEventListener("visibilitychange",()=>{if(!document.hidden)renderAdvent()});
