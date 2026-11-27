"use strict";
/* ============ základy ============ */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// úložisko: plná pamäť Safari (5 MB) → orež históriu a skús znova; zbierka (ctl_col) sa zapisuje s krátkym odkladom (1 zápis namiesto 4 pri mávnutí)
const LSP=new Map();let LST=null;
const STORAGE_JOURNAL="ctl_storage_recovery",STORAGE_VERSION="ctl_storage_version";
function writeStorageEntries(entries){
  for(const [key,value] of entries){
    if(localStorage.getItem(key)===value)continue;
    if(value===null)localStorage.removeItem(key);
    else localStorage.setItem(key,value);
  }
}
function restoreStorageBatch(entries){
  // Pri obnove najprv odstráň zapísané rozdiely, aby bolo miesto na pôvodné hodnoty.
  const changed=entries.filter(([key,value])=>localStorage.getItem(key)!==value);
  for(const [key] of changed)localStorage.removeItem(key);
  writeStorageEntries(changed);
  localStorage.removeItem(STORAGE_JOURNAL);
}
let storageRecovery=null,storageVersion=null,bootJournal=null;
try{
  bootJournal=localStorage.getItem(STORAGE_JOURNAL);
  if(bootJournal)storageRecovery=JSON.parse(bootJournal);
  storageVersion=localStorage.getItem(STORAGE_VERSION);
}catch(e){}
function storageCurrent(){
  try{return !storageRecovery&&!localStorage.getItem(STORAGE_JOURNAL)&&localStorage.getItem(STORAGE_VERSION)===storageVersion}
  catch(e){return false}
}
function storageBatch(writes){
  if(!storageCurrent())throw Error("storage_changed");
  const entries=[...writes].filter(([key,value])=>localStorage.getItem(key)!==value);
  const version=String(Date.now())+"-"+Math.random();
  entries.push([STORAGE_VERSION,version]);
  const previous=entries.map(([key])=>[key,localStorage.getItem(key)]);
  localStorage.setItem(STORAGE_JOURNAL,JSON.stringify(previous));
  try{
    writeStorageEntries(entries);
    localStorage.removeItem(STORAGE_JOURNAL);
    storageVersion=version;
  }catch(error){
    try{restoreStorageBatch(previous)}catch(e){storageRecovery=previous}
    throw error;
  }
}
function withCollectionStorage(action){
  return navigator.locks?.request?navigator.locks.request("cotoleti-collection",action):Promise.resolve().then(action);
}
if(storageRecovery)setTimeout(()=>{
  // Iná karta môže mať zápis práve rozpracovaný. Počkaj na ten istý zámok.
  withCollectionStorage(()=>{
    if(localStorage.getItem(STORAGE_JOURNAL)===bootJournal)restoreStorageBatch(storageRecovery);
    LSP.clear();LS.set=()=>{};location.reload();
  }).catch(()=>{toast("Zbierku zatiaľ neviem obnoviť","Uvoľni miesto v prehliadači a obnov stránku.")});
},navigator.locks?.request?0:250);
addEventListener("storage",event=>{
  if((event.key!==STORAGE_VERSION&&!(event.key===STORAGE_JOURNAL&&event.newValue===null))||storageCurrent()||localStorage.getItem(STORAGE_JOURNAL))return;
  LSP.clear();LS.set=()=>{};location.reload();
});

function lsWrite(k,s){try{localStorage.setItem(k,s);return true}catch(e){
  try{const L=JSON.parse(localStorage.getItem("ctl_log")||"[]");if(Array.isArray(L)&&L.length>50)localStorage.setItem("ctl_log",JSON.stringify(L.slice(-Math.floor(L.length/2))));localStorage.removeItem("ctl_seenT");localStorage.removeItem("ctl_seen")}catch(x){}
  try{localStorage.setItem(k,s);return true}catch(x){try{navigator.sendBeacon&&navigator.sendBeacon("https://cotoleti-app.radovan-kudela.workers.dev/api/err",JSON.stringify({m:"quota "+k+" "+s.length}))}catch(y){}
    if(!lsWrite.warned){lsWrite.warned=1;setTimeout(()=>typeof toast==="function"&&toast("⚠️ Pamäť mobilu je plná","Úlovok sa nemusel uložiť – uvoľni miesto v Safari"),500)}return false}}}
function lsFlush(){
  clearTimeout(LST);LST=null;
  if(!storageCurrent()&&LSP.size)return false;
  let saved=true;
  for(const [key,value] of LSP){
    if(lsWrite(key,value))LSP.delete(key);
    else saved=false;
  }
  return saved;
}
const LS={get(k,d){if(LSP.has(k)){try{return JSON.parse(LSP.get(k))}catch(e){}}try{const prior=storageRecovery?.find(entry=>entry[0]===k);const v=prior?prior[1]:localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},
  set(k,v){if(!storageCurrent())return;let s;try{s=JSON.stringify(v)}catch(e){return}if(k==="ctl_col"){LSP.set(k,s);if(!LST)LST=setTimeout(lsFlush,300);return}lsWrite(k,s)}};
addEventListener("pagehide",lsFlush);document.addEventListener("visibilitychange",()=>{if(document.hidden)lsFlush()});
const FT=0.3048,KT=1.852,R=6371000,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const wrap180=a=>((a%360)+540)%360-180;
// tvar podľa čísla: pl(n,"deň","dni","dní")
const pl=(n,a,b,c)=>{n=Math.abs(n|0);return n===1?a:n>=2&&n<=4?b:c};
const nf=(n,d=0)=>n==null||isNaN(n)?"—":Number(n).toLocaleString("sk-SK",{maximumFractionDigits:d,minimumFractionDigits:d});
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const HOOKS={live:[],fresh:[],caught:[],heroStatic:[],radar:[],view:[],list:[]};
const S={pick:null,pos:LS.get("ctl_pos",null)||LS.get("nm_pos",null),manual:false,raw:[],rawT:0,list:[],top:null,meta:new Map(),
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
  emptySub:["Piloti majú pauzu. O chvíľu niečo preletí – alebo zväčši okruh.","Ľem mraki. Skus vekši okruh."],
  look:["POZRI HORE 👆","HĽEDZ HORE 👆"],
  overhead:["Je priamo nad tebou!","Je pravo nad tebu!"],
  caught:["Ulovené!","Mace ho!"],
};
const t=k=>TX[k][S.vych?1:0];

/* ============ číselníky ============ */
const TYPES={C140:"Cessna 140",D328:"Dornier 328",M600:"Piper M600",A319:"Airbus A319",A320:"Airbus A320",A20N:"Airbus A320neo",A321:"Airbus A321",A21N:"Airbus A321neo",A318:"Airbus A318",
A306:"Airbus A300",A310:"Airbus A310",A332:"Airbus A330-200",A333:"Airbus A330-300",A338:"Airbus A330-800neo",A339:"Airbus A330-900neo",A343:"Airbus A340-300",A346:"Airbus A340-600",A359:"Airbus A350-900",A35K:"Airbus A350-1000",A388:"Airbus A380",
BCS1:"Airbus A220-100",BCS3:"Airbus A220-300",B733:"Boeing 737-300",B734:"Boeing 737-400",B737:"Boeing 737-700",B738:"Boeing 737-800",B739:"Boeing 737-900",B37M:"Boeing 737 MAX 7",B38M:"Boeing 737 MAX 8",B39M:"Boeing 737 MAX 9",B3XM:"Boeing 737 MAX 10",
B742:"Boeing 747-200",B744:"Boeing 747-400",B748:"Boeing 747-8",B752:"Boeing 757-200",B753:"Boeing 757-300",B762:"Boeing 767-200",B763:"Boeing 767-300",B764:"Boeing 767-400",B772:"Boeing 777-200",B77W:"Boeing 777-300ER",B77L:"Boeing 777-200LR",B778:"Boeing 777-8",B779:"Boeing 777-9",B788:"Boeing 787-8",B789:"Boeing 787-9",B78X:"Boeing 787-10",
E170:"Embraer E170",E75L:"Embraer E175",E190:"Embraer E190",E195:"Embraer E195",E290:"Embraer E190-E2",E295:"Embraer E195-E2",AT72:"ATR 72",AT75:"ATR 72-500",AT76:"ATR 72-600",AT43:"ATR 42",DH8D:"Dash 8 Q400",
CRJ2:"Bombardier CRJ200",CRJ7:"Bombardier CRJ700",CRJ9:"Bombardier CRJ900",CRJX:"Bombardier CRJ1000",MD11:"McDonnell Douglas MD-11",SU95:"Suchoj Superjet 100",
C172:"Cessna 172",C152:"Cessna 152",C182:"Cessna 182",P28A:"Piper Cherokee",DA40:"Diamond DA40",DA42:"Diamond DA42",SR22:"Cirrus SR22",PC12:"Pilatus PC-12",PC24:"Pilatus PC-24",C25A:"Cessna Citation CJ2",C56X:"Cessna Citation Excel",C68A:"Cessna Citation Latitude",C700:"Cessna Citation Longitude",
GLF4:"Gulfstream IV",GLF5:"Gulfstream V",GLF6:"Gulfstream G650",GL5T:"Bombardier Global 5000",GLEX:"Bombardier Global Express",GL7T:"Bombardier Global 7500",CL35:"Bombardier Challenger 350",CL60:"Bombardier Challenger 600",F900:"Dassault Falcon 900",FA7X:"Dassault Falcon 7X",FA8X:"Dassault Falcon 8X",LJ45:"Learjet 45",E55P:"Embraer Phenom 300",
A400:"Airbus A400M Atlas",C130:"C-130 Hercules",C30J:"C-130J Super Hercules",C17:"Boeing C-17 Globemaster",K35R:"KC-135 Stratotanker",A332MRTT_:"Airbus A330 MRTT",E3TF:"Boeing E-3 AWACS",E3CF:"Boeing E-3 AWACS",B52:"B-52 Stratofortress",C5M:"C-5 Galaxy",
A124:"Antonov An-124 Ruslan",A225:"Antonov An-225 Mrija",AN12:"Antonov An-12",AN26:"Antonov An-26",IL76:"Iljušin Il-76",BLCF:"Boeing Dreamlifter",A3ST:"Airbus Beluga",A337:"Airbus BelugaXL",
F16:"F-16 Fighting Falcon",F35:"F-35 Lightning II",EUFI:"Eurofighter Typhoon",GRIF:"Saab Gripen",L39:"Aero L-39 Albatros",C27J:"Alenia C-27J Spartan",
EC35:"Airbus H135",B429:"Bell 429",EC45:"Airbus H145",EC30:"Airbus H130",EC55:"Airbus H155",AS50:"Airbus H125",A109:"Leonardo AW109",A139:"Leonardo AW139",A169:"Leonardo AW169",B06:"Bell 206",B407:"Bell 407",R44:"Robinson R44",R22:"Robinson R22",UH60:"Black Hawk",H60:"Black Hawk",MI8:"Mil Mi-8/17",MI17:"Mil Mi-17",S92:"Sikorsky S-92"};
const AIRLINES={RYR:"Ryanair",RUK:"Ryanair UK",LDM:"Lauda Europe",MAY:"Malta Air",WZZ:"Wizz Air",WMT:"Wizz Air Malta",WUK:"Wizz Air UK",WAZ:"Wizz Air Abu Dhabi",AUA:"Austrian",DLH:"Lufthansa",EWG:"Eurowings",CFG:"Condor",BAW:"British Airways",EZY:"easyJet",EJU:"easyJet Europe",EZS:"easyJet Switzerland",
AFR:"Air France",KLM:"KLM",TRA:"Transavia",THY:"Turkish Airlines",PGT:"Pegasus",SXS:"SunExpress",UAE:"Emirates",QTR:"Qatar Airways",ETD:"Etihad",FDB:"flydubai",SVA:"Saudia",MSR:"EgyptAir",ELY:"El Al",LOT:"LOT",CSA:"Czech Airlines",TVS:"Smartwings",SWR:"Swiss",ITY:"ITA Airways",
IBE:"Iberia",VLG:"Vueling",SAS:"SAS",FIN:"Finnair",AEE:"Aegean",ROT:"TAROM",BTI:"airBaltic",CTN:"Croatia Airlines",ASL:"Air Serbia",LGL:"Luxair",BEL:"Brussels Airlines",TAP:"TAP Air Portugal",EIN:"Aer Lingus",NOZ:"Norwegian",NSZ:"Norwegian",
TUI:"TUI",TOM:"TUI",TFL:"TUI",ENT:"Enter Air",AIC:"Air India",SIA:"Singapore Airlines",CPA:"Cathay Pacific",CCA:"Air China",CES:"China Eastern",CSN:"China Southern",KAL:"Korean Air",AAL:"American Airlines",UAL:"United",DAL:"Delta",ACA:"Air Canada",
DHK:"DHL",BCS:"DHL",DHX:"DHL",UPS:"UPS",FDX:"FedEx",CLX:"Cargolux",GEC:"Lufthansa Cargo",ABR:"ASL Airlines",CKS:"Kalitta Air",GTI:"Atlas Air",BOX:"AeroLogic (DHL Cargo)",TAY:"ASL Airlines Belgium",ICV:"Cargolux Italia",CAO:"Air China Cargo",CKK:"China Cargo Airlines",MPH:"Martinair Cargo",SWN:"West Atlantic Cargo",NCA:"Nippon Cargo",SWT:"Swiftair",QAC:"Qatar Cargo",SWW:"Silk Way West",NJE:"NetJets",VJT:"VistaJet",OCN:"Discover Airlines",CLH:"Lufthansa CityLine",DLA:"Air Dolomiti",AXE:"AirExplore",JAF:"TUI fly Belgium",CAI:"Corendon Airlines",
RCH:"US Air Force",GAF:"Nemecké letectvo",IAM:"Talianske letectvo",CEF:"České letectvo",PLF:"Poľské letectvo",BAF:"Belgické letectvo",NATO:"NATO",HUF:"Maďarské letectvo",AME:"Španielske letectvo",FAF:"Francúzske letectvo",RRR:"Kráľovské letectvo (RAF)"};
Object.assign(AIRLINES,{MSC:"Air Cairo",MNE:"Air Montenegro",TVQ:"Smartwings Slovakia",TVP:"Smartwings Poland",TVL:"Smartwings Hungary",
RLX:"Go2Sky",ABP:"ABS Jets",ELJ:"Elite Jet",TTJ:"Tatra Jet",ABY:"Air Arabia",FIA:"FlyOne",FIE:"FlyOne Armenia",JBU:"JetBlue",SWA:"Southwest Airlines",
JAL:"Japan Airlines",ANA:"ANA",EVA:"EVA Air",THA:"Thai Airways",HVN:"Vietnam Airlines",MAS:"Malaysia Airlines",QFA:"Qantas",
AAR:"Asiana Airlines",KQA:"Kenya Airways",ETH:"Ethiopian Airlines",RAM:"Royal Air Maroc",RJA:"Royal Jordanian",OMA:"Oman Air",
TKJ:"AJet",FHY:"Freebird Airlines",FHM:"Freebird Airlines Europe",BUC:"European Air Charter",SEH:"SKY express",GWI:"Germanwings",
BEE:"Flybe",ICE:"Icelandair",NAX:"Norwegian",EDW:"Edelweiss Air",ANE:"Air Nostrum",
TJT:"Twin Jet",VOE:"Volotea",AEA:"Air Europa",EXS:"Jet2.com",DAH:"Air Algérie",TAR:"Tunisair",AUI:"Ukraine International Airlines",
KMM:"KM Malta Airlines",UZB:"Uzbekistan Airways"});
const AIRLINE_BRANDS={RUK:"RYR",WMT:"WZZ",WUK:"WZZ",WAZ:"WZZ",EJU:"EZY",EZS:"EZY",NSZ:"NOZ",NAX:"NOZ",
  TOM:"TUI",TFL:"TUI",JAF:"TUI",BCS:"DHK",DHX:"DHK",TVQ:"TVS",TVP:"TVS",TVL:"TVS",FHM:"FHY",QAC:"QTR",FIE:"FIA"};
const airlineBrand=code=>Object.hasOwn(AIRLINE_BRANDS,code)?AIRLINE_BRANDS[code]:code;
const NON_AIRLINE_CODES=new Set(["RCH","GAF","IAM","CEF","PLF","BAF","NATO","HUF","AME","FAF","RRR"]);
/* 🃏 5 stupňov vzácnosti (zhodné so serverom): ● Bežná · ◆ Nezvyčajná · ▲ Vzácna · ⬟ Epická · ♛ Legendárna */
const LEG=new Set(["B779","AN30","DC6","A124","A225","BLCF","A3ST","A337","C5M","B52","U2","AN22","B2","VC25","F35","MD11","A346","IL76"]);
const EPIC=new Set(["A400","C17","K35R","E3TF","E3CF","AN12","L39","F16","GRIF","EUFI","F18","F15","C130","C30J","C27J","RQ4","Q4","P8","R135","C295","CN35","C390","E390","L159","MI24","UH1Y","H47"]);
const RARE=new Set(["A388","B744","B748","B742","A343","B778","GL7T","GLF5","AN26","DC10","L410","AN2","DC3","JU52","Z37","Z37T","Z26","PZ04","H60","MI8","B735","CRJ2","SF34","A338","B762","B3XM","F100","A189","W3","EC25","M28"]);
// legendy, ktoré nad Slovenskom takmer nelietajú – trofejná polička, nerátajú sa do 100 %
const TROPHY=new Set(["B779","A124","BLCF","A3ST","A337","F35"]);
const WIDE=new Set(["A306","A310","A332","A333","A338","A339","A359","A35K","B762","B763","B764","B772","B77W","B77L","B788","B789","B78X","B773"]);
const HELI=new Set(["EC35","EC45","EC30","EC55","AS50","A109","A139","A169","B06","B407","R44","R22","H60","MI8","S92","B429","H160","EC75","EC20","EC25","AS32","AS55","AS65","B412","B212","B505","A119","R66","MI24","NH90","S76","A189","W3","UH1Y","H47"]);
// 🐋 veľké lietadlá pre odznak „Obor“ (aj štvormotorové a legendy, nielen dvojmotorové širokotrupé)
const BIG=new Set([...WIDE,"A388","A343","A345","A346","B742","B744","B748","MD11","B778","B779","BLCF","A3ST","A124","IL76","DC10","A337","B77L","IL96"]);
// nákladné firmy (odznak, výzva, súhrn)
const CARGO_RX=/DHL|UPS|FedEx|Cargo|Kalitta|Atlas|ASL|Cargolux|AeroLogic|West Atlantic|Swiftair|Silk Way/;
// vojenské lety aj podľa volacieho znaku (keď dáta nemajú príznak)
const MIL_CALL=/^(SQF|RCH|GAF|IAM|CEF|PLF|BAF|HUF|AME|FAF|RRR|NATO|ASY|CFC|DAF|NAF|SVF|SUI|HKY|LAGR|CNV|PAT|SAM|SPAR|BRK|DUKE)/;
const isMil=a=>!!(a&&(a.mil||MIL_CALL.test(String(a.call||"").toUpperCase())));
const RAR={c:{n:"Bežná",p:3,col:"#b8c4dc",s:"●"},u:{n:"Nezvyčajná",p:8,col:"#5ee08a",s:"◆"},r:{n:"Vzácna",p:25,col:"#4fa3ff",s:"▲"},e:{n:"Epická",p:45,col:"#b56bff",s:"⬟"},l:{n:"Legendárna",p:80,col:"#ffcf4f",s:"♛"}};
const RORD={c:0,u:1,r:2,e:3,l:4};
const isHeli=a=>a.cat==="A7"||HELI.has(a.type);
// vzácnosť TYPU (kartička má vždy rovnakú, nezávisle od prvého úlovku)
function typeTier(t){
  if(!t)return "c";
  if(LEG.has(t))return "l";if(EPIC.has(t))return "e";if(RARE.has(t))return "r";
  if(WIDE.has(t)||HELI.has(t)||/^(B75|AT4|AT7|DH8|GLF|GL|CL|FA|F9|C68|C700|PC24|LJ|E55|E50|C56|C25|C510|BE20|B350|TBM|P180|C208|PC12|GA[5-8]C|F2TH|B73[234]|A30B|A306|AT72|Z42|SHRK|A169|PC7|F900)/.test(t))return "u";
  return "c";
}
// vzácnosť ÚLOVKU: typ + osobitosti kusu (vojenské, 🇸🇰 OM-, zaujímavé) o stupeň vyššie
function rarity(a){
  let r=typeTier(a.type);if(r==="c"&&isHeli(a))r="u";
  const up=isMil(a)||/^OM-/.test(a.reg||"")||(a.dbf&2);
  if(up&&RORD[r]<3)r=["c","u","r","e","l"][RORD[r]+1];
  return r;
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
  return S.raw.filter(a=>!a.ground&&(S.lastKnown||now-(a.positionAt||S.rawT)<=RADAR_LIVE_AGE)).map(a=>{
    const dt=S.lastKnown?0:Math.max(0,Math.min(15,(now-(a.positionAt||S.rawT))/1000));
    let lat=a.lat,lon=a.lon,alt=a.alt;
    if(a.spd!=null&&a.trk!=null&&dt>0){const m=a.spd/3.6*dt;lat+=m*Math.cos(rad(a.trk))/111320;lon+=m*Math.sin(rad(a.trk))/(111320*Math.cos(rad(lat)))}
    if(alt!=null&&a.vr!=null&&dt>0)alt=Math.max(0,alt+a.vr*FT/60*dt);
    const {d,b}=distBear(S.pos.lat,S.pos.lon,lat,lon);
    const el=alt!=null?elev(d,alt,S.pos.alt):null;
    return {...a,call:a.priv?"":a.call,op:a.priv?"":a.op,sq:a.priv?"":a.sq,type:planeType(a),reg:a.priv?"":a.reg||aircraftMeta(a)?.registration||"",lat,lon,alt,dist:d,bear:b,el};
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
// rovnaké lietadlo pod rôznymi kódmi → jedna kartička (zhodné so serverom T_ALIAS)
const T_ALIAS={AT44:"AT43",AT45:"AT43",AT46:"AT43",E75S:"E75L",CRJX:"CRJ9",MI17:"MI8",MI171:"MI8",UH60:"H60",S70:"H60",C390:"E390",RQ4:"Q4",S22T:"SR22",P28R:"P28A",P28T:"P28A",P28B:"P28A",C150:"C152",CL30:"CL35"};
function normalizeType(value){
  const type=String(value||"").trim().toUpperCase();
  return /^[A-Z0-9]{2,5}$/.test(type)&&!["UNK","UNKN","ZZZZ","NONE","NA","NIL","GLID"].includes(type)
    ?(Object.hasOwn(T_ALIAS,type)?T_ALIAS[type]:type):"";
}
function aircraftMeta(a){
  const ac=!a.priv&&S.meta.get(a.hex)?.ac;
  if(/^[0-9a-f]{6}$/i.test(a.hex)&&String(ac?.mode_s||"").toLowerCase()===a.hex.toLowerCase())return ac;
}
function planeType(a){
  const ac=aircraftMeta(a);
  // GLID označuje ľubovoľný vetroň. BL13 je kód kartičky, keď databáza potvrdí model.
  return normalizeType(a.type)||normalizeType(ac?.icao_type)||(/^L[ -]?13A?\s+BLAN[IÍ]K$/i.test(String(ac?.type||"").trim())?"BL13":"");
}
function normReadsb(j){
  return (j.ac||j.aircraft||[]).filter(a=>a&&/^~?[a-f0-9]{6}$/i.test(a.hex||"")&&
    Number.isFinite(a.lat)&&Math.abs(a.lat)<=90&&Number.isFinite(a.lon)&&Math.abs(a.lon)<=180&&!(a.seen_pos>=60)).map(a=>{
    const priv=!!(a.dbFlags&12);
    const ground=a.alt_baro==="ground";
    const altFt=typeof a.alt_geom==="number"?a.alt_geom:(typeof a.alt_baro==="number"?a.alt_baro:null);
    return {hex:a.hex.toLowerCase(),call:priv?"":String(a.flight||"").trim(),reg:priv?"":a.r||"",type:normalizeType(a.t),desc:"",op:priv?"":a.ownOp||"",cat:a.category||"",mil:!!(a.dbFlags&1),dbf:a.dbFlags|0,priv,emg:/^7[567]00$/.test(a.squawk||"")||!!(a.emergency&&a.emergency!=="none"),fl:typeof a.alt_baro==="number"?Math.round(a.alt_baro/100):null,kt:a.gs!=null?Math.round(a.gs):null,
      seenPos:Math.max(0,Number(a.seen_pos)||0),lat:a.lat,lon:a.lon,alt:ground?0:(altFt!=null?altFt*FT:null),ground,spd:a.gs!=null?a.gs*KT:null,trk:a.track??a.true_heading??null,
      vr:a.baro_rate??a.geom_rate??null,sq:priv?"":a.squawk||""};
  });
}
const RADAR_LIVE_AGE=30e3,RADAR_PREVIEW_AGE=120e3;
const SOURCES=[
  {name:"Čo to letí",url:(la,lo,r)=>`${MYPROXY}/api/planes?lat=${la}&lon=${lo}&r=${Math.min(60,r)}`}
];
// Vlastný sprostredkovací server (Cloudflare Worker) – najspoľahlivejšia cesta
const DEFAULT_PROXY="https://cotoleti-app.radovan-kudela.workers.dev";
const MYPROXY=DEFAULT_PROXY;
// odkazy na zdieľanie idú cez server -> pekný náhľad v Messengeri/WhatsAppe, potom presmerujú do appky
// r= kto zdieľal (anonymné verejné id) -> meriame, ako sa appka šíri
const shareUrl=(kind,data,q="")=>DEFAULT_PROXY+"/s/"+kind+"/"+data+(q?"?"+q:"");
const appLink=()=>shareUrl("x","");
const APP_HOST="slovakiana.github.io/cotoleti-app",TAGS=" #čotoletí #lietadlo #slovensko";
function planeLink(a){
  if(!a||!/^[0-9a-f]{6}$/.test(a.hex))return appLink();
  const rt=routeOf(a);
  return shareUrl("p",a.hex,["c="+encodeURIComponent(a.call||""),rt?"d="+encodeURIComponent(citySk(rt.destination.municipality)):""].filter(Boolean).join("&"));
}
// len vlastný server a priamy prístup – žiadne cudzie proxy, ktoré by videli polohu
const ROUTES=[
  {name:"server",wrap:u=>MYPROXY+"/?url="+encodeURIComponent(u)},
  {name:"priamo",wrap:u=>u}
];
let radarRequest=null;

async function getJSON(url,ms=7000,outer){
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),ms);
  const abort=()=>ctl.abort();
  if(outer){if(outer.aborted)abort();else outer.addEventListener("abort",abort,{once:true})}
  try{
    const res=await fetch(url,{signal:ctl.signal,cache:"no-store"});
    const txt=await res.text();
    let j;try{j=JSON.parse(txt)}catch(e){throw new Error(res.ok?"nie je JSON":"HTTP "+res.status)}
    return {ok:res.ok,status:res.status,j,retry:res.headers.get("Retry-After")};
  }catch(e){throw new Error(e.name==="AbortError"?"timeout":(e.message||"blokované"))}
  finally{clearTimeout(tm);outer?.removeEventListener("abort",abort)}
}

const radarPositionKey=pos=>[pos.lat,pos.lon].map(x=>(Math.round(x*50)/50).toFixed(2)).join("/");
const skyStale=()=>!!S.lastKnown||(S.rawT>0&&Date.now()-S.rawT>RADAR_LIVE_AGE);
const staleSkyLabel=()=>`Posledná známa obloha · pred ${Math.max(0,Math.floor((Date.now()-S.rawT)/1000))} s`;
async function tryCombo(i,query,signal){
  const start=performance.now();
  const {ok,status,j,retry}=await getJSON(SOURCES[i].url(query.la,query.lo,query.radius+2),12000,signal);
  const stale=i===0&&status===503&&j?.state==="stale";
  if(!ok&&!stale)throw Object.assign(Error("HTTP "+status),{status,retry});
  if(!j||!(Array.isArray(j.ac)||Array.isArray(j.aircraft)))throw Error("Zlý formát");
  const t=Number(j.now), at=t<1e12?t*1000:t, age=Date.now()-at;
  if(!(at>0)||age < -5000||age>(stale?RADAR_PREVIEW_AGE:RADAR_LIVE_AGE))throw Error("Staré dáta");
  const list=normReadsb(j).map(a=>({...a,positionAt:at-a.seenPos*1000}));
  return {i,list,age:Math.max(0,age),ms:Math.round(performance.now()-start),via:j.provider||j.src,stale};
}
function gotPlanes(query,{i,list,age,via,stale=false}){
  S.failN=0;S.nextTry=stale?Date.now()+15e3:0;S.loaded=true;S.skyPosition=query.position;
  if(typeof SOC!=="undefined"&&SOC.data&&SOC.data.flags&&SOC.data.flags.hideMil)list=list.filter(a=>!a.mil);
  S.raw=list;S.rawT=Date.now()-age;S.noData=false;err("");S.lastKnown=stale;
  if(!S.ttfp&&typeof ev==="function"){S.ttfp=performance.now();const t=S.ttfp/1000;ev("ttfp_"+(t<1?"1s":t<3?"3s":t<6?"6s":t<12?"12s":"slow"))}
  if(!stale&&(!S.lkT||Date.now()-S.lkT>30e3||!list.length)){
    S.lkT=Date.now();LS.set("ctl_lastSky",{t:S.rawT,p:S.pos?[S.pos.lat,S.pos.lon]:null,raw:list.filter(a=>!a.ground).slice(0,40)});
  }
  const n=list.filter(a=>!a.ground&&(!a.positionAt||Date.now()-a.positionAt<=RADAR_LIVE_AGE)).length;
  S.src=i===0&&via&&via!=="sky"?"Čo to letí · "+via:SOURCES[i].name;
  setStatus(stale?staleSkyLabel():n+" "+pl(n,"lietadlo","lietadlá","lietadiel")+" naživo",!stale);
  tick(!stale);
}
async function fetchPlanes(force){
  if(!S.pos)return;
  const position=radarPositionKey(S.pos),[la,lo]=position.split("/"),radius=+$("radius").value;
  const query={position,la,lo,radius};
  if(radarRequest){
    if(radarRequest.position===position&&radarRequest.radius===radius)return radarRequest.promise;
    radarRequest.controller.abort();
  }
  const moved=S.skyPosition&&S.skyPosition!==position;
  if(moved){S.raw=[];S.rawT=0;S.lastKnown=false;S.pick=null;S.loaded=false;S.lkT=0;tick(false)}
  if(!navigator.onLine){S.lastKnown=!!S.rawT;setStatus(S.lastKnown?staleSkyLabel():"📴 Bez internetu",false);return}
  if(!moved&&S.nextTry&&Date.now()<S.nextTry)return;
  const controller=new AbortController();
  const request={position,radius,controller};
  radarRequest=request;
  request.promise=refreshRadar(request,query).finally(()=>{if(radarRequest===request)radarRequest=null});
  return request.promise;
}
async function refreshRadar(request,query){
  const signal=request.controller.signal;
  if(!S.loaded)setStatus("Pripájam sa…",false);
  try{
    const result=await tryCombo(0,query,signal);
    if(!signal.aborted&&radarRequest===request&&S.pos&&radarPositionKey(S.pos)===query.position)gotPlanes(query,result);
  }catch(e){
    if(signal.aborted||radarRequest!==request)return;
    S.failN=(S.failN||0)+1;
    const retry=Number(e.retry)||0;
    S.nextTry=Date.now()+Math.max(retry*1000,Math.min(60000,10000*S.failN));
    S.lastKnown=!!S.rawT&&Date.now()-S.rawT<=RADAR_PREVIEW_AGE;
    if(!S.lastKnown)S.raw=[];
    setStatus(S.lastKnown?staleSkyLabel():"Živé dáta nedostupné",false);
    err(S.lastKnown?"Živé dáta sa prerušili. Na mávnutie treba čerstvú polohu.":"Dáta o lietadlách sú dočasne nedostupné. Skúšam znova…");
    if(!S.raw.length)$("h-type").textContent="Dáta o lietadlách sú chvíľu nedostupné";
    tick(false);
  }
}

// Identifikátor letu sa posiela zdroju cez herný server.
async function adsbdb(path){
  const url="https://api.adsbdb.com/v0/"+path;
  try{const {j}=await getJSON(ROUTES[0].wrap(url),6000);return j?.response??null}catch(e){return null}
}
function loadMeta(a){
  if(a.priv||!/^[0-9a-f]{6}$/i.test(a.hex))return Promise.resolve();
  const call=String(a.call||"").trim().toUpperCase();
  const previous=S.meta.get(a.hex);
  const changedCall=call&&previous?.call!==undefined&&previous.call!==call;
  if(previous?.pending)return changedCall?previous.pending.then(()=>loadMeta(a)):previous.pending;
  if(previous&&!changedCall&&(!previous.retryAt||Date.now()<previous.retryAt))return Promise.resolve();
  const pending=fetchMeta({...a,call});
  S.meta.set(a.hex,{pending,call,ac:previous?.ac});
  return pending;
}
async function fetchMeta(a){
  const m={ac:S.meta.get(a.hex)?.ac||null,route:null,call:a.call};
  const r1=await adsbdb("aircraft/"+a.hex+(a.call?"?callsign="+encodeURIComponent(a.call):""));
  if(r1&&typeof r1==="object"){
    if(String(r1.aircraft?.mode_s||"").toLowerCase()===a.hex.toLowerCase()){
      m.ac=r1.aircraft;
      S.meta.get(a.hex).ac=m.ac;
    }
    m.route=r1.flightroute||null;
  }
  if(!m.route&&a.call){const r2=await adsbdb("callsign/"+encodeURIComponent(a.call));if(r2&&typeof r2==="object")m.route=r2.flightroute||null}
  if(!r1&&!m.route)m.retryAt=Date.now()+120e3;
  S.meta.set(a.hex,m);
  if(S.meta.size>600){for(const [hex,entry] of S.meta){if(!entry.pending&&hex!==a.hex)S.meta.delete(hex);if(S.meta.size<=400)break}}
  if(S.top?.hex===a.hex){
    const type=planeType(S.top);
    if(type!==S.top.type)S.top={...S.top,type};
    renderHeroStatic(S.top);announce(S.top,true);
  }
}

/* ============ hlášky ============ */
function quip(a,m){
  const h=hash(a.hex),pick=arr=>arr[h%arr.length],V=S.vych;
  if(a.sq==="7700")return "Hlási núdzovú situáciu. Držme palce posádke. 🙏";
  if(isMil(a))return V?"Vojenski let.":"Vojenský let. Lieta tu kvôli bezpečnosti nás všetkých.";
  if(isHeli(a))return pick(["Vrtuľník. Buď záchranka, alebo niekto veľmi bohatý. 🚁","Helikoptéra. Ak je žltá, niekomu práve pomáhajú. ❤️"]);
  const al=airlineOf(a),rt=m&&m.route,d=rt&&rt.destination,o=rt&&rt.origin,dc=d&&d.country_iso_name,oc=o&&o.country_iso_name,city=(d&&(d.municipality||d.name)||"");
  if(dc==="SK")return pick(V?["Ľeci domu. Mamka už vari. 🍲","Ľeci na Slovensko. Vitajce doma!"]:["Letí domov na Slovensko. Mama už varí. 🍲","Návrat domov. Bryndzové halušky už čakajú. 🧀"]);
  if(dc){
    if(dc==="GB")return pick(["Do Londýna. Dážď a čaj s mliekom v cene letenky.","Do Británie. Jazdia vľavo, pozor na to."]);
    if(dc==="TR"||dc==="EG"||dc==="TN")return pick([(typeof KID==="function"&&KID())?"All inclusive, náramok na ruke a bazén od rána. 🏖️":"All inclusive, náramok na ruke, prvý drink o 9:00. 🍹","Dovolenka na pláži, kým ty tu škrabeš námrazu zo skla.","Smer: ležadlo pri bazéne. Uterák už je tam od šiestej."]);
    if(dc==="ES"||dc==="PT")return pick(["Niekto letí za slnkom, kým ty tu mrzneš. ☀️","Do Španielska. Siesta až do večera.","Tapas, more, 25 stupňov. Nezávidíme. (Závidíme.)"]);
    if(dc==="AE"||dc==="QA")return pick(["Do Dubaja. Fotky z hotela budú na IG do hodiny. 🏙️","Púšť, mrakodrapy a klimatizácia na 18 °C."]);
    if(dc==="FR")return /paris/i.test(city)?"Do Paríža. Croissant za 4 €, výhľad na Eiffelovku zadarmo. 🥐":"Do Francúzska. Bonjour a syry, čo cítiť cez tri izby. 🧀";
    if(dc==="US"||dc==="CA")return pick(["Do Ameriky. Osem hodín filmov za sebou. 🍿","Za veľkú mláku. Hamburger tam bude dvakrát väčší."]);
    if(dc==="CZ")return pick([(typeof KID==="function"&&KID())?"Do Česka. Bratia Česi pozdravujú! 👋":"Do Česka. Bratia Česi pozdravujú! 🍺",(typeof KID==="function"&&KID())?"Do Prahy. Trdelník pre všetkých! 🥨":"Do Prahy. Trdelník pre turistov, pivo pre všetkých."]);
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
  if(/DHL|UPS|FedEx|Cargolux|Cargo|Kalitta|Atlas|ASL/.test(al))return pick(["Nákladné. Možno v ňom je tvoj balík z Číny. 📦","Nákladný let. Žiadni pasažieri, len krabice."]);
  if(/Emirates|Qatar|Etihad|Singapore|Cathay/.test(al))return "Vzadu si niekto práve berie teplý uterák. Luxus. ✨";
  if(/NetJets|VistaJet/.test(al)||rarity(a)==="u"&&/^(GLF|GL|CL|FA|C68|C700|PC24|LJ)/.test(a.type||""))return pick(["Súkromný jet. Niekto má lepší deň ako ty. 💸",(typeof KID==="function"&&KID())?"Biznis jet. Váži ako 10 slonov 🐘":"Biznis jet. Šampanské je v cene."]);
  if(a.alt!=null&&a.alt<1500)return pick(["Nízko! Buď pristáva, alebo práve vzlietol. 🛬","Tak nízko, že by si mu skoro zamával."]);
  if(V)return pick(["Tam hore teraz dachto bojuje o opierku na ruku.","Machňi. Možno če uvidzi.","Tam hore je −50 °C. A ty še šťažuješ na zimu?"]);
  return pick(["Tam hore teraz niekto bojuje o opierku na ruku. 💺","Mávni. Možno ťa uvidí cez okno. 👋","Pilot práve hlási: „Vpravo pod nami Slovensko.“","Tam hore je −50 °C. A ty sa sťažuješ na zimu?","Niekto tam práve otvára vrecúško arašidov. 🥜","Tam hore už rozdávajú kávu. Ty si si ju tiež zaslúžiš. ☕"]);
}
const GERLACH=2655;
function altCompare(m){if(m==null)return "výška";if(m<95)return "nižšie ako bratislavské UFO";if(m<GERLACH)return "≈ "+nf(m/330,1)+"× Eiffelovka";return "≈ "+nf(m/GERLACH,1)+"× Gerlach 🏔️"}
function spdCompare(k){if(k==null)return "rýchlosť";if(k<200)return "rýchlo ako auto na diaľnici";return nf(k/130,0)+"× rýchlejšie než auto 🚗"}

/* ============ zbierka ============ */
let COL=LS.get("ctl_col",null)||{hex:{},types:{},pts:0,ach:{},n:0};
// zlúč staré kódy typov do nových (napr. C390 → E390)
try{for(const [o,nw] of Object.entries(T_ALIAS)){const v=COL.types&&COL.types[o];if(!v)continue;const t=COL.types[nw];
  if(t){if(!v.srv)t.n=(t.n|0)+(v.n|0);t.first=Math.min(t.first||Infinity,v.first||Infinity);if(t.first===Infinity)delete t.first;t.shiny=t.shiny||v.shiny;if(v.ver){t.ver=1;if(v.seq&&(!t.seq||v.seq<t.seq))t.seq=v.seq}}else COL.types[nw]=v;
  delete COL.types[o]}}catch(e){}
// iná karta/okno zmenilo zbierku -> načítaj, nech sa navzájom neprepisujú
addEventListener("storage",e=>{if(e.key==="ctl_col"&&e.newValue){try{const v=JSON.parse(e.newValue);for(const k of ["hex","types","pts","ach","n","om","cx","albums","mi","ed","lvlB","lvlFloor","lvlSeen"])if(k in v)COL[k]=v[k];if(S.view==="col"&&typeof renderCol==="function")renderCol();if(S.view==="journal"&&typeof renderJournal==="function")renderJournal()}catch(x){}}});
const ACH=[
  {id:"first",i:"🐣",n:"Prvý úlovok",h:"Zamávaj prvému lietadlu (aspoň 10° nad obzorom)",c:()=>COL.n>=1,pr:()=>[COL.n,1]},
  {id:"ten",i:"🔟",n:"Desiatka",h:"Ulov 10 lietadiel",c:()=>COL.n>=10,pr:()=>[COL.n,10]},
  {id:"fifty",i:"🦅",n:"Spotter",h:"Ulov 50 lietadiel",c:()=>COL.n>=50,pr:()=>[COL.n,50]},
  {id:"hundred",i:"💯",n:"Stovka",h:"Ulov 100 lietadiel",c:()=>COL.n>=100,pr:()=>[COL.n,100]},
  {id:"types10",i:"📚",n:"10 typov",h:"Ulov 10 rôznych typov lietadiel (darované 🤝 sa nerátajú)",c:()=>ownTypes()>=10,pr:()=>[ownTypes(),10]},
  {id:"wide",i:"🐋",n:"Obor",h:"Zamávaj veľkému lietadlu (A330, A350, 777, 787, 747, A380…)",c:e=>e&&BIG.has(e.type)},
  {id:"a380",i:"👑",n:"Kráľ oblohy (A380)",h:"Zamávaj Airbusu A380 (lieta napr. Emirates)",c:e=>e&&e.type==="A388"},
  {id:"jumbo",i:"🐘",n:"Jumbo (747)",h:"Zamávaj Boeingu 747 (často nákladný Cargolux, Atlas…)",c:e=>e&&/^B74/.test(e.type)},
  {id:"mil",i:"🫡",n:"Vojenský let",h:"Zamávaj vojenskému lietadlu",c:e=>e&&isMil(e)},
  {id:"heli",i:"🚁",n:"Vrtuľka",h:"Zamávaj vrtuľníku (aspoň 10° nad obzorom – lietajú nízko, musí byť blízko)",c:e=>e&&isHeli(e)},
  {id:"cargo",i:"📦",n:"Tvoj balík",h:"Zamávaj nákladnému lietadlu (DHL, UPS, FedEx, Cargolux…)",c:e=>e&&CARGO_RX.test(airlineOf(e))},
  {id:"night",i:"🦉",n:"Nočná sova",h:"Zamávaj lietadlu po zotmení",c:e=>e&&typeof SPACE!=="undefined"&&SPACE.sunAlt()<-6},
  {id:"zenith",i:"🎯",n:"Presne nad hlavou",h:"Zamávaj lietadlu vyššie ako 80° – takmer kolmo nad tebou",c:e=>e&&e.el>=80},
  {id:"legend",i:"🌟",n:"Legenda",h:"Ulov Legendárnu kartičku (♛)",c:e=>e&&rarity(e)==="l"},{id:"epic",i:"⬟",n:"Epický úlovok",h:"Ulov Epickú kartičku (⬟) – napr. vojenský transport",c:e=>e&&rarity(e)==="e"},{id:"om5",i:"🇸🇰",n:"Slovenské krídla",h:"Zamávaj 5 slovenským lietadlám (registrácia OM-)",c:()=>Object.keys(COL.om||{}).length>=5,pr:()=>[Object.keys(COL.om||{}).length,5]},{id:"om15",i:"🛩️",n:"Domáca letka (15 × OM-)",h:"Zamávaj 15 slovenským lietadlám (OM-)",pr:()=>[Object.keys(COL.om||{}).length,15],c:()=>Object.keys(COL.om||{}).length>=15},
  {id:"iss",i:"🛰️",n:"ISS na vlastné oči",h:"Keď je tma a ISS preletí nad tebou, maj otvorenú appku",c:()=>false},
  {id:"shazam",i:"👂",n:"Čo to hučí?",h:"Ťukni na 👂 Čo to hučí?, keď počuješ lietadlo",c:()=>false},
  {id:"video",i:"🎬",n:"Režisér oblohy",h:"Natoč video v AR kamere alebo 🎬 pri kartičke",c:()=>false},
  {id:"home",i:"🏠",n:"Domov na Slovensko",h:"Zamávaj lietadlu, ktoré letí na Slovensko",c:e=>{const m=e&&S.meta.get(e.hex);return !!(m&&m.route&&m.route.destination&&m.route.destination.country_iso_name==="SK")}},
];
const LEVELS=["Nováčik","Zvedavec","Mávač lietadlám","Pozorovateľ z okna","Spotter z balkóna","Lovec kondenzačiek","Expert od plota","Kapitán z gauča","Navigátor z lavičky","Pán oblohy","Strážca trate","Legenda z Ivanky","Šerif letových ciest","Majster radaru","Nebeský šaman","Veliteľ oblakov","Tatranský orol","Duch stratosféry","Admirál oblohy","Legenda Slovenska"];
LEVELS.push("Strážca Dunaja","Vietor z Tatier","Pilot Váhu","Navigátor Hrona","Pán Kriváňa","Duch Gerlachu","Hviezdny pútnik","Kapitán Slovenska","Veterán vzduchu","Šampión oblohy","Majster mávania","Orol Malej Fatry","Sokol Slovenského raja","Kráľ Pienin","Dráčik Vysokých Tatier","Patrón letísk","Hviezda Ivanky","Admirál Barca","Kozmický spotter","Mýtus oblohy","Nebeský veľmajster","Oko Karpát","Vládca prúdových vetrov","Hrdina oblohy","Večná legenda","Hviezda letiska","Kniha rekordov","Živá legenda","Obloha sama","Absolútny spotter");
// nová krivka (pomalšia, férovejšia) – nikto pri prechode neklesne (COL.lvlFloor)
const lvlPts=l=>Math.round(12*Math.pow(l,2.5));
// lvlB = body navyše len pre level (z prechodu na novú krivku), aby level po prechode rástol ďalej a nestál na „podlahe“
const lvlOf=p=>{const q=p+((typeof COL!=="undefined"&&COL.lvlB)|0);let l=0;while(lvlPts(l+1)<=q&&l<200)l++;return Math.max(l,(typeof COL!=="undefined"&&COL.lvlFloor)|0)};
const ROM=["II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX"];
// migrácia na vlnu 6: level sa nezníži, vzácnosť kartičiek podľa typu
if(!COL.v6){let o=0;while(Math.round(10*Math.pow(o+1,1.8))<=COL.pts)o++;COL.lvlFloor=o;for(const k in COL.types)COL.types[k].r=typeTier(k);COL.v6=1;LS.set("ctl_col",COL)}
if(COL.lvlFloor&&COL.lvlB==null){COL.lvlB=Math.max(0,lvlPts(COL.lvlFloor)-(COL.pts|0));LS.set("ctl_col",COL)}
const lvlName=l=>l<LEVELS.length?LEVELS[l]:LEVELS[LEVELS.length-1]+" "+ROM[Math.min(ROM.length-1,l-LEVELS.length)];
// ⬆️ nový level z hocijakých bodov (výzva, sada, séria, zlatá posádka…), nielen z úlovku
function lvlWatch(B){const l=lvlOf(COL.pts);if(COL.lvlSeen==null||l<=COL.lvlSeen){if(COL.lvlSeen!==l){COL.lvlSeen=l;LS.set("ctl_col",COL)}return}
  COL.lvlSeen=l;LS.set("ctl_col",COL);const m=["⬆️ Level "+(l+1)+": "+lvlName(l),"Obloha ťa začína poznávať."];if(B)B.items.push(m);else if(typeof toast==="function")toast(m[0],m[1])}
HOOKS.live.push(()=>{if(!(typeof WB!=="undefined"&&WB))lvlWatch()});
const ownTypes=()=>Object.entries(COL.types).filter(([k,v])=>v.n>0&&k!=="?").length;
// Objavy patria ku zbierke, takže sa prenesú spolu s profilom aj po orezaní histórie.
function rememberAlbumCatch(c,albums,fresh=false){
  const unlocked=[];
  const record=(which,code,name="")=>{
    const ledger=which==="al"?albums.airlines:albums.destinations;
    if(Object.hasOwn(ledger,code)||(which==="al"&&Object.keys(ledger).some(key=>airlineBrand(key)===code)))return;
    ledger[code]={t:c.t||0,call:c.call||"",dest:c.dest||"",ap:c.ap||"",...(name?{name}:{}),...(fresh?{fresh:true}:{})};
    if(fresh)unlocked.push({which,code});
  };
  if(/^[A-Z]{3}$/.test(c.al)&&!NON_AIRLINE_CODES.has(c.al)&&(Object.hasOwn(AIRLINES,c.al)||c.an))
    record("al",airlineBrand(c.al),c.an||"");
  const code=String(c.dc||"").trim().toUpperCase();
  if(/^[A-Z]{2}$/.test(code)&&!["ZZ","XX","EU","UN"].includes(code))record("ct",code);
  return unlocked;
}
function catchAirline(a,route){
  if(a.priv||a.mil)return {al:"",an:""};
  const call=String(a.call||"").trim().toUpperCase(),code=call.slice(0,3);
  if(!/^[A-Z]{3}[A-Z0-9]+$/.test(call)||NON_AIRLINE_CODES.has(code))return {al:"",an:""};
  if(Object.hasOwn(AIRLINES,code))return {al:code,an:""};
  const airline=route?.airline;
  const name=String(airline?.name||"").trim().slice(0,100);
  return route?.callsign_icao===call&&airline?.icao===code&&name?{al:code,an:name}:{al:"",an:""};
}
function catchRoute(a){
  const route=a.priv?null:routeOf(a);
  if(route?.callsign_icao&&route.callsign_icao!==String(a.call||"").trim().toUpperCase())return null;
  return route;
}
function journalRouteFields(route){
  return {
    dest:citySk(route?.destination.municipality||route?.destination.name),
    ap:route?.destination.iata_code||"",
    dc:route?.destination.country_iso_name||route?.destination.iso_country||"",
    oc:route?.origin.country_iso_name||route?.origin.iso_country||""
  };
}
async function completeJournalCatch(a,collection,t){
  await loadMeta(a);
  const item=collection.cx?.[a.hex];
  if(COL!==collection||item?.t!==t)return;
  const route=catchRoute(a);
  if(!route)return;
  if(!item.dc)Object.assign(item,journalRouteFields(route));
  if(!item.al){
    Object.assign(item,catchAirline(a,route));
    const type=COL.types[item.ty];
    if(item.al&&type){type.al=type.al||{};type.al[item.al]=(type.al[item.al]||0)+1}
  }
  const added=rememberAlbumCatch(item,collectionAlbums(),true);
  LS.set("ctl_col",COL);
  if(!added.length)return;
  if(S.view==="journal")renderJournal();
  if(typeof WB!=="undefined"&&WB?.hex===a.hex)WB.albums=[...(WB.albums||[]),...added];
  else if(S.view==="now"&&typeof SOC!=="undefined"&&SOC.waveHex===a.hex)journalWaveReward(added,true);
}
function collectionAlbums(){
  if(COL.albums)return COL.albums;
  const albums={airlines:{},destinations:{}};
  for(const card of Object.values(COL.types)){
    if(!card.n)continue;
    if(card.fp)rememberAlbumCatch(card.fp,albums);
    for(const airline of Object.keys(card.al||{}))rememberAlbumCatch({al:airline},albums);
  }
  for(const catchData of Object.values(COL.cx||{}))rememberAlbumCatch(catchData,albums);
  COL.albums=albums;
  LS.set("ctl_col",COL);
  return albums;
}
const UNKNOWN_TYPE_WAVE="Mávnutie uložené · typ lietadla sa nepodarilo určiť.";
const missingTypeCatch=hex=>COL.cx?.[hex]?.ty==="?";
function tryCatch(a){
  const upgrading=!!(a.type&&missingTypeCatch(a.hex));
  if(a.el==null||a.el<10||(COL.hex[a.hex]&&!upgrading))return false;
  const r=rarity(a),ty=a.type||"?",newType=!(COL.types[ty]&&COL.types[ty].n)&&ty!=="?",pts=RAR[r].p*(newType?2:1);
  const at=upgrading?COL.cx[a.hex].t:Date.now();
  if(upgrading){
    const unknown=COL.types["?"];
    if(unknown&&--unknown.n<=0)delete COL.types["?"];
  }else{
    COL.hex[a.hex]=at;COL.n++;COL.pts+=pts;
  }
  COL.types[ty]=COL.types[ty]||{n:0,r:typeTier(ty),name:typeName(a,S.meta.get(a.hex)),first:at};COL.types[ty].n++;
  const v=COL.types[ty];v.r=typeTier(ty);
  // 🧾 pamäť úlovku: kde, kto, kam – pre albumy (aerolinky, krajiny, OM-) a „Prvá: nad Petržalkou“
  try{const rt=catchRoute(a);COL.cx=COL.cx||{};
    const c=upgrading?{...COL.cx[a.hex],ty}:{t:at,ty,...catchAirline(a,rt),call:a.priv?"":String(a.call||"").slice(0,10),...journalRouteFields(rt),reg:a.priv?"":(a.reg||""),town:S.pos&&typeof townOf==="function"?townOf(S.pos):"",alt:a.alt!=null?Math.round(a.alt):null,el:Math.round(a.el),spd:a.spd!=null?Math.round(a.spd):null,mil:a.mil?1:0};
    const discoveries=rememberAlbumCatch(c,collectionAlbums(),!upgrading);
    if(typeof WB!=="undefined"&&WB)WB.albums=discoveries;
    COL.cx[a.hex]=c;if(!v.fp)v.fp=c;
    if(!upgrading&&!a.priv&&a.call&&!rt)completeJournalCatch(a,COL,at).catch(()=>{});
    // 🧹 pamäť: veľmi stará história úlovkov (> 20 000) sa skráti, zbierka a kartičky ostávajú
    {const ks=Object.keys(COL.hex);if(ks.length>20000){const old=Date.now()-365*864e5;for(const k of ks)if(COL.hex[k]<old){delete COL.hex[k];if(COL.cx)delete COL.cx[k]}}}
    if(c.al){v.al=v.al||{};v.al[c.al]=(v.al[c.al]||0)+1}
    if(/^OM-/.test(c.reg)){COL.om=COL.om||{};COL.om[c.reg]=COL.om[c.reg]||Date.now()}
    const ks=Object.keys(COL.cx);if(ks.length>4000)ks.sort((x,y)=>COL.cx[x].t-COL.cx[y].t).slice(0,ks.length-4000).forEach(k=>delete COL.cx[k]);
  }catch(e){}
  const prevLvl=lvlOf(COL.pts-(upgrading?0:pts));
  const newAch=ACH.filter(x=>{if(COL.ach[x.id])return false;try{return !!x.c(a)}catch(e){return false}});newAch.forEach(x=>COL.ach[x.id]=Date.now());
  LS.set("ctl_col",COL);
  let T=t("caught")+" +"+pts+" "+(pts===1?"bod":pts<5?"body":"bodov"),Sub=titleOf(a)+" · "+typeName(a,S.meta.get(a.hex));
  if(newType)Sub+=" · nový typ!";
  if(newAch.length){T="🏅 "+(newAch.length>1?newAch.length+" nové odznaky":"Odznak: "+newAch[0].n);Sub=(newAch.length>1?newAch.map(x=>x.n).join(", ")+" · ":"")+"+"+pts+" b · "+titleOf(a)}
  // nový level neprekryje odznak – ukáže sa ako ďalšie oznámenie
  if(lvlOf(COL.pts)>prevLvl){COL.lvlSeen=lvlOf(COL.pts);if(newAch.length){if(!(typeof WB!=="undefined"&&WB))setTimeout(()=>toast("⬆️ Nový level: "+lvlName(lvlOf(COL.pts)),"Obloha ťa začína poznávať."),100)}else{T="⬆️ Nový level: "+lvlName(lvlOf(COL.pts));Sub="Obloha ťa začína poznávať."}}
  if(typeof WB!=="undefined"&&WB){WB.caught={type:ty,name:COL.types[ty].name||ty,title:titleOf(a),r,newType};newAch.forEach(x=>WB.items.push(["🏅 "+x.n]));if(lvlOf(COL.pts)>prevLvl){WB.items.push(["⬆️ Level "+(lvlOf(COL.pts)+1)+": "+lvlName(lvlOf(COL.pts))]);COL.lvlSeen=lvlOf(COL.pts)}}
  else if(upgrading)toast("Doplnená kartička",COL.types[ty].name,RAR[r].col);
  else toast(T,Sub,RAR[r].col);
  if(r!=="c"||newAch.length||newType)confetti(r==="l"?120:r==="e"?80:40);
  ping(r);
  HOOKS.caught.forEach(f=>{try{f(a,r,{upgrading,at})}catch(e){console.error(e)}});
  if(S.view==="col")renderCol();
  if(S.view==="journal")renderJournal();
}
// odznaky podľa stavu zbierky (bez lietadla) – pri štarte, po synchronizácii a po prenose
function checkAch(){for(const x of ACH){if(COL.ach[x.id]||x.c.length>0)continue;try{if(x.c())grantAch(x.id)}catch(e){}}}
function grantAch(id){if(COL.ach[id])return;const x=ACH.find(q=>q.id===id);if(!x)return;COL.ach[id]=Date.now();LS.set("ctl_col",COL);
  // tesne po úvode nech odznak neprekryje prvý pohľad na oblohu
  const wait=Math.max(0,20000-(Date.now()-LS.get("ctl_onbT",0)));setTimeout(()=>{toast("🏅 Nový odznak: "+x.n,"Nájdeš ho v Zbierke → Odznaky.","#ffcf4f");confetti(50);ping("r")},wait);if(S.view==="col")renderCol()}


/* odkazy od kamarátov (výzva, súboj) počkajú, kým človek prejde úvodom */
const ONB_Q=[];function afterOnb(f){if(!ONB_Q.includes(f))ONB_Q.push(f)}
function onbDone(){LS.set("ctl_onbT",Date.now());setTimeout(()=>{while(ONB_Q.length){try{ONB_Q.shift()()}catch(e){}}},2500)}
