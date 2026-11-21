// identita hráča musí po reštarte appky ostať rovnaká (chyba do v35: regex 30 znakov vs. generátor 26 znakov)
import {readFileSync} from "node:fs"; import assert from "node:assert/strict";
const src = readFileSync(new URL("../js/social.js", import.meta.url), "utf8");
const line = src.split("\n").find(l => l.startsWith("if(!/^v2")).replace(/return v\}\)\(\);\s*$/, "");
const store = new Map();
const LS = {get: (k, d) => store.has(k) ? JSON.parse(store.get(k)) : d, set: (k, v) => store.set(k, JSON.stringify(v))};
const make = new Function("LS", "crypto", "return (()=>{let v=LS.get(\"ctl_cid\",\"\");" + line + "return v})()");
const a = make(LS, globalThis.crypto), b = make(LS, globalThis.crypto);
assert.equal(a, b, "nové id sa po reštarte zmenilo");
store.set("ctl_cid", JSON.stringify("v2" + "A".repeat(24)));
assert.equal(make(LS, globalThis.crypto), "v2" + "A".repeat(24), "staré 26-znakové id sa zahodilo");
console.log("✓ identita ostáva po reštarte");
