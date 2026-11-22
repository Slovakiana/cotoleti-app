// Zvýši verziu appky na jednom mieste: node tests/bump.mjs
// (index.html ?v=N pri všetkých skriptoch + sw.js cache "cotoleti-vN"; tests/version.test.mjs kontroluje, že sedia)
import {readFileSync, writeFileSync} from "node:fs";
const root = new URL("../", import.meta.url);
const sw = readFileSync(new URL("sw.js", root), "utf8");
const cur = Number((sw.match(/cotoleti-v(\d+)/) || [])[1]);
if (!cur) throw new Error("verzia v sw.js sa nenašla");
const next = cur + 1;
writeFileSync(new URL("sw.js", root), sw.replace(`cotoleti-v${cur}`, `cotoleti-v${next}`));
const html = readFileSync(new URL("index.html", root), "utf8");
writeFileSync(new URL("index.html", root), html.replaceAll(`?v=${cur}"`, `?v=${next}"`));
console.log(`verzia ${cur} → ${next}`);
