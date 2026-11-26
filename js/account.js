"use strict";

const ACCOUNT_BACKUP_KEYS = [
  "ctl_col", "ctl_collectorHunt", "ctl_daily", "ctl_season", "ctl_waved", "ctl_waveN",
  "ctl_nick", "ctl_seen", "ctl_log", "ctl_famScore", "ctl_kdDone", "ctl_kdDay",
  "ctl_gstreak", "ctl_gday", "ctl_streakp", "ctl_adopt", "ctl_momJoined", "ctl_momPts",
  "ctl_goldWon", "ctl_mayor", "ctl_wanted", "ctl_wantedK", "ctl_inv", "ctl_invSeen",
  "ctl_wpd", "ctl_mpd", "ctl_rival", "ctl_hidSeen", "ctl_guessed", "ctl_moment", "ctl_legp"
];
const accountDialog = $("accountDialog");
let accountRollout = LS.get("ctl_account_rollout", "off"), accountStatusRequest, accountStatusUntil = 0;
let accountMode = "", accountChallenge = "", accountBusy = false, accountBackupBusy = false;
let accountChoiceResolve, accountConflict = false;

function refreshAccountStatus() {
  if (accountStatusRequest) return accountStatusRequest;
  if (Date.now() < accountStatusUntil) return Promise.resolve(accountRollout);
  accountStatusRequest = apiRequest(DEFAULT_PROXY + "/api/account/status", {cache: "no-store"}, 3500)
    .then(async response => {
      if (!response.ok) throw Error("status");
      const data = await response.json();
      accountRollout = ["pilot", "public"].includes(data.rollout) ? data.rollout : "off";
      LS.set("ctl_account_rollout", accountRollout);
      accountStatusUntil = Date.now() + 5 * 60e3;
      renderAccountSettings();
      return accountRollout;
    })
    .catch(() => {
      accountStatusUntil = Date.now() + 15000;
      return accountRollout;
    }).finally(() => { accountStatusRequest = null; });
  return accountStatusRequest;
}

function hasLocalAccountProgress() {
  return !!(COL.n || COL.pts || COL.mi || Object.keys(COL.types).length ||
    LS.get("ctl_waveN", 0) || LS.get("ctl_account_rev", 0) ||
    LS.get("ctl_team", null) || !nickIsDefault(LS.get("ctl_nick", "")));
}

function accountNeedsChoice() {
  return accountRollout !== "off" && !TOK && !LS.get("ctl_account_guest", false);
}

function accountMayNeedChoice() {
  return accountNeedsChoice() || (!!accountStatusRequest && !TOK && !LS.get("ctl_account_guest", false));
}

function renderAccountSettings() {
  const linked = !!LS.get("ctl_account_rev", 0);
  if (accountRollout !== "off") document.querySelector(".inappBar")?.remove();
  const child = LS.get("ctl_onb", 0) && KID();
  $("accountOnboarding").hidden = accountRollout === "off" || child;
  $("accountSettings").hidden = accountRollout === "off" || child;
  $("accountSave").hidden = !linked && accountNeedsChoice();
  $("accountSave").textContent = linked ? "Zálohovať zbierku" : "Zabezpečiť zbierku";
  $("accountLogin").hidden = linked;
  $("accountSettingsStatus").textContent = LS.get("ctl_account_pause", false) ?
    "Po vymazaní lokálnej zbierky je automatická záloha pozastavená." : accountConflict ?
    "Záloha sa zmenila v inom prehliadači. Pokrok na tomto zariadení ostáva uložený." :
    linked ? "Prihlásenie je nastavené." : "Načítaj si zbierku aj v inom prehliadači.";
}

function openAccountDialog(mode) {
  if (accountBusy || (mode === "link" && KID())) return;
  accountMode = mode;
  accountChallenge = "";
  $("accountForm").hidden = mode === "choose";
  $("accountChoices").hidden = mode !== "choose";
  $("accountEmailRow").hidden = false;
  $("accountCodeRow").hidden = true;
  $("accountForm").reset();
  $("accountContinue").textContent = "Poslať kód";
  $("accountMessage").textContent = "";
  $("accountTitle").textContent = {
    choose: "Máš už zbierku?", login: "Prihlásiť sa k zbierke",
    link: LS.get("ctl_account_guest", false) ? "Vytvoriť účet a uložiť zbierku" : "Zabezpečiť zbierku"
  }[mode];
  if (!accountDialog.open) accountDialog.showModal();
}

async function accountBeforeWave() {
  await refreshAccountStatus();
  if (!accountNeedsChoice()) return true;
  if (accountDialog.open) return false;
  openAccountDialog("choose");
  return new Promise(resolve => { accountChoiceResolve = resolve; });
}

function accountAfterWave() {
  if (accountRollout !== "public" || !COL.n || KID() || LS.get("ctl_account_rev", 0) ||
      LS.get("ctl_account_offer", false)) return;
  LS.set("ctl_account_offer", true);
  if (!accountDialog.open && !document.querySelector(".modal.on, dialog[open]")) openAccountDialog("link");
  else toast("Zabezpeč si zbierku", "Prihlásenie nájdeš v Nastavenia → Profil.");
}

function readAccountBackup() {
  lsFlush();
  const data = {};
  for (const key of ACCOUNT_BACKUP_KEYS) {
    const value = LS.get(key, null);
    if (value !== null) data[key] = value;
  }
  data.ctl_col = COL;
  return data;
}

async function accountBackupDigest(data) {
  const raw = JSON.stringify(data);
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function restoreAccount(data) {
  if (SOC.inflight) throw Error("wave");
  if (!data.backup?.ctl_col || !data.id || !data.tok) throw Error("data");
  if (hasLocalAccountProgress()) throw Error("local");
  const digest = await accountBackupDigest(data.backup);
  if (hasLocalAccountProgress()) throw Error("local");
  if (SOC.inflight) throw Error("wave");
  lsFlush();
  const writes = {...Object.fromEntries(ACCOUNT_BACKUP_KEYS.map(key => [key, data.backup[key]])),
    ctl_cid: data.id, ctl_tok: data.tok, ctl_tok0: data.tok, ctl_pid: data.pid,
    ctl_fk: data.fk, ctl_fkT: Date.now(), ctl_reset_epoch: data.epoch,
    ctl_account_rev: data.rev, ctl_account_digest: digest, ctl_onb: 1, ctl_kid: false};
  const previous = new Map(Object.keys(writes).map(key => [key, localStorage.getItem(key)]));
  try {
    for (const [key, value] of Object.entries(writes)) {
      if (value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    for (const [key, value] of previous) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    throw error;
  }
  LSP.clear();
  LS.set = () => {};
  location.reload();
}

async function saveAccountBackup(manual = false) {
  const rev = LS.get("ctl_account_rev", 0);
  if (LS.get("ctl_account_pause", false) || !rev || accountRollout === "off" || KID() || accountBackupBusy ||
      accountConflict || !navigator.onLine || SOC.inflight) return;
  const backup = readAccountBackup();
  accountBackupBusy = true;
  try {
    const digest = await accountBackupDigest(backup);
    if (!manual && digest === LS.get("ctl_account_digest", "")) return;
    const response = await apiPost("/api/account/backup", {rev, backup});
    const data = await response.json();
    if (response.status === 409) accountConflict = true;
    if (!response.ok || !data.rev) throw Error(data.error);
    LS.set("ctl_account_rev", data.rev);
    LS.set("ctl_account_digest", digest);
    if (manual) toast("Zbierka zálohovaná", "");
  } catch (error) {
    if (manual) toast("Záloha sa neuložila", accountConflict ? "Pokrok tu zostal uložený." : "Skús znova, keď budeš online.");
  } finally {
    accountBackupBusy = false;
    renderAccountSettings();
  }
}

$("accountOnboarding").onclick = () => openAccountDialog("login");
$("accountExisting").onclick = () => openAccountDialog("login");
$("accountLogin").onclick = () => openAccountDialog("login");
$("accountSave").onclick = () => {
  if (!LS.get("ctl_account_rev", 0)) return openAccountDialog("link");
  if (!LS.get("ctl_account_pause", false)) return saveAccountBackup(true);
  toast("Záloha je pozastavená", "Zálohovanú zbierku otvoríš prihlásením v inom prehliadači.");
};
$("accountFirst").onclick = () => {
  LS.set("ctl_account_guest", true);
  renderAccountSettings();
  accountChoiceResolve?.(true);
  accountChoiceResolve = null;
  accountDialog.close();
};
$("accountClose").onclick = () => { if (!accountBusy) accountDialog.close(); };
accountDialog.addEventListener("close", () => {
  accountChoiceResolve?.(false);
  accountChoiceResolve = null;
});
accountDialog.addEventListener("cancel", event => { if (accountBusy) event.preventDefault(); });
accountDialog.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });

$("accountForm").onsubmit = async event => {
  event.preventDefault();
  if (accountBusy) return;
  accountBusy = true;
  $("accountContinue").disabled = true;
  $("accountClose").disabled = true;
  $("accountMessage").textContent = "";
  try {
    const code = $("accountCode").value.replace(/\s/g, "");
    const body = accountChallenge
      ? {mode: accountMode, challenge: accountChallenge, code}
      : {mode: accountMode, email: $("accountEmail").value};
    let digest;
    if (accountMode === "link" && accountChallenge) {
      body.backup = readAccountBackup();
      digest = await accountBackupDigest(body.backup);
    }
    const path = "/api/account/" + (accountChallenge ? "finish" : "start");
    const response = accountMode === "link"
      ? await apiPost(path, body)
      : await apiRequest(DEFAULT_PROXY + path, {method: "POST", headers: {"Content-Type": "text/plain"}, body: JSON.stringify(body)});
    const data = await response.json();
    if (!response.ok) throw Error(data.error);
    if (!accountChallenge) {
      if (!data.challenge) throw Error("delivery");
      accountChallenge = data.challenge;
      $("accountEmailRow").hidden = true;
      $("accountCodeRow").hidden = false;
      $("accountContinue").textContent = "Overiť kód";
      $("accountMessage").textContent = "Kód sme poslali e-mailom.";
      $("accountCode").focus();
    } else if (accountMode === "link") {
      LS.set("ctl_account_rev", data.rev);
      if (!data.restored) LS.set("ctl_account_digest", digest);
      accountDialog.close();
      renderAccountSettings();
      toast("Zbierka je zabezpečená", "Odteraz sa k nej môžeš prihlásiť e-mailom.");
    } else {
      await restoreAccount(data);
    }
  } catch (error) {
    $("accountMessage").textContent = ({
      email: "Skontroluj e-mailovú adresu.",
      pilot: "Tento e-mail zatiaľ nemá prístup k pilotu.",
      code: "Kód je nesprávny alebo vypršal. Ak potrebuješ nový, zavri a znovu otvor toto okno.",
      unlinked: "K tomuto e-mailu ešte nie je pripojená zbierka.",
      already_linked: "Tento e-mail alebo zbierka už má nastavené prihlásenie.",
      backup: "Zbierku sa nepodarilo zálohovať. Pokrok v tomto prehliadači zostal uložený.",
      local: "V tomto prehliadači už máš rozhranú zbierku. Prihlásenie skús v inom prehliadači, aby obe ostali dostupné.",
      rate: "Príliš veľa pokusov. Skús znova neskôr.",
      wave: "Počkaj, kým sa dokončí mávnutie."
    })[error.message] || "Teraz to nevyšlo. Skontroluj pripojenie a skús znova.";
  } finally {
    accountBusy = false;
    $("accountContinue").disabled = false;
    $("accountClose").disabled = false;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  renderAccountSettings();
  refreshAccountStatus();
  setInterval(() => { if (!document.hidden) saveAccountBackup(); }, 30000);
  addEventListener("online", () => refreshAccountStatus().then(() => saveAccountBackup()));
}, {once: true});

