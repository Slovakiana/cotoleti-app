// ARCH-01: všetky skripty appky zdieľajú jeden globálny priestor. Rovnaký názov const/let/class/function
// v dvoch súboroch zhodí celú appku (SyntaxError) – tento test to zachytí pred nasadením.
import {readFileSync, readdirSync} from "node:fs";
import assert from "node:assert/strict";

const dir = new URL("../js/", import.meta.url);
const seen = new Map(), dup = [];
for (const f of readdirSync(dir).filter(f => f.endsWith(".js")).sort()) {
  const src = readFileSync(new URL(f, dir), "utf8");
  // len deklarácie na najvyššej úrovni (bez odsadenia)
  for (const m of src.matchAll(/^(?:async\s+)?(const|let|var|class|function\*?)\s+([A-Za-z_$][\w$]*)/gm)) {
    const name = m[2], kind = m[1];
    const prev = seen.get(name);
    // function + function v dvoch súboroch je síce povolené, ale jedna by potichu prepísala druhú
    if (prev && prev.f !== f) dup.push(`${name}: ${prev.f} (${prev.kind}) a ${f} (${kind})`);
    else seen.set(name, {f, kind});
  }
}
assert.deepEqual(dup, [], "Zdvojené globálne názvy:\n" + dup.join("\n"));
console.log(`✓ ${seen.size} globálnych názvov bez kolízie`);
