"use strict";

const spotterDialog = $("spotterDialog");

function spotterIdentity() {
  const child = KID() || !!SOC.profileNickname?.kid;
  const name = nick();
  const nickname = !child && !nickIsDefault(name) ? name : "";
  const level = lvlOf(COL.pts);
  const type = spotterType().n;
  return {
    nickname,
    title: level > 0 && type === "Začínajúci pozorovateľ" ? lvlName(level) : type,
    verified: Object.entries(COL.types).filter(([key, card]) => key !== "?" && card.n && card.ver).length,
    countries: journalEntries("ct").length,
    badges: ACH.filter(badge => COL.ach[badge.id] && !(child && badge.soc)).length,
    shareable: !child && (!!COL.n || Object.values(COL.types).some(card => card.n))
  };
}

function renderSpotterIdentity() {
  const model = spotterIdentity();
  $("spotterIdentityName").textContent = model.nickname || "Môj profil";
  $("spotterIdentityTitle").textContent = model.title;
  $("spotterTypes").textContent = nf(model.verified);
  $("spotterCountries").textContent = nf(model.countries);
  $("spotterBadges").textContent = nf(model.badges);
  $("spotterOpen").hidden = !model.shareable;
  if (spotterDialog.open) {
    if (!model.shareable) spotterDialog.close();
    else renderSpotterPreview(model);
  }
}

function renderSpotterPreview(model) {
  $("spotterShareNameRow").hidden = !model.nickname;
  $("spotterPreviewName").textContent = $("spotterShareName").checked && model.nickname ? model.nickname : "Moja obloha";
  $("spotterPreviewTitle").textContent = model.title;
  $("spotterPreviewStats").textContent = [
    nf(model.verified) + " · overené typy", nf(model.countries) + " · pečiatky krajín",
    nf(model.badges) + " · odznaky"
  ].join("  |  ");
}

function drawSpotterCard(model, displayName) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const styles = getComputedStyle(document.documentElement);
  const signal = styles.getPropertyValue("--brand-signal").trim() || "#f4d66f";
  const night = styles.getPropertyValue("--brand-night").trim() || "#101b2b";
  const background = ctx.createLinearGradient(1080, 0, 220, 1350);
  background.addColorStop(0, "#2b4d65");
  background.addColorStop(0.65, night);
  background.addColorStop(1, "#0a121e");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = signal;
  ctx.lineWidth = 3;
  for (const radius of [160, 225, 290]) {
    ctx.beginPath();
    ctx.arc(780, 335, radius, -1.1, 4.4);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = signal;
  ctx.fillStyle = signal;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(120, 150, 23, 0.2, 5.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(120, 150, 4, 0, Math.PI * 2);
  ctx.moveTo(146, 135);
  ctx.arc(141, 135, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "800 42px Inter, sans-serif";
  ctx.fillText("Čo to letí?", 163, 165);
  ctx.fillStyle = "#f4f7fb";
  ctx.font = "900 82px Unbounded, sans-serif";
  ctx.fillText(displayName, 95, 480, 890);
  ctx.fillStyle = "#d1ddeb";
  ctx.font = "650 47px Inter, sans-serif";
  ctx.fillText(model.title, 95, 558, 890);

  const stats = [
    [model.verified, "Overené typy"],
    [model.countries, "Pečiatky krajín"],
    [model.badges, "Odznaky"]
  ];
  stats.forEach(([count, label], index) => {
    const y = 735 + index * 105;
    ctx.fillStyle = signal;
    ctx.font = "800 60px Inter, sans-serif";
    ctx.fillText(nf(count), 95, y, 205);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = "650 40px Inter, sans-serif";
    ctx.fillText(label, 325, y, 660);
  });
  ctx.fillStyle = signal;
  ctx.font = "800 52px Unbounded, sans-serif";
  ctx.fillText("Pozri hore.", 95, 1200, 890);
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

$("spotterOpen").onclick = () => {
  const model = spotterIdentity();
  if (!model.shareable) return;
  $("spotterShareName").checked = false;
  $("spotterShareStatus").textContent = "";
  renderSpotterPreview(model);
  if (!spotterDialog.open) spotterDialog.showModal();
};
$("spotterClose").onclick = () => spotterDialog.close();
$("spotterShareName").onchange = () => renderSpotterPreview(spotterIdentity());
spotterDialog.addEventListener("keydown", event => { if (event.key === "Escape") event.stopPropagation(); });
$("spotterShare").onclick = async () => {
  const model = spotterIdentity();
  if (!model.shareable) return;
  const button = $("spotterShare");
  if (button.disabled) return;
  const displayName = $("spotterShareName").checked && model.nickname ? model.nickname : "Moja obloha";
  button.disabled = true;
  try {
    const image = await drawSpotterCard(model, displayName);
    if (!image) throw Error("export");
    if (!spotterDialog.open || !spotterIdentity().shareable) return;
    spotterDialog.close();
    await shareBlob(image, "moja-obloha.png", "Pozri hore. Zbieram lietadlá, ktoré naozaj letia nado mnou. " + appLink());
  } catch (error) {
    $("spotterShareStatus").textContent = "Kartičku sa nepodarilo vytvoriť. Skús znova.";
  } finally {
    button.disabled = false;
  }
};
