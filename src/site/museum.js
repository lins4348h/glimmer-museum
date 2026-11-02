// 微光博物館｜前台
// 打卡下班 → 熄燈、拿到手電筒 → 下班票根 → 夜班警衛推薦三件 → 展品說明牌
// 下班狀態只在瀏覽器裡用，不記錄、不送出。
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
const STATES = D.clockout.states;
const WEEK = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

let state = null, punchedAt = null, quote = "", ticketNo = "";

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
// 牆邊一排櫥窗：中間三座放「推薦的三件」，熄燈後用手電筒找得到
function buildCases(center = []) {
  const box = $("cases"), list = [...center];
  for (const e of D.exhibits) if (list.length < 7 && !list.includes(e.id) && e.onDisplay) list.push(e.id);
  const spots = narrow() ? [{ x: 17, i: 1 }, { x: 50, i: 0 }, { x: 83, i: 2 }]
    : [{ x: 7, i: 3 }, { x: 21, i: 4 }, { x: 36, i: 1 }, { x: 50, i: 0 }, { x: 64, i: 2 }, { x: 79, i: 5 }, { x: 93, i: 6 }];
  const cw = narrow() ? Math.min(innerWidth * .25, 130) : Math.min(innerWidth * .105, 168);
  box.innerHTML = spots.map(s => {
    const e = EX[list[s.i]]; if (!e) return "";
    return caseHTML(e, `style="left:${s.x}%;--cw:${cw}px"`).replace('class="case ', `class="case ${s.i < 3 ? "mid " : ""}`);
  }).join("");
}

/* ---------- 一、打卡鐘 ---------- */
function buildClock() {
  let t = "";
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r1 = big ? 52 : 55, r2 = 58;
    t += `<line x1="${100 + Math.sin(a) * r1}" y1="${98 - Math.cos(a) * r1}" x2="${100 + Math.sin(a) * r2}" y2="${98 - Math.cos(a) * r2}" stroke="rgba(35,27,16,${big ? .8 : .35})" stroke-width="${big ? 1.8 : .7}" stroke-linecap="round"/>`;
  }
  for (let h = 1; h <= 12; h++) {
    const a = h / 12 * Math.PI * 2;
    t += `<text class="tc-num" x="${100 + Math.sin(a) * 43}" y="${98 - Math.cos(a) * 43 + 4}" text-anchor="middle">${h}</text>`;
  }
  $("tc-ticks").innerHTML = t;
  tickClock(); setInterval(tickClock, 1000);
}
function tickClock() {
  const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60;
  $("tc-hour").setAttribute("transform", `rotate(${h * 30} 100 98)`);
  $("tc-min").setAttribute("transform", `rotate(${m * 6} 100 98)`);
  $("tc-sec").setAttribute("transform", `rotate(${s * 6} 100 98)`);
}
function dateStr(d) { return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${WEEK[d.getDay()]}`; }
function timeStr(d) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }

function buildCard() {
  $("card-date").textContent = dateStr(new Date());
  $("card-rows").innerHTML = STATES.map((s, i) => `
    <button class="row" type="button" data-id="${esc(s.id)}">
      <span class="row-no">0${i + 1}</span>
      <span class="row-txt"><b>${esc(s.name)}</b><i>${esc(s.en)}</i></span>
      <span class="row-box" aria-hidden="true"><span class="ink"></span></span>
    </button>`).join("");
  $("card-rows").querySelectorAll(".row").forEach(b => b.addEventListener("click", () => punch(b)));
}

// 打卡的「喀」：一小段雜訊＋低音，音量很小
function thunkSound() {
  try {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    const ac = new A(), t = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t + .12);
    g.gain.setValueAtTime(.18, t); g.gain.exponentialRampToValueAtTime(.001, t + .16);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .18);
    const buf = ac.createBuffer(1, ac.sampleRate * .05, ac.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length) ** 3;
    const n = ac.createBufferSource(), ng = ac.createGain(); ng.gain.value = .22;
    n.buffer = buf; n.connect(ng).connect(ac.destination); n.start(t);
    setTimeout(() => ac.close(), 400);
  } catch (e) {}
}

let busy = false;
async function punch(row) {
  if (busy) return; busy = true;
  state = STATES.find(s => s.id === row.dataset.id);
  punchedAt = new Date();
  quote = state.lines[Math.floor(Math.random() * state.lines.length)];
  ticketNo = String(Math.floor(1000000 + Math.random() * 8999999));
  const card = $("card");
  card.classList.add("chosen"); row.classList.add("picked");
  if (!REDUCED) {
    // 卡片飛進打卡鐘的插卡口，喀一聲，再退出來
    const c = card.getBoundingClientRect(), s = $("tc-slot").getBoundingClientRect();
    const dx = (s.left + s.width / 2) - (c.left + c.width / 2), dy = (s.top + s.height / 2) - (c.top + c.height * .18);
    card.classList.add("flying");
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg) scale(.42)`;
    await wait(560);
  }
  thunkSound(); navigator.vibrate?.(18);
  $("timeclock").classList.add("thunk"); $("tc-lamp").classList.add("on");
  const box = row.querySelector(".row-box"); box.querySelector(".ink").textContent = timeStr(punchedAt);
  await wait(320);
  card.style.transform = "";
  await wait(REDUCED ? 0 : 560);
  box.classList.add("stamped");
  await wait(REDUCED ? 200 : 900);
  lightsOut();
}

/* ---------- 二、熄燈 ---------- */
async function lightsOut(fast = false) {
  buildCases(state ? state.picks : []);
  $("clock-scene").classList.add("leaving");
  const lamps = [...document.querySelectorAll(".lamp")], shines = [...document.querySelectorAll(".floor-shine span")];
  if (fast || REDUCED) setLamps(false);
  else for (let i = 0; i < lamps.length; i++) {
    lamps[i].classList.add("flick");
    await wait(140);
    lamps[i].classList.add("off"); shines[i]?.classList.add("off");
    await wait(170);
  }
  document.body.classList.add("is-dark"); document.body.classList.remove("is-lit");
  startTorch();
  await wait(fast ? 0 : 500);
  $("clock-scene").hidden = true;
  busy = false;
  if (fast) return;
  const n = $("night-scene"); n.hidden = false; n.classList.remove("play"); void n.offsetWidth; n.classList.add("play");
  setTimeout(() => $("to-ticket").focus({ preventScroll: true }), REDUCED ? 0 : 3400);
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

/* ---------- 三、票根 ---------- */
function barcode(seed) {
  let x = 0, out = ""; const s = String(seed);
  for (let i = 0; i < 46; i++) {
    const w = 1 + ((s.charCodeAt(i % s.length) * (i + 3)) % 3);
    if (i % 2 === 0) out += `<rect x="${x}" y="0" width="${w}" height="26" fill="#2b2216"/>`;
    x += w + 1;
  }
  return `<svg viewBox="0 0 ${x} 26" preserveAspectRatio="none" width="100%" height="26">${out}</svg>`;
}
function fillTicket() {
  $("tk-stamp").textContent = timeStr(punchedAt);
  $("tk-date").textContent = dateStr(punchedAt);
  $("tk-state").textContent = state.name;
  $("tk-state-en").textContent = state.en;
  $("tk-quote").textContent = `「${quote}」`;
  $("tk-no").textContent = `No. ${ticketNo}`;
  $("tk-bars").innerHTML = barcode(ticketNo);
}
function showTicket() {
  $("night-scene").hidden = true; $("inside-scene").hidden = true;
  document.body.classList.add("is-ticket");
  fillTicket();
  $("picks").hidden = true; $("picks-btn").setAttribute("aria-expanded", "false");
  const t = $("ticket-scene"); t.hidden = false; t.scrollTop = 0;
  $("picks-btn").focus({ preventScroll: true });
}
function togglePicks() {
  const p = $("picks"), open = p.hidden;
  p.hidden = !open; $("picks-btn").setAttribute("aria-expanded", String(open));
  if (!open) return;
  $("picks-sub").textContent = `今天${state.name}，先看看這三件。`;
  $("picks-row").innerHTML = state.picks.map(id => {
    const e = EX[id];
    return `<button class="pick" type="button" data-id="${esc(id)}">${caseHTML(e)}<span class="pick-name">${esc(e.title)}</span><span class="pick-kind">${esc(FLOOR[e.floor]?.label)}・${esc(e.kind)}</span></button>`;
  }).join("");
  $("picks-row").querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => openPlacard(EX[b.dataset.id], b)));
  if (narrow()) setTimeout(() => p.scrollIntoView({ behavior: REDUCED ? "auto" : "smooth", block: "start" }), 60);
}

// 存成直式圖片（1080×1920），手機可以直接分享到相簿或限動
function wrapZh(x, text, maxW) {
  const lines = []; let line = "";
  for (const ch of [...text]) {
    if (line && x.measureText(line + ch).width > maxW && !/[，。、！？」』）：；…]/.test(ch)) { lines.push(line); line = ch; }
    else line += ch;
  }
  if (line) lines.push(line);
  return lines;
}
async function ticketImage() {
  const W = 1080, H = 1920;
  const SERIF = '"Noto Serif TC", "Songti TC", serif', LATIN = '"Cormorant Garamond", "Times New Roman", serif', MONO = '"DM Mono", ui-monospace, monospace';
  if (document.fonts) await Promise.all([
    document.fonts.load(`900 84px ${SERIF}`, "微光博物館"), document.fonts.load(`500 44px ${SERIF}`, quote + state.name + "夜間入館券下班打卡今天的狀態夜班警衛引路人文創園區"),
    document.fonts.load(`700 56px ${SERIF}`, state.name), document.fonts.load(`italic 500 36px ${LATIN}`, state.en + "Night Admission Clock-out Tonight Night Guard"),
    document.fonts.load(`600 30px ${LATIN}`, "MUSEUM OF GLIMMERS ADMIT ONE"), document.fonts.load(`500 150px ${MONO}`, "0123456789:.No")
  ]).catch(() => {});
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const ls = v => { if ("letterSpacing" in x) x.letterSpacing = v; };
  // 夜間展廳＋一圈手電筒的光
  x.fillStyle = "#060b16"; x.fillRect(0, 0, W, H);
  let g = x.createRadialGradient(W / 2, H * .46, 60, W / 2, H * .46, 900);
  g.addColorStop(0, "rgba(255,214,140,.28)"); g.addColorStop(.5, "rgba(255,214,140,.07)"); g.addColorStop(1, "rgba(255,214,140,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // 票
  const tx = 150, ty = 200, tw = 780, th = 1400, stubY = ty + 1140, r = 30;
  x.save(); x.translate(W / 2, H / 2); x.rotate(-1 * Math.PI / 180); x.translate(-W / 2, -H / 2);
  x.shadowColor = "rgba(0,0,0,.6)"; x.shadowBlur = 80; x.shadowOffsetY = 40;
  x.beginPath();
  x.moveTo(tx + 14, ty); x.lineTo(tx + tw - 14, ty); x.quadraticCurveTo(tx + tw, ty, tx + tw, ty + 14);
  x.lineTo(tx + tw, stubY - r); x.arc(tx + tw, stubY, r, -Math.PI / 2, Math.PI / 2, true);
  x.lineTo(tx + tw, ty + th - 14); x.quadraticCurveTo(tx + tw, ty + th, tx + tw - 14, ty + th);
  x.lineTo(tx + 14, ty + th); x.quadraticCurveTo(tx, ty + th, tx, ty + th - 14);
  x.lineTo(tx, stubY + r); x.arc(tx, stubY, r, Math.PI / 2, -Math.PI / 2, true);
  x.lineTo(tx, ty + 14); x.quadraticCurveTo(tx, ty, tx + 14, ty); x.closePath();
  g = x.createLinearGradient(tx, ty, tx + tw, ty + th); g.addColorStop(0, "#f8f1e1"); g.addColorStop(.6, "#efe4cb"); g.addColorStop(1, "#e4d3ae");
  x.fillStyle = g; x.fill(); x.shadowColor = "transparent";
  x.strokeStyle = "rgba(181,134,47,.5)"; x.lineWidth = 2; x.strokeRect(tx + 24, ty + 24, tw - 48, stubY - ty - 54);
  x.setLineDash([3, 12]); x.lineCap = "round"; x.strokeStyle = "rgba(125,107,80,.7)"; x.lineWidth = 5;
  x.beginPath(); x.moveTo(tx + 50, stubY); x.lineTo(tx + tw - 50, stubY); x.stroke(); x.setLineDash([]);
  const cx = W / 2; x.textAlign = "center"; x.textBaseline = "alphabetic";
  x.fillStyle = "#b5862f"; x.font = `600 30px ${LATIN}`; ls("12px"); x.fillText("MUSEUM OF GLIMMERS", cx, ty + 110);
  x.fillStyle = "#2b2216"; x.font = `900 84px ${SERIF}`; ls("28px"); x.fillText("微光博物館", cx + 14, ty + 215);
  // 「夜間入館券 Night Admission」量好寬度一起置中
  x.font = `500 32px ${SERIF}`; ls("10px"); const wZh = x.measureText("夜間入館券").width;
  x.font = `italic 500 34px ${LATIN}`; ls("2px"); const wEn = x.measureText("Night Admission").width;
  const sx = cx - (wZh + 22 + wEn) / 2; x.textAlign = "left"; x.fillStyle = "#7d6b50";
  x.font = `500 32px ${SERIF}`; ls("10px"); x.fillText("夜間入館券", sx, ty + 275);
  x.font = `italic 500 34px ${LATIN}`; ls("2px"); x.fillText("Night Admission", sx + wZh + 22, ty + 275); x.textAlign = "center";
  x.fillStyle = "rgba(181,134,47,.7)"; x.fillRect(tx + 60, ty + 318, tw - 120, 2); x.fillRect(tx + 60, ty + 330, tw - 120, 2);
  x.textAlign = "left"; const lx = tx + 70;
  x.fillStyle = "#7d6b50"; x.font = `500 28px ${SERIF}`; ls("8px"); x.fillText("下班打卡", lx, ty + 410);
  x.font = `italic 500 30px ${LATIN}`; ls("1px"); x.fillText("Clock-out", lx + 150, ty + 410);
  x.save(); x.translate(lx, ty + 540); x.rotate(-3 * Math.PI / 180);
  x.fillStyle = "rgba(176,80,60,.92)"; x.font = `500 132px ${MONO}`; ls("2px"); x.fillText(timeStr(punchedAt), 0, 0); x.restore();
  x.textAlign = "right"; x.fillStyle = "#7d6b50"; x.font = `400 30px ${MONO}`; ls("2px"); x.fillText(dateStr(punchedAt), tx + tw - 70, ty + 596);
  x.textAlign = "left"; x.fillStyle = "#7d6b50"; x.font = `500 28px ${SERIF}`; ls("8px"); x.fillText("今天的狀態", lx, ty + 660);
  x.font = `italic 500 30px ${LATIN}`; ls("1px"); x.fillText("Tonight", lx + 180, ty + 660);
  x.fillStyle = "#2b2216"; x.font = `700 56px ${SERIF}`; ls("8px"); x.fillText(state.name, lx, ty + 740);
  x.fillStyle = "#7d6b50"; x.font = `italic 500 36px ${LATIN}`; ls("0px"); x.fillText(state.en, lx, ty + 792);
  x.setLineDash([8, 8]); x.strokeStyle = "rgba(125,107,80,.55)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(lx, ty + 840); x.lineTo(tx + tw - 70, ty + 840); x.stroke(); x.setLineDash([]);
  x.fillStyle = "#2b2216"; x.font = `500 44px ${SERIF}`; ls("4px");
  let y = ty + 920; for (const l of wrapZh(x, `「${quote}」`, tw - 150)) { x.fillText(l, lx, y); y += 74; }
  x.textAlign = "right"; x.fillStyle = "#7d6b50"; x.font = `500 28px ${SERIF}`; ls("6px"); x.fillText("— 夜班警衛", tx + tw - 70, Math.max(y + 10, ty + 1060));
  x.textAlign = "left"; x.fillStyle = "#b5862f"; x.font = `600 34px ${LATIN}`; ls("10px"); x.fillText("ADMIT ONE", lx, stubY + 90);
  x.textAlign = "right"; x.fillStyle = "#2b2216"; x.font = `400 30px ${MONO}`; ls("3px"); x.fillText(`No. ${ticketNo}`, tx + tw - 70, stubY + 90);
  // 條碼：跟網頁上同一組粗細，拉滿票根寬度
  const s = ticketNo, bars = []; let total = 0;
  for (let i = 0; i < 46; i++) { const w = 1 + ((s.charCodeAt(i % s.length) * (i + 3)) % 3); bars.push(w); total += w + 1; }
  const k = (tw - 140) / total; let bx = lx; x.fillStyle = "rgba(43,34,22,.8)";
  bars.forEach((w, i) => { if (i % 2 === 0) x.fillRect(bx, stubY + 130, w * k, 90); bx += (w + 1) * k; });
  x.restore();
  x.textAlign = "center"; x.fillStyle = "rgba(232,200,137,.85)"; x.font = `600 28px ${LATIN}`; ls("8px"); x.fillText("MUSEUM OF GLIMMERS", cx, 1730);
  x.fillStyle = "rgba(236,229,212,.6)"; x.font = `500 26px ${SERIF}`; ls("8px"); x.fillText("引路人文創園區", cx, 1780);
  return new Promise(res => c.toBlob(res, "image/png"));
}
async function saveTicket() {
  const btn = $("tk-save"), old = btn.textContent; btn.textContent = "製作中……"; btn.disabled = true;
  try {
    const blob = await ticketImage(), name = `微光博物館-票根-${punchedAt.getFullYear()}${pad2(punchedAt.getMonth() + 1)}${pad2(punchedAt.getDate())}.png`;
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) await navigator.share({ files: [file] }).catch(() => {});
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("票根已存下"); }
  } catch (e) { toast("存圖失敗，請再試一次"); }
  btn.textContent = old; btn.disabled = false;
}

/* ---------- 展品說明牌 ---------- */
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
  $("ticket-scene").hidden = true; $("night-scene").hidden = true;
  document.body.classList.add("is-ticket");
  $("dir-floors").innerHTML = D.floors.map(f => {
    const n = D.exhibits.filter(e => e.floor === f.id).length;
    return `<li><span class="df-label">${esc(f.label)}</span><span class="df-name"><b>${esc(f.name)}</b><i>${esc(f.en)}</i><small>${esc(f.blurb)}</small></span><span class="df-count">${n} 件</span></li>`;
  }).join("");
  $("dir-back").textContent = state ? "← 回到票根" : "← 回到入口打卡";
  $("inside-scene").hidden = false;
}

/* ---------- 重新打卡 ---------- */
function resetToClock() {
  ["night-scene", "ticket-scene", "inside-scene"].forEach(id => $(id).hidden = true);
  document.body.classList.remove("is-dark", "is-ticket"); document.body.classList.add("is-lit");
  torch.on = false; setLamps(true);
  document.querySelectorAll(".lamp").forEach(l => l.classList.remove("flick"));
  const card = $("card"); card.classList.remove("chosen", "flying"); card.style.transform = "";
  $("timeclock").classList.remove("thunk"); $("tc-lamp").classList.remove("on");
  buildCard(); buildCases([]);
  const cs = $("clock-scene"); cs.hidden = false; cs.classList.remove("leaving");
  state = null; busy = false;
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200);
}

/* ---------- 開始 ---------- */
$("site-foot").innerHTML = [`<span class="foot-name">微光博物館・引路人文創園區</span>`, ...D.footer.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)]
  .join('<span class="dot">·</span>');
buildLamps(); buildCases([]); buildClock(); buildCard();
$("to-ticket").addEventListener("click", showTicket);
$("picks-btn").addEventListener("click", togglePicks);
$("tk-save").addEventListener("click", saveTicket);
$("tk-again").addEventListener("click", resetToClock);
$("tk-enter").addEventListener("click", showInside);
$("dir-back").addEventListener("click", () => state ? showTicket() : resetToClock());
$("skip").addEventListener("click", async () => { await lightsOut(true); showInside(); });
$("pl-close").addEventListener("click", closePlacard);
$("placard").addEventListener("click", e => { if (e.target === $("placard")) closePlacard(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !$("placard").hidden) closePlacard(); });
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { buildLamps(); buildCases(state ? state.picks : []); }, 200); });
