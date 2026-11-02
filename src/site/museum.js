// 微光博物館｜前台
// 夜間售票口選展區 → 領到今晚的票（可存成圖）→ 前往：吊燈快速熄滅、拿到手電筒 → 樓層
// 選了哪個展區只在瀏覽器裡用，不記錄、不送出。
import { objectSVG } from "./objects.js";

const D = window.MUSEUM;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = n => String(n).padStart(2, "0");
const wait = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => innerWidth <= 760;

const EX = Object.fromEntries(D.exhibits.map(e => [e.id, e]));
const FLOOR = Object.fromEntries(D.floors.map(f => [f.id, f]));
const ZONES = D.admission.zones;

let zone = null, line = null, issuedAt = null;

/* ---------- 館內：吊燈、地板反光、櫥窗 ---------- */
function buildLamps() {
  // 吊燈只掛在兩側，不擋館名
  const xs = narrow() ? [9, 91] : [5, 16, 27, 73, 84, 95], lamps = $("lamps"), shine = $("floor-shine");
  lamps.innerHTML = ""; shine.innerHTML = "";
  xs.forEach((x, i) => {
    const l = document.createElement("div");
    l.className = "lamp"; l.style.left = `${x}%`;
    l.style.setProperty("--drop", narrow() ? `${34 + i * 10}px` : `${[96, 64, 112, 112, 64, 96][i]}px`);
    l.innerHTML = '<span class="lamp-glow"></span><span class="lamp-shade"></span><span class="lamp-bulb"></span>';
    lamps.appendChild(l);
    const s = document.createElement("span");
    s.style.left = `${x}%`; shine.appendChild(s);
  });
  if (document.body.classList.contains("is-dark")) setLamps(false);
}
function setLamps(on) {
  document.querySelectorAll(".lamp").forEach(l => l.classList.toggle("off", !on));
  document.querySelectorAll(".floor-shine span").forEach(s => s.classList.toggle("off", !on));
}

function caseHTML(e, extra = "") {
  return `<div class="case glow-${esc(e.glow)}" ${extra}><div class="case-glass"><span class="case-light"></span>${objectSVG(e.object)}</div><div class="case-base"></div></div>`;
}
// 牆邊一排櫥窗：亮燈時藏起來，熄燈後用手電筒找得到。選了展區就先擺那一層的展品
function buildCases() {
  const mine = zone?.floor ? D.exhibits.filter(e => e.floor === zone.floor) : [];
  const list = [...mine, ...D.exhibits.filter(e => !mine.includes(e))].filter(e => e.onDisplay);
  const spots = narrow() ? [{ x: 17, i: 1 }, { x: 50, i: 0 }, { x: 83, i: 2 }]
    : [{ x: 7, i: 3 }, { x: 21, i: 4 }, { x: 36, i: 1 }, { x: 50, i: 0 }, { x: 64, i: 2 }, { x: 79, i: 5 }, { x: 93, i: 6 }];
  const cw = narrow() ? Math.min(innerWidth * .25, 130) : Math.min(innerWidth * .105, 168);
  $("cases").innerHTML = spots.map(s => list[s.i] ? caseHTML(list[s.i], `style="left:${s.x}%;--cw:${cw}px"`) : "").join("");
}

/* ---------- 一、夜間售票口 ---------- */
function zoneInfo(z) {
  const f = FLOOR[z.floor];
  return f ? { name: f.name, en: f.en, label: f.label } : { name: z.name || "全館", en: z.en || "All Floors", label: "" };
}
function buildZones() {
  $("zones").innerHTML = ZONES.map(z => {
    const f = zoneInfo(z);
    // 像售票窗上的價目表：羅馬數字、選項、點線、樓層
    return `<button class="zone" type="button" data-id="${esc(z.id)}">
      <span class="zone-no">${esc(z.numeral)}</span><span class="zone-name">${esc(z.choice)}</span><span class="zone-dots" aria-hidden="true"></span>
      <span class="zone-floor">${esc(f.label || f.name)}${f.label ? `<em> ${esc(f.name)}</em>` : ""}</span></button>`;
  }).join("");
  $("zones").querySelectorAll(".zone").forEach((b, i) => { b.style.setProperty("--d", `${.5 + i * .22}s`); b.addEventListener("click", () => issue(b)); });
  waveZones();
}
// 一進來，樓層牌四行由上到下亮一次，告訴訪客「這裡可以點」
function waveZones() {
  if (REDUCED) return;
  const z = $("zones"); z.classList.remove("wave"); void z.offsetWidth; z.classList.add("wave");
  clearTimeout(waveZones.t); waveZones.t = setTimeout(() => z.classList.remove("wave"), 2600);
}

let busy = false;
async function issue(btn) {
  if (busy) return; busy = true;
  zone = ZONES.find(z => z.id === btn.dataset.id);
  line = zone.lines[Math.floor(Math.random() * zone.lines.length)];
  issuedAt = new Date();
  $("zones").querySelectorAll(".zone").forEach(b => b.classList.toggle("on", b === btn));
  // 售票窗亮一下，票從出票口遞出來
  $("booth").classList.add("issuing");
  await wait(REDUCED ? 0 : 380);
  showTicket(true);
  // 票滑出窗口後，售票口才慢慢退到暗處
  await wait(REDUCED ? 0 : 900);
  $("booth-scene").classList.add("leaving");
  await wait(REDUCED ? 0 : 700);
  $("booth-scene").hidden = true;
  busy = false;
}

/* ---------- 二、今晚的票 ---------- */
// 警衛的話在逗號後換行，讀起來比較順；句子短就不換
function quoteLines(t) {
  if ([...t].length <= 12) return [t];
  const i = t.search(/[，；]/);
  return i > 0 && i < t.length - 2 ? [t.slice(0, i + 1), t.slice(i + 1)] : [t];
}
function dateStr(d) { return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`; }
function fillTicket() {
  const f = zoneInfo(zone);
  $("tk-numeral").textContent = zone.numeral;
  $("tk-zone").textContent = f.name;
  $("tk-zone-en").textContent = f.label ? `${f.en} · ${f.label}` : f.en;
  $("tk-quote").innerHTML = quoteLines(line.zh).map(esc).join("<br>");
  $("tk-quote-en").textContent = line.en || "";
  $("tk-quote-en").hidden = !line.en;
  $("tk-date").textContent = dateStr(issuedAt);
  $("tk-go").textContent = f.label ? `前往 ${f.label} ${f.name} →` : "走進館內 →";
}
function showTicket(fromSlot = false) {
  fillTicket();
  const t = $("ticket-scene"); t.hidden = false; t.scrollTop = 0;
  t.classList.toggle("from-slot", fromSlot && !REDUCED);
  const tk = $("ticket");
  tk.getAnimations().forEach(a => a.cancel());
  if (fromSlot && !REDUCED) {
    // 票先縮成出票口的寬度、從口子探出來，再往前滑、放大到畫面中央
    tk.style.animation = "none";
    const r = tk.getBoundingClientRect(), sl = $("booth-slot").getBoundingClientRect();
    // 出票時的大小：不超過出票口寬度，也不能滑出畫面底部
    const room = innerHeight - sl.bottom - 52;
    const k = Math.max(.08, Math.min(sl.width * .8 / r.width, room / r.height));
    const dx = (sl.left + sl.width / 2) - (r.left + r.width / 2), dy = sl.top - r.top;
    // clip-path 把出票口上方的部分藏起來，看起來就是從口子裡探出來；每一段各自的節奏
    tk.animate([
      { transform: `translate(${dx}px, ${dy - r.height * k}px) scale(${k})`, clipPath: "inset(100% 0 0 0)", offset: 0, easing: "linear" },
      { transform: `translate(${dx}px, ${dy - r.height * k}px) scale(${k})`, clipPath: "inset(100% 0 0 0)", offset: .05, easing: "cubic-bezier(.3, 0, .3, 1)" },
      { transform: `translate(${dx}px, ${dy + 6}px) scale(${k})`, clipPath: "inset(0% 0 0 0)", offset: .45, easing: "linear" },
      { transform: `translate(${dx}px, ${dy + 6}px) scale(${k})`, clipPath: "inset(0% 0 0 0)", offset: .52, easing: "cubic-bezier(.5, 0, .2, 1)" },
      { transform: "translate(0, 0) scale(1) rotate(-1.2deg)", clipPath: "inset(0% 0 0 0)", offset: 1 }
    ], { duration: 1700, fill: "backwards" });
  } else { tk.style.animation = "none"; void tk.offsetWidth; tk.style.animation = ""; }
  $("tk-go").focus({ preventScroll: true });
}

// 存成直式圖片（1080×1920），手機可以直接分享到相簿或限動
function wrap(x, text, maxW, byWord) {
  // 平均分行：先算要幾行，再用平均寬度折，避免最後一行只剩一個字
  const total = x.measureText(text).width, n = Math.max(1, Math.ceil(total / maxW));
  maxW = Math.min(maxW, total / n * 1.08);
  const parts = byWord ? text.split(/(\s+)/) : [...text], lines = []; let cur = "";
  for (const p of parts) {
    const t = cur + p;
    if (cur.trim() && x.measureText(t.trim()).width > maxW && !/^[，。、！？」』）：；…\s]$/.test(p)) { lines.push(cur.trim()); cur = p.trimStart(); }
    else cur = t;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}
async function ticketImage() {
  const W = 1080, H = 1920, f = zoneInfo(zone);
  const SERIF = '"Noto Serif TC", "Songti TC", serif', LATIN = '"Cormorant Garamond", "Times New Roman", serif', SANS = '"Noto Sans TC", sans-serif';
  if (document.fonts) await Promise.all([
    document.fonts.load(`700 46px ${SERIF}`, "微光博物館" + f.name), document.fonts.load(`500 44px ${SERIF}`, line.zh + "夜間入館券"), document.fonts.load(`700 46px ${SERIF}`, "0123456789."),
    document.fonts.load(`600 260px ${LATIN}`, zone.numeral + "MUSEUM OF GLIMMERS0123456789."), document.fonts.load(`italic 500 40px ${LATIN}`, (line.en || "") + f.en + "Night Admission"),
    document.fonts.load(`400 26px ${SANS}`, "夜班警衛 Night Guard")
  ]).catch(() => {});
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const ls = v => { if ("letterSpacing" in x) x.letterSpacing = v; };
  const gold = (x0, x1) => { const g = x.createLinearGradient(x0, 0, x1, 0);
    [[0, "#9c742c"], [.2, "#f3dc9c"], [.38, "#c9993f"], [.55, "#f8e7b2"], [.74, "#a87c30"], [1, "#e9c97f"]].forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  // 黑暗的展廳＋一圈暖光
  x.fillStyle = "#04070d"; x.fillRect(0, 0, W, H);
  let g = x.createRadialGradient(W / 2, H * .45, 60, W / 2, H * .45, 860);
  g.addColorStop(0, "rgba(255,214,140,.2)"); g.addColorStop(.55, "rgba(255,214,140,.05)"); g.addColorStop(1, "rgba(255,214,140,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 票：深墨藍厚卡，存根處左右各一個缺口
  const tw = 780, th = 1440, tx = (W - tw) / 2, ty = 180, stubY = ty + th - 190, r = 22, rr = 18;
  x.save(); x.translate(W / 2, ty + th / 2); x.rotate(-1.2 * Math.PI / 180); x.translate(-W / 2, -(ty + th / 2));
  const shape = () => {
    x.beginPath();
    x.moveTo(tx + rr, ty); x.lineTo(tx + tw - rr, ty); x.quadraticCurveTo(tx + tw, ty, tx + tw, ty + rr);
    x.lineTo(tx + tw, stubY - r); x.arc(tx + tw, stubY, r, -Math.PI / 2, Math.PI / 2, true);
    x.lineTo(tx + tw, ty + th - rr); x.quadraticCurveTo(tx + tw, ty + th, tx + tw - rr, ty + th);
    x.lineTo(tx + rr, ty + th); x.quadraticCurveTo(tx, ty + th, tx, ty + th - rr);
    x.lineTo(tx, stubY + r); x.arc(tx, stubY, r, Math.PI / 2, -Math.PI / 2, true);
    x.lineTo(tx, ty + rr); x.quadraticCurveTo(tx, ty, tx + rr, ty); x.closePath();
  };
  x.shadowColor = "rgba(0,0,0,.7)"; x.shadowBlur = 90; x.shadowOffsetY = 50; shape();
  g = x.createLinearGradient(tx, ty, tx + tw * .4, ty + th); g.addColorStop(0, "#13213f"); g.addColorStop(.55, "#0d1730"); g.addColorStop(1, "#0a1226");
  x.fillStyle = g; x.fill(); x.shadowColor = "transparent";
  x.save(); shape(); x.clip();
  g = x.createRadialGradient(tx + tw * .3, ty, 20, tx + tw * .3, ty, 900); g.addColorStop(0, "rgba(80,110,170,.22)"); g.addColorStop(1, "rgba(80,110,170,0)");
  x.fillStyle = g; x.fillRect(tx, ty, tw, th);
  // 底紋：同心圓
  x.strokeStyle = "rgba(232,200,137,.07)"; x.lineWidth = 1.4;
  for (let gx = tx; gx < tx + tw + 470; gx += 470) for (let gy = ty; gy < ty + th + 470; gy += 470) {
    for (let k = 1; k <= 6; k++) { x.beginPath(); x.arc(gx + 235, gy + 235, 47 * k, 0, Math.PI * 2); x.stroke(); }
    x.beginPath(); x.arc(gx, gy, 113, 0, Math.PI * 2); x.stroke();
  }
  x.restore();
  // 燙金細框＋上方兩個菱形
  const fi = 28; x.strokeStyle = "rgba(232,200,137,.45)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(tx + fi, stubY - 26); x.lineTo(tx + fi, ty + fi); x.lineTo(tx + tw - fi, ty + fi); x.lineTo(tx + tw - fi, stubY - 26); x.stroke();
  for (const dx of [tx + fi, tx + tw - fi]) { x.save(); x.translate(dx, ty + fi); x.rotate(Math.PI / 4); x.fillStyle = "#0e1932"; x.fillRect(-10, -10, 20, 20); x.strokeStyle = "rgba(232,200,137,.75)"; x.strokeRect(-10, -10, 20, 20); x.restore(); }
  // 撕線
  x.fillStyle = "rgba(232,200,137,.55)";
  for (let px = tx + 46; px < tx + tw - 46; px += 16) x.fillRect(px, stubY - 1, 5, 2);
  const cx = W / 2; x.textAlign = "center"; x.textBaseline = "alphabetic";
  // 燈籠館徽
  x.save(); x.translate(cx - 36, ty + 92); x.scale(2.4, 2.4); x.fillStyle = gold(0, 30); x.strokeStyle = gold(0, 30); x.lineWidth = 1.2;
  x.beginPath(); x.arc(15, 3.2, 2.4, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(7, 11); x.lineTo(23, 11); x.lineTo(19.5, 6); x.lineTo(10.5, 6); x.closePath(); x.fill();
  x.strokeRect(8, 11, 14, 19);
  x.beginPath(); x.moveTo(15, 15); x.bezierCurveTo(18.5, 19.5, 18.5, 23, 15, 25.5); x.bezierCurveTo(11.5, 23, 11.5, 19.5, 15, 15); x.fill();
  x.fillRect(6, 30, 18, 3.2); x.beginPath(); x.moveTo(9, 33.2); x.lineTo(10.5, 37); x.lineTo(19.5, 37); x.lineTo(21, 33.2); x.closePath(); x.fill();
  x.restore();
  x.fillStyle = gold(cx - 300, cx + 300); x.font = `600 30px ${LATIN}`; ls("16px"); x.fillText("MUSEUM OF GLIMMERS", cx + 8, ty + 236);
  x.fillStyle = "#efe6d2"; x.font = `700 46px ${SERIF}`; ls("22px"); x.fillText("微光博物館", cx + 11, ty + 302);
  x.fillStyle = gold(cx - 150, cx + 150); x.font = `600 230px ${LATIN}`; ls("12px"); x.fillText(zone.numeral, cx + 6, ty + 548);
  x.fillStyle = "#efe6d2"; x.font = `700 54px ${SERIF}`; ls("20px"); x.fillText(f.name, cx + 10, ty + 650);
  x.fillStyle = "rgba(239,230,210,.62)"; x.font = `italic 500 42px ${LATIN}`; ls("2px"); x.fillText(f.label ? `${f.en} · ${f.label}` : f.en, cx, ty + 708);
  g = x.createLinearGradient(cx - 110, 0, cx + 110, 0); g.addColorStop(0, "rgba(232,200,137,0)"); g.addColorStop(.5, "rgba(232,200,137,.9)"); g.addColorStop(1, "rgba(232,200,137,0)");
  x.fillStyle = g; x.fillRect(cx - 110, ty + 770, 220, 2);
  x.save(); x.translate(cx, ty + 771); x.rotate(Math.PI / 4); x.fillStyle = "#e8c889"; x.fillRect(-7, -7, 14, 14); x.restore();
  // 警衛的話：中文照逗號換行（太長再折），英文照單字折；整段在剩下的空間裡置中
  x.font = `500 44px ${SERIF}`; ls("5px");
  const zl = quoteLines(line.zh).flatMap(l => wrap(x, l, tw - 170));
  x.font = `italic 500 40px ${LATIN}`; ls("0px");
  const el = line.en ? wrap(x, line.en, tw - 170, true) : [];
  const blockH = zl.length * 82 + (el.length ? 16 + el.length * 54 : 0) + 76;
  let y = ty + 830 + Math.max(0, (stubY - 60 - (ty + 830) - blockH) / 2) + 44;
  x.fillStyle = "#efe6d2"; x.font = `500 44px ${SERIF}`; ls("5px");
  for (const l of zl) { x.fillText(l, cx + 2, y); y += 82; }
  if (el.length) { y += 4; x.fillStyle = "rgba(239,230,210,.58)"; x.font = `italic 500 40px ${LATIN}`; ls("0px");
    for (const l of el) { x.fillText(l, cx, y); y += 54; } }
  x.fillStyle = "rgba(232,200,137,.72)"; x.font = `400 26px ${SANS}`; ls("12px"); x.fillText("夜班警衛　Night Guard", cx + 6, y + 30);
  // 存根
  x.textAlign = "left"; x.fillStyle = "rgba(239,230,210,.8)"; x.font = `500 32px ${SERIF}`; ls("12px"); x.fillText("夜間入館券", tx + 70, stubY + 88);
  x.fillStyle = "rgba(239,230,210,.55)"; x.font = `italic 500 34px ${LATIN}`; ls("2px"); x.fillText("Night Admission", tx + 70, stubY + 134);
  // 日期用襯線中文字型的數字（等高），英文字型的數字高低不一
  x.textAlign = "right"; x.fillStyle = gold(tx + tw - 330, tx + tw - 70); x.font = `700 46px ${SERIF}`; ls("4px"); x.fillText(dateStr(issuedAt), tx + tw - 66, stubY + 116);
  x.restore();
  x.textAlign = "center"; x.fillStyle = "rgba(232,200,137,.8)"; x.font = `600 28px ${LATIN}`; ls("10px"); x.fillText("MUSEUM OF GLIMMERS", cx, 1760);
  x.fillStyle = "rgba(236,229,212,.55)"; x.font = `500 26px ${SERIF}`; ls("10px"); x.fillText("引路人文創園區", cx, 1806);
  return new Promise(res => c.toBlob(res, "image/png"));
}
async function saveTicket() {
  const btn = $("tk-save"), old = btn.textContent; btn.textContent = "製作中……"; btn.disabled = true;
  try {
    const blob = await ticketImage(), name = `微光博物館-${zoneInfo(zone).name}-${dateStr(issuedAt).replaceAll(".", "")}.png`;
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) await navigator.share({ files: [file] }).catch(() => {});
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("票根已存下"); }
  } catch (e) { toast("存圖失敗，請再試一次"); }
  btn.textContent = old; btn.disabled = false;
}

/* ---------- 三、熄燈：進館前的儀式，節奏要快 ---------- */
async function lightsOut(fast = false) {
  buildCases();
  const lamps = [...document.querySelectorAll(".lamp")], shines = [...document.querySelectorAll(".floor-shine span")];
  if (fast || REDUCED) setLamps(false);
  else for (let i = 0; i < lamps.length; i++) {
    lamps[i].classList.add("flick");
    await wait(70);
    lamps[i].classList.add("off"); shines[i]?.classList.add("off");
    await wait(90);
  }
  document.body.classList.add("is-dark"); document.body.classList.remove("is-lit");
  startTorch();
}
async function enter() {
  if (busy) return; busy = true;
  $("ticket-scene").hidden = true;
  await lightsOut();
  const n = $("night-scene"); n.hidden = false; n.classList.remove("play"); void n.offsetWidth; n.classList.add("play");
  await wait(REDUCED ? 600 : 2500);
  n.hidden = true;
  showInside();
  busy = false;
}

/* ---------- 手電筒：游標或手指就是光圈；沒動的時候自己慢慢晃 ---------- */
const torch = { x: innerWidth / 2, y: innerHeight * .55, tx: innerWidth / 2, ty: innerHeight * .55, last: 0, on: false };
function startTorch() {
  if (torch.on) return; torch.on = true; torch.last = -9999;
  requestAnimationFrame(torchLoop);
}
function torchLoop(t) {
  if (!torch.on) return;
  if (t - torch.last > 2200 && !REDUCED) { // 閒置：在畫面下半部慢慢掃過櫥窗
    const k = t / 1000;
    torch.tx = innerWidth * (.5 + Math.sin(k * .45) * .32);
    torch.ty = innerHeight * (.62 + Math.sin(k * .9) * .08);
  }
  const f = REDUCED ? 1 : .12;
  torch.x += (torch.tx - torch.x) * f; torch.y += (torch.ty - torch.y) * f;
  const d = $("dark"); d.style.setProperty("--x", torch.x.toFixed(1) + "px"); d.style.setProperty("--y", torch.y.toFixed(1) + "px");
  requestAnimationFrame(torchLoop);
}
addEventListener("pointermove", e => { torch.tx = e.clientX; torch.ty = e.clientY; torch.last = performance.now(); }, { passive: true });
addEventListener("pointerdown", e => { torch.tx = e.clientX; torch.ty = e.clientY; torch.last = performance.now(); }, { passive: true });

/* ---------- 展品說明牌（樓層開放後使用） ---------- */
let lastFocus = null;
function openPlacard(e, from) {
  lastFocus = from || document.activeElement;
  const f = FLOOR[e.floor] || {}, reno = e.status === "renovating";
  const pc = $("pl-case");
  pc.className = "pl-case" + (reno ? " renovating" : "");
  pc.innerHTML = caseHTML(e) + (reno ? '<span class="cloth"></span><span class="sign">整修中</span>' : "");
  $("pl-floor").innerHTML = `<b>${esc(f.label || "")}</b>${esc(f.name || "")}`;
  $("pl-title").textContent = e.title;
  $("pl-en").textContent = e.en;
  $("pl-meta").innerHTML = [["類型", e.kind || "—"], ["年代", e.version || "—"], ["樓層", f.label || "—"]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("pl-note").textContent = e.note;
  $("pl-tags").innerHTML = e.tags.map(t => `<li>${esc(t)}</li>`).join("");
  $("pl-links").innerHTML = reno || !e.links.length
    ? '<span class="btn is-off" aria-disabled="true">整修中，陸續開放</span>'
    : e.links.map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("");
  $("pl-disclaimer").hidden = e.floor !== "f2";
  $("placard").hidden = false;
  $("pl-close").focus();
}
function closePlacard() { $("placard").hidden = true; lastFocus?.focus?.({ preventScroll: true }); }

/* ---------- 館內：樓層導覽（佈展中） ---------- */
function showInside() {
  $("dir-floors").innerHTML = D.floors.map(f => {
    const n = D.exhibits.filter(e => e.floor === f.id).length, mine = zone && (zone.floor === f.id || !zone.floor);
    return `<li class="${mine && zone.floor ? "mine" : ""}"><span class="df-label">${esc(f.label)}</span><span class="df-name"><b>${esc(f.name)}</b><i>${esc(f.en)}</i><small>${esc(f.blurb)}</small></span><span class="df-count">${n} 件</span></li>`;
  }).join("");
  $("inside-scene").hidden = false;
}

/* ---------- 回到售票口 ---------- */
function resetToBooth() {
  ["night-scene", "ticket-scene", "inside-scene"].forEach(id => $(id).hidden = true);
  document.body.classList.remove("is-dark"); document.body.classList.add("is-lit");
  torch.on = false; setLamps(true);
  document.querySelectorAll(".lamp").forEach(l => l.classList.remove("flick"));
  $("booth").classList.remove("issuing");
  $("zones").querySelectorAll(".zone").forEach(b => b.classList.remove("on"));
  const bs = $("booth-scene"); bs.hidden = false; bs.classList.remove("leaving");
  zone = null; busy = false;
  waveZones();
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- 開始 ---------- */
$("site-foot").innerHTML = [`<span class="foot-name">微光博物館・引路人文創園區</span>`, ...D.footer.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)]
  .join('<span class="dot">·</span>');
buildLamps(); buildCases(); buildZones();
$("tk-go").addEventListener("click", enter);
$("tk-save").addEventListener("click", saveTicket);
$("tk-again").addEventListener("click", resetToBooth);
$("dir-back").addEventListener("click", resetToBooth);
$("skip").addEventListener("click", async () => { $("booth-scene").hidden = true; await lightsOut(true); showInside(); });
$("pl-close").addEventListener("click", closePlacard);
$("placard").addEventListener("click", e => { if (e.target === $("placard")) closePlacard(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !$("placard").hidden) closePlacard(); });
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { buildLamps(); buildCases(); }, 200); });
export { openPlacard }; // 第二步樓層會用到
