// v69: detekcia in-app prehliadača bez falošného varovania v Safari/Chrome.
// Zdroj testovaného kódu je reálny produkčný js/ui.js.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const src=readFileSync(new URL("../js/ui.js",import.meta.url),"utf8");
const start=src.indexOf("function embeddedBrowserName(");
const end=src.indexOf("const embeddedBrowser=embeddedBrowserName(",start);
assert.ok(start>0&&end>start,"klasifikátor existuje");
const fn=vm.runInNewContext(src.slice(start,end)+"\nembeddedBrowserName");
const cases=[
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 WhatsApp/2.25.2","WhatsApp"],
  ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36 WhatsApp/2.25","WhatsApp"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18 Mobile Safari/604.1",""],
  ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131 Mobile Safari/537.36",""],
  ["Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Instagram 325.0","aplikácia"],
  ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 FBAN/FBIOS","aplikácia"],
];
for(const [ua,want] of cases)assert.equal(fn(ua),want,ua);
assert.equal(fn("Mozilla/5.0 (iPhone)","https://l.whatsapp.com/"),"referrer WhatsApp");
assert.equal(fn("Mozilla/5.0 (iPhone)","https://example.com/"),"cudzí referrer");
const bar=src.slice(src.indexOf("function inAppBar(){"),src.indexOf("// obrazovka nezhasne počas AR"));
assert.ok(bar.includes("setTimeout(inAppBar,350)"),"banner pred prvým mávnutím");
assert.ok(!bar.includes("ctl_waveN"),"banner nezávisí od prvého úlovku");
assert.ok(bar.includes("navigator.clipboard.writeText(url)"),"kópia odkazu Safari/Chrome");
assert.ok(bar.includes("if(!embeddedBrowser"),"bez varovania v bežnom prehliadači");
assert.ok(bar.includes("b.querySelector(\".inappClose\")"),"používateľ môže upozornenie zavrieť");
console.log("✓ v69: WhatsApp iOS/Android, ostatné in-app prehliadače, bezpečné spustenie");
