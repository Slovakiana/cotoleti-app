// Regresia: zberateľské rebríčky a pravdivé vysvetlenie limitov
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const social=readFileSync(new URL("../js/social.js",import.meta.url),"utf8");
const worker=readFileSync(new URL("../server/worker.js",import.meta.url),"utf8");

assert.match(html,/id="lgAtlasScope"/,"rebríček má prepínač rozsahu");
assert.match(html,/data-scope="region"/,"má krajský pohľad");
assert.match(html,/data-scope="sk"/,"má celoslovenský pohľad");
assert.match(social,/LG_ATLAS_SCOPE==="sk"\?"":krajOf\(S\.pos\)/,"národný rebríček sa pýta na celý štát");
assert.match(social,/rows=\(j\.top\|\|\[\]\)\.map\(/,"zobrazia sa všetci hráči, ktorých server vrátil");
assert.doesNotMatch(social,/\(j\.top\|\|\[\]\)\.slice\(0,10\)/,"rebríček nie je svojvoľne skrátený na 10");
assert.match(social,/25 započítaných mávnutí denne od jedného hráča/,"týždenná liga vysvetľuje limit na hráča");
assert.match(social,/nie 25 na celý kraj/,"denná liga odstraňuje nejasnosť");
assert.match(worker,/dd\.n < 25/,"zachovaná serverová ochrana ligy");
assert.match(worker,/r\.position<=20 AS leader/,"server vracia prvých 20 zberateľov");
console.log("✓ atlas: kraj/SR, všetky vrátené pozície a jasný limit na hráča");
