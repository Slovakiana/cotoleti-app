"use strict";
/* ============ 🃏 Zberateľské kartičky – Atlas oblohy ============ */
const PILOT_SPEC={
  B738:{fw:.096,wp:.42,rc:.21,sw:25,tc:.058,eng:[{at:.31,k:"jet"}],tp:.86,ts:.34,tsw:28,winglets:true},
  AT76:{fw:.102,wp:.38,rc:.15,sw:2,tc:.074,eng:[{at:.34,k:"prop"}],tp:.89,ts:.32,tsw:9},
  A320:{fw:.102,wp:.385,rc:.225,sw:24,tc:.062,eng:[{at:.32,k:"jet"}],tp:.87,ts:.35,tsw:30},
  B38M:{fw:.096,wp:.42,rc:.21,sw:25,tc:.058,eng:[{at:.32,k:"jet",big:1}],tp:.86,ts:.34,tsw:28,winglets:true,split:true},
  E190:{fw:.085,wp:.41,rc:.205,sw:22,tc:.053,eng:[{at:.34,k:"jet"}],tp:.87,ts:.35,tsw:29,winglets:true},
  A388:{fw:.105,wp:.39,rc:.22,sw:33,tc:.058,eng:[{at:.29,k:"jet",big:1},{at:.57,k:"jet",big:1}],tp:.865,ts:.36,tsw:34},
  Z43:{fw:.16,wp:.28,rc:.23,sw:1,tc:.12,eng:[{nose:1}],tp:.86,ts:.37,tsw:5}
};
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
  glider:{fw:.081,wp:.3,rc:.2,sw:2,tc:.085,eng:[],tp:.88,ts:.22,tsw:4},
  motorGlider:{fw:.14,wp:.33,rc:.2,sw:2,tc:.085,eng:[{nose:1}],tp:.88,ts:.21,tsw:4},
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
  const P=PILOT_SPEC[c.code]||SPEC[c.fam]||SPEC.twin,k=(box*.86)/Math.max(c.len,c.span),L=c.len*k,hs=c.span*k/2,w=Math.max(4,P.fw*L),y0=cy-L/2,y1=cy+L/2;
  const t=a=>Math.tan(a*Math.PI/180),rLE=y0+P.wp*L,c0=P.rc*L,c1=P.tc*L,tLE=rLE+(hs-w/2)*t(P.sw);
  const le=x=>rLE+(x-w/2)*t(P.sw);
  let s=`<g filter="url(#ds${id})">`;
  // krídla
  const wing=sg=>`M${cx+sg*w/2} ${rLE} L${cx+sg*hs} ${tLE} L${cx+sg*hs} ${tLE+c1} L${cx+sg*w/2} ${rLE+c0}Z`;
  s+=`<path d="${wing(1)} ${wing(-1)}" fill="url(#wg${id})"/>`;
  if(P.winglets)for(const sg of [1,-1])s+=`<path d="M${cx+sg*(hs-4)} ${tLE+c1*.66}l${sg*8} -9" fill="none" stroke="${col}" stroke-width="3" stroke-linecap="round"/>`;
  if(P.split)for(const sg of [1,-1])s+=`<path d="M${cx+sg*(hs-3)} ${tLE+c1*.7}l${sg*6} 6" fill="none" stroke="${sh}" stroke-width="2.5" stroke-linecap="round"/>`;
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
  if(c.code==="A388")for(const sg of [1,-1])s+=`<path d="M${cx+sg*w*.28} ${y0+L*.16}v${L*.58}" fill="none" stroke="${acc}" stroke-width="2" stroke-dasharray="1 3" opacity=".65"/>`;
  if(c.code==="E3TF")s+=`<ellipse cx="${cx}" cy="${y0+L*.68}" rx="${L*.11}" ry="${L*.11}" fill="${acc}" stroke="#fff" stroke-width="2"/>`;
  s+="</g>";
  return s;
}
function svgDefs(id,col,sh,acc){
  return `<filter id="ds${id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="4" dy="8" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>
  <linearGradient id="bg${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sh}"/><stop offset=".45" stop-color="${col}"/><stop offset="1" stop-color="${sh}"/></linearGradient>
  <linearGradient id="wg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}"/><stop offset="1" stop-color="${sh}"/></linearGradient>`;
}
const FRAME={c:["#e3e9f5","#8d9bb8"],u:["#a8f5c6","#1f9e5a"],r:["#a9d4ff","#2f6fd6"],e:["#e3a8ff","#7b3fe4"],l:["#fff1a8","#d9a000"]};
// 🌙🌅🎯🏠❄️ formy kartičky – odomknú sa podmienkou pri úlovku (vedomosti o oblohe, nie náhoda)
const FORMS=[["n","🌙","Noc","po zotmení, aspoň 20° nad obzorom"],["g","🌅","Zlatá hodinka","okolo východu alebo západu slnka"],["z","🎯","Zenit","priamo nad hlavou (80°+)"],["h","🏠","Domov","let na Slovensko"],["f","❄️","Mráz","keď je vonku pod 0 °C"]];
const SEATSX={A306:48,E390:26,R135:0,AN30:0,A124:150,IL76:50,BLCF:113,A3ST:47,A337:51,K35R:90,E3TF:0,C17:77,A400:37,C130:20,C30J:20,AN12:20,MD11:90,B748:137,B744:120};
const SVGE=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function wrapLines(s,n){const out=[];let l="";for(const w of String(s).replace(/(\d) (?=\d{3}\b)/g,"$1\u00a0").replace(/ (\d{1,4}[.,]?)$/,"\u00a0$1").split(" ")){if((l+" "+w).trim().length>n&&l){out.push(l);l=w}else l=(l+" "+w).trim()}if(l)out.push(l);return out}
/* celá kartička ako SVG (rovnaká v appke aj pri zdieľaní) */
// kúpené rámy z obchodu (vonkajší okraj kartičky)
const FRAMES_SHOP={fr_tatry:["#eef4ff","#5b7da8"],fr_dunaj:["#5fd3f0","#0a4a7a"],fr_noc:["#ffcf4f","#1b1f4a"]};
// skráti text po slove (nie uprostred slova)

/* Collector Edition: rozdielne výtvarné motívy podľa rarity, žiadne vymyslené drop rate. */
const CARD_ART_REV=new URL(document.currentScript.src).search;
const COLLECTOR_TIER={
  c:{label:"SKY CLASSIC",sign:"●",hue:"#b7d2ff",low:"#27395c"},
  u:{label:"DISCOVERY",sign:"◆",hue:"#70ffcf",low:"#083d3a"},
  r:{label:"RARE SIGNAL",sign:"✦",hue:"#82c5ff",low:"#0c2b6d"},
  e:{label:"EPIC FLIGHT",sign:"✧",hue:"#d6a6ff",low:"#40216b"},
  l:{label:"SKY LEGEND",sign:"♛",hue:"#ffe5a3",low:"#5b3512"}
};
function collectorEditionArt(k,v,mini=false){
  const r=typeTier(k),t=COLLECTOR_TIER[r],sh=!!(v&&v.shiny);
  const w=mini?200:528,h=mini?170:330,x=mini?0:36,y=mini?0:104;
  const cx=x+w/2,cy=y+h/2;
  if(!v)return "";
  let a="";
  if(r==="c"){a=`<path d="M${x+12} ${y+h*.64}Q${cx} ${y+h*.31} ${x+w-12} ${y+h*.64}" fill="none" stroke="${t.hue}" stroke-opacity=".21" stroke-width="${mini?2:4}"/>`;}
  if(r==="u"){for(let i=0;i<5;i++){let dx=x+15+i*w/5;a+=`<path d="M${dx} ${y+10}l${w*.23} ${h*.23}l-${w*.23} ${h*.23}l-${w*.23} -${h*.23}Z" fill="none" stroke="${t.hue}" stroke-opacity=".25" stroke-width="2"/>`}}
  if(r==="r"){for(let i=0;i<7;i++){let rad=(mini?19:38)+i*(mini?10:23);a+=`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${t.hue}" stroke-opacity="${.30-i*.027}" stroke-dasharray="${mini?"4 8":"12 18"}" stroke-width="${mini?1.5:2.8}"/>`}}
  if(r==="e"){for(let i=0;i<7;i++){const yy=y+15+i*h/7,dx=i%2?w*.24:w*.12;a+=`<path d="M${x-30} ${yy}L${cx+dx} ${yy-h*.18}L${x+w+20} ${yy}" fill="none" stroke="${t.hue}" stroke-opacity=".21" stroke-width="${mini?2:4}"/>`}a+=`<path d="M${cx} ${y+5}L${x+w-12} ${cy}L${cx} ${y+h-5}L${x+12} ${cy}Z" fill="none" stroke="${t.hue}" stroke-opacity=".35" stroke-width="3"/>`;}
  if(r==="l"){for(let i=0;i<14;i++){let ang=i*Math.PI*2/14;let x1=cx+Math.cos(ang)*w*.21,y1=cy+Math.sin(ang)*h*.33,x2=cx+Math.cos(ang)*w*.63,y2=cy+Math.sin(ang)*h*.78;a+=`<path d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${t.hue}" stroke-opacity=".24" stroke-width="${mini?2:4}"/>`}a+=`<circle cx="${cx}" cy="${cy}" r="${mini?67:147}" fill="none" stroke="${t.hue}" stroke-opacity=".3" stroke-width="${mini?3:7}"/>`;}
  if(sh){for(let i=0;i<9;i++){const h0=hash(k+"foil"+i),xx=x+(h0%w),yy=y+((h0>>>7)%h),z=mini?3:8;a+=`<path d="M${xx} ${yy-z}L${xx+z} ${yy}L${xx} ${yy+z}L${xx-z} ${yy}Z" fill="#fff" opacity=".65"/>`;}}
  return a;
}
function collectorRevealTitle(k,v){
  if(v.shiny)return "✨ PRIZMATICKÝ ÚLOVOK!";
  if(v.seq===1)return "👑 PRVÝ NA SLOVENSKU!";
  return ({c:"✈️ NOVÝ OBJAV",u:"◆ NEZVYČAJNÝ OBJAV",r:"💠 VZÁCNY ÚLOVOK!",e:"⚡ EPICKÝ ÚLOVOK!",l:"👑 LEGENDA JE TVOJA!"})[typeTier(k)];
}

// Kulisy sú spoločné pre sériu. Silueta, uhol letu a zberateľské prvky patria konkrétnej karte.
const FORM_ART={
  n:{ink:"#e2c9ff",dark:"#160d35",metal:"#8b62dd",mark:'<path d="M16 2a10 10 0 1 0 10 15A10 10 0 0 1 16 2Z"/><path d="M23 5v6m-3-3h6"/>'},
  g:{ink:"#ffddb0",dark:"#30150f",metal:"#d88949",mark:'<path d="M5 19h22M9 23h14M10 16a6 6 0 0 1 12 0M16 4v4m-9 2 3 2m15-2-3 2"/>'},
  z:{ink:"#b6fff7",dark:"#062431",metal:"#4bbac6",mark:'<circle cx="16" cy="14" r="7"/><path d="M16 2v7m0 10v7M4 14h7m10 0h7"/>'},
  h:{ink:"#daffbc",dark:"#102b26",metal:"#79a66d",mark:'<path d="m3 22 9-14 5 7 4-9 8 16H3Zm6-9 3 2 3-2"/>'},
  f:{ink:"#e0f9ff",dark:"#0d233d",metal:"#87bfdc",mark:'<path d="M16 3v22M6 8l20 12M6 20 26 8M12 5l4 4 4-4m-8 18 4-4 4 4"/>'}
};
const CARD_ILLUSTRATIONS={
  "A318:":"a318",
  "A319:":"a319",
  "A320:":"a320",
  "A321:":"a321",
  "A20N:":"a20n",
  "A21N:":"a21n",
  "A35K:":"a35k",
  "A388:":"a388",
  "B744:":"b744",
  "B748:":"b748",
  "B77W:":"b77w",
  "B737:":"b737",
  "B738:":"b738",
  "B739:":"b739",
  "B39M:":"b39m",
  "B38M:":"b38m",
  "A388:n":"a388-n",
  "AT43:":"at43",
  "AT75:":"at75",
  "AT76:":"at76",
  "DH8D:":"dh8d",
  "AT76:g":"at76-g",
  "AT76:z":"at76-z",
  "AT76:f":"at76-f",
  "Z43:":"z43",
  "Z43:h":"z43-h"
};
const FORM_POSES={
  n:{x:226,y:266,size:260,angle:24,body:"#e6edff"},
  g:{x:212,y:220,size:333,angle:-21,body:"#fff5d6"},
  z:{x:210,y:245,size:335,angle:0,body:"#ecfffd"},
  h:{x:220,y:206,size:278,angle:28,body:"#f6ffe9"},
  f:{x:200,y:237,size:286,angle:-41,body:"#f0fcff"}
};
let cardRenderSerial=0;
function hasCardForm(v,k){
  return !!(v?.n&&Object.hasOwn(FORM_ART,k)&&(v.forms?.[k]||(k==="n"&&v.night)));
}
function cardCoverForm(v){
  if(v?.coverForm==="-")return "";
  if(hasCardForm(v,v?.coverForm))return v.coverForm;
  const newest=FORMS.filter(([k])=>hasCardForm(v,k))
    .sort(([a],[b])=>(v.forms?.[b]||(b==="n"&&v.night)||0)-(v.forms?.[a]||(a==="n"&&v.night)||0));
  return newest[0]?.[0]||"";
}
// ilustrácia typu: vlastná pre formu, inak základná ilustrácia typu (forma sa naznačí tónom), až potom všeobecné pozadie formy
function cardIllustration(code,form){return CARD_ILLUSTRATIONS[code+":"+form]||CARD_ILLUSTRATIONS[code+":"]||""}
function cardArtURL(form,code){return "lib/card-art/"+(cardIllustration(code,form)||form||"classic")+".webp"+CARD_ART_REV}
async function cardExportSVG(k,v,opt){
  let artHref="";
  try{
    const response=await fetch(cardArtURL(cardCoverForm(v),catGuess(k).code),{signal:AbortSignal.timeout(3500)});
    if(response.ok){
      const blob=await response.blob();
      artHref=await new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onload=()=>resolve(reader.result);
        reader.onerror=reject;
        reader.readAsDataURL(blob);
      });
    }
  }catch(error){} // Pri nedostupnej kulise ostáva v exporte vektorová kresba.
  return cardSVG(k,v,{...opt,artHref});
}
// Emblém a rytina sa menia podľa vzácnosti aj pri zvolenej forme a kúpenom ráme.
const TIER_MARKS={
  c:'<circle cx="12" cy="12" r="4"/>',
  u:'<path d="m12 3 8 9-8 9-8-9Z"/>',
  r:'<path d="m12 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/>',
  e:'<path d="m12 2 9 5v10l-9 5-9-5V7Z M3 7l9 10 9-10 M7 4l5 13 5-13"/>',
  l:'<path d="m2 7 5 5 5-9 5 9 5-5-3 13H5Z"/>'
};
const TIER_ENGRAVING={
  c:"",
  u:'<path d="m17 115 30-30h39 m250 322h43l24-24" stroke-width="3"/>',
  r:'<path d="M17 140V110l38-38h59 M305 420h85l13-13v-43 M17 155v9m386 174v12" stroke-width="4"/>',
  e:'<path d="m17 144 71-72h38M17 127l55-55 M284 420h51l68-68 M350 420l53-53" stroke-width="3"/>',
  l:'<path d="M17 146V111l39-39h68 M17 124l52-52 M279 420h69l55-55v-30 M367 420l36-36" stroke-width="5"/><path d="M102 79h16m-8-8v16M303 414h16m-8-8v16" stroke-width="2"/>'
};
function cardTierStamp(r,locked){
  const ink=COLLECTOR_TIER[r].hue;
  const name=(locked?"Zamknutá":RAR[r].n).toUpperCase();
  const right=389, textWidth=Math.max(59,Math.ceil(name.length*10.5)), x=right-textWidth-48;
  return `<path d="M${x+10} 376H389V410H${x}V386Z" fill="#080d19" fill-opacity=".93" stroke="${ink}" stroke-opacity="${locked?.5:.9}"/>
    <g transform="translate(${x+11} 382) scale(.9)" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round">${TIER_MARKS[r]}</g>
    <text data-card-tier-label="" x="${x+36}" y="399" fill="${ink}" font-size="15" font-weight="800" letter-spacing=".7" textLength="${textWidth}" lengthAdjust="spacingAndGlyphs">${name}</text>`;
}
function cardStars(level,id){
  if(!level)return "";
  const max=level===4,stroke=max?"#ffe4a1":"#859abb";
  const stars=Array.from({length:4},(_,i)=>`<path data-level-star="${i<level?"earned":"empty"}" transform="translate(${259+35*i} 540)" d="M0-12 3.6-4 12-3.6 5.5 2 7.5 11 0 6.5-7.5 11-5.5 2-12-3.6-3.6-4Z" fill="${i<level?`url(#stars${id})`:"#151e30"}" stroke="${i<level?"#ffe4a1":"#7083a0"}" stroke-width="1.3"/>`).join("");
  return `<defs><linearGradient id="stars${id}" x2="0" y2="1"><stop stop-color="#fff6dc"/><stop offset=".48" stop-color="#ffd47c"/><stop offset="1" stop-color="#b8752f"/></linearGradient></defs>
    <path d="M244 520H379L394 534V563H230V535Z" fill="${max?"#39250f":"#0b1221"}" stroke="${stroke}" stroke-opacity="${max?1:.65}"/>
    ${stars}
    ${max?'<path d="m237 553 6 4m-7-10 7 4m144 2-6 4m7-10-7 4" fill="none" stroke="#ffe4a1" stroke-width="1.5"/>':""}`;
}
function cardFoil(id,scene){
  if(scene)return `<g data-card-foil="scene" fill="none">
    <path d="M-4 340 215 65m-124 356L374 67m-118 356 162-199" stroke="url(#foil${id})" stroke-width="34" opacity=".24"/>
    <path d="M-4 340 215 65m-124 356L374 67m-118 356 162-199" stroke="url(#foil${id})" stroke-width="2" opacity=".64"/>
    <path d="M67 141v33m-16-16h32m271 144v32m-16-16h32" stroke="#fff7ff" stroke-width="2"/>
    </g>`;
  return `<path d="M17 329h159l-18 33H17Z" fill="#101626" stroke="url(#foil${id})" stroke-width="2"/>
    <path d="m34 335 2.7 7.3 7.3 2.7-7.3 2.7-2.7 7.3-2.7-7.3-7.3-2.7 7.3-2.7Z" fill="url(#foil${id})"/>
    <text x="51" y="351" fill="#fff0ff" font-size="18" font-weight="850" letter-spacing="2">LESKLÁ</text>`;
}
function cardScene(k,v,id,form,ink,dark,metal,href,locked){
  const c=catGuess(k);
  const art=locked?"":href===undefined?cardArtURL(form,k):href;
  const illustrated=!!(art&&cardIllustration(k,form));
  const formTint=illustrated&&form&&!CARD_ILLUSTRATIONS[k+":"+form]?(FORM_ART[form]||{}).metal:"";
  const mirrored=!form&&!illustrated&&hash(k+"scene")%2===1;
  const pose=FORM_POSES[form]||{x:210,y:245,size:328,angle:[-34,-24,23,34][hash(k)%4],body:"#f8fcff"};
  const size=illustrated?220:pose.size,half=size/2;
  const x=illustrated?210:pose.x,y=illustrated?245:pose.y;
  const body=locked?"#aabdd5":pose.body,shade=locked?"#465f80":metal;
  const silhouette=`<g opacity="${locked?.65:1}" transform="translate(${x-half} ${y-half}) rotate(${pose.angle} ${half} ${half})">${planeSVG(c,{box:size,id,acc:ink,body,shade})}</g>`;
  const planes=svgDefs(id,body,shade,locked?"#627c99":dark);
  return `<defs>${planes}
    <clipPath id="scene${id}"><path d="M17 72H374L403 101V407L390 420H17Z"/></clipPath>
    <radialGradient id="sky${id}"><stop stop-color="${metal}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
    <linearGradient id="shade${id}" x2="0" y2="1"><stop stop-color="${dark}" stop-opacity=".02"/><stop offset=".53" stop-color="${dark}" stop-opacity=".18"/><stop offset="1" stop-color="${dark}" stop-opacity=".82"/></linearGradient></defs>
    <g clip-path="url(#scene${id})" data-card-art="${illustrated?"illustration":locked?"locked":"silhouette"}">
    <rect x="17" y="72" width="386" height="348" fill="url(#sky${id})"/>
    ${illustrated&&href===undefined?silhouette:""}
    ${art?`<image href="${SVGE(art)}" x="17" y="72" width="386" height="348" preserveAspectRatio="xMidYMid ${illustrated?"meet":"slice"}"${mirrored?' transform="translate(420 0) scale(-1 1)"':""}/>`:""}
    <rect x="17" y="72" width="386" height="348" fill="${dark}" opacity="${illustrated?0:form?.10:.29}"/>
    ${formTint?`<rect x="17" y="72" width="386" height="348" fill="${formTint}" opacity=".34" style="mix-blend-mode:color"/>`:""}
    <rect x="17" y="72" width="386" height="348" fill="url(#shade${id})" opacity="${illustrated ? .55 : 1}"/>
    ${illustrated?"":`<g transform="translate(19 85) scale(.72 .93)">${collectorEditionArt(k,locked?null:v)}</g>`}
    <g fill="none" stroke="${ink}" stroke-opacity=".5">
      <path d="M31 129v-40h30m298 0h9l19 18v22M31 366v38h30m298 0h28v-38"/>
      <path d="M34 199v100m-4-90h8m-8 20h8m-8 20h12m-12 20h8m-8 20h8m352-90v100m-4-90h8m-8 20h8m-8 20h8m-8 20h8m-8 20h8"/>
      ${form==="z"||locked?'<circle cx="210" cy="245" r="105" stroke-dasharray="3 8"/><circle cx="210" cy="245" r="122"/><path d="M210 96v28m0 242v30M61 245h28m242 0h28"/>':""}
    </g>
    ${v.shiny?cardFoil(id,true):""}
    ${illustrated?"":silhouette}
    </g><path d="M17 72H374L403 101V407L390 420H17Z" fill="none" stroke="${ink}" stroke-opacity=".57"/>
    ${locked?"":`<g fill="none" stroke="${COLLECTOR_TIER[typeTier(k)].hue}" stroke-opacity=".82">${TIER_ENGRAVING[typeTier(k)]}</g>`}`;
}
function cardRelay(code,v){
  if(!v?.n||!v.ver||typeof KID==="function"&&KID())return null;
  return SOC.data?.relay?.find(leg=>leg.type===code&&KRAJ[leg.k]&&KRAJ[leg.other])||null;
}
function relayMedallion(){
  return '<g data-relay-seal=""><rect x="26" y="82" width="124" height="24" rx="5" fill="#181621" stroke="#efc272"/><circle cx="38" cy="94" r="2.5" fill="#ffe5ae"/><path d="M41 94h12" stroke="#efc272" stroke-dasharray="2 2"/><circle cx="56" cy="94" r="2.5" fill="#ffe5ae"/><text x="64" y="98" fill="#ffe5ae" font-size="11.5" font-weight="800" letter-spacing=".7">ŠTAFETA</text></g>';
}
function cardSVG(code,v,opt={}){
  const c=catGuess(code),key=c.code,r=typeTier(key),tier=COLLECTOR_TIER[r];
  const id="card"+(++cardRenderSerial);
  const form=cardCoverForm(v),edition=FORM_ART[form],locked=!v,relay=cardRelay(key,v);
  v=v||{};
  const ink=edition?.ink||tier.hue,metal=edition?.metal||FRAME[r][1],dark=edition?.dark||tier.low;
  const custom=!opt.mini&&FRAMES_SHOP[COL.frame];
  const edge=v.gold?"#ffcf67":custom?.[0]||tier.hue;
  const edgeMid=custom?.[1]||FRAME[r][1];
  const label=form?FORMS.find(([k])=>k===form)[2]:locked?"Neulovená":v.gift&&!v.n?"Darovaná kópia":"Originál";
  const names=wrapLines(c.name,21);
  const size=Math.min(names.length===1?43:33,Math.floor(595/Math.max(...names.map(s=>s.length))));
  const level=v.n?cardLvl(v.n,key):0;
  const number=c.no?"№ "+String(c.no).padStart(3,"0"):key;
  const description=[c.name,RAR[r].n,label,v.shiny?"Lesklá":"",level?"Hviezdy "+level+" zo 4":"",relay?"Letová štafeta":""].filter(Boolean).join(" · ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 588" data-card-form="${form||"classic"}" data-card-tier="${r}" data-card-level="${level}" role="img" aria-label="${SVGE(description)}" font-family="Inter,system-ui,sans-serif">
  <defs>
    <linearGradient id="metal${id}" x2=".85" y2="1"><stop stop-color="${edge}"/><stop offset=".23" stop-color="${edgeMid}"/><stop offset=".44" stop-color="${edge}"/><stop offset=".67" stop-color="${edgeMid}"/><stop offset=".88" stop-color="${edge}"/><stop offset="1" stop-color="${edgeMid}"/></linearGradient>
    ${v.shiny?`<linearGradient id="foil${id}" x2="1" y2=".94"><stop stop-color="#ffb6e5"/><stop offset=".2" stop-color="#92e5ff"/><stop offset=".38" stop-color="#aeffdd"/><stop offset=".56" stop-color="#ffe5a0"/><stop offset=".78" stop-color="#dbb2ff"/><stop offset="1" stop-color="#b5f4ff"/></linearGradient>`:""}
    <linearGradient id="stock${id}" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".88" stop-color="#090e18"/></linearGradient>
  </defs>
  <rect x="2" y="2" width="416" height="584" rx="26" fill="url(#${v.shiny?"foil":"metal"}${id})"/>
  <rect x="7" y="7" width="406" height="574" rx="21" fill="url(#stock${id})"/>
  <rect x="12" y="12" width="396" height="564" rx="16" fill="none" stroke="${edge}" stroke-opacity=".36"/>
  <text x="27" y="42" fill="${ink}" font-size="19" font-weight="800" letter-spacing="2">ATLAS OBLOHY</text>
  <text x="27" y="60" fill="#f6f9ff" opacity=".8" font-size="13" font-weight="600" letter-spacing="1.5">${SVGE(number)}</text>
  <path d="M291 23h94l10 10v27H291Z" fill="#080d19" stroke="${edge}" stroke-opacity=".60"/>
  <text x="342" y="50" text-anchor="middle" fill="${ink}" font-size="23" letter-spacing="1.5" font-weight="800">${SVGE(key)}</text>
  ${cardScene(key,v,id,form,ink,dark,metal,opt.artHref,locked)}
  ${form?`<path d="M17 372h32l17 17v31H17Z" fill="${dark}" stroke="${edge}"/>
  <g transform="translate(26 381)" fill="none" stroke="${edge}" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${edition.mark}</g>`:""}
  ${cardTierStamp(r,locked)}
  ${relay?relayMedallion():""}
  ${v.shiny?cardFoil(id,false):""}
  ${names.slice(0,2).map((line,i)=>`<text x="27" y="${names.length===1?481:464+i*35}" fill="#fff" font-size="${size}" font-weight="800" letter-spacing="-.75">${SVGE(line)}</text>`).join("")}
  <path d="M27 519H393" stroke="${ink}" stroke-opacity=".5"/>
  <text x="27" y="554" fill="${ink}" font-size="${label.length>13?23:26}" font-weight="750">${label}</text>
  ${cardStars(level,id)}
  </svg>`;
}

if(!LS.get("ctl_onb",0))document.addEventListener("DOMContentLoaded",()=>{
  $("onbCard").innerHTML=cardSVG("B738",{n:1},{id:"intro",mini:true});
},{once:true});

HOOKS.social=HOOKS.social||[];
HOOKS.social.push(data=>{
  const latest=data?.relay?.[0];
  if(!latest||!cardRelay(latest.type,COL.types[latest.type]))return;
  const last=Number(LS.get("ctl_relaySeen",0))||0;
  if(latest.t<=last)return;
  LS.set("ctl_relaySeen",latest.t);
  if(S.view==="col")renderCards();
  toast("✦ Letová štafeta","Tomu istému preletu zamával niekto aj v inom kraji. Pozri si pečať v Zbierke.","#efc272");
});
const collectorFormCount=v=>Object.values((v&&v.forms)||{}).filter(Boolean).length;
const collectorEditions=k=>Object.values(COL.ed||{}).filter(ed=>ed.ty===k);
const collectorSpecial=(k,v)=>!!(v&&(v.shiny||(v.seq>0&&v.seq<=10)||RORD[typeTier(k)]>=2||collectorEditions(k).length||collectorFormCount(v)>=3));
function collectorTitle(k,v){
  if(v.shiny)return "✨ Lesklý originál";
  if(v.seq===1)return "👑 Prvý na Slovensku";
  if(v.seq>1&&v.seq<=10)return "🏅 Prvá desiatka · č. "+v.seq;
  if(collectorEditions(k).length)return "📅 Limitovaná edícia";
  if(typeTier(k)==="l")return "♛ Legendárny úlovok";
  if(typeTier(k)==="e")return "⬟ Epický úlovok";
  if(typeTier(k)==="r")return "▲ Vzácny úlovok";
  if(collectorFormCount(v)>=3)return "🌈 Majster foriem";
  return "✈️ Atlas oblohy";
}
function collectorProof(k,v){
  const badges=[RAR[typeTier(k)].s+" "+RAR[typeTier(k)].n];
  if(v.shiny)badges.push("✨ Lesklá");
  if(v.seq>0&&v.seq<=10)badges.push(v.seq===1?"👑 Prvý overený v SR":"🏅 Číslo "+v.seq+" v SR");
  if(v.ver)badges.push("✓ Overená");
  else if(v.n)badges.push("Neoverená");
  const ed=collectorEditions(k);if(ed.length)badges.push("📅 "+ed.length+" "+pl(ed.length,"edícia","edície","edícií"));
  const fc=collectorFormCount(v);if(fc)badges.push("🌌 "+fc+"/5 foriem");
  return badges;
}
function collectorDossier(k,v){
  const first=v.fp?.t||(!v.srv&&v.first),when=first?new Date(first):null;
  const date=when&&!isNaN(when.getTime())?when.toLocaleDateString("sk-SK",{day:"numeric",month:"long",year:"numeric"}):"Neznámy dátum";
  const badges=collectorProof(k,v);
  return `<section class="collectorDossier" aria-label="Zberateľský certifikát"><div class="collectorDossierTop"><span>✦ OSOBNÝ ZBERATEĽSKÝ LIST</span><b>SÉRIA 01</b></div>
    <div class="collectorDossierTitle">${esc(collectorTitle(k,v))}</div>
    <div class="collectorProof">${badges.map(b=>`<span>${esc(b)}</span>`).join("")}</div>
    <div class="collectorRecord"><div><small>PRVÝ ÚLOVOK</small><strong>${esc(date)}</strong></div><div><small>ÚROVEŇ KARTY</small><strong>${cardLvl(v.n||1,k)}/4 ★</strong></div></div>
    <p>Každá kartička je spomienka na skutočné zamávanie. Overenie a poradie v SR sa zobrazujú len vtedy, keď ich potvrdia údaje.</p></section>`;
}
function collectorVaultHTML(keys,owned){
  const all=keys.filter(k=>owned[k]&&owned[k].n);
  const rare=all.filter(k=>RORD[typeTier(k)]>=2).length,shiny=all.filter(k=>owned[k].shiny).length;
  const forms=all.filter(k=>collectorFormCount(owned[k])>=3).length;
  const goals=[[rare,1,"Ulov prvú vzácnu kartičku","▲"],[shiny,1,"Objav lesklú kartičku","✨"],[forms,1,"Odomkni 3 formy jednej karty","🌌"]];
  const special=all.filter(k=>collectorSpecial(k,owned[k]));
  return `<div class="collectorVault" style="grid-column:1/-1">
    <div class="vaultEyebrow">✦ TVOJ SÚKROMNÝ ATLAS</div>
    <div class="vaultHeading"><div><strong>💎 Klenotnica</strong><small>Každý úlovok má svoj príbeh. Tie výnimočné vystav na obdiv.</small></div><span class="vaultCounter">${special.length} ${pl(special.length,"klenot","klenoty","klenotov")}</span></div>
    <div class="vaultGoals">${goals.map(([got,target,label,sym])=>`<div class="vaultGoal ${got>=target?"done":""}"><span>${sym}</span><div><b>${esc(label)}</b><small>${got>=target?"✓ Splnené":got+"/"+target+" · zatiaľ neobjavené"}</small></div></div>`).join("")}</div>
  </div>`;
}


/* 🎯 Osobný lov: cieľ je lokálny, nie náhodne pridelená exkluzívna edícia. */
function collectorHuntKey(){return LS.get("ctl_collectorHunt","")}
function collectorHuntModel(){
  const k=collectorHuntKey(),v=COL.types[k],c=CAT[k];
  if(!c||TROPHY.has(k))return {k:"",done:false,name:"",tier:""};
  return {k,done:!!(v&&v.n),name:c.name,tier:RAR[typeTier(k)].n};
}
function collectorHuntHTML(){
  const m=collectorHuntModel();
  if(!m.k||m.done){
    const goal=collectionNextSet();
    if(goal)return `<div class="huntPanel" style="grid-column:1/-1"><b>${esc(goal.set.n)} · ${goal.got}/${goal.set.t.length}</b><button class="ghost" data-hunt-open="${esc(goal.next)}">Hľadaj ${esc(CAT[goal.next].name)}</button></div>`;
    return '<div class="huntPanel" style="grid-column:1/-1"><b>Vyber si cieľ ďalšieho lovu</b><button class="ghost" data-m="miss">Pozrieť chýbajúce kartičky</button></div>';
  }
  return `<div class="huntPanel" style="grid-column:1/-1"><b>Osobný lov · ${esc(m.name)}</b><div class="huntActs"><button class="ghost" data-hunt-open="${esc(m.k)}">Detail cieľa</button><button class="ghost" data-hunt-clear="1">Zrušiť</button></div></div>`;
}


/* 🔭 Živý osobný lov: žiadny umelý výskyt, iba dáta z aktuálneho radaru. */
function collectorHuntLiveModel(){
  const m=collectorHuntModel();
  if(!m.k)return {kind:"empty",title:"Vyber si vysnívanú kartičku",detail:"V Atlase otvor Chýbajú a vyber typ, ktorý chceš uloviť.",k:""};
  if(m.done)return {kind:"done",title:"🏆 Ulovené: "+m.name,detail:"Tvoja trofej už je v zbierke. Pozri si ju alebo začni nový lov.",k:m.k};
  const list=S.loaded&&!S.lastKnown&&!S.failN&&navigator.onLine&&!S.manual&&Array.isArray(S.list)?S.list:[];
  const close=list.filter(a=>a.type===m.k&&!a.emg&&!a.santa&&a.el>=10&&!SOC.waved[dayKey()+a.hex]).sort((a,b)=>(b.el||0)-(a.el||0))[0];
  if(close)return {kind:"near",title:"🚨 Tvoj cieľ je na oblohe!",detail:m.name+" · "+Math.round(close.el)+"° nad obzorom. Otvor lietadlo a zamávaj.",k:m.k,hex:close.hex};
  return {kind:"waiting",title:"🔭 Lovíš: "+m.name,detail:m.tier+" · sleduj oblohu a zapni upozornenie na tento typ.",k:m.k};
}
function renderCollectorHuntHome(){
  const root=$("huntHome");if(!root)return;
  const m=collectorHuntLiveModel();root.dataset.state=m.kind;
  root.hidden=m.kind!=="near";
  $("huntHomeTitle").textContent=m.title;$("huntHomeDetail").textContent=m.detail;
  const b=$("huntHomeGo");b.textContent=m.kind==="near"?"✈️ Ukáž lietadlo":m.kind==="done"?"🏆 Pozri kartičku":m.kind==="empty"?"🃏 Vyber v Atlase":"🎯 Detail cieľa";
}
HOOKS.live.push(renderCollectorHuntHome);
HOOKS.view.push(v=>{if(v==="now")renderCollectorHuntHome()});
$("huntHomeGo").onclick=()=>{
  const m=collectorHuntLiveModel();
  if(m.kind==="near"&&m.hex){S.pick=m.hex;try{tick(true)}catch(e){}$("hero").scrollIntoView({behavior:"smooth",block:"start"});return}
  if(m.kind==="done"&&m.k){openCard(m.k);return}
  if(m.kind==="waiting"&&m.k){openLocked(m.k);return}
  atlasMode="miss";atlasOpen=false;document.querySelector('nav [data-v="col"]')?.click();
};

/* ---- Atlas v Zbierke ---- */
let atlasOpen=false;let atlasMode="mine";let atlasRare=false;
const cardRar=k=>typeTier(k);
const inSeries=k=>CAT[k]&&!TROPHY.has(k);
// 🃏 malá kartička do mriežky: čitateľná silueta, názov, stupeň, úroveň ako bodky
function cardMini(k,v){return cardSVG(k,v,{id:"mini",mini:true})}
function renderCards(){
  const root=$("c-types"),focused=root.contains(document.activeElement)?document.activeElement:null;
  const choices=["data-k","data-m","data-alb","data-lk","data-hunt-open","data-hunt-clear","data-first-hunt","data-all","data-open-edition"];
  const attr=choices.find(key=>focused?.hasAttribute(key));
  const focusSelector=focused?.matches(".atlasMore > summary")?".atlasMore > summary":attr?`[${attr}="${CSS.escape(focused.getAttribute(attr))}"]`:
    (focused?.matches("summary")&&focused.parentElement.dataset.setId?`[data-set-id="${CSS.escape(focused.parentElement.dataset.setId)}"] > summary`:null);
  const openSets=new Set([...root.querySelectorAll("details[data-set-id][open]")].map(el=>el.dataset.setId));
  const expanded=root.querySelector(".atlasMore")?.open;
  const owned=COL.types,ownedKeys=Object.keys(owned).filter(k=>k!=="?"),inCat=ownedKeys.filter(k=>inSeries(k)&&owned[k].n).length,tot=CATALOG.filter(c=>!TROPHY.has(c[0])).length;
  const shinyN=ownedKeys.filter(k=>owned[k].shiny).length,trN=ownedKeys.filter(k=>TROPHY.has(k)).length,edN=Object.keys(COL.ed||{}).length;
  $("c-cardsN").textContent=`${inCat}/${tot}`;
  const inSet=k=>SETS.some(s=>!(COL.sets||{})[s.id]&&s.t&&s.t.includes(k)&&s.t.some(x=>owned[x]))?-1:0;
  const mine=ownedKeys.sort((x,y)=>(owned[y].first||0)-(owned[x].first||0));
  const vault=mine.filter(k=>owned[k].n&&collectorSpecial(k,owned[k])).sort((a,b)=>prestige(b,owned[b])-prestige(a,owned[a]));
  // chýba = ešte si mu nezamával (darovaná kópia 🤝 sa neráta ako vlastná)
  // 👀 typy, ktoré dnes preleteli nad tebou, idú na začiatok
  const seenT=LS.get("ctl_seenT",{}),today=SKD.format(new Date()),seenToday=k=>seenT[k]&&SKD.format(new Date(seenT[k]))===today;
  const missing=CATALOG.map(c=>c[0]).filter(k=>!(owned[k]&&owned[k].n)&&!TROPHY.has(k)).sort((x,y)=>(seenToday(y)?1:0)-(seenToday(x)?1:0)||inSet(x)-inSet(y)||RORD[typeTier(x)]-RORD[typeTier(y)]||CAT[x].no-CAT[y].no);
  const trophies=CATALOG.map(c=>c[0]).filter(k=>TROPHY.has(k));
  let list=atlasMode==="mine"?(atlasRare?mine.filter(k=>RORD[typeTier(k)]>=2&&owned[k].n):mine):atlasMode==="miss"?missing:atlasMode==="trophy"?trophies:atlasMode==="vault"?vault:[];
  const more=!atlasOpen&&list.length>6&&atlasMode!=="trophy"?list.length-6:0;if(more)list=list.slice(0,6);
  const tab=(m,l)=>`<button class="${atlasMode===m?"on":""}" data-m="${m}" aria-pressed="${atlasMode===m}">${l}</button>`;
  $("c-types").innerHTML=`<div class="atlasTop" style="grid-column:1/-1"><div class="xp"><i style="width:${inCat/tot*100}%"></i></div>
    <div class="lookSub"${trN||shinyN||edN?"":" hidden"}>${trN?" · 🏆 "+trN+" "+pl(trN,"trofej","trofeje","trofejí"):""}${shinyN?" · ✨ "+shinyN+" "+pl(shinyN,"lesklá","lesklé","lesklých"):""}${edN?" · 📅 "+edN+(edN===1?" edícia":edN<5?" edície":" edícií"):""}</div>
    <div class="atTabs">${tab("mine","Moje ("+ownedKeys.filter(k=>owned[k].n).length+(ownedKeys.some(k=>!owned[k].n)?" + 🤝":"")+")")}${tab("miss","Chýbajú ("+missing.length+")")}${tab("sets","Sady")}</div>
    <details class="atlasMore" ${expanded||["vault","ed","trophy"].includes(atlasMode)?"open":""}><summary>Klenoty, edície a trofeje</summary><div class="atTabs">${tab("vault","Klenoty ("+vault.length+")")}${tab("ed","Edície")}${tab("trophy","Trofeje")}</div></details></div>`+
    (atlasMode==="sets"?setsHTML():atlasMode==="ed"?edHTML():"")+
    (atlasMode==="vault"?collectorVaultHTML(ownedKeys,owned):"")+
    (atlasMode==="mine"&&mine.some(k=>owned[k].n)?collectorHuntHTML():"")+
    (atlasMode==="miss"?wantedHTML():"")+
    (atlasMode==="trophy"?`<div class="lookSub" style="grid-column:1/-1">Legendy, ktoré nad Slovenskom takmer nelietajú. Bonus, nie povinnosť – nerátajú sa do 100 %.</div>`:"")+
    (atlasMode==="sets"||atlasMode==="ed"?"":list.length?list.map(k=>`<button class="mini ${owned[k]&&owned[k].shiny?"shiny":""} ${typeTier(k)} ${owned[k]?"owned":"lock"}" data-k="${esc(k)}" aria-label="${esc((CAT[k]?CAT[k].name:k)+" · "+RAR[typeTier(k)].n+(owned[k]?.shiny?" · lesklá":"")+(owned[k]?.n?" · hviezdy "+cardLvl(owned[k].n,k)+" zo 4":owned[k]?.gift?" · darovaná kópia":" · ešte nemáš"))}">${cardMini(k,owned[k])}${atlasMode==="vault"?`<b class="vaultCardBadge">${esc(collectorTitle(k,owned[k]))}</b>`:""}${atlasMode==="miss"&&seenToday(k)?'<b class="seenB">👀 dnes</b>':""}</button>`).join(""):`<div class="lookSub" style="grid-column:1/-1;padding:10px 0">${atlasMode==="mine"?'Zbierka čaká na tvoj prvý úlovok. <button class="ghost" type="button" data-first-hunt>Prejsť do Lovu</button>' :atlasMode==="vault"?"Tvoja prvá výnimočná kartička ešte len čaká. Ulov vzácny typ alebo objav špeciálnu formu.":"Máš celú sériu! 🏆"}</div>`);
  if(more)root.insertAdjacentHTML("beforeend",`<button class="btn sec atlasAll" style="grid-column:1/-1" data-all="1">Celý atlas · ${pl(more,"ďalšia","ďalšie","ďalších")} ${more} ›</button>`);
  for(const set of root.querySelectorAll("details[data-set-id]"))set.open=openSets.has(set.dataset.setId);
  const next=focusSelector&&root.querySelector(focusSelector);
  if(next)next.focus({preventScroll:true});
  else if(focused)root.querySelector(".atTabs .on, .atTabs button")?.focus({preventScroll:true});
}
let cardK=null,cardVisibleForm="";
$("c-types").onclick=e=>{
  if(e.target.closest("[data-first-hunt]")){setView("now");return}
  const choose=e.target.closest("[data-hunt-open]");if(choose){const k=choose.dataset.huntOpen;if(COL.types[k]&&COL.types[k].n)openCard(k);else openLocked(k);return}
  if(e.target.closest("[data-hunt-clear]")){LS.set("ctl_collectorHunt","");renderCards();renderCollectorHuntHome();return}
  const tb=e.target.closest("button[data-m]");if(tb){atlasMode=tb.dataset.m;atlasRare=false;renderCards();$("c-types").querySelector('.atTabs [data-m="'+atlasMode+'"]')?.focus({preventScroll:true});return}
  const ab=e.target.closest("[data-alb]");if(ab){albumSel=ab.dataset.alb;renderCards();$("c-types").querySelector('[data-alb="'+albumSel+'"]')?.focus({preventScroll:true});return}
  if(e.target.closest("[data-all]")){atlasOpen=true;renderCards();$("c-types").querySelectorAll(".mini")[6]?.focus();return}
  const edition=e.target.closest("[data-open-edition]");if(edition){openEdition(edition.dataset.openEdition);return}
  const sl=e.target.closest("[data-lk]");if(sl){const k=sl.dataset.lk;if(COL.types[k]?.n){openCard(k)}else openLocked(k);return}
  const m=e.target.closest(".mini");if(!m)return;const k=m.dataset.k;
  if(!COL.types[k]){openLocked(k);haptic(20);return}
  cardK=k;openCard(k);
};
function collectionNextSet(){
  let goal=null;
  for(const set of SETS_T){
    const missing=set.t.filter(k=>!COL.types[k]?.n);
    if(!missing.length||missing.length===set.t.length)continue;
    const got=set.t.length-missing.length;
    if(!goal||missing.length<goal.remaining||(missing.length===goal.remaining&&got>goal.got))
      goal={set,got,remaining:missing.length,next:missing.find(k=>S.loaded&&!S.lastKnown&&S.list.some(a=>a.type===k&&a.el>=10&&!a.emg))||missing[0]};
  }
  return goal;
}
function cardSetResult(k){
  const relevant=SETS_T.filter(set=>set.t.includes(k));
  if(!relevant.length)return "";
  const ranks=relevant.map(set=>({name:set.n,total:set.t.length,got:set.t.filter(type=>COL.types[type]?.n).length}));
  ranks.sort((a,b)=>(a.total-a.got)-(b.total-b.got)||b.got-a.got);
  const {name,total,got}=ranks[0];
  return got===total?"Sada dokončená: "+name:name+" · "+got+"/"+total;
}
function firstCatchNote(v){
  const time=v.fp?.t||(!v.srv&&v.first);
  if(!time||!Number.isFinite(Number(time)))return v.srv?"Kartička obnovená zo zbierky":"";
  const date=new Date(Number(time));
  if(!Number.isFinite(date.getTime()))return "";
  const day=date.toLocaleDateString("sk-SK",{timeZone:"Europe/Bratislava",day:"numeric",month:"long",year:"numeric"});
  return (v.srv?"Prvý zaznamenaný úlovok":"Prvý úlovok")+" · "+day+(v.fp?.town?" · "+v.fp.town:"");
}
function cardProgress(k,v){
  if(v.srv&&!v.fp)return "Obnovená kartička";
  const next=nextLv(v.n,k);
  return next?v.n+" z "+next+" lietadiel do ďalšej hviezdy":"Najvyššia úroveň kartičky";
}
function cardStarMilestone(k,v){
  const level=cardLvl(v.n,k);
  return level>1&&level>cardLvl(v.n-1,k)?level:0;
}
function cardCatchProgress(k,v){
  const level=cardStarMilestone(k,v);
  const title=level?"Nová hviezda · úroveň "+level+" z 4":"Ďalší "+catGuess(k).name+" v zbierke";
  return title+" · "+cardProgress(k,v);
}
function cardFormPicker(v){
  const owned=FORMS.filter(([key])=>hasCardForm(v,key));
  if(!owned.length)return "";
  const form=cardVisibleForm||"-";
  return `<div class="cardFormPicker" role="group" aria-label="Vzhľad kartičky">${[["-","","Originál"],...owned].map(([key,icon,label])=>
    `<button type="button" data-card-form-choice="${key}" aria-pressed="${key===form}" style="--form-ink:${FORM_ART[key]?.ink||"#d5e6ff"}"><span aria-hidden="true">${icon||"◇"}</span> ${label}</button>`).join("")}</div>`;
}
function shownCard(v){return {...v,coverForm:cardVisibleForm||"-"}}
function openCard(k,reveal,form){
  const v=COL.types[k];if(!v)return;
  if(typeof renderAtlasCardResult==="function")renderAtlasCardResult(k);
  const modal=$("cardM"),root=$("cardBig"),video=$("cardVideo"),share=$("cardShare"),r=typeTier(k);
  if(!modal.classList.contains("on"))modal.returnFocus=document.activeElement;
  $("cardCollection").hidden=!reveal;
  $("cardCollection").onclick=()=>{
    closeModal(modal);
    atlasMode="mine";atlasOpen=true;atlasRare=false;setView("col");
    const tile=$("c-types").querySelector('[data-k="'+CSS.escape(k)+'"]');
    if(tile){tile.scrollIntoView({block:"center"});requestAnimationFrame(()=>tile.focus({preventScroll:true}))}
  };
  cardK=k;
  cardVisibleForm=hasCardForm(v,form)?form:cardCoverForm(v);
  modal.classList.remove("locked");
  const face=()=>{
    const first=firstCatchNote(v),relay=cardRelay(k,v);
    root.innerHTML=`<h2 class="cardHeadline" tabindex="-1">${esc(catGuess(k).name)}</h2>
      <div class="holoWrap ${r} ${v.shiny?"shiny":""} ${reveal&&!RM()?"reveal":""}">${cardSVG(k,shownCard(v),{id:"b"})}</div>
      ${typeof reveal==="string"&&reveal.startsWith("Nová hviezda")?`<p class="cardLevelReward" role="status">${esc(reveal.split(" · ")[0])} · ${cardLvl(v.n,k)}/4</p>`:""}
      ${relay?`<p class="relayProof">Letová štafeta · ${esc(KRAJ[relay.k][2])} a ${esc(KRAJ[relay.other][2])} kraj · ${new Date(relay.t).toLocaleDateString("sk-SK",{timeZone:"Europe/Bratislava"})}</p>`:""}
      ${cardFormPicker(v)}
      <p class="cardIdentity">${v.ver?"✓ Overená":v.n?"Neoverená":"Darovaná kópia"}${v.n?" · "+esc(cardProgress(k,v)):""}</p>
      ${first&&v.n?`<p class="cardFirstCatch">${esc(first)}</p>`:""}
      <details class="cardDetails"><summary>Údaje o kartičke</summary>${collectorDossier(k,v)}${cardExtras(k,v)}</details>`;
    share.style.visibility="";share.style.display=v.n?"":"none";
    video.hidden=!vidOK()||!v.n;
    cardStat(k);
    root.querySelector("h2").focus({preventScroll:true});
    if(reveal)ping(r);
  };
  modal.classList.add("on");bindTilt();
  if(!reveal||RM()){face();return}
  share.style.display="none";video.hidden=true;
  root.innerHTML=`<div class="revealScene ${r}"><button type="button" class="cardBack ${r}"><b aria-hidden="true">✈</b><span>Odhaliť kartičku</span></button></div>`;
  const back=root.querySelector(".cardBack");
  back.onclick=face;
  back.focus({preventScroll:true});
  setTimeout(()=>{if(modal.classList.contains("on")&&root.contains(back))face()},typeof reveal==="string"&&reveal.startsWith("Nová kartička")?450:800);
}
function cardExtras(k,v){
  const r=typeTier(k),al=v.al?Object.keys(v.al):[];
  const aircraft=CAT[k];
  const verL=v.ver?`<div class="verOk">✓ Overená${v.seq?" · č. "+v.seq+" na Slovensku":""}</div>`:v.n?`<div class="verNo">⏳ Zatiaľ neoverená · <button data-why="1" style="display:inline;margin:0">🔎 Prečo?</button><div class="whyList" id="whyList"></div></div>`:"";
  let h=`<div class="cardInfo">${verL}${v.n?`<div class="lookSub" style="text-align:center">${stars(cardLvl(v.n,k))} · ${esc(cardProgress(k,v))}</div>`:""}<div class="lookSub" id="cardStat"></div>`;
  // tlačidlá hneď pod kartičkou (na malom displeji nie sú schované pod lištou)
  if(v.n){h+=`<div class="cardBtns"><button class="btn sec" data-card-link="${esc(k)}">Zdieľať odkaz</button>`;const pin=(COL.show||[]).includes(k);h+=`<button class="btn sec" data-pin="${esc(k)}">${pin?"📌 Vo vitríne":"📌 Do vitríny"}</button>`;
    if(["c","u"].includes(r)&&(v.n|0)>=2&&!(typeof KID==="function"&&KID()))h+=v.ver?`<button class="btn sec" data-gift="${esc(k)}">🎁 Daruj kópiu</button>`:`<button class="btn sec" disabled title="Darovať sa dá len overená kartička">🎁 Daruj (po overení)</button>`;
    h+=`</div>`}
  if(aircraft)h+=`<dl class="cardAircraft"><div><dt>Rozpätie</dt><dd>${nf(aircraft.span,1)} m</dd></div><div><dt>Dĺžka</dt><dd>${nf(aircraft.len,1)} m</dd></div>${aircraft.range==null?"":`<div><dt>Dolet</dt><dd>${nf(aircraft.range)} km</dd></div>`}<div><dt>Kapacita</dt><dd>${aircraft.seats?nf(aircraft.seats)+" "+pl(aircraft.seats,"miesto","miesta","miest"):"—"}</dd></div></dl>
    <p class="lookSub">${esc(aircraft.fact)}</p>`;
  if(v.n)h+=`<ul class="cardFormGuide" aria-label="Podmienky foriem">${FORMS.map(([key,icon,label,rule])=>`<li><span aria-hidden="true">${icon}</span><b>${label}</b><small>${hasCardForm(v,key)?"Odomknutá":rule}</small></li>`).join("")}</ul>`;
  // mesto je už v päte kartičky – tu len to, čo tam nie je (kam letel, výška, dátum)
  if(v.fp&&(v.fp.dest||v.fp.alt))h+=`<div class="lookSub">Pri prvom úlovku${v.fp.dest?" letel → "+esc(v.fp.dest):""}${v.fp.alt?" · "+nf(v.fp.alt).replace(/\s/g,"\u00a0")+"\u00a0m":""}</div>`;
  {const eds=Object.entries(COL.ed||{}).filter(([,g])=>g.ty===k);if(eds.length)h+=`<div class="lookSub">📅 ${eds.map(([,g])=>esc(g.n)+(g.no?" · č. "+g.no:"")).join(" · ")}</div>`}
  if(al.length)h+=`<div class="lookSub">🎨 Aerolinky na tejto kartičke: ${al.map(x=>esc(AIRLINES[x]||x)).join(", ")}</div>`;
  return h+`</div>`;
}
// 🇸🇰 „Má ju X % hráčov“ + objaviteľ (server)
async function cardStat(k){
  if(!SOC.api)return;try{const {ok,j}=await getJSON(SOC.api+"/api/cardstat?type="+encodeURIComponent(k)+(S.pos&&typeof krajOf==="function"?"&k="+krajOf(S.pos):""),5000);const el=$("cardStat");if(!ok||!j||!el||cardK!==k||!$("cardM").classList.contains("on"))return;
    const pct=j.players?Math.max(.1,Math.round(j.own/j.players*1000)/10):0;
    if(!j.own&&COL.types[k]&&COL.types[k].ver){el.innerHTML="";return}
    el.innerHTML=(j.own?`🇸🇰 Na Slovensku ju ${j.own>=2&&j.own<=4?"majú":"má"} ${nf(j.own)} ${pl(j.own,"spotter","spotteri","spotterov")}${j.players?" ("+String(pct).replace(".",",")+" %)":""}`:"🇸🇰 Na Slovensku ju ešte nikto nemá overenú – buď prvý!")+(j.kraj?(()=>{const kp=Math.round(j.kraj.own/j.kraj.players*1000)/10,KN=(typeof KRAJ!=="undefined"&&KRAJ[j.kraj.k]?KRAJ[j.kraj.k][2]:j.kraj.k);return `<br>📍 ${esc(KN)} kraj: ${String(kp).replace(".",",")} % zberateľov${kp<5&&kp<pct?" – <b>u vás vzácna 🔥</b>":kp>pct*2?" – u vás bežná":""}`})():"")+(j.first?`<br>🧭 Objaviteľ: <b>${esc(typeof KID==="function"&&KID()?"Spotter":j.first.nick)}</b>${j.first.town?" · "+esc(j.first.town):""} · ${new Date(j.first.t).toLocaleDateString("sk-SK")}`:"")}catch(e){}
}
$("cardBig").addEventListener("click",async e=>{
  const choice=e.target.closest("[data-card-form-choice]");
  if(choice){
    const v=COL.types[cardK],key=choice.dataset.cardFormChoice;
    if(!v?.n||(key!=="-"&&!hasCardForm(v,key)))return;
    cardVisibleForm=key==="-"?"":key;
    v.coverForm=key;
    LS.set("ctl_col",COL);
    const wrap=$("cardBig").querySelector(".holoWrap");
    wrap.classList.remove("reveal");
    wrap.innerHTML=cardSVG(cardK,v);
    if(!RM())wrap.querySelector("svg").animate([{opacity:.55},{opacity:1}],{duration:240,easing:"ease-out"});
    for(const b of choice.parentElement.children)b.setAttribute("aria-pressed",String(b===choice));
    for(const tile of $("c-types").querySelectorAll(".mini[data-k]")){
      if(tile.dataset.k===cardK){
        const svg=tile.querySelector("svg[data-card-form]");
        if(svg){svg.insertAdjacentHTML("afterend",cardMini(cardK,v));svg.remove()}
      }
    }
    renderShow();
    return;
  }
  const pn=e.target.closest("[data-pin]");if(pn){const k=pn.dataset.pin;COL.show=showList();COL.showManual=true;const i=COL.show.indexOf(k);
    if(i>=0)COL.show.splice(i,1);else{if(COL.show.length>=showSlots()){toast("🏛️ Vitrína je plná","Ďalšie miesto si odomkneš za míle ✈ v obchode");return}COL.show.push(k)}
    LS.set("ctl_col",COL);pn.textContent=COL.show.includes(k)?"📌 Vo vitríne":"📌 Do vitríny";renderShow();haptic(10);return}
  const gf=e.target.closest("[data-gift]");if(gf)giftMake(gf.dataset.gift);
  if(e.target.closest("[data-why]"))whyShow();
});
$("cardClose").onclick=()=>$("cardM").classList.remove("on");
function tiltTo(rx,ry){const c=$("cardBig").querySelector(".holoWrap");if(!c)return;if(typeof RM==="function"&&RM()){rx=0;ry=0}c.style.setProperty("--rx",rx+"deg");c.style.setProperty("--ry",ry+"deg");c.style.setProperty("--mx",(50+ry*3)+"%");c.style.setProperty("--my",(50-rx*3)+"%");c.style.setProperty("--ang",(ry*10+rx*6)+"deg")}
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
HOOKS.caught.push((a,r,{upgrading})=>{
  const ty=a.type||"?",v=COL.types[ty];if(!v)return;
  const W=LASTWAVE&&LASTWAVE.hex===a.hex?LASTWAVE:null;let msg=null;
  if(W&&W.shiny&&!v.shiny&&WB){WB.special="Lesklá kartička";WB.type=ty}
  if(W&&W.shiny){v.shinyN=(v.shinyN|0)+1;if(!v.shiny){v.shiny=Date.now();msg=["✨ LESKLÁ KARTIČKA!",(v.name||ty)+" – dnes je toto lietadlo lesklé pre všetkých, čo mu zamávajú"]}}
  if(W&&W.seq&&!v.seq)v.seq=W.seq;
  if(W&&(W.firstK||W.firstT)&&W.seq!==1){v.firstK=W.firstK?1:0;v.firstT=W.firstT?1:0}
  if(W&&W.ed&&edAdd(ty,W.ed)){
    if(WB){WB.special=WB.special||W.ed.n;WB.type=ty}
    msg=msg||["📅 Edícia: "+W.ed.n,"Tvoja kartička má číslo "+W.ed.no+" – bol si pri tom!"];
  }
  // Dochované formy patria k pôvodnému pozorovaniu, nie k neskoršiemu dohľadaniu typu.
  if(upgrading){LS.set("ctl_col",COL);return}
  v.forms=v.forms||{};const sa=typeof SPACE!=="undefined"?SPACE.sunAlt():null,c=COL.cx&&COL.cx[a.hex],fm=v.forms,got=[];
  const set=(k)=>{if(!fm[k]){fm[k]=Date.now();got.push(FORMS.find(f=>f[0]===k))}};
  if(sa!=null&&sa<-6&&a.el>=20)set("n");
  if(sa!=null&&sa>-4&&sa<6)set("g");
  if(a.el>=80)set("z");
  if(c&&c.dc==="SK")set("h");
  try{if(WX&&WX.data&&WX.data.current&&WX.data.current.temperature_2m<0)set("f")}catch(e){}
  if(fm.n&&!v.night)v.night=fm.n;
  if(got.length&&WB&&ty!=="?"){
    WB.form=got[0][0];
    WB.special=WB.special||"Nová forma · "+got[0][2];
    WB.type=ty;
  }
  if(got.length&&!msg)msg=[got[0][1]+" Nová forma: "+got[0][2],(v.name||ty)+" · formy "+FORMS.filter(f=>fm[f[0]]).length+"/5"];
  if(v.gift&&v.n===1){v.gift.done=1;COL.pts+=5;msg=msg||["🤝 Splnený sľub!",(v.name||ty)+" – darovaná kartička je teraz celá tvoja · +5 b"]}
  if(!CAT[ty]&&!v.offset){v.offset=1;msg=msg||["⭐ Mimo série!",(v.name||ty)+" – typ, ktorý nie je ani v atlase"]}
  LS.set("ctl_col",COL);
  if(msg&&!WB)setTimeout(()=>toast(msg[0],msg[1],"#ff4fd8"),3500);
});
$("cardBig").addEventListener("click",async event=>{
  const button=event.target.closest("[data-card-link]");
  const key=button?.dataset.cardLink;
  if(!key||!COL.types[key]?.n)return;
  const url=shareUrl("c",key),title=catGuess(key).name+" · Čo to letí?";
  try{
    if(navigator.share){await navigator.share({title,url});return}
  }catch(error){if(error.name==="AbortError")return}
  try{
    await navigator.clipboard.writeText(url);
    button.textContent="Odkaz skopírovaný";
  }catch(error){prompt("Skopíruj odkaz na kartičku",url)}
});
$("cardShare").onclick=async()=>{
  const key=cardK,card=COL.types[key];if(!card)return;
  const v=shownCard(card);
  const svg=await cardExportSVG(key,v,{id:"s",public:true}),img=new Image(),W=1080,H=1920;
  img.onload=()=>{
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,"#0d1430");g.addColorStop(1,v.shiny?"#5a1f6b":{c:"#1b2a6b",u:"#0b4a33",r:"#0a2a66",e:"#3a1670",l:"#5a3d00"}[typeTier(key)]);x.fillStyle=g;x.fillRect(0,0,W,H);
    for(let i=0;i<120;i++){x.fillStyle=`rgba(255,255,255,${Math.random()*.6})`;x.beginPath();x.arc(Math.random()*W,Math.random()*H,Math.random()*2.2,0,7);x.fill()}
    // osobná trofej, obsah v bezpečnej zóne príbehu (Instagram: 250–1600 px), spodok voľný na nálepky
    x.textAlign="center";x.fillStyle="#fff";x.font="800 50px Unbounded, sans-serif";x.fillText(v.shiny?"✨ Mám lesklú kartičku!":"👋 Zamával(a) som mu!",W/2,290);
    x.drawImage(img,(W-750)/2,390,750,1050);
    x.font="800 40px Inter, sans-serif";x.fillStyle=v.ver?"#6dffc7":"rgba(255,255,255,.6)";x.fillText(v.ver?"✓ Overená"+(v.seq?" · č. "+v.seq+" na Slovensku":""):"⏳ zatiaľ neoverená",W/2,1495);
    x.fillStyle="#6dffc7";x.font="900 52px Unbounded, sans-serif";x.fillText("Čo to letí? ✈️",W/2,1565);
    x.fillStyle="rgba(255,255,255,.85)";x.font="500 32px Inter, sans-serif";x.fillText("Zamávaj aj ty → "+APP_HOST,W/2,1612);

    c.toBlob(b=>b&&shareBlob(b,"kartička.png",(v.shiny?"✨ Lesklá ":"")+"kartička: "+(catGuess(key).name)+(v.ver&&v.seq?" · č. "+v.seq+" na Slovensku":"")+" ✈️ "+shareUrl("c",key)+TAGS),"image/png");
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
const ALBUMS=[["typ","Typy"],["rec","Rekordy"],["hid","Skryté"]];
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
  const tabs=`<div class="albums" style="grid-column:1/-1">${ALBUMS.map(([a,l])=>{
    const list=SETS.filter(s=>s.alb===a),done=list.filter(s=>COL.sets?.[s.id]).length;
    return `<button class="${albumSel===a?"on":""}" data-alb="${a}" aria-pressed="${albumSel===a}">${l}<small>${done}/${list.length}</small></button>`;
  }).join("")}</div>`;
  return tabs+setRows(albumSel);
}
// Obálka používa reprezentanta danej typovej sady.
const SET_COVERS={
  a320:["A320","#6eeaca"],b737:["B738","#9ba9ff"],jumbo:["A388","#78c6ff"],dream:["B789","#d5b4ff"],
  a330:["A333","#71d8e2"],b7x7:["B752","#edb66a"],baby:["CRJ9","#b3e887"],emb:["E190","#67e0b0"],
  prop:["AT76","#e9d082"],heli:["B429","#ffad84"],biz:["GLF6","#e2d0ff"],tprop:["PC12","#91c6ec"],
  heavy:["A400","#c0d3a2"],nato:["E3TF","#8fc9df"],guard:["EUFI","#f5b08e"],cssr:["L410","#feaa9f"],
  para:["AN2","#e5ce91"],small:["C172","#a7def4"],whale:["A3ST","#a6a3fb"]
};
function setCover(set){
  const [chosen,ink]=SET_COVERS[set.id]||[set.t[0],"#a6bfd9"];
  const code=set.t.includes(chosen)?chosen:set.t[0];
  const id="set-"+set.id;
  const asset=CARD_ILLUSTRATIONS[code+":"];
  const illustration=asset?`<img src="${cardArtURL("",code)}" alt="" loading="lazy" width="76" height="54">`:
    `<svg viewBox="0 0 76 54" width="76" height="54" aria-hidden="true"><defs>${svgDefs(id,"#eff7ff",ink,"#acc9e5")}</defs>
      <path d="M1 44 41 4m3 50 31-31" stroke="${ink}" stroke-opacity=".26"/><circle cx="39" cy="26" r="19" fill="none" stroke="${ink}" stroke-opacity=".34"/>
      <g transform="translate(11 1) rotate(-31 26 26)">${planeSVG(CAT[code],{box:52,id,acc:ink})}</g></svg>`;
  return `<span class="setCover" style="--set-ink:${ink}" aria-hidden="true">${illustration}</span>`;
}
function setRows(mode){
  const list=SETS.filter(s=>s.alb===mode);
  return `<div class="sets">${list.map(s=>{const pr=setProg(s),h=pr.filter(Boolean).length,dn=!!COL.sets?.[s.id],hid=s.alb==="hid"&&!dn&&h===0;
    const lab=(x,i)=>s.t?(CAT[s.t[i]]?CAT[s.t[i]].name:s.t[i]):s.slots[i].l;
    return `<details class="setRow ${dn?"done":""}" data-set-id="${esc(s.id)}"><summary class="setSummary">${s.alb==="typ"?setCover(s):`<span class="si" aria-hidden="true">${hid?"✉️":s.i}</span>`}<span class="sn">${hid?"Skrytá sada":s.n}<small>${hid?"Hádanka: "+s.d:s.d} · ${dn?"hotovo ✅":"odmena +"+setReward(s)+"\u00a0b"}</small></span><span class="sp">${dn?"✅":h+"/"+pr.length} <span aria-hidden="true">›</span></span></summary>
      <div class="setSlots">${hid?"":pr.map((ok,i)=>s.t?`<button data-lk="${esc(s.t[i])}" class="${ok?"got":""}">${ok?"✅":"🔒"} ${esc(lab(ok,i))}</button>`:`<span class="${ok?"got":""}">${ok?"✅":"🔒"} ${esc(lab(ok,i))}</span>`).join("")}</div></details>`}).join("")}</div>`;
}
function setsCheck(a){
  COL.sets=COL.sets||{};let msg=null;
  for(const s of SETS){if(COL.sets[s.id])continue;if(setProg(s).every(Boolean)){const b=setReward(s);COL.sets[s.id]=Date.now();COL.pts+=b;msg=["📚 Kompletná sada: "+s.n,"+"+b+" bodov"+(s.alb==="hid"?" · odhalil si skrytú sadu!":"")]}}
  const mk=monthKey();if(COL.month!==mk&&monthNew()>=MONTH_GOAL){COL.month=mk;COL.pts+=MONTH_BONUS;msg=msg||["🗓️ Mesačná výzva splnená!","+"+MONTH_BONUS+" bodov za "+MONTH_GOAL+" nové objavy"]}
  if(msg){LS.set("ctl_col",COL);setTimeout(()=>{toast(msg[0],msg[1],"#ffcf4f");confetti(90)},typeof WB!=="undefined"&&WB?0:3600)}
}
/* 📅 edície „Bol som pri tom“ – číslované serverom, zmeškané sa nedajú doplniť */
const EDS=[["advent2026","🕯️","Prvá adventná nedeľa 2026","29. 11. 2026","2026-11-28T23:00:00Z","2026-11-29T23:00:00Z"],["mikulas2026","🎅","Mikulášske lietadlo 2026","6. 12. 2026","2026-12-05T23:00:00Z","2026-12-06T23:00:00Z"],["lucia2026","🕯️","Lucia 2026","13. 12. 2026","2026-12-12T23:00:00Z","2026-12-13T23:00:00Z"],["zslnovrat2026","🌌","Zimný slnovrat 2026","21. 12. 2026 – najdlhšia noc","2026-12-20T23:00:00Z","2026-12-21T23:00:00Z"],["vianoce2026","🎄","Štedrý deň 2026","24. 12. 2026","2026-12-23T23:00:00Z","2026-12-24T23:00:00Z"],["santa2026","🛷","Santa 2026","24. 12. 2026 15:00–22:00 · ulov Santove sane","2026-12-24T14:00:00Z","2026-12-24T21:00:00Z"],["silvester2026","🎆","Posledné lietadlo 2026","31. 12. 2026 večer","2026-12-31T19:00:00Z","2026-12-31T23:00:00Z"],["novyrok2027","🥂","Prvé lietadlo 2027","1. 1. 2027","2026-12-31T23:00:00Z","2027-01-01T23:00:00Z"],["valentin2027","❤️","Valentínske lietadlo 2027","14. 2. 2027","2027-02-13T23:00:00Z","2027-02-14T23:00:00Z"],["rovnodennost2027","🌗","Jarná rovnodennosť 2027","20. 3. 2027","2027-03-19T23:00:00Z","2027-03-20T23:00:00Z"],["stefanik2027","⭐","Deň Štefánika 2027","4. 5. 2027","2027-05-03T22:00:00Z","2027-05-04T22:00:00Z"],["detom2027","🧒","Deň detí 2027","1. 6. 2027","2027-05-31T22:00:00Z","2027-06-01T22:00:00Z"],["slnovrat2027","☀️","Letný slnovrat 2027","21. 6. 2027","2027-06-20T22:00:00Z","2027-06-21T22:00:00Z"],["zatmenie2027","🌘","Zatmenie Slnka 2027","2. 8. 2027, 10:10–12:30 (do Slnka nepozeraj!)","2027-08-02T08:10:00Z","2027-08-02T10:30:00Z"],["perzeidy2027","🌠","Noc Perzeíd 2027","12./13. 8. 2027","2027-08-12T20:00:00Z","2027-08-13T02:00:00Z"],["snp2027","🇸🇰","Výročie SNP 2027","29. 8. 2027","2027-08-28T22:00:00Z","2027-08-29T22:00:00Z"],["halloween2027","🎃","Strašidelné lietadlo 2027","31. 10. 2027 po zotmení","2027-10-31T16:00:00Z","2027-10-31T23:00:00Z"]];
// zapíše edíciu zo servera (živé mávnutie, odložené z fronty aj synchronizácia); true = nová
function edAdd(ty,ed){if(!ed||!ed.id)return false;COL.ed=COL.ed||{};if(COL.ed[ed.id])return false;COL.ed[ed.id]={n:ed.n,no:ed.no|0,t:Date.now(),ty:ty||""};LS.set("ctl_col",COL);return true}
// práve prebiehajúca alebo najbližšia edícia (bez santa – tú dáva Santa, nie server)
function edNext(now=Date.now()){return EDS.find(e=>!e[0].startsWith("santa")&&Date.parse(e[5])>now)||null}
function edCountdown(){const e=edNext();if(!e)return "";const now=Date.now(),f=Date.parse(e[4]),live=now>=f,dd=Math.ceil((f-now)/864e5),hh=Math.ceil((f-now)/36e5),g=(COL.ed||{})[e[0]];
  return `<div class="setRow ${live?"done":""}" style="grid-column:1/-1"><span class="si">${e[1]}</span><span class="sn">${live?(g?"Máš ju! Edícia "+e[2]+(g.no?" · č. "+g.no:""):"PRÁVE TERAZ: "+e[2]):"Najbližšia edícia: "+e[2]}<small>${live?(g?"Ďalšia edícia príde čoskoro":"Zamávaj ktorémukoľvek lietadlu nad tebou (GPS, aspoň 10°) a dostaneš číslovanú kartičku"):hh<=48?"začína o "+hh+" "+pl(hh,"hodinu","hodiny","hodín"):"o "+dd+" "+pl(dd,"deň","dni","dní")+" · "+e[3]}</small></span><span class="sp">${live?(g?"✅":"⏳"):"📅"}</span></div>`}
// Každá edícia má vlastné farby a scénu. Ilustrované položky používajú samostatný WebP.
const EDITION_DESIGN={
  advent2026:["#fff1a3","#193c36","n",true],
  mikulas2026:["#ffd0ce","#501936","f",true],
  lucia2026:["#eef7ff","#324766","f",true],
  zslnovrat2026:["#d5c4ff","#222656","n",true],
  vianoce2026:["#ffe6a6","#142c46","n",true],
  santa2026:["#ffd697","#523058","n",true],
  silvester2026:["#fec9fa","#36245c","z",true],
  novyrok2027:["#ffecb4","#183c49","g",true],
  valentin2027:["#ffbad5","#63213d","g",true],
  rovnodennost2027:["#c9ffcf","#244c50","h",true],
  stefanik2027:["#ffd59e","#394650","classic"],
  detom2027:["#9ef4ff","#224a73","classic"],
  slnovrat2027:["#fff59b","#63521b","g"],
  zatmenie2027:["#f3e4ff","#32253f","z"],
  perzeidy2027:["#bacaff","#1f1d48","n"],
  snp2027:["#e1f3bc","#42513b","h"],
  halloween2027:["#ffd0a2","#4e2e55","n"]
};
function editionCard(edition,owned,preview=false){
  const [id,icon,name,dateLabel]=edition;
  const [ink,base,scene,illustrated]=EDITION_DESIGN[id]||["#b7d2ff","#27395c","classic"];
  const art=illustrated?"lib/card-art/ed-"+id+".webp"+CARD_ART_REV:cardArtURL(scene);
  const now=Date.now();
  const status=owned?(owned.no>0?"Č. "+nf(owned.no):"Získaná"):now>=Date.parse(edition[5])?"Ukončená":now>=Date.parse(edition[4])?"Prebieha":"Pripravuje sa";
  return `<div class="editionCard${preview?" editionCardDetail":""}" style="--ed-ink:${ink};--ed-base:${base}" data-edition-card="${id}">
    <span class="editionLabel">BOL SOM PRI TOM</span>
    <div class="editionArt${illustrated?" editionPainted":""}"><img src="${art}" alt="" loading="${preview?"eager":"lazy"}" width="386" height="310">
      ${illustrated?"":`<span class="editionIcon" aria-hidden="true">${icon}</span>`}</div>
    <div class="editionCaption"><strong>${esc(name)}</strong><small>${esc(status)} · ${esc(dateLabel.split(" · ")[0])}</small></div>
  </div>`;
}
function openEdition(id){
  const edition=EDS.find(e=>e[0]===id);
  if(!edition)return;
  const dialog=$("editionDetail"),owned=COL.ed?.[id];
  $("editionDetailTitle").textContent=edition[2];
  $("editionDetailFace").innerHTML=editionCard(edition,owned,true);
  const caught=owned?.ty;
  const aircraft=caught==="SLEIGH"?"Santove sane":caught&&caught!=="?"?catGuess(caught).name:"";
  $("editionDetailProof").textContent=owned?(aircraft?"Získaná pri úlovku · "+aircraft:"Získaná edícia"):
    Date.now()>=Date.parse(edition[5])?"Táto edícia sa už skončila.":
    id==="santa2026"?"Získava sa pri úlovku Santových saní.":"Získava sa overeným mávnutím počas edície.";
  if(!dialog.open)dialog.showModal();
}
function edHTML(){
  const owned=COL.ed||{};
  const shinyCount=Object.values(COL.types).filter(card=>card.shiny).length;
  return `<div class="sets">${edCountdown()}</div>
    <div class="editionGrid">${EDS.map(edition=>{
      const [id]=edition,record=owned[id];
      return `<button class="editionTile" type="button" data-open-edition="${id}">${editionCard(edition,record)}</button>`;
    }).join("")}</div>
    <p class="lookSub" style="grid-column:1/-1">✨ Približne 1 zo 70 lietadiel je lesklé. Pri vzácnejších typoch je šanca vyššia, pri legendárnych až 1 z 10.
      ${shinyCount?"Máš "+shinyCount+" "+pl(shinyCount,"lesklú","lesklé","lesklých")+".":"Zatiaľ nemáš žiadnu lesklú kartičku."}</p>`;
}
// pri otvorení appky: dnes je edícia → jedno upozornenie denne
setTimeout(()=>{try{const e=edNext(),now=Date.now();if(!e||now<Date.parse(e[4])||(COL.ed||{})[e[0]]||LS.get("ctl_edHint","")===e[0])return;LS.set("ctl_edHint",e[0]);toast(e[1]+" Dnes je edícia: "+e[2],"Zamávaj ktorémukoľvek lietadlu a získaš číslovanú kartičku „Bol som pri tom“","#ffcf4f")}catch(x){}},9000);
// opakovaný úlovok toho istého typu zvyšuje úroveň kartičky
HOOKS.caught.push(a=>{
  const v=COL.types[a.type||"?"];if(!v)return;
  const l=cardLvl(v.n,a.type),pl=cardLvl(v.n-1,a.type);
  if(v.n>1&&l>pl)setTimeout(()=>toast("⭐ Kartička povýšená: "+(v.name||a.type),stars(l)+" · zamávané "+v.n+"×","#ffcf4f"),typeof WB!=="undefined"&&WB?0:2600);
  setsCheck(a);
});
// do atlasu: sady nad kartičkami, hviezdy na kartičkách
{const base=renderCards;renderCards=function(){setsCheck();base();
  $("monthlyChallenge").innerHTML=monthHTML();}}

/* 📖 Encyklopédia: aj neulovené lietadlo má svoju stránku – vieš, čo hľadať */
function openLocked(k){
  $("cardCollection").hidden=true;
  const c=CAT[k];if(!c){toast("🔒 "+k,"Toto lietadlo ešte v zbierke nemáš. Pozeraj hore!");return}
  const r=cardRar(k),nf2=n=>n==null?"–":Number(n).toLocaleString("sk-SK");
  const glider=c.fam==="glider"||c.fam==="motorGlider";
  const hint=glider||k==="Z43"?"Hľadaj ho pri aerokluboch počas lietania. Na radare sa objaví, keď živé dáta zachytia jeho polohu.":r==="l"?"Legendárne – nad Slovenskom ho uvidíš len párkrát do roka. Keď poletí pri tebe, appka ti dá vedieť (ak máš zapnuté upozornenia).":r==="e"?"Epické – vojenské a špeciálne lietadlá, nad Slovenskom len občas. Sleduj oblohu pri cvičeniach a leteckých dňoch.":r==="r"?"Vzácne – občas preletí, najčastejšie na diaľkových linkách vysoko nad nami.":r==="u"?"Menej bežné – oplatí sa pozerať hore ráno a podvečer.":"Bežné – nad Slovenskom lieta denne. Stačí pozrieť hore a zamávať.";
  $("cardBig").innerHTML=`<div class="mcard lockedCard" style="text-align:left">
    <div class="lbl"><span>📖 Atlas · č. ${c.no}</span><span>🔒 neulovené</span></div>
    <div class="lockSil">${cardSVG(k,null,{id:"locked"})}</div>
    <div style="font-size:26px;font-weight:900;margin:6px 0 2px">${esc(c.name)}</div>
    <div class="lookSub">${esc(c.maker)} · ${RAR[r].n}</div>
    <div class="lockStats">
      <div><b>${nf2(c.len)} m</b><small>dĺžka</small></div><div><b>${nf2(c.span)} m</b><small>rozpätie</small></div>
      <div><b>${c.seats?nf2(c.seats):"—"}</b><small>${c.seats?pl(c.seats,"miesto","miesta","miest"):"náklad"}</small></div>${c.range==null?"":`<div><b>${nf2(c.range)} km</b><small>dolet</small></div>`}
      <div><b>${nf2(c.spd)} km/h</b><small>${glider?"max. rýchlosť":"rýchlosť"}</small></div>${c.year?`<div><b>${c.year}</b><small>prvý let</small></div>`:""}
    </div>
    <p style="margin:12px 0 6px;line-height:1.45">💡 ${esc(c.fact)}</p>
    <p class="lookSub" style="margin:0">🔭 ${hint}</p>
    ${(()=>{const ls=lastSeenType(k);return ls?`<p class="lookSub" style="margin:8px 0 0">👀 Naposledy nad tebou: ${ls}</p>`:""})()}
    <div class="acts" style="margin-top:8px"><button class="btn ${collectorHuntKey()===k?"sec":"pri"}" data-hunt-pick="${esc(k)}">${collectorHuntKey()===k?"🎯 Toto je môj cieľ":"🎯 Chcem uloviť túto kartičku"}</button></div>
    <details class="cardDetails"><summary>Ďalšie možnosti</summary>
    ${["c","u"].includes(r)&&!(typeof KID==="function"&&KID())?`<div class="acts" style="margin-top:8px"><button class="btn sec" data-ask="${esc(k)}">🤝 Popros kamaráta o kópiu</button></div>`:""}
    <div class="acts" style="margin-top:8px"><button class="btn ${typeWatched(k)?"sec":"pri"}" data-watch="${esc(k)}">${typeWatched(k)?"🔔 Upozorním ťa – zrušiť":"🔔 Upozorni ma, keď poletí nado mnou"}</button></div></details>
  </div>`;
  $("cardShare").style.display="none";$("cardM").classList.add("on","locked");
}
{const cl=$("cardClose").onclick;$("cardClose").onclick=()=>{$("cardShare").style.display="";$("cardM").classList.remove("locked");cl()}}
const _ol=openLocked;openLocked=k=>{_ol(k);if($("cardVideo"))$("cardVideo").hidden=true};

function openSharedCard(){
  const match=location.hash.match(/^#karta=([A-Z0-9]{2,5})$/);
  if(!match||!CAT[match[1]])return;
  if(!LS.get("ctl_onb",0)){afterOnb(openSharedCard);return}
  history.replaceState(null,"",location.pathname+location.search);
  const k=match[1],owned=COL.types[k]?.n;
  atlasMode=owned?"mine":"miss";setView("col");
  if(owned)openCard(k);else openLocked(k);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",openSharedCard,{once:true});
else openSharedCard();
addEventListener("hashchange",openSharedCard);
$("cardBig").addEventListener("click",e=>{const b=e.target.closest("[data-hunt-pick]");if(!b)return;const k=b.dataset.huntPick;if(!CAT[k]||TROPHY.has(k))return;LS.set("ctl_collectorHunt",k);b.textContent="🎯 Toto je môj cieľ";b.classList.remove("pri");b.classList.add("sec");if(atlasMode==="mine"||atlasMode==="miss")renderCards();renderCollectorHuntHome();toast("🎯 Osobný lov: "+CAT[k].name,"Cieľ uložený na tomto zariadení. Môžeš zapnúť aj upozornenie na prelet.");});

/* 🎬 6-sekundové video s odhalením kartičky (na TikTok/Reels/stories), bez hudby */
function vidOK(){return typeof MediaRecorder!=="undefined"&&!!HTMLCanvasElement.prototype.captureStream}
function vidMime(){for(const m of ["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm"])try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}return ""}
if($("cardVideo"))$("cardVideo").onclick=async()=>{
  const key=cardK,card=COL.types[key];if(!card||!vidOK())return;
  const v=shownCard(card);
  const btn=$("cardVideo");btn.disabled=true;btn.textContent="⏳";
  const done=()=>{btn.disabled=false;btn.textContent="🎬"};
  const img=new Image(),W=720,H=1280,CW=560,CH=784;
  img.onload=()=>{
    const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
    const stars=Array.from({length:90},()=>[Math.random()*W,Math.random()*H,Math.random()*2+.4,Math.random()*6]);
    const sp=Array.from({length:40},()=>[Math.random()*Math.PI*2,120+Math.random()*320,Math.random()*.6+.4]);
    const name=catGuess(key).name,shiny=!!v.shiny,col=shiny?"#ff4fd8":(RAR[typeTier(key)]||RAR.c).col;
    // dôkaz na konci videa: poradie, mesto, overenie, prezývka
    const proof=v.ver?"✓ Overená":"Neoverená";
    const mime=vidMime(),st=c.captureStream(30),rec=new MediaRecorder(st,mime?{mimeType:mime,videoBitsPerSecond:4e6}:{}),chunks=[];
    rec.ondataavailable=e=>e.data.size&&chunks.push(e.data);
    rec.onstop=()=>{done();const b=new Blob(chunks,{type:(mime||"video/webm").split(";")[0]});if(b.size)grantAch("video");shareBlob(b,"kartička."+(b.type.includes("mp4")?"mp4":"webm"),(shiny?"✨ Lesklá ":"")+"kartička: "+name+" ✈️ "+shareUrl("c",key)+TAGS)};
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
  img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(await cardExportSVG(key,v,{id:"v",public:true}));
};

/* 🏛️ vitrína: 3 najlepšie kartičky na profile (1 slot zadarmo, ďalšie za míle) */
const prestige=(k,v)=>RAR[typeTier(k)].p*(v.shiny?3:1)*(v.night?1.3:1)+cardLvl(v.n||1,k)*2+(v.seq&&v.seq<=10?25:0)+(v.seq===1?100:0);
function showSlots(){return 1+((COL.shop||{}).slot2?1:0)+((COL.shop||{}).slot3?1:0)}
function showList(){const own=Object.keys(COL.types).filter(k=>k!=="?"&&COL.types[k].n);let L=Array.isArray(COL.show)?COL.show.filter(k=>own.includes(k)):null;
  if(!L?.length&&!COL.showManual)L=own.sort((a,b)=>prestige(b,COL.types[b])-prestige(a,COL.types[a])).slice(0,showSlots());return (L||[]).slice(0,showSlots())}
function renderShow(){
  const el=$("showcase"),L=showList();
  const previous=el.contains(document.activeElement)?document.activeElement:null;
  el.hidden=!L.length&&!Object.values(COL.types).some(v=>v.n);
  if(el.hidden){el.replaceChildren();el.renderedHTML="";return}
  const html=L.map(k=>`<button data-sk="${esc(k)}" aria-label="${esc(catGuess(k).name)}">${cardMini(k,COL.types[k])}</button>`).join("")+Array.from({length:showSlots()-L.length},()=>'<button class="emp" data-empty="1" style="flex:0 0 28%">📌 voľné<br><small>vybrať</small></button>').join("");
  if(el.renderedHTML===html)return;
  el.innerHTML=html;el.renderedHTML=html;
  if(previous){
    const replacement=previous.dataset.sk?el.querySelector(`[data-sk="${CSS.escape(previous.dataset.sk)}"]`):el.querySelector("[data-empty]");
    (replacement||el.querySelector("button"))?.focus({preventScroll:true});
  }
}
$("showcase")&&($("showcase").onclick=e=>{const b=e.target.closest("[data-sk]");if(b){cardK=b.dataset.sk;openCard(cardK);return}
  // 📌 prázdne miesto: ponuka 6 najcennejších kartičiek, ktoré ešte nie sú vo vitríne
  if(e.target.closest("[data-empty]")){const inS=showList(),cand=Object.keys(COL.types).filter(k=>COL.types[k].n&&!inS.includes(k)).sort((x,y)=>prestige(y,COL.types[y])-prestige(x,COL.types[x])).slice(0,6);
    if(!cand.length){toast("📌 Zatiaľ nemáš čo vystaviť","Zamávaj lietadlu a získaj kartičku");return}
    $("cdBox").innerHTML=`<div class="lbl"><span>📌 Vyber kartičku do vitríny</span></div><div class="cdPick" id="showPick">${cand.map(k=>`<button data-pk="${esc(k)}">${cardMini(k,COL.types[k])}</button>`).join("")}</div><div class="acts"><button class="btn ico" id="cdX" style="flex:1">Zrušiť</button></div>`;
    $("cdM").classList.add("on");
    $("showPick").onclick=ev=>{const p=ev.target.closest("[data-pk]");if(!p)return;COL.show=showList();COL.showManual=true;if(COL.show.length<showSlots()&&!COL.show.includes(p.dataset.pk))COL.show.push(p.dataset.pk);LS.set("ctl_col",COL);$("cdM").classList.remove("on");renderShow();haptic(10);toast("📌 Vo vitríne","Ukáž ju kamarátom v Zbierke")}}});
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
  {id:"slot2",i:"🏛️",n:"2. miesto vo vitríne",d:"Vystav ďalšiu kartičku v Zbierke",c:200,once:1},
  {id:"slot3",i:"🏛️",n:"3. miesto vo vitríne",d:"Plná vitrína",c:500,once:1,ok:()=>!!(COL.shop||{}).slot2},
  {id:"fr_tatry",i:"🏔️",n:"Rám Tatry",d:"Rám na všetky tvoje kartičky (dá sa prepínať)",c:150,once:1},
  {id:"fr_dunaj",i:"🌊",n:"Rám Dunaj",d:"Rám na všetky tvoje kartičky (dá sa prepínať)",c:250,once:1},
  {id:"fr_noc",i:"🌃",n:"Rám Noc nad mestom",d:"Rám na všetky tvoje kartičky (dá sa prepínať)",c:400,once:1},
];
function shopOpen(){
  const list=$("shopList"),focused=list.contains(document.activeElement)?document.activeElement:null;
  const key=focused?.dataset.frame||focused?.dataset.buy;
  mileSync();COL.shop=COL.shop||{};
  $("shopMi").textContent="✈ "+nf(COL.mi)+" "+pl(COL.mi,"míľa","míle","míľ");
  $("shopList").innerHTML=SHOP.map(x=>{const own=x.once&&COL.shop[x.id],can=!own&&(!x.ok||x.ok())&&COL.mi>=x.c;
    const fr=own&&x.id.startsWith("fr_"),act=fr&&COL.frame===x.id;
    return `<div class="shopRow"><span style="font-size:26px">${x.i}</span><div>${x.n}<small>${x.d}</small></div>${fr?`<button class="btn ${act?"pri":"sec"}" data-frame="${x.id}">${act?"✓ používaš":"Použiť"}</button>`:`<button class="btn ${can?"pri":"sec"}" data-buy="${x.id}" ${can?"":"disabled"}>${own?"✓ máš":"✈ "+x.c}</button>`}</div>`}).join("");
  $("shopM").classList.add("on");
  if(key){
    const target=[...list.querySelectorAll("button:not([disabled])")].find(b=>b.dataset.frame===key||b.dataset.buy===key);
    (target||$("shopClose")).focus({preventScroll:true});
  }
}
$("b-miles")&&($("b-miles").onclick=shopOpen);$("shopClose")&&($("shopClose").onclick=()=>$("shopM").classList.remove("on"));
$("shopList")&&($("shopList").onclick=e=>{const f=e.target.closest("[data-frame]");if(f){COL.frame=COL.frame===f.dataset.frame?"":f.dataset.frame;LS.set("ctl_col",COL);haptic(10);toast(COL.frame?"🖼️ Rám nastavený":"Rám vypnutý",COL.frame?"Uvidíš ho na svojich kartičkách":"");shopOpen();return}
  const b=e.target.closest("[data-buy]");if(!b)return;const x=SHOP.find(q=>q.id===b.dataset.buy);if(!x||COL.mi<x.c)return;
  COL.mi-=x.c;if(x.once)COL.shop[x.id]=Date.now();if(x.buy)x.buy();LS.set("ctl_col",COL);haptic(20);toast(x.i+" "+x.n,"Hotovo · zostáva ✈ "+nf(COL.mi)+" "+pl(COL.mi,"míľa","míle","míľ"));if(x.id.startsWith("fr_"))COL.frame=x.id,LS.set("ctl_col",COL);shopOpen();renderShow();renderMileBalance()});
/* 🎁 daruj kópiu – odkaz pre kamaráta (server overí duplikát) */
async function giftMake(k){
  if(!SOC.api)return;try{const r=await apiPost("/api/gift",{type:k});const j=await r.json();
    if(!j.code){toast("🎁 Darovať sa nedá",{dup:"Potrebuješ aspoň 2 overené úlovky tohto typu",tier:"Darovať sa dajú len bežné a nezvyčajné – legendu musí každý vidieť sám",new:"Darovať môžeš po 7 dňoch v appke",rate:"Dnes si už daroval(a) 3×",kid:"V detskom režime to nejde"}[j.error]||"Skús to neskôr");return}
    const url=shareUrl("g",j.code,"n="+encodeURIComponent(LS.get("ctl_nick","")||"Kamarát")+"&ty="+k),text=`🎁 Darujem ti kartičku ${catGuess(k).name} z appky Čo to letí? ✈️ Keď mu potom sám zamávaš, bude celá tvoja.`;
    toast("🎁 Darček je pripravený","Kamarát dostane kartičku 🤝 – celá bude jeho, keď lietadlu sám zamává"+(j.left!=null?" · dnes ešte "+j.left+"×":""));
    // 📱 výmena na mieste: QR kód (kamarát ho nasníma), alebo odkaz správou
    giftQR(url,text,catGuess(k).name);
  }catch(e){toast("Bez internetu","Darovať môžeš, keď budeš online")}
}
function loadQR(){return window.qrcode?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement("script");s.src="lib/qrcode.js";s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function giftQR(url,text,name){
  const send=async()=>{try{if(navigator.share){await navigator.share({title:"Darček",text,url});return}}catch(e){if(e.name==="AbortError")return}
    try{await navigator.clipboard.writeText(text+" "+url);toast("🎁 Odkaz skopírovaný","Pošli ho kamarátovi – platí 14 dní")}catch(e){prompt("Skopíruj odkaz a pošli ho kamarátovi:",url)}};
  try{await loadQR();const q=qrcode(0,"M");q.addData(url);q.make();$("qrBox").innerHTML=q.createSvgTag({cellSize:6,margin:2,scalable:true,alt:"QR kód darčeka"})}catch(e){return send()}
  $("qrT").textContent="🎁 "+name+" pre kamaráta";$("qrM").classList.add("on");
  $("qrShare").onclick=()=>{$("qrM").classList.remove("on");send()};$("qrClose").onclick=()=>$("qrM").classList.remove("on")}
async function giftClaim(){const m=location.hash.match(/dar=([A-Za-z0-9]{6,8})/);if(!m)return;
  if(!LS.get("ctl_onb",0)){afterOnb(giftClaim);return}if(typeof KID==="function"&&KID())return;
  // prehliadač v Messengeri/Instagrame má vlastné úložisko – darček by ostal tam; najprv ponúkni Safari, po ✕ ho otvoríme tu
  if(typeof inApp!=="undefined"&&inApp&&!LS.get("ctl_inappX",false)){inAppBar();const x=document.querySelector(".inappBar .inappClose");x&&x.addEventListener("click",()=>setTimeout(giftClaim,300));toast("🎁 Darček otvor v Safari","Ťukni ⋯ → Otvoriť v prehliadači, nech sa kartička nestratí");return}
  history.replaceState(null,"",location.pathname);
  try{const r=await apiPost("/api/giftclaim",{code:m[1]});if(r.status===401||r.status>=500)throw 0;const j=await r.json();if(!j.type){toast("🎁 Darček už nie je platný",j.error==="self"?"Toto je tvoj vlastný darček 🙂":"Možno ho už niekto použil");return}
    const v=COL.types[j.type];if(v&&v.n){toast("🎁 Túto kartičku už máš","Aj tak vďaka – darček poslal(a) "+j.from+" 💛");return}
    COL.types[j.type]={n:0,r:typeTier(j.type),name:catGuess(j.type).name,first:Date.now(),gift:{from:j.from,t:Date.now()}};LS.set("ctl_col",COL);
    toast("🎁 Máš darček! Posiela: "+j.from,catGuess(j.type).name+" – zamávaj mu a kartička bude celá tvoja");confetti(60);renderCol();
  }catch(e){try{history.replaceState(null,"",location.pathname+"#dar="+m[1])}catch(x){}toast("🎁 Darček sa zatiaľ neotvoril","Skúsim znova, keď budeš online")}}
setTimeout(giftClaim,1500);addEventListener("hashchange",giftClaim);addEventListener("online",giftClaim);
function renderMileBalance(){
  $("c-miles").textContent=nf(COL.mi|0);
  $("c-milesL").textContent=pl(COL.mi|0,"míľa","míle","míľ");
}
HOOKS.view.push(v=>{if(v==="col"){mileSync();renderMileBalance()}});
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
for(const [id,rare] of [["c-t",false],["c-r",true]]){const el=$(id)&&$(id).parentElement;if(!el)continue;
  el.onclick=()=>{atlasMode="mine";atlasRare=rare;atlasOpen=true;renderCards();haptic(6);setTimeout(()=>{const atlas=$("c-types");atlas.scrollIntoView({behavior:RM()?"auto":"smooth",block:"start"});atlas.querySelector(".atTabs .on")?.focus({preventScroll:true})},50);if(rare)toast("💎 Tvoje vzácne typy","Vzácne, epické a legendárne")}}

// 👀 kedy bol typ naposledy nad tebou + 🔔 strážca typu (upozorní, keď taký typ preletí nad tebou)
function lastSeenType(k){const L=LS.get("ctl_seenT",{}),t=L[k];if(!t)return "";const d=new Date(t),today=SKD.format(new Date())===SKD.format(d);
  return (today?"dnes ":d.toLocaleDateString("sk-SK",{day:"numeric",month:"numeric"})+" ")+d.toLocaleTimeString("sk-SK",{hour:"2-digit",minute:"2-digit"})}
const typeWatched=k=>(LS.get("ctl_watchT",[])||[]).includes(k);
$("cardBig").addEventListener("click",e=>{const w=e.target.closest("[data-watch]");if(!w)return;const k=w.dataset.watch;let L=LS.get("ctl_watchT",[]);
  if(L.includes(k))L=L.filter(x=>x!==k);else{L=[...L,k].slice(-10);toast("🔔 Dám ti vedieť","Keď "+catGuess(k).name+" poletí nad tebou a appka bude otvorená"+(typeof PUSH!=="undefined"&&PUSH.on?"":" (zapni aj upozornenia)"))}
  LS.set("ctl_watchT",L);w.textContent=L.includes(k)?"🔔 Upozorním ťa – zrušiť":"🔔 Upozorni ma, keď poletí nado mnou";w.className="btn "+(L.includes(k)?"sec":"pri");haptic(8)});
HOOKS.live.push(()=>{if(!S.list||!S.loaded||S.failN||skyStale()||!navigator.onLine)return;const now=Date.now(),L=LS.get("ctl_seenT",{});let ch=false;
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
