"use strict";
/* ============ základy ============ */
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const FT=0.3048,KT=1.852,R=6371000,rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
const wrap180=a=>((a%360)+540)%360-180;
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
const TYPES={A319:"Airbus A319",A320:"Airbus A320",A20N:"Airbus A320neo",A321:"Airbus A321",A21N:"Airbus A321neo",A318:"Airbus A318",
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
DHK:"DHL",BCS:"DHL",DHX:"DHL",UPS:"UPS",FDX:"FedEx",CLX:"Cargolux",GEC:"Lufthansa Cargo",ABR:"ASL Airlines",CKS:"Kalitta Air",GTI:"Atlas Air",NJE:"NetJets",VJT:"VistaJet",
RCH:"US Air Force",GAF:"Nemecké letectvo",IAM:"Talianske letectvo",CEF:"České letectvo",PLF:"Poľské letectvo",BAF:"Belgické letectvo",NATO:"NATO",HUF:"Maďarské letectvo",AME:"Španielske letectvo",FAF:"Francúzske letectvo",RRR:"Kráľovské letectvo (RAF)"};
const LEG=new Set(["A124","A225","BLCF","A3ST","A337","C5M","B52","U2","AN22","B2","VC25","F35","F16","EUFI","GRIF","F18","F15"]);
const RARE=new Set(["E3TF","E3CF","GLF5","Q4","RQ4","B748","B744","B742","A400","C17","C130","C30J","K35R","IL76","AN12","AN26","MD11","DC10","A346","A343","L39","C27J","SU95","GL7T","B779","B778","A388"]);
const WIDE=new Set(["A306","A310","A332","A333","A338","A339","A359","A35K","B762","B763","B764","B772","B77W","B77L","B788","B789","B78X","B753_","B752_"]);
const HELI=new Set(["EC35","EC45","EC30","EC55","AS50","A109","A139","A169","B06","B407","R44","R22","H60","MI8","S92","B429"]);
const RAR={c:{n:"Bežné",p:2,col:"#97a3c7"},u:{n:"Nezvyčajné",p:5,col:"#4fc3ff"},r:{n:"Vzácne",p:15,col:"#c77dff"},l:{n:"Legendárne",p:40,col:"#ffcf4f"}};
const isHeli=a=>a.cat==="A7"||HELI.has(a.type);
function rarity(a){
  if(LEG.has(a.type))return "l";
  if(a.mil||RARE.has(a.type))return "r";
  if(WIDE.has(a.type)||/^B75/.test(a.type||"")||isHeli(a)||(a.type&&/^(GLF|GL|CL|FA|F9|C68|C700|PC24|LJ)/.test(a.type)))return "u";
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
    return {hex:a.hex,call:(a.flight||"").trim(),reg:a.r||"",type:a.t||"",desc:"",op:a.ownOp||"",cat:a.category||"",mil:!!(a.dbFlags&1),priv:!!(a.dbFlags&12),emg:/^7[567]00$/.test(a.squawk||"")||!!(a.emergency&&a.emergency!=="none"),fl:typeof a.alt_baro==="number"?Math.round(a.alt_baro/100):null,kt:a.gs!=null?Math.round(a.gs):null,
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
const DEFAULT_PROXY="https://cotoleti-app.radovan-kudela.workers.dev";
const MYPROXY=DEFAULT_PROXY;
// odkazy na zdieľanie idú cez server -> pekný náhľad v Messengeri/WhatsAppe, potom presmerujú do appky
// r= kto zdieľal (anonymné verejné id) -> meriame, ako sa appka šíri
const withRef=q=>[q,typeof PID!=="undefined"&&PID?"r="+PID:""].filter(Boolean).join("&");
const shareUrl=(kind,data,q)=>{const w=withRef(q);return DEFAULT_PROXY+"/s/"+kind+"/"+data+(w?"?"+w:"")};
const appLink=()=>shareUrl("x","");
const APP_HOST="slovakiana.github.io/cotoleti-app",TAGS=" #čotoletí #lietadlo #slovensko";
function planeLink(a){
  if(!a||!/^[0-9a-f]{6}$/.test(a.hex))return appLink();
  const rt=routeOf(a),town=typeof townOf==="function"&&S.pos?townOf(S.pos):"";
  return shareUrl("p",a.hex,["c="+encodeURIComponent(a.call||""),rt?"d="+encodeURIComponent(citySk(rt.destination.municipality)):"",town?"m="+encodeURIComponent(town):""].filter(Boolean).join("&"));
}
// len vlastný server a priamy prístup – žiadne cudzie proxy, ktoré by videli polohu
const ROUTES=[
  {name:"server",wrap:u=>MYPROXY+"/?url="+encodeURIComponent(u)},
  {name:"priamo",wrap:u=>u}
];
const COMBOS=[];ROUTES.forEach(rt=>SOURCES.forEach(s=>COMBOS.push({s,rt})));
let comboIdx=0,busy=false;

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
  const {ok,status,j}=await getJSON(c.rt.wrap(c.s.url((Math.round(S.pos.lat*4)/4).toFixed(2),(Math.round(S.pos.lon*4)/4).toFixed(2),r+10)),9000,signal);
  if(!ok)throw new Error("HTTP "+status);
  if(!j.ac&&!j.aircraft&&!("states" in j))throw new Error("zlý formát");
  return {i,list:c.s.parse(j)};
}
function gotPlanes(i,list){S.failN=0;S.nextTry=0;
  if(typeof SOC!=="undefined"&&SOC.data&&SOC.data.flags&&SOC.data.flags.hideMil)list=list.filter(a=>!a.mil);
  S.raw=list;S.rawT=Date.now();comboIdx=i;LS.set("ctl_combo",i);err("");
  const c=COMBOS[i];
  {const n=S.raw.filter(a=>!a.ground).length;setStatus(n+" "+(n===1?"lietadlo":n>=2&&n<=4?"lietadlá":"lietadiel")+" naživo",true);S.src=c.s.name+(c.rt.name!=="priamo"?" cez "+c.rt.name:"")}
  tick(true);
}
async function fetchPlanes(force){
  if(!S.pos||busy)return;
  if(!force&&S.nextTry&&Date.now()<S.nextTry)return;
  busy=true;
  const r=+$("radius").value;
  try{
    // 1) naposledy fungujúca cesta
    if(comboIdx>=0){try{const x=await tryCombo(comboIdx,r);gotPlanes(x.i,x.list);return}catch(e){}}
    // 2) všetky cesty naraz – vyhráva prvá, ktorá odpovie
    if(!S.raw.length)setStatus("Pripájam sa…",false);
    const ctl=new AbortController(),fails=[];
    try{
      const x=await Promise.any(COMBOS.map((_,i)=>new Promise(res=>setTimeout(res,i*1500)).then(()=>{if(ctl.signal.aborted)throw new Error("stop");return tryCombo(i,r,ctl.signal)}).catch(e=>{fails.push(COMBOS[i].s.name+"/"+COMBOS[i].rt.name+": "+e.message);throw e})));
      ctl.abort();gotPlanes(x.i,x.list);
    }catch(e){
      setStatus("Bez spojenia",false);
      S.failN=(S.failN||0)+1;S.nextTry=Date.now()+Math.min(60000,10000*S.failN);
      err("Dáta o lietadlách sú dočasne nedostupné, skúšam znova…");console.warn("fetchPlanes",fails);
      if(!S.raw.length)$("h-type").textContent="Polohu máme ✓ Lietadlá sa ešte načítavajú…";
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
  if(a.mil)return V?"Vojenski let.":"Vojenský let. Lieta tu kvôli bezpečnosti nás všetkých.";
  if(isHeli(a))return pick(["Vrtuľník. Buď záchranka, alebo niekto veľmi bohatý. 🚁","Helikoptéra. Ak je žltá, niekomu práve pomáhajú. ❤️"]);
  const al=airlineOf(a),rt=m&&m.route,d=rt&&rt.destination,o=rt&&rt.origin,dc=d&&d.country_iso_name,oc=o&&o.country_iso_name,city=(d&&(d.municipality||d.name)||"");
  if(dc==="SK")return pick(V?["Ľeci domu. Mamka už vari. 🍲","Ľeci na Slovensko. Vitajce doma!"]:["Letí domov na Slovensko. Mama už varí. 🍲","Návrat domov. Bryndzové halušky už čakajú. 🧀"]);
  if(dc){
    if(dc==="GB")return pick(["Do Londýna. Dážď a čaj s mliekom v cene letenky.","Do Británie. Jazdia vľavo, pozor na to."]);
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
// iná karta/okno zmenilo zbierku -> načítaj, nech sa navzájom neprepisujú
addEventListener("storage",e=>{if(e.key==="ctl_col"&&e.newValue){try{const v=JSON.parse(e.newValue);for(const k of ["hex","types","pts","ach","n"])if(k in v)COL[k]=v[k];if(S.view==="col"&&typeof renderCol==="function")renderCol()}catch(x){}}});
const ACH=[
  {id:"first",i:"🐣",n:"Prvý úlovok",c:()=>COL.n>=1},
  {id:"ten",i:"🔟",n:"Desiatka",c:()=>COL.n>=10},
  {id:"fifty",i:"🦅",n:"Spotter",c:()=>COL.n>=50},
  {id:"hundred",i:"💯",n:"Stovka",c:()=>COL.n>=100},
  {id:"types10",i:"📚",n:"10 typov",c:()=>Object.keys(COL.types).length>=10},
  {id:"wide",i:"🐋",n:"Obor",c:e=>e&&WIDE.has(e.type)},
  {id:"a380",i:"👑",n:"Kráľ oblohy (A380)",c:e=>e&&e.type==="A388"},
  {id:"jumbo",i:"🐘",n:"Jumbo (747)",c:e=>e&&/^B74/.test(e.type)},
  {id:"mil",i:"🫡",n:"Vojenský let",c:e=>e&&e.mil},
  {id:"heli",i:"🚁",n:"Vrtuľka",c:e=>e&&isHeli(e)},
  {id:"cargo",i:"📦",n:"Tvoj balík",c:e=>e&&/DHL|UPS|FedEx|Cargo/.test(airlineOf(e))},
  {id:"night",i:"🦉",n:"Nočná sova",c:e=>e&&typeof SPACE!=="undefined"&&SPACE.sunAlt()<-6},
  {id:"zenith",i:"🎯",n:"Presne nad hlavou",c:e=>e&&e.el>=80},
  {id:"legend",i:"🌟",n:"Legenda",c:e=>e&&rarity(e)==="l"},
  {id:"iss",i:"🛰️",n:"ISS na vlastné oči",c:()=>false},
  {id:"shazam",i:"👂",n:"Shazam na lietadlo",c:()=>false},
  {id:"video",i:"🎬",n:"Režisér oblohy",c:()=>false},
  {id:"home",i:"🏠",n:"Domov na Slovensko",c:e=>{const m=e&&S.meta.get(e.hex);return !!(m&&m.route&&m.route.destination&&m.route.destination.country_iso_name==="SK")}},
];
const LEVELS=["Nováčik","Zvedavec","Mávač lietadlám","Pozorovateľ z okna","Spotter z balkóna","Lovec kondenzačiek","Expert od plota","Kapitán z gauča","Navigátor z lavičky","Pán oblohy","Strážca trate","Legenda z Ivanky","Šerif letových ciest","Majster radaru","Nebeský šaman","Veliteľ oblakov","Tatranský orol","Duch stratosféry","Admirál oblohy","Legenda Slovenska"];
const lvlPts=l=>Math.round(10*Math.pow(l,1.8));
const lvlOf=p=>{let l=0;while(lvlPts(l+1)<=p)l++;return l};
const ROM=["II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const lvlName=l=>l<LEVELS.length?LEVELS[l]:LEVELS[LEVELS.length-1]+" "+ROM[Math.min(ROM.length-1,l-LEVELS.length)];
function tryCatch(a){
  if(a.el==null||a.el<10||COL.hex[a.hex])return false;
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
  if(lvlOf(COL.pts)>prevLvl){T="⬆️ Nový level: "+lvlName(lvlOf(COL.pts));Sub="Obloha ťa začína poznávať."}
  toast(T,Sub,RAR[r].col);
  if(r!=="c"||newAch.length||newType)confetti(r==="l"?80:40);
  ping(r);
  HOOKS.caught.forEach(f=>{try{f(a,r)}catch(e){console.error(e)}});
  if(S.view==="col")renderCol();
}
function grantAch(id){if(COL.ach[id])return;const x=ACH.find(q=>q.id===id);if(!x)return;COL.ach[id]=Date.now();LS.set("ctl_col",COL);toast("🏅 Nový odznak: "+x.n,"Máš ho v zbierke. Ktorý bude ďalší?","#ffcf4f");confetti(50);ping("r");if(S.view==="col")renderCol()}

