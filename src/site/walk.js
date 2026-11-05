// 微光博物館｜夜遊：下班的老師提著手電筒，在橫向長廊裡走
// 每層樓一條長廊：左端老式電梯＋夜班警衛＋牆上的樓層字，接著一排櫥窗，櫥窗之間是拱窗；
// 盡頭是紅龍柱圍欄（商店那層是出口）。
// 黑暗用畫布畫：整片暗，再挖出手電筒的光錐、身邊一圈光、窗子的月光、照過的櫥窗。
import { objectSVG } from "./objects.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 拱窗（大廳和長廊共用）：深窗框、扇形窗格、窗台；moon＝看得到月亮 ---------- */
export function windowSVG(id, moon) {
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

/* ---------- 人物剪影（畫布 80×200，腳底在 y≈198，面向右） ---------- */
// 下班的老師：背帆布包、外套搭在手上、手上提著手電筒。不分男女。
const TEACHER = `<svg class="fig" viewBox="0 0 80 200" aria-hidden="true" focusable="false">
  <g class="fig-body">
    <g class="leg leg-b"><path d="M42 104 L41 186" stroke="#03060c" stroke-width="12.5" stroke-linecap="round"/><path d="M35 184 h13 q8 0 8 6 v3 h-21 z" fill="#03060c"/></g>
    <g class="arm arm-b"><path d="M35 50 Q31 76 32 100" stroke="#03060c" stroke-width="10" stroke-linecap="round" fill="none"/>
      <path d="M22 92 Q33 87 44 92 L47 140 Q37 149 24 146 Z" fill="#05080f"/></g>
    <path d="M14 98 L38 98 L40 130 L12 130 Z" fill="#05080f"/>
    <path d="M28 46 Q44 39 58 45 L60 110 Q44 115 28 110 Z" fill="#070b15"/>
    <path d="M53 46 L24 99" stroke="#03060c" stroke-width="2.6" stroke-linecap="round"/>
    <g class="leg leg-f"><path d="M46 104 L47 186" stroke="#070b15" stroke-width="12.5" stroke-linecap="round"/><path d="M41 184 h13 q8 0 8 6 v3 h-21 z" fill="#070b15"/></g>
    <rect x="39" y="31" width="9" height="12" rx="3" fill="#070b15"/>
    <ellipse cx="44.5" cy="21" rx="12.5" ry="13" fill="#070b15"/>
    <path d="M32 19 C33 6 56 4 57.5 17 C52 12 41 12 33.5 22 Z" fill="#03060c"/>
    <g class="arm arm-f"><path d="M53 51 Q60 72 66 84 Q69 90 74 90" stroke="#070b15" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <g transform="rotate(-12 74 90)"><rect x="70" y="86" width="15" height="7" rx="2" fill="#141d30"/><rect x="83" y="84.5" width="4" height="10" rx="1.4" fill="#2a3650"/>
      <ellipse cx="87.4" cy="89.5" rx="1.4" ry="4.2" fill="#fff1c8"/></g></g>
  </g></svg>`;
// 夜班警衛：大盤帽、雙排扣大衣、手背在後面，站在電梯旁
const GUARD = `<svg class="fig" viewBox="0 0 80 200" aria-hidden="true" focusable="false">
  <path d="M33 118 L32 190 M53 118 L54 190" stroke="#04070e" stroke-width="13" stroke-linecap="round"/>
  <path d="M25 188 h15 q6 0 6 5 v3 h-21 z M47 188 h15 q6 0 6 5 v3 h-21 z" fill="#04070e"/>
  <path d="M25 46 Q43 37 61 46 L65 130 Q43 137 21 130 Z" fill="#070b15"/>
  <path d="M28 50 Q24 80 30 104 M58 50 Q62 80 56 104" stroke="#04070e" stroke-width="10" stroke-linecap="round" fill="none"/>
  <circle cx="47" cy="66" r="1.3" fill="#c9a055" opacity=".8"/><circle cx="47" cy="80" r="1.3" fill="#c9a055" opacity=".8"/><circle cx="47" cy="94" r="1.3" fill="#c9a055" opacity=".8"/>
  <rect x="38" y="33" width="10" height="12" rx="3" fill="#070b15"/>
  <ellipse cx="43" cy="27" rx="11.5" ry="12" fill="#070b15"/>
  <path d="M29 20 Q31 6 44 5 Q59 5 60 15 L60 20 Z" fill="#03060c"/><path d="M52 19 L69 21.5 L53 24 Z" fill="#03060c"/>
  <circle cx="45" cy="12.5" r="1.7" fill="#d4a64a"/>
</svg>`;

/* ---------- 老式電梯：半圓指針樓層錶＋黃銅柵門 ---------- */
function liftSVG(floors) {
  const n = floors.length;
  const marks = floors.map((f, i) => {
    const a = (-70 + 140 * i / Math.max(1, n - 1)) * Math.PI / 180;
    const lx = 85 + Math.sin(a) * 31, ly = 62 - Math.cos(a) * 31;
    const tx = 85 + Math.sin(a) * 39, ty = 62 - Math.cos(a) * 39;
    const short = /^\d+F$/i.test(f.label) ? f.label.replace(/F$/i, "") : f.label.slice(0, 1);
    return `<line x1="${(85 + Math.sin(a) * 26).toFixed(1)}" y1="${(62 - Math.cos(a) * 26).toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#3a2a12" stroke-width="1.4"/>
      <text x="${tx.toFixed(1)}" y="${(ty + 3.2).toFixed(1)}" text-anchor="middle" font-size="9" font-family="Noto Serif TC, serif" font-weight="700" fill="#3a2a12">${esc(short)}</text>`;
  }).join("");
  const lattice = (x0, w) => {
    let p = "";
    for (let k = -214; k < w + 214; k += 18) p += `M${x0 + k} 82 L${x0 + k + 107} 296 M${x0 + k + 107} 82 L${x0 + k} 296 `;
    return p;
  };
  return `<svg viewBox="0 0 170 300" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="lb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a6"/><stop offset=".45" stop-color="#c99a45"/><stop offset="1" stop-color="#7a5620"/></linearGradient>
    <linearGradient id="lc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2810"/><stop offset=".5" stop-color="#21170a"/><stop offset="1" stop-color="#0e0a05"/></linearGradient>
    <radialGradient id="lf" cx=".45" cy=".4"><stop offset="0" stop-color="#fbf3dc"/><stop offset="1" stop-color="#e2cfa2"/></radialGradient>
    <clipPath id="lgl"><rect x="22" y="82" width="63" height="214"/></clipPath><clipPath id="lgr"><rect x="85" y="82" width="63" height="214"/></clipPath></defs>
    <rect x="6" y="72" width="158" height="228" fill="#0b1426"/>
    <rect x="9" y="75" width="152" height="225" fill="none" stroke="rgba(232,200,137,.35)" stroke-width="1"/>
    <rect x="22" y="82" width="126" height="214" fill="url(#lc)"/>
    <path d="M40 82 V296 M66 82 V296 M104 82 V296 M130 82 V296" stroke="rgba(255,210,150,.08)" stroke-width="1"/>
    <ellipse cx="85" cy="86" rx="30" ry="5" fill="rgba(255,214,150,.35)"/>
    <g class="gate gate-l"><g clip-path="url(#lgl)"><path d="${lattice(22, 63)}" stroke="url(#lb)" stroke-width="1.6" fill="none"/></g>
      <rect x="22" y="82" width="63" height="4" fill="url(#lb)"/><rect x="22" y="292" width="63" height="4" fill="url(#lb)"/><rect x="81" y="82" width="4" height="214" fill="url(#lb)"/></g>
    <g class="gate gate-r"><g clip-path="url(#lgr)"><path d="${lattice(85, 63)}" stroke="url(#lb)" stroke-width="1.6" fill="none"/></g>
      <rect x="85" y="82" width="63" height="4" fill="url(#lb)"/><rect x="85" y="292" width="63" height="4" fill="url(#lb)"/><rect x="85" y="82" width="4" height="214" fill="url(#lb)"/></g>
    <rect x="16" y="296" width="138" height="4" fill="url(#lb)"/>
    <path d="M37 64 A48 48 0 0 1 133 64 Z" fill="#0b1426"/>
    <path d="M37 64 A48 48 0 0 1 133 64" fill="none" stroke="url(#lb)" stroke-width="5"/>
    <path d="M43 64 A42 42 0 0 1 127 64 Z" fill="url(#lf)"/>
    ${marks}
    <rect x="33" y="63" width="104" height="6" rx="1.5" fill="url(#lb)"/>
    <g class="needle"><path d="M84 62 L85 28 L86 62 Z" fill="#2b1d0c"/></g>
    <circle cx="85" cy="62" r="3.4" fill="url(#lb)"/>
  </svg>`;
}

/* ---------- 走道盡頭：紅龍柱圍欄／出口 ---------- */
const ROPE = `<svg viewBox="0 0 160 110" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="rp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5620"/><stop offset=".5" stop-color="#f0d08a"/><stop offset="1" stop-color="#7a5620"/></linearGradient></defs>
  <path d="M24 30 Q80 62 136 30" fill="none" stroke="#1d2a4c" stroke-width="5" stroke-linecap="round"/>
  <path d="M24 30 Q80 62 136 30" fill="none" stroke="rgba(232,200,137,.25)" stroke-width="1"/>
  <g fill="url(#rp)"><circle cx="24" cy="22" r="6"/><rect x="21" y="26" width="6" height="74"/><ellipse cx="24" cy="104" rx="15" ry="5"/>
  <circle cx="136" cy="22" r="6"/><rect x="133" y="26" width="6" height="74"/><ellipse cx="136" cy="104" rx="15" ry="5"/></g></svg>`;
const EXIT = `<svg viewBox="0 0 150 270" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="dr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c1528"/><stop offset=".5" stop-color="#16243f"/><stop offset="1" stop-color="#0c1528"/></linearGradient>
  <linearGradient id="db" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2a6"/><stop offset="1" stop-color="#8a6420"/></linearGradient></defs>
  <rect x="25" y="0" width="100" height="30" rx="2" fill="#0a1222" stroke="rgba(207,217,232,.4)" stroke-width="1"/>
  <text x="75" y="20" text-anchor="middle" font-size="13" font-family="Noto Serif TC, serif" font-weight="700" letter-spacing="3" fill="#e9eff8">出口 EXIT</text>
  <path d="M8 270 V110 A67 67 0 0 1 142 110 V270 Z" fill="#0a1222"/>
  <path d="M16 270 V112 A59 59 0 0 1 134 112 V270 Z" fill="url(#dr)"/>
  <path d="M75 54 V270" stroke="#060b16" stroke-width="2.5"/>
  <path d="M26 128 H66 V258 H26 Z M84 128 H124 V258 H84 Z" fill="none" stroke="rgba(232,200,137,.2)" stroke-width="1"/>
  <rect x="64" y="170" width="3" height="26" rx="1.5" fill="url(#db)"/><rect x="83" y="170" width="3" height="26" rx="1.5" fill="url(#db)"/>
  <path d="M8 270 V110 A67 67 0 0 1 142 110 V270" fill="none" stroke="rgba(232,200,137,.35)" stroke-width="1.2"/></svg>`;

/* ================================================================ */
export function createWalk(root, opt) {
  const { floors, exhibits, reduced } = opt;
  const coarse = matchMedia("(pointer: coarse)").matches;
  root.innerHTML = `
    <div class="w-view">
      <div class="w-world"></div>
      <canvas class="w-dark"></canvas><canvas class="w-warm"></canvas>
      <div class="w-world w-over"><button class="w-chip" type="button" hidden></button><div class="w-bubble" hidden></div></div>
    </div>
    <p class="w-plate"></p>
    <p class="w-help" hidden></p>
    <div class="joy" ${coarse ? "" : "hidden"}><span class="joy-knob"></span></div>
    <div class="lift-veil" hidden><div class="lift-panel" role="dialog" aria-modal="true" aria-label="電梯">
      <button class="lp-close" type="button" aria-label="關閉">×</button>
      <p class="lp-kicker">Lift</p><p class="lp-title">要去哪一層？</p><div class="lp-btns"></div></div></div>
    <div class="w-fade"></div>`;
  const q = s => root.querySelector(s);
  const view = q(".w-view"), world = q(".w-world"), over = q(".w-over"), dark = q(".w-dark"), warm = q(".w-warm");
  const chip = q(".w-chip"), bubble = q(".w-bubble"), help = q(".w-help"), plate = q(".w-plate"), fade = q(".w-fade");
  const joyEl = q(".joy"), knob = q(".joy-knob"), liftVeil = q(".lift-veil");
  const dctx = dark.getContext("2d"), wctx = warm.getContext("2d");

  let st = null;           // 這層樓：版面、人物、櫥窗
  let running = false, raf = 0, lastT = 0, helpShown = false;
  const keys = { l: false, r: false };
  const joy = { id: null, x: 0, y: 0, fired: false };

  /* ---------- 版面：所有尺寸用 u 算（大約是 900px 高的螢幕上的 1px） ---------- */
  function measure() {
    const W = view.clientWidth || innerWidth, H = view.clientHeight || innerHeight;
    const tall = H > W * 1.2;
    const u = clamp(Math.min(H * 1.12, W * (tall ? 2 : 1.8)) / 900, .56, 1.4);
    const fy = Math.round(H * (tall ? .7 : .75));
    return { W, H, u, fy, fh: H - fy, tall };
  }
  function build(fid, keepX) {
    const f = floors.find(x => x.id === fid) || floors[0];
    const items = exhibits.filter(e => e.floor === f.id);
    const m = measure(), { u } = m;
    // 直式手機：樓層字移到電梯正上方，一進來就看得到
    const liftX = 130 * u, guardX = 345 * u, textX = m.tall ? 50 * u : 440 * u, first = m.tall ? 640 * u : 850 * u, gap = 330 * u;
    const cases = items.map((e, i) => ({ e, x: first + i * gap, lit: 0, seen: false, on: false }));
    const lastX = cases.length ? cases[cases.length - 1].x : first - gap;
    const endX = lastX + gap * .85;
    const worldW = Math.max(m.W, endX + 200 * u);
    const wins = [];
    for (let i = 0; i < cases.length; i++) wins.push(cases[i].x + gap / 2);
    if (!cases.length) wins.push(first);
    const moonAt = Math.floor((wins.length - 1) / 2);
    const exit = f.id === floors[floors.length - 1].id && /出口|exit|shop/i.test(f.label + f.id);
    st = { f, m, u, liftX, guardX, textX, cases, wins, endX, worldW, exit,
      x: keepX != null ? keepX * u : liftX, dir: 1, vx: 0, target: null, idle: 0, busy: false, near: null, bubbleOn: false, camX: 0, liftOpen: true };

    root.style.setProperty("--u", u + "px");
    root.style.setProperty("--fy", m.fy + "px");
    root.style.setProperty("--fh", m.fh + "px");
    world.style.width = over.style.width = worldW + "px";
    const alive = !!f.alive;
    world.innerHTML = `
      <div class="w-wall"></div>
      ${wins.map((x, i) => `<div class="w-win" style="left:${x}px">${windowSVG("c" + i, i === moonAt)}</div><span class="w-patch" style="left:${x}px"></span>`).join("")}
      <div class="w-title${m.tall ? " high" : ""}" style="left:${textX}px"><span class="wt-label">${esc(f.label)}</span><span class="wt-name">${esc(f.name)}</span><i class="wt-en">${esc(f.en)}</i><span class="wt-blurb">${esc(f.blurb || "")}</span></div>
      <div class="w-lift" style="left:${liftX}px">${liftSVG(floors)}</div>
      ${cases.map((c, i) => `<button class="w-case glow-${esc(c.e.glow)}${alive ? " alive" : ""}${c.e.status === "renovating" ? " reno" : ""}" type="button" data-i="${i}" data-obj="${esc(c.e.object)}" style="left:${c.x}px" aria-label="${esc(c.e.title)}，看說明牌">
        <span class="wc-glass"><span class="wc-light"></span>${objectSVG(c.e.object)}${c.e.status === "renovating" ? '<span class="wc-cloth"></span>' : ""}</span>
        <span class="wc-ped"><span class="wc-plate"><b>${esc(c.e.title)}</b><small>${esc(c.e.kind)}${c.e.status === "renovating" ? "・整修中" : ""}</small></span></span></button>`).join("")}
      ${exit ? `<button class="w-exit" type="button" style="left:${endX}px" aria-label="出口，回到售票口">${EXIT}</button>`
        : `<div class="w-rope" style="left:${endX}px">${ROPE}<span class="wr-sign">本層到此<i>搭電梯去別層</i></span></div>`}
      <div class="w-floor"></div>
      <div class="w-guard" style="left:${guardX}px">${GUARD}</div>
      <div class="w-actor">${TEACHER}</div>`;
    over.querySelectorAll(".w-chip, .w-bubble").forEach(n => n.hidden = true);
    st.lift = world.querySelector(".w-lift");
    st.actor = world.querySelector(".w-actor");
    st.caseEls = [...world.querySelectorAll(".w-case")];
    setNeedle(floors.indexOf(f), true);
    plate.innerHTML = `<b>${esc(f.label)}</b>${esc(f.name)}`;
    // 畫布用一半解析度：光本來就是柔的，省效能
    const k = .5;
    for (const c of [dark, warm]) { c.width = Math.ceil(m.W * k); c.height = Math.ceil(m.H * k); }
    dctx.setTransform(k, 0, 0, k, 0, 0); wctx.setTransform(k, 0, 0, k, 0, 0);
    st.camX = 0; st.camX = camTarget();
    place(); draw(performance.now());
  }

  function setNeedle(i, instant) {
    const n = floors.length, a = -70 + 140 * i / Math.max(1, n - 1);
    const nd = st?.lift?.querySelector(".needle");
    if (!nd) return;
    nd.style.transition = instant || reduced ? "none" : "transform 1s cubic-bezier(.5,0,.3,1)";
    nd.style.transform = `rotate(${a}deg)`;
  }
  function setGate(open) { st.liftOpen = open; st.lift.classList.toggle("closed", !open); }

  /* ---------- 鏡頭與擺位 ---------- */
  // 鏡頭：人在框內就不動，走近邊緣才跟；面向的那一邊多留一點，看得到前面
  function camTarget() {
    const s = st, W = s.m.W, [lo, hi] = s.dir > 0 ? [.26, .46] : [.54, .74];
    let c = s.camX;
    if (s.x - c > W * hi) c = s.x - W * hi;
    if (s.x - c < W * lo) c = s.x - W * lo;
    return clamp(c, 0, Math.max(0, s.worldW - W));
  }
  function place() {
    const t = `translate3d(${-st.camX.toFixed(1)}px,0,0)`;
    world.style.transform = over.style.transform = t;
    st.actor.style.transform = `translateX(${st.x.toFixed(1)}px) scaleX(${st.dir})`;
  }

  /* ---------- 每一格 ---------- */
  function frame(t) {
    if (!running) return;
    const dt = Math.min(.05, (t - lastT) / 1000 || 0); lastT = t;
    step(dt, t);
    raf = requestAnimationFrame(frame);
  }
  function step(dt, t) {
    const s = st, u = s.u;
    // 方向鍵／搖桿優先，沒有的話走向點的位置
    let input = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    if (joy.id !== null && Math.abs(joy.x) > .18) input = joy.x;
    if (s.busy || opt.blocked() || !liftVeil.hidden) input = 0;
    const speed = 310 * u;
    let vx = 0;
    if (input) { s.target = null; vx = input * speed; }
    else if (s.target) {
      const d = s.target.x - s.x;
      if (Math.abs(d) < 3 * u || reduced) {
        s.x = s.target.x; const then = s.target.then; s.target = null;
        if (then) then();
      } else vx = Math.sign(d) * Math.min(speed * (s.target.fast || 1), Math.abs(d) / dt);
    }
    if (vx) { s.dir = Math.sign(vx); s.idle = 0; if (helpShown) hideHelp(); }
    else s.idle += dt;
    s.x = clamp(s.x + vx * dt, s.liftX - 4 * u, s.endX - 70 * u);
    s.vx = vx;
    st.actor.classList.toggle("walking", !!vx && !reduced);
    const ct = camTarget();
    s.camX += (ct - s.camX) * (reduced ? 1 : Math.min(1, dt * 7));
    place();
    // 照到櫥窗：慢慢亮起來；照過的會留著一點光
    const beam = beamOf(t);
    s.cases.forEach((c, i) => {
      const cx = c.x, cy = s.m.fy - 140 * u;
      const dx = cx - beam.ox, dy = cy - beam.oy, dist = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - beam.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      const inBeam = (dist < beam.len * .9 && Math.abs(da) < beam.half * .85) || Math.abs(cx - s.x) < 70 * u;
      if (inBeam) c.seen = true;
      const goal = inBeam ? 1 : c.seen ? .4 : 0;
      c.lit += (goal - c.lit) * Math.min(1, dt * (goal > c.lit ? 5 : 1.4));
      if (reduced) c.lit = goal;
      const el = s.caseEls[i];
      if (Math.abs((c.shown ?? -1) - c.lit) > .015) { el.style.setProperty("--lit", c.lit.toFixed(2)); c.shown = c.lit; }
      if (inBeam !== c.on) { c.on = inBeam; el.classList.toggle("lit", inBeam); }
    });
    nearest();
    guardTalk();
    draw(t, beam);
  }

  /* ---------- 手電筒：光錐從手上出去，閒置時自己慢慢上下掃 ---------- */
  function beamOf(t) {
    const s = st, u = s.u, feet = s.m.fy + 44 * u;
    const ox = s.x + s.dir * 36 * u, oy = feet - 118 * u;
    const sway = reduced || s.idle < 1.6 ? 0 : Math.sin((t / 1000) * .7) * .16;
    const tilt = -.2 + sway;
    const ang = s.dir > 0 ? tilt : Math.PI - tilt;
    return { ox, oy, ang, len: 620 * u, half: .34 };
  }
  function cone(ctx, b, half, a, color = "0,0,0") {
    const g = ctx.createRadialGradient(b.sx, b.oy, 0, b.sx, b.oy, b.len);
    g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(.5, `rgba(${color},${a * .8})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(b.sx, b.oy); ctx.arc(b.sx, b.oy, b.len, b.ang - half, b.ang + half); ctx.closePath(); ctx.fill();
  }
  function glow(ctx, x, y, r, a, color = "0,0,0", sy = 1) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function draw(t, beam = beamOf(t)) {
    const s = st, u = s.u, { W, H, fy } = s.m, cam = s.camX;
    const b = { ...beam, sx: beam.ox - cam };
    const ctx = dctx;
    ctx.globalCompositeOperation = "source-over"; ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(3,6,12,.93)"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "destination-out";
    // 月光：拱窗本身＋落在地上的一塊
    for (const x of s.wins) {
      const sx = x - cam; if (sx < -300 * u || sx > W + 300 * u) continue;
      glow(ctx, sx, fy - 255 * u, 150 * u, .62, "0,0,0", 1.45);
      glow(ctx, sx + 60 * u, fy + s.m.fh * .45, 120 * u, .3, "0,0,0", .35);
    }
    // 牆上的樓層字有一盞小畫燈
    glow(ctx, s.textX + 120 * u - cam, fy - (s.m.tall ? 470 : 400) * u, 200 * u, .62, "0,0,0", .72);
    // 電梯：樓層錶的微光；門開著時車廂透出暖光
    glow(ctx, s.liftX - cam, fy - 225 * u, 70 * u, .65);
    if (s.liftOpen) glow(ctx, s.liftX - cam, fy - 110 * u, 95 * u, .35, "0,0,0", 1.4);
    // 照過的櫥窗
    for (const c of s.cases) if (c.lit > .02) glow(ctx, c.x - cam, fy - 120 * u, 125 * u, .78 * c.lit, "0,0,0", 1.25);
    // 出口的字是月白色
    if (s.exit) glow(ctx, s.endX - cam, fy - 252 * u, 80 * u, .7, "0,0,0", .5);
    // 自己身邊一圈光＋手電筒光錐（三層疊出柔邊）
    glow(ctx, s.x - cam, fy - 40 * u, 190 * u, .55, "0,0,0", .85);
    cone(ctx, b, b.half, .45); cone(ctx, b, b.half * .7, .45); cone(ctx, b, b.half * .42, .35);
    // 暖金色：只有手電筒和照亮的櫥窗
    const w = wctx;
    w.globalCompositeOperation = "source-over"; w.clearRect(0, 0, W, H);
    cone(w, b, b.half * .9, .16, "255,206,128");
    glow(w, b.sx, b.oy, 26 * u, .5, "255,226,170");
    for (const c of s.cases) if (c.lit > .02) glow(w, c.x - cam, fy - 135 * u, 90 * u, .14 * c.lit, "255,206,128");
  }

  /* ---------- 靠近什麼就提示什麼 ---------- */
  function nearest() {
    const s = st, u = s.u;
    let best = null, bd = Infinity;
    const consider = (kind, x, range, extra) => { const d = Math.abs(x - s.x); if (d < range && d < bd) { bd = d; best = { kind, x, ...extra }; } };
    if (!s.busy) {
      s.cases.forEach((c, i) => consider("case", c.x, 140 * u, { i }));
      consider("lift", s.liftX, 105 * u);
      if (s.exit) consider("exit", s.endX, 150 * u);
    }
    const key = best ? best.kind + (best.i ?? "") : "";
    if (key !== s.nearKey) {
      s.nearKey = key; s.near = best;
      if (!best) chip.hidden = true;
      else {
        const how = coarse ? "點一下" : "空白鍵";
        let title = "", act = "";
        if (best.kind === "case") { const e = s.cases[best.i].e; title = e.title; act = "看說明牌"; }
        else if (best.kind === "lift") { title = "電梯"; act = "選樓層"; }
        else { title = "出口"; act = "回到售票口"; }
        chip.innerHTML = `<b>${esc(title)}</b><span>${act}<kbd>${how}</kbd></span>`;
        chip.style.left = best.x + "px";
        chip.style.bottom = `calc(var(--fh) + ${best.kind === "case" ? 236 : best.kind === "lift" ? 300 : 300} * var(--u))`;
        chip.hidden = false;
      }
    }
  }
  function interact() {
    const n = st?.near; if (!n || st.busy) return;
    if (n.kind === "case") { const c = st.cases[n.i]; opt.openPlacard(c.e, st.caseEls[n.i]); }
    else if (n.kind === "lift") openLift();
    else if (n.kind === "exit") opt.exit();
  }
  // 點櫥窗、電梯、出口：先走過去，到了再打開
  function walkTo(x, then, fast) { st.target = { x: clamp(x, st.liftX, st.endX - 70 * st.u), then, fast }; }

  /* ---------- 夜班警衛：走近了會說一句話 ---------- */
  function guardTalk() {
    const s = st, d = Math.abs(s.x - s.guardX);
    if (!s.bubbleOn && d < 190 * s.u && !s.busy) {
      s.bubbleOn = true;
      const l = opt.guardLine(s.f.id);
      bubble.innerHTML = `<span class="wb-who">夜班警衛</span><span class="wb-zh">${esc(l.zh)}</span>${l.en ? `<i class="wb-en">${esc(l.en)}</i>` : ""}`;
      bubble.style.left = s.guardX + "px";
      bubble.hidden = false;
    } else if (s.bubbleOn && d > 300 * s.u) { s.bubbleOn = false; bubble.hidden = true; }
  }

  /* ---------- 電梯 ---------- */
  function openLift() {
    const cur = st.f.id;
    const order = [...floors].sort((a, b) => {
      const na = /^\d+F$/i.test(a.label) ? parseInt(a.label) : -1, nb = /^\d+F$/i.test(b.label) ? parseInt(b.label) : -1;
      return nb - na; // 數字樓層由高到低，出口放最下面
    });
    q(".lp-btns").innerHTML = order.map(f => `<button type="button" data-floor="${esc(f.id)}" ${f.id === cur ? 'disabled aria-current="true"' : ""}>
      <span class="lp-no">${esc(f.label)}</span><span class="lp-name">${esc(f.name)}<i>${f.id === cur ? "你在這一層" : esc(f.en)}</i></span></button>`).join("");
    liftVeil.hidden = false;
    q(".lp-btns button:not([disabled])")?.focus();
  }
  function closeLift() { liftVeil.hidden = true; }
  async function ride(to) {
    closeLift();
    const s = st; s.busy = true; chip.hidden = true; s.nearKey = "";
    // 走進電梯、關門、指針轉到那一層
    await new Promise(r => walkTo(s.liftX, r, 1.4));
    s.actor.classList.add("in-lift");
    await wait(reduced ? 0 : 260);
    setGate(false);
    await wait(reduced ? 0 : 520);
    setNeedle(floors.findIndex(f => f.id === to));
    await wait(reduced ? 0 : 1000);
    fade.classList.add("on");
    await wait(reduced ? 0 : 320);
    build(to);
    await arrive();
  }
  // 到了：門打開，人走出來
  async function arrive() {
    const s = st; s.busy = true;
    setGate(false); s.actor.classList.add("in-lift");
    s.x = s.liftX; place(); draw(performance.now());
    fade.classList.remove("on");
    await wait(reduced ? 0 : 380);
    setGate(true);
    await wait(reduced ? 0 : 480);
    s.actor.classList.remove("in-lift");
    await new Promise(r => walkTo(s.liftX + 118 * s.u, r));
    s.busy = false;
    if (!helpShown) showHelp();
  }

  /* ---------- 操作說明：第一次進來出現，走動後收起來 ---------- */
  function showHelp() {
    helpShown = true;
    help.textContent = coarse ? "用搖桿走動。往上推，或點一下提示，看說明牌。" : "← → 或 A D 走動・空白鍵看說明牌・也可以直接點";
    help.hidden = false; help.classList.remove("out");
    clearTimeout(showHelp.t); showHelp.t = setTimeout(hideHelp, 7000);
  }
  function hideHelp() { if (help.hidden || help.classList.contains("out")) return; clearTimeout(showHelp.t); help.classList.add("out"); setTimeout(() => help.hidden = true, 600); }

  /* ---------- 輸入：鍵盤、點擊、搖桿 ---------- */
  const isTyping = e => e.target.closest?.("input, textarea, select");
  addEventListener("keydown", e => {
    if (!running || isTyping(e)) return;
    if (!liftVeil.hidden) { if (e.key === "Escape") closeLift(); return; }
    if (opt.blocked()) return;
    const k = e.key.toLowerCase();
    // 一走動就放掉長廊裡按鈕的焦點，空白鍵才會作用在身邊的東西
    if (["arrowleft", "arrowright", "a", "d"].includes(k) && root.contains(document.activeElement)) document.activeElement.blur();
    if (k === "arrowleft" || k === "a") { keys.l = true; e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { keys.r = true; e.preventDefault(); }
    else if (k === "arrowup" || k === "w" || ((k === " " || k === "enter") && !e.target.closest?.("button, a"))) { if (!e.repeat) interact(); e.preventDefault(); }
  });
  addEventListener("keyup", e => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") keys.l = false;
    if (k === "arrowright" || k === "d") keys.r = false;
  });
  addEventListener("blur", () => { keys.l = keys.r = false; });
  view.addEventListener("click", e => {
    if (!running || st.busy) return;
    if (e.target.closest(".w-chip")) { interact(); return; }
    const cs = e.target.closest(".w-case");
    if (cs) {
      const i = +cs.dataset.i, c = st.cases[i];
      // 用鍵盤（Tab＋Enter）按的，直接打開；用點的，先走過去
      if (e.detail === 0 || Math.abs(c.x - st.x) < 150 * st.u) { opt.openPlacard(c.e, cs); return; }
      walkTo(c.x - Math.sign(c.x - st.x) * 80 * st.u, () => { st.dir = Math.sign(c.x - st.x) || st.dir; opt.openPlacard(c.e, cs); });
      return;
    }
    if (e.target.closest(".w-lift")) { walkTo(st.liftX, openLift); return; }
    if (e.target.closest(".w-exit")) { walkTo(st.endX - 70 * st.u, () => opt.exit()); return; }
    const wx = e.clientX - view.getBoundingClientRect().left + st.camX;
    walkTo(wx);
  });
  q(".lp-btns").addEventListener("click", e => { const b = e.target.closest("button[data-floor]"); if (b && !b.disabled) ride(b.dataset.floor); });
  q(".lp-close").addEventListener("click", closeLift);
  liftVeil.addEventListener("click", e => { if (e.target === liftVeil) closeLift(); });

  // 搖桿：左右走；往上推＝看說明牌／搭電梯
  joyEl.addEventListener("pointerdown", e => { joy.id = e.pointerId; joyEl.setPointerCapture(e.pointerId); moveJoy(e); e.preventDefault(); });
  joyEl.addEventListener("pointermove", e => { if (e.pointerId === joy.id) moveJoy(e); });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; joy.fired = false; knob.style.transform = ""; joyEl.classList.remove("on"); };
  joyEl.addEventListener("pointerup", endJoy); joyEl.addEventListener("pointercancel", endJoy);
  function moveJoy(e) {
    const r = joyEl.getBoundingClientRect(), R = r.width / 2;
    let dx = (e.clientX - r.left - R) / R, dy = (e.clientY - r.top - R) / R;
    const len = Math.hypot(dx, dy); if (len > 1) { dx /= len; dy /= len; }
    joy.x = dx; joy.y = dy;
    knob.style.transform = `translate(${(dx * R * .55).toFixed(1)}px, ${(dy * R * .55).toFixed(1)}px)`;
    joyEl.classList.add("on");
    if (dy < -.7 && Math.abs(dx) < .5 && !joy.fired) { joy.fired = true; interact(); }
    if (dy > -.3) joy.fired = false;
  }

  let rz; addEventListener("resize", () => {
    if (!st) return;
    clearTimeout(rz); rz = setTimeout(() => { const keep = st.x / st.u, busy = st.busy; build(st.f.id, keep); st.busy = busy; setGate(true); }, 180);
  });

  /* ---------- 對外 ---------- */
  function loop() { cancelAnimationFrame(raf); lastT = performance.now(); raf = requestAnimationFrame(frame); }
  return {
    get floor() { return st?.f.id; },
    start(fid) { running = true; build(fid); loop(); arrive(); },
    resume() { if (!st) return; running = true; build(st.f.id, st.x / st.u); loop(); },
    pause() { running = false; cancelAnimationFrame(raf); keys.l = keys.r = false; closeLift(); },
    stop() { this.pause(); st = null; helpShown = false; help.hidden = true; }
  };
}
