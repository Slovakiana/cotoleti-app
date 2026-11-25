"use strict";
/* ============ Počasie: kondenzačná čiara a „uvidíš ho?“ ============ */
const WX={data:null,t:0,loading:false,pos:null};
async function loadWx(){
  if(!S.pos||WX.loading||(WX.next&&Date.now()<WX.next))return;
  const moved=!WX.pos||Math.abs(WX.pos.lat-S.pos.lat)>.1||Math.abs(WX.pos.lon-S.pos.lon)>.1;
  if(WX.data&&!moved&&Date.now()-WX.t<15*60e3)return;
  WX.loading=true;
  const lv=[400,300,250,200],hourly=lv.map(l=>"temperature_"+l+"hPa,relative_humidity_"+l+"hPa").join(",");
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${S.pos.lat.toFixed(2)}&longitude=${S.pos.lon.toFixed(2)}&current=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,is_day,temperature_2m&hourly=${hourly}&forecast_days=2&timezone=auto`;
  try{const {ok,j}=await getJSON(ROUTES[0].wrap(u),8000);
    if(ok&&j?.current){WX.data=j;WX.t=Date.now();WX.pos={...S.pos}}}catch(e){}
  if(Date.now()-WX.t>60e3){WX.fail=(WX.fail||0)+1;WX.next=Date.now()+Math.min(15*60e3,30e3*2**Math.min(5,WX.fail-1))}else{WX.fail=0;WX.next=0}
  WX.loading=false;
}
function wxIdx(){
  const j=WX.data;if(!j||!j.hourly||!j.current)return 0;
  const key=String(j.current.time).slice(0,13)+":00",i=j.hourly.time.indexOf(key);return i<0?0:i;
}
const esW=T=>6.112*Math.exp(17.62*T/(243.12+T)),esI=T=>6.112*Math.exp(22.46*T/(272.62+T));
const LEVELS_H=[[400,7200],[300,9200],[250,10400],[200,11800]];
function contrail(alt){
  if(!WX.data||alt==null)return null;
  if(alt<6000)return {p:2,t:"letí príliš nízko na bielu čiaru"};
  const lv=LEVELS_H.reduce((b,x)=>Math.abs(x[1]-alt)<Math.abs(b[1]-alt)?x:b)[0],i=wxIdx(),h=WX.data.hourly;
  const T=h["temperature_"+lv+"hPa"]&&h["temperature_"+lv+"hPa"][i],RH=h["relative_humidity_"+lv+"hPa"]&&h["relative_humidity_"+lv+"hPa"][i];
  if(T==null||RH==null)return null;
  const RHi=RH*esW(T)/esI(T);
  let p=T>-38?8:Math.round(Math.max(25,Math.min(95,25+(RHi-40)*1.15)));
  const txt=p>=75?"asi dlhá – môže ostať visieť na oblohe":p>=45?"asi krátka – rýchlo zmizne":p>=20?"skôr žiadna, nanajvýš kúsok":"žiadna – vzduch je tam suchý alebo teplý";
  return {p,t:txt,T,RHi};
}
function visibility(a){
  const c=WX.data&&WX.data.current;if(!c||!a)return "";
  if(!c.is_day)return "🌙 Je tma – uvidíš len blikajúce svetlá (červené, zelené a biely záblesk)";
  const alt=a.alt||0;
  if(c.cloud_cover_low>80&&alt>1500)return "☁️ Je zamračené – asi ho neuvidíš, ale možno ho počuješ";
  if(c.cloud_cover_mid>80&&alt>5000)return "🌥️ Je nad mrakmi – len s kúskom šťastia";
  if(c.cloud_cover_high>85&&alt>8500)return "🌤️ Letí vo vysokej oblačnosti – hľadaj ho cez závoj";
  if(c.cloud_cover<25)return "☀️ Jasno – mal by si ho vidieť voľným okom 👀";
  return "⛅ Polojasno – hľadaj ho medzi mrakmi";
}
HOOKS.fresh.push(loadWx);
HOOKS.live.push(a=>{
  const el=$("h-wx");
  if(!a||!WX.data){if(el.innerHTML)el.innerHTML="";return}
  const ct=contrail(a.alt),vis=visibility(a);
  const html=(vis?`<div>${vis}</div>`:"")+(ct?`<div>✈️💨 Biela čiara za ním: <b>${ct.p} %</b> · ${ct.t}${ct.T!=null?`<div class="lookSub">Tam hore je ${nf(ct.T)} °C`+(ct.RHi!=null?` a vlhkosť voči ľadu ${nf(ct.RHi)} %`:"")+`</div>`:""}<div class="cbar"><i style="width:${ct.p}%"></i></div></div>`:"");
  if(el._h!==html){el.innerHTML=html;el._h=html}
});
