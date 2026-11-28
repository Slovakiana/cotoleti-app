// QA-03: funkcie závislé od dátumu – edície v decembri, Santa 24. 12., adventný kalendár, Silvester a prelom týždňa.
// Spustenie: node tests/dates.test.mjs
import {readFileSync, writeFileSync, mkdtempSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const raw = readFileSync(new URL("../server/worker.js", import.meta.url), "utf8");
const src = raw.replace('import { DurableObject } from "cloudflare:workers";', "class DurableObject{constructor(ctx,env){this.ctx=ctx;this.env=env}}") + "\nexport {EVENTS};";
const dir = mkdtempSync(join(tmpdir(), "ctl-")), file = join(dir, "w.mjs");
writeFileSync(file, src);
const {EVENTS, Sky} = await import(file);

const active = iso => EVENTS.filter(e => Date.parse(e.from) <= Date.parse(iso) && Date.parse(iso) < Date.parse(e.to)).map(e => e.id);
// edície v kľúčové dni (čas v UTC = SR − 1 h)
const expect = {
  "2026-11-29T10:00:00Z": "advent2026", "2026-12-06T10:00:00Z": "mikulas2026", "2026-12-13T10:00:00Z": "lucia2026",
  "2026-12-21T10:00:00Z": "zslnovrat2026", "2026-12-24T16:00:00Z": "vianoce2026", "2026-12-31T21:00:00Z": "silvester2026",
};
for (const [iso, id] of Object.entries(expect)) assert.ok(active(iso).includes(id), `${iso}: čakal som edíciu ${id}, je ${active(iso).join(",") || "žiadna"}`);
// edície sa neprekrývajú tak, aby jedno mávnutie dostalo dve rovnaké
for (const e of EVENTS) assert.ok(Date.parse(e.from) < Date.parse(e.to), "okno " + e.id);
console.log("✓ edície v decembri (Advent, Mikuláš, Lucia, slnovrat, Vianoce, Silvester)");

// adventný kalendár a Santa v appke pri posunutom dátume
const santa = readFileSync(new URL("../js/santa.js", import.meta.url), "utf8");
const adventSrc = santa.slice(santa.indexOf("function adventOn"), santa.indexOf("function renderAdvent"));
for (const [day, on, n] of [["2026-11-30", false, 30], ["2026-12-01", true, 1], ["2026-12-24", true, 24], ["2026-12-25", false, 25]]) {
  const ctx = vm.createContext({dayKey: () => day, location: {hash: ""}});
  vm.runInContext(adventSrc, ctx);
  assert.equal(ctx.adventOn(), on, "advent " + day);
  if (on) assert.equal(ctx.adventDay(), n);
}
assert.equal((santa.match(/ADVENT_FACTS=\[/g) || []).length, 1);
const facts = vm.runInContext(santa.slice(santa.indexOf("const ADVENT_FACTS="), santa.indexOf("function adventOn")) + ";ADVENT_FACTS", vm.createContext({}));
assert.equal(facts.length, 24, "24 okienok, 24 zaujímavostí");
console.log("✓ adventný kalendár 1.–24. 12. (mimo decembra skrytý)");

// prelom týždňa: pondelok 00:00 v Bratislave
const P = Sky.prototype, week = iso => P.week.call(P, Date.parse(iso));
assert.equal(week("2026-12-27T22:59:00Z"), "2026-12-21", "nedeľa 23:59 v SR patrí do starého týždňa");
assert.equal(week("2026-12-27T23:01:00Z"), "2026-12-28", "pondelok 00:01 v SR je nový týždeň");
assert.equal(week("2027-01-03T20:00:00Z"), "2026-12-28", "týždeň cez Silvester");
console.log("✓ prelom týždňa o polnoci v Bratislave");
