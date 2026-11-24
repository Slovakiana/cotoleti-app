// v69 C – regresia identity v izolovanom prehliadačovom prostredí.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const social=readFileSync(new URL("../js/social.js",import.meta.url),"utf8");
const worker=readFileSync(new URL("../server/worker.js",import.meta.url),"utf8");
const ui=readFileSync(new URL("../js/ui.js",import.meta.url),"utf8");
const start=social.indexOf("SOC.authVerified=false;");
const end=social.indexOf("const posR=()=>",start);
assert.ok(start>=0&&end>start);
const fragment=social.slice(start,end);
const store=new Map([["ctl_reset_epoch",1],["ctl_tok","existing-token"],["ctl_tok0","existing-token"],["ctl_cid","v2testexistingplayeraccount1234"],["ctl_fk","old-fk"]]);
const LS={get:(k,d)=>store.has(k)?store.get(k):d,set:(k,v)=>store.set(k,v)};
const calls=[];
let queue=[];
let internet=true,hidden=false,deleted=0,reloaded=0;
const SOC={api:"https://example.test",cid:store.get("ctl_cid")};
const navigator={get onLine(){return internet},sendBeacon:()=>true};
const localStorage={removeItem(k){store.delete(k);deleted++},getItem:k=>store.get(k)||null};
Object.defineProperty(localStorage,"keys",{value:()=>[...store.keys()]});
const env={SOC,LS,LSP:new Map(),navigator,localStorage,document:{get hidden(){return hidden}},location:{reload:()=>{reloaded++}},toast:()=>{},setTimeout:()=>0,fetch:async(url,opts)=>{calls.push([url,opts]);const j=queue.shift();if(j instanceof Error)throw j;if(!j)throw Error("unexpected request");return {status:j.s,ok:j.s>=200&&j.s<300,json:async()=>j.j}} ,DEFAULT_PROXY:"https://example.test",FK:"old-fk",TOK:"existing-token",PID:"old-pid",KID:()=>false,addEventListener:()=>{},};
vm.createContext(env);
vm.runInContext(fragment+"\nthis.testAuth={ensureTok,apiPost};",env);
const {ensureTok,apiPost}=env.testAuth;
const good={s:200,j:{tok:"existing-token",pid:"new-pid",fk:"new-fk",epoch:1}};
queue=[good];assert.equal(await ensureTok(),"existing-token");
assert.equal(SOC.authVerified,true);assert.equal(calls.length,1);
assert.equal(await ensureTok(),"existing-token","verified cache avoids repeated hello");
assert.equal(calls.length,1);
// Úspešná kontrola pri návrate, bez zmien zbierky.
queue=[good];assert.equal(await ensureTok(true),"existing-token");
assert.equal(store.get("ctl_cid"),"v2testexistingplayeraccount1234");
assert.equal(deleted,0);
// Offline nevymaže ani nevyžiada nové ID.
internet=false;SOC.authVerified=false;SOC.authChecked=0;
assert.equal(await ensureTok(),"");assert.equal(deleted,0);
await assert.rejects(()=>apiPost("/api/wave",{}),/auth_pending/);
assert.equal(store.get("ctl_tok"),"existing-token");
internet=true;queue=[new Error("network")];
assert.equal(await ensureTok(true),"");assert.equal(deleted,0);
assert.equal(store.get("ctl_cid"),"v2testexistingplayeraccount1234");
SOC.helloNext=0;
queue=[good];assert.equal(await ensureTok(true),"existing-token");
// Transient 401 does not delete local collection.
queue=[{s:401,j:{error:"auth"}}];
await apiPost("/api/wave",{});
assert.equal(store.get("ctl_tok"),"existing-token");
assert.equal(SOC.authVerified,false);
SOC.helloNext=0;
// 'moved' is never a reason to create a new identity automatically.
queue=[{s:401,j:{error:"moved"}}];assert.equal(await ensureTok(true),"");
assert.equal(SOC.moved,true);assert.equal(deleted,0);assert.equal(reloaded,0);
SOC.moved=false;SOC.helloNext=0;
// Definitívny 409 reset s vyššou generáciou: vyčistiť starý účet.
queue=[{s:409,j:{error:"reset",epoch:2}}];assert.equal(await ensureTok(true),"");
assert.equal(store.get("ctl_reset_epoch"),2);assert.equal(SOC.resetting,true);
assert.ok(deleted>0);
assert.equal(reloaded,0,"reload is scheduled, not immediate");
// Prenos zbierky zachová epoch servera po globálnom resete.
assert.ok(worker.includes('epoch: Number(this.getMeta("player_reset_epoch")||0), data: x.data'));
assert.ok(ui.includes('LS.set("ctl_reset_epoch",j.epoch||0);LS.set("ctl_onb",1)'));
console.log("✓ v69 C: offline, návrat, reset, 401, presun a prenos sezóny");
