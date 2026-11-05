// 微光博物館｜前台
// 點售票窗 → 抽到今晚的一張票根（100 句隨機，可以一直抽、可存成圖）→ 進館：俯視像素地圖
// 館內三種看法：夜遊（暗，手電筒，展品活過來）、點燈（亮，展品乖乖站好）、全覽（館藏目錄）。
// 抽到哪一句只在瀏覽器裡用，不記錄、不送出。
import { objectSVG } from "./objects.js";
import { createMap } from "./map.js";

const D = window.MUSEUM;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = n => String(n).padStart(2, "0");
const wait = ms => new Promise(r => setTimeout(r, ms));
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = () => innerWidth <= 760;

const FLOOR = Object.fromEntries(D.floors.map(f => [f.id, f]));
const LINES = D.admission.lines;

let line = null, issuedAt = null, lastIdx = -1;

/* ---------- 拱窗：深窗框、扇形窗格、窗台；moon＝看得到月亮 ---------- */
function windowSVG(id, moon) {
  const spokes = [30, 60, 90, 120, 150].map(a => {
    const r = a * Math.PI / 180;
    return `M${(50 + 20 * Math.cos(r)).toFixed(2)} ${(50 - 20 * Math.sin(r)).toFixed(2)} L${(50 + 38 * Math.cos(r)).toFixed(2)} ${(50 - 38 * Math.sin(r)).toFixed(2)}`;
  }).join(" ");
  return `<svg viewBox="0 0 100 252" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="wg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6684b6" stop-opacity=".5"/><stop offset=".55" stop-color="#2d4878" stop-opacity=".42"/><stop offset="1" stop-color="#1a2c50" stop-opacity=".5"/></linearGradient>
    <linearGradient id="wr${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#060b16"/><stop offset=".5" stop-color="#0f1b33"/><stop offset="1" stop-color="#060b16"/></linearGradient>
    <radialGradient id="wm${id}"><stop offset="0" stop-color="#f4f7fc" stop-opacity=".85"/><stop offset=".22" stop-color="#cfdcf0" stop-opacity=".3"/><stop offset="1" stop-color="#9fb6da" stop-opacity="0"/></radialGradient>
    <linearGradient id="ws${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".13"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="wc${id}"><path d="M12 244 V50 A38 38 0 0 1 88 50 V244 Z"/></clipPath></defs>
    <path d="M0 252 V50 A50 50 0 0 1 100 50 V252 Z" fill="#0a1222"/>
    <path d="M2.6 252 V50 A47.4 47.4 0 0 1 97.4 50 V252" fill="none" stroke="rgba(212,166,74,.3)" stroke-width=".7"/>
    <path d="M7 248 V50 A43 43 0 0 1 93 50 V248 Z" fill="url(#wr${id})"/>
    <g clip-path="url(#wc${id})">
      <rect width="100" height="252" fill="url(#wg${id})"/>
      ${moon ? `<circle cx="63" cy="76" r="34" fill="url(#wm${id})"/><circle cx="63" cy="76" r="7.2" fill="#eef2f8"/>` : ""}
      <path d="M12 0 L64 0 L12 150 Z" fill="url(#ws${id})"/>
      <path d="M37.3 50 V244 M62.7 50 V244 M12 50 H88 M12 98 H88 M12 146 H88 M12 194 H88 M30 50 A20 20 0 0 1 70 50 ${spokes}" fill="none" stroke="#0a1222" stroke-width="2.2"/>
    </g>
    <path d="M12 244 V50 A38 38 0 0 1 88 50 V244" fill="none" stroke="rgba(207,217,232,.18)" stroke-width=".6"/>
    <path d="M46 .5 L54 .5 L52.4 9 L47.6 9 Z" fill="#c99a45" opacity=".6"/>
    <rect x="-5" y="244" width="110" height="8" rx="1" fill="#16233f"/><rect x="-5" y="244" width="110" height=".8" fill="rgba(232,200,137,.42)"/>
  </svg>`;
}

/* ---------- 大廳：兩側拱窗、吊燈 ---------- */
function buildHall() {
  $("hall-windows").innerHTML = `<div class="hwin l">${windowSVG("l", false)}<span class="shaft"></span></div><div class="hwin r">${windowSVG("r", true)}<span class="shaft"></span></div>`;
  buildLamps();
}
// 吊燈只掛在兩側，不擋館名：位置照館名的寬來算
function buildLamps() {
  const W = innerWidth, sign = Math.max(document.querySelector(".title")?.offsetWidth || 300, 300);
  const lamps = narrow() ? [{ x: W * .1, d: 11 }, { x: W * .9, d: 15 }]
    : [{ o: 70, d: 37 }, ...(W >= 1200 ? [{ o: 150, d: 23 }] : [])].flatMap(l => [{ x: W / 2 - sign / 2 - l.o, d: l.d }, { x: W / 2 + sign / 2 + l.o, d: l.d }]);
  $("lamps").innerHTML = lamps.map(l => `<div class="lamp" style="left:${l.x.toFixed(0)}px;--drop:${l.d}%"><span class="lamp-glow"></span><span class="lamp-cap"></span><span class="lamp-globe"></span></div>`).join("");
  if (document.body.classList.contains("is-dark")) setLamps(false);
}
function setLamps(on) { document.querySelectorAll(".lamp").forEach(l => l.classList.toggle("off", !on)); }

/* ---------- 櫥窗（說明牌、全覽共用） ---------- */
function caseHTML(e) {
  return `<div class="case glow-${esc(e.glow)}"><div class="case-glass"><span class="case-light"></span>${objectSVG(e.object)}</div><div class="case-base"></div></div>`;
}

/* ---------- 一、夜間售票口：點窗口就出票 ---------- */
// 抽一句：跟上一句不一樣
function drawLine() {
  let i = Math.floor(Math.random() * LINES.length);
  if (LINES.length > 1 && i === lastIdx) i = (i + 1 + Math.floor(Math.random() * (LINES.length - 1))) % LINES.length;
  lastIdx = i; line = LINES[i]; issuedAt = new Date();
}

let busy = false;
async function issue() {
  if (busy) return; busy = true;
  drawLine();
  // 手機上售票窗可能在下面：先滑到看得到出票口，再出票
  const sc = $("booth-scene"), ledge = document.querySelector(".booth-ledge").getBoundingClientRect();
  if (ledge.bottom > innerHeight - 24) {
    sc.scrollTo({ top: sc.scrollTop + ledge.bottom - innerHeight + 90, behavior: REDUCED ? "auto" : "smooth" });
    await wait(REDUCED ? 0 : 520);
  }
  // 售票窗亮一下，票從出票口遞出來
  $("booth").classList.add("issuing");
  await wait(REDUCED ? 0 : 380);
  showTicket(true);
  document.body.classList.remove("at-booth");
  // 票滑出窗口後，售票口才慢慢退到暗處
  await wait(REDUCED ? 0 : 900);
  sc.classList.add("leaving");
  await wait(REDUCED ? 0 : 700);
  sc.hidden = true;
  busy = false;
}
// 再抽一張：舊票往下收走，新票從上面放下來
async function again() {
  if (busy) return; busy = true;
  const tk = $("ticket");
  if (!REDUCED) { tk.getAnimations().forEach(a => a.cancel()); await tk.animate([{ transform: "rotate(-1.2deg)", opacity: 1 }, { transform: "translateY(40px) rotate(3deg)", opacity: 0 }], { duration: 320, easing: "ease-in", fill: "forwards" }).finished; }
  drawLine(); showTicket(false);
  busy = false;
}

/* ---------- 二、今晚的票 ---------- */
// 警衛的話在逗號後換行，讀起來比較順；句子短就不換
function quoteLines(t) {
  if ([...t].length <= 12) return [t];
  const i = t.search(/[，；。？]/);
  return i > 0 && i < t.length - 2 ? [t.slice(0, i + 1), t.slice(i + 1)] : [t];
}
function dateStr(d) { return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`; }
function fillTicket() {
  // 感性的句子是月白銀箔、幽默的是暖金燙金
  const tk = $("ticket");
  tk.classList.toggle("tone-wry", line.tone === "wry"); tk.classList.toggle("tone-tender", line.tone !== "wry");
  $("tk-kicker").textContent = line.tone === "wry" ? "今晚的一句・館方碎念" : "今晚的一句";
  $("tk-quote").innerHTML = quoteLines(line.zh).map(esc).join("<br>");
  $("tk-quote-en").textContent = line.en || "";
  $("tk-quote-en").hidden = !line.en;
  $("tk-date").textContent = dateStr(issuedAt);
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
  const W = 1080, H = 1920, wry = line.tone === "wry";
  const SERIF = '"Noto Serif TC", "Songti TC", serif', LATIN = '"Cormorant Garamond", "Times New Roman", serif', SANS = '"Noto Sans TC", sans-serif';
  if (document.fonts) await Promise.all([
    document.fonts.load(`700 46px ${SERIF}`, "微光博物館"), document.fonts.load(`500 54px ${SERIF}`, line.zh + "夜間入館券敬贈"), document.fonts.load(`700 46px ${SERIF}`, "0123456789."),
    document.fonts.load(`600 30px ${LATIN}`, "MUSEUM OF GLIMMERS"), document.fonts.load(`italic 500 40px ${LATIN}`, (line.en || "") + "Night Admission"),
    document.fonts.load(`400 26px ${SANS}`, "今晚的一句・館方碎念")
  ]).catch(() => {});
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const ls = v => { if ("letterSpacing" in x) x.letterSpacing = v; };
  // 燙金或月白銀箔，看句子的調性
  const gold = (x0, x1) => { const g = x.createLinearGradient(x0, 0, x1, 0);
    (wry ? [[0, "#9c742c"], [.2, "#f3dc9c"], [.38, "#c9993f"], [.55, "#f8e7b2"], [.74, "#a87c30"], [1, "#e9c97f"]]
      : [[0, "#7f8da6"], [.2, "#eef3fa"], [.38, "#a9b6cc"], [.55, "#f6f9fd"], [.74, "#8996ad"], [1, "#d7e0ec"]]).forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const AC = wry ? "232,200,137" : "207,217,232";
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
  x.strokeStyle = `rgba(${AC},.07)`; x.lineWidth = 1.4;
  for (let gx = tx; gx < tx + tw + 470; gx += 470) for (let gy = ty; gy < ty + th + 470; gy += 470) {
    for (let k = 1; k <= 6; k++) { x.beginPath(); x.arc(gx + 235, gy + 235, 47 * k, 0, Math.PI * 2); x.stroke(); }
    x.beginPath(); x.arc(gx, gy, 113, 0, Math.PI * 2); x.stroke();
  }
  x.restore();
  // 燙金細框＋上方兩個菱形
  const fi = 28; x.strokeStyle = `rgba(${AC},.45)`; x.lineWidth = 2;
  x.beginPath(); x.moveTo(tx + fi, stubY - 26); x.lineTo(tx + fi, ty + fi); x.lineTo(tx + tw - fi, ty + fi); x.lineTo(tx + tw - fi, stubY - 26); x.stroke();
  for (const dx of [tx + fi, tx + tw - fi]) { x.save(); x.translate(dx, ty + fi); x.rotate(Math.PI / 4); x.fillStyle = "#0e1932"; x.fillRect(-10, -10, 20, 20); x.strokeStyle = `rgba(${AC},.75)`; x.strokeRect(-10, -10, 20, 20); x.restore(); }
  // 撕線
  x.fillStyle = `rgba(${AC},.55)`;
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
  const rule = y0 => { const g2 = x.createLinearGradient(cx - 110, 0, cx + 110, 0); g2.addColorStop(0, `rgba(${AC},0)`); g2.addColorStop(.5, `rgba(${AC},.9)`); g2.addColorStop(1, `rgba(${AC},0)`);
    x.fillStyle = g2; x.fillRect(cx - 110, y0, 220, 2); x.save(); x.translate(cx, y0 + 1); x.rotate(Math.PI / 4); x.fillStyle = `rgb(${AC})`; x.fillRect(-7, -7, 14, 14); x.restore(); };
  rule(ty + 372);
  x.fillStyle = `rgba(${AC},.8)`; x.font = `400 26px ${SANS}`; ls("12px"); x.fillText(wry ? "今晚的一句・館方碎念" : "今晚的一句", cx + 6, ty + 460);
  // 那句話：中文照標點換行（太長再折），英文照單字折；整段放在兩條線中間
  x.font = `500 54px ${SERIF}`; ls("6px");
  const zl = quoteLines(line.zh).flatMap(l => wrap(x, l, tw - 150));
  x.font = `italic 500 40px ${LATIN}`; ls("0px");
  const el = line.en ? wrap(x, line.en, tw - 170, true) : [];
  const top = ty + 500, bottom = stubY - 210, blockH = zl.length * 96 + (el.length ? 30 + el.length * 54 : 0);
  let y = top + Math.max(0, (bottom - top - blockH) / 2) + 60;
  x.fillStyle = "#f3ecdb"; x.font = `500 54px ${SERIF}`; ls("6px");
  for (const l of zl) { x.fillText(l, cx + 3, y); y += 96; }
  if (el.length) { y += 10; x.fillStyle = "rgba(239,230,210,.6)"; x.font = `italic 500 40px ${LATIN}`; ls("0px");
    for (const l of el) { x.fillText(l, cx, y); y += 54; } }
  rule(stubY - 170);
  x.fillStyle = `rgba(${AC},.72)`; x.font = `400 26px ${SANS}`; ls("12px"); x.fillText("微光博物館　敬贈", cx + 6, stubY - 100);
  // 存根
  x.textAlign = "left"; x.fillStyle = "rgba(239,230,210,.8)"; x.font = `500 32px ${SERIF}`; ls("12px"); x.fillText("夜間入館券", tx + 70, stubY + 88);
  x.fillStyle = "rgba(239,230,210,.55)"; x.font = `italic 500 34px ${LATIN}`; ls("2px"); x.fillText("Night Admission", tx + 70, stubY + 134);
  // 日期用襯線中文字型的數字（等高），英文字型的數字高低不一
  x.textAlign = "right"; x.fillStyle = gold(tx + tw - 330, tx + tw - 70); x.font = `700 46px ${SERIF}`; ls("4px"); x.fillText(dateStr(issuedAt), tx + tw - 66, stubY + 116);
  x.restore();
  x.textAlign = "center"; x.fillStyle = `rgba(${AC},.8)`; x.font = `600 28px ${LATIN}`; ls("10px"); x.fillText("MUSEUM OF GLIMMERS", cx, 1760);
  x.fillStyle = "rgba(236,229,212,.55)"; x.font = `500 26px ${SERIF}`; ls("10px"); x.fillText("引路人文創園區", cx, 1806);
  return new Promise(res => c.toBlob(res, "image/png"));
}
async function saveTicket() {
  const btn = $("tk-save"), old = btn.textContent; btn.textContent = "製作中……"; btn.disabled = true;
  try {
    const blob = await ticketImage(), name = `微光博物館-今晚的票根-${dateStr(issuedAt).replaceAll(".", "")}.png`;
    const file = new File([blob], name, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] }) && matchMedia("(pointer: coarse)").matches) await navigator.share({ files: [file] }).catch(() => {});
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast("票根已存下"); }
  } catch (e) { toast("存圖失敗，請再試一次"); }
  btn.textContent = old; btn.disabled = false;
}


/* ---------- 二之一、進館：票收起來，直接進地圖 ---------- */
async function enter() {
  if (busy) return; busy = true;
  const t = $("ticket-scene");
  if (!REDUCED) { t.classList.add("leaving"); await wait(420); }
  t.hidden = true; t.classList.remove("leaving");
  setLamps(false);
  openInside("night");
  busy = false;
}

/* ---------- 三、館內：夜遊／點燈／全覽 ---------- */
let mode = null;
const map = createMap($("map"), {
  floors: D.floors, exhibits: D.exhibits.filter(e => e.onDisplay), reduced: REDUCED,
  guardLine: () => {
    const pool = D.guard?.length ? D.guard : [{ zh: "慢慢逛，天亮前都還有時間。", en: "Take your time. We're open till dawn." }];
    return pool[Math.floor(Math.random() * pool.length)];
  },
  openPlacard: (e, from) => openPlacard(e, from),
  blocked: () => !$("placard").hidden || mode === "catalog",
  exit: () => resetToBooth()
});

function openInside(m) {
  document.body.classList.remove("at-booth");
  document.body.classList.add("in-inside");
  $("inside-scene").hidden = false;
  mode = null;
  setMode(m, true);
}
async function setMode(m, first = false) {
  if (m === mode) return;
  const veil = $("in-veil"), was = mode;
  if (!first && !REDUCED) { veil.classList.add("on"); await wait(300); }
  mode = m;
  const sw = $("mode-switch"); sw.dataset.mode = m;
  sw.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
  document.body.classList.toggle("is-dark", m === "night"); document.body.classList.toggle("is-lit", m !== "night");
  if (m === "catalog") {
    map.pause(); $("map").hidden = true;
    renderCatalog(); $("catalog").hidden = false; $("catalog").scrollTop = 0;
  } else {
    $("catalog").hidden = true; $("map").hidden = false;
    if (first || !was) map.start(m === "night");
    else if (was === "catalog") { map.setNight(m === "night"); map.resume(); }
    else map.setNight(m === "night");
  }
  veil.classList.remove("on");
}

/* 全覽：燈全亮的館藏目錄，依樓層分組，可以篩類型 */
let kindFilter = "";
function renderCatalog() {
  const kinds = [...new Set(D.exhibits.filter(e => e.onDisplay).map(e => e.kind).filter(Boolean))];
  const total = D.exhibits.filter(e => e.onDisplay).length;
  const floors = D.floors.map(f => {
    const items = D.exhibits.filter(e => e.floor === f.id && e.onDisplay);
    if (!items.length) return "";
    return `<section class="cat-floor" data-floor="${esc(f.id)}">
      <header class="cf-head"><span class="cf-label">${esc(f.numeral || f.label)}</span>
        <div class="cf-name"><h3>${esc(f.name)}</h3><i>${esc(f.label)}・${esc(f.en)}</i></div>
        <p class="cf-blurb">${esc(f.blurb || "")}</p></header>
      <div class="cat-grid">${items.map(e => `<button class="cat-item${e.status === "renovating" ? " renovating" : ""}" type="button" data-id="${esc(e.id)}" data-kind="${esc(e.kind)}">
        <span class="ci-case">${caseHTML(e)}${e.status === "renovating" ? '<span class="cloth"></span><span class="sign">整修中</span>' : ""}</span>
        <span class="ci-plate"><b>${esc(e.title)}</b><small>${esc(e.kind)}${e.version ? `・${esc(e.version)}` : ""}</small></span></button>`).join("")}</div>
    </section>`;
  }).join("");
  $("catalog").innerHTML = `<div class="cat-inner">
    <header class="cat-head"><p class="kicker">The Collection</p><h2 class="cat-title">館藏目錄</h2>
      <p class="cat-sub">燈全亮了。${D.floors.length} 個展區、${total} 件展品，挑一件來看。</p>
      <div class="cat-filter" role="group" aria-label="依類型篩選">${["", ...kinds].map(k => `<button type="button" data-kind="${esc(k)}" aria-pressed="${k === kindFilter}">${esc(k || "全部")}</button>`).join("")}</div></header>
    ${floors}
    <footer class="cat-foot">${footHTML()}</footer></div>`;
  applyFilter();
}
function applyFilter() {
  const c = $("catalog");
  c.querySelectorAll(".cat-filter button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.kind === kindFilter)));
  c.querySelectorAll(".cat-item").forEach(b => b.hidden = !!kindFilter && b.dataset.kind !== kindFilter);
  c.querySelectorAll(".cat-floor").forEach(s => s.hidden = ![...s.querySelectorAll(".cat-item")].some(b => !b.hidden));
}
$("catalog").addEventListener("click", ev => {
  const k = ev.target.closest(".cat-filter button");
  if (k) { kindFilter = k.dataset.kind; applyFilter(); return; }
  const it = ev.target.closest(".cat-item");
  if (it) { const e = D.exhibits.find(x => x.id === it.dataset.id); if (e) openPlacard(e, it); }
});

/* ---------- 展品說明牌 ---------- */
let lastFocus = null;
function openPlacard(e, from) {
  lastFocus = from || document.activeElement;
  const f = FLOOR[e.floor] || {}, reno = e.status === "renovating";
  const pc = $("pl-case");
  pc.className = "pl-case" + (reno ? " renovating" : "");
  pc.innerHTML = caseHTML(e) + (reno ? '<span class="cloth"></span><span class="sign">整修中</span>' : "");
  $("pl-floor").innerHTML = `<b>${esc(f.numeral || "")}</b>${esc(f.label || "")}・${esc(f.name || "")}`;
  $("pl-title").textContent = e.title;
  $("pl-en").textContent = e.en;
  // 展品的自白：它被你抓到時說的那句
  $("pl-quip").textContent = e.persona?.quip ? `「${e.persona.quip}」` : "";
  $("pl-quip").hidden = !e.persona?.quip;
  $("pl-meta").innerHTML = [["類型", e.kind || "—"], ["年代", e.version || "—"], ["展廳", f.label || "—"]]
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

/* ---------- 回到售票口 ---------- */
function resetToBooth() {
  ["ticket-scene", "inside-scene"].forEach(id => $(id).hidden = true);
  map.stop(); mode = null;
  document.body.classList.remove("is-dark", "in-inside"); document.body.classList.add("is-lit", "at-booth");
  setLamps(true);
  document.querySelectorAll(".lamp").forEach(l => l.classList.remove("flick"));
  $("booth").classList.remove("issuing");
  const bs = $("booth-scene"); bs.hidden = false; bs.classList.remove("leaving"); bs.scrollTop = 0;
  busy = false;
}

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200);
}
function footHTML() {
  return [`<span class="foot-name">微光博物館・引路人文創園區</span>`, ...D.footer.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)]
    .join('<span class="dot">·</span>');
}

/* ---------- 開始 ---------- */
$("site-foot").innerHTML = footHTML();
buildHall();
$("booth").addEventListener("click", issue);
$("tk-go").addEventListener("click", enter);
$("tk-save").addEventListener("click", saveTicket);
$("tk-again").addEventListener("click", again);
$("hud-back").addEventListener("click", resetToBooth);
$("mode-switch").addEventListener("click", ev => { const b = ev.target.closest("button[data-mode]"); if (b) setMode(b.dataset.mode); });
$("skip").addEventListener("click", () => { $("booth-scene").hidden = true; setLamps(true); openInside("catalog"); });
$("pl-close").addEventListener("click", closePlacard);
$("placard").addEventListener("click", e => { if (e.target === $("placard")) closePlacard(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !$("placard").hidden) closePlacard(); });
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(buildLamps, 200); });
