"use strict";
/* ============ 🃏 Zberateľské kartičky – Atlas oblohy ============ */
const SPEC={
  twin:{fw:.105,wp:.38,rc:.2,sw:26,tc:.06,eng:[{at:.34,k:"jet"}],tp:.86,ts:.34,tsw:32},
  twinW:{fw:.095,wp:.4,rc:.21,sw:31,tc:.05,eng:[{at:.33,k:"jet",big:1}],tp:.87,ts:.33,tsw:34},
  quad:{fw:.095,wp:.39,rc:.21,sw:33,tc:.05,eng:[{at:.3,k:"jet"},{at:.6,k:"jet"}],tp:.87,ts:.33,tsw:34},
  tri:{fw:.1,wp:.4,rc:.2,sw:32,tc:.05,eng:[{at:.34,k:"jet"},{tail:1}],tp:.86,ts:.34,tsw:34},
  rj:{fw:.11,wp:.42,rc:.18,sw:27,tc:.06,eng:[{rear:1}],tp:.92,ts:.36,tsw:32},
  prop:{fw:.11,wp:.4,rc:.12,sw:3,tc:.08,eng:[{at:.32,k:"prop"}],tp:.9,ts:.3,tsw:12},
  prop4:{fw:.13,wp:.36,rc:.15,sw:6,tc:.08,eng:[{at:.26,k:"prop"},{at:.55,k:"prop"}],tp:.88,ts:.4,tsw:10},
  mil:{fw:.13,wp:.36,rc:.2,sw:25,tc:.07,eng:[{at:.3,k:"jet"},{at:.56,k:"jet"}],tp:.9,ts:.4,tsw:28},
  beluga:{fw:.2,wp:.4,rc:.18,sw:28,tc:.06,eng:[{at:.34,k:"jet"}],tp:.86,ts:.36,tsw:32,bulge:1},
  fighter:{fw:.11,wp:.48,rc:.32,sw:40,tc:.08,eng:[],tp:.88,ts:.5,tsw:40,jet:1},
  delta:{fw:.1,wp:.42,rc:.5,sw:55,tc:.04,eng:[],tp:0,ts:0,tsw:0,canard:1,jet:1},
  jetT:{fw:.1,wp:.42,rc:.2,sw:5,tc:.12,eng:[],tp:.88,ts:.36,tsw:8,tipTanks:1},
  ga:{fw:.12,wp:.28,rc:.17,sw:0,tc:.14,eng:[{nose:1}],tp:.9,ts:.32,tsw:5},
  ga1:{fw:.11,wp:.4,rc:.16,sw:2,tc:.1,eng:[{nose:1,big:1}],tp:.9,ts:.32,tsw:8},
};
/* silueta zhora (tak ho vidíš zo zeme), v presných pomeroch dĺžky a rozpätia */
function planeSVG(c,o){
  const box=o.box||200,cx=box/2,cy=box/2,col=o.body||"#f4f7ff",acc=o.acc||"#3d7bff",sh=o.shade||"#c9d3ea",id=o.id||"p";
  if(c.fam==="heli"){
    const k=(box*.84)/Math.max(c.len,c.span),L=c.len*k,R=c.span*k/2,bw=L*.26,by=cy-L*.5;
    return `<g filter="url(#ds${id})"><path d="M${cx} ${by} C${cx+bw*.62} ${by} ${cx+bw*.55} ${by+L*.42} ${cx+bw*.2} ${by+L*.48} L${cx+bw*.08} ${by+L*.98} L${cx-bw*.08} ${by+L*.98} L${cx-bw*.2} ${by+L*.48} C${cx-bw*.55} ${by+L*.42} ${cx-bw*.62} ${by} ${cx} ${by}Z" fill="url(#bg${id})"/>
      <rect x="${cx-bw*.5}" y="${by+L*.9}" width="${bw}" height="${L*.04}" rx="2" fill="${acc}"/>
      <ellipse cx="${cx}" cy="${by+L*.12}" rx="${bw*.32}" ry="${L*.07}" fill="#1b2340" opacity=".85"/></g>
      <circle cx="${cx}" cy="${by+L*.3}" r="${R}" fill="${acc}" opacity=".10" stroke="${acc}" stroke-opacity=".35"/>
      ${[0,45,90,135].map(a=>`<rect x="${cx-R}" y="${by+L*.3-1.6}" width="${R*2}" height="3.2" rx="1.6" fill="#2a3352" opacity=".8" transform="rotate(${a+15} ${cx} ${by+L*.3})"/>`).join("")}
      <circle cx="${cx}" cy="${by+L*.3}" r="${bw*.14}" fill="${acc}"/>`;
  }
  const P=SPEC[c.fam]||SPEC.twin,k=(box*.86)/Math.max(c.len,c.span),L=c.len*k,hs=c.span*k/2,w=Math.max(4,P.fw*L),y0=cy-L/2,y1=cy+L/2;
  const t=a=>Math.tan(a*Math.PI/180),rLE=y0+P.wp*L,c0=P.rc*L,c1=P.tc*L,tLE=rLE+(hs-w/2)*t(P.sw);
  const le=x=>rLE+(x-w/2)*t(P.sw);
  let s=`<g filter="url(#ds${id})">`;
  // krídla
  const wing=sg=>`M${cx+sg*w/2} ${rLE} L${cx+sg*hs} ${tLE} L${cx+sg*hs} ${tLE+c1} L${cx+sg*w/2} ${rLE+c0}Z`;
  s+=`<path d="${wing(1)} ${wing(-1)}" fill="url(#wg${id})"/>`;
  if(P.tipTanks)[1,-1].forEach(sg=>s+=`<rect x="${cx+sg*hs-3}" y="${tLE-6}" width="6" height="${c1+12}" rx="3" fill="${acc}"/>`);
  // chvost
  if(P.tp){const ty=y0+P.tp*L,th=P.ts*hs,tc0=.11*L,tt=ty+th*t(P.tsw);
    s+=`<path d="M${cx+w*.3} ${ty} L${cx+th} ${tt} L${cx+th} ${tt+tc0*.45} L${cx+w*.3} ${ty+tc0}Z M${cx-w*.3} ${ty} L${cx-th} ${tt} L${cx-th} ${tt+tc0*.45} L${cx-w*.3} ${ty+tc0}Z" fill="url(#wg${id})"/>`}
  if(P.canard)s+=`<path d="M${cx+w*.4} ${y0+L*.24} L${cx+hs*.38} ${y0+L*.3} L${cx+hs*.38} ${y0+L*.33} L${cx+w*.4} ${y0+L*.32}Z M${cx-w*.4} ${y0+L*.24} L${cx-hs*.38} ${y0+L*.3} L${cx-hs*.38} ${y0+L*.33} L${cx-w*.4} ${y0+L*.32}Z" fill="url(#wg${id})"/>`;
  // motory
  for(const e of P.eng){
    if(e.rear){const pl=.16*L,pw=Math.max(5,.055*L);[1,-1].forEach(sg=>s+=`<rect x="${cx+sg*(w/2+pw*.55)-pw/2}" y="${y0+L*.66}" width="${pw}" height="${pl}" rx="${pw/2}" fill="${acc}"/>`);continue}
    if(e.tail){const pw=Math.max(5,.06*L);s+=`<rect x="${cx-pw/2}" y="${y0+L*.8}" width="${pw}" height="${.13*L}" rx="${pw/2}" fill="${acc}"/>`;continue}
    if(e.nose){const pd=(e.big?.36:.3)*L;s+=`<ellipse cx="${cx}" cy="${y0-1}" rx="${pd/2}" ry="2.2" fill="${acc}" opacity=".7"/><circle cx="${cx}" cy="${y0+2}" r="3" fill="${acc}"/>`;continue}
    [1,-1].forEach(sg=>{const x=w/2+e.at*(hs-w/2),ly=le(x);
      if(e.k==="prop"){const nl=.2*L,nw=Math.max(4,.045*L),pd=.15*L;s+=`<rect x="${cx+sg*x-nw/2}" y="${ly-nl*.35}" width="${nw}" height="${nl}" rx="${nw/2}" fill="${acc}"/><ellipse cx="${cx+sg*x}" cy="${ly-nl*.37}" rx="${pd}" ry="2" fill="${acc}" opacity=".55"/>`}
      else{const pl=(e.big?.15:.12)*L,pw=Math.max(5,(e.big?.055:.042)*L);s+=`<rect x="${cx+sg*x-pw/2}" y="${ly-pl*.62}" width="${pw}" height="${pl}" rx="${pw/2}" fill="${acc}"/><rect x="${cx+sg*x-pw/2+1}" y="${ly-pl*.62}" width="${pw-2}" height="${pl*.18}" rx="${pw/3}" fill="#0b1020" opacity=".55"/>`}});
  }
  // trup
  const bw=P.bulge?w*1.25:w,nose=P.jet?L*.16:Math.min(bw*1.3,L*.12);
  s+=`<path d="M${cx} ${y0} C${cx+bw*.5} ${y0+nose*.15} ${cx+bw/2} ${y0+nose*.6} ${cx+bw/2} ${y0+nose} L${cx+w/2} ${P.bulge?y0+L*.45:y0+nose} L${cx+w/2} ${y1-L*.2} C${cx+w/2} ${y1-L*.08} ${cx+w*.18} ${y1} ${cx} ${y1} C${cx-w*.18} ${y1} ${cx-w/2} ${y1-L*.08} ${cx-w/2} ${y1-L*.2} L${cx-w/2} ${P.bulge?y0+L*.45:y0+nose} L${cx-bw/2} ${y0+nose} C${cx-bw/2} ${y0+nose*.6} ${cx-bw*.5} ${y0+nose*.15} ${cx} ${y0}Z" fill="url(#bg${id})"/>`;
  s+=`<path d="M${cx} ${y0+nose*.35} C${cx+bw*.3} ${y0+nose*.4} ${cx+bw*.32} ${y0+nose*.7} ${cx+bw*.26} ${y0+nose*.8} L${cx-bw*.26} ${y0+nose*.8} C${cx-bw*.32} ${y0+nose*.7} ${cx-bw*.3} ${y0+nose*.4} ${cx} ${y0+nose*.35}Z" fill="#1b2340" opacity=".8"/>`;
  s+=`<rect x="${cx-1}" y="${y1-L*.17}" width="2" height="${L*.15}" fill="${acc}"/>`;
  if(c.code==="E3TF")s+=`<ellipse cx="${cx}" cy="${y0+L*.68}" rx="${L*.11}" ry="${L*.11}" fill="${acc}" stroke="#fff" stroke-width="2"/>`;
  s+="</g>";
  return s;
}
function svgDefs(id,col,sh,acc){
  return `<filter id="ds${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="4" dy="8" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>
  <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sh}"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="${sh}"/></linearGradient>
  <linearGradient id="wg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${sh}"/></linearGradient>`;
}
const RAR_SYM={c:"●",u:"◆",r:"★",l:"★★"};
const FRAME={c:["#9fb3d9","#5b6f99"],u:["#7fd3ff","#2f6fd6"],r:["#e3a8ff","#7b3fe4"],l:["#fff1a8","#d9a000"]};
const SVGE=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function wrapLines(s,n){const out=[];let l="";for(const w of String(s).split(" ")){if((l+" "+w).trim().length>n&&l){out.push(l);l=w}else l=(l+" "+w).trim()}if(l)out.push(l);return out}
const MAXS={spd:2400,range:16100,span:79.8,len:76.3};
/* celá kartička ako SVG (rovnaká v appke aj pri zdieľaní) */
function cardSVG(code,v,opt={}){
  const c=catGuess(code),r=v?v.r:(LEG.has(code)?"l":RARE.has(code)?"r":WIDE.has(code)||HELI.has(code)?"u":"c");
  const owned=!!v,shiny=owned&&v.shiny,night=owned&&v.night&&!shiny,id=(opt.id||"c")+code.replace(/\W/g,"");
  const fr=FRAME[r],acc=!owned?"#151b36":shiny?"#ff4fd8":(MAKER_COL[c.maker]||"#3d7bff");
  const body=!owned?"#28305a":shiny?"#ffe9a8":"#f4f7ff",shade=!owned?"#1a2042":shiny?"#e0a800":"#c3cde6";
  const sky=night?["#050816","#1a1f4a"]:shiny?["#3a0647","#ff8a4f"]:r==="l"?["#3b2a00","#ffcf4f"]:r==="r"?["#21104a","#8e5cff"]:r==="u"?["#0b3a6e","#5cc3ff"]:["#1e3a73","#8fb8ff"];
  const tot=CATALOG.length,no=c.no?String(c.no).padStart(3,"0")+"/"+tot:"★ mimo série";
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 840" font-family="Inter, system-ui, -apple-system, sans-serif"><defs>${svgDefs(id,body,shade,acc)}
    <linearGradient id="fr${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fr[0]}"/><stop offset="1" stop-color="${fr[1]}"/></linearGradient>
    <linearGradient id="sk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="pn${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141a33"/><stop offset="1" stop-color="#0a0e1f"/></linearGradient>
    <clipPath id="ar${id}"><rect x="36" y="104" width="528" height="330" rx="18"/></clipPath></defs>
    <rect x="4" y="4" width="592" height="832" rx="34" fill="url(#fr${id})"/>
    <rect x="18" y="18" width="564" height="804" rx="24" fill="url(#pn${id})"/>`;
  if(!owned){
    s+=`<rect x="36" y="104" width="528" height="330" rx="18" fill="#0d1226"/><g transform="translate(150 119) scale(1.5)">${planeSVG(c,{box:200,body,acc,shade,id})}</g>
      <text x="300" y="72" text-anchor="middle" font-size="40" font-weight="900" fill="#6b7699">? ? ?</text>
      <text x="300" y="500" text-anchor="middle" font-size="22" fill="#6b7699">${SVGE(FAM_SK[c.fam]||"")}</text>
      <text x="300" y="560" text-anchor="middle" font-size="64" fill="${fr[0]}">${RAR_SYM[r]}</text>
      <text x="300" y="620" text-anchor="middle" font-size="22" fill="#8a94b8">Ešte si ho neulovil</text>
      <text x="300" y="800" text-anchor="middle" font-size="18" fill="#59648a">Atlas oblohy · Séria 1 · ${no}</text></svg>`;
    return s;
  }
  // hlavička
  const nm=c.name.length>20?28:c.name.length>15?32:36;
  s+=`<text x="40" y="74" font-size="${nm}" font-weight="900" fill="#fff" letter-spacing="-1">${SVGE(c.name)}</text>
    <text x="560" y="62" text-anchor="end" font-size="34" font-weight="900" fill="#fff">${c.seats?c.seats:"📦"}</text>
    <text x="560" y="84" text-anchor="end" font-size="13" font-weight="700" fill="#9aa6cc" letter-spacing="1.5">${c.seats?"MIEST":"NÁKLAD"}</text>`;
  // ilustrácia
  s+=`<g clip-path="url(#ar${id})"><rect x="36" y="104" width="528" height="330" fill="url(#sk${id})"/>`;
  if(night||shiny)for(let i=0;i<46;i++){const h=hash(code+i);s+=`<circle cx="${36+h%528}" cy="${104+(h>>>9)%330}" r="${(h>>>18)%3*0.6+.5}" fill="#fff" opacity="${.3+((h>>>4)%7)/10}"/>`}
  else for(let i=0;i<4;i++){const h=hash(code+"c"+i);s+=`<ellipse cx="${36+h%528}" cy="${130+(h>>>9)%260}" rx="${60+(h>>>3)%70}" ry="${14+(h>>>7)%12}" fill="#fff" opacity=".13"/>`}
  if(shiny)for(let i=0;i<10;i++){const h=hash(code+"s"+i),x=60+h%480,y=120+(h>>>8)%290,z=6+(h>>>14)%8;s+=`<path d="M${x} ${y-z}L${x+z*.25} ${y-z*.25}L${x+z} ${y}L${x+z*.25} ${y+z*.25}L${x} ${y+z}L${x-z*.25} ${y+z*.25}L${x-z} ${y}L${x-z*.25} ${y-z*.25}Z" fill="#fff6c2" opacity=".9"/>`}
  s+=`<g transform="translate(150 119) scale(1.5)">${planeSVG(c,{box:200,body,acc,shade,id})}</g></g>
    <rect x="36" y="104" width="528" height="330" rx="18" fill="none" stroke="${fr[0]}" stroke-opacity=".6" stroke-width="2"/>`;
  if(shiny)s+=`<rect x="50" y="118" width="128" height="34" rx="17" fill="#ff4fd8"/><text x="114" y="141" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">✨ SHINY</text>`;
  else if(night)s+=`<rect x="50" y="118" width="168" height="34" rx="17" fill="#1a1f4a" stroke="#8fa2ff"/><text x="134" y="141" text-anchor="middle" font-size="15" font-weight="800" fill="#cfd8ff">🌙 NOČNÁ EDÍCIA</text>`;
  // typový pás
  s+=`<rect x="36" y="446" width="528" height="40" rx="12" fill="#ffffff" fill-opacity=".06"/>
    <text x="52" y="472" font-size="16" font-weight="700" fill="${acc==="#ff4fd8"?"#ff9fe8":"#cfd8ff"}">${SVGE(c.maker)} · ${SVGE(FAM_SK[c.fam]||"")}${c.year?" · od "+c.year:""}</text>`;
  // štatistiky (Top Trumps)
  const st=[["Rýchlosť",c.spd,MAXS.spd,nf(c.spd)+" km/h"],["Dolet",c.range,MAXS.range,nf(c.range)+" km"],["Rozpätie",c.span,MAXS.span,nf(c.span,1)+" m"],["Dĺžka",c.len,MAXS.len,nf(c.len,1)+" m"]];
  st.forEach((q,i)=>{const y=512+i*38,bw=Math.max(6,Math.min(1,q[1]/q[2])*250);
    s+=`<text x="52" y="${y+14}" font-size="16" font-weight="600" fill="#9aa6cc">${q[0]}</text>
      <rect x="160" y="${y+2}" width="250" height="14" rx="7" fill="#fff" fill-opacity=".08"/><rect x="160" y="${y+2}" width="${bw}" height="14" rx="7" fill="${fr[0]}"/>
      <text x="548" y="${y+15}" text-anchor="end" font-size="17" font-weight="800" fill="#fff">${q[3]}</text>`});
  // zaujímavosť
  wrapLines(c.fact,46).slice(0,3).forEach((l,i)=>s+=`<text x="52" y="${688+i*24}" font-size="17" font-style="italic" fill="#dfe6ff">${SVGE(l)}</text>`);
  // päta
  s+=`<line x1="40" x2="560" y1="766" y2="766" stroke="#fff" stroke-opacity=".1"/>
    <text x="40" y="800" font-size="22" fill="${fr[0]}">${RAR_SYM[r]}</text>
    <text x="${r==="l"?82:66}" y="798" font-size="15" font-weight="700" fill="#cfd8ff">${RAR[r].n}</text>
    <text x="300" y="798" text-anchor="middle" font-size="14" fill="#8a94b8">ulovené ${v.n}× · ${new Date(v.first||Date.now()).toLocaleDateString("sk-SK")}</text>
    <text x="560" y="798" text-anchor="end" font-size="14" font-weight="700" fill="#8a94b8">SK·1 ${no}</text></svg>`;
  return s;
}

/* ---- Atlas v sekcii Ja ---- */
let atlasMode="mine";
function renderCards(){
  const owned=COL.types,ownedKeys=Object.keys(owned),inCat=ownedKeys.filter(k=>CAT[k]).length,tot=CATALOG.length;
  const shinyN=ownedKeys.filter(k=>owned[k].shiny).length;
  $("c-cardsN").textContent=`${inCat}/${tot}`;
  const order={l:0,r:1,u:2,c:3};
  const mine=ownedKeys.sort((x,y)=>(CAT[x]?CAT[x].no:999)-(CAT[y]?CAT[y].no:999));
  const missing=CATALOG.map(c=>c[0]).filter(k=>!owned[k]).sort((x,y)=>order[cardRar(x)]-order[cardRar(y)]||CAT[x].no-CAT[y].no);
  const list=atlasMode==="mine"?mine:missing;
  $("c-types").innerHTML=`<div class="atlasTop" style="grid-column:1/-1"><div class="xp"><i style="width:${inCat/tot*100}%"></i></div>
    <div class="lookSub">Zbieraš Sériu 1: ${inCat} z ${tot} typov${shinyN?" · ✨ "+shinyN+" shiny":""}. Každé lietadlo môže byť s 5 % šancou ✨ shiny.</div>
    <div class="atTabs"><button class="${atlasMode==="mine"?"on":""}" data-m="mine">Moje (${ownedKeys.length})</button><button class="${atlasMode==="miss"?"on":""}" data-m="miss">Chýbajúce (${missing.length})</button></div></div>`+
    (list.length?list.map(k=>`<button class="mini ${owned[k]&&owned[k].shiny?"shiny":""} ${cardRar(k)}" data-k="${esc(k)}">${cardSVG(k,owned[k],{id:"m"})}</button>`).join(""):`<div class="lookSub" style="grid-column:1/-1;padding:10px 0">${atlasMode==="mine"?"Zatiaľ prázdne. Každý nový typ lietadla nad tebou = nová kartička.":"Máš celú sériu! 🏆"}</div>`);
}
const cardRar=k=>COL.types[k]?COL.types[k].r:(LEG.has(k)?"l":RARE.has(k)?"r":WIDE.has(k)||HELI.has(k)?"u":"c");
HOOKS.view.push(v=>{if(v==="col")renderCards()});
let cardK=null;
$("c-types").onclick=e=>{
  const tb=e.target.closest(".atTabs button");if(tb){atlasMode=tb.dataset.m;renderCards();return}
  const m=e.target.closest(".mini");if(!m)return;const k=m.dataset.k;
  if(!COL.types[k]){const c=CAT[k];toast("🔒 "+(c?c.name:k),"Ešte si ho neulovil · "+RAR[cardRar(k)].n+". Pozeraj hore!");haptic(20);return}
  cardK=k;openCard(k);
};
function openCard(k){
  const v=COL.types[k],r=v.r;
  $("cardBig").innerHTML=`<div class="holoWrap ${r} ${v.shiny?"shiny":""}">${cardSVG(k,v,{id:"b"})}</div>`;
  $("cardM").classList.add("on");haptic(15);bindTilt();
}
$("cardClose").onclick=()=>$("cardM").classList.remove("on");
function tiltTo(rx,ry){const c=$("cardBig").firstElementChild;if(!c)return;c.style.setProperty("--rx",rx+"deg");c.style.setProperty("--ry",ry+"deg");c.style.setProperty("--mx",(50+ry*3)+"%");c.style.setProperty("--my",(50-rx*3)+"%");c.style.setProperty("--ang",(ry*10+rx*6)+"deg")}
let tiltBound=false;
function bindTilt(){
  if(tiltBound)return;tiltBound=true;
  addEventListener("deviceorientation",e=>{if(!$("cardM").classList.contains("on")||e.beta==null)return;tiltTo(Math.max(-16,Math.min(16,(e.beta-45)/2)),Math.max(-16,Math.min(16,(e.gamma||0)/1.5)))});
  $("cardBig").addEventListener("pointermove",e=>{const el=$("cardBig").firstElementChild;if(!el)return;const r=el.getBoundingClientRect();tiltTo(-((e.clientY-r.top)/r.height-.5)*26,((e.clientX-r.left)/r.width-.5)*26)});
}
/* ---- variant pri ulovení: shiny 5 %, nočná edícia ---- */
HOOKS.caught.push(a=>{
  const ty=a.type||"?",v=COL.types[ty];if(!v)return;
  const h=new Date().getHours();let msg=null;
  if(!v.shiny&&Math.random()<.05){v.shiny=Date.now();msg=["✨ SHINY KARTIČKA!",(v.name||ty)+" – lesklá verzia, má ju len málokto"]}
  else if(!v.night&&(h>=20||h<5)){v.night=Date.now();msg=["🌙 Nočná edícia",(v.name||ty)+" – ulovené v noci"]}
  if(!CAT[ty]&&!v.offset){v.offset=1;msg=msg||["⭐ Mimo série!",(v.name||ty)+" – typ, ktorý nie je ani v atlase"]}
  LS.set("ctl_col",COL);
  if(msg)setTimeout(()=>{toast(msg[0],msg[1],"#ff4fd8");if(msg[0].includes("SHINY")){confetti(110);haptic([40,60,40,60,120])}},3500);
});
$("cardShare").onclick=async()=>{
  const v=COL.types[cardK];if(!v)return;
  const svg=cardSVG(cardK,v,{id:"s"}),img=new Image(),W=1080,H=1920;
  img.onload=()=>{
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#0d1430");g.addColorStop(1,v.shiny?"#5a1f6b":"#1b2a6b");x.fillStyle=g;x.fillRect(0,0,W,H);
    for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.6})`;x.beginPath();x.arc(Math.random()*W,Math.random()*H,Math.random()*2.2,0,7);x.fill()}
    x.textAlign="center";x.fillStyle="#fff";x.font="800 46px Unbounded, sans-serif";x.fillText(v.shiny?"✨ Mám SHINY kartičku!":"Nová kartička v zbierke!",W/2,200);
    x.drawImage(img,(W-860)/2,280,860,1204);
    x.fillStyle="#6dffc7";x.font="900 56px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,H-170);
    x.fillStyle="rgba(255,255,255,.85)";x.font="500 34px Inter, sans-serif";x.fillText("Ulovil som ho nad hlavou → "+location.host,W/2,H-105);
    c.toBlob(b=>b&&shareBlob(b,"kartička.png",(v.shiny?"✨ SHINY ":"")+"kartička: "+(catGuess(cardK).name)+" ✈️ "+location.href),"image/png");
  };
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
};
