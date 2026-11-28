// DEV-01 / SEC-04: údaje od iných hráčov (prezývka, mesto, správa, názov tímu) sa do HTML vkladajú len cez esc().
// Statická kontrola všetkých šablón, ktoré tvoria HTML – zachytí zabudnuté esc() skôr, ako by vznikla XSS.
import {readFileSync, readdirSync} from "node:fs";
import assert from "node:assert/strict";

const USER = /(\.|\b)(nick|nickname|town|msg|tname|teamName|fromNick)\b/;
const SAFE = /^\s*(esc|nf|pl|encodeURIComponent|Number|String\(Number)\(|\besc\(/;
const dir = new URL("../js/", import.meta.url), bad = [];
for (const f of readdirSync(dir).filter(f => f.endsWith(".js"))) {
  readFileSync(new URL(f, dir), "utf8").split("\n").forEach((line, i) => {
    if (!/innerHTML|insertAdjacentHTML|outerHTML|`[^`]*<[a-z]/i.test(line)) return;
    for (const m of line.matchAll(/\$\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)) {
      const e = m[1];
      if (USER.test(e) && !SAFE.test(e) && !/^\s*[\w.]+\s*\?/.test(e) && !/\?\s*"[^"]*"\s*:\s*esc\(/.test(e)) bad.push(`${f}:${i + 1}  \${${e.slice(0, 80)}}`);
    }
  });
}
assert.deepEqual(bad, [], "Údaje hráčov bez esc():\n" + bad.join("\n"));
// server odstraňuje znaky, ktoré by mohli rozbiť HTML atribút
const w = readFileSync(new URL("../server/worker.js", import.meta.url), "utf8");
assert.ok(/function cleanName[\s\S]{0,300}\[<>"`\]/.test(w), "cleanName odstraňuje < > \" `");
console.log("✓ údaje hráčov sa do HTML vkladajú escapované");
