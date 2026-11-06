// 微光博物館｜前台
// 點售票窗 → 抽到今晚的一張票根（100 句隨機，可以一直抽、可存成圖）→ 進館：俯視像素地圖
// 館內兩種看法：探索（地圖；白天有遊客、夜晚展品活過來，用日／月鈕切換）、總覽（畫廊式館藏目錄）。
// 抽到哪一句只在瀏覽器裡用，不記錄、不送出。
import { objectSVG } from "./objects.js";
import { engravingSVG, hasEngraving } from "./engravings.js";
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

/* ---------- 展品圖：銅版線稿（說明牌、總覽共用）；還沒畫線稿的先用舊的物件圖 ---------- */
function artHTML(e) { return hasEngraving(e.object) ? engravingSVG(e.object) : objectSVG(e.object); }
// 總覽的一張藏品海報：夜色紙底＋細金框、左上編號與英文、右邊直書標題、中間線稿、左下類型・年代
function posterHTML(e, f, i) {
  const reno = e.status === "renovating", no = `${f.numeral || ""} – ${String(i + 1).padStart(2, "0")}`;
  return `<button class="cat-item${reno ? " renovating" : ""}" type="button" data-id="${esc(e.id)}" data-kind="${esc(e.kind)}" aria-label="${esc(e.title)}">
    <span class="po" style="--n:${[...e.title].length}">
      <span class="po-no">${esc(no)}</span><span class="po-en">${esc(e.en)}</span>
      <span class="po-title">${esc(e.title)}</span>
      <span class="po-art">${artHTML(e)}</span>
      <span class="po-meta">${esc(e.kind)}${e.year ? `・${esc(e.year)}` : ""}</span>
      ${reno ? '<span class="sign">整修中</span>' : ""}
    </span></button>`;
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
// 斷行：只在標點後斷（逗號、分號、句號、問號、冒號），一段一段裝進行裡，詞不會被拆開
// fits(字串) 回答放不放得下；網頁上用字數、存圖時用實際寬度
function quoteLines(t, fits = l => [...l].length <= 13) {
  const segs = t.match(/[^，；。？！：]+[，；。？！：」』]*/g) || [t], out = [];
  let cur = "";
  for (const sg of segs) { if (cur && !fits(cur + sg)) { out.push(cur); cur = sg; } else cur += sg; }
  if (cur) out.push(cur);
  // 最後一行只剩一兩個字時，跟上一行合併再平分
  if (out.length > 1 && [...out[out.length - 1]].length <= 2) out[out.length - 2] += out.pop();
  return out;
}
function dateStr(d) { return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`; }
function fillTicket() {
  // 感性的句子是月白銀箔、幽默的是暖金燙金
  const tk = $("ticket");
  tk.classList.toggle("tone-warm", line.tone === "warm"); tk.classList.toggle("tone-tender", line.tone !== "warm");
  $("tk-kicker").textContent = "今晚的一句";
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

// 存成直式圖片（1080×1920，整張就是票），手機可以直接分享到相簿或限動
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
  // 整張就是票：1080×1920 滿版深墨藍厚卡，沒有透明邊、沒有破洞，存進相簿就是一張完整的圖（比照心的畫廊的書籤）
  const W = 1080, H = 1920, gold = line.tone === "warm";   // warm＝暖金燙金、tender＝月白銀箔
  const SERIF = '"Noto Serif TC", "Songti TC", serif', LATIN = '"Cormorant Garamond", "Times New Roman", serif', SANS = '"Noto Sans TC", sans-serif';
  if (document.fonts) await Promise.all([
    document.fonts.load(`700 56px ${SERIF}`, "微光博物館夜間入館券引路人教育園區"), document.fonts.load(`500 72px ${SERIF}`, line.zh), document.fonts.load(`700 52px ${SERIF}`, "0123456789."),
    document.fonts.load(`600 34px ${LATIN}`, "MUSEUM OF GLIMMERS"), document.fonts.load(`italic 500 46px ${LATIN}`, (line.en || "") + "Night Admission"),
    document.fonts.load(`400 30px ${SANS}`, "今晚的一句")
  ]).catch(() => {});
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  const ls = v => { if ("letterSpacing" in x) x.letterSpacing = v; };
  // 燙金或月白銀箔，看句子的調性
  const foil = (x0, x1) => { const g = x.createLinearGradient(x0, 0, x1, 0);
    (gold ? [[0, "#9c742c"], [.2, "#f3dc9c"], [.38, "#c9993f"], [.55, "#f8e7b2"], [.74, "#a87c30"], [1, "#e9c97f"]]
      : [[0, "#7f8da6"], [.2, "#eef3fa"], [.38, "#a9b6cc"], [.55, "#f6f9fd"], [.74, "#8996ad"], [1, "#d7e0ec"]]).forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const AC = gold ? "232,200,137" : "207,217,232";
  const cx = W / 2;
  // 卡紙：深墨藍漸層＋左上一點光＋很淡的紙纖維
  let g = x.createLinearGradient(0, 0, W * .5, H); g.addColorStop(0, "#15233f"); g.addColorStop(.55, "#0e1830"); g.addColorStop(1, "#0a1226");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  g = x.createRadialGradient(W * .28, 0, 40, W * .28, 0, 1100); g.addColorStop(0, "rgba(90,120,180,.22)"); g.addColorStop(1, "rgba(90,120,180,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${rand() > .5 ? "255,255,255" : "0,0,0"},${.025 + rand() * .035})`; x.fillRect(rand() * W, rand() * H, 1 + rand() * 2, 1); }
  // 雙層細框＋四角菱形（完整畫在框內，不會被裁掉）
  x.strokeStyle = `rgba(${AC},.55)`; x.lineWidth = 2; x.strokeRect(60, 60, W - 120, H - 120);
  x.strokeStyle = `rgba(${AC},.22)`; x.lineWidth = 1.5; x.strokeRect(76, 76, W - 152, H - 152);
  for (const [dx, dy] of [[60, 60], [W - 60, 60], [60, H - 60], [W - 60, H - 60]]) {
    x.save(); x.translate(dx, dy); x.rotate(Math.PI / 4); x.fillStyle = "#0e1830"; x.fillRect(-11, -11, 22, 22); x.strokeStyle = `rgba(${AC},.85)`; x.lineWidth = 2; x.strokeRect(-11, -11, 22, 22); x.restore();
  }
  x.textAlign = "center"; x.textBaseline = "alphabetic";
  // 燈籠館徽
  x.save(); x.translate(cx - 45, 190); x.scale(3, 3); x.fillStyle = foil(0, 30); x.strokeStyle = foil(0, 30); x.lineWidth = 1.2;
  x.beginPath(); x.arc(15, 3.2, 2.4, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(7, 11); x.lineTo(23, 11); x.lineTo(19.5, 6); x.lineTo(10.5, 6); x.closePath(); x.fill();
  x.strokeRect(8, 11, 14, 19);
  x.beginPath(); x.moveTo(15, 15); x.bezierCurveTo(18.5, 19.5, 18.5, 23, 15, 25.5); x.bezierCurveTo(11.5, 23, 11.5, 19.5, 15, 15); x.fill();
  x.fillRect(6, 30, 18, 3.2); x.beginPath(); x.moveTo(9, 33.2); x.lineTo(10.5, 37); x.lineTo(19.5, 37); x.lineTo(21, 33.2); x.closePath(); x.fill();
  x.restore();
  x.fillStyle = foil(cx - 320, cx + 320); x.font = `600 34px ${LATIN}`; ls("18px"); x.fillText("MUSEUM OF GLIMMERS", cx + 9, 390);
  x.fillStyle = "#f3ecdb"; x.font = `700 56px ${SERIF}`; ls("26px"); x.fillText("微光博物館", cx + 13, 470);
  const rule = y0 => { const g2 = x.createLinearGradient(cx - 150, 0, cx + 150, 0); g2.addColorStop(0, `rgba(${AC},0)`); g2.addColorStop(.5, `rgba(${AC},.95)`); g2.addColorStop(1, `rgba(${AC},0)`);
    x.fillStyle = g2; x.fillRect(cx - 150, y0, 300, 2); x.save(); x.translate(cx, y0 + 1); x.rotate(Math.PI / 4); x.fillStyle = `rgb(${AC})`; x.fillRect(-8, -8, 16, 16); x.restore(); };
  rule(545);
  x.fillStyle = `rgba(${AC},.85)`; x.font = `400 30px ${SANS}`; ls("14px"); x.fillText("今晚的一句", cx + 7, 640);
  // 那句話：大字置中；中文照標點換行（太長再折），英文照單字折
  // 字級自動縮放：每一段（逗號斷開）盡量一行放得下，不把「一整天」這種詞拆開；太長才折行
  // 一行超過約九個字就在逗號斷開，留白比較舒服；字級再縮到每一行都放得下
  const maxW = W - 200, fit = l => x.measureText(l).width <= maxW, pack = l => x.measureText(l).width <= 640;
  let fs = 72, segs;
  for (; fs >= 50; fs -= 2) { x.font = `500 ${fs}px ${SERIF}`; ls("6px"); segs = quoteLines(line.zh, pack); if (segs.length <= 3 && segs.every(fit)) break; }
  fs = Math.max(fs, 50); x.font = `500 ${fs}px ${SERIF}`; ls("6px"); segs = quoteLines(line.zh, pack);
  const zl = segs.flatMap(l => fit(l) ? [l] : wrap(x, l, maxW));
  const lh = Math.round(fs * 1.72);
  x.font = `italic 500 46px ${LATIN}`; ls("0px");
  const el = line.en ? wrap(x, line.en, W - 300, true) : [];
  const top = 700, bottom = 1400, blockH = zl.length * lh + (el.length ? 40 + el.length * 64 : 0);
  let y = top + Math.max(0, (bottom - top - blockH) / 2) + 80;
  x.fillStyle = "#f6efdf"; x.font = `500 ${fs}px ${SERIF}`; ls("6px");
  for (const l of zl) { x.fillText(l, cx + 3, y); y += lh; }
  if (el.length) { y += 14; x.fillStyle = "rgba(239,230,210,.62)"; x.font = `italic 500 46px ${LATIN}`; ls("0px");
    for (const l of el) { x.fillText(l, cx, y); y += 64; } }
  // 撕線：一排點＋兩側半圓缺口（用卡紙的深色畫，不是透明的洞）
  const sy = 1500;
  x.fillStyle = `rgba(${AC},.6)`; for (let px = 120; px < W - 120; px += 22) x.fillRect(px, sy - 1, 8, 2);
  for (const ex of [76, W - 76]) { x.fillStyle = "#070d1a"; x.beginPath(); x.arc(ex, sy, 18, 0, Math.PI * 2); x.fill(); x.strokeStyle = `rgba(${AC},.4)`; x.lineWidth = 1.5; x.stroke(); }
  // 存根：夜間入館券＋日期（日期用襯線中文字型的數字，等高）
  x.textAlign = "left"; x.fillStyle = "rgba(243,236,219,.88)"; x.font = `700 38px ${SERIF}`; ls("14px"); x.fillText("夜間入館券", 136, 1620);
  x.fillStyle = "rgba(239,230,210,.6)"; x.font = `italic 500 38px ${LATIN}`; ls("2px"); x.fillText("Night Admission", 136, 1676);
  x.textAlign = "right"; x.fillStyle = foil(W - 470, W - 130); x.font = `700 54px ${SERIF}`; ls("4px"); x.fillText(dateStr(issuedAt), W - 132, 1650);
  x.textAlign = "center"; x.fillStyle = `rgba(${AC},.7)`; x.font = `500 28px ${SERIF}`; ls("12px"); x.fillText("引路人教育園區", cx + 6, 1790);
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
  openInside("day");   // 預設是白天開館（使用者決定）；想看展品活過來，切到夜遊
  busy = false;
}

/* ---------- 三、館內：探索（day／night）／總覽（catalog） ---------- */
let mode = null, lastExplore = "day";
const map = createMap($("map"), {
  floors: D.floors, exhibits: D.exhibits.filter(e => e.onDisplay), reduced: REDUCED,
  // 夜裡是夜班警衛，白天換一套台詞
  guardLine: night => {
    const pool = (night ? D.guard : D.guardDay)?.length ? (night ? D.guard : D.guardDay) : [{ zh: "慢慢逛，不用趕。", en: "Take your time." }];
    return pool[Math.floor(Math.random() * pool.length)];
  },
  openPlacard: (e, from, night) => openPlacard(e, from, night),
  blocked: () => !$("placard").hidden || !$("leave").hidden || mode === "catalog",
  exit: () => askLeave()
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
  if (m !== "catalog") lastExplore = m;
  const sw = $("mode-switch"), sm = m === "catalog" ? "catalog" : "explore"; sw.dataset.mode = sm;
  sw.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.mode === sm)));
  const dn = $("daynight"), toNight = m !== "night";
  dn.hidden = m === "catalog"; dn.setAttribute("aria-pressed", String(m === "night"));
  dn.title = toNight ? "熄燈，切到夜晚" : "開燈，回到白天"; dn.setAttribute("aria-label", dn.title);
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

/* 總覽：畫廊式的館藏目錄，依展廳分段，每件是一張藏品海報（線稿＋直書標題），可以篩類型 */
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
      <div class="cat-grid">${items.map((e, i) => posterHTML(e, f, i)).join("")}</div>
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
// withQuip：夜遊時打開才放展品的自白（白天、全覽就是單純的展品資料）
function openPlacard(e, from, withQuip = false) {
  lastFocus = from || document.activeElement;
  const f = FLOOR[e.floor] || {}, reno = e.status === "renovating";
  const pc = $("pl-case");
  pc.className = "pl-case" + (reno ? " renovating" : "");
  // 展品放在聚光燈下的細台座上（不用整個玻璃櫃，看起來比較精緻）
  pc.innerHTML = artHTML(e) + '<span class="pl-stand"></span>' + (reno ? '<span class="cloth"></span><span class="sign">整修中</span>' : "");
  $("pl-floor").innerHTML = `<b>${esc(f.numeral || "")}</b>${esc(f.label || "")}・${esc(f.name || "")}`;
  $("pl-title").textContent = e.title;
  $("pl-en").textContent = e.en;
  // 展品的自白：它被你抓到時說的那句
  const quip = withQuip && e.persona?.quip;
  $("pl-quip").textContent = quip ? `「${e.persona.quip}」` : "";
  $("pl-quip").hidden = !quip;
  $("pl-meta").innerHTML = [["類型", e.kind || "—"], ["年代", e.year || "—"], ["展廳", f.label || "—"]]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
  $("pl-note").textContent = e.note;
  $("pl-tags").innerHTML = e.tags.map(t => `<li>${esc(t)}</li>`).join("");
  $("pl-links").innerHTML = reno || !e.links.length
    ? '<span class="btn is-off" aria-disabled="true">整修中，陸續開放</span>'
    : e.links.map(l => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("");
  $("pl-disclaimer").hidden = e.floor !== "f2";
  $("placard").hidden = false; $("placard").scrollTop = 0;
  $("pl-close").focus({ preventScroll: true });
}
function closePlacard() { $("placard").hidden = true; lastFocus?.focus?.({ preventScroll: true }); }

/* ---------- 出口：先問一下，免得不小心離開 ---------- */
function askLeave() { $("leave").hidden = false; $("leave-no").focus(); }
function closeLeave() { $("leave").hidden = true; }

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
  return [`<span class="foot-name">微光博物館・引路人教育園區</span>`, ...D.footer.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)]
    .join('<span class="dot">·</span>');
}

/* ---------- 開始 ---------- */
$("site-foot").innerHTML = footHTML();
buildHall();
$("booth").addEventListener("click", issue);
$("buy").addEventListener("click", issue);
$("tk-go").addEventListener("click", enter);
$("tk-save").addEventListener("click", saveTicket);
$("tk-again").addEventListener("click", again);
$("hud-back").addEventListener("click", resetToBooth);
// 用滑鼠或手指點的，點完放掉焦點：不然按空白鍵會再按一次切換鈕，而不是看說明牌
$("mode-switch").addEventListener("click", ev => { const b = ev.target.closest("button[data-mode]"); if (!b) return; if (ev.detail) b.blur(); setMode(b.dataset.mode === "catalog" ? "catalog" : lastExplore); });
$("daynight").addEventListener("click", ev => { if (ev.detail) ev.currentTarget.blur(); setMode(mode === "night" ? "day" : "night"); });
// 略過也是先到地圖（使用者決定：進館先探索，想快速找內容再切總覽）
$("skip").addEventListener("click", () => { $("booth-scene").hidden = true; setLamps(true); openInside("day"); });
$("pl-close").addEventListener("click", closePlacard);
$("pl-done").addEventListener("click", closePlacard);
$("leave-yes").addEventListener("click", () => { closeLeave(); resetToBooth(); });
$("leave-no").addEventListener("click", closeLeave);
$("leave").addEventListener("click", e => { if (e.target === $("leave")) closeLeave(); });
$("placard").addEventListener("click", e => { if (e.target === $("placard")) closePlacard(); });
addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!$("placard").hidden) closePlacard(); else if (!$("leave").hidden) closeLeave(); });
let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(buildLamps, 200); });
