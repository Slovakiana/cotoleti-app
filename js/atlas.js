"use strict";

const atlasRankDialog = $("atlasRankDialog");
let nationalAtlas, atlasRankRequest, atlasRankRetry = 0, atlasAward, atlasCardType = "";

function atlasRankLabel(mine) {
  if (!mine) return "Získaj svoje miesto v rebríčku";
  return nf(mine.rank) + ". miesto na Slovensku";
}

function atlasRivalLabel(mine) {
  if (!mine) return "Prvý overený typ ťa zaradí do rebríčka.";
  if (mine.rank === 1) return mine.tied ? "Delíš sa o vedenie." : "Vedieš Atlas Slovenska.";
  return nf(mine.gap + 1) + " b na predbehnutie najbližšieho súpera";
}

function renderAtlasRows(id, rows) {
  const list = $(id);
  const elements = rows.map(row => {
    const li = document.createElement("li");
    const rank = document.createElement("strong"), name = document.createElement("span");
    const points = document.createElement("span");
    rank.textContent = nf(row.rank) + ".";
    name.className = "atlas-rank-name";
    name.textContent = row.me ? "Ty" : KID() ? "Zberateľ" : row.nick;
    points.className = "atlas-rank-points";
    points.textContent = nf(row.sc) + " b";
    if (row.me) li.dataset.me = "";
    li.append(rank, name, points);
    if (!KID() && !row.me && row.nick && row.nick !== "Spotter") {
      const report = document.createElement("button");
      report.className = "rep";
      report.type = "button";
      report.textContent = "🚩";
      report.setAttribute("aria-label", "Nahlásiť meno: " + row.nick);
      report.onclick = () => {
        atlasRankDialog.close();
        reportName(row.nick, report);
      };
      li.append(report);
    }
    return li;
  });
  list.replaceChildren(...elements);
}

function renderAtlasRank() {
  const board = nationalAtlas?.data, mine = board?.me;
  $("atlasQuickPlace").textContent = mine ? atlasRankLabel(mine) + " · " + atlasRivalLabel(mine) : atlasRankLabel(null);
  $("atlasCollectionPlace").textContent = mine ? atlasRankLabel(mine) : "Celé Slovensko";
  if (!atlasRankDialog.open || !board) return;
  const top = board.top || [];
  $("atlasRankStatus").textContent = top.length ? "" : "Prvý overený typ otvorí rebríček Slovenska.";
  $("atlasLeaders").hidden = !top.length;
  $("atlasMine").hidden = false;
  $("atlasAll").hidden = top.length <= 3;
  $("atlasMineText").textContent = mine
    ? atlasRankLabel(mine) + " · " + nf(mine.sc) + " b. " + atlasRivalLabel(mine)
    : atlasRivalLabel(null);
  renderAtlasRows("atlasPodium", top.slice(0, 3));
  renderAtlasRows("atlasNearby", board.nearby || []);
  renderAtlasRows("atlasRest", top.slice(3));
}

function refreshAtlasRank(force = false) {
  if (!SOC.api || !navigator.onLine || (!force && !SOC.authVerified)) return Promise.resolve(null);
  const owner = SOC.authVerified ? SOC.cid : "";
  if (atlasRankRequest) return force ? atlasRankRequest.then(() => refreshAtlasRank(true)) : atlasRankRequest;
  if (!force && nationalAtlas?.owner === owner && Date.now() - nationalAtlas.time < 120000) {
    return Promise.resolve(nationalAtlas.data);
  }
  if (!force && Date.now() < atlasRankRetry) return Promise.resolve(null);
  const request = owner ? apiPost("/api/atlasy", {k: ""}) : apiRequest(SOC.api + "/api/atlasy", {cache: "no-store"});
  atlasRankRequest = request.then(async response => {
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.top)) throw Error("atlas");
    nationalAtlas = {owner, time: Date.now(), data};
    atlasRankRetry = 0;
    renderAtlasRank();
    return data;
  }).catch(() => {
    atlasRankRetry = Date.now() + 30000;
    if (atlasRankDialog.open) $("atlasRankStatus").textContent = "Poradie sa teraz nepodarilo obnoviť.";
    return null;
  }).finally(() => { atlasRankRequest = null; });
  return atlasRankRequest;
}

function openNationalAtlas() {
  if ($("cardM").classList.contains("on")) closeModal($("cardM"));
  if (!atlasRankDialog.open) atlasRankDialog.showModal();
  $("atlasRankStatus").textContent = nationalAtlas ? "" : "Načítavam poradie…";
  renderAtlasRank();
  if (!navigator.onLine) {
    $("atlasRankStatus").textContent = "Na obnovenie poradia potrebuješ pripojenie.";
    return;
  }
  const owner = SOC.authVerified ? SOC.cid : "";
  if (nationalAtlas?.owner !== owner || Date.now() - nationalAtlas.time >= 120000) refreshAtlasRank(true);
}

function renderAtlasOpportunity(plane) {
  const type = plane && planeType(plane);
  const eligible = type && !plane.ground && !plane.emg && !plane.santa && !S.manual &&
    plane.el >= 10 && S.pos && krajOf(S.pos) !== "XX" && !skyStale();
  const hint = $("atlasOpportunity");
  hint.hidden = !eligible || !!COL.types[type]?.ver;
  hint.textContent = hint.hidden ? "" : "Možný nový typ do Atlasu · body po overení";
}

function renderAtlasCardResult(type = atlasCardType) {
  atlasCardType = type;
  const result = $("atlasCardResult");
  result.hidden = !atlasAward || atlasAward.type !== type;
  $("atlasCardText").textContent = result.hidden ? "" : atlasAward.text;
}

function clearAtlasAward() {
  atlasAward = null;
  $("atlasWaveResult").hidden = true;
  renderAtlasCardResult();
}

function showAtlasAward(result) {
  if (!result.ver || !Number.isInteger(result.atlasPoints) || result.atlasPoints <= 0) return;
  const points = result.atlasPoints;
  const previous = nationalAtlas?.owner === SOC.cid ? nationalAtlas.data.me : null;
  const prefix = "+" + nf(points) + " b do Atlasu";
  const award = {type: normalizeType(result.type), text: prefix};
  atlasAward = award;
  $("atlasWaveText").textContent = prefix;
  $("atlasWaveResult").hidden = false;
  renderAtlasCardResult();
  refreshAtlasRank(true).then(board => {
    const mine = board?.me;
    if (atlasAward !== award || !mine) return;
    const moved = previous && previous.sc + points === mine.sc && previous.rank > mine.rank;
    award.text = prefix + " · " + (moved ? nf(previous.rank) + ". → " : "") + atlasRankLabel(mine);
    $("atlasWaveText").textContent = award.text;
    renderAtlasCardResult();
  });
}

for (const id of ["atlasQuick", "atlasCollection", "atlasWaveResult", "atlasCardResult"]) $(id).onclick = openNationalAtlas;
$("atlasRankClose").onclick = () => atlasRankDialog.close();
atlasRankDialog.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
HOOKS.view.push(view => { if (view === "now" || view === "col") refreshAtlasRank(); });
