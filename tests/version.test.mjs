// Kontrola, že verzie skriptov v index.html sedia s verziou cache v sw.js (inak by ľudia mali starú appku).
import {readFileSync} from "node:fs";
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8"), sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const vs = [...html.matchAll(/<script src="js\/[\w]+\.js\?v=(\d+)"/g)].map(m => m[1]);
const swv = (sw.match(/const V="cotoleti-v(\d+)"/) || [])[1];
const files = [...html.matchAll(/<script src="(js\/[\w]+\.js)\?v=/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="(lib\/[\w]+\.css)\?v=(\d+)"/g)];
for(const [,path,version] of styles){
  if(version!==swv||!sw.includes('"'+path+'"')){
    console.error("Neaktuálny alebo offline nedostupný štýl:",path,version);
    process.exit(1);
  }
}
const missing = files.filter(f => !sw.includes('"' + f + '"'));
if (new Set(vs).size !== 1 || vs[0] !== swv) { console.error("Verzie nesedia:", [...new Set(vs)], "sw:", swv); process.exit(1); }
if (missing.length) { console.error("Chýbajú v sw.js SHELL:", missing); process.exit(1); }
console.log("✓ verzia", swv, "·", files.length, "skriptov");
