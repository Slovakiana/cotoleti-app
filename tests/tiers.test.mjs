// ARCH-04: vzácnosť typu musí byť v appke aj na serveri rovnaká (inak karta ukáže „Bežná“ a server ráta inak body a lesk).
// Spustenie: node tests/tiers.test.mjs
import {readFileSync, writeFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const raw = readFileSync(new URL("../server/worker.js", import.meta.url), "utf8");
const src = raw.replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}") + "\nexport {tierOf, TYPES_SRV, T_ALIAS};";
const dir = mkdtempSync(join(tmpdir(), "ctl-")), file = join(dir, "w.mjs");
writeFileSync(file, src);
const srv = await import(file);

const core = readFileSync(new URL("../js/core.js", import.meta.url), "utf8");
const pick = re => { const m = core.match(re); assert.ok(m, "nenašiel som " + re); return m[0]; };
const ctx = vm.createContext({});
for (const re of [/^const T_ALIAS=\{[^}]*\};/m, /^const TYPES=\{[\s\S]*?\};/m, /^const (LEG|EPIC|RARE)=new Set\([\s\S]*?\);/gm]) {
  if (re.flags.includes("g")) for (const m of core.matchAll(re)) vm.runInContext(m[0].replace(/^const /, "var "), ctx);
  else vm.runInContext(pick(re).replace(/^const /, "var "), ctx);
}
for (const name of ["WIDE", "HELI"]) vm.runInContext(pick(new RegExp("^const " + name + "=new Set\\([\\s\\S]*?\\);", "m")).replace(/^const /, "var "), ctx);
vm.runInContext(pick(/^function typeTier\(t\)\{[\s\S]*?\n\}/m), ctx);

assert.deepEqual({...ctx.T_ALIAS}, {...srv.T_ALIAS}, "aliasy typov sa líšia");
const catalog = readFileSync(new URL("../js/catalog.js", import.meta.url), "utf8");
const codes = new Set([...catalog.matchAll(/^\["([A-Z0-9]+)"/gm)].map(m => m[1]));
for (const k of Object.keys(ctx.TYPES)) if (/^[A-Z0-9]{2,4}$/.test(k)) codes.add(k);
for (const k of Object.keys(srv.TYPES_SRV)) codes.add(k);
const cl = c => ctx.typeTier(ctx.T_ALIAS[c] || c); // appka typ normalizuje už pri načítaní lietadiel
const diff = [...codes].filter(c => cl(c) !== srv.tierOf(c)).map(c => `${c}: appka ${cl(c)}, server ${srv.tierOf(c)}`);
assert.deepEqual(diff, [], "Rozdielne vzácnosti:\n" + diff.join("\n"));
console.log(`✓ vzácnosť ${codes.size} typov je v appke aj na serveri rovnaká`);
