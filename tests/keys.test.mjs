// ARCH-03: každý kľúč v pamäti mobilu (ctl_*) musí mať jasné miesto:
//  • PKEYS (js/ui.js) – patrí hráčovi/profilu, pri prepnutí rodinného profilu sa vymení,
//  • DEVICE nižšie – patrí zariadeniu (nastavenia, poloha, technické stavy).
// Nový kľúč bez zaradenia = test zlyhá (predtým sa kvôli tomu miešali profily).
import {readFileSync, readdirSync} from "node:fs";
import assert from "node:assert/strict";

const DEVICE = ["ctl_account_rollout", "ctl_arcal", "ctl_big", "ctl_edHint", "ctl_ev", "ctl_first", "ctl_guess", "ctl_guardReload", "ctl_inappX",
  "ctl_keepHint", "ctl_lastDay", "ctl_lastSky", "ctl_manual", "ctl_momMini", "ctl_night", "ctl_noinst", "ctl_noinstT", "ctl_onb",
  "ctl_onbT", "ctl_p", "ctl_pos", "ctl_profs", "ctl_radarTap", "ctl_radius", "ctl_recCel", "ctl_ref", "ctl_reset_epoch",
  "ctl_santatest", "ctl_spec", "ctl_storage_recovery", "ctl_storage_version", "ctl_tle", "ctl_transfer_pending", "ctl_vib",
  "ctl_voice", "ctl_vych", "ctl_weekNudge", "ctl_visits"];

const dir = new URL("../js/", import.meta.url), used = new Map();
for (const f of readdirSync(dir).filter(f => f.endsWith(".js")))
  for (const m of readFileSync(new URL(f, dir), "utf8").matchAll(/["`](ctl_[A-Za-z0-9_]+)["`]/g)) used.set(m[1], f);
const ui = readFileSync(new URL("ui.js", dir), "utf8");
const PKEYS = [...ui.match(/const PKEYS=(\[[^\]]*\])/)[1].matchAll(/"(ctl_[^"]+)"/g)].map(m => m[1]);
const both = PKEYS.filter(k => DEVICE.includes(k));
assert.deepEqual(both, [], "kľúč nemôže patriť profilu aj zariadeniu");
const missing = [...used.keys()].filter(k => !PKEYS.includes(k) && !DEVICE.includes(k)).map(k => k + " (" + used.get(k) + ")");
assert.deepEqual(missing, [], "Nezaradené kľúče – pridaj ich do PKEYS (hráč) alebo DEVICE (zariadenie):\n" + missing.join("\n"));
// záloha účtu nesmie obsahovať kľúče zariadenia
const acc = readFileSync(new URL("account.js", dir), "utf8");
const backup = [...acc.match(/const ACCOUNT_BACKUP_KEYS = (\[[\s\S]*?\]);/)[1].matchAll(/"(ctl_[^"]+)"/g)].map(m => m[1]);
assert.deepEqual(backup.filter(k => DEVICE.includes(k)), [], "záloha obsahuje nastavenia zariadenia");
console.log(`✓ ${used.size} kľúčov: ${PKEYS.length} hráč, ${DEVICE.length} zariadenie`);
