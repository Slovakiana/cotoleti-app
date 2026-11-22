// odznaky: každý definovaný odznak musí mať cestu k udeleniu a každý grantAch("…") musí mieriť na existujúci odznak
// (grantAch s neznámym id ticho skončí – chyba by sa inak nikdy neprejavila)
import {readFileSync, readdirSync} from "node:fs"; import assert from "node:assert/strict";
const ROOT = new URL("../", import.meta.url), rd = p => readFileSync(new URL(p, ROOT), "utf8");
const files = readdirSync(new URL("js/", ROOT)).filter(f => f.endsWith(".js"));
const src = Object.fromEntries(files.map(f => [f, rd("js/" + f)]));
const order = [...rd("index.html").matchAll(/<script src="js\/([\w.-]+\.js)/g)].map(m => m[1]);
const lineOf = (s, i) => s.slice(0, i).split("\n").length;

// 1) definície: const ACH=[…] v core.js + každé ACH.push(…)
const defs = []; // {id, file, line, never}
const addDefs = (f, body, at) => { for (const m of body.matchAll(/\{id:"([^"]+)"[^{}]*?c:(\([^)]*\)|\w+)=>(false\b)?/g))
  defs.push({id: m[1], file: f, line: lineOf(src[f], at + m.index), never: !!m[3]}); };
{ const s = src["core.js"], i = s.indexOf("const ACH=["), j = s.indexOf("\n];", i); assert.ok(i > 0, "core.js: chýba const ACH=["); addDefs("core.js", s.slice(i, j), i); }
const pushFiles = [];
for (const f of files) for (const m of src[f].matchAll(/ACH\.push\(([^;]*)\);/g)) { addDefs(f, m[1], m.index + 9); pushFiles.push({f, line: lineOf(src[f], m.index), guarded: /typeof ACH/.test(src[f].slice(Math.max(0, m.index - 40), m.index))}); }
const ids = new Set(defs.map(d => d.id));

// 2) udelenia: grantAch("x") + nepriame (DAILY_POOL ach:"x" → grantAch(x.ach), STREAK_MS [b,"x"] → grantAch(ms[1]))
const grants = new Map(); const g = (id, w) => grants.set(id, [...(grants.get(id) || []), w]);
for (const f of files) for (const m of src[f].matchAll(/grantAch\("([^"]+)"\)/g)) g(m[1], f + ":" + lineOf(src[f], m.index));
const ex = src["extras.js"];
if (/grantAch\(x\.ach\)/.test(ex)) for (const m of ex.matchAll(/\bach:"([^"]+)"/g)) g(m[1], "extras.js:" + lineOf(ex, m.index) + " (DAILY_POOL)");
if (/grantAch\(ms\[1\]\)/.test(ex)) { const sm = ex.match(/const STREAK_MS=\{([^;]*)\};/); assert.ok(sm, "extras.js: STREAK_MS sa zmenil – uprav test");
  for (const m of sm[1].matchAll(/\d+:\[\d+,"([^"]+)"\]/g)) g(m[1], "extras.js (STREAK_MS)"); }
// ostatné dynamické volania (grantAch(premenná)) – test ich nepozná, musia sa doplniť ručne
const dyn = []; for (const f of files) for (const m of src[f].matchAll(/grantAch\((?!"|id\))([^)]*)\)/g)) if (!/^(x\.ach|ms\[1\]|x\.id)$/.test(m[1])) dyn.push(f + ":" + lineOf(src[f], m.index) + " " + m[1]);

const err = [];
// duplicitné id
const seen = new Map(); for (const d of defs) { if (seen.has(d.id)) err.push(`duplicitné id "${d.id}": ${seen.get(d.id)} a ${d.file}:${d.line}`); else seen.set(d.id, d.file + ":" + d.line); }
// grantAch na neexistujúce id
for (const [id, w] of grants) if (!ids.has(id)) err.push(`grantAch("${id}") – odznak neexistuje (${w.join(", ")})`);
// odznak s c:()=>false, ktorý nikto neudeľuje
for (const d of defs) if (d.never && !grants.has(d.id)) err.push(`odznak "${d.id}" (${d.file}:${d.line}) má c:()=>false a žiadny grantAch – nedá sa získať`);
// ACH.push v súbore, ktorý sa načíta pred core.js (alebo nie je v index.html vôbec)
const coreAt = order.indexOf("core.js"); assert.ok(coreAt >= 0, "index.html: chýba core.js");
for (const p of pushFiles) { const at = order.indexOf(p.f);
  if (at < 0) err.push(`${p.f}:${p.line} ACH.push – súbor sa v index.html nenačítava, odznak chýba`);
  else if (at < coreAt && !p.guarded) err.push(`${p.f}:${p.line} ACH.push pred core.js – ReferenceError`); }
if (dyn.length) err.push("neznáme dynamické grantAch – doplň do testu: " + dyn.join("; "));

assert.deepEqual(err, [], "\n" + err.join("\n"));
console.log(`✓ odznaky: ${ids.size} definovaných, ${grants.size} id cez grantAch, ${defs.filter(d => !d.never).length} cez podmienku c:`);
