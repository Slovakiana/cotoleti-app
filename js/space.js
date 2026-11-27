"use strict";
/* ============ Vesmír: ISS, Tiangong, Starlink a jasné satelity ============ */
const SPACE=(()=>{
  const st={sats:[],now:[],nowT:0,loading:false,seenIss:false,tleAt:0};
  const D2R=Math.PI/180,R2D=180/Math.PI,RE=6371;

  function loadLib(){
    if(window.satellite)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");script.src="lib/satellite.min.js";
      script.onload=()=>window.satellite?resolve():reject(Error("výpočtová knižnica sa nenačítala"));
      script.onerror=()=>{script.remove();reject(Error("výpočtová knižnica sa nenačítala"))};
      document.head.appendChild(script);
    });
  }
  async function getText(url){
    for(const rt of ROUTES){
      const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),12000);
      try{const r=await fetch(rt.wrap(url),{signal:ctl.signal});const tx=await r.text();if(r.ok&&/\n1 \d/.test(tx))return tx}catch(e){}
      finally{clearTimeout(tm)}
    }
    throw new Error("dráhy satelitov sa nepodarilo stiahnuť");
  }
  async function loadTLE(){
    let c=LS.get("ctl_tle",null);
    if(c&&Date.now()-c.t<12*3600e3&&c.stations)return c;
    const base="https://celestrak.org/NORAD/elements/gp.php?FORMAT=tle&GROUP=";
    const [stations,visual,recent]=await Promise.all([getText(base+"stations"),getText(base+"visual").catch(()=>""),getText(base+"last-30-days").catch(()=>"")]);
    c={t:Date.now(),stations,visual,recent:recent.split(/\r?\n/).reduce((acc,l,i,arr)=>{if(/STARLINK/i.test(l)&&arr[i+1]&&arr[i+2])acc.push(l,arr[i+1],arr[i+2]);return acc},[]).join("\n")};
    LS.set("ctl_tle",c);return c;
  }
  function parse(txt,kindFn){
    const out=[],L=String(txt||"").split(/\r?\n/).map(s=>s.trimEnd());
    for(let i=0;i+2<L.length;i++){
      if(L[i+1].startsWith("1 ")&&L[i+2].startsWith("2 ")){
        const name=L[i].trim(),kind=kindFn(name);
        if(kind){try{out.push({name,kind,id:L[i+1].slice(2,7).trim(),rec:satellite.twoline2satrec(L[i+1],L[i+2])})}catch(e){}}
        i+=2;
      }
    }
    return out;
  }
  const SHORT={iss:"ISS 🛰️",css:"Tiangong 🛰️"};
  async function init(){
    if(st.loading||st.sats.length&&Date.now()-st.tleAt<12*3600e3)return;
    st.loading=true;
    try{
      await loadLib();
      const c=await loadTLE();
      const next=[],seen=new Set(),add=a=>a.forEach(s=>{if(!seen.has(s.id)){seen.add(s.id);next.push(s)}});
      add(parse(c.stations,n=>/^ISS \(ZARYA\)/.test(n)?"iss":/^CSS \(TIANHE\)/.test(n)?"css":null));
      add(parse(c.recent,()=>"starlink"));
      add(parse(c.visual,n=>/STARLINK/i.test(n)?"starlink":/ISS \(ZARYA\)/.test(n)?null:"sat"));
      next.forEach(s=>s.short=SHORT[s.kind]||s.name.replace(/\s*\(.*?\)\s*/g," ").trim().slice(0,22));
      if(next.length){st.sats=next;st.tleAt=c.t;st.nowT=0}
    }catch(e){}finally{st.loading=false}
  }

  /* --- slnko --- */
  function sunVec(t){
    const n=t/86400000+2440587.5-2451545.0;
    const L=(280.46+0.9856474*n)%360,g=(357.528+0.9856003*n)%360*D2R;
    const lam=(L+1.915*Math.sin(g)+0.02*Math.sin(2*g))*D2R,eps=(23.439-0.0000004*n)*D2R;
    return {x:Math.cos(lam),y:Math.cos(eps)*Math.sin(lam),z:Math.sin(eps)*Math.sin(lam),
      ra:Math.atan2(Math.cos(eps)*Math.sin(lam),Math.cos(lam)),dec:Math.asin(Math.sin(eps)*Math.sin(lam)),n};
  }
  function sunAlt(t=Date.now()){
    if(!S.pos)return 0;
    const s=sunVec(t),gmst=((280.46061837+360.98564736629*s.n)%360)*D2R;
    const H=gmst+S.pos.lon*D2R-s.ra,phi=S.pos.lat*D2R;
    return Math.asin(Math.sin(phi)*Math.sin(s.dec)+Math.cos(phi)*Math.cos(s.dec)*Math.cos(H))*R2D;
  }
  function sunlit(eci,t){
    const s=sunVec(t),p=eci.x*s.x+eci.y*s.y+eci.z*s.z;
    if(p>0)return true;
    const r2=eci.x*eci.x+eci.y*eci.y+eci.z*eci.z;
    return Math.sqrt(Math.max(0,r2-p*p))>RE;
  }
  function look(sat,date){
    const pv=satellite.propagate(sat.rec,date);
    if(!pv||!pv.position||typeof pv.position!=="object")return null;
    const gmst=satellite.gstime(date),ecf=satellite.eciToEcf(pv.position,gmst);
    const la=satellite.ecfToLookAngles({longitude:S.pos.lon*D2R,latitude:S.pos.lat*D2R,height:(S.pos.alt||0)/1000},ecf);
    return {az:(la.azimuth*R2D+360)%360,el:la.elevation*R2D,range:la.rangeSat,eci:pv.position};
  }

  /* --- čo je práve nad obzorom --- */
  function visibleNow(){
    if(!S.pos||!st.sats.length||!window.satellite)return [];
    const t=Date.now();
    if(t-st.nowT<1000)return st.now;
    st.nowT=t;const date=new Date(t),dark=sunAlt(t)<-6,out=[];
    for(const s of st.sats){
      const l=look(s,date);if(!l||l.el<0)continue;
      const lit=sunlit(l.eci,t);
      // menšie satelity ukazuj len keď sú naozaj viditeľné (tma u teba + slnko na satelite)
      if(s.kind!=="iss"&&s.kind!=="css"&&!(lit&&dark))continue;
      out.push({...s,az:l.az,el:l.el,range:l.range,sunlit:lit&&dark,lit});
    }
    st.now=out.sort((a,b)=>b.el-a.el);
    // odznak ISS
    const iss=out.find(s=>s.kind==="iss"&&s.sunlit&&s.el>=10);
    if(iss&&!st.seenIss){st.seenIss=true;grantAch("iss");if(window.dailyEvent)dailyEvent("iss")}
    return st.now;
  }

  function radar(){
    return visibleNow().map(s=>{const r=(90-s.el)/90*100,x=r*Math.sin(s.az*D2R),y=-r*Math.cos(s.az*D2R),big=s.kind==="iss"||s.kind==="css";
      const c=big?"#ffcf4f":s.kind==="starlink"?"#c77dff":"#fff";
      return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})" opacity="${s.sunlit||big?1:.5}"><text text-anchor="middle" y="3" font-size="${big?10:6}" fill="${c}">★</text>${big?`<text x="7" y="3" font-size="7" font-weight="700" fill="${c}">${s.kind==="iss"?"ISS":"Tiangong"}</text>`:""}</g>`}).join("");
  }

  HOOKS.radar.push(radar);
  HOOKS.fresh.push(()=>{if(!st.sats.length&&!st.loading)init()});
  return {init,sunAlt,visibleNow};
})();
