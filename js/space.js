"use strict";
/* ============ Vesmír: ISS, Tiangong, Starlink a jasné satelity ============ */
const SPACE=(()=>{
  const st={sats:[],passes:[],passT:0,passPos:null,now:[],nowT:0,loading:false,err:"",notified:new Set(),seenIss:false};
  const D2R=Math.PI/180,R2D=180/Math.PI,RE=6371;

  function loadLib(){
    return new Promise((res,rej)=>{
      if(window.satellite)return res();
      const urls=["https://cdn.jsdelivr.net/npm/satellite.js@4.1.4/dist/satellite.min.js","https://unpkg.com/satellite.js@4.1.4/dist/satellite.min.js","https://cdnjs.cloudflare.com/ajax/libs/satellite.js/4.1.4/satellite.min.js"];
      let i=0;const next=()=>{if(i>=urls.length)return rej(new Error("nepodarilo sa načítať výpočtovú knižnicu"));
        const sc=document.createElement("script");sc.src=urls[i++];sc.onload=()=>window.satellite?res():next();sc.onerror=next;document.head.appendChild(sc)};
      next();
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
  const LONG={iss:"Medzinárodná vesmírna stanica (ISS)",css:"Čínska stanica Tiangong"};
  async function init(){
    if(st.loading||st.sats.length)return;
    st.loading=true;st.err="";render();
    try{
      await loadLib();
      const c=await loadTLE();
      const seen=new Set(),add=a=>a.forEach(s=>{if(!seen.has(s.id)){seen.add(s.id);st.sats.push(s)}});
      add(parse(c.stations,n=>/^ISS \(ZARYA\)/.test(n)?"iss":/^CSS \(TIANHE\)/.test(n)?"css":null));
      add(parse(c.recent,()=>"starlink"));
      add(parse(c.visual,n=>/STARLINK/i.test(n)?"starlink":/ISS \(ZARYA\)/.test(n)?null:"sat"));
      st.sats.forEach(s=>s.short=SHORT[s.kind]||s.name.replace(/\s*\(.*?\)\s*/g," ").trim().slice(0,22));
    }catch(e){st.err=e.message}
    st.loading=false;computePasses(true);render();
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

  /* --- predpoveď preletov ISS a Tiangong --- */
  function computePasses(force){
    if(!S.pos||!window.satellite||!st.sats.length)return;
    const moved=!st.passPos||Math.abs(st.passPos.lat-S.pos.lat)>.2||Math.abs(st.passPos.lon-S.pos.lon)>.2;
    if(!force&&!moved&&Date.now()-st.passT<10*60e3)return;
    st.passT=Date.now();st.passPos={...S.pos};
    const res=[],t0=Date.now()-5*60e3,step=20e3,end=t0+36*3600e3;
    for(const s of st.sats.filter(x=>x.kind==="iss"||x.kind==="css")){
      let cur=null;
      for(let t=t0;t<end;t+=step){
        const l=look(s,new Date(t));if(!l)continue;
        if(l.el>=10){
          const vis=sunlit(l.eci,t)&&sunAlt(t)<-6;
          if(!cur)cur={sat:s,start:t,azStart:l.az,max:l.el,maxT:t,azMax:l.az,vis:false,visStart:null};
          if(l.el>cur.max){cur.max=l.el;cur.maxT=t;cur.azMax=l.az}
          if(vis){cur.vis=true;if(cur.visStart==null)cur.visStart=t}
          cur.end=t;cur.azEnd=l.az;
        }else if(cur){res.push(cur);cur=null}
      }
      if(cur)res.push(cur);
    }
    st.passes=res.filter(p=>p.end>Date.now()).sort((a,b)=>a.start-b.start);
  }

  const fmtT=t=>{const d=new Date(t),today=new Date().toDateString()===d.toDateString(),tm=new Date(Date.now()+86400e3).toDateString()===d.toDateString();
    return (today?"dnes":tm?"zajtra":d.toLocaleDateString("sk-SK",{weekday:"short",day:"numeric",month:"numeric"}))+" o "+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})};
  const dur=ms=>{const m=Math.floor(ms/60000),s=Math.round(ms%60000/1000);return m?m+" min "+(s?s+" s":""):s+" s"};
  const cnt=ms=>{if(ms<=0)return "teraz!";const h=Math.floor(ms/3600e3),m=Math.floor(ms%3600e3/60e3),s=Math.floor(ms%60e3/1000);return h?h+" h "+m+" min":m?m+" min "+String(s).padStart(2,"0")+" s":s+" s"};

  function nextVisible(){return st.passes.find(p=>p.vis&&p.end>Date.now())}

  function render(){
    const sa=sunAlt();
    $("sp-sun").textContent=sa>0?"☀️ deň":sa>-6?"🌆 súmrak":"🌙 tma";
    if(st.err){$("sp-err").textContent="Vesmírne dáta sa nenačítali: "+st.err+". Skúsim znova neskôr.";}else $("sp-err").textContent="";
    if(st.loading||!st.sats.length){if($("sp-remind"))$("sp-remind").hidden=true;$("sp-name").textContent=st.err?"Zatiaľ bez dát":"Počítam dráhy…";return}
    const p=nextVisible(),now=Date.now();
    window.SPACE_NEXT=p?{t:p.visStart||p.start,kind:p.sat.kind,dir:dirL(p.azMax),max:Math.round(p.max)}:null;if($("sp-remind"))$("sp-remind").hidden=!p||p.start-now<6*60e3||!SOC.api||(typeof KID==="function"&&KID());
    if(p){
      const live=now>=p.start&&now<=p.end;
      $("sp-name").textContent=(live?"🔴 PRÁVE TERAZ: ":"")+LONG[p.sat.kind];
      $("sp-when").textContent=fmtT(p.start)+" · "+(p.max>=60?"skoro priamo nad hlavou":"na "+dirL(p.azMax)+" oblohe");
      $("sp-count").style.display="";$("sp-count").innerHTML=live?"✨ <b>Pozri hore!</b> Je na "+dirL(p.azMax):"⏱ O <b>"+cnt(p.start-now)+"</b>";
      $("sp-grid").style.display="";$("sp-max").textContent=nf(p.max)+"°";$("sp-dur").textContent=dur(p.end-p.start);
      $("sp-from").textContent=dirS(p.azStart);$("sp-to").textContent=dirS(p.azEnd);
      $("sp-tip").textContent=p.sat.kind==="iss"?"Hľadaj veľmi jasnú „hviezdu“, ktorá sa rovnomerne pohybuje a nebliká. Žije v nej 7 ľudí a letí rýchlosťou 28 000 km/h. 🚀":"Čínska stanica je slabšia ako ISS, ale za tmy ju uvidíš voľným okom. ✨";
    }else{
      $("sp-name").textContent="Najbližších 36 h nič voľným okom";
      $("sp-when").textContent="ISS preletí, ale cez deň alebo v tieni Zeme. Keď bude vidieť, nájdeš to tu.";
      $("sp-count").style.display="none";$("sp-grid").style.display="none";$("sp-tip").textContent="";
    }
    // zoznam preletov
    $("sp-passes").innerHTML=st.passes.slice(0,10).map(q=>`<div class="pass"><div><b>${q.sat.kind==="iss"?"ISS":"Tiangong"}</b> · ${fmtT(q.start)}<div class="lookSub">${dirS(q.azStart)} → ${dirS(q.azEnd)} · max ${nf(q.max)}° · ${dur(q.end-q.start)}</div></div><div class="${q.vis?"vis":"lookSub"}">${q.vis?"✨ viditeľný":"neviditeľný"}</div></div>`).join("")||'<div class="lookSub">Žiadne prelety.</div>';
    // teraz nad obzorom
    const nowL=visibleNow(),trains=nowL.filter(s=>s.kind==="starlink");
    $("sp-nowN").textContent=nowL.length?nowL.length+"":"";
    let html="";
    if(trains.length>=3)html+=`<div class="qbox" style="margin:6px 0">🚂 Vláčik Starlink! Práve je nad tebou ${trains.length} ${pl(trains.length,"nový satelit","nové satelity","nových satelitov")} – hľadaj rad svetielok, čo idú za sebou.</div>`;
    html+=nowL.slice(0,12).map(s=>`<div class="row"><div class="l"><b>${s.kind==="iss"||s.kind==="css"?"⭐ ":s.kind==="starlink"?"🔹 ":"· "}${esc(s.kind==="iss"||s.kind==="css"?LONG[s.kind]:s.name)}</b><div>${s.sunlit?"viditeľný voľným okom ✨":s.lit?"na slnku, ale u teba je svetlo":"v tieni Zeme"}</div></div><div class="r"><b>${nf(s.el)}°</b><br>na ${dirS(s.az)}</div></div>`).join("");
    $("sp-now").innerHTML=html||'<div class="lookSub">'+(sunAlt()>-6?"Teraz je svetlo – satelity uvidíš až po zotmení. ISS a Tiangong ale ukazujem vždy.":"Momentálne nič jasné nad obzorom.")+'</div>';
  }

  function strip(){
    const p=nextVisible(),el=$("issStrip");
    if(!p||p.start-Date.now()>6*3600e3){el.style.display="none";return}
    const live=Date.now()>=p.start;
    el.style.display="";
    $("issTxt").textContent=live?`🛰️ ${p.sat.kind==="iss"?"ISS":"Tiangong"} je TERAZ nad tebou!`:`🛰️ ${p.sat.kind==="iss"?"ISS":"Tiangong"} o ${cnt(p.start-Date.now())}`;
    // upozornenie 2 minúty vopred
    const key=p.sat.id+p.start;
    if(!st.notified.has(key)&&p.start-Date.now()<120e3&&p.start>Date.now()-30e3){
      st.notified.add(key);
      toast("🛰️ O chvíľu "+(p.sat.kind==="iss"?"ISS":"Tiangong")+"!","Pozri smerom na "+dirL(p.azStart),"#ffcf4f");
      if(S.vib&&navigator.vibrate)navigator.vibrate([200,100,200]);
      if(S.voice)voiceSay("Pozor! O chvíľu nad tebou preletí "+(p.sat.kind==="iss"?"Medzinárodná vesmírna stanica":"čínska vesmírna stanica")+". Pozri na "+dirL(p.azStart)+".");
    }
  }

  function radar(){
    return visibleNow().map(s=>{const r=(90-s.el)/90*100,x=r*Math.sin(s.az*D2R),y=-r*Math.cos(s.az*D2R),big=s.kind==="iss"||s.kind==="css";
      const c=big?"#ffcf4f":s.kind==="starlink"?"#c77dff":"#fff";
      return `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})" opacity="${s.sunlit||big?1:.5}"><text text-anchor="middle" y="3" font-size="${big?10:6}" fill="${c}">★</text>${big?`<text x="7" y="3" font-size="7" font-weight="700" fill="${c}">${s.kind==="iss"?"ISS":"Tiangong"}</text>`:""}</g>`}).join("");
  }

  HOOKS.radar.push(radar);
  HOOKS.fresh.push(()=>{if(!st.sats.length&&!st.loading)init();else computePasses(false)});
  HOOKS.view.push(v=>{if(v==="space"){if(!st.sats.length)init();render()}});
  setInterval(()=>{if(document.hidden)return;if(S.view==="space")render();else if(S.view==="now")strip()},1000);
  $("issStrip").onclick=()=>setView("space");
  return {init,sunAlt,visibleNow,render};
})();
