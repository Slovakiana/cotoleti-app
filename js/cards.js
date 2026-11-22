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
  if(c.code==="SLEIGH"){const b=o.box||200;return `<g font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif" text-anchor="middle"><text x="${b/2}" y="${b*.62}" font-size="${b*.42}">🛷</text><text x="${b*.36}" y="${b*.46}" font-size="${b*.26}">🎅</text><text x="${b*.82}" y="${b*.4}" font-size="${b*.2}">🦌</text><text x="${b*.2}" y="${b*.22}" font-size="${b*.1}">✨</text><text x="${b*.86}" y="${b*.78}" font-size="${b*.09}">⭐</text></g>`}
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
const RAR_SYM={c:"●",u:"◆",r:"▲",e:"⬟",l:"♛"};
const FRAME={c:["#e3e9f5","#8d9bb8"],u:["#a8f5c6","#1f9e5a"],r:["#a9d4ff","#2f6fd6"],e:["#e3a8ff","#7b3fe4"],l:["#fff1a8","#d9a000"]};
// 🌙🌅🎯🏠❄️ formy kartičky – odomknú sa podmienkou pri úlovku (vedomosti o oblohe, nie náhoda)
const FORMS=[["n","🌙","Noc","po zotmení"],["g","🌅","Zlatá hodinka","pri západe/východe slnka"],["z","🎯","Zenit","priamo nad hlavou (80°+)"],["h","🏠","Domov","let na Slovensko"],["f","❄️","Mráz","pri mraze"]];
const SEATSX={A124:150,IL76:50,BLCF:113,A3ST:47,A337:51,K35R:90,E3TF:0,C17:77,A400:37,C130:20,C30J:20,AN12:20,MD11:90,B748:137,B744:120};
const SVGE=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function wrapLines(s,n){const out=[];let l="";for(const w of String(s).replace(/(\d) (?=\d{3}\b)/g,"$1\u00a0").replace(/ (\d{1,4}[.,]?)$/,"\u00a0$1").split(" ")){if((l+" "+w).trim().length>n&&l){out.push(l);l=w}else l=(l+" "+w).trim()}if(l)out.push(l);return out}
const MAXS={spd:2400,range:16100,span:79.8,len:76.3};
/* celá kartička ako SVG (rovnaká v appke aj pri zdieľaní) */
// kúpené rámy z obchodu (vonkajší okraj kartičky)
const FRAMES_SHOP={fr_tatry:["#eef4ff","#5b7da8"],fr_dunaj:["#5fd3f0","#0a4a7a"],fr_noc:["#ffcf4f","#1b1f4a"]};
// skráti text po slove (nie uprostred slova)
const cutW=(t,n)=>{t=String(t||"");if(t.length<=n)return t;const c=t.slice(0,n);const i=Math.max(c.lastIndexOf(" "),c.lastIndexOf("-"));return (i>n/2?c.slice(0,i):c).replace(/[-\s]+$/,"")+"…"};
function cardSVG(code,v,opt={}){
  const c=catGuess(code),r=typeTier(code);
  const owned=!!v,shiny=owned&&v.shiny,night=owned&&v.night&&!shiny,gold=owned&&v.gold,id=(opt.id||"c")+code.replace(/\W/g,"");
  const fr=owned&&COL.frame&&FRAMES_SHOP[COL.frame]?FRAMES_SHOP[COL.frame]:FRAME[r],acc=!owned?"#151b36":shiny?"#ff4fd8":(MAKER_COL[c.maker]||"#3d7bff");
  const body=!owned?"#28305a":shiny?"#ffe9a8":"#f4f7ff",shade=!owned?"#1a2042":shiny?"#e0a800":"#c3cde6";
  const sky=night?["#050816","#1a1f4a"]:shiny?["#3a0647","#ff8a4f"]:r==="l"?["#3b2a00","#ffcf4f"]:r==="e"?["#21104a","#8e5cff"]:r==="r"?["#0a2a66","#4fa3ff"]:r==="u"?["#0b4a33","#5ee0a0"]:["#1e3a73","#8fb8ff"];
  const tot=CATALOG.filter(x=>!(typeof TROPHY!=="undefined"&&TROPHY.has(x[0]))).length,isTr=typeof TROPHY!=="undefined"&&TROPHY.has(code),no=isTr?"🏆 trofej":c.no?"č. "+String(c.no).padStart(3,"0")+"/"+tot:"mimo série";
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 840" font-family="Inter, system-ui, -apple-system, sans-serif"><defs>${svgDefs(id,body,shade,acc)}
    <linearGradient id="fr${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${fr[0]}"/><stop offset="1" stop-color="${fr[1]}"/></linearGradient>
    <linearGradient id="sk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="pn${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#141a33"/><stop offset="1" stop-color="#0a0e1f"/></linearGradient>
    <clipPath id="ar${id}"><rect x="36" y="104" width="528" height="330" rx="18"/></clipPath></defs>
    <linearGradient id="pr${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4fd8"/><stop offset=".33" stop-color="#4fc3ff"/><stop offset=".66" stop-color="#6dffc7"/><stop offset="1" stop-color="#ffcf4f"/></linearGradient>
    <rect x="4" y="4" width="592" height="832" rx="34" fill="${shiny?`url(#pr${id})`:gold?"#ffcf4f":`url(#fr${id})`}"/>
    <rect x="18" y="18" width="564" height="804" rx="24" fill="url(#pn${id})"/>`+(owned&&(r==="l"||r==="e")?Array.from({length:12},(_,i)=>`<circle cx="300" cy="640" r="${40+i*22}" fill="none" stroke="${fr[0]}" stroke-opacity=".06"/>`).join(""):"")+(owned&&cardLvl(v.n,code)>=3?`<path d="M30 60V30H60M540 30H570V60M570 780V810H540M60 810H30V780" fill="none" stroke="${fr[0]}" stroke-width="4"/>`:"")+(owned&&cardLvl(v.n,code)>=4?`<rect x="12" y="12" width="576" height="816" rx="28" fill="none" stroke="#ffcf4f" stroke-width="3"/>`:"");
  if(!owned){
    s+=`<rect x="36" y="104" width="528" height="330" rx="18" fill="#0d1226"/><g transform="translate(150 119) scale(1.5)">${planeSVG(c,{box:200,body,acc,shade,id})}</g>
      <text x="300" y="72" text-anchor="middle" font-size="${c.name.length>18?30:36}" font-weight="900" fill="#6b7699">${SVGE(c.name)}</text>
      <text x="300" y="500" text-anchor="middle" font-size="22" fill="#6b7699">${SVGE(FAM_SK[c.fam]||"")}</text>
      <text x="300" y="560" text-anchor="middle" font-size="64" fill="${fr[0]}">${RAR_SYM[r]}</text>
      <text x="300" y="610" text-anchor="middle" font-size="24" font-weight="800" fill="${fr[0]}">${RAR[r].n}</text>
      <text x="300" y="660" text-anchor="middle" font-size="22" fill="#8a94b8">Zamávaj mu a je tvoja</text>
      <text x="300" y="800" text-anchor="middle" font-size="18" fill="#59648a">Atlas oblohy · S1 · ${no}</text></svg>`;
    return s;
  }
  // hlavička
  const nm=c.name.length>20?28:c.name.length>15?32:36;
  s+=`<text x="40" y="74" font-size="${nm}" font-weight="900" fill="#fff" letter-spacing="-1">${SVGE(c.name)}</text>
    <text x="560" y="62" text-anchor="end" font-size="34" font-weight="900" fill="#fff">${c.seats?c.seats:SEATSX[code]?SEATSX[code]+" t":"📦"}</text>
    <text x="560" y="84" text-anchor="end" font-size="13" font-weight="700" fill="#9aa6cc" letter-spacing="1.5">${c.seats?pl(c.seats,"MIESTO","MIESTA","MIEST"):"NÁKLAD"}</text>`;
  // ilustrácia
  s+=`<g clip-path="url(#ar${id})"><rect x="36" y="104" width="528" height="330" fill="url(#sk${id})"/>`;
  if(night||shiny)for(let i=0;i<46;i++){const h=hash(code+i);s+=`<circle cx="${36+h%528}" cy="${104+(h>>>9)%330}" r="${(h>>>18)%3*0.6+.5}" fill="#fff" opacity="${.3+((h>>>4)%7)/10}"/>`}
  else for(let i=0;i<4;i++){const h=hash(code+"c"+i);s+=`<ellipse cx="${36+h%528}" cy="${130+(h>>>9)%260}" rx="${60+(h>>>3)%70}" ry="${14+(h>>>7)%12}" fill="#fff" opacity=".13"/>`}
  if(shiny)for(let i=0;i<10;i++){const h=hash(code+"s"+i),x=60+h%480,y=120+(h>>>8)%290,z=6+(h>>>14)%8;s+=`<path d="M${x} ${y-z}L${x+z*.25} ${y-z*.25}L${x+z} ${y}L${x+z*.25} ${y+z*.25}L${x} ${y+z}L${x-z*.25} ${y+z*.25}L${x-z} ${y}L${x-z*.25} ${y-z*.25}Z" fill="#fff6c2" opacity=".9"/>`}
  s+=`<g transform="translate(150 119) scale(1.5)">${planeSVG(c,{box:200,body,acc,shade,id})}</g></g>
    <rect x="36" y="104" width="528" height="330" rx="18" fill="none" stroke="${fr[0]}" stroke-opacity=".6" stroke-width="2"/>`;
  if(shiny)s+=`<rect x="50" y="118" width="128" height="34" rx="17" fill="#ff4fd8"/><text x="114" y="141" text-anchor="middle" font-size="16" font-weight="900" fill="#fff">✨ LESKLÁ</text>`;
  else if(gold)s+=`<rect x="50" y="118" width="196" height="34" rx="17" fill="#ffcf4f"/><text x="148" y="141" text-anchor="middle" font-size="15" font-weight="900" fill="#3b2a00">🏆 ZLATÁ POSÁDKA</text>`;
  else if(night)s+=`<rect x="50" y="118" width="168" height="34" rx="17" fill="#1a1f4a" stroke="#8fa2ff"/><text x="134" y="141" text-anchor="middle" font-size="15" font-weight="800" fill="#cfd8ff">🌙 NOČNÁ FORMA</text>`;
  // 🇸🇰 poradové číslo na Slovensku (server)
  if(v.seq)s+=`<rect x="${v.seq===1?334:404}" y="118" width="${v.seq===1?216:146}" height="34" rx="17" fill="${v.seq===1?"#ffcf4f":v.seq<=10?"#e3c46a":"#000"}" fill-opacity="${v.seq<=10?1:.82}"/><text x="${v.seq===1?442:477}" y="141" text-anchor="middle" font-size="15" font-weight="900" fill="${v.seq<=10?"#3b2a00":"#fff"}">${v.seq===1?"PRVÝ NA SLOVENSKU":"č. "+v.seq+" v SR"}</text>`;
  if(v.gift&&!v.n)s+=`<rect x="36" y="388" width="528" height="56" fill="#c0c8dc" fill-opacity=".9"/><text x="300" y="410" text-anchor="middle" font-size="17" font-weight="800" fill="#1b2340">🤝 DAR · posiela: ${SVGE(cutW(v.gift.from||"kamarát",14))}</text><text x="300" y="434" text-anchor="middle" font-size="15" font-weight="600" fill="#1b2340">zamávaj mu a bude celá tvoja</text>`;
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
  wrapLines(c.fact,46).slice(0,2).forEach((l,i)=>s+=`<text x="52" y="${680+i*24}" font-size="17" font-style="italic" fill="#dfe6ff">${SVGE(l)}</text>`);
  // formy (5 slotov)
  const fm=v.forms||{};s+=`<text x="52" y="${742}" font-size="20">${FORMS.map(f=>fm[f[0]]?f[1]:"·").join("  ")}</text><text x="548" y="742" text-anchor="end" font-size="14" font-weight="700" fill="#9aa6cc">FORMY ${FORMS.filter(f=>fm[f[0]]).length}/5${v.al?" · "+Object.keys(v.al).length+(Object.keys(v.al).length===1?" aerolinka":Object.keys(v.al).length<5?" aerolinky":" aeroliniek"):""}</text>`;
  // päta
  s+=`<line x1="40" x2="560" y1="766" y2="766" stroke="#fff" stroke-opacity=".1"/>
    <text x="40" y="800" font-size="22" fill="${fr[0]}">${RAR_SYM[r]}</text>
    <text x="70" y="798" font-size="15" font-weight="700" fill="#cfd8ff">${RAR[r].n}${v.ver?' <tspan fill="#6dffc7">✓</tspan>':""}</text>
    <text x="300" y="798" text-anchor="middle" font-size="13" fill="#8a94b8">${SVGE(v.fp&&v.fp.town&&!(typeof KID==="function"&&KID())?"1. úlovok: "+cutW(v.fp.town,16)+(v.fp.al&&AIRLINES[v.fp.al]?" · "+AIRLINES[v.fp.al].slice(0,12):""):v.n?"zamávané "+v.n+"× · "+new Date(v.first||Date.now()).toLocaleDateString("sk-SK"):"darovaná")}</text>
    <text x="560" y="798" text-anchor="end" font-size="14" font-weight="700" fill="#8a94b8">S1 · ${no}</text></svg>`;
  return s;
}

/* ---- Atlas v záložke Ja ---- */
let atlasOpen=false;let atlasMode="mine";let atlasRare=false;
const cardRar=k=>typeTier(k);
const inSeries=k=>CAT[k]&&!TROPHY.has(k);
// 🃏 malá kartička do mriežky: čitateľná silueta, názov, stupeň, úroveň ako bodky
function cardMini(k,v){
  const c=catGuess(k),r=typeTier(k),fr=FRAME[r],own=!!v,id="n"+k.replace(/\W/g,""),lv=own?cardLvl(v.n,k):0;
  const sh=own&&v.shiny,body=!own?"#28305a":sh?"#ffe9a8":"#f4f7ff",shade=!own?"#1a2042":sh?"#e0a800":"#c3cde6",acc=!own?"#151b36":(MAKER_COL[c.maker]||"#3d7bff");
  const sky=!own?["#0d1226","#0d1226"]:r==="l"?["#3b2a00","#ffcf4f"]:r==="e"?["#21104a","#8e5cff"]:r==="r"?["#0a2a66","#4fa3ff"]:r==="u"?["#0b4a33","#5ee0a0"]:["#1e3a73","#8fb8ff"];
  const nm=wrapLines(c.name,14).slice(0,2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><defs><linearGradient id="k${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="f${id}" x1="0" y1="0" x2="1" y2="1">${sh?'<stop offset="0" stop-color="#ff4fd8"/><stop offset=".5" stop-color="#4fc3ff"/><stop offset="1" stop-color="#ffcf4f"/>':`<stop offset="0" stop-color="${fr[0]}"/><stop offset="1" stop-color="${fr[1]}"/>`}</linearGradient>${svgDefs(id,body,shade,acc)}</defs>
    <rect x="2" y="2" width="196" height="276" rx="18" fill="url(#f${id})" ${own?"":'fill-opacity=".45"'}/><rect x="8" y="8" width="184" height="264" rx="13" fill="url(#k${id})"/>
    <g transform="translate(20 36) scale(.8)">${planeSVG(c,{box:200,body,acc,shade,id})}</g>
    <rect x="8" y="${nm.length>1?196:214}" width="184" height="${nm.length>1?76:58}" fill="#060a1a" fill-opacity=".72"/>
    ${nm.map((l,i)=>`<text x="100" y="${(nm.length>1?222:248)+i*24}" text-anchor="middle" font-family="Inter,sans-serif" font-size="19" font-weight="900" fill="${own?"#fff":"#8a94b8"}">${SVGE(l)}</text>`).join("")}
    <text x="20" y="34" font-size="20" fill="${fr[0]}">${RAR_SYM[r]}</text>
    ${own?[0,1,2,3].map(i=>`<circle cx="${132+i*14}" cy="27" r="5" fill="${i<lv?"#ffcf4f":"#fff"}" fill-opacity="${i<lv?1:.25}"/>`).join(""):""}
    ${own&&v.night?'<text x="178" y="56" text-anchor="end" font-size="16">🌙</text>':""}${own&&v.seq&&v.seq<=10?'<text x="20" y="58" font-size="15">🥇</text>':""}${own&&v.gift&&!v.n?'<text x="178" y="56" text-anchor="end" font-size="16">🤝</text>':""}</svg>`;
}
function renderCards(){
  const owned=COL.types,ownedKeys=Object.keys(owned).filter(k=>k!=="?"),inCat=ownedKeys.filter(k=>inSeries(k)&&owned[k].n).length,tot=CATALOG.filter(c=>!TROPHY.has(c[0])).length;
  const shinyN=ownedKeys.filter(k=>owned[k].shiny).length,trN=ownedKeys.filter(k=>TROPHY.has(k)).length,edN=Object.keys(COL.ed||{}).length;
  $("c-cardsN").textContent=`${inCat}/${tot}`;
  const inSet=k=>SETS.some(s=>!(COL.sets||{})[s.id]&&s.t&&s.t.includes(k)&&s.t.some(x=>owned[x]))?-1:0;
  const mine=ownedKeys.sort((x,y)=>(owned[y].first||0)-(owned[x].first||0));
  // chýba = ešte si mu nezamával (darovaná kópia 🤝 sa neráta ako vlastná)
  // 👀 typy, ktoré dnes preleteli nad tebou, idú na začiatok
  const seenT=LS.get("ctl_seenT",{}),today=SKD.format(new Date()),seenToday=k=>seenT[k]&&SKD.format(new Date(seenT[k]))===today;
  const missing=CATALOG.map(c=>c[0]).filter(k=>!(owned[k]&&owned[k].n)&&!TROPHY.has(k)).sort((x,y)=>(seenToday(y)?1:0)-(seenToday(x)?1:0)||inSet(x)-inSet(y)||RORD[typeTier(x)]-RORD[typeTier(y)]||CAT[x].no-CAT[y].no);
  const trophies=CATALOG.map(c=>c[0]).filter(k=>TROPHY.has(k));
  let list=atlasMode==="mine"?(atlasRare?mine.filter(k=>RORD[typeTier(k)]>=2&&owned[k].n):mine):atlasMode==="miss"?missing:atlasMode==="trophy"?trophies:[];
  const more=!atlasOpen&&list.length>6&&atlasMode!=="trophy"?list.length-6:0;if(more)list=list.slice(0,6);
  const tab=(m,l)=>`<button class="${atlasMode===m?"on":""}" data-m="${m}">${l}</button>`;
  $("c-types").innerHTML=`<div class="atlasTop" style="grid-column:1/-1"><div class="xp"><i style="width:${inCat/tot*100}%"></i></div>
    <div class="lookSub">Séria 1: ${inCat} z ${tot}${trN?" · 🏆 "+trN+" "+pl(trN,"trofej","trofeje","trofejí"):""}${shinyN?" · ✨ "+shinyN+" "+pl(shinyN,"lesklá","lesklé","lesklých"):""}${edN?" · 📅 "+edN+(edN===1?" edícia":edN<5?" edície":" edícií"):""}</div>
    <div class="atTabs">${tab("mine","Moje ("+ownedKeys.filter(k=>owned[k].n).length+(ownedKeys.some(k=>!owned[k].n)?" + 🤝":"")+")")}${tab("miss","Chýbajú ("+missing.length+")")}${tab("sets","Sady")}${tab("ed","Edície")}${tab("trophy","🏆 Trofeje")}</div></div>`+
    (atlasMode==="sets"?setsHTML():atlasMode==="ed"?edHTML():"")+
    (atlasMode==="miss"?wantedHTML():"")+
    (atlasMode==="trophy"?`<div class="lookSub" style="grid-column:1/-1">Legendy, ktoré nad Slovenskom takmer nelietajú. Bonus, nie povinnosť – nerátajú sa do 100 %.</div>`:"")+
    (atlasMode==="sets"||atlasMode==="ed"?"":list.length?list.map(k=>`<button class="mini ${owned[k]&&owned[k].shiny?"shiny":""} ${typeTier(k)} ${owned[k]?"":"lock"}" data-k="${esc(k)}" aria-label="${esc((CAT[k]?CAT[k].name:k)+" · "+RAR[typeTier(k)].n+(owned[k]?" · úroveň "+cardLvl(owned[k].n||1,k)+" zo 4":" · ešte nemáš"))}">${cardMini(k,owned[k])}${atlasMode==="miss"&&seenToday(k)?'<b class="seenB">👀 dnes</b>':""}</button>`).join(""):`<div class="lookSub" style="grid-column:1/-1;padding:10px 0">${atlasMode==="mine"?"Zatiaľ prázdne. Zamávaj lietadlu nad tebou (aspoň 10° nad obzorom) a získaš prvú kartičku.":"Máš celú sériu! 🏆"}</div>`);
  if(more)$("c-types").insertAdjacentHTML("beforeend",`<button class="btn sec atlasAll" style="grid-column:1/-1" data-all="1">Celý atlas · ${pl(more,"ďalšia","ďalšie","ďalších")} ${more} ›</button>`);
}
HOOKS.view.push(v=>{if(v==="col")renderCards()});
let cardK=null;
$("c-types").onclick=e=>{
  const tb=e.target.closest(".atTabs button");if(tb){atlasMode=tb.dataset.m;atlasRare=false;renderCards();return}
  const ab=e.target.closest("[data-alb]");if(ab){albumSel=ab.dataset.alb;renderCards();return}
  if(e.target.closest("[data-all]")){atlasOpen=true;renderCards();return}
  const sr=e.target.closest(".setRow");if(sr){sr.classList.toggle("open");return}
  const sl=e.target.closest("[data-lk]");if(sl){const k=sl.dataset.lk;if(COL.types[k]){cardK=k;openCard(k)}else openLocked(k);return}
  const m=e.target.closest(".mini");if(!m)return;const k=m.dataset.k;
  if(!COL.types[k]){openLocked(k);haptic(20);return}
  cardK=k;openCard(k);
};
function openCard(k,reveal){$("cardM").classList.remove("locked");
  const v=COL.types[k];if(!v)return;const r=typeTier(k);
  const own=Object.keys(COL.types).filter(x=>inSeries(x)&&COL.types[x].n).length,tot=CATALOG.filter(c=>!TROPHY.has(c[0])).length;
  const face=()=>{$("cardShare").style.visibility="";$("cardShare").style.display=v.n?"":"none";if($("cardVideo"))$("cardVideo").hidden=!v.n;if($("cardVideo"))$("cardVideo").style.visibility="";$("cardBig").innerHTML=(reveal?`<div class="revealHd">${v.shiny?"…a je ✨ LESKLÁ!":RAR[r].s+" Nová kartička: "+RAR[r].n+"!"}<small>${own}. z ${tot} typov v tvojom atlase · ${v.ver?"✓ Overená"+(v.seq?" · č. "+v.seq+" na Slovensku":""):"⏳ zatiaľ neoverená"}</small></div>`:"")+`<div class="holoWrap ${r} ${v.shiny?"shiny":""} ${reveal?"reveal":""}">${cardSVG(k,v,{id:"b"})}</div>`+cardExtras(k,v);
    cardStat(k);if(reveal){if(RORD[r]>=3){confetti(r==="l"?160:90);haptic(r==="l"?[60,80,60,80,200]:[20,40,20])}ping(r)}};
  $("cardM").classList.add("on");bindTilt();
  if($("cardVideo"))$("cardVideo").hidden=!vidOK()||!v.n;
  if(reveal&&!(typeof RM==="function"&&RM())){
    // ⏳ odhalenie s napätím: rub kartičky žiari farbou stupňa, čím vzácnejšia, tým dlhšie
    const d=450+RORD[r]*450;
    $("cardShare").style.visibility="hidden";if($("cardVideo"))$("cardVideo").style.visibility="hidden";
    $("cardBig").innerHTML=`<div class="revealHd">Čo ti priletelo?<small>ťukni na kartičku</small></div><div class="cardBack ${r}" role="button" aria-label="Otočiť kartičku"><b>✈️</b><span>Atlas oblohy</span></div>`;
    haptic(15);const bk=$("cardBig").querySelector(".cardBack");let done=false;const go=()=>{if(done)return;done=true;face()};
    bk.onclick=go;setTimeout(go,d+600);
  }else{face();haptic(15)}
}
function cardExtras(k,v){
  const r=typeTier(k),fm=v.forms||{},al=v.al?Object.keys(v.al):[];
  const verL=v.ver?`<div class="verOk">✓ Overená${v.seq?" · č. "+v.seq+" na Slovensku":""}</div>`:v.n?`<div class="verNo">⏳ Zatiaľ neoverená · <button data-why="1" style="display:inline;margin:0">🔎 Prečo?</button><div class="whyList" id="whyList"></div></div>`:"";
  let h=`<div class="cardInfo">${verL}${v.n?`<div class="lookSub" style="text-align:center">${stars(cardLvl(v.n,k))} · zamávané ${v.n}× · ${nextLv(v.n,k)?"ďalšia ★ pri "+nextLv(v.n,k)+". úlovku":"max. úroveň – veterán"}</div>`:""}<div class="lookSub" id="cardStat"></div>`;
  // tlačidlá hneď pod kartičkou (na malom displeji nie sú schované pod lištou)
  if(v.n){h+=`<div class="cardBtns">`;const pin=(COL.show||[]).includes(k);h+=`<button class="btn sec" data-pin="${esc(k)}">${pin?"📌 Vo vitríne":"📌 Do vitríny"}</button>`;
    if(["c","u"].includes(r)&&(v.n|0)>=2&&!(typeof KID==="function"&&KID()))h+=v.ver?`<button class="btn sec" data-gift="${esc(k)}">🎁 Daruj kópiu</button>`:`<button class="btn sec" disabled title="Darovať sa dá len overená kartička">🎁 Daruj (po overení)</button>`;
    h+=`</div>`}
  // formy: podmienka priamo pod ikonou (title na iPhone nevidieť)
  h+=`<div class="formRow">${FORMS.map(f=>`<span class="${fm[f[0]]?"on":""}" title="${f[2]}: ${f[3]}">${f[1]}<small>${fm[f[0]]?f[2]:f[3]}</small></span>`).join("")}</div>`;
  // mesto je už v päte kartičky – tu len to, čo tam nie je (kam letel, výška, dátum)
  if(v.fp&&(v.fp.dest||v.fp.alt||v.fp.t))h+=`<div class="lookSub">🧾 Pri prvom úlovku${v.fp.t?" ("+new Date(v.fp.t).toLocaleDateString("sk-SK",{day:"numeric",month:"numeric",year:"numeric"})+")":""}${v.fp.dest?" letel → "+esc(v.fp.dest):""}${v.fp.alt?" · "+nf(v.fp.alt).replace(/\s/g,"\u00a0")+"\u00a0m":""}</div>`;
  if(al.length)h+=`<div class="lookSub">🎨 Aerolinky na tejto kartičke: ${al.map(x=>esc(AIRLINES[x]||x)).join(", ")}</div>`;
  return h+`</div>`;
}
// 🇸🇰 „Má ju X % hráčov“ + objaviteľ (server)
async function cardStat(k){
  if(!SOC.api)return;try{const {ok,j}=await getJSON(SOC.api+"/api/cardstat?type="+encodeURIComponent(k),5000);const el=$("cardStat");if(!ok||!j||!el)return;
    const pct=j.players?Math.max(.1,Math.round(j.own/j.players*1000)/10):0;
    if(!j.own&&COL.types[k]&&COL.types[k].ver){el.innerHTML="";return}
    el.innerHTML=(j.own?`🇸🇰 Na Slovensku ju ${j.own>=2&&j.own<=4?"majú":"má"} ${nf(j.own)} ${pl(j.own,"spotter","spotteri","spotterov")}${j.players?" ("+String(pct).replace(".",",")+" %)":""}`:"🇸🇰 Na Slovensku ju ešte nikto nemá overenú – buď prvý!")+(j.first?`<br>🧭 Objaviteľ: <b>${esc(j.first.nick)}</b>${j.first.town?" · "+esc(j.first.town):""} · ${new Date(j.first.t).toLocaleDateString("sk-SK")}`:"")}catch(e){}
}
$("cardBig").addEventListener("click",async e=>{
  const pn=e.target.closest("[data-pin]");if(pn){const k=pn.dataset.pin;COL.show=COL.show||[];const i=COL.show.indexOf(k);
    if(i>=0)COL.show.splice(i,1);else{if(COL.show.length>=showSlots()){toast("🏛️ Vitrína je plná","Ďalšie miesto si odomkneš za míle ✈ v obchode");return}COL.show.push(k)}
    LS.set("ctl_col",COL);pn.textContent=COL.show.includes(k)?"📌 Vo vitríne":"📌 Do vitríny";renderShow();haptic(10);return}
  const gf=e.target.closest("[data-gift]");if(gf)giftMake(gf.dataset.gift);
  if(e.target.closest("[data-why]"))whyShow();
});
$("cardClose").onclick=()=>$("cardM").classList.remove("on");
function tiltTo(rx,ry){const c=$("cardBig").firstElementChild;if(!c)return;if(typeof RM==="function"&&RM()){rx=0;ry=0}c.style.setProperty("--rx",rx+"deg");c.style.setProperty("--ry",ry+"deg");c.style.setProperty("--mx",(50+ry*3)+"%");c.style.setProperty("--my",(50-rx*3)+"%");c.style.setProperty("--ang",(ry*10+rx*6)+"deg")}
let tiltBound=false;
function bindTilt(){
  if(tiltBound)return;tiltBound=true;
  addEventListener("deviceorientation",e=>{if(!$("cardM").classList.contains("on")||e.beta==null)return;tiltTo(Math.max(-16,Math.min(16,(e.beta-45)/2)),Math.max(-16,Math.min(16,(e.gamma||0)/1.5)))});
  // náklon len pri pohybe prsta nad samotnou kartičkou (nie pri ťuknutí na tlačidlá pod ňou)
  $("cardBig").addEventListener("pointermove",e=>{const el=e.target.closest(".holoWrap");if(!el){tiltTo(0,0);return}const r=el.getBoundingClientRect();tiltTo(-((e.clientY-r.top)/r.height-.5)*26,((e.clientX-r.left)/r.width-.5)*26)});
  $("cardBig").addEventListener("pointerleave",()=>tiltTo(0,0));
}
/* ---- varianty pri ulovení: ✨ shiny určí server (lietadlo + deň), formy podľa oblohy, poradie v SR ---- */
let LASTWAVE=null;
HOOKS.caught.push(a=>{
  const ty=a.type||"?",v=COL.types[ty];if(!v)return;
  const W=LASTWAVE&&LASTWAVE.hex===a.hex?LASTWAVE:null;let msg=null;
  if(W&&W.shiny){v.shinyN=(v.shinyN|0)+1;if(!v.shiny){v.shiny=Date.now();msg=["✨ LESKLÁ KARTIČKA!",(v.name||ty)+" – dnes je toto lietadlo lesklé pre všetkých, čo mu zamávajú"]}}
  if(W&&W.seq&&!v.seq)v.seq=W.seq;
  if(W&&(W.firstK||W.firstT)&&W.seq!==1){v.firstK=W.firstK?1:0;v.firstT=W.firstT?1:0}
  if(W&&W.ed){COL.ed=COL.ed||{};if(!COL.ed[W.ed.id]){COL.ed[W.ed.id]={n:W.ed.n,no:W.ed.no,t:Date.now(),ty};msg=msg||["📅 Edícia: "+W.ed.n,"Tvoja kartička má číslo "+W.ed.no+" – bol si pri tom!"]}}
  // formy
  v.forms=v.forms||{};const sa=typeof SPACE!=="undefined"?SPACE.sunAlt():null,c=COL.cx&&COL.cx[a.hex],fm=v.forms,got=[];
  const set=(k)=>{if(!fm[k]){fm[k]=Date.now();got.push(FORMS.find(f=>f[0]===k))}};
  if(sa!=null&&sa<-6&&a.el>=20)set("n");
  if(sa!=null&&sa>-4&&sa<6)set("g");
  if(a.el>=80)set("z");
  if(c&&c.dc==="SK")set("h");
  try{if(WX&&WX.data&&WX.data.current&&WX.data.current.temperature_2m<0)set("f")}catch(e){}
  if(fm.n&&!v.night)v.night=fm.n;
  if(got.length&&!msg)msg=[got[0][1]+" Nová forma: "+got[0][2],(v.name||ty)+" · formy "+FORMS.filter(f=>fm[f[0]]).length+"/5"];
  if(v.gift&&v.n===1){v.gift.done=1;COL.pts+=5;msg=msg||["🤝 Splnený sľub!",(v.name||ty)+" – darovaná kartička je teraz celá tvoja · +5 b"]}
  if(!CAT[ty]&&!v.offset){v.offset=1;msg=msg||["⭐ Mimo série!",(v.name||ty)+" – typ, ktorý nie je ani v atlase"]}
  LS.set("ctl_col",COL);
  if(msg)setTimeout(()=>{toast(msg[0],msg[1],"#ff4fd8");if(msg[0].includes("LESKLÁ")){confetti(110);haptic([40,60,40,60,120])}},typeof WB!=="undefined"&&WB?0:3500);
});
$("cardShare").onclick=async()=>{
  const v=COL.types[cardK];if(!v)return;
  const svg=cardSVG(cardK,v,{id:"s"}),img=new Image(),W=1080,H=1920;
  img.onload=()=>{
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#0d1430");g.addColorStop(1,v.shiny?"#5a1f6b":{c:"#1b2a6b",u:"#0b4a33",r:"#0a2a66",e:"#3a1670",l:"#5a3d00"}[typeTier(cardK)]);x.fillStyle=g;x.fillRect(0,0,W,H);
    for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.6})`;x.beginPath();x.arc(Math.random()*W,Math.random()*H,Math.random()*2.2,0,7);x.fill()}
    // osobná trofej, obsah v bezpečnej zóne príbehu (Instagram: 250–1600 px), spodok voľný na nálepky
    const kid=typeof KID==="function"&&KID(),nk=kid?"":(LS.get("ctl_nick","")||""),fp=v.fp||{},town=kid?"":(fp.town||"");
    const when=new Date(fp.t||v.first||Date.now()).toLocaleString("sk-SK",{day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"});
    x.textAlign="center";x.fillStyle="#fff";x.font="800 50px Unbounded, sans-serif";x.fillText(v.shiny?"✨ Mám lesklú kartičku!":"👋 Zamával(a) som mu"+(town?"":"!"),W/2,290);
    x.font="600 38px Inter, sans-serif";x.fillStyle="rgba(255,255,255,.88)";x.fillText([town?"nad "+town:"",when,nk].filter(Boolean).join(" · "),W/2,345);
    x.drawImage(img,(W-750)/2,390,750,1050);
    x.font="800 40px Inter, sans-serif";x.fillStyle=v.ver?"#6dffc7":"rgba(255,255,255,.6)";x.fillText(v.ver?"✓ Overená"+(v.seq?" · č. "+v.seq+" na Slovensku":""):"⏳ zatiaľ neoverená",W/2,1495);
    x.fillStyle="#6dffc7";x.font="900 52px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,1565);
    x.fillStyle="rgba(255,255,255,.85)";x.font="500 32px Inter, sans-serif";x.fillText("Zamávaj aj ty → "+APP_HOST,W/2,1612);
    const q=["s="+(v.shiny?1:0),v.ver&&v.seq?"n="+v.seq:"",nk?"nk="+encodeURIComponent(nk):""].filter(Boolean).join("&");
    c.toBlob(b=>b&&shareBlob(b,"kartička.png",(v.shiny?"✨ Lesklá ":"")+"kartička: "+(catGuess(cardK).name)+(v.ver&&v.seq?" · č. "+v.seq+" na Slovensku":"")+" ✈️ "+shareUrl("c",cardK,q)+TAGS),"image/png");
  };
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
};

/* ============ 📚 zberateľské sady a albumy ============ */
// typové sady – každá kartička série patrí aspoň do jednej
const SETS_T=[
  {id:"a320",i:"✈️",n:"Rodina A320",d:"Najčastejšie lietadlá nad Slovenskom",t:["A318","A319","A320","A321","A20N","A21N"]},
  {id:"b737",i:"🛫",n:"Rodina 737",d:"Od klasiky po MAX",t:["B737","B738","B739","B38M","B39M"]},
  {id:"jumbo",i:"🐘",n:"Obri oblohy",d:"Najväčšie dopravné lietadlá",t:["A388","B744","B748","B77W","A35K"]},
  {id:"dream",i:"🌙",n:"Dreamlinery a spol.",d:"Moderné diaľkové stroje",t:["B788","B789","B78X","A359","A339"]},
  {id:"a330",i:"🌍",n:"Rodina A330/A340",d:"Diaľkové Airbusy",t:["A332","A333","A339","A343","A346"]},
  {id:"b7x7",i:"🇺🇸",n:"Boeing 7x7 klasika",d:"Staré dobré Boeingy",t:["B752","B763","B764","B772","B77L"]},
  {id:"baby",i:"🛫",n:"Baby jety",d:"Malé prúdové dopravné",t:["BCS1","BCS3","CRJ7","CRJ9","CRJ2"]},
  {id:"emb",i:"🇧🇷",n:"Embraery",d:"Menšie prúdové lietadlá",t:["E190","E195","E290","E295","E75L"]},
  {id:"prop",i:"🌀",n:"Vrtuľové",d:"Turbovrtuľové regionálky",t:["AT43","AT75","AT76","DH8D"]},
  {id:"heli",i:"🚁",n:"Záchranári a vrtuľníky",d:"Pozor, lietajú nízko",t:["B429","EC35","EC45","A109","A139","R44","B06"]},
  {id:"biz",i:"💼",n:"Biznis jety",d:"Súkromné tryskáče",t:["GLF6","GLF5","GL7T","GLEX","C68A","CL35","FA7X","PC24","LJ45","E55P","C56X"]},
  {id:"tprop",i:"🛩️",n:"Turbovrtuľové súkromné",d:"King Air, TBM a spol.",t:["BE20","TBM9","PC12","C208"]},
  {id:"heavy",i:"🏋️",n:"Ťažké transporty",d:"Nákladné a vojenské obry",t:["A400","C17","C130","C30J","MD11","AN12"]},
  {id:"nato",i:"🎖️",n:"NATO nad nami",d:"Tankery, AWACS a transporty",t:["E3TF","K35R","C17","A400","C130"]},
  {id:"guard",i:"🛡️",n:"Strážcovia neba",d:"Stíhačky a cvičné tryskáče",t:["F16","GRIF","EUFI","L39"]},
  {id:"cssr",i:"🇸🇰",n:"Made in ČSSR a naši",d:"Domáce legendy a slovenské letectvo",t:["L39","L410","C27J","H60","MI8"]},
  {id:"para",i:"🪂",n:"Parašutisti",d:"Výsadkové lietadlá",t:["AN2","L410","C208"]},
  {id:"small",i:"🛩️",n:"Malé lietadielka",d:"Aerokluby a súkromníci",t:["C152","C172","P28A","SR22","DA40"]},
  {id:"whale",i:"🐳",n:"Lietajúce veľryby",d:"Trofeje – nad SR takmer nikdy",t:["A3ST","A337","BLCF","A124"]},
].map(s=>({...s,alb:"typ",t:s.t.filter(k=>CAT[k])})).filter(s=>s.t.length>=3);
// album Chvosty: aerolinky (skupiny kódov = jeden slot)
const AL_SETS=[
  ["lowcost","💸","Lowcost liga",[["Ryanair","RYR RUK LDM MAY"],["Wizz Air","WZZ WMT WUK WAZ"],["easyJet","EZY EJU EZS"],["Eurowings","EWG"],["Transavia","TRA"],["Vueling","VLG"],["Pegasus","PGT"],["Norwegian","NOZ NSZ"]]],
  ["lhg","🦅","Lufthansa Group",[["Lufthansa","DLH"],["Austrian","AUA"],["Swiss","SWR"],["Eurowings","EWG"],["Brussels","BEL"],["ITA","ITY"]]],
  ["sused","🧭","Vlajkoví dopravcovia susedov",[["Czech/Smartwings","CSA TVS"],["LOT","LOT"],["TAROM","ROT"],["airBaltic","BTI"],["Croatia","CTN"],["Air Serbia","ASL"],["Aegean","AEE"]]],
  ["gulf","🕌","Zálivoví obri",[["Emirates","UAE"],["Qatar","QTR"],["Etihad","ETD"],["flydubai","FDB"],["Saudia","SVA"]]],
  ["east","🐉","Ďaleký východ",[["Singapore","SIA"],["Cathay","CPA"],["Air China","CCA"],["China Eastern","CES"],["China Southern","CSN"],["Korean","KAL"],["Air India","AIC"]]],
  ["atl","🗽","Cez Atlantik",[["American","AAL"],["United","UAL"],["Delta","DAL"],["Air Canada","ACA"]]],
  ["cargo","📦","Kuriéri",[["DHL","DHK BCS DHX"],["UPS","UPS"],["FedEx","FDX"],["Cargolux","CLX"],["Lufthansa Cargo","GEC"],["ASL","ABR"],["Kalitta","CKS"],["Atlas","GTI"]]],
  ["natoAF","🎖️","Letectvá NATO",[["USAF","RCH"],["Nemecko","GAF"],["Taliansko","IAM"],["Česko","CEF"],["Poľsko","PLF"],["Maďarsko","HUF"],["Belgicko","BAF"],["Francúzsko","FAF"],["RAF","RRR"],["NATO","NATO"]]],
].map(([id,i,n,sl])=>({id:"al_"+id,i,n,d:"Album Chvosty · aerolinky",alb:"al",slots:sl.map(([l,c])=>({l,m:x=>c.split(" ").includes(x.al)||(c==="NATO"&&/^NATO/.test(x.al))}))}));
// album Pečiatky: krajiny cieľa alebo odletu
const CT_SETS=[
  ["sused","🤝","Susedia","AT CZ PL HU UA"],["more","🌊","K moru","HR GR IT ES PT TR CY MT EG TN"],["zapad","🗼","Západ","GB IE FR BE NL DE CH LU"],
  ["sever","❄️","Sever","NO SE FI DK IS"],["balkan","🌄","Balkán","SI RS BA ME MK AL BG RO"],["blv","🏜️","Blízky východ","AE QA SA IL JO KW BH OM"],
  ["dv","🏯","Ďaleký východ","CN JP KR IN SG TH HK VN"],["ocean","🌎","Za oceánom","US CA MX BR"],["afr","🦁","Afrika","EG MA TN KE ET ZA"],
].map(([id,i,n,cs])=>({id:"ct_"+id,i,n,d:"Album Pečiatky · krajiny",alb:"ct",slots:cs.split(" ").map(c=>({l:c,m:x=>x.dc===c||x.oc===c}))}));
// album Rekordy a skryté sady
const REC_SETS=[
  {id:"rc_hi",i:"🏔️",n:"Výškari",d:"Album Rekordy",alb:"rec",slots:[[11500,"nad 11 500 m"],[12500,"nad 12 500 m"],[13500,"nad 13 500 m"]].map(([h,l])=>({l,m:x=>x.alt>=h}))},
  {id:"rc_lo",i:"🛬",n:"Nízkoletci",d:"Album Rekordy",alb:"rec",slots:[[1500,"pod 1 500 m"],[800,"pod 800 m"],[400,"pod 400 m"]].map(([h,l])=>({l,m:x=>x.alt!=null&&x.alt<h}))},
  {id:"rc_sp",i:"⚡",n:"Rýchlici",d:"Album Rekordy",alb:"rec",slots:[[950,"nad 950 km/h"],[1050,"nad 1 050 km/h"],[1150,"nad 1 150 km/h"]].map(([v,l])=>({l,m:x=>x.spd>=v}))},
  {id:"rc_ze",i:"🎯",n:"Zenit",d:"Album Rekordy",alb:"rec",slots:[[80,"80°+"],[85,"85°+"],[88,"88°+"]].map(([v,l])=>({l,m:x=>x.el>=v}))},
  {id:"rc_hr",i:"🕐",n:"Deň a noc",d:"Úlovok v každej hodine dňa",alb:"rec",slots:Array.from({length:24},(_,h)=>({l:h+" h",m:x=>new Date(x.t).getHours()===h}))},
];
const HID_SETS=[
  {id:"h_abcd",i:"✉️",n:"A-B-C-D Airbusu",d:"Počítaj od najmenšieho.",alb:"hid",b:50,t:["A318","A319","A320","A321"]},
  {id:"h_om",i:"✉️",n:"Slovenské chvosty",d:"Hľadaj slovenské lietadlá (registrácia OM- na chvoste).",alb:"hid",b:50,slots:[1,5,15].map(n=>({l:n+"× 🇸🇰 OM-",m:()=>Object.keys(COL.om||{}).length>=n}))},
  {id:"h_quad",i:"✉️",n:"Štvorlístok",d:"Štyri motory, štyri typy.",alb:"hid",b:50,t:["A388","B744","B748","A343","A346"].slice(0,4)},
];
const SETS=[...SETS_T,...AL_SETS,...CT_SETS,...REC_SETS,...HID_SETS];
const ALBUMS=[["typ","🃏 Typy"],["al","💺 Chvosty"],["ct","🛂 Pečiatky"],["rec","📈 Rekordy"],["hid","✉️ Skryté"]];
let albumSel="typ";
// koľko slotov sady je splnených
function setProg(s){
  if(s.t)return s.t.map(k=>!!(COL.types[k]&&COL.types[k].n));
  const cx=Object.values(COL.cx||{});return s.slots.map(sl=>cx.some(sl.m)||(sl.m.length===0&&sl.m()));
}
// odmena: 1,5× hodnota kartičiek sady, min. 25 b
const setReward=s=>s.b||(s.t?Math.max(25,Math.round(1.5*s.t.reduce((a,k)=>a+RAR[typeTier(k)].p,0))):Math.max(25,s.slots.length*8));
// úroveň ★ podľa vzácnosti: bežnú A320 nevymaxuješ za týždeň, legendu stačí pár razy
const LVT={c:[1,5,20,60],u:[1,3,10,25],r:[1,2,5,10],e:[1,2,3,5],l:[1,2,3,5]};
const lvTab=k=>LVT[typeTier(k)]||LVT.u;
const CARD_LV=LVT.u;
const cardLvl=(n,k)=>lvTab(k).filter(x=>n>=x).length;
const nextLv=(n,k)=>lvTab(k).find(x=>x>n);
const stars=l=>"★".repeat(l)+"☆".repeat(4-l);
function monthKey(){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava",year:"numeric",month:"2-digit"}).format(new Date())}
const _mkF=new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Bratislava",year:"numeric",month:"2-digit"}),mkOf=t=>_mkF.format(new Date(t));
// mesačná výzva: 3 nové čokoľvek – typ, aerolinka na kartičke, krajina alebo OM- (nevyčerpá sa ani spotterovi)
function monthNew(){const mk=monthKey();let n=Object.values(COL.types).filter(v=>v.first&&v.n&&mkOf(v.first)===mk).length;
  const cx=Object.values(COL.cx||{}),old=cx.filter(c=>mkOf(c.t)!==mk),cur=cx.filter(c=>mkOf(c.t)===mk);
  const oldAl=new Set(old.map(c=>c.ty+":"+c.al)),oldC=new Set(old.map(c=>c.dc));
  n+=new Set(cur.filter(c=>c.al&&!oldAl.has(c.ty+":"+c.al)).map(c=>c.ty+":"+c.al)).size;
  n+=new Set(cur.filter(c=>c.dc&&!oldC.has(c.dc)).map(c=>c.dc)).size;
  n+=Object.values(COL.om||{}).filter(t=>mkOf(t)===mk).length;return n}
const MONTH_GOAL=3,MONTH_BONUS=40;
function monthHTML(){
  const mn=monthNew(),mdone=(COL.month||"")===monthKey();
  const mname=new Date().toLocaleDateString("sk-SK",{month:"long"});
  return `<div class="monthly" style="grid-column:1/-1">🗓️ <b>Mesačná výzva (${mname}):</b> ${MONTH_GOAL} nové objavy – typ, aerolinka, krajina alebo slovenské lietadlo (OM-) · ${Math.min(mn,MONTH_GOAL)}/${MONTH_GOAL}${mdone?" ✅ +"+MONTH_BONUS+" b":" · odmena +"+MONTH_BONUS+" b"}</div>`;
}
function setsHTML(){
  COL.sets=COL.sets||{};
  const list=SETS.filter(s=>s.alb===albumSel),done=list.filter(s=>COL.sets[s.id]).length;
  return `<div class="albums" style="grid-column:1/-1">${ALBUMS.map(([a,l])=>{const L=SETS.filter(s=>s.alb===a),d=L.filter(s=>COL.sets[s.id]).length;return `<button class="${albumSel===a?"on":""}" data-alb="${a}">${l}<small>${d}/${L.length}</small></button>`}).join("")}</div>
  <div class="sets">${list.map(s=>{const pr=setProg(s),h=pr.filter(Boolean).length,dn=!!COL.sets[s.id],hid=s.alb==="hid"&&!dn&&h===0;
    const lab=(x,i)=>s.t?(CAT[s.t[i]]?CAT[s.t[i]].name:s.t[i]):s.slots[i].l;
    return `<div class="setRow ${dn?"done":""}" role="button" tabindex="0"><span class="si" aria-hidden="true">${hid?"✉️":s.i}</span><span class="sn">${hid?"Skrytá sada":s.n}<small>${hid?"Hádanka: "+s.d:s.d} · ${dn?"hotovo ✅":"odmena +"+setReward(s)+"\u00a0b"}</small></span><span class="sp">${dn?"✅":h+"/"+pr.length} ›</span>
      <div class="setSlots">${hid?"":pr.map((ok,i)=>s.t?`<button data-lk="${esc(s.t[i])}" class="${ok?"got":""}">${ok?"✅":"🔒"} ${esc(lab(ok,i))}</button>`:`<span class="${ok?"got":""}">${ok?"✅":"🔒"} ${esc(lab(ok,i))}</span>`).join("")}</div></div>`}).join("")}</div>`;
}
function setsCheck(a){
  COL.sets=COL.sets||{};let msg=null;
  for(const s of SETS){if(COL.sets[s.id])continue;if(setProg(s).every(Boolean)){const b=setReward(s);COL.sets[s.id]=Date.now();COL.pts+=b;msg=["📚 Kompletná sada: "+s.n,"+"+b+" bodov"+(s.alb==="hid"?" · odhalil si skrytú sadu!":"")]}}
  const mk=monthKey();if(COL.month!==mk&&monthNew()>=MONTH_GOAL){COL.month=mk;COL.pts+=MONTH_BONUS;msg=msg||["🗓️ Mesačná výzva splnená!","+"+MONTH_BONUS+" bodov za "+MONTH_GOAL+" nové objavy"]}
  if(msg){LS.set("ctl_col",COL);setTimeout(()=>{toast(msg[0],msg[1],"#ffcf4f");confetti(90)},typeof WB!=="undefined"&&WB?0:3600)}
}
/* 📅 edície „Bol som pri tom“ – číslované serverom, zmeškané sa nedajú doplniť */
const EDS=[["santa2026","🛷","Santa 2026","24. 12. 2026"],["silvester2026","🎆","Posledné lietadlo 2026","31. 12. 2026 večer"],["novyrok2027","🥂","Prvé lietadlo 2027","1. 1. 2027"],["valentin2027","❤️","Valentínske lietadlo 2027","14. 2. 2027"],["rovnodennost2027","🌗","Jarná rovnodennosť 2027","20. 3. 2027"],["stefanik2027","⭐","Deň Štefánika 2027","4. 5. 2027"],["detom2027","🧒","Deň detí 2027","1. 6. 2027"],["slnovrat2027","☀️","Letný slnovrat 2027","21. 6. 2027"],["zatmenie2027","🌘","Zatmenie Slnka 2027","2. 8. 2027, 10:10–12:30 (do Slnka nepozeraj!)"],["perzeidy2027","🌠","Noc Perzeíd 2027","12./13. 8. 2027"],["snp2027","🇸🇰","Výročie SNP 2027","29. 8. 2027"],["halloween2027","🎃","Strašidelné lietadlo 2027","31. 10. 2027 po zotmení"]];
function edHTML(){
  const E=COL.ed||{};
  return `<div class="lookSub" style="grid-column:1/-1">Kartičky „Bol som pri tom“: stačí v daný deň zamávať akémukoľvek lietadlu. Majú poradové číslo a zmeškané sa nedajú doplniť.</div><div class="sets" style="grid-column:1/-1">${EDS.map(([id,i,n,w])=>{const g=E[id];return `<div class="setRow ${g?"done":""}"><span class="si">${i}</span><span class="sn">${n}<small>${g?(g.no?"č. "+g.no+" · ":"")+new Date(g.t).toLocaleDateString("sk-SK"):w}</small></span><span class="sp">${g?"✅":"📅"}</span></div>`}).join("")}</div>`;
}
// opakovaný úlovok toho istého typu zvyšuje úroveň kartičky
HOOKS.caught.push(a=>{
  const v=COL.types[a.type||"?"];if(!v)return;
  const l=cardLvl(v.n,a.type),pl=cardLvl(v.n-1,a.type);
  if(v.n>1&&l>pl)setTimeout(()=>toast("⭐ Kartička povýšená: "+(v.name||a.type),stars(l)+" · zamávané "+v.n+"×","#ffcf4f"),typeof WB!=="undefined"&&WB?0:2600);
  setsCheck(a);
});
// do atlasu: sady nad kartičkami, hviezdy na kartičkách
{const base=renderCards;renderCards=function(){setsCheck();base();
  const top=$("c-types").querySelector(".atlasTop");if(top&&(atlasMode==="mine"||atlasMode==="sets"))top.insertAdjacentHTML("afterend",monthHTML());}}

/* 📖 Encyklopédia: aj neulovené lietadlo má svoju stránku – vieš, čo hľadať */
function openLocked(k){
  const c=CAT[k];if(!c){toast("🔒 "+k,"Toto lietadlo ešte v zbierke nemáš. Pozeraj hore!");return}
  const r=cardRar(k),nf2=n=>n==null?"–":Number(n).toLocaleString("sk-SK");
  const hint=r==="l"?"Legendárne – nad Slovenskom ho uvidíš len párkrát do roka. Keď poletí pri tebe, appka ti dá vedieť (ak máš zapnuté upozornenia).":r==="e"?"Epické – vojenské a špeciálne lietadlá, nad Slovenskom len občas. Sleduj oblohu pri cvičeniach a leteckých dňoch.":r==="r"?"Vzácne – občas preletí, najčastejšie na diaľkových linkách vysoko nad nami.":r==="u"?"Menej bežné – oplatí sa pozerať hore ráno a podvečer.":"Bežné – nad Slovenskom lieta denne. Stačí pozrieť hore a zamávať.";
  $("cardBig").innerHTML=`<div class="mcard lockedCard" style="text-align:left">
    <div class="lbl"><span>📖 Atlas · č. ${c.no}</span><span>🔒 neulovené</span></div>
    <div class="lockSil">${cardMini(k,undefined)}</div>
    <div style="font-size:26px;font-weight:900;margin:6px 0 2px">${esc(c.name)}</div>
    <div class="lookSub">${esc(c.maker)} · ${RAR[r].n}</div>
    <div class="lockStats">
      <div><b>${nf2(c.len)} m</b><small>dĺžka</small></div><div><b>${nf2(c.span)} m</b><small>rozpätie</small></div>
      <div><b>${c.seats?nf2(c.seats):"—"}</b><small>${c.seats?pl(c.seats,"miesto","miesta","miest"):"náklad"}</small></div><div><b>${nf2(c.range)} km</b><small>dolet</small></div>
      <div><b>${nf2(c.spd)} km/h</b><small>rýchlosť</small></div><div><b>${c.year||"–"}</b><small>prvý let</small></div>
    </div>
    <p style="margin:12px 0 6px;line-height:1.45">💡 ${esc(c.fact)}</p>
    <p class="lookSub" style="margin:0">🔭 ${hint}</p>
    ${(()=>{const ls=lastSeenType(k);return ls?`<p class="lookSub" style="margin:8px 0 0">👀 Naposledy nad tebou: ${ls}</p>`:""})()}
    ${["c","u"].includes(r)&&!(typeof KID==="function"&&KID())?`<div class="acts" style="margin-top:8px"><button class="btn sec" data-ask="${esc(k)}">🤝 Popros kamaráta o kópiu</button></div>`:""}
    <div class="acts" style="margin-top:8px"><button class="btn ${typeWatched(k)?"sec":"pri"}" data-watch="${esc(k)}">${typeWatched(k)?"🔔 Upozorním ťa – zrušiť":"🔔 Upozorni ma, keď poletí nado mnou"}</button></div>
  </div>`;
  $("cardShare").style.display="none";$("cardM").classList.add("on","locked");
}
{const cl=$("cardClose").onclick;$("cardClose").onclick=()=>{$("cardShare").style.display="";$("cardM").classList.remove("locked");cl()}}
const _ol=openLocked;openLocked=k=>{_ol(k);if($("cardVideo"))$("cardVideo").hidden=true};

/* 🎬 6-sekundové video s odhalením kartičky (na TikTok/Reels/stories), bez hudby */
function vidOK(){return typeof MediaRecorder!=="undefined"&&!!HTMLCanvasElement.prototype.captureStream}
function vidMime(){for(const m of ["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"])try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}return ""}
if($("cardVideo"))$("cardVideo").onclick=()=>{
  const v=COL.types[cardK];if(!v||!vidOK())return;
  const btn=$("cardVideo");btn.disabled=true;btn.textContent="⏳";
  const done=()=>{btn.disabled=false;btn.textContent="🎬"};
  const img=new Image(),W=720,H=1280,CW=560,CH=784;
  img.onload=()=>{
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
    const stars=Array.from({length:90},()=>[Math.random()*W,Math.random()*H,Math.random()*2+.4,Math.random()*6]);
    const sp=Array.from({length:40},()=>[Math.random()*Math.PI*2,120+Math.random()*320,Math.random()*.6+.4]);
    const name=catGuess(cardK).name,shiny=!!v.shiny,col=shiny?"#ff4fd8":(RAR[typeTier(cardK)]||RAR.c).col;
    // dôkaz na konci videa: poradie, mesto, overenie, prezývka
    const kidV=typeof KID==="function"&&KID(),proof=[v.ver?"✓ Overená"+(v.seq?" · č. "+v.seq+" na Slovensku":""):"",!kidV&&v.fp&&v.fp.town?"nad "+v.fp.town:"",!kidV?LS.get("ctl_nick",""):""].filter(Boolean).join(" · ");
    const mime=vidMime(),st=c.captureStream(30),rec=new MediaRecorder(st,mime?{mimeType:mime,videoBitsPerSecond:4e6}:{}),chunks=[];
    rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    rec.onstop=()=>{done();const b=new Blob(chunks,{type:(mime||"video/webm").split(";")[0]});if(b.size)grantAch("video");shareBlob(b,"kartička."+(b.type.includes("mp4")?"mp4":"webm"),(shiny?"✨ Lesklá ":"")+"kartička: "+name+" ✈️ "+shareUrl("c",cardK,["s="+(shiny?1:0),v.ver&&v.seq?"n="+v.seq:""].filter(Boolean).join("&"))+TAGS)};
    const T=6000,t0=performance.now();
    const frame=now=>{
      const t=Math.min(1,(now-t0)/T),ms=now-t0;
      const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#0d1430");g.addColorStop(1,shiny?"#5a1f6b":"#1b2a6b");x.fillStyle=g;x.fillRect(0,0,W,H);
      for(const s of stars){x.fillStyle=`rgba(255,255,255,${.3+.3*Math.sin(ms/400+s[3])})`;x.beginPath();x.arc(s[0],s[1],s[2],0,7);x.fill()}
      x.textAlign="center";x.fillStyle="#fff";x.font="800 34px Unbounded, sans-serif";
      x.fillText(ms<2200?"Čo mi letelo nad hlavou? 👀":shiny?"✨ LESKLÁ KARTIČKA! ✨":"Nová kartička! ✈️",W/2,150);
      // otočenie kartičky v 1,4–2,2 s
      const flip=Math.max(0,Math.min(1,(ms-1400)/800)),sx=Math.abs(Math.cos(flip*Math.PI)),front=flip>=.5;
      const wob=ms<1400?Math.sin(ms/90)*6*(ms/1400):0,sc=front?1+.06*Math.max(0,1-(ms-2200)/600):1;
      x.save();x.translate(W/2+wob,H/2-40);x.scale(sx*sc,sc);
      if(front){
        if(ms>2200){const a=Math.max(0,1-(ms-2200)/1800);x.shadowColor=col;x.shadowBlur=60+80*a}
        x.drawImage(img,-CW/2,-CH/2,CW,CH);
      }else{
        const bg=x.createLinearGradient(-CW/2,-CH/2,CW/2,CH/2);bg.addColorStop(0,"#26336e");bg.addColorStop(1,"#121a45");
        x.fillStyle=bg;x.beginPath();x.roundRect(-CW/2,-CH/2,CW,CH,36);x.fill();x.strokeStyle="rgba(255,255,255,.25)";x.lineWidth=4;x.stroke();
        x.fillStyle="#fff";x.font="900 180px Unbounded, sans-serif";x.textBaseline="middle";x.fillText("?",0,0);x.textBaseline="alphabetic";
      }
      x.restore();
      // iskry po odhalení
      if(ms>2200){const k=Math.min(1,(ms-2200)/1500);for(const p of sp){const r=p[1]*k,a=(1-k)*p[2];if(a<=0)continue;x.fillStyle=shiny?`rgba(255,120,230,${a})`:`rgba(255,230,120,${a})`;x.beginPath();x.arc(W/2+Math.cos(p[0])*r,H/2-40+Math.sin(p[0])*r,5,0,7);x.fill()}}
      if(ms>2600){x.globalAlpha=Math.min(1,(ms-2600)/500);x.fillStyle="#fff";x.font="800 38px Unbounded, sans-serif";x.fillText(name,W/2,H-250);if(proof){x.fillStyle=v.ver?"#6dffc7":"rgba(255,255,255,.8)";x.font="700 26px Inter, sans-serif";x.fillText(proof,W/2,H-205)}
        x.fillStyle="#6dffc7";x.font="900 40px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,H-130);
        x.fillStyle="rgba(255,255,255,.8)";x.font="500 23px Inter, sans-serif";x.fillText("Pozri hore a zamávaj · "+APP_HOST,W/2,H-82);x.globalAlpha=1}
      if(t<1)requestAnimationFrame(frame);else setTimeout(()=>rec.stop(),120);
    };
    rec.start(250);requestAnimationFrame(frame);
  };
  img.onerror=done;
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(cardSVG(cardK,v,{id:"v"}));
};

/* 🏛️ vitrína: 3 najlepšie kartičky na profile (1 slot zadarmo, ďalšie za míle) */
const prestige=(k,v)=>RAR[typeTier(k)].p*(v.shiny?3:1)*(v.night?1.3:1)+cardLvl(v.n||1,k)*2+(v.seq&&v.seq<=10?25:0)+(v.seq===1?100:0);
function showSlots(){return 1+((COL.shop||{}).slot2?1:0)+((COL.shop||{}).slot3?1:0)}
function showList(){const own=Object.keys(COL.types).filter(k=>k!=="?"&&COL.types[k].n);let L=(COL.show||[]).filter(k=>COL.types[k]);
  if(!L.length)L=own.sort((a,b)=>prestige(b,COL.types[b])-prestige(a,COL.types[a])).slice(0,showSlots());return L.slice(0,showSlots())}
function renderShow(){const el=$("showcase");if(!el)return;const L=showList();el.hidden=!L.length;if(!L.length)return;
  el.innerHTML=L.map(k=>`<button data-sk="${esc(k)}" aria-label="${esc(catGuess(k).name)}">${cardMini(k,COL.types[k])}</button>`).join("")+Array.from({length:showSlots()-L.length},()=>'<button class="emp" data-empty="1" style="flex:0 0 28%">📌 voľné<br><small>vybrať</small></button>').join("")}
$("showcase")&&($("showcase").onclick=e=>{const b=e.target.closest("[data-sk]");if(b){cardK=b.dataset.sk;openCard(cardK);return}
  // 📌 prázdne miesto: ponuka 6 najcennejších kartičiek, ktoré ešte nie sú vo vitríne
  if(e.target.closest("[data-empty]")){const inS=COL.show||[],cand=Object.keys(COL.types).filter(k=>COL.types[k].n&&!inS.includes(k)).sort((x,y)=>prestige(y,COL.types[y])-prestige(x,COL.types[x])).slice(0,6);
    if(!cand.length){toast("📌 Zatiaľ nemáš čo vystaviť","Zamávaj lietadlu a získaj kartičku");return}
    $("cdBox").innerHTML=`<div class="lbl"><span>📌 Vyber kartičku do vitríny</span></div><div class="cdPick" id="showPick">${cand.map(k=>`<button data-pk="${esc(k)}">${cardMini(k,COL.types[k])}</button>`).join("")}</div><div class="acts"><button class="btn ico" id="cdX" style="flex:1">Zrušiť</button></div>`;
    $("cdM").classList.add("on");
    $("showPick").onclick=ev=>{const p=ev.target.closest("[data-pk]");if(!p)return;COL.show=COL.show||[];if(COL.show.length<showSlots())COL.show.push(p.dataset.pk);LS.set("ctl_col",COL);$("cdM").classList.remove("on");renderShow();haptic(10);toast("📌 Vo vitríne","Kamaráti ju uvidia na tvojom profile")}}});
/* ✈ míle: druhá mena bez platenia – z denných bodov (prvých 60 b naplno, potom 25 %) */
function mileSync(){
  COL.mi=COL.mi|0;if(COL.ptsSeen==null){COL.ptsSeen=COL.pts;COL.mi=Math.min(300,Math.round(COL.pts/10))}
  const d=COL.pts-COL.ptsSeen;if(d<=0){COL.ptsSeen=COL.pts;return}
  const day=dayKey();if(COL.miDay!==day){COL.miDay=day;COL.miToday=0}
  const full=Math.max(0,Math.min(d,60-COL.miToday)),gain=full+Math.floor((d-full)*.25);
  COL.mi+=gain;COL.miToday+=d;COL.ptsSeen=COL.pts;LS.set("ctl_col",COL);
}
const SHOP=[
  {id:"freeze",i:"❄️",n:"Zmrazenie série",d:"Keď vynecháš deň, séria nespadne (max. 3)",c:80,ok:()=>((typeof DAILY!=="undefined"&&DAILY&&DAILY.freeze)|0)<3,buy:()=>{const D=dailyEnsure();D.freeze=(D.freeze|0)+1;LS.set("ctl_daily",D);renderDaily()}},
  {id:"swap",i:"🔄",n:"Ďalšia výmena výzvy",d:"Vymeň dnes ešte jednu výzvu",c:25,ok:()=>true,buy:()=>{const D=dailyEnsure();D.swapped=false;LS.set("ctl_daily",D);renderDaily()}},
  {id:"slot2",i:"🏛️",n:"2. miesto vo vitríne",d:"Ukáž kamarátom ďalšiu kartičku",c:200,once:1},
  {id:"slot3",i:"🏛️",n:"3. miesto vo vitríne",d:"Plná vitrína",c:500,once:1,ok:()=>!!(COL.shop||{}).slot2},
  {id:"fr_tatry",i:"🏔️",n:"Rám Tatry",d:"Rám na všetky tvoje kartičky (dá sa prepínať)",c:150,once:1},
  {id:"fr_dunaj",i:"🌊",n:"Rám Dunaj",d:"Rám na všetky tvoje kartičky (dá sa prepínať)",c:250,once:1},
  {id:"fr_noc",i:"🌃",n:"Rám Noc nad mestom",d:"Rám na všetky tvoje kartičky (dá sa prepínať)",c:400,once:1},
];
function shopOpen(){mileSync();COL.shop=COL.shop||{};
  $("shopMi").textContent="✈ "+nf(COL.mi)+" "+pl(COL.mi,"míľa","míle","míľ");
  $("shopList").innerHTML=SHOP.map(x=>{const own=x.once&&COL.shop[x.id],can=!own&&(!x.ok||x.ok())&&COL.mi>=x.c;
    const fr=own&&x.id.startsWith("fr_"),act=fr&&COL.frame===x.id;
    return `<div class="shopRow"><span style="font-size:26px">${x.i}</span><div>${x.n}<small>${x.d}</small></div>${fr?`<button class="btn ${act?"pri":"sec"}" data-frame="${x.id}">${act?"✓ používaš":"Použiť"}</button>`:`<button class="btn ${can?"pri":"sec"}" data-buy="${x.id}" ${can?"":"disabled"}>${own?"✓ máš":"✈ "+x.c}</button>`}</div>`}).join("");
  $("shopM").classList.add("on")}
$("b-miles")&&($("b-miles").onclick=shopOpen);$("shopClose")&&($("shopClose").onclick=()=>$("shopM").classList.remove("on"));
$("shopList")&&($("shopList").onclick=e=>{const f=e.target.closest("[data-frame]");if(f){COL.frame=COL.frame===f.dataset.frame?"":f.dataset.frame;LS.set("ctl_col",COL);haptic(10);toast(COL.frame?"🖼️ Rám nastavený":"Rám vypnutý",COL.frame?"Uvidíš ho na svojich kartičkách":"");shopOpen();return}
  const b=e.target.closest("[data-buy]");if(!b)return;const x=SHOP.find(q=>q.id===b.dataset.buy);if(!x||COL.mi<x.c)return;
  COL.mi-=x.c;if(x.once)COL.shop[x.id]=Date.now();if(x.buy)x.buy();LS.set("ctl_col",COL);haptic(20);toast(x.i+" "+x.n,"Hotovo · zostáva ✈ "+nf(COL.mi)+" "+pl(COL.mi,"míľa","míle","míľ"));if(x.id.startsWith("fr_"))COL.frame=x.id,LS.set("ctl_col",COL);shopOpen();renderShow();if($("c-miles"))$("c-miles").textContent=nf(COL.mi)});
/* 🎁 daruj kópiu – odkaz pre kamaráta (server overí duplikát) */
async function giftMake(k){
  if(!SOC.api)return;try{const r=await apiPost("/api/gift",{type:k});const j=await r.json();
    if(!j.code){toast("🎁 Darovať sa nedá",{dup:"Potrebuješ aspoň 2 overené úlovky tohto typu",tier:"Darovať sa dajú len bežné a nezvyčajné – legendu musí každý vidieť sám",new:"Darovať môžeš po 7 dňoch v appke",rate:"Dnes si už daroval(a) 3×",kid:"V detskom režime to nejde"}[j.error]||"Skús to neskôr");return}
    const url=shareUrl("g",j.code,"n="+encodeURIComponent(LS.get("ctl_nick","")||"Kamarát")+"&ty="+k),text=`🎁 Darujem ti kartičku ${catGuess(k).name} z appky Čo to letí? ✈️ Keď mu potom sám zamávaš, bude celá tvoja.`;
    toast("🎁 Darček je pripravený","Kamarát dostane kartičku 🤝 – celá bude jeho, keď lietadlu sám zamává"+(j.left!=null?" · dnes ešte "+j.left+"×":""));
    try{if(navigator.share){await navigator.share({title:"Darček",text,url});return}}catch(e){if(e.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text+" "+url);toast("🎁 Odkaz skopírovaný","Pošli ho kamarátovi – platí 14 dní")}catch(e){prompt("Skopíruj odkaz a pošli ho kamarátovi:",url)}
  }catch(e){toast("Bez internetu","Darovať môžeš, keď budeš online")}
}
async function giftClaim(){const m=location.hash.match(/dar=([A-Za-z0-9]{6,8})/);if(!m)return;
  if(!LS.get("ctl_onb",0)){afterOnb(giftClaim);return}if(typeof KID==="function"&&KID())return;
  history.replaceState(null,"",location.pathname);
  try{const r=await apiPost("/api/giftclaim",{code:m[1]});const j=await r.json();if(!j.type){toast("🎁 Darček už nie je platný",j.error==="self"?"Toto je tvoj vlastný darček 🙂":"Možno ho už niekto použil");return}
    const v=COL.types[j.type];if(v&&v.n){toast("🎁 Túto kartičku už máš","Aj tak vďaka – darček poslal(a) "+j.from+" 💛");return}
    COL.types[j.type]={n:0,r:typeTier(j.type),name:catGuess(j.type).name,first:Date.now(),gift:{from:j.from,t:Date.now()}};LS.set("ctl_col",COL);
    toast("🎁 Máš darček! Posiela: "+j.from,catGuess(j.type).name+" – zamávaj mu a kartička bude celá tvoja");confetti(60);renderCol();
  }catch(e){}}
setTimeout(giftClaim,1500);addEventListener("hashchange",giftClaim);
HOOKS.view.push(v=>{if(v==="col"){mileSync();$("c-miles")&&($("c-miles").textContent=nf(COL.mi|0),$("c-milesL")&&($("c-milesL").textContent=pl(COL.mi|0,"míľa","míle","míľ")));renderShow()}});
// 🛷 Santa = edícia roka
HOOKS.caught.push(a=>{if(a.santa){COL.ed=COL.ed||{};const id="santa"+new Date().getFullYear();if(!COL.ed[id]){COL.ed[id]={n:"Santa "+new Date().getFullYear(),no:0,t:Date.now(),ty:"SLEIGH"};LS.set("ctl_col",COL)}}});

/* 🔎 prečo moje mávnutia neboli overené (vlastné dáta zo servera) */
// dôvod zo servera → kód podmienky (staré aj nové texty)
const whyCode=w=>!w?"":/nenaš/.test(w)?"nf":/nedostup|neodpoved/.test(w)?"net":/nízko/.test(w)?"low":/GPS/.test(w)?"gps":/Slovensk|VPN/.test(w)?"cc":/30 km|ďaleko/.test(w)?"far":"?";
const WHY_CHECK=[["nf","Lietadlo je v dátach o letoch"],["low","Bolo aspoň 8° nad obzorom"],["gps","Poloha je z GPS (nie ručne vybrané mesto)"],["cc","Si na Slovensku a bez VPN"],["far","Do 30 km od miesta, kde si dnes začal(a)"]];
const WHY_DO={nf:"Lietadlo nebolo v dátach o letoch (napr. vojenské bez odpovedača). Skús ďalšie lietadlo tohto typu.",net:"Dáta o letoch boli chvíľu nedostupné. Zamávaj tomuto typu znova – overí sa.",low:"Zamávaj, keď bude lietadlo vyššie nad obzorom (aspoň 10°).",gps:"Ťukni hore na pilulku s miestom a vyber 📍 Moja poloha (GPS).",cc:"Vypni VPN alebo Súkromné prenášanie iCloudu a zamávaj znova.",far:"Overujú sa mávnutia do 30 km od miesta, kde si dnes prvýkrát zamával(a). Zajtra sa to vynuluje."};
async function whyShow(){
  const el=$("whyList");if(!el)return;el.textContent="Načítavam…";const k=cardK;
  try{const r=await apiPost("/api/mywhy",{});const j=await r.json().catch(()=>({}));
    if(!r.ok){el.innerHTML="⚠️ Teraz sa nedá zistiť, prečo. Skús to o chvíľu.<br><small>kód "+r.status+(j.error?" / "+esc(j.error):"")+(SOC.helloErr?" · prihlásenie "+esc(SOC.helloErr):"")+"</small>";return}
    const tm=t=>new Date(t).toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"});
    const rows=j.rows||[],mine=rows.filter(x=>x.type===k),last=mine[0];
    const det=`<details class="whyDet"><summary>Podrobnosti</summary><small>Server ťa pozná ako „${esc(j.nick||"bez prezývky")}“ · dnes ${j.wavesToday|0} ${pl(j.wavesToday|0,"mávnutie","mávnutia","mávnutí")} · ${j.verified|0} ${pl(j.verified|0,"overený typ","overené typy","overených typov")} · krajina ${esc(j.country||"?")}${j.today?" · dnešné miesto: "+esc(j.today.town||"?"):""}</small><br>`+
      rows.map(x=>`${tm(x.t)} · ${esc(x.type||"?")} · ${x.el==null?"?":Math.round(x.el)+"°"} · ${x.ok?"✓ overené":"✗ "+esc(x.why||"")}`).join("<br>")+`</details>`;
    let head;
    if(!last)head=`Pri tejto kartičke server nemá záznam z posledných dní (možno bola ulovená bez internetu alebo pred opravou). Overí sa, keď tomuto typu zamávaš znova.`+(S.manual?`<br>📍 ${WHY_DO.gps}`:"");
    else if(last.ok)head=`✓ Posledné mávnutie (${tm(last.t)}) server overil. Ak kartička ešte nesvieti ako overená, zavri ju a otvor znova.`;
    else{const c=whyCode(last.why);
      head=`<b>Mávnutie o ${tm(last.t)}:</b><div class="whyChk">`+(c==="net"?`<div>✗ Dáta o letoch boli dočasne nedostupné</div>`:WHY_CHECK.map(([id,t],i)=>{const idx=WHY_CHECK.findIndex(x=>x[0]===c);const st=idx<0?"✓":i<idx?"✓":i===idx?"✗":"·";return `<div class="${st==="✗"?"no":st==="·"?"na":""}">${st} ${t}${id==="low"&&last.el!=null?" ("+Math.round(last.el)+"°)":""}</div>`}).join(""))+`</div>👉 ${WHY_DO[c]||"Zamávaj tomuto typu znova."}`}
    el.innerHTML=head+det;
  }catch(e){el.textContent="Bez internetu – skús neskôr."}
}

// dlaždice na profile: ťuk → atlas (typy / vzácne)
for(const [id,rare] of [["c-t",false],["c-r",true]]){const el=$(id)&&$(id).parentElement;if(!el)continue;el.style.cursor="pointer";el.setAttribute("role","button");
  el.onclick=()=>{atlasMode="mine";atlasRare=rare;atlasOpen=true;renderCards();haptic(6);setTimeout(()=>$("c-types").scrollIntoView({behavior:"smooth",block:"start"}),50);if(rare)toast("💎 Tvoje vzácne typy","Vzácne, epické a legendárne")}}

// 👀 kedy bol typ naposledy nad tebou + 🔔 strážca typu (upozorní, keď taký typ preletí nad tebou)
function lastSeenType(k){const L=LS.get("ctl_seenT",{}),t=L[k];if(!t)return "";const d=new Date(t),today=SKD.format(new Date())===SKD.format(d);
  return (today?"dnes ":d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" ")+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}
const typeWatched=k=>(LS.get("ctl_watchT",[])||[]).includes(k);
$("cardBig").addEventListener("click",e=>{const w=e.target.closest("[data-watch]");if(!w)return;const k=w.dataset.watch;let L=LS.get("ctl_watchT",[]);
  if(L.includes(k))L=L.filter(x=>x!==k);else{L=[...L,k].slice(-10);toast("🔔 Dám ti vedieť","Keď "+catGuess(k).name+" poletí nad tebou a appka bude otvorená"+(typeof PUSH!=="undefined"&&PUSH.on?"":" (zapni aj upozornenia)"))}
  LS.set("ctl_watchT",L);w.textContent=L.includes(k)?"🔔 Upozorním ťa – zrušiť":"🔔 Upozorni ma, keď poletí nado mnou";w.className="btn "+(L.includes(k)?"sec":"pri");haptic(8)});
HOOKS.live.push(()=>{if(!S.list)return;const now=Date.now(),L=LS.get("ctl_seenT",{});let ch=false;
  for(const a of S.list){if(!a.type||a.el==null||a.el<10)continue;if(!L[a.type]||now-L[a.type]>60e3){L[a.type]=now;ch=true}
    if(typeWatched(a.type)&&!(COL.types[a.type]&&COL.types[a.type].n)&&!(SOC.watchHit||{})[a.hex]){SOC.watchHit=SOC.watchHit||{};SOC.watchHit[a.hex]=1;S.pick=a.hex;try{tick(true)}catch(e){}
      toast("🔔 "+catGuess(a.type).name+" je nad tebou!","Zamávaj – kartička ti chýba 👋","#ffcf4f");haptic([60,40,60,40,200]);
      try{if(document.hidden&&Notification.permission==="granted")new Notification("🔔 "+catGuess(a.type).name+" je nad tebou!",{body:"Zamávaj – kartička ti chýba",tag:"watch"})}catch(e){}}}
  if(ch){const ks=Object.keys(L);if(ks.length>400)for(const k of ks.sort((x,y)=>L[x]-L[y]).slice(0,100))delete L[k];LS.set("ctl_seenT",L)}});

// 🎯 Hľadaná kartička dňa: 1 chýbajúca bežná/nezvyčajná kartička (rovnaká pre celý kraj), za úlovok v ten deň +50 míľ
function wantedToday(){
  // pevná na celý deň (vyberie sa, až keď appka pozná polohu), aby sa po úlovku nezmenila
  const sv=LS.get("ctl_wantedK","");if(sv.slice(0,10)===dayKey())return sv.slice(10)||null;
  if(!S.pos)return null;
  const w=wantedPick();if(w)LS.set("ctl_wantedK",dayKey()+w);return w}
function wantedPick(){const kk=typeof krajOf==="function"?krajOf(S.pos):"XX",pool=CATALOG.map(c=>c[0]).filter(k=>!TROPHY.has(k)&&["c","u"].includes(typeTier(k))).sort();
  const order=pool.slice().sort((a,b)=>hash(dayKey()+kk+a)-hash(dayKey()+kk+b));return order.find(k=>!(COL.types[k]&&COL.types[k].n))||null}
function wantedHTML(){const k=wantedToday();if(!k)return "";const got=LS.get("ctl_wanted","")===dayKey()+k;
  return `<div class="wanted" style="grid-column:1/-1" data-lk="${esc(k)}" role="button"><div class="wT">🎯 HĽADANÁ DNES</div><div class="wN">${esc(catGuess(k).name)}</div><div class="lookSub">${got?"✅ Ulovené! +50 míľ":"Zamávaj jej dnes a dostaneš +50 míľ ✈ a odznak"}</div></div>`}
HOOKS.caught.push(a=>{const k=a.type;if(!k||k!==wantedToday())return;
  if(LS.get("ctl_wanted","")===dayKey()+k)return;LS.set("ctl_wanted",dayKey()+k);COL.mi=(COL.mi|0)+50;LS.set("ctl_col",COL);grantAch("wanted");
  setTimeout(()=>toast("🎯 Hľadaná kartička dňa!","+50 míľ ✈ – presne túto si dnes mal(a) nájsť","#ffcf4f"),3000)});
ACH.push({id:"wanted",i:"🔎",n:"Hľadaná kartička dňa",h:"Ulov kartičku, ktorú appka v Atlase označí ako Hľadaná dnes",c:()=>false});

// 🤝 popros kamaráta: ten, kto má 2 overené kópie, ti môže jednu darovať (🎁 Daruj kópiu na kartičke)
$("cardBig").addEventListener("click",async e=>{const b=e.target.closest("[data-ask]");if(!b)return;const k=b.dataset.ask,nm=catGuess(k).name;
  const text=`🤝 Chýba mi kartička ${nm} v appke Čo to letí? ✈️ Ak ju máš aspoň 2×, otvor ju a ťukni na 🎁 Daruj kópiu – pošli mi odkaz 🙏`,url=appLink();
  try{if(navigator.share){await navigator.share({text,url});return}}catch(er){if(er.name==="AbortError")return}
  try{await navigator.clipboard.writeText(text+" "+url);toast("📋 Skopírované","Pošli to kamarátom")}catch(er){prompt("Skopíruj:",text+" "+url)}});
