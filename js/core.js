"use strict";
/* ============ základy ============ */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const FT=0.3048,KT=1.852,R=6371000,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const wrap180=a=>((a%360)+540)%360-180;
const nf=(n,d=0)=>n==null||isNaN(n)?"—":Number(n).toLocaleString("sk-SK",{maximumFractionDigits:d,minimumFractionDigits:d});
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const HOOKS={live:[],fresh:[],caught:[],heroStatic:[],radar:[],view:[]};
const S={pos:LS.get("ctl_pos",null)||LS.get("nm_pos",null),manual:false,raw:[],rawT:0,list:[],top:null,meta:new Map(),
  heading:null,camHead:null,camPitch:null,compassOn:false,
  voice:LS.get("ctl_voice",false),vib:LS.get("ctl_vib",true),vych:LS.get("ctl_vych",false),
  announced:new Set(),buzzed:new Set(),view:"now",arStream:null};

/* ============ texty (spisovne / po východniarsky) ============ */
const TX={
  title:["Čo to letí?","Co to ľeci?"],
  sub:["Zisti, čo ti práve letí nad hlavou, odkiaľ a kam. Namier mobil na oblohu a zbieraj vzácne lietadlá.","Zisci, co ci ľeci nad hlavu, zdze a dze. Namer mobil na ňebo a zbiraj lietadla."],
  go:["Pozri hore 👆","Pozri še hore 👆"],
  now:["Práve nad tebou","Teraz nad tebu"],
  empty:["Obloha je čistá","Ňič ňeľeci"],
  emptySub:["Teraz v okolí nič neletí. Skús väčší okruh v nastaveniach.","Ľem mraki. Skus vekši okruh."],
  look:["POZRI HORE! 👆","HĽEDZ HORE! 👆"],
  overhead:["Je priamo nad tebou!","Je pravo nad tebu!"],
  caught:["Ulovené!","Mace ho!"],
};
const t=k=>TX[k][S.vych?1:0];

/* ============ číselníky ============ */
const TYPES={A319:"Airbus A319",A320:"Airbus A320",A20N:"Airbus A320neo",A321:"Airbus A321",A21N:"Airbus A321neo",A318:"Airbus A318",
A306:"Airbus A300",A310:"Airbus A310",A332:"Airbus A330-200",A333:"Airbus A330-300",A338:"Airbus A330-800neo",A339:"Airbus A330-900neo",A343:"Airbus A340-300",A346:"Airbus A340-600",A359:"Airbus A350-900",A35K:"Airbus A350-1000",A388:"Airbus A380",
BCS1:"Airbus A220-100",BCS3:"Airbus A220-300",B733:"Boeing 737-300",B734:"Boeing 737-400",B737:"Boeing 737-700",B738:"Boeing 737-800",B739:"Boeing 737-900",B37M:"Boeing 737 MAX 7",B38M:"Boeing 737 MAX 8",B39M:"Boeing 737 MAX 9",B3XM:"Boeing 737 MAX 10",
B742:"Boeing 747-200",B744:"Boeing 747-400",B748:"Boeing 747-8",B752:"Boeing 757-200",B753:"Boeing 757-300",B762:"Boeing 767-200",B763:"Boeing 767-300",B764:"Boeing 767-400",B772:"Boeing 777-200",B77W:"Boeing 777-300ER",B77L:"Boeing 777-200LR",B778:"Boeing 777-8",B779:"Boeing 777-9",B788:"Boeing 787-8",B789:"Boeing 787-9",B78X:"Boeing 787-10",
E170:"Embraer E170",E75L:"Embraer E175",E190:"Embraer E190",E195:"Embraer E195",E290:"Embraer E190-E2",E295:"Embraer E195-E2",AT72:"ATR 72",AT75:"ATR 72-500",AT76:"ATR 72-600",AT43:"ATR 42",DH8D:"Dash 8 Q400",
CRJ2:"Bombardier CRJ200",CRJ7:"Bombardier CRJ700",CRJ9:"Bombardier CRJ900",CRJX:"Bombardier CRJ1000",MD11:"McDonnell Douglas MD-11",SU95:"Suchoj Superjet 100",
C172:"Cessna 172",C152:"Cessna 152",C182:"Cessna 182",P28A:"Piper Cherokee",DA40:"Diamond DA40",DA42:"Diamond DA42",SR22:"Cirrus SR22",PC12:"Pilatus PC-12",PC24:"Pilatus PC-24",C25A:"Cessna Citation CJ2",C56X:"Cessna Citation Excel",C68A:"Cessna Citation Latitude",C700:"Cessna Citation Longitude",
GLF4:"Gulfstream IV",GLF5:"Gulfstream V",GLF6:"Gulfstream G650",GL5T:"Bombardier Global 5000",GLEX:"Bombardier Global Express",GL7T:"Bombardier Global 7500",CL35:"Bombardier Challenger 350",CL60:"Bombardier Challenger 600",F900:"Dassault Falcon 900",FA7X:"Dassault Falcon 7X",FA8X:"Dassault Falcon 8X",LJ45:"Learjet 45",E55P:"Embraer Phenom 300",
A400:"Airbus A400M Atlas",C130:"C-130 Hercules",C30J:"C-130J Super Hercules",C17:"Boeing C-17 Globemaster",K35R:"KC-135 Stratotanker",A332T:"Airbus A330 MRTT",E3TF:"Boeing E-3 AWACS",E3CF:"Boeing E-3 AWACS",B52:"B-52 Stratofortress",C5M:"C-5 Galaxy",
A124:"Antonov An-124 Ruslan",A225:"Antonov An-225 Mrija",AN12:"Antonov An-12",AN26:"Antonov An-26",IL76:"Iljušin Il-76",BLCF:"Boeing Dreamlifter",A3ST:"Airbus Beluga",A337:"Airbus BelugaXL",
F16:"F-16 Fighting Falcon",F35:"F-35 Lightning II",EUFI:"Eurofighter Typhoon",GRIF:"Saab Gripen",L39:"Aero L-39 Albatros",C27J:"Alenia C-27J Spartan",
EC35:"Airbus H135",EC45:"Airbus H145",EC30:"Airbus H130",EC55:"Airbus H155",AS50:"Airbus H125",A109:"Leonardo AW109",A139:"Leonardo AW139",A169:"Leonardo AW169",B06:"Bell 206",B407:"Bell 407",R44:"Robinson R44",R22:"Robinson R22",UH60:"Black Hawk",H60:"Black Hawk",MI8:"Mil Mi-8/17",MI17:"Mil Mi-17",S92:"Sikorsky S-92"};
const AIRLINES={RYR:"Ryanair",RUK:"Ryanair UK",LDM:"Lauda Europe",MAY:"Malta Air",WZZ:"Wizz Air",WMT:"Wizz Air Malta",WUK:"Wizz Air UK",WAZ:"Wizz Air Abu Dhabi",AUA:"Austrian",DLH:"Lufthansa",EWG:"Eurowings",CFG:"Condor",BAW:"British Airways",EZY:"easyJet",EJU:"easyJet Europe",EZS:"easyJet Switzerland",
AFR:"Air France",KLM:"KLM",TRA:"Transavia",THY:"Turkish Airlines",PGT:"Pegasus",SXS:"SunExpress",UAE:"Emirates",QTR:"Qatar Airways",ETD:"Etihad",FDB:"flydubai",SVA:"Saudia",MSR:"EgyptAir",ELY:"El Al",LOT:"LOT",CSA:"Czech Airlines",TVS:"Smartwings",SWR:"Swiss",ITY:"ITA Airways",
IBE:"Iberia",VLG:"Vueling",SAS:"SAS",FIN:"Finnair",AEE:"Aegean",ROT:"TAROM",BTI:"airBaltic",CTN:"Croatia Airlines",ASL:"Air Serbia",LGL:"Luxair",BEL:"Brussels Airlines",TAP:"TAP Air Portugal",EIN:"Aer Lingus",NOZ:"Norwegian",NSZ:"Norwegian",
TUI:"TUI",TOM:"TUI",TFL:"TUI",ENT:"Enter Air",AIC:"Air India",SIA:"Singapore Airlines",CPA:"Cathay Pacific",CCA:"Air China",CES:"China Eastern",CSN:"China Southern",KAL:"Korean Air",AAL:"American Airlines",UAL:"United",DAL:"Delta",ACA:"Air Canada",
DHK:"DHL",BCS:"DHL",DHX:"DHL",UPS:"UPS",FDX:"FedEx",CLX:"Cargolux",GEC:"Lufthansa Cargo",ABR:"ASL Airlines",CKS:"Kalitta Air",GTI:"Atlas Air",NJE:"NetJets",VJT:"VistaJet",
RCH:"US Air Force",GAF:"Nemecké letectvo",IAM:"Talianske letectvo",CEF:"České letectvo",PLF:"Poľské letectvo",BAF:"Belgické letectvo",NATO:"NATO",HUF:"Maďarské letectvo",AME:"Španielske letectvo",FAF:"Francúzske letectvo",RRR:"Kráľovské letectvo (RAF)"};
const LEG=new Set(["A124","A225","BLCF","A3ST","A337","C5M","B52","E3TF","E3CF","U2","AN22","B2","VC25","F35","F16","EUFI","GRIF","F18","F15"]);
const RARE=new Set(["A388","B748","B744","B742","A400","C17","C130","C30J","K35R","A332T","IL76","AN12","AN26","MD11","DC10","A346","A343","L39","C27J","SU95","GL7T","B779","B778"]);
const WIDE=new Set(["A306","A310","A332","A333","A338","A339","A359","A35K","B762","B763","B764","B772","B77W","B77L","B788","B789","B78X","B753","B752"]);
const HELI=new Set(["EC35","EC45","EC30","EC55","AS50","A109","A139","A169","B06","B407","R44","R22","UH60","H60","MI8","MI17","S92"]);
const RAR={c:{n:"Bežné",p:1,col:"#97a3c7"},u:{n:"Nezvyčajné",p:3,col:"#4fc3ff"},r:{n:"Vzácne",p:10,col:"#c77dff"},l:{n:"Legendárne",p:50,col:"#ffcf4f"}};
const isHeli=a=>a.cat==="A7"||HELI.has(a.type);
function rarity(a){
  if(LEG.has(a.type))return "l";
  if(a.mil||RARE.has(a.type))return "r";
  if(WIDE.has(a.type)||isHeli(a)||(a.type&&/^(GLF|GL|CL|FA|F9|C68|C700|PC24|LJ)/.test(a.type)))return "u";
  return "c";
}
const airlineOf=a=>{const p=(a.call||"").slice(0,3).toUpperCase();return AIRLINES[p]||(a.call||"").slice(0,4).toUpperCase()==="NATO"&&"NATO"||""};
const typeName=(a,m)=>a.desc||TYPES[a.type]||(m&&m.ac&&m.ac.manufacturer&&m.ac.type?m.ac.manufacturer+" "+m.ac.type:"")||a.type||"Neznámy typ";
const titleOf=a=>a.call||a.reg||String(a.hex).toUpperCase();

/* ============ geometria ============ */
function distBear(lat1,lon1,lat2,lon2){
  const p1=rad(lat1),p2=rad(lat2),dl=rad(lon2-lon1),dp=p2-p1;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  const d=2*R*Math.asin(Math.min(1,Math.sqrt(h)));
  const y=Math.sin(dl)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
  return {d,b:(deg(Math.atan2(y,x))+360)%360};
}
const elev=(d,alt,my)=>deg(Math.atan2(alt-(my||0)-d*d/(2*R*4/3),Math.max(d,1)));
const DIRS=["S","SV","V","JV","J","JZ","Z","SZ"],DIRL=["sever","severovýchod","východ","juhovýchod","juh","juhozápad","západ","severozápad"];
const dirS=b=>DIRS[Math.round(((b%360)+360)%360/45)%8],dirL=b=>DIRL[Math.round(((b%360)+360)%360/45)%8];

// poloha lietadla dopočítaná podľa rýchlosti a kurzu (plynulý pohyb medzi aktualizáciami)
function enrich(now){
  if(!S.pos)return [];
  const dt=Math.min(30,(now-S.rawT)/1000);
  return S.raw.filter(a=>!a.ground).map(a=>{
    let lat=a.lat,lon=a.lon,alt=a.alt;
    if(a.spd!=null&&a.trk!=null&&dt>0){const m=a.spd/3.6*dt;lat+=m*Math.cos(rad(a.trk))/111320;lon+=m*Math.sin(rad(a.trk))/(111320*Math.cos(rad(lat)))}
    if(alt!=null&&a.vr!=null&&dt>0)alt=Math.max(0,alt+a.vr*FT/60*dt);
    const {d,b}=distBear(S.pos.lat,S.pos.lon,lat,lon);
    const el=alt!=null?elev(d,alt,S.pos.alt):null;
    return {...a,lat,lon,alt,dist:d,bear:b,el};
  }).sort((x,y)=>(y.el??-99)-(x.el??-99));
}
// kedy bude lietadlo najbližšie
function approach(a){
  if(a.spd==null||a.trk==null||a.spd<50)return null;
  const x=a.dist*Math.sin(rad(a.bear)),y=a.dist*Math.cos(rad(a.bear));
  const v=a.spd/3.6,vx=v*Math.sin(rad(a.trk)),vy=v*Math.cos(rad(a.trk));
  const tt=-(x*vx+y*vy)/(v*v);
  const dm=Math.hypot(x+vx*tt,y+vy*tt);
  return {t:tt,d:dm,el:a.alt!=null?elev(dm,a.alt,S.pos.alt):null};
}

/* ============ dáta ============ */
function normReadsb(j){
  return (j.ac||j.aircraft||[]).filter(a=>a.lat!=null&&a.lon!=null).map(a=>{
    const ground=a.alt_baro==="ground";
    const altFt=typeof a.alt_geom==="number"?a.alt_geom:(typeof a.alt_baro==="number"?a.alt_baro:null);
    return {hex:a.hex,call:(a.flight||"").trim(),reg:a.r||"",type:a.t||"",desc:"",op:a.ownOp||"",cat:a.category||"",mil:!!(a.dbFlags&1),
      lat:a.lat,lon:a.lon,alt:ground?0:(altFt!=null?altFt*FT:null),ground,spd:a.gs!=null?a.gs*KT:null,trk:a.track??a.true_heading??null,
      vr:a.baro_rate??a.geom_rate??null,sq:a.squawk||""};
  });
}
const SOURCES=[
  {name:"adsb.lol",url:(la,lo,r)=>`https://api.adsb.lol/v2/point/${la}/${lo}/${r}`,parse:normReadsb},
  {name:"airplanes.live",url:(la,lo,r)=>`https://api.airplanes.live/v2/point/${la}/${lo}/${r}`,parse:normReadsb},
  {name:"adsb.fi",url:(la,lo,r)=>`https://opendata.adsb.fi/api/v2/lat/${la}/lon/${lo}/dist/${r}`,parse:normReadsb},
  {name:"OpenSky",url:(la,lo,r)=>{const dl=r*1852/111320,dn=dl/Math.cos(rad(la));
     return `https://opensky-network.org/api/states/all?lamin=${(+la-dl).toFixed(3)}&lamax=${(+la+dl).toFixed(3)}&lomin=${(+lo-dn).toFixed(3)}&lomax=${(+lo+dn).toFixed(3)}`},
   parse:j=>(j.states||[]).filter(s=>s[6]!=null&&s[5]!=null).map(s=>({hex:s[0],call:(s[1]||"").trim(),reg:"",type:"",desc:"",op:"",cat:"",mil:false,
     lat:s[6],lon:s[5],alt:s[8]?0:(s[13]??s[7]),ground:s[8],spd:s[9]!=null?s[9]*3.6:null,trk:s[10],vr:s[11]!=null?s[11]/FT*60:null,sq:s[14]||""}))}
];
// Vlastný sprostredkovací server (Cloudflare Worker) – najspoľahlivejšia cesta
const DEFAULT_PROXY="";
const MYPROXY=(LS.get("ctl_proxy","")||DEFAULT_PROXY).replace(/\/+$/,"");
const ROUTES=[
  ...(MYPROXY?[{name:"môj server",wrap:u=>MYPROXY+"/?url="+encodeURIComponent(u)}]:[]),
  {name:"priamo",wrap:u=>u},
  {name:"cors.lol",wrap:u=>"https://api.cors.lol/?url="+encodeURIComponent(u)},
  {name:"allorigins",wrap:u=>"https://api.allorigins.win/raw?url="+encodeURIComponent(u)},
  {name:"codetabs",wrap:u=>"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u)},
  {name:"corsproxy.io",wrap:u=>"https://corsproxy.io/?url="+encodeURIComponent(u)}
];
const COMBOS=[];ROUTES.forEach(rt=>SOURCES.forEach(s=>COMBOS.push({s,rt})));
let comboIdx=(()=>{if(MYPROXY&&LS.get("ctl_combo_px","")!==MYPROXY){LS.set("ctl_combo_px",MYPROXY);return 0}const v=LS.get("ctl_combo",null)??LS.get("nm_combo",null);return v==null?-1:Math.min(COMBOS.length-1,Math.max(0,v|0))})(),busy=false;

async function getJSON(url,ms=7000,outer){
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),ms);
  if(outer){if(outer.aborted)ctl.abort();else outer.addEventListener("abort",()=>ctl.abort())}
  try{
    const res=await fetch(url,{signal:ctl.signal,cache:"no-store"});
    const txt=await res.text();
    let j;try{j=JSON.parse(txt)}catch(e){throw new Error(res.ok?"nie je JSON":"HTTP "+res.status)}
    return {ok:res.ok,status:res.status,j};
  }catch(e){throw new Error(e.name==="AbortError"?"timeout":(e.message||"blokované"))}
  finally{clearTimeout(tm)}
}

async function tryCombo(i,r,signal){
  const c=COMBOS[i];
  const {ok,status,j}=await getJSON(c.rt.wrap(c.s.url(S.pos.lat.toFixed(4),S.pos.lon.toFixed(4),r)),9000,signal);
  if(!ok)throw new Error("HTTP "+status);
  if(!j.ac&&!j.aircraft&&!("states" in j))throw new Error("zlý formát");
  return {i,list:c.s.parse(j)};
}
function gotPlanes(i,list){
  S.raw=list;S.rawT=Date.now();comboIdx=i;LS.set("ctl_combo",i);err("");
  const c=COMBOS[i];
  setStatus(S.raw.filter(a=>!a.ground).length+" lietadiel · "+c.s.name+(c.rt.name!=="priamo"?" cez "+c.rt.name:""),true);
  tick(true);
}
async function fetchPlanes(){
  if(!S.pos||busy)return;
  busy=true;
  const r=+$("radius").value;
  try{
    // 1) naposledy fungujúca cesta
    if(comboIdx>=0){try{const x=await tryCombo(comboIdx,r);gotPlanes(x.i,x.list);return}catch(e){}}
    // 2) všetky cesty naraz – vyhráva prvá, ktorá odpovie
    if(!S.raw.length)setStatus("Hľadám cestu k dátam…",false);
    const ctl=new AbortController(),fails=[];
    try{
      const x=await Promise.any(COMBOS.map((_,i)=>tryCombo(i,r,ctl.signal).catch(e=>{fails.push(COMBOS[i].s.name+"/"+COMBOS[i].rt.name+": "+e.message);throw e})));
      ctl.abort();gotPlanes(x.i,x.list);
    }catch(e){
      setStatus("Bez spojenia",false);
      err("Nepodarilo sa načítať dáta o lietadlách. Skúsim znova o 10 s. Detail: "+fails.slice(0,8).join(" · "));
      if(!S.raw.length)$("h-type").textContent="Poloha OK ✓ Dáta o lietadlách zatiaľ nedostupné…";
    }
  }finally{busy=false}
}

// trasa a fotka z adsbdb.com
let metaRoute=LS.get("ctl_mroute",0)|0;
async function adsbdb(path){
  const u="https://api.adsbdb.com/v0/"+path;
  for(let k=0;k<ROUTES.length;k++){
    const i=(metaRoute+k)%ROUTES.length;
    try{const {j}=await getJSON(ROUTES[i].wrap(u),6000);if(j&&"response" in j){metaRoute=i;LS.set("ctl_mroute",i);return j.response}}catch(e){}
  }
  return null;
}
async function loadMeta(a){
  if(S.meta.has(a.hex))return;
  S.meta.set(a.hex,{loading:true});
  const m={ac:null,route:null};
  const r1=await adsbdb("aircraft/"+a.hex+(a.call?"?callsign="+encodeURIComponent(a.call):""));
  if(r1&&typeof r1==="object"){m.ac=r1.aircraft||null;m.route=r1.flightroute||null}
  if(!m.route&&a.call){const r2=await adsbdb("callsign/"+encodeURIComponent(a.call));if(r2&&typeof r2==="object")m.route=r2.flightroute||null}
  S.meta.set(a.hex,m);
  if(S.top&&S.top.hex===a.hex){renderHeroStatic(S.top);announce(S.top,true)}
}

/* ============ hlášky ============ */
function quip(a,m){
  const h=hash(a.hex),pick=arr=>arr[h%arr.length],V=S.vych;
  if(a.sq==="7700")return "Hlási núdzovú situáciu. Držme palce posádke. 🙏";
  if(a.mil)return pick(V?["Vojenske. Ľepši ňemachaj.","Vojaci. Vecej ci ňepoveme. 🤫"]:["Vojenské. Radšej nemávaj. 🫡","Vojenský let. Viac ti nepovieme. 🤫","Armáda na výlete. Asi nie do Chorvátska."]);
  if(isHeli(a))return pick(["Vrtuľník. Buď záchranka, alebo niekto veľmi bohatý. 🚁","Vrtuľka nad hlavou. Dúfajme, že len preletí.","Helikoptéra. Ak je žltá, niekomu práve pomáhajú. ❤️"]);
  const al=airlineOf(a),rt=m&&m.route,d=rt&&rt.destination,o=rt&&rt.origin,dc=d&&d.country_iso_name,oc=o&&o.country_iso_name,city=(d&&(d.municipality||d.name)||"");
  if(dc==="SK")return pick(V?["Ľeci domu. Mamka už vari. 🍲","Ľeci na Slovensko. Vitajce doma!"]:["Letí domov na Slovensko. Mama už varí. 🍲","Návrat domov. Bryndzové halušky už čakajú. 🧀"]);
  if(dc){
    if(dc==="GB")return pick(["Ďalší, čo ide za bratrancom do Anglicka. 🇬🇧","Do Londýna. Dážď a čaj s mliekom v cene letenky.","Do Británie. Jazdia vľavo, pozor na to."]);
    if(dc==="TR"||dc==="EG"||dc==="TN")return pick(["All inclusive, náramok na ruke, prvý drink o 9:00. 🍹","Dovolenka na pláži, kým ty tu škrabeš námrazu zo skla.","Smer: ležadlo pri bazéne. Uterák už je tam od šiestej."]);
    if(dc==="ES"||dc==="PT")return pick(["Niekto letí za slnkom, kým ty tu mrzneš. ☀️","Do Španielska. Siesta až do večera.","Tapas, more, 25 stupňov. Nezávidíme. (Závidíme.)"]);
    if(dc==="AE"||dc==="QA")return pick(["Do Dubaja. Fotky z hotela budú na IG do hodiny. 🏙️","Púšť, mrakodrapy a klimatizácia na 18 °C."]);
    if(dc==="FR")return /paris/i.test(city)?"Do Paríža. Croissant za 4 €, výhľad na Eiffelovku zadarmo. 🥐":"Do Francúzska. Bonjour a syry, čo cítiť cez tri izby. 🧀";
    if(dc==="US"||dc==="CA")return pick(["Do Ameriky. Osem hodín filmov za sebou. 🍿","Za veľkú mláku. Hamburger tam bude dvakrát väčší."]);
    if(dc==="CZ")return pick(["Do Česka. Bratia Česi pozdravujú! 🍺","Do Prahy. Trdelník pre turistov, pivo pre všetkých."]);
    if(dc==="AT")return pick(["Do Rakúska. Rakúske letisko pre polovicu Bratislavy.","Do Viedne. Bližšie by bolo autobusom. 🚌"]);
    if(dc==="IT")return pick(["Do Talianska. Pizza, ale bez ananásu, prosím. 🍕","Do Talianska. Espresso na stojáka za 1,20 €."]);
    if(dc==="GR"||dc==="CY")return pick(["Do Grécka. Gyros, more a sirtaki. 🇬🇷","Grécke ostrovy. Biele domčeky, modré okenice."]);
    if(dc==="HR")return "Do Chorvátska lietadlom, nie autom so stanom na streche? Luxus. 🏖️";
    if(dc==="DE")return "Do Nemecka. Na čas, ako inak. ⏱️";
    if(dc==="NL")return "Do Holandska. Bicykle, tulipány a ďalšie bicykle. 🚲";
    if(dc==="HU")return "Do Maďarska. Lángoš už čaká.";
    if(dc==="PL")return "Do Poľska. Na zemiakové pirohy. 🥟";
    if(["TH","ID","VN","PH","MY","SG","JP","KR","CN","IN","MV","LK","AU"].includes(dc))return pick(["Na druhý koniec sveta. Závidíme. 🌏","Dlhý let. Niekto tam už pozerá tretí film."]);
  }
  if(oc==="SK")return pick(["Práve odletel zo Slovenska. Šťastnú cestu! 👋","Z domu do sveta. Nezabudni zavolať mame."]);
  if(/Ryanair|Malta Air|Lauda/.test(al))return pick(["Ryanair. Miesto na nohy sa platí zvlášť. 🦵","Ryanair. Batožina 40×20×25, ani o centimeter viac.","Ryanair. Po pristátí zatlieskať je povinné. 👏"]);
  if(/Wizz/.test(al))return pick(["Wizz Air. Letenka 9,99 €, kufor 79 €. 💜","Wizz Air. Fialová, lacná, plná."]);
  if(/DHL|UPS|FedEx|Cargolux|Cargo|Kalitta|Atlas|ASL/.test(al))return pick(["Nákladné. Možno v ňom je tvoj balík z Číny. 📦","Cargo let. Žiadni pasažieri, len krabice."]);
  if(/Emirates|Qatar|Etihad|Singapore|Cathay/.test(al))return "Vzadu si niekto práve berie teplý uterák. Luxus. ✨";
  if(/NetJets|VistaJet/.test(al)||rarity(a)==="u"&&/^(GLF|GL|CL|FA|C68|C700|PC24|LJ)/.test(a.type||""))return pick(["Súkromný jet. Niekto má lepší deň ako ty. 💸","Biznis jet. Šampanské je v cene."]);
  if(a.alt!=null&&a.alt<1500)return pick(["Nízko! Buď pristáva, alebo práve vzlietol. 🛬","Tak nízko, že by si mu skoro zamával."]);
  if(V)return pick(["Tam hore teraz dachto bojuje o opierku na ruku.","Machňi. Možno če uvidzi.","Tam hore je −50 °C. A ty še šťažuješ na zimu?"]);
  return pick(["Tam hore teraz niekto bojuje o opierku na ruku. 💺","Mávni. Možno ťa uvidí cez okno. 👋","Pilot práve hlási: „Vpravo pod nami Slovensko.“","Tam hore je −50 °C. A ty sa sťažuješ na zimu?","Niekto tam práve otvára vrecúško arašidov. 🥜","Tam hore už rozdávajú kávu. Ty si si ju tiež zaslúžiš. ☕"]);
}
const GERLACH=2655;
function altCompare(m){if(m==null)return "výška";if(m<200)return "nižšie ako bratislavské UFO";if(m<GERLACH)return "≈ "+nf(m/330,1)+"× Eiffelovka";return "≈ "+nf(m/GERLACH,1)+"× Gerlach 🏔️"}
function spdCompare(k){if(k==null)return "rýchlosť";if(k<150)return "ako auto po D1";return nf(k/130,0)+"× rýchlejšie ako ty na D1 🚗"}

/* ============ zbierka ============ */
let COL=LS.get("ctl_col",null)||{hex:{},types:{},pts:0,ach:{},n:0};
const ACH=[
  {id:"first",i:"🐣",n:"Prvý úlovok",c:()=>COL.n>=1},
  {id:"ten",i:"🔟",n:"Desiatka",c:()=>COL.n>=10},
  {id:"fifty",i:"🦅",n:"Spotter",c:()=>COL.n>=50},
  {id:"hundred",i:"💯",n:"Stovka",c:()=>COL.n>=100},
  {id:"types10",i:"📚",n:"10 typov",c:()=>Object.keys(COL.types).length>=10},
  {id:"wide",i:"🐋",n:"Obor",c:e=>e&&WIDE.has(e.type)},
  {id:"a380",i:"👑",n:"Kráľ oblohy (A380)",c:e=>e&&e.type==="A388"},
  {id:"jumbo",i:"🐘",n:"Jumbo (747)",c:e=>e&&/^B74/.test(e.type)},
  {id:"mil",i:"🫡",n:"Vojenská tajnosť",c:e=>e&&e.mil},
  {id:"heli",i:"🚁",n:"Vrtuľka",c:e=>e&&isHeli(e)},
  {id:"cargo",i:"📦",n:"Tvoj balík",c:e=>e&&/DHL|UPS|FedEx|Cargo/.test(airlineOf(e))},
  {id:"night",i:"🦉",n:"Nočná sova",c:e=>e&&new Date().getHours()<4},
  {id:"zenith",i:"🎯",n:"Presne nad hlavou",c:e=>e&&e.el>=80},
  {id:"legend",i:"🌟",n:"Legenda",c:e=>e&&rarity(e)==="l"},
  {id:"iss",i:"🛰️",n:"Videl som ISS",c:()=>false},
  {id:"shazam",i:"👂",n:"Shazam na lietadlo",c:()=>false},
  {id:"video",i:"🎬",n:"Režisér oblohy",c:()=>false},
  {id:"home",i:"🏠",n:"Domov na Slovensko",c:e=>{const m=e&&S.meta.get(e.hex);return !!(m&&m.route&&m.route.destination&&m.route.destination.country_iso_name==="SK")}},
];
const LEVELS=["Pozerač do zeme","Zvedavec","Mávač lietadlám","Spotter z balkóna","Expert od plota","Kapitán z gauča","Pán oblohy","Legenda z Ivanky","Nebeský šaman"];
const lvlOf=p=>Math.min(LEVELS.length-1,Math.floor(Math.sqrt(p/6)));
const lvlPts=l=>6*l*l;
function tryCatch(a){
  if(a.el==null||a.el<25||COL.hex[a.hex])return;
  const r=rarity(a),pts=RAR[r].p;
  COL.hex[a.hex]=Date.now();COL.n++;COL.pts+=pts;
  const ty=a.type||"?",newType=!COL.types[ty];
  COL.types[ty]=COL.types[ty]||{n:0,r,name:typeName(a,S.meta.get(a.hex)),first:Date.now()};COL.types[ty].n++;
  const prevLvl=lvlOf(COL.pts-pts);
  const newAch=ACH.filter(x=>!COL.ach[x.id]&&x.c(a));newAch.forEach(x=>COL.ach[x.id]=Date.now());
  LS.set("ctl_col",COL);
  let T=t("caught")+" +"+pts+" "+(pts===1?"bod":pts<5?"body":"bodov"),Sub=titleOf(a)+" · "+typeName(a,S.meta.get(a.hex));
  if(newType)Sub+=" · nový typ!";
  if(newAch.length){T="🏅 Odznak: "+newAch[0].n;Sub="+"+pts+" b · "+titleOf(a)}
  if(lvlOf(COL.pts)>prevLvl){T="⬆️ Level up: "+LEVELS[lvlOf(COL.pts)]}
  toast(T,Sub,RAR[r].col);
  if(r!=="c"||newAch.length||newType)confetti(r==="l"?80:40);
  ping(r);
  HOOKS.caught.forEach(f=>{try{f(a,r)}catch(e){console.error(e)}});
  if(S.view==="col")renderCol();
}
function grantAch(id){if(COL.ach[id])return;const x=ACH.find(q=>q.id===id);if(!x)return;COL.ach[id]=Date.now();LS.set("ctl_col",COL);toast("🏅 Odznak: "+x.n,"Gratulujem!","#ffcf4f");confetti(50);ping("r");if(S.view==="col")renderCol()}

/* ============ UI ============ */
function setStatus(x,live){$("status").textContent=x;$("dot").className="dot"+(live?" live":"")}
function err(x){$("err").textContent=x||"";$("heroErr").textContent=x||""}
let toastT;
function toast(a,b,col){$("toastT").textContent=a;$("toastS").textContent=b||"";$("toast").style.borderColor=col||"var(--gold)";$("toast").classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>$("toast").classList.remove("on"),3200)}
function confetti(n){const cols=["#6dffc7","#4fc3ff","#ff4fd8","#ffcf4f","#fff"];for(let i=0;i<n;i++){const e=document.createElement("i");e.className="cf";e.style.left=Math.random()*96+"%";e.style.background=cols[i%cols.length];e.style.setProperty("--dx",(Math.random()*160-80)+"px");e.style.animationDelay=Math.random()*.4+"s";e.style.borderRadius=Math.random()<.5?"50%":"2px";$("fx").appendChild(e);setTimeout(()=>e.remove(),2200)}}
let actx;
function ping(r){try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const notes=r==="l"?[523,659,784,1047]:r==="r"?[523,784,1047]:[784,1047];notes.forEach((f,i)=>{const o=actx.createOscillator(),g=actx.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,actx.currentTime+i*.09);g.gain.exponentialRampToValueAtTime(.15,actx.currentTime+i*.09+.02);g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+i*.09+.25);o.connect(g).connect(actx.destination);o.start(actx.currentTime+i*.09);o.stop(actx.currentTime+i*.09+.3)})}catch(e){}}

function applyTexts(){
  $("logo").innerHTML="<span>"+t("title")+"</span>";$("sp-title").innerHTML="<span>"+t("title")+"</span>";
  $("sp-sub").textContent=t("sub");$("go").textContent=t("go");$("lookupBadge").textContent=t("look");document.title=t("title")+" ✈️";
}

function renderHeroStatic(a){
  const hero=$("hero");
  if(!a){
    $("h-lbl").textContent=t("now");$("h-call").textContent=S.pos?t("empty"):"—";
    $("h-type").textContent=S.pos?t("emptySub"):"Čakám na polohu…";
    ["h-route","h-photo","h-eta"].forEach(id=>$(id).classList.remove("on"));$("h-quip").textContent="";$("h-rar").style.display="none";$("h-links").innerHTML="";
    hero.classList.remove("overhead","emerg");return;
  }
  const m=S.meta.get(a.hex)||{},r=rarity(a),al=airlineOf(a)||(m.route&&m.route.airline&&m.route.airline.name)||"";
  $("h-lbl").textContent=t("now");
  $("h-rar").style.display="";$("h-rar").textContent=(a.mil?"VOJENSKÉ · ":"")+RAR[r].n.toUpperCase();$("h-rar").style.color=RAR[r].col;
  $("h-call").textContent=titleOf(a);
  $("h-type").textContent=[typeName(a,m),al,a.reg&&a.call?a.reg:""].filter(Boolean).join(" · ");
  const rt=m.route;
  if(rt&&rt.origin&&rt.destination){
    $("r-o").textContent=rt.origin.iata_code||rt.origin.icao_code||"?";$("r-on").textContent=rt.origin.municipality||rt.origin.name||"";
    $("r-d").textContent=rt.destination.iata_code||rt.destination.icao_code||"?";$("r-dn").textContent=rt.destination.municipality||rt.destination.name||"";
    $("h-route").classList.add("on");
  }else $("h-route").classList.remove("on");
  const ph=m.ac&&(m.ac.url_photo||m.ac.url_photo_thumbnail);
  if(ph){const img=new Image();img.onload=()=>{if(S.top&&S.top.hex===a.hex){$("h-photo").style.backgroundImage="url('"+ph.replace(/'/g,"%27")+"')";$("h-photo").classList.add("on")}};img.src=ph}
  else $("h-photo").classList.remove("on");
  $("h-quip").textContent=quip(a,m);
  hero.classList.toggle("emerg",a.sq==="7700");
  $("h-links").innerHTML=`<a href="https://globe.adsb.lol/?icao=${esc(a.hex)}" target="_blank" rel="noopener">Mapa letu ↗</a>`+
    (a.call?`<a href="https://www.flightradar24.com/${encodeURIComponent(a.call)}" target="_blank" rel="noopener">Flightradar24 ↗</a>`:"")+
    (a.reg?`<a href="https://www.jetphotos.com/registration/${encodeURIComponent(a.reg)}" target="_blank" rel="noopener">Fotky ↗</a>`:"");
  HOOKS.heroStatic.forEach(f=>{try{f(a)}catch(e){console.error(e)}});
}

function renderHeroLive(a){
  if(!a)return;
  const el=Math.max(0,a.el??0);
  $("hero").classList.toggle("overhead",el>=60);
  $("h-look").textContent=el>=75?t("overhead"):`${nf(el)}° nad obzorom, na ${dirL(a.bear)}`;
  $("h-lookSub").textContent=S.heading!=null?"Šípka ukazuje, kam sa otočiť":"Smer od severu: "+nf(a.bear)+"° · ťukni na kompas a zapni ho";
  $("h-gauge").style.width=Math.min(100,el/90*100)+"%";
  const rot=S.heading!=null?a.bear-S.heading:a.bear;
  $("arrow").style.transform=`rotate(${rot}deg)`;
  $("compN").style.display=S.heading!=null?"none":"";
  $("g-alt").textContent=a.alt!=null?nf(a.alt)+" m":"—";$("g-altC").textContent=altCompare(a.alt);
  $("g-spd").textContent=a.spd!=null?nf(a.spd)+" km/h":"—";$("g-spdC").textContent=spdCompare(a.spd);
  $("g-dist").textContent=nf(a.dist/1000,1)+" km";
  $("g-trk").textContent=a.trk!=null?dirS(a.trk)+" "+nf(a.trk)+"°":"—";
  $("g-trkC").textContent=a.vr>300?"letí smerom · stúpa ↗":a.vr<-300?"letí smerom · klesá ↘":"letí smerom";
  const ap=approach(a),eta=$("h-eta");
  if(ap&&ap.t>3&&ap.t<900&&ap.el!=null&&ap.el>=20){
    const mm=Math.floor(ap.t/60),ss=Math.floor(ap.t%60);
    eta.innerHTML=`⏱ Najbližšie k tebe bude o <b>${mm}:${String(ss).padStart(2,"0")}</b> · ${nf(ap.el)}° nad obzorom`;eta.classList.add("on");
  }else if(ap&&ap.t<=3&&ap.t>-60&&el>=40){eta.innerHTML="🎯 Práve preletel najbližšie k tebe!";eta.classList.add("on")}
  else eta.classList.remove("on");
}

function renderRadar(list){
  let s=`<circle r="100" fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.12)"/>
    <circle r="66.7" fill="none" stroke="rgba(255,255,255,.08)" stroke-dasharray="2 3"/><circle r="33.3" fill="none" stroke="rgba(255,255,255,.08)" stroke-dasharray="2 3"/>
    <line x1="-100" y1="0" x2="100" y2="0" stroke="rgba(255,255,255,.06)"/><line x1="0" y1="-100" x2="0" y2="100" stroke="rgba(255,255,255,.06)"/>
    <text y="-103" fill="#97a3c7" font-size="8" text-anchor="middle">S</text><text x="105" y="3" fill="#97a3c7" font-size="8" text-anchor="middle">V</text>
    <text y="108" fill="#97a3c7" font-size="8" text-anchor="middle">J</text><text x="-105" y="3" fill="#97a3c7" font-size="8" text-anchor="middle">Z</text>
    <circle r="3" fill="#6dffc7"><animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite"/></circle>`;
  HOOKS.radar.forEach(f=>{try{s+=f()||""}catch(e){}});
  const vis=list.filter(a=>a.el!=null&&a.el>0).slice(0,40);
  vis.slice().reverse().forEach(a=>{
    const r=(90-a.el)/90*100,x=r*Math.sin(rad(a.bear)),y=-r*Math.cos(rad(a.bear));
    const top=S.top&&a.hex===S.top.hex,c=top?"#6dffc7":RAR[rarity(a)].col;
    s+=`<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><path d="M0,-6 L4,5 L0,3 L-4,5 Z" fill="${c}" transform="rotate(${a.trk??0})"/>
      <text x="7" y="3" fill="${c}" font-size="${top?8:6}" font-weight="${top?700:400}">${esc(titleOf(a))}</text></g>`;
  });
  $("radar").innerHTML=s;$("radarCnt").textContent=vis.length+" nad obzorom";
}

function renderList(list){
  const rest=list.filter(a=>!S.top||a.hex!==S.top.hex).slice(0,15);
  $("list").innerHTML=rest.length?rest.map(a=>{const m=S.meta.get(a.hex);return `<div class="row"><div class="l"><b><span class="badge" style="background:${RAR[rarity(a)].col}"></span>${esc(titleOf(a))}</b><div>${esc(typeName(a,m))}${airlineOf(a)?" · "+esc(airlineOf(a)):""}</div></div>
    <div class="r"><b>${a.alt!=null?nf(a.alt)+" m":"—"}</b><br>${nf(a.dist/1000,1)} km ${dirS(a.bear)} · ${nf(Math.max(0,a.el??0))}°</div></div>`}).join(""):'<div class="lookSub">Nič ďalšie v okolí.</div>';
}

function renderCol(){
  const l=lvlOf(COL.pts),a=lvlPts(l),b=lvlPts(l+1);
  $("c-lvl").textContent="Lvl "+(l+1)+" · "+LEVELS[l];$("c-pts").textContent=COL.pts+" "+(COL.pts===1?"bod":COL.pts>1&&COL.pts<5?"body":"bodov");
  $("c-bar").style.width=(l>=LEVELS.length-1?100:Math.min(100,(COL.pts-a)/(b-a)*100))+"%";
  $("c-next").textContent=l>=LEVELS.length-1?"Si na vrchole. Respekt. 🫡":"Ďalší level: "+LEVELS[l+1]+" (ešte "+(b-COL.pts)+" b)";
  const types=Object.entries(COL.types);
  $("c-n").textContent=COL.n;$("c-t").textContent=types.length;$("c-r").textContent=types.filter(([,v])=>v.r==="r"||v.r==="l").reduce((s,[,v])=>s+v.n,0);
  $("c-ach").innerHTML=ACH.map(x=>`<div class="${COL.ach[x.id]?"got":""}"><i>${x.i}</i>${x.n}</div>`).join("");
  $("c-achN").textContent=Object.keys(COL.ach).length+"/"+ACH.length;
  const order={l:0,r:1,u:2,c:3};
  $("c-types").innerHTML=types.length?types.sort((x,y)=>order[x[1].r]-order[y[1].r]||y[1].n-x[1].n).map(([k,v])=>`<div class="row"><div class="l"><b><span class="badge" style="background:${RAR[v.r].col}"></span>${esc(v.name||k)}</b><div>${RAR[v.r].n} · ${esc(k)}</div></div><div class="r"><b>${v.n}×</b></div></div>`).join(""):'<div class="lookSub">Zatiaľ prázdna. Pozri hore!</div>';
}

/* ============ hlavná slučka ============ */
function tick(fresh){
  const now=Date.now();
  S.list=enrich(now);
  // vyber lietadlo najvyššie nad obzorom (s miernou „lepivosťou“, aby neskákalo)
  let best=S.list[0]||null;
  if(best&&S.top){const cur=S.list.find(a=>a.hex===S.top.hex);if(cur&&cur.el!=null&&best.el-cur.el<2)best=cur}
  const changed=(best&&best.hex)!==(S.top&&S.top.hex);
  S.top=best;
  if(changed||fresh){renderHeroStatic(best);if(best){loadMeta(best);if(changed)announce(best,false)}}
  renderHeroLive(best);
  HOOKS.live.forEach(f=>{try{f(best,fresh)}catch(e){console.error(e)}});
  if(fresh||now%3000<1000){renderRadar(S.list);renderList(S.list)}
  S.list.forEach(tryCatch);
  if(best&&best.el>=60&&!S.buzzed.has(best.hex)){S.buzzed.add(best.hex);if(S.vib&&navigator.vibrate)navigator.vibrate([120,60,120,60,240])}
  // prednačítaj trasy pre ďalšie 3 lietadlá
  if(fresh){S.list.slice(1,4).forEach(a=>loadMeta(a));HOOKS.fresh.forEach(f=>{try{f()}catch(e){console.error(e)}})}
}

/* ============ hlas ============ */
function voiceSay(txt){
  try{const u=new SpeechSynthesisUtterance(txt);const vs=speechSynthesis.getVoices();
    u.voice=vs.find(v=>/^sk/i.test(v.lang))||vs.find(v=>/^cs/i.test(v.lang))||null;u.lang=u.voice?u.voice.lang:"sk-SK";u.rate=1.02;
    speechSynthesis.cancel();speechSynthesis.speak(u)}catch(e){}
}
function announce(a,metaArrived){
  if(!S.voice||!a)return;
  const m=S.meta.get(a.hex);
  if(m&&m.loading)return; // počkaj na trasu
  if(S.announced.has(a.hex))return;S.announced.add(a.hex);
  const d=m&&m.route&&m.route.destination,al=airlineOf(a);
  let s=(S.vych?"Nad tebu ľeci ":"Nad tebou letí ")+typeName(a,m).replace(/-/g," ");
  if(al)s+=", "+al;
  if(d)s+=", smer "+(d.municipality||d.name);
  if(a.alt!=null)s+=", vo výške "+Math.round(a.alt/100)*100+" metrov";
  voiceSay(s+".");
}

/* ============ kompas a orientácia ============ */
let oriBound=false,hasAbs=false;
function onOri(e){
  if(e.type==="deviceorientation"&&hasAbs&&e.webkitCompassHeading==null)return;
  let alpha=null;
  if(e.webkitCompassHeading!=null)alpha=360-e.webkitCompassHeading;
  else if(e.absolute||e.type==="deviceorientationabsolute")alpha=e.alpha;
  if(alpha==null||e.beta==null)return;
  if(e.type==="deviceorientationabsolute")hasAbs=true;
  const A=rad(alpha),B=rad(e.beta),G=rad(e.gamma||0);
  const cA=Math.cos(A),sA=Math.sin(A),cB=Math.cos(B),sB=Math.sin(B),cG=Math.cos(G),sG=Math.sin(G);
  // smer zadnej kamery
  const E=-(cA*sG+sA*sB*cG),N=-(sA*sG-cA*sB*cG),U=-cB*cG;
  const camH=(deg(Math.atan2(E,N))+360)%360,camP=deg(Math.asin(Math.max(-1,Math.min(1,U))));
  // smer hornej hrany mobilu (keď ho držíš naplocho)
  const topH=(deg(Math.atan2(-sA*cB,cA*cB))+360)%360;
  const h=Math.abs(cB)>.35?topH:camH;
  const lp=(o,n,k)=>o==null?n:(o+wrap180(n-o)*k+360)%360;
  S.heading=lp(S.heading,h,.25);
  S.camHead=lp(S.camHead,camH,.3);
  S.camPitch=S.camPitch==null?camP:S.camPitch+(camP-S.camPitch)*.3;
  S.compassOn=true;
}
function bindOri(){if(oriBound)return;oriBound=true;
  if("ondeviceorientationabsolute" in window)window.addEventListener("deviceorientationabsolute",onOri);
  window.addEventListener("deviceorientation",onOri);}
async function enableCompass(){
  bindOri(); // poslucháče hneď – na Androide netreba povolenie
  try{
    if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){
      const r=await DeviceOrientationEvent.requestPermission();if(r!=="granted")throw new Error("zamietnuté");
    }
    $("compStat").textContent="Zapnutý ✓ (ak šípka blbne, sprav s mobilom osmičku)";$("b-comp").textContent="Zapnutý";
    return true;
  }catch(e){if(S.compassOn)return true;$("compStat").textContent="Kompas nie je povolený: "+e.message;return false}
}

/* ============ zdieľanie ============ */
async function share(){
  const a=S.top;if(!a){toast("Nič na zdieľanie","Počkaj, kým niečo preletí");return}
  const m=S.meta.get(a.hex)||{},rt=m.route,W=1080,H=1920,c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  try{await document.fonts.ready}catch(e){}
  const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#0d1430");g.addColorStop(.55,"#1b2a6b");g.addColorStop(1,"#5a1f6b");x.fillStyle=g;x.fillRect(0,0,W,H);
  const rg=x.createRadialGradient(W*.8,H*.2,0,W*.8,H*.2,700);rg.addColorStop(0,"rgba(109,255,199,.35)");rg.addColorStop(1,"rgba(109,255,199,0)");x.fillStyle=rg;x.fillRect(0,0,W,H);
  for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.7})`;x.beginPath();x.arc(Math.random()*W,Math.random()*H*.6,Math.random()*2.2,0,7);x.fill()}
  x.textAlign="left";x.fillStyle="#97a3c7";x.font="600 38px Inter, sans-serif";x.fillText((S.vych?"TERAZ NAD MNU ĽECI":"PRÁVE NADO MNOU LETÍ"),90,300);
  x.fillStyle="#fff";let fs=150;const call=titleOf(a);x.font="900 "+fs+"px Unbounded, sans-serif";while(x.measureText(call).width>W-180&&fs>60){fs-=10;x.font="900 "+fs+"px Unbounded, sans-serif"}x.fillText(call,90,470);
  x.fillStyle="#dfe6ff";x.font="500 46px Inter, sans-serif";x.fillText(typeName(a,m),90,550);
  const al=airlineOf(a)||(rt&&rt.airline&&rt.airline.name)||"";if(al){x.fillStyle="#97a3c7";x.fillText(al,90,615)}
  let y=760;
  if(rt&&rt.origin&&rt.destination){
    x.fillStyle="rgba(0,0,0,.3)";rr(x,90,y-110,W-180,260,40);x.fill();
    x.fillStyle="#fff";x.font="800 110px Unbounded, sans-serif";x.fillText(rt.origin.iata_code||"?",140,y+30);x.textAlign="right";x.fillText(rt.destination.iata_code||"?",W-140,y+30);
    x.font="500 34px Inter, sans-serif";x.fillStyle="#97a3c7";x.fillText(clip(x,rt.destination.municipality||"",360),W-140,y+95);x.textAlign="left";x.fillText(clip(x,rt.origin.municipality||"",360),140,y+95);
    x.textAlign="center";x.font="70px sans-serif";x.fillText("✈️",W/2,y+20);x.textAlign="left";y+=260;
  }
  const stats=[[a.alt!=null?nf(a.alt)+" m":"—",altCompare(a.alt)],[a.spd!=null?nf(a.spd)+" km/h":"—",spdCompare(a.spd)],[nf(a.dist/1000,1)+" km","odo mňa"],[nf(Math.max(0,a.el))+"°","nad obzorom"]];
  stats.forEach((s,i)=>{const cx=90+(i%2)*((W-200)/2+20),cy=y+Math.floor(i/2)*220;x.fillStyle="rgba(255,255,255,.07)";rr(x,cx,cy,(W-200)/2,190,32);x.fill();
    x.fillStyle="#fff";x.font="800 60px Unbounded, sans-serif";x.fillText(s[0],cx+36,cy+90);x.fillStyle="#97a3c7";x.font="500 30px Inter, sans-serif";x.fillText(clip(x,s[1],(W-200)/2-60),cx+36,cy+145)});
  y=Math.min(y+480,H-480);
  x.fillStyle="rgba(255,79,216,.2)";rr(x,90,y,W-180,230,36);x.fill();
  x.fillStyle="#fff";x.font="600 44px Inter, sans-serif";wrapText(x,quip(a,m),130,y+80,W-260,58,3);
  x.fillStyle="#6dffc7";x.font="900 56px Unbounded, sans-serif";x.textAlign="center";x.fillText(t("title"),W/2,H-165);
  x.fillStyle="#97a3c7";x.font="500 36px Inter, sans-serif";x.fillText(location.host||"",W/2,H-110);
  x.fillStyle="#fff";x.font="500 30px Inter, sans-serif";x.fillText(new Date().toLocaleString("sk-SK",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}),W/2,H-60);
  c.toBlob(async blob=>{
    const file=new File([blob],"co-to-leti.png",{type:"image/png"});
    try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:"Práve nado mnou letí "+titleOf(a)+" ✈️ "+location.href});return}}catch(e){if(e.name==="AbortError")return}
    shareBlob(blob,"co-to-leti.png","Práve nado mnou letí "+titleOf(a)+" ✈️ "+location.href);
  },"image/png");
}
function rr(x,a,b,w,h,r){x.beginPath();x.moveTo(a+r,b);x.arcTo(a+w,b,a+w,b+h,r);x.arcTo(a+w,b+h,a,b+h,r);x.arcTo(a,b+h,a,b,r);x.arcTo(a,b,a+w,b,r);x.closePath()}
function clip(x,s,w){s=String(s);while(s.length>1&&x.measureText(s).width>w)s=s.slice(0,-2)+"…";return s}
function wrapText(x,s,a,b,w,lh,max){
  const lines=[];let line="";
  for(const wd of String(s).split(" ")){const tst=line?line+" "+wd:wd;if(x.measureText(tst).width>w&&line){lines.push(line);line=wd}else line=tst}
  if(line)lines.push(line);
  if(lines.length>max){lines.length=max;lines[max-1]+="…"}
  lines.forEach((l,i)=>x.fillText(clip(x,l,w),a,b+i*lh));
}

/* ============ poloha ============ */
let watchId=null;
function startGps(){
  S.manual=false;
  if(!("geolocation" in navigator)){err("Prehliadač nepodporuje polohu. Zadaj ju ručne v Nastaveniach.");return}
  setStatus("Hľadám polohu…",false);
  if(watchId!=null)navigator.geolocation.clearWatch(watchId);
  navigator.geolocation.getCurrentPosition(p=>{if(!S.manual)gotPos(p,true)},posErr,{enableHighAccuracy:false,maximumAge:600000,timeout:15000});
  watchId=navigator.geolocation.watchPosition(p=>{
    if(S.manual)return;
    const first=!S.pos||!S.raw.length;
    gotPos(p,first);
  },posErr,{enableHighAccuracy:true,maximumAge:15000,timeout:30000});
}
function gotPos(p,first){
  S.pos={lat:p.coords.latitude,lon:p.coords.longitude,alt:p.coords.altitude||0};LS.set("ctl_pos",S.pos);showPos();
  $("posBtns").style.display="none";err("");
  if(!S.raw.length){$("h-type").textContent="Poloha OK ✓ Hľadám lietadlá…";setStatus("Načítavam lietadlá…",false)}
  if(first)fetchPlanes();
}
function posErr(e){
  if(S.raw.length&&e.code!==1)return;
  $("posBtns").style.display="flex";
  if(!S.raw.length)$("h-type").textContent="Bez polohy to nepôjde 🙈";
  err(e.code===1?"Poloha je zablokovaná. iPhone: Nastavenia → Súkromie → Polohové služby → Safari → „Pri používaní“. Android: ťukni na zámok vedľa adresy → Povolenia → Poloha. Potom stránku obnov."
    :e.code===3?"Poloha sa hľadá príliš dlho (si vnútri?). Skúšam znova – alebo zadaj polohu ručne.":"Polohu sa nepodarilo zistiť. Skontroluj, či máš zapnutú polohu v mobile.");
  setStatus("Chýba poloha",false);
}
function showPos(){if(S.pos){$("posTxt").textContent=(S.manual?"ručne · ":"GPS · ")+S.pos.lat.toFixed(3)+", "+S.pos.lon.toFixed(3);$("mlat").placeholder=S.pos.lat.toFixed(4);$("mlon").placeholder=S.pos.lon.toFixed(4)}}

/* ============ navigácia a ovládanie ============ */
function setView(v){
  if(v==="ar"){openAR();}
  S.view=v;
  document.querySelectorAll("nav button").forEach(b=>b.classList.toggle("on",b.dataset.v===v));
  ["now","space","col","set"].forEach(k=>$("v-"+k).classList.toggle("on",k===v||(v==="ar"&&k==="now")));
  if(v==="col")renderCol();
  HOOKS.view.forEach(f=>{try{f(v)}catch(e){}});
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>setView(b.dataset.v));
$("b-ar").onclick=()=>setView("ar");$("arClose").onclick=()=>closeAR();
$("b-share").onclick=share;$("shareClose").onclick=()=>$("shareM").classList.remove("on");
function syncToggles(){$("t-voice").classList.toggle("on",S.voice);$("t-vib").classList.toggle("on",S.vib);$("t-vych").classList.toggle("on",S.vych);$("b-voice").textContent=S.voice?"🔊":"🔇"}
function toggleVoice(){S.voice=!S.voice;LS.set("ctl_voice",S.voice);syncToggles();if(S.voice){S.announced.clear();voiceSay(S.vych?"Hlas zapnuti. Ňič ci ňeujďe.":"Hlas zapnutý. Nič ti neujde.");setTimeout(()=>S.top&&announce(S.top),2500)}else try{speechSynthesis.cancel()}catch(e){}}
$("b-voice").onclick=toggleVoice;$("t-voice").onclick=toggleVoice;
$("t-vib").onclick=()=>{S.vib=!S.vib;LS.set("ctl_vib",S.vib);syncToggles();if(S.vib&&navigator.vibrate)navigator.vibrate(80)};
$("t-vych").onclick=()=>{S.vych=!S.vych;LS.set("ctl_vych",S.vych);syncToggles();applyTexts();renderHeroStatic(S.top);if(S.vych)toast("Východniarsky mód","Šicko po našemu 🥟","#ff4fd8")};
$("b-comp").onclick=enableCompass;
$("radius").value=String(LS.get("ctl_radius",25));$("radius").onchange=()=>{LS.set("ctl_radius",+$("radius").value);fetchPlanes()};
$("mset").onclick=()=>{
  const la=parseFloat(($("mlat").value||"").replace(",",".")),lo=parseFloat(($("mlon").value||"").replace(",","."));
  if(isNaN(la)||isNaN(lo)||Math.abs(la)>90||Math.abs(lo)>180){err("Zadaj platné súradnice, napr. 48.1486 a 17.1077.");return}
  S.manual=true;S.pos={lat:la,lon:lo,alt:0};LS.set("ctl_pos",S.pos);err("");showPos();fetchPlanes();toast("Poloha nastavená",la.toFixed(3)+", "+lo.toFixed(3));
};
$("mgps").onclick=()=>{err("");startGps()};
let resetArm=0;
$("b-reset").onclick=()=>{if(Date.now()-resetArm<3000){COL={hex:{},types:{},pts:0,ach:{},n:0};LS.set("ctl_col",COL);renderCol();$("b-reset").textContent="Vymazané";toast("Zbierka vymazaná","Začínaš od nuly")}else{resetArm=Date.now();$("b-reset").textContent="Naozaj? Ťukni znova"}};

$("go").onclick=async()=>{
  $("splash").classList.add("hide");setTimeout(()=>$("splash").style.display="none",450);
  try{actx=actx||new (window.AudioContext||window.webkitAudioContext)()}catch(e){}
  startGps();if(S.pos)fetchPlanes();
  // Android kompas nepotrebuje povolenie; iPhone sa spýta až pri AR / tlačidle kompasu
  bindOri();
};
$("b-pos").onclick=()=>{err("");startGps()};
$("b-man").onclick=()=>setView("set");
$("compass").onclick=()=>{if(S.heading==null)enableCompass()};

/* ============ obloha podľa dennej doby + ikona ============ */
(function(){
  const h=new Date().getHours(),r=document.documentElement.style;
  if(h>=6&&h<17){r.setProperty("--g1","rgba(79,195,255,.35)");r.setProperty("--g2","rgba(109,255,199,.18)")}
  else if(h>=17&&h<20){r.setProperty("--g1","rgba(255,138,79,.35)");r.setProperty("--g2","rgba(255,79,216,.28)")}

})();

