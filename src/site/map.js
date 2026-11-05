// 微光博物館｜館內：俯視像素地圖
// 一整張平面：中央大廳（鎮館之寶恐龍骨架、雕像、畫像、警衛），四周四個展廳。
// 夜遊：館內暗，手電筒照路，展品活過來到處亂逛；你一靠近，它就跑回台座裝死，這時才能看說明牌。
// 開館（白天）：窗外是天光，有遊客在逛，展品乖乖待在台座上。
// 先畫一張 1:1 的小畫布（一格 16 像素），再用最近鄰放大到螢幕：放大倍率取「整數個螢幕實體像素」，像素才會銳利。
import { TEACHER, GUARD, STATUE, DINO, ITEMS, sprite, flipped, visitor } from "./pixels.js";

const T = 16;                 // 一格的像素
const MW = 66, MH = 45;       // 地圖大小（格）
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- 平面圖：房間（含上方兩排牆面）與通道 ---------- */
// 展廳的順序對應 museum.json 的 floors：第 1 個在西、第 2 個在北、第 3 個在東、第 4 個在南（商店＋出口）
const ROOMS = {
  hall: { x: 24, y: 16, w: 18, h: 16, floor: "marble" },
  west: { x: 3, y: 17, w: 17, h: 14, floor: "carpet" },
  north: { x: 22, y: 3, w: 22, h: 10, floor: "parquet" },
  east: { x: 46, y: 17, w: 17, h: 14, floor: "slate" },
  south: { x: 28, y: 35, w: 10, h: 8, floor: "check" }
};
const WINGS = ["west", "north", "east", "south"];
const DOORS = {
  west: { x: 20, y: 24, w: 4, h: 3, sign: [21.9, 22.9] },
  north: { x: 31, y: 13, w: 4, h: 5, sign: [33, 17.55] },
  east: { x: 42, y: 24, w: 4, h: 3, sign: [44.1, 22.9] },
  south: { x: 31, y: 32, w: 4, h: 5, sign: [33, 35.6] }
};
const EXIT = { x: 32, y: 43, w: 2 };            // 商店南牆的出口
const PLATFORM = { cx: 33, cy: 24.6 };          // 恐龍台座（大廳正中央）
const SPAWN = { x: 33 * T, y: 30 * T + 8 };

function buildGrid() {
  // 0 實牆、1 地板、2 牆面（房間上方兩排，看得到但走不過去）
  const g = Array.from({ length: MH }, () => new Uint8Array(MW));
  for (const r of Object.values(ROOMS))
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = y < r.y + 2 ? 2 : 1;
  for (const d of Object.values(DOORS))
    for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) g[y][x] = 1;
  for (let x = EXIT.x; x < EXIT.x + EXIT.w; x++) g[EXIT.y][x] = 3; // 出口門檻（走不出去）
  return g;
}
const roomAt = (tx, ty) => Object.entries(ROOMS).find(([, r]) => tx >= r.x && tx < r.x + r.w && ty >= r.y + 2 && ty < r.y + r.h)?.[0] || null;

/* ---------- 地圖底圖（只畫一次） ---------- */
function paintMap(grid, slots, wins) {
  const c = document.createElement("canvas"); c.width = MW * T; c.height = MH * T;
  const x = c.getContext("2d");
  const px = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const solid = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || grid[ty][tx] === 0;
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  px(0, 0, c.width, c.height, "#04070e");
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const X = tx * T, Y = ty * T, v = grid[ty][tx], h = hash(tx, ty);
    if (v === 0) {
      // 牆頂：靠近房間的牆畫成深色牆頂＋一條燙金收邊
      const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => !solid(tx + dx, ty + dy));
      if (!near) continue;
      px(X, Y, T, T, "#0b1222");
      x.fillStyle = "rgba(212,166,74,.28)";
      if (!solid(tx, ty + 1) && grid[ty + 1][tx] !== 2) x.fillRect(X, Y + T - 1, T, 1);
      if (!solid(tx, ty - 1)) x.fillRect(X, Y, T, 1);
      if (!solid(tx + 1, ty)) x.fillRect(X + T - 1, Y, 1, T);
      if (!solid(tx - 1, ty)) x.fillRect(X, Y, 1, T);
      continue;
    }
    if (v === 3) { // 出口門檻：門外是夜色
      px(X, Y, T, T, "#0d1a30"); px(X, Y, T, 2, "#2a3c63"); px(X + 2, Y + 4, T - 4, T - 4, "#0a1426");
      continue;
    }
    const room = roomAt(tx, ty) || (v === 2 ? Object.keys(ROOMS).find(k => { const r = ROOMS[k]; return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + 2; }) : null);
    if (v === 2) { paintFace(x, X, Y, ty - ROOMS[room].y); continue; }
    paintFloor(x, X, Y, tx, ty, room ? ROOMS[room].floor : "runner", h);
  }
  // 拱門：牆面上的開口描一圈金邊
  for (const [k, d] of Object.entries(DOORS)) {
    if (k === "north" || k === "south") {
      const r = k === "north" ? ROOMS.hall : ROOMS.south;
      const X = d.x * T, Y = r.y * T;
      px(X - 2, Y, 2, 2 * T, "#8a6420"); px(X + d.w * T, Y, 2, 2 * T, "#8a6420");
      px(X - 2, Y, d.w * T + 4, 2, "#d4a64a");
    }
  }
  // 窗（展廳的牆面）
  for (const w of wins) paintWindow(x, w.x, w.y);
  // 台座
  for (const s of slots) paintPlinth(x, s.tx * T, s.ty * T);
  // 大廳：從商店門口到恐龍台座的長地毯
  const rx = 31 * T + 4, ry = (PLATFORM.cy + 1.6) * T, rw = 4 * T - 8, rh = (ROOMS.hall.y + ROOMS.hall.h) * T - ry;
  px(rx, ry, rw, rh, "#0f1c36"); px(rx + 2, ry, rw - 4, rh, "#18294b");
  px(rx + 3, ry, 1, rh, "#d4a64a"); px(rx + rw - 4, ry, 1, rh, "#d4a64a");
  for (let yy = ry + 6; yy < ry + rh; yy += 12) px(rx + rw / 2 - 1, yy, 2, 2, "rgba(212,166,74,.5)");
  // 恐龍台座：金邊的低台
  const cx = PLATFORM.cx * T, cy = PLATFORM.cy * T;
  x.fillStyle = "#0f1930"; x.beginPath(); x.ellipse(cx, cy, 46, 22, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#8a6420"; x.lineWidth = 2; x.stroke();
  x.fillStyle = "#1c2b4c"; x.beginPath(); x.ellipse(cx, cy - 2, 42, 18, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "rgba(212,166,74,.55)"; x.lineWidth = 1; x.beginPath(); x.ellipse(cx, cy - 2, 42, 18, 0, 0, Math.PI * 2); x.stroke();
  px(cx - 6, cy + 14, 12, 3, "#d4a64a");
  // 長椅
  for (const b of BENCHES) paintBench(x, b.x * T, b.y * T);
  // 黃銅立燈（夜裡也亮著一點）
  for (const l of LAMPS) { const X = l.x * T, Y = l.y * T;
    px(X - 4, Y + 10, 8, 3, "#8a6420"); px(X - 1, Y - 8, 2, 18, "#b38a3b"); px(X - 4, Y - 13, 8, 5, "#d4a64a"); px(X - 3, Y - 8, 6, 1, "#fff3cf"); }
  return c;
}
function paintFloor(x, X, Y, tx, ty, kind, h) {
  const px = (a, b, w, hh, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, hh); };
  if (kind === "marble") {
    px(0, 0, T, T, (tx + ty) % 2 ? "#1c2a49" : "#17223d");
    px(0, 0, T, 1, "rgba(255,255,255,.04)"); px(0, 0, 1, T, "rgba(255,255,255,.03)");
    if (h % 5 === 0) { px(3 + h % 7, 4 + h % 5, 1, 1, "rgba(207,217,232,.12)"); px(4 + h % 7, 5 + h % 5, 1, 1, "rgba(207,217,232,.09)"); }
  } else if (kind === "parquet") {
    for (let r = 0; r < 4; r++) {
      const off = (r + ty) % 2 ? 8 : 0, cols = ["#2a2230", "#251e2b", "#2e2534"];
      px(0, r * 4, T, 4, cols[(h >> r) % 3]); px((off + 7) % T, r * 4, 1, 4, "#1b1520"); px(0, r * 4 + 3, T, 1, "#1d1723");
    }
  } else if (kind === "carpet") {
    px(0, 0, T, T, "#141e37");
    if ((tx + ty) % 2 === 0) { px(7, 7, 2, 2, "rgba(212,166,74,.22)"); } else { px(3, 3, 1, 1, "rgba(212,166,74,.14)"); px(12, 12, 1, 1, "rgba(212,166,74,.14)"); }
  } else if (kind === "slate") {
    px(0, 0, T, T, h % 3 ? "#1b2641" : "#1e2a47"); px(0, T - 1, T, 1, "#121a2f"); px(T - 1, 0, 1, T, "#121a2f");
    if (h % 7 === 0) px(5, 6, 2, 1, "rgba(207,217,232,.08)");
  } else if (kind === "check") {
    px(0, 0, T, T, (tx + ty) % 2 ? "#2a3858" : "#1a2846");
  } else { // 通道：深色地毯＋兩條金邊
    px(0, 0, T, T, "#121a31");
    px(0, 0, T, T, "rgba(255,255,255,0)");
    if ((tx + ty) % 2) px(7, 7, 2, 2, "rgba(212,166,74,.14)");
  }
}
// 牆面兩排：上排是牆、下排是護牆板＋踢腳
function paintFace(x, X, Y, row) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  if (row === 0) {
    px(0, 0, T, T, "#1c2b4c"); px(0, 0, T, 3, "#0e1729"); px(0, 3, T, 1, "rgba(212,166,74,.35)");
    if ((X / T) % 4 === 0) px(0, 4, 1, 12, "rgba(0,0,0,.25)");
  } else {
    px(0, 0, T, T, "#1c2b4c"); px(0, 3, T, 1, "#8a6420"); px(0, 4, T, 9, "#131e37");
    px(2, 6, T - 4, 5, "rgba(0,0,0,0)"); x.strokeStyle = "rgba(232,200,137,.18)"; x.lineWidth = 1; x.strokeRect(X + 2.5, Y + 5.5, T - 5, 5);
    px(0, 13, T, 3, "#0a1020");
  }
}
function paintWindow(x, X, Y) {
  // 12×22 拱窗，月光從這裡進來
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  px(1, 3, 14, 21, "#0e1729");
  px(3, 3, 10, 19, "#2d4878"); px(4, 2, 8, 1, "#2d4878"); px(5, 1, 6, 1, "#2d4878");
  px(3, 3, 10, 6, "#3a5a91");
  px(7, 2, 2, 20, "#0e1729"); px(3, 10, 10, 1, "#0e1729"); px(3, 16, 10, 1, "#0e1729");
  px(4, 4, 2, 4, "rgba(255,255,255,.18)");
  px(1, 22, 14, 2, "#2a3c63"); px(1, 22, 14, 1, "rgba(232,200,137,.5)");
}
function paintPlinth(x, X, Y) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  px(1, 3, 14, 13, "#0a1020");
  px(2, 3, 12, 4, "#2f4775"); px(2, 7, 12, 1, "#d4a64a"); px(2, 8, 12, 7, "#1d2c4f"); px(2, 15, 12, 1, "#0a1020");
  px(6, 10, 4, 2, "#e8c889");
}
function paintBench(x, X, Y) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  px(1, 5, 30, 8, "#0a1020"); px(2, 5, 28, 5, "#34497a"); px(2, 5, 28, 1, "#4d6390"); px(2, 10, 28, 1, "#d4a64a");
  px(3, 11, 2, 4, "#8a6420"); px(27, 11, 2, 4, "#8a6420");
}
const BENCHES = [{ x: 26, y: 28 }, { x: 38, y: 28 }];
const LAMPS = [{ x: 25, y: 18.4 }, { x: 41, y: 18.4 }, { x: 25, y: 30.4 }, { x: 41, y: 30.4 }];
const STATUES = [{ x: 25.5, y: 20 }, { x: 40.5, y: 20 }];
const PORTRAITS = [{ x: 27.5 }, { x: 38.5 }];
const GUARD_AT = { x: 29.5 * T, y: 30 * T + 10 };

/* ================================================================ */
export function createMap(root, opt) {
  const { floors, exhibits, reduced } = opt;
  const coarse = matchMedia("(pointer: coarse)").matches;
  root.innerHTML = `
    <canvas class="m-cv"></canvas>
    <div class="m-layer"></div>
    <div class="m-joy" hidden><span></span></div>
    <p class="m-banner" hidden></p>
    <p class="m-help" hidden></p>
    <button class="m-act" type="button" hidden></button>`;
  const q = s => root.querySelector(s);
  const cv = q(".m-cv"), layer = q(".m-layer"), joyEl = q(".m-joy"), banner = q(".m-banner"), help = q(".m-help"), act = q(".m-act");
  const sctx = cv.getContext("2d");
  const fc = document.createElement("canvas"), fx = fc.getContext("2d");   // 一張世界解析度的畫面
  const lc = document.createElement("canvas"), lx = lc.getContext("2d");   // 夜色

  /* ---------- 展廳與展品 ---------- */
  const grid = buildGrid();
  const halls = {};  // 展廳 id（west…）→ 樓層資料
  WINGS.forEach((w, i) => { if (floors[i]) halls[w] = floors[i]; });
  const slots = [], wins = [];
  for (const w of WINGS) {
    const f = halls[w]; if (!f) continue;
    const r = ROOMS[w], list = exhibits.filter(e => e.floor === f.id);
    // 台座排在牆面下第一排；商店避開中間的入口
    const cols = [];
    for (let tx = r.x + 1; tx < r.x + r.w - 1; tx++) if (!(w === "south" && tx >= DOORS.south.x - 1 && tx <= DOORS.south.x + DOORS.south.w)) cols.push(tx);
    list.forEach((e, i) => {
      const tx = w === "south" ? cols[Math.min(i, cols.length - 1)] : cols[Math.round((i + 1) * (cols.length + 1) / (list.length + 1)) - 1];
      slots.push({ e, w, tx, ty: r.y + 2 });
    });
    // 窗：台座之間的牆面
    const xs = slots.filter(s => s.w === w).map(s => s.tx);
    for (let k = 0; k < xs.length - 1; k++) if (xs[k + 1] - xs[k] >= 3) wins.push({ x: Math.floor((xs[k] + xs[k + 1]) / 2) * T + (((xs[k] + xs[k + 1]) % 2) ? 8 : 0), y: r.y * T + 4, w });
  }
  const blocked = new Set(slots.map(s => s.tx + "," + s.ty));
  for (const b of BENCHES) { blocked.add(b.x + "," + b.y); blocked.add((b.x + 1) + "," + b.y); }
  for (const s of STATUES) blocked.add(Math.floor(s.x) + "," + s.y);
  for (const l of LAMPS) blocked.add(Math.floor(l.x) + "," + Math.floor(l.y));
  blocked.add(Math.floor(GUARD_AT.x / T) + "," + Math.floor(GUARD_AT.y / T));
  const mapCv = paintMap(grid, slots, wins);
  const walkable = (wx, wy) => {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
    return grid[ty][tx] === 1 && !blocked.has(tx + "," + ty);
  };

  /* ---------- 會動的東西 ---------- */
  const MOVES = { hop: 46, roll: 54, waddle: 38, float: 30, scuttle: 50, spin: 34, tilt: 30, slide: 36, wobble: 32, none: 0 };
  const items = slots.map(s => {
    const r = ROOMS[s.w];
    const home = { x: s.tx * T + 8, y: s.ty * T + 6 };
    const move = s.e.status === "renovating" ? "none" : (s.e.persona?.move || "hop");
    return { ...s, home, x: home.x, y: home.y, state: "home", move, speed: MOVES[move] || 40, t: rnd(0, 6), wait: rnd(1.5, 5), vx: 0, quipShown: false,
      box: { x0: (r.x + 1) * T + 8, x1: (r.x + r.w - 1) * T - 8, y0: (r.y + 3) * T + 8, y1: (r.y + r.h) * T - 6 } };
  });
  const dino = { x: PLATFORM.cx * T, y: PLATFORM.cy * T + 4, tx: 0, ty: 0, state: "stand", wait: 2, face: -1, jaw: 0, jawT: rnd(2, 5), hop: 0, legT: 0, leg: 0, talkT: 0 };
  const statues = STATUES.map(s => ({ x: s.x * T, y: s.y * T + T, pose: 0, near: false }));
  const p = { x: SPAWN.x, y: SPAWN.y, dir: "up", ang: -Math.PI / 2, moving: false, frameT: 0, frame: 0 };

  /* ---------- 白天的遊客：安靜地逛，停在展品前看一下、坐長椅休息；不說話、不擋路 ---------- */
  const LOOKS = [
    { hair: "h", hairS: "H", coat: "x", coatS: "X", pants: "p", bag: "q", bagS: "Q" },
    { hair: "l", hairS: "L", coat: "q", coatS: "Q", pants: "P", bag: "t", bagS: "T", glasses: true },
    { hair: "H", hairS: "h", coat: "y", coatS: "Y", pants: "p", bag: "x", bagS: "X", kid: true },
    { hair: "z", hairS: "k", coat: "N", coatS: "n", pants: "P", bag: "d", bagS: "D" },
    { hair: "h", hairS: "H", coat: "d", coatS: "D", pants: "P", bag: "g", bagS: "b", kid: true },
    { hair: "H", hairS: "h", coat: "q", coatS: "Q", pants: "p", bag: "F", bagS: "q", glasses: true },
    { hair: "k", hairS: "z", coat: "i", coatS: "I", pants: "p", bag: "y", bagS: "Y" },
    { hair: "h", hairS: "H", coat: "y", coatS: "Y", pants: "P", bag: "t", bagS: "T" },
    { hair: "z", hairS: "k", coat: "x", coatS: "X", pants: "p", bag: "e", bagS: "E", kid: true }
  ];
  // 從一個廳走到另一個廳：先走到自己廳的門口、穿過通道、到大廳，再走進目標廳
  const GATE = { west: [[18.4, 25.5], [24.8, 25.5]], north: [[33, 12.3], [33, 18.8]], east: [[46.6, 25.5], [41.2, 25.5]], south: [[33, 37.7], [33, 30.4]] };
  const spots = [
    ...slots.map(s => ({ x: s.tx * T + 8 + rnd(-3, 3), y: (s.ty + 1) * T + 14, face: "up", stay: [3, 7] })),
    ...BENCHES.map(b => ({ x: b.x * T + 16 + rnd(-6, 6), y: b.y * T + 22, face: "down", stay: [5, 9] })),
    { x: PLATFORM.cx * T - 30, y: PLATFORM.cy * T + 30, face: "up", stay: [3, 6] }, { x: PLATFORM.cx * T + 30, y: PLATFORM.cy * T + 30, face: "up", stay: [3, 6] }
  ].filter(sp => walkable(sp.x, sp.y - 2));
  const spotRoom = sp => roomAt(Math.floor(sp.x / T), Math.floor((sp.y - 4) / T)) || "hall";
  const visitors = LOOKS.map((look, i) => {
    const sp = spots[(i * 5) % spots.length];
    return { look: visitor(look), key: "v" + i, kid: !!look.kid, x: sp.x, y: sp.y, dir: sp.face, frame: 0, frameT: 0, path: [], wait: rnd(1, 6), speed: rnd(26, 36) };
  });
  function routeTo(v, sp) {
    const from = roomAt(Math.floor(v.x / T), Math.floor((v.y - 4) / T)) || "hall", to = spotRoom(sp), pts = [];
    if (from !== to) {
      if (from !== "hall") pts.push(GATE[from][0], GATE[from][1]);
      if (to !== "hall") pts.push(GATE[to][1], GATE[to][0]);
    }
    v.path = [...pts.map(([x, y]) => ({ x: x * T + rnd(-6, 6), y: y * T + rnd(-4, 4) })), { x: sp.x, y: sp.y }];
    v.goal = sp;
  }
  function updateVisitor(v, dt) {
    if (reduced) return;
    if (!v.path.length) {
      v.frame = 0; v.wait -= dt;
      if (v.wait <= 0) routeTo(v, spots[Math.floor(Math.random() * spots.length)]);
      return;
    }
    const t = v.path[0], dx = t.x - v.x, dy = t.y - v.y, l = Math.hypot(dx, dy);
    if (l < 1.5) {
      v.path.shift();
      if (!v.path.length) { v.dir = v.goal.face; v.wait = rnd(...v.goal.stay); }
      return;
    }
    const st = Math.min(l, v.speed * dt);
    v.x += dx / l * st; v.y += dy / l * st;
    v.dir = Math.abs(dx) > Math.abs(dy) * .9 ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
    v.frameT += dt; if (v.frameT > .16) { v.frameT = 0; v.frame = v.frame === 1 ? 2 : 1; }
  }

  let night = true, running = false, raf = 0, last = 0;
  let S = 3, K = 3, vw = 0, vh = 0, dpr = 1, camX = 0, camY = 0, curRoom = "hall", target = null, helpShown = false;
  const keys = new Set();
  const joy = { id: null, bx: 0, by: 0, dx: 0, dy: 0 };

  /* ---------- 牌子、對話泡泡（DOM，跟著鏡頭移動） ---------- */
  const signs = WINGS.filter(w => halls[w]).map(w => {
    const f = halls[w], d = DOORS[w];
    const el = document.createElement("span"); el.className = "m-sign";
    el.innerHTML = `<i>${esc(f.numeral || "")}</i>${esc(f.name)}`;
    layer.appendChild(el);
    return { el, x: d.sign[0] * T, y: d.sign[1] * T };
  });
  const exitSign = document.createElement("span"); exitSign.className = "m-sign m-exit"; exitSign.innerHTML = "出口<i>EXIT</i>";
  layer.appendChild(exitSign); signs.push({ el: exitSign, x: (EXIT.x + 1) * T, y: EXIT.y * T + 2 });
  const plat = document.createElement("span"); plat.className = "m-sign m-plat"; plat.textContent = "鎮館之寶";
  layer.appendChild(plat); signs.push({ el: plat, x: PLATFORM.cx * T, y: PLATFORM.cy * T + 26 });
  const bubbles = [];
  function say(who, text, ms = 3200) {
    let b = bubbles.find(b => b.who === who);
    if (!b) { b = { who, el: document.createElement("p") }; b.el.className = "m-bubble"; layer.appendChild(b.el); bubbles.push(b); }
    b.el.innerHTML = text; b.until = performance.now() + ms; b.el.hidden = false;
    b.el.classList.remove("in"); void b.el.offsetWidth; b.el.classList.add("in");
  }

  /* ---------- 尺寸 ---------- */
  function resize() {
    const W = root.clientWidth || innerWidth, H = root.clientHeight || innerHeight;
    // 放大倍率 k＝一個地圖像素佔幾個螢幕實體像素（一定是整數，才不會有的粗有的細）
    dpr = Math.min(3, window.devicePixelRatio || 1);
    const want = clamp(Math.min(W, H * 1.6) / 660, 1.33, 3);
    K = Math.max(2, Math.round(want * dpr));
    S = K / dpr;
    vw = Math.ceil(W / S) + 1; vh = Math.ceil(H / S) + 1;
    fc.width = lc.width = vw; fc.height = lc.height = vh;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    root.style.setProperty("--s", S + "px");
  }

  /* ---------- 每一格 ---------- */
  function frame(t) {
    if (!running) return;
    const dt = Math.min(.05, (t - last) / 1000 || 0); last = t;
    update(dt, t / 1000);
    render(t / 1000);
    raf = requestAnimationFrame(frame);
  }
  function inputVec() {
    let x = 0, y = 0;
    if (keys.has("l")) x -= 1; if (keys.has("r")) x += 1; if (keys.has("u")) y -= 1; if (keys.has("d")) y += 1;
    if (joy.id !== null) { const l = Math.hypot(joy.dx, joy.dy); if (l > 8) { x = joy.dx / l * Math.min(1, l / 36); y = joy.dy / l * Math.min(1, l / 36); } }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }
  function update(dt, ts) {
    const blockedNow = opt.blocked();
    let { x: ix, y: iy } = blockedNow ? { x: 0, y: 0 } : inputVec();
    // 點一下目的地（目前只有出口的提示會用到）
    if (!ix && !iy && target) { const dx = target.x - p.x, dy = target.y - p.y, d = Math.hypot(dx, dy); if (d < 3) target = null; else { ix = dx / d; iy = dy / d; } }
    const sp = 133;
    p.moving = !!(ix || iy);
    if (p.moving) {
      if (helpShown) hideHelp();
      p.ang = Math.atan2(iy, ix);
      p.dir = Math.abs(ix) > Math.abs(iy) * .9 ? (ix < 0 ? "left" : "right") : (iy < 0 ? "up" : "down");
      const nx = p.x + ix * sp * dt, ny = p.y + iy * sp * dt;
      const fits = (X, Y) => walkable(X - 5, Y - 1) && walkable(X + 5, Y - 1) && walkable(X - 5, Y - 5) && walkable(X + 5, Y - 5);
      if (fits(nx, p.y)) p.x = nx;
      if (fits(p.x, ny)) p.y = ny;
      p.frameT += dt; if (p.frameT > .1) { p.frameT = 0; p.frame = p.frame === 1 ? 2 : 1; }
    } else { p.frame = 0; p.frameT = 0; }
    if (reduced) p.frame = 0;
    // 換房間：上方浮出廳名
    const room = roomAt(Math.floor(p.x / T), Math.floor((p.y - 4) / T));
    if (room && room !== curRoom) { curRoom = room; showBanner(room); }
    // 展品
    for (const it of items) updateItem(it, dt, ts);
    if (!night) for (const v of visitors) updateVisitor(v, dt);
    updateDino(dt, ts);
    for (const s of statues) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (!night || reduced) { s.pose = 0; s.near = false; continue; }
      if (d < 30) s.near = true;
      else if (s.near && d > 44) { s.near = false; s.pose = 1 - s.pose; }
    }
    // 警衛
    const gd = Math.hypot(p.x - GUARD_AT.x, p.y - GUARD_AT.y);
    if (gd < 40 && !update.guardOn) { update.guardOn = true; const l = opt.guardLine(night); say("guard", `<b>${night ? "夜班警衛" : "警衛"}</b>${esc(l.zh)}${l.en ? `<i>${esc(l.en)}</i>` : ""}`, 4200); }
    else if (gd > 70) update.guardOn = false;
    // 鏡頭：跟著人，小地圖置中
    const mw = MW * T, mh = MH * T;
    camX = mw <= vw ? Math.round((mw - vw) / 2) : clamp(Math.round(p.x) - (vw >> 1), 0, mw - vw);
    camY = mh <= vh ? Math.round((mh - vh) / 2) : clamp(Math.round(p.y) - 10 - (vh >> 1), 0, mh - vh);
    nearest();
  }
  function updateItem(it, dt, ts) {
    const d = Math.hypot(p.x - it.home.x, p.y - (it.home.y + 14));
    const dp = Math.hypot(p.x - it.x, p.y - it.y);
    it.t += dt;
    if (!night || reduced || it.move === "none") { it.x = it.home.x; it.y = it.home.y; it.state = "home"; return; }
    if (it.state === "home") {
      if (d > 120) { it.wait -= dt; if (it.wait <= 0) { it.state = "roam"; pickTarget(it); } }
      else it.wait = rnd(2, 5);
    } else if (it.state === "roam") {
      if (dp < 52 || d < 40) { it.state = "flee"; return; }
      if (it.pause > 0) { it.pause -= dt; it.vx = 0; return; }
      const dx = it.tx - it.x, dy = it.ty - it.y, l = Math.hypot(dx, dy);
      if (l < 2) { it.pause = rnd(.4, 1.6); pickTarget(it); return; }
      it.vx = dx / l; it.x += dx / l * it.speed * dt; it.y += dy / l * it.speed * dt;
    } else if (it.state === "flee") {
      const dx = it.home.x - it.x, dy = it.home.y - it.y, l = Math.hypot(dx, dy);
      if (l < 2) {
        it.x = it.home.x; it.y = it.home.y; it.state = "home"; it.vx = 0; it.wait = rnd(3, 6);
        // 被抓到了：跑回台座裝死，順便說一句
        if (it.e.persona?.quip && d < 90) say("item" + it.e.id, esc(it.e.persona.quip), 3400);
        return;
      }
      it.vx = dx / l; const sp = Math.max(130, it.speed * 2.6);
      it.x += dx / l * Math.min(l, sp * dt); it.y += dy / l * Math.min(l, sp * dt);
    }
  }
  function pickTarget(it) { it.tx = rnd(it.box.x0, it.box.x1); it.ty = rnd(it.box.y0, it.box.y1); }
  function updateDino(dt, ts) {
    const r = ROOMS.hall;
    const home = { x: PLATFORM.cx * T, y: PLATFORM.cy * T + 4 };
    const d = Math.hypot(p.x - dino.x, p.y - dino.y);
    dino.hop = Math.max(0, dino.hop - dt);
    dino.talkT = Math.max(0, dino.talkT - dt);
    if (!night || reduced) { Object.assign(dino, home); dino.state = "stand"; dino.face = -1; dino.jaw = 0; dino.leg = 0; return; }
    // 嘴巴偶爾張開
    dino.jawT -= dt; if (dino.jawT <= 0) { dino.jaw = dino.jaw ? 0 : 1; dino.jawT = dino.jaw ? .55 : rnd(2.5, 5.5); }
    // 靠太近：跳一下
    if (d < 34 && dino.talkT <= 0) {
      dino.hop = .35; dino.talkT = 7;
      const lines = ["喀啦。", "（牠歪頭看了你一眼。）", "吼——（骨頭版）", "（牠假裝自己只是一堆骨頭。）"];
      say("dino", lines[Math.floor(Math.random() * lines.length)], 2600);
    }
    if (dino.state === "stand") {
      dino.wait -= dt;
      if (d < 120) dino.face = p.x < dino.x ? -1 : 1;     // 停下來時轉頭看你
      if (dino.wait <= 0) { dino.state = "walk"; dino.tx = rnd((r.x + 4) * T, (r.x + r.w - 4) * T); dino.ty = rnd((r.y + 5) * T, (r.y + r.h - 4) * T); }
    } else {
      const dx = dino.tx - dino.x, dy = dino.ty - dino.y, l = Math.hypot(dx, dy);
      if (l < 2) { dino.state = "stand"; dino.wait = rnd(1.6, 3.4); dino.leg = 0; return; }
      dino.face = dx < 0 ? -1 : 1;
      dino.x += dx / l * 20 * dt; dino.y += dy / l * 20 * dt;
      dino.legT += dt; if (dino.legT > .32) { dino.legT = 0; dino.leg = 1 - dino.leg; }
    }
  }

  /* ---------- 靠近什麼就提示什麼 ---------- */
  let near = null;
  function nearest() {
    let best = null, bd = 26;
    for (const it of items) {
      if (it.state !== "home") continue;
      const d = Math.hypot(p.x - it.home.x, p.y - (it.home.y + 16));
      if (d < bd) { bd = d; best = { kind: "item", it }; }
    }
    const ex = Math.hypot(p.x - (EXIT.x + 1) * T, p.y - EXIT.y * T);
    if (ex < 28) best = { kind: "exit" };
    const key = best ? (best.kind === "item" ? best.it.e.id : "exit") : "";
    if (key === nearest.key) return;
    nearest.key = key; near = best;
    if (!best) { act.hidden = true; return; }
    const how = coarse ? "" : "<kbd>空白鍵</kbd>";
    act.innerHTML = best.kind === "item"
      ? `<b>${esc(best.it.e.title)}</b><span>看說明牌${how}</span>`
      : `<b>出口</b><span>回到售票口${how}</span>`;
    act.hidden = false;
    // 白天第一次走近，也讓它說一句
    if (best.kind === "item" && !best.it.quipShown && best.it.e.persona?.quip) { best.it.quipShown = true; if (!night || reduced) say("item" + best.it.e.id, esc(best.it.e.persona.quip), 3400); }
  }
  function interact() {
    if (!near || opt.blocked()) return;
    if (near.kind === "item") opt.openPlacard(near.it.e, act);
    else opt.exit();
  }

  /* ---------- 畫面 ---------- */
  function render(ts) {
    const cx = Math.round(camX), cy = Math.round(camY);
    fx.imageSmoothingEnabled = false;
    fx.globalCompositeOperation = "source-over";
    fx.fillStyle = "#04070e"; fx.fillRect(0, 0, vw, vh);
    fx.drawImage(mapCv, -cx, -cy);
    // 畫像：夜裡眼睛跟著你
    for (const pt of PORTRAITS) drawPortrait(pt.x * T - cx, ROOMS.hall.y * T + 2 - cy, pt.x * T);
    // 白天：窗外是天光
    if (!night) for (const w of wins) {
      const X = w.x - cx, Y = w.y - cy, f = (a, b, ww, hh, c) => { fx.fillStyle = c; fx.fillRect(X + a, Y + b, ww, hh); };
      f(3, 3, 10, 19, "#a9c6e4"); f(4, 2, 8, 1, "#a9c6e4"); f(5, 1, 6, 1, "#a9c6e4"); f(3, 3, 10, 6, "#d6e6f5");
      f(7, 2, 2, 20, "#0e1729"); f(3, 10, 10, 1, "#0e1729"); f(3, 16, 10, 1, "#0e1729"); f(4, 4, 2, 4, "rgba(255,255,255,.5)");
    }
    // 台座上的玻璃罩
    for (const it of items) {
      const X = it.tx * T - cx, Y = it.ty * T - cy;
      fx.fillStyle = "rgba(207,217,232,.07)"; fx.fillRect(X + 2, Y - 12, 12, 15);
      fx.fillStyle = "rgba(207,217,232,.32)"; fx.fillRect(X + 2, Y - 12, 12, 1); fx.fillRect(X + 2, Y - 12, 1, 15); fx.fillRect(X + 13, Y - 12, 1, 15);
    }
    // 要排前後的東西：腳的位置越下面越後畫
    const list = [];
    for (const it of items) list.push({ y: it.y + (it.state === "home" ? -20 : 0), draw: () => drawItem(it, ts, cx, cy) });
    list.push({ y: dino.y, draw: () => drawDino(cx, cy) });
    for (const s of statues) list.push({ y: s.y, draw: () => blit(sprite(STATUE[s.pose], "st" + s.pose), s.x - 8 - cx, s.y - 24 - cy) });
    if (!night) for (const v of visitors) list.push({ y: v.y, draw: () => blit(sprite(v.look[v.dir + v.frame], v.key + v.dir + v.frame), Math.round(v.x) - 8 - cx, Math.round(v.y) - (v.kid ? 21 : 24) - cy) });
    list.push({ y: GUARD_AT.y, draw: () => blit(sprite(GUARD, "guard"), GUARD_AT.x - 8 - cx, GUARD_AT.y - 24 - cy) });
    list.push({ y: p.y, draw: () => blit(sprite(TEACHER[p.dir + p.frame], "t" + p.dir + p.frame), Math.round(p.x) - 8 - cx, Math.round(p.y) - 24 - cy) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    // 可以互動的東西頭上一個小金箭頭
    if (near) {
      const bob = reduced ? 0 : Math.round(Math.sin(ts * 5) * 1.5);
      const ax = near.kind === "item" ? near.it.home.x : (EXIT.x + 1) * T, ay = near.kind === "item" ? near.it.home.y - 22 : EXIT.y * T - 6;
      drawArrow(ax - cx, ay - cy + bob);
    }
    if (night) lightPass(cx, cy, ts); else litPass(cx, cy);
    // 放大到螢幕
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(fc, 0, 0, vw, vh, 0, 0, vw * K, vh * K);
    placeDom(cx, cy);
  }
  function blit(img, X, Y, flip) { fx.drawImage(flip ? flipped(img, img.__k || (img.__k = "f" + Math.random())) : img, Math.round(X), Math.round(Y)); }
  function drawArrow(X, Y) {
    fx.fillStyle = "#0a0e1a"; fx.fillRect(X - 4, Y - 1, 9, 1); fx.fillRect(X - 3, Y, 7, 1);
    fx.fillStyle = "#f3d895"; fx.fillRect(X - 3, Y - 4, 7, 3); fx.fillRect(X - 2, Y - 1, 5, 1); fx.fillRect(X - 1, Y, 3, 1); fx.fillRect(X, Y + 1, 1, 1);
  }
  function drawItem(it, ts, cx, cy) {
    const img = sprite(ITEMS[it.e.object] || ITEMS.lantern, "it" + it.e.object);
    let X = it.x - 8 - cx, Y = it.y - 16 - cy, flip = it.vx < -.1;
    if (it.state !== "home" && !reduced) {
      const ph = it.t;
      if (it.move === "hop") Y -= Math.round(Math.abs(Math.sin(ph * 9)) * 4);
      else if (it.move === "waddle") { flip = Math.floor(ph * 6) % 2 ? !flip : flip; Y -= Math.floor(ph * 6) % 2; }
      else if (it.move === "float") Y -= Math.round(2 + Math.sin(ph * 3) * 2);
      else if (it.move === "scuttle") Y -= Math.floor(ph * 16) % 2;
      else if (it.move === "tilt" || it.move === "wobble") X += Math.floor(ph * 5) % 2 ? 1 : -1;
      else if (it.move === "slide") Y -= Math.floor(ph * 4) % 2;
      if (it.move === "roll" || it.move === "spin") {
        // 滾動：九十度一格一格轉，像素才不會糊
        const q = it.move === "roll" ? Math.floor(ph * 10) % 4 : (Math.floor(ph * 3) % 2) * 2;
        fx.save(); fx.translate(Math.round(X) + 8, Math.round(Y) + 8); fx.rotate(q * Math.PI / 2); fx.drawImage(img, -8, -8); fx.restore();
        shadow(it.x - cx, it.y - cy);
        return;
      }
      shadow(it.x - cx, it.y - cy);
    }
    blit(img, X, Y, flip);
    if (it.e.status === "renovating") {
      // 整修中：蓋一塊布
      fx.fillStyle = "#5e4428"; fx.fillRect(Math.round(X) + 2, Math.round(Y) + 3, 12, 13);
      fx.fillStyle = "#7a5c35"; for (let i = 0; i < 12; i += 3) fx.fillRect(Math.round(X) + 2 + i, Math.round(Y) + 3, 1, 13);
      fx.fillStyle = "#4a3520"; fx.fillRect(Math.round(X) + 3, Math.round(Y) + 2, 10, 1);
    }
  }
  function shadow(X, Y) { fx.fillStyle = "rgba(0,0,0,.35)"; fx.fillRect(Math.round(X) - 5, Math.round(Y), 10, 2); }
  function drawDino(cx, cy) {
    const key = (dino.jaw ? "open" : "shut") + dino.leg;
    const img = sprite(DINO[key], "dino" + key);
    const hop = dino.hop > 0 ? Math.round(Math.sin((.35 - dino.hop) / .35 * Math.PI) * 5) : 0;
    fx.fillStyle = "rgba(0,0,0,.35)"; fx.fillRect(Math.round(dino.x - cx) - 16, Math.round(dino.y - cy) - 1, 30, 3);
    blit(img, dino.x - 20 - cx, dino.y - 26 - hop - cy, dino.face > 0);
  }
  function drawPortrait(X, Y, wx) {
    X = Math.round(X); Y = Math.round(Y);
    const f = (a, b, w, h, c) => { fx.fillStyle = c; fx.fillRect(X + a, Y + b, w, h); };
    f(-7, 4, 14, 17, "#0a0e1a"); f(-6, 5, 12, 15, "#d4a64a"); f(-5, 6, 10, 13, "#8a6420"); f(-4, 7, 8, 11, "#1a1424");
    f(-3, 9, 6, 7, "#e2c3a0"); f(-3, 8, 6, 2, "#3b2a20"); f(-4, 9, 1, 4, "#3b2a20"); f(3, 9, 1, 4, "#3b2a20");
    f(-2, 16, 4, 2, "#2f4775");
    // 眼睛：夜裡往你的方向看
    let ex = 0, ey = 0;
    if (night && !reduced) { const dx = p.x - wx; ex = dx < -20 ? -1 : dx > 20 ? 1 : 0; ey = p.y > (ROOMS.hall.y + 6) * T ? 1 : 0; }
    f(-2, 11, 2, 2, "#f4efe2"); f(1, 11, 2, 2, "#f4efe2");
    f(-2 + (ex > 0 ? 1 : 0), 11 + ey, 1, 1, "#0a0e1a"); f(1 + (ex > 0 ? 1 : 0), 11 + ey, 1, 1, "#0a0e1a");
    f(-1, 14, 2, 1, "#a0705a");
  }
  // 夜色：整片暗，挖出光
  function lightPass(cx, cy, ts) {
    lx.globalCompositeOperation = "source-over";
    lx.clearRect(0, 0, vw, vh);
    lx.fillStyle = "rgba(3,6,14,.9)"; lx.fillRect(0, 0, vw, vh);
    lx.globalCompositeOperation = "destination-out";
    const glow = (X, Y, r, a, sy = 1) => {
      lx.save(); lx.translate(X, Y); lx.scale(1, sy);
      const g = lx.createRadialGradient(0, 0, 0, 0, 0, r); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, "rgba(0,0,0,0)");
      lx.fillStyle = g; lx.beginPath(); lx.arc(0, 0, r, 0, Math.PI * 2); lx.fill(); lx.restore();
    };
    // 月光：大廳天窗正下方一圈、每扇窗和它落在地上的光
    glow(PLATFORM.cx * T - cx, PLATFORM.cy * T - cy, 74, .55, .7);
    for (const w of wins) {
      glow(w.x + 8 - cx, w.y + 12 - cy, 18, .75, 1.3);
      lx.fillStyle = "rgba(0,0,0,.22)"; lx.beginPath();
      const X = w.x - cx, Y = w.y + 30 - cy;
      lx.moveTo(X + 2, Y); lx.lineTo(X + 14, Y); lx.lineTo(X + 30, Y + 34); lx.lineTo(X + 18, Y + 34); lx.closePath(); lx.fill();
    }
    // 台座上的小燈：展品在家時亮一點
    for (const it of items) glow(it.home.x - cx, it.home.y - 6 - cy, it.state === "home" ? 20 : 12, it.state === "home" ? .55 : .3);
    for (const pt of PORTRAITS) glow(pt.x * T - cx, ROOMS.hall.y * T + 14 - cy, 16, .45);
    for (const s of signs) glow(s.x - cx, s.y - cy, 18, .35, .6);
    glow((EXIT.x + 1) * T - cx, EXIT.y * T - cy, 26, .6, .7);
    for (const l of LAMPS) glow(l.x * T - cx, l.y * T - 4 - cy, 30, .55, .8);
    // 自己身邊一圈＋手電筒光錐（三層疊出柔邊）
    const hx = p.x - cx, hy = p.y - 12 - cy;
    glow(hx, hy, 46, .78);
    const cone = (half, a, ctx = lx, col = "0,0,0") => {
      const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 118);
      g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(.55, `rgba(${col},${a * .75})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, 118, p.ang - half, p.ang + half); ctx.closePath(); ctx.fill();
    };
    cone(.5, .45); cone(.36, .45); cone(.22, .4);
    fx.drawImage(lc, 0, 0);
    // 暖金色只給手電筒
    fx.globalCompositeOperation = "lighter";
    cone(.42, .1, fx, "255,196,110");
    for (const l of LAMPS) { const g = fx.createRadialGradient(l.x * T - cx, l.y * T - 8 - cy, 0, l.x * T - cx, l.y * T - 8 - cy, 26); g.addColorStop(0, "rgba(255,200,120,.16)"); g.addColorStop(1, "rgba(255,200,120,0)"); fx.fillStyle = g; fx.fillRect(l.x * T - cx - 26, l.y * T - 34 - cy, 52, 52); }
    fx.globalCompositeOperation = "source-over";
  }
  // 白天：整體提亮一點、天窗灑下一圈日光、每扇窗在地上留一塊光
  function litPass(cx, cy) {
    fx.globalCompositeOperation = "screen";
    fx.fillStyle = "rgba(96,88,72,.3)"; fx.fillRect(0, 0, vw, vh);
    fx.globalCompositeOperation = "lighter";
    const g = fx.createRadialGradient(PLATFORM.cx * T - cx, PLATFORM.cy * T - cy, 0, PLATFORM.cx * T - cx, PLATFORM.cy * T - cy, 120);
    g.addColorStop(0, "rgba(255,232,180,.16)"); g.addColorStop(1, "rgba(255,232,180,0)");
    fx.fillStyle = g; fx.fillRect(0, 0, vw, vh);
    fx.fillStyle = "rgba(255,232,186,.1)";
    for (const w of wins) { const X = w.x - cx, Y = w.y + 30 - cy; fx.beginPath(); fx.moveTo(X + 2, Y); fx.lineTo(X + 14, Y); fx.lineTo(X + 30, Y + 34); fx.lineTo(X + 18, Y + 34); fx.closePath(); fx.fill(); }
    fx.globalCompositeOperation = "source-over";
  }
  function placeDom(cx, cy) {
    const at = (el, X, Y) => { el.style.transform = `translate(${Math.round((X - cx) * S)}px, ${Math.round((Y - cy) * S)}px)`; };
    for (const s of signs) at(s.el, s.x, s.y);
    const now = performance.now();
    for (const b of bubbles) {
      if (b.until < now) { b.el.hidden = true; continue; }
      let X, Y;
      if (b.who === "guard") { X = GUARD_AT.x; Y = GUARD_AT.y - 26; }
      else if (b.who === "dino") { X = dino.x; Y = dino.y - 30; }
      else { const it = items.find(i => "item" + i.e.id === b.who); X = it.x; Y = it.y - 22; }
      at(b.el, X, Y);
    }
  }

  /* ---------- 進館時的提示、廳名 ---------- */
  function showBanner(room) {
    const w = room === "hall" ? null : halls[room];
    banner.innerHTML = w ? `<i>${esc(w.numeral || "")}</i><b>${esc(w.name)}</b><span>${esc(w.en)}</span>` : `<b>大廳</b><span>Grand Hall</span>`;
    banner.hidden = false; banner.classList.remove("in"); void banner.offsetWidth; banner.classList.add("in");
    clearTimeout(showBanner.t); showBanner.t = setTimeout(() => banner.hidden = true, 2600);
  }
  function showHelp() {
    helpShown = true;
    help.textContent = coarse ? "按住畫面任一處拖曳，就能走。走近展品，按下面的按鈕看說明牌。" : "方向鍵或 WASD 走動，空白鍵看說明牌。展品會跑，走近它就乖乖站好。";
    help.hidden = false; help.classList.remove("out");
    clearTimeout(showHelp.t); showHelp.t = setTimeout(hideHelp, 7000);
  }
  function hideHelp() { if (help.hidden || help.classList.contains("out")) return; help.classList.add("out"); setTimeout(() => help.hidden = true, 600); }

  /* ---------- 輸入：鍵盤、拖曳搖桿（按下的地方就是底座） ---------- */
  const KEY = { arrowleft: "l", a: "l", arrowright: "r", d: "r", arrowup: "u", w: "u", arrowdown: "d", s: "d" };
  addEventListener("keydown", e => {
    if (!running || opt.blocked() || e.target.closest?.("input, textarea")) return;
    const k = e.key.toLowerCase();
    if (KEY[k]) { keys.add(KEY[k]); target = null; e.preventDefault(); if (document.activeElement === act) act.blur(); }
    else if ((k === " " || k === "enter" || k === "e") && !e.target.closest?.("button:not(.m-act), a")) { if (!e.repeat) interact(); e.preventDefault(); }
  });
  addEventListener("keyup", e => { const k = KEY[e.key.toLowerCase()]; if (k) keys.delete(k); });
  addEventListener("blur", () => keys.clear());
  const stage = root;
  stage.addEventListener("pointerdown", e => {
    if (!running || e.target.closest("button") || joy.id !== null) return;
    joy.id = e.pointerId; joy.bx = e.clientX; joy.by = e.clientY; joy.dx = joy.dy = 0; target = null;
    stage.setPointerCapture(e.pointerId);
    const r = root.getBoundingClientRect();
    joyEl.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`;
    joyEl.firstElementChild.style.transform = "";
    joyEl.hidden = false;
  });
  stage.addEventListener("pointermove", e => {
    if (e.pointerId !== joy.id) return;
    joy.dx = e.clientX - joy.bx; joy.dy = e.clientY - joy.by;
    const l = Math.hypot(joy.dx, joy.dy), m = Math.min(l, 34);
    joyEl.firstElementChild.style.transform = l ? `translate(${(joy.dx / l * m).toFixed(1)}px, ${(joy.dy / l * m).toFixed(1)}px)` : "";
  });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.dx = joy.dy = 0; joyEl.hidden = true; };
  stage.addEventListener("pointerup", endJoy); stage.addEventListener("pointercancel", endJoy);
  act.addEventListener("click", interact);

  addEventListener("resize", () => { if (running) resize(); });

  function loop() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }
  return {
    // night：true＝夜遊、false＝開館（白天）
    start(isNight) {
      night = isNight; running = true; resize();
      Object.assign(p, { x: SPAWN.x, y: SPAWN.y, dir: "up", ang: -Math.PI / 2, frame: 0 });
      camX = clamp(Math.round(p.x) - (vw >> 1), 0, Math.max(0, MW * T - vw)); camY = clamp(Math.round(p.y) - 10 - (vh >> 1), 0, Math.max(0, MH * T - vh));
      curRoom = "hall"; showBanner("hall"); loop();
      if (!helpShown) showHelp();
    },
    setNight(isNight) { night = isNight; for (const b of bubbles) b.el.hidden = true; },
    resume() { running = true; resize(); loop(); },
    pause() { running = false; cancelAnimationFrame(raf); keys.clear(); joy.id = null; joyEl.hidden = true; },
    stop() { this.pause(); helpShown = false; help.hidden = true; act.hidden = true; nearest.key = null; near = null; },
    get started() { return running || camX !== 0 || camY !== 0; }
  };
}
