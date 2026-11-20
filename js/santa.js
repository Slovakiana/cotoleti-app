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
  return {hex:SANTA.hex,call:"SANTA",reg:"HO-HO-HO",type:"SLEIGH",desc:"Santove sane 🎅",lat,lon,alt:2400,spd:900,trk:h,vr:0,ground:false,santa:true,cat:"A0"};
}
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
ACH.push({id:"santa",i:"🎅",n:"Videl som Santu",c:e=>e&&e.santa});
// čip s odpočtom / výzvou
function santaChip(){
  const w=santaWin(),c=$("santaChip");if(!c)return;
  if(w.live){c.style.display="";const n=santaNext();c.textContent=n<=1?"🎅 Santa je nad tebou – pozri hore!":`🎅 Santa nad tebou o ${n} min`}
  else if(w.soon){c.style.display="";const ms=w.start-Date.now(),d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);c.textContent=`🎅 Santa vzlietne o ${d?d+" d "+h+" h":h+" h "+Math.floor(ms%36e5/6e4)+" min"}`}
  else c.style.display="none";
}
$("santaChip").onclick=async()=>{
  const w=santaWin();haptic(8);
  if(w.live){toast("🎅 Santa letí nad Slovenskom","Každých 12 minút preletí presne nad tebou. Zamávaj mu 👋");return}
  const url=shareUrl("santa",""),text="🎅 Santa poletí 24. 12. od 15:00 nad celým Slovenskom – v appke Čo to letí? mu môžeš zamávať ✈️";
  try{if(navigator.share){await navigator.share({title:"Santa nad Slovenskom",text,url});return}}catch(e){if(e.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("Odkaz skopírovaný 📋","Pošli ho rodine")}catch(e){}
};
santaChip();setInterval(santaChip,30000);
