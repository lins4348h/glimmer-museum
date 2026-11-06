// 微光博物館｜館內：俯視像素地圖
// 一整張平面：中央大廳（鎮館之寶恐龍骨架、雕像、畫像、警衛），四周四個展廳。廳不大、東西擺得滿，走幾步就看到下一件。
// 夜遊：館內暗，手電筒照路，展品活過來到處亂逛；你一靠近，它就跑回展櫃裝死，這時才能看說明牌。
// 開館（白天）：陽光從窗戶進來，有遊客在逛，展品乖乖待在展櫃裡。
// 先畫一張 1:1 的小畫布（一格 16 像素），再用最近鄰放大到螢幕：放大倍率取「整數個螢幕實體像素」，像素才會銳利。
import { TEACHER, GUARD, STATUE, DINO, ITEMS, PLANT, EASEL, sprite, flipped, visitor } from "./pixels.js";

const T = 16;                 // 一格的像素
const MW = 46, MH = 34;       // 地圖大小（格）
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- 平面圖：房間（含上方兩排牆面）與通道 ---------- */
// 展廳的順序對應 museum.json 的 floors：第 1 個在西、第 2 個在北、第 3 個在東、第 4 個在南（商店）
// 廳與廳之間只隔兩格厚的牆，牆頂畫成石材，不再是黑洞
const ROOMS = {
  hall: { x: 15, y: 12, w: 14, h: 12, floor: "marble" },
  west: { x: 2, y: 12, w: 11, h: 10, floor: "stars" },
  north: { x: 13, y: 2, w: 18, h: 8, floor: "parquet" },
  east: { x: 31, y: 12, w: 14, h: 10, floor: "slate" },
  south: { x: 17, y: 26, w: 10, h: 7, floor: "shop" }
};
const WINGS = ["west", "north", "east", "south"];
const DOORS = {
  west: { x: 13, y: 17, w: 2, h: 3, sign: [14, 16.35] },
  north: { x: 20, y: 10, w: 4, h: 4, sign: [22, 11.55] },
  east: { x: 29, y: 17, w: 2, h: 3, sign: [30, 16.35] },
  south: { x: 20, y: 24, w: 4, h: 4, sign: [22, 25.1] }
};
// 出口：大廳北牆左邊一扇門（跟進館的位置相反，要特地走過去；使用者說不能放在最下面，有人一進來就往下走）
const EXIT = { x: 16, y: 12, w: 2 };
const EXIT_AT = { x: 17 * T, y: 14 * T + 8 };   // 站在門前這一點附近就能按
const PLATFORM = { cx: 22, cy: 18.6 };          // 恐龍台座（大廳正中央）
const SPAWN = { x: 22 * T, y: 22 * T + 10 };

function buildGrid() {
  // 0 實牆、1 地板、2 牆面（房間上方兩排，看得到但走不過去）
  const g = Array.from({ length: MH }, () => new Uint8Array(MW));
  for (const r of Object.values(ROOMS))
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) g[y][x] = y < r.y + 2 ? 2 : 1;
  for (const d of Object.values(DOORS))
    for (let y = d.y; y < d.y + d.h; y++) for (let x = d.x; x < d.x + d.w; x++) g[y][x] = 1;
  return g;
}
const roomAt = (tx, ty) => Object.entries(ROOMS).find(([, r]) => tx >= r.x && tx < r.x + r.w && ty >= r.y + 2 && ty < r.y + r.h)?.[0] || null;
const faceRoom = (tx, ty) => Object.keys(ROOMS).find(k => { const r = ROOMS[k]; return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + 2; });
const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;

/* ---------- 擺設的位置（格） ---------- */
const BENCHES = [{ x: 17, y: 20 }, { x: 25, y: 20 }];
const LAMPS = [{ x: 15.5, y: 14.4 }, { x: 28.5, y: 14.4 }, { x: 15.5, y: 23.4 }, { x: 28.5, y: 23.4 }];
const STATUES = [{ x: 19.5, y: 14 }, { x: 24.5, y: 14 }];
const PORTRAITS = [{ x: 19 }, { x: 25.5 }];
const PLANTS = [{ x: 15.5, y: 16.6 }, { x: 28.5, y: 16.6 }, { x: 2.5, y: 21.6 }, { x: 12.5, y: 21.6 }, { x: 13.5, y: 9.6 }, { x: 30.5, y: 9.6 }, { x: 31.5, y: 21.6 }, { x: 44.5, y: 21.6 }, { x: 17.5, y: 32.6 }];
const EASELS = [{ x: 25.5, y: 22.6 }];
const SHELVES = [{ x: 23, y: 28 }, { x: 25, y: 28 }];
const GUARD_AT = { x: 19 * T + 8, y: 22 * T + 10 };

/* ---------- 地圖底圖（只畫一次） ---------- */
function paintMap(grid, slots, wins, paints) {
  const c = document.createElement("canvas"); c.width = MW * T; c.height = MH * T;
  const x = c.getContext("2d");
  const px = (X, Y, w, h, col) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const solid = (tx, ty) => tx < 0 || ty < 0 || tx >= MW || ty >= MH || grid[ty][tx] === 0;
  const open = (tx, ty) => !solid(tx, ty);
  px(0, 0, c.width, c.height, "#060a13");
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const X = tx * T, Y = ty * T, v = grid[ty][tx], h = hash(tx, ty);
    if (v === 0) {
      // 牆頂：石材砌塊；靠房間那一側有一條亮邊；底下是地板的牆，畫出牆的正面（看得到牆的厚度）
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) if (open(tx + dx, ty + dy)) { near = true; break; }
      if (!near) continue;
      paintCap(x, X, Y, tx, ty, h);
      const floorBelow = ty + 1 < MH && grid[ty + 1][tx] === 1;
      if (floorBelow) paintLip(x, X, Y);
      x.fillStyle = "rgba(122,146,196,.28)";
      if (open(tx, ty - 1) && grid[ty - 1][tx] === 1) x.fillRect(X, Y, T, 1);
      if (open(tx + 1, ty)) x.fillRect(X + T - 1, Y, 1, floorBelow ? 6 : T);
      if (open(tx - 1, ty)) x.fillRect(X, Y, 1, floorBelow ? 6 : T);
      continue;
    }
    if (v === 2) { const k = faceRoom(tx, ty); paintFace(x, X, Y, ty - ROOMS[k].y, tx, k); continue; }
    const room = roomAt(tx, ty);
    paintFloor(x, X, Y, tx, ty, room ? ROOMS[room].floor : "marble", h, room);
    // 牆腳的陰影：上方、左右是牆的地板暗一點，牆才站得起來
    const above = ty > 0 && grid[ty - 1][tx] !== 1;
    if (above) { x.fillStyle = "rgba(0,0,0,.32)"; x.fillRect(X, Y, T, 3); x.fillStyle = "rgba(0,0,0,.16)"; x.fillRect(X, Y + 3, T, 3); }
    if (solid(tx - 1, ty) || grid[ty][tx - 1] === 2) { x.fillStyle = "rgba(0,0,0,.22)"; x.fillRect(X, Y, 3, T); }
    if (solid(tx + 1, ty) || grid[ty][tx + 1] === 2) { x.fillStyle = "rgba(0,0,0,.14)"; x.fillRect(X + T - 2, Y, 2, T); }
  }
  // 拱門：牆面上的開口描一圈金邊
  for (const [k, d] of Object.entries(DOORS)) {
    if (k !== "north" && k !== "south") continue;
    const r = k === "north" ? ROOMS.hall : ROOMS.south, X = d.x * T, Y = r.y * T;
    px(X - 3, Y, 3, 2 * T, "#0e1729"); px(X + d.w * T, Y, 3, 2 * T, "#0e1729");
    px(X - 2, Y, 1, 2 * T, "#b38a3b"); px(X + d.w * T + 1, Y, 1, 2 * T, "#b38a3b");
    px(X - 3, Y, d.w * T + 6, 3, "#0e1729"); px(X - 2, Y + 1, d.w * T + 4, 1, "#d4a64a");
  }
  for (const w of wins) paintWindow(x, w.x - 8, w.y);
  for (const pt of paints) paintPainting(x, pt);
  for (const s of slots) paintVitrine(x, s.tx * T, s.ty * T);
  paintRunner(x);
  paintPlatform(x);
  paintExitDoor(x);
  for (const b of BENCHES) paintBench(x, b.x * T, b.y * T);
  for (const s of SHELVES) paintShelf(x, s.x * T, s.y * T);
  for (const l of LAMPS) paintLamp(x, l.x * T, l.y * T);
  for (const pl of PLANTS) x.drawImage(sprite(PLANT, "plant"), Math.round(pl.x * T) - 8, Math.round(pl.y * T) - 22);
  for (const e of EASELS) x.drawImage(sprite(EASEL, "easel"), Math.round(e.x * T) - 8, Math.round(e.y * T) - 22);
  return c;
}
// 牆頂：深墨藍石材，一排一排錯開
function paintCap(x, X, Y, tx, ty, h) {
  x.fillStyle = "#0f1729"; x.fillRect(X, Y, T, T);
  x.fillStyle = "#0b1120";
  for (let r = 0; r < 2; r++) { const off = (ty * 2 + r) % 2 ? 8 : 0; x.fillRect(X, Y + r * 8 + 7, T, 1); x.fillRect(X + off + (off ? -1 : 7), Y + r * 8, 1, 7); }
  if (h % 4 === 0) { x.fillStyle = "rgba(255,255,255,.025)"; x.fillRect(X + 2 + h % 9, Y + 2 + h % 4, 3, 1); }
}
// 牆的正面（下面是地板時看得到）：上緣、牆身、一條金線、踢腳
function paintLip(x, X, Y) {
  const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(X + a, Y + b, w, h); };
  px(0, 5, T, 11, "#1e2d4f"); px(0, 5, T, 1, "#2c3f68"); px(0, 10, T, 1, "rgba(212,166,74,.45)"); px(0, 11, T, 3, "#162441"); px(0, 14, T, 2, "#0a1020");
}
function paintFloor(x, X, Y, tx, ty, kind, h, room) {
  const px = (a, b, w, hh, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, hh); };
  if (kind === "marble") {
    // 大理石：兩格一塊的大石板，淡淡的紋路
    const bx = Math.floor(tx / 2), by = Math.floor(ty / 2), hb = hash(bx, by);
    px(0, 0, T, T, (bx + by) % 2 ? "#1f2d4c" : "#1a2643");
    if (tx % 2 === 0) px(0, 0, 1, T, "#131c32");
    if (ty % 2 === 0) px(0, 0, T, 1, "#131c32");
    if (tx % 2 === 0 && ty % 2 === 0) px(1, 1, T - 1, 1, "rgba(255,255,255,.035)");
    const v = hb % 5;
    if (v < 2) for (let i = 0; i < 6; i++) px((i * 3 + (hb >> 3) % 7 + (tx % 2) * 5) % T, (i * 2 + (ty % 2) * 7 + v) % T, 1, 1, "rgba(207,217,232,.09)");
  } else if (kind === "stars") {
    // 遊戲廳：深色星空地毯
    px(0, 0, T, T, "#121a33");
    if (h % 3 === 0) px(h % 13 + 1, (h >> 4) % 13 + 1, 1, 1, "rgba(243,216,149,.55)");
    if (h % 5 === 0) px((h >> 2) % 14 + 1, (h >> 6) % 14 + 1, 1, 1, "rgba(223,231,242,.45)");
    if (h % 23 === 0) { const sx = (h >> 3) % 10 + 3, sy = (h >> 7) % 10 + 3; px(sx, sy - 1, 1, 3, "rgba(243,216,149,.6)"); px(sx - 1, sy, 3, 1, "rgba(243,216,149,.6)"); }
  } else if (kind === "parquet") {
    // 理財廳：拼木地板（每格四塊，橫直交錯）
    const woods = ["#3d2e26", "#45352b", "#362820", "#4b3a2e"];
    for (let q = 0; q < 4; q++) {
      const qx = (q % 2) * 8, qy = Math.floor(q / 2) * 8, vert = ((tx * 2 + (q % 2)) + (ty * 2 + Math.floor(q / 2))) % 2;
      for (let k = 0; k < 2; k++) {
        const col = woods[(h >> (q * 2 + k)) % 4];
        if (vert) { px(qx + k * 4, qy, 4, 8, col); px(qx + k * 4, qy, 1, 8, "rgba(0,0,0,.25)"); px(qx + k * 4 + 1, qy, 1, 8, "rgba(255,230,190,.05)"); }
        else { px(qx, qy + k * 4, 8, 4, col); px(qx, qy + k * 4, 8, 1, "rgba(0,0,0,.25)"); px(qx, qy + k * 4 + 1, 8, 1, "rgba(255,230,190,.05)"); }
      }
    }
  } else if (kind === "slate") {
    // 測驗廳：石板，每塊有一點斜光
    const shades = ["#223049", "#25344e", "#1f2c45"];
    px(0, 0, T, T, shades[h % 3]); px(0, 0, T, 1, "#33446a"); px(0, 0, 1, T, "#2d3d60"); px(0, T - 1, T, 1, "#151d31"); px(T - 1, 0, 1, T, "#151d31");
    if (h % 6 === 0) px(4 + h % 6, 5 + (h >> 3) % 6, 2, 1, "rgba(207,217,232,.07)");
  } else if (kind === "shop") {
    // 商店：暖色木地板
    const woods = ["#4a3a2d", "#433427", "#504032"];
    for (let r = 0; r < 4; r++) { const off = (r + ty) % 2 ? 8 : 0; px(0, r * 4, T, 4, woods[(h >> r) % 3]); px(0, r * 4, T, 1, "rgba(0,0,0,.28)"); px((off + 5) % T, r * 4, 1, 4, "rgba(0,0,0,.3)"); }
  }
}
// 牆面兩排：冠頂線腳、牆身鑲板、掛畫線、護牆板、踢腳
function paintFace(x, X, Y, row, tx, room) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  const wall = room === "north" ? "#1f2a45" : room === "shop" ? "#26243a" : "#1c2b4c";
  if (row === 0) {
    px(0, 0, T, T, wall); px(0, 0, T, 2, "#0b1222"); px(0, 2, T, 1, "#2c3f68"); px(0, 3, T, 1, "rgba(212,166,74,.5)"); px(0, 4, T, 1, "#132039");
    if (tx % 3 === 0) { px(0, 5, 2, 11, "rgba(255,255,255,.035)"); px(2, 5, 1, 11, "rgba(0,0,0,.2)"); }
  } else {
    px(0, 0, T, T, wall); px(0, 2, T, 1, "rgba(212,166,74,.55)"); px(0, 3, T, 9, "#152340");
    x.strokeStyle = "rgba(232,200,137,.16)"; x.lineWidth = 1; x.strokeRect(X + 2.5, Y + 4.5, T - 5, 6);
    px(0, 12, T, 1, "#2a3c63"); px(0, 13, T, 3, "#0a1020");
  }
}
function paintWindow(x, X, Y) {
  // 12×22 拱窗，月光（白天是天光）從這裡進來
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  px(1, 2, 14, 22, "#0b1222"); px(2, 1, 12, 1, "#0b1222");
  px(3, 3, 10, 19, "#2d4878"); px(4, 2, 8, 1, "#2d4878"); px(3, 3, 10, 6, "#3a5a91");
  px(7, 2, 2, 20, "#0e1729"); px(3, 10, 10, 1, "#0e1729"); px(3, 16, 10, 1, "#0e1729");
  px(4, 4, 2, 4, "rgba(255,255,255,.18)");
  px(0, 22, 16, 2, "#2a3c63"); px(0, 22, 16, 1, "rgba(232,200,137,.55)");
}
// 牆上的畫：大小不同的金框，畫的是簡單的風景
function paintPainting(x, p) {
  const { X, Y, w, h, kind } = p, px = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, ww, hh); };
  px(0, 0, w, h, "#0a0e1a"); px(1, 1, w - 2, h - 2, "#d4a64a"); px(2, 2, w - 4, h - 4, "#8a6420");
  const iw = w - 6, ih = h - 6;
  if (kind === 0) { // 夜海
    px(3, 3, iw, ih, "#1d3358"); px(3, 3 + Math.floor(ih * .6), iw, Math.ceil(ih * .4), "#142645"); px(3 + Math.floor(iw * .65), 5, 2, 2, "#eef2f8");
    px(3, 3 + Math.floor(ih * .6), iw, 1, "rgba(207,217,232,.4)");
  } else if (kind === 1) { // 山
    px(3, 3, iw, ih, "#c9b48a"); for (let i = 0; i < iw; i++) { const hh = Math.round(ih * .55 - Math.abs(i - iw / 2) * .7); if (hh > 0) px(3 + i, 3 + ih - hh, 1, hh, "#4f6b58"); }
  } else { // 抽象：一盞燈
    px(3, 3, iw, ih, "#2a2238"); px(3 + Math.floor(iw / 2) - 1, 3 + Math.floor(ih / 2) - 1, 3, 3, "#f3d895"); px(3, 3 + ih - 2, iw, 2, "#3b2f4c");
  }
}
// 展櫃：古典細柱台座（柱頭、凹槽柱身、柱腳）＋圓肩玻璃罩，牆上一盞小聚光燈往下照
// 展品原尺寸放在罩裡，跟人的比例相稱；佔兩格寬是為了展櫃之間留走道和掛窗
function paintVitrine(x, X, Y) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  // 牆上的小聚光燈：一支黃銅臂伸出來，燈頭朝下
  px(15, -24, 2, 5, "#8a6420"); px(12, -20, 8, 3, "#b38a3b"); px(12, -20, 8, 1, "#f3d895"); px(13, -17, 6, 1, "#fff3cf");
  px(9, 27, 14, 2, "rgba(0,0,0,.35)");
  // 罩子裡面（空的時候看得出是空的）
  px(8, -8, 16, 19, "rgba(8,14,28,.5)"); px(9, -9, 14, 1, "rgba(8,14,28,.5)");
  // 柱頭
  px(7, 11, 18, 2, "#0a1020"); px(8, 11, 16, 1, "#3a5487"); px(8, 12, 16, 1, "#d4a64a");
  px(10, 13, 12, 1, "#24365c");
  // 柱身：兩條凹槽、左亮右暗、一張小展牌
  px(11, 14, 10, 10, "#1b2a4a"); px(11, 14, 1, 10, "#2c3f68"); px(20, 14, 1, 10, "#0f1a30");
  px(13, 14, 1, 10, "#142039"); px(18, 14, 1, 10, "#142039");
  px(13, 17, 6, 3, "#efe6d2"); px(14, 18, 4, 1, "#8f8062");
  // 柱腳
  px(10, 24, 12, 1, "#24365c"); px(9, 25, 14, 2, "#2a3c63"); px(9, 25, 14, 1, "rgba(232,200,137,.5)"); px(8, 27, 16, 1, "#0a1020");
  // 紅龍柱：兩根矮柱＋一條細絨繩
  for (const sx of [2, 29]) { px(sx, 22, 1, 7, "#b38a3b"); px(sx - 1, 21, 3, 1, "#f3d895"); px(sx - 1, 28, 3, 1, "#8a6420"); }
  for (let i = 3; i < 29; i++) px(i, 24 + Math.round(Math.sin((i - 3) / 25 * Math.PI) * 2), 1, 1, "#3d5288");
}
function paintRunner(x) {
  // 大廳：從南門到台座的長地毯
  const rx = 20 * T + 6, ry = Math.round((PLATFORM.cy + 1.7) * T), rw = 4 * T - 12, rh = (ROOMS.hall.y + ROOMS.hall.h) * T - ry;
  const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(rx + a, ry + b, w, h); };
  px(0, 0, rw, rh, "#0f1c36"); px(2, 0, rw - 4, rh, "#1a2b50");
  px(3, 0, 1, rh, "#d4a64a"); px(rw - 4, 0, 1, rh, "#d4a64a");
  for (let yy = 6; yy < rh; yy += 10) { px(rw / 2 - 1, yy, 2, 2, "rgba(212,166,74,.55)"); px(rw / 2 - 3, yy + 1, 1, 1, "rgba(212,166,74,.3)"); px(rw / 2 + 2, yy + 1, 1, 1, "rgba(212,166,74,.3)"); }
}
function paintPlatform(x) {
  const cx = PLATFORM.cx * T, cy = PLATFORM.cy * T;
  x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.ellipse(cx, cy + 4, 46, 21, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#0f1930"; x.beginPath(); x.ellipse(cx, cy + 1, 44, 20, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = "#24365c"; x.beginPath(); x.ellipse(cx, cy - 2, 42, 18, 0, 0, Math.PI * 2); x.fill();
  x.strokeStyle = "#d4a64a"; x.lineWidth = 1; x.beginPath(); x.ellipse(cx, cy - 2, 42, 18, 0, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = "rgba(232,200,137,.3)"; x.beginPath(); x.ellipse(cx, cy - 2, 34, 13, 0, 0, Math.PI * 2); x.stroke();
}
function paintExitDoor(x) {
  // 出口的門：畫在大廳北牆上，門前一塊踏墊
  const X = EXIT.x * T, Y = EXIT.y * T, px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(X + a, Y + b, w, h); };
  px(1, 2, 30, 30, "#0a1020"); px(2, 3, 28, 1, "#d4a64a");
  px(3, 5, 12, 27, "#22355c"); px(17, 5, 12, 27, "#22355c");
  px(5, 7, 8, 6, "#9fb2cf"); px(19, 7, 8, 6, "#9fb2cf"); px(9, 7, 1, 6, "#22355c"); px(23, 7, 1, 6, "#22355c");
  x.strokeStyle = "rgba(232,200,137,.3)"; x.lineWidth = 1; x.strokeRect(X + 5.5, Y + 16.5, 7, 12); x.strokeRect(X + 19.5, Y + 16.5, 7, 12);
  px(13, 18, 1, 5, "#e8c889"); px(18, 18, 1, 5, "#e8c889"); px(15, 5, 2, 27, "#0a1020");
  px(4, 32, 24, 6, "#2a3c63"); px(4, 32, 24, 1, "rgba(232,200,137,.6)");
}
function paintBench(x, X, Y) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  px(2, 13, 28, 2, "rgba(0,0,0,.3)");
  px(1, 4, 30, 8, "#0a1020"); px(2, 4, 28, 5, "#34497a"); px(2, 4, 28, 1, "#5a70a0"); px(2, 9, 28, 1, "#d4a64a");
  for (let i = 5; i < 28; i += 6) px(i, 6, 1, 1, "rgba(0,0,0,.35)");
  px(3, 10, 2, 4, "#8a6420"); px(27, 10, 2, 4, "#8a6420");
}
// 商店的貨架：一格寬，放明信片、書、小擺件
function paintShelf(x, X, Y) {
  const px = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(X + a, Y + b, w, h); };
  px(1, -14, 14, 28, "#0a1020"); px(2, -13, 12, 26, "#3a2c22");
  for (const sy of [-12, -4, 4]) { px(2, sy + 6, 12, 2, "#5a4433"); }
  const goods = ["#d4a64a", "#efe6d2", "#7fa9d0", "#c0503c", "#4f6b58", "#b59a6e"];
  for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) px(3 + i * 3, -12 + r * 8 + (i % 2), 2, 6 - (i % 2), goods[(r * 4 + i + X) % goods.length]);
  px(1, 14, 14, 2, "rgba(0,0,0,.3)");
}
// 黃銅立燈（地上一圈暖光另外畫）
function paintLamp(x, X, Y) {
  const px = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(X + a), Math.round(Y + b), w, h); };
  px(-4, 8, 9, 2, "rgba(0,0,0,.3)"); px(-4, 6, 8, 3, "#8a6420"); px(-1, -12, 2, 19, "#b38a3b");
  px(-5, -18, 10, 6, "#d4a64a"); px(-5, -18, 10, 1, "#f3d895"); px(-4, -12, 8, 1, "#fff3cf");
}

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
`;
  const q = s => root.querySelector(s);
  const cv = q(".m-cv"), layer = q(".m-layer"), joyEl = q(".m-joy"), banner = q(".m-banner"), help = q(".m-help");
  // 走近展品時，展櫃上方浮出一張暖紙色小展牌，點它看說明牌（不放在畫面下方，才不會跟拖曳的搖桿卡到）
  const act = document.createElement("button"); act.type = "button"; act.className = "m-tag"; act.hidden = true; layer.appendChild(act);
  const sctx = cv.getContext("2d");
  const fc = document.createElement("canvas"), fx = fc.getContext("2d");   // 一張世界解析度的畫面
  const lc = document.createElement("canvas"), lx = lc.getContext("2d");   // 夜色

  /* ---------- 展廳與展品 ---------- */
  const grid = buildGrid();
  const halls = {};  // 展廳 id（west…）→ 樓層資料
  WINGS.forEach((w, i) => { if (floors[i]) halls[w] = floors[i]; });
  const slots = [], wins = [], paints = [];
  for (const w of WINGS) {
    const f = halls[w]; if (!f) continue;
    const r = ROOMS[w], list = exhibits.filter(e => e.floor === f.id), n = list.length;
    // 展櫃兩格寬，沿著北牆平均排；商店避開中間的入口，從左邊排
    list.forEach((e, i) => {
      const tx = w === "south" ? r.x + 1 + i * 3 : r.x + Math.round((i + .5) * r.w / n) - 1;
      slots.push({ e, w, tx, ty: r.y + 2 });
    });
    if (w === "south") continue;
    // 展櫃之間的牆面：窗和畫輪流掛
    const xs = slots.filter(s => s.w === w).map(s => s.tx).sort((a, b) => a - b), gaps = [];
    let prev = r.x - 1;
    for (const t of xs) { if (t - prev - 1 >= 1) gaps.push([prev + 1, t - 1]); prev = t + 1; }
    if (r.x + r.w - 1 - prev >= 1) gaps.push([prev + 1, r.x + r.w - 1]);
    gaps.forEach(([a, b], k) => {
      const c = (a + b + 1) / 2 * T;
      if (k % 2 === 0) wins.push({ x: c, y: r.y * T + 4, w });
      else paints.push({ X: Math.round(c) - 6, Y: r.y * T + 7, w: 12, h: 14, kind: k % 3 });
    });
  }
  paints.push({ X: Math.round(26.6 * T), Y: ROOMS.hall.y * T + 6, w: 22, h: 15, kind: 0 });
  const blocked = new Set();
  for (const s of slots) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) blocked.add((s.tx + dx) + "," + (s.ty + dy));
  for (const pl of [...PLANTS, ...EASELS]) blocked.add(Math.floor(pl.x) + "," + Math.floor(pl.y));
  for (const sh of SHELVES) { blocked.add(sh.x + "," + sh.y); blocked.add(sh.x + "," + (sh.y - 1)); }
  for (const b of BENCHES) { blocked.add(b.x + "," + b.y); blocked.add((b.x + 1) + "," + b.y); }
  for (const s of STATUES) blocked.add(Math.floor(s.x) + "," + s.y);
  for (const l of LAMPS) blocked.add(Math.floor(l.x) + "," + Math.floor(l.y));
  blocked.add(Math.floor(GUARD_AT.x / T) + "," + Math.floor(GUARD_AT.y / T));
  const mapCv = paintMap(grid, slots, wins, paints);
  // 白天版的底圖：只把館內（地板、牆面、牆頂）調亮調暖，館外維持深色
  const dayCv = document.createElement("canvas"); dayCv.width = mapCv.width; dayCv.height = mapCv.height;
  { const d = dayCv.getContext("2d"); d.drawImage(mapCv, 0, 0); d.globalCompositeOperation = "lighter";
    for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
      if (grid[ty][tx] !== 0) { d.fillStyle = "rgba(36,30,18,1)"; d.fillRect(tx * T, ty * T, T, T); continue; }
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const a = tx + dx, b = ty + dy; if (a >= 0 && b >= 0 && a < MW && b < MH && grid[b][a] !== 0) { near = true; break; } }
      if (near) { d.fillStyle = "rgba(14,12,8,1)"; d.fillRect(tx * T, ty * T, T, T); }
    } }
  const walkable = (wx, wy) => {
    const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return false;
    return grid[ty][tx] === 1 && !blocked.has(tx + "," + ty);
  };

  /* ---------- 會動的東西 ---------- */
  const MOVES = { hop: 46, roll: 54, waddle: 38, float: 30, scuttle: 50, spin: 34, tilt: 30, slide: 36, wobble: 32, none: 0 };
  const items = slots.map(s => {
    const r = ROOMS[s.w];
    const home = { x: (s.tx + 1) * T, y: s.ty * T + 11 };
    const move = s.e.status === "renovating" ? "none" : (s.e.persona?.move || "hop");
    return { ...s, home, x: home.x, y: home.y, state: "home", move, speed: MOVES[move] || 40, t: rnd(0, 6), wait: rnd(1.5, 5), vx: 0, quipShown: false,
      look: { x: (s.tx + 1) * T, y: (s.ty + 2) * T + 8 },  // 站在展櫃前這一點附近就能看說明牌
      box: { x0: (r.x + 1) * T + 4, x1: (r.x + r.w - 1) * T - 4, y0: (r.y + 5) * T, y1: (r.y + r.h) * T - 4 } };
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
  const GATE = { west: [[12.2, 18.5], [15.6, 18.5]], north: [[22, 9.4], [22, 14.6]], east: [[31.6, 18.5], [28.4, 18.5]], south: [[22, 28.8], [22, 23.4]] };
  const spots = [
    ...slots.map(s => ({ x: (s.tx + 1) * T + rnd(-5, 5), y: (s.ty + 2) * T + 12, face: "up", stay: [3, 7] })),
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
  // 廳名不掛牌子：走進廳時上方會浮出廳名（使用者覺得黃色牌子干擾畫面）；只留出口的月白牌，要找得到出口
  const signs = [];
  const exitSign = document.createElement("span"); exitSign.className = "m-sign m-exit"; exitSign.innerHTML = "出口<i>EXIT</i>";
  layer.appendChild(exitSign); signs.push({ el: exitSign, x: (EXIT.x + 1) * T, y: EXIT.y * T - 8 });
  const bubbles = [];
  let guardSaid = false;
  // 對話泡泡（使用者決定）：說話那一刻定位在說話的人頭上，之後釘在地圖上不跟著跑，
  // 時間到或人走開就淡出。同一時間只有一個。只有警衛和恐龍會說話：展品不放泡泡（使用者決定），自白只在說明牌上。
  function say(who, text, ms = 2600) {
    for (const o of bubbles) if (o.who !== who) { o.until = 0; o.el.hidden = true; }
    let b = bubbles.find(b => b.who === who);
    if (!b) { b = { who, el: document.createElement("p") }; b.el.className = "m-bubble"; layer.appendChild(b.el); bubbles.push(b); }
    let a;
    if (who === "guard") a = { x: GUARD_AT.x, up: GUARD_AT.y - 26, down: GUARD_AT.y + 4, fy: GUARD_AT.y };
    else a = { x: Math.round(dino.x), up: Math.round(dino.y) - 30, down: Math.round(dino.y) + 6, fy: Math.round(dino.y) };
    Object.assign(b, a, { side: null });   // 上或下，出現時決定一次
    b.el.innerHTML = text; b.until = performance.now() + ms; b.el.hidden = false;
    b.el.classList.remove("in", "out"); void b.el.offsetWidth; b.el.classList.add("in");
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
    // 警衛（只說中文，使用者要求）
    const gd = Math.hypot(p.x - GUARD_AT.x, p.y - GUARD_AT.y);
    // 一次進館只在第一次走近時說一句（使用者決定，畫面安靜一點）；切換夜遊／開館會再說一次
    if (gd < 40 && !guardSaid) { guardSaid = true; const l = opt.guardLine(night); say("guard", `<b>${night ? "夜班警衛" : "警衛"}</b>${esc(l.zh)}`, 3200); }
    // 鏡頭：跟著人，小地圖置中
    const mw = MW * T, mh = MH * T;
    camX = mw <= vw ? Math.round((mw - vw) / 2) : clamp(Math.round(p.x) - (vw >> 1), 0, mw - vw);
    camY = mh <= vh ? Math.round((mh - vh) / 2) : clamp(Math.round(p.y) - 10 - (vh >> 1), 0, mh - vh);
    nearest();
  }
  function updateItem(it, dt, ts) {
    const d = Math.hypot(p.x - it.look.x, p.y - it.look.y);
    const dp = Math.hypot(p.x - it.x, p.y - (it.y - 8));
    it.t += dt;
    if (!night || reduced || it.move === "none") { it.x = it.home.x; it.y = it.home.y; it.state = "home"; return; }
    if (it.state === "home") {
      if (d > 120) { it.wait -= dt; if (it.wait <= 0) { it.state = "roam"; pickTarget(it); } }
      else it.wait = rnd(2, 5);
    } else if (it.state === "roam") {
      if (dp < 52 || d < 40) { it.state = "flee"; return; }
      if (it.pause > 0) { it.pause -= dt; it.vx = 0; return; }
      const dx = it.gx - it.x, dy = it.gy - it.y, l = Math.hypot(dx, dy);
      if (l < 2) { it.pause = rnd(.4, 1.6); pickTarget(it); return; }
      it.vx = dx / l; it.x += dx / l * it.speed * dt; it.y += dy / l * it.speed * dt;
    } else if (it.state === "flee") {
      const dx = it.home.x - it.x, dy = it.home.y - it.y, l = Math.hypot(dx, dy);
      if (l < 2) {
        it.x = it.home.x; it.y = it.home.y; it.state = "home"; it.vx = 0; it.wait = rnd(3, 6);
        // 被抓到了：跑回台座裝死（不說話；自白寫在夜遊的說明牌上）
        return;
      }
      it.vx = dx / l; const sp = Math.max(130, it.speed * 2.6);
      it.x += dx / l * Math.min(l, sp * dt); it.y += dy / l * Math.min(l, sp * dt);
    }
  }
  // 亂跑的目標存在 gx/gy；tx/ty 是展櫃的格子，小展牌、玻璃罩都靠它定位，不能蓋掉
  function pickTarget(it) { it.gx = rnd(it.box.x0, it.box.x1); it.gy = rnd(it.box.y0, it.box.y1); }
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
      // 跳歸跳，說話至少隔 20 秒（使用者決定）
      if (ts - (dino.saidAt ?? -1e9) >= 20) {
        dino.saidAt = ts;
        const lines = ["喀啦。", "（牠歪頭看了你一眼。）", "吼——（骨頭版）", "（牠假裝自己只是一堆骨頭。）"];
        say("dino", lines[Math.floor(Math.random() * lines.length)], 2600);
      }
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
    let best = null, bd = 24;
    for (const it of items) {
      if (it.state !== "home") continue;
      const d = Math.hypot(p.x - it.look.x, p.y - it.look.y);
      if (d < bd) { bd = d; best = { kind: "item", it }; }
    }
    const ex = Math.hypot(p.x - EXIT_AT.x, p.y - EXIT_AT.y);
    if (ex < 28) best = { kind: "exit" };
    const key = best ? (best.kind === "item" ? best.it.e.id : "exit") : "";
    if (key === nearest.key) return;
    nearest.key = key; near = best;
    if (!best) { act.hidden = true; return; }
    const how = coarse ? "" : "<kbd>空白鍵</kbd>";
    act.innerHTML = best.kind === "item"
      ? `<b>${esc(best.it.e.title)}</b><span>看說明牌 ›${how}</span>`
      : `<b>出口</b><span>回到售票口 ›${how}</span>`;
    act.hidden = false; act.classList.remove("in"); void act.offsetWidth; act.classList.add("in");
  }
  function interact() {
    if (!near || opt.blocked()) return;
    for (const b of bubbles) { b.until = 0; b.el.hidden = true; }   // 打開說明牌就把泡泡收掉
    if (near.kind === "item") opt.openPlacard(near.it.e, act, night);   // 自白只在夜裡出現
    else opt.exit();
  }

  /* ---------- 畫面 ---------- */
  function render(ts) {
    const cx = Math.round(camX), cy = Math.round(camY);
    fx.imageSmoothingEnabled = false;
    fx.globalCompositeOperation = "source-over";
    fx.fillStyle = "#04070e"; fx.fillRect(0, 0, vw, vh);
    fx.drawImage(night ? mapCv : dayCv, -cx, -cy);
    // 畫像：夜裡眼睛跟著你
    for (const pt of PORTRAITS) drawPortrait(pt.x * T - cx, ROOMS.hall.y * T + 2 - cy, pt.x * T);
    // 白天：窗外是天光
    if (!night) for (const w of wins) {
      const X = w.x - 8 - cx, Y = w.y - cy, f = (a, b, ww, hh, c) => { fx.fillStyle = c; fx.fillRect(X + a, Y + b, ww, hh); };
      f(3, 3, 10, 19, "#a9c6e4"); f(4, 2, 8, 1, "#a9c6e4"); f(5, 1, 6, 1, "#a9c6e4"); f(3, 3, 10, 6, "#d6e6f5");
      f(7, 2, 2, 20, "#0e1729"); f(3, 10, 10, 1, "#0e1729"); f(3, 16, 10, 1, "#0e1729"); f(4, 4, 2, 4, "rgba(255,255,255,.5)");
    }
    // 地上的燈光：立燈下一圈暖光、窗光落在地上
    floorLight(cx, cy);
    // 展櫃：在家的展品先畫，再蓋上玻璃
    for (const it of items) if (it.state === "home") drawItem(it, ts, cx, cy);
    for (const it of items) drawGlass(it.tx * T - cx, it.ty * T - cy, it);
    // 要排前後的東西：腳的位置越下面越後畫
    const list = [];
    for (const it of items) if (it.state !== "home") list.push({ y: it.y, draw: () => drawItem(it, ts, cx, cy) });
    list.push({ y: dino.y, draw: () => drawDino(cx, cy) });
    for (const s of statues) list.push({ y: s.y, draw: () => blit(sprite(STATUE[s.pose], "st" + s.pose), s.x - 8 - cx, s.y - 24 - cy) });
    if (!night) for (const v of visitors) list.push({ y: v.y, draw: () => shadow(v.x - cx, v.y - cy) || blit(sprite(v.look[v.dir + v.frame], v.key + v.dir + v.frame), Math.round(v.x) - 8 - cx, Math.round(v.y) - (v.kid ? 21 : 24) - cy) });
    list.push({ y: GUARD_AT.y, draw: () => shadow(GUARD_AT.x - cx, GUARD_AT.y - cy) || blit(sprite(GUARD, "guard"), GUARD_AT.x - 8 - cx, GUARD_AT.y - 24 - cy) });
    list.push({ y: p.y, draw: () => shadow(p.x - cx, p.y - cy) || blit(sprite(TEACHER[p.dir + p.frame], "t" + p.dir + p.frame), Math.round(p.x) - 8 - cx, Math.round(p.y) - 24 - cy) });
    list.sort((a, b) => a.y - b.y).forEach(o => o.draw());
    if (night) lightPass(cx, cy, ts); else litPass(cx, cy);
    // 放大到螢幕
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(fc, 0, 0, vw, vh, 0, 0, vw * K, vh * K);
    placeDom(cx, cy);
  }
  function blit(img, X, Y, flip) { fx.drawImage(flip ? flipped(img, img.__k || (img.__k = "f" + Math.random())) : img, Math.round(X), Math.round(Y)); }

  function drawItem(it, ts, cx, cy) {
    // 展品用原尺寸（16 像素），跟人、牆、展櫃同一個像素密度
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
      shadow(it.x - cx, it.y - cy, 10);
      if (it.move === "roll" || it.move === "spin") {
        // 滾動：九十度一格一格轉，像素才不會糊
        const q = it.move === "roll" ? Math.floor(ph * 10) % 4 : (Math.floor(ph * 3) % 2) * 2;
        fx.save(); fx.translate(Math.round(X) + 8, Math.round(Y) + 8); fx.rotate(q * Math.PI / 2); fx.drawImage(img, -8, -8); fx.restore();
        return;
      }
    }
    blit(img, X, Y, flip);
  }
  // 玻璃罩：圓肩、細邊框、斜斜的反光、頂上一顆黃銅小鈕；聚光燈打下來的一道光；整修中罩一塊布
  function drawGlass(X, Y, it) {
    const f = (a, b, w, h, c) => { fx.fillStyle = c; fx.fillRect(X + a, Y + b, w, h); };
    // 聚光燈的光：從燈頭往下張開，照在展品上（夜裡亮、白天淡）
    fx.globalCompositeOperation = "lighter";
    fx.fillStyle = night ? "rgba(255,214,150,.13)" : "rgba(255,226,180,.07)";
    fx.beginPath(); fx.moveTo(X + 13, Y - 16); fx.lineTo(X + 19, Y - 16); fx.lineTo(X + 23, Y + 10); fx.lineTo(X + 9, Y + 10); fx.closePath(); fx.fill();
    fx.globalCompositeOperation = "source-over";
    if (it.e.status === "renovating") {
      f(8, -8, 16, 19, "#5e4428"); for (let i = 0; i < 16; i += 3) f(8 + i, -8, 1, 19, "#7a5c35");
      f(9, -9, 14, 1, "#4a3520");
    }
    f(8, -8, 16, 19, "rgba(207,226,245,.06)");
    f(9, -9, 14, 1, "rgba(223,231,242,.55)"); f(8, -8, 1, 1, "rgba(223,231,242,.45)"); f(23, -8, 1, 1, "rgba(223,231,242,.3)");
    f(7, -7, 1, 18, "rgba(223,231,242,.5)"); f(24, -7, 1, 18, "rgba(223,231,242,.28)");
    for (let i = 0; i < 6; i++) f(10 + i, -5 + i * 2, 1, 2, "rgba(255,255,255,.13)");
    f(15, -11, 2, 2, "#d4a64a"); f(15, -11, 1, 1, "#f3d895");
  }
  function shadow(X, Y, w = 10) {
    fx.fillStyle = "rgba(0,0,0,.28)"; fx.fillRect(Math.round(X) - w / 2, Math.round(Y) - 1, w, 2); fx.fillRect(Math.round(X) - w / 2 + 2, Math.round(Y) + 1, w - 4, 1);
  }
  // 立燈底下的暖光圈（白天淡、夜裡亮）；白天窗光落在地上
  function floorLight(cx, cy) {
    fx.globalCompositeOperation = "lighter";
    for (const l of LAMPS) {
      const X = l.x * T - cx, Y = l.y * T + 8 - cy, g = fx.createRadialGradient(X, Y, 0, X, Y, 26);
      g.addColorStop(0, night ? "rgba(255,196,110,.16)" : "rgba(255,206,130,.09)"); g.addColorStop(1, "rgba(255,196,110,0)");
      fx.fillStyle = g; fx.save(); fx.translate(0, Y); fx.scale(1, .55); fx.translate(0, -Y); fx.fillRect(X - 26, Y - 26, 52, 52); fx.restore();
    }
    if (!night) {
      fx.fillStyle = "rgba(255,226,170,.09)";
      for (const w of wins) { const X = w.x - 6 - cx, Y = w.y + 28 - cy; fx.beginPath(); fx.moveTo(X, Y); fx.lineTo(X + 12, Y); fx.lineTo(X + 26, Y + 36); fx.lineTo(X + 14, Y + 36); fx.closePath(); fx.fill(); }
    }
    fx.globalCompositeOperation = "source-over";
  }
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
      glow(w.x - cx, w.y + 12 - cy, 18, .75, 1.3);
      lx.fillStyle = "rgba(0,0,0,.22)"; lx.beginPath();
      const X = w.x - 6 - cx, Y = w.y + 28 - cy;
      lx.moveTo(X, Y); lx.lineTo(X + 12, Y); lx.lineTo(X + 26, Y + 36); lx.lineTo(X + 14, Y + 36); lx.closePath(); lx.fill();
    }
    // 台座上的小燈：展品在家時亮一點
    // 展櫃頂上的小燈：展品在家時亮一點
    for (const it of items) glow(it.home.x - cx, it.ty * T + 4 - cy, it.state === "home" ? 24 : 15, it.state === "home" ? .62 : .35, 1.2);
    for (const pt of PORTRAITS) glow(pt.x * T - cx, ROOMS.hall.y * T + 14 - cy, 16, .45);
    for (const s of signs) glow(s.x - cx, s.y - cy, 18, .35, .6);
    glow(EXIT_AT.x - cx, EXIT.y * T + 12 - cy, 26, .6, .8);
    for (const l of LAMPS) glow(l.x * T - cx, l.y * T - 4 - cy, 34, .6, .8);
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
    for (const l of LAMPS) { const g = fx.createRadialGradient(l.x * T - cx, l.y * T - 14 - cy, 0, l.x * T - cx, l.y * T - 14 - cy, 22); g.addColorStop(0, "rgba(255,200,120,.2)"); g.addColorStop(1, "rgba(255,200,120,0)"); fx.fillStyle = g; fx.fillRect(l.x * T - cx - 22, l.y * T - 36 - cy, 44, 44); }
    fx.globalCompositeOperation = "source-over";
  }
  // 白天：暖暖的陽光（加亮，不蒙灰）、天窗灑下一圈日光
  function litPass(cx, cy) {
    fx.globalCompositeOperation = "lighter";
    const X = PLATFORM.cx * T - cx, Y = PLATFORM.cy * T - cy, g = fx.createRadialGradient(X, Y, 0, X, Y, 110);
    g.addColorStop(0, "rgba(255,234,190,.16)"); g.addColorStop(1, "rgba(255,234,190,0)");
    fx.fillStyle = g; fx.fillRect(0, 0, vw, vh);
    fx.globalCompositeOperation = "source-over";
  }
  function placeDom(cx, cy) {
    const at = (el, X, Y) => { el.style.transform = `translate(${Math.round((X - cx) * S)}px, ${Math.round((Y - cy) * S)}px)`; };
    for (const s of signs) at(s.el, s.x, s.y);
    const now = performance.now();
    const W = root.clientWidth, H = root.clientHeight, TOP = 64;
    // 小展牌：浮在展櫃（或出口的門）上方；上面放不下就放到人的下面
    if (!act.hidden && near) {
      const X = near.kind === "item" ? near.it.home.x : EXIT_AT.x, up = near.kind === "item" ? near.it.ty * T - 13 : EXIT.y * T - 18, down = p.y + 6;
      const bw = act.offsetWidth, bh = act.offsetHeight, sx = (X - cx) * S;
      const below = (up - cy) * S - bh - 4 < TOP;
      const left = clamp(sx - bw / 2, 8, Math.max(8, W - 8 - bw));
      const top = below ? (down - cy) * S + 8 : (up - cy) * S - bh - 4;
      act.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      act.style.setProperty("--tail", `${Math.round(clamp(sx - left, 10, bw - 10))}px`);
      act.classList.toggle("below", below);
    }
    // 對話泡泡：釘在說話那一刻的位置（跟著地圖），時間到淡出；一定在畫面裡
    for (const b of bubbles) {
      if (b.el.hidden) continue;
      if (b.until < now) { b.el.hidden = true; continue; }
      // 人走開了（離說話的地方約 56 像素）：馬上淡掉，不留在畫面上（使用者嫌過延遲）
      if (b.until - now > 220 && Math.hypot(p.x - b.x, p.y - b.fy) > 56) b.until = now + 220;
      b.el.classList.toggle("out", b.until - now < 450);
      const bw = b.el.offsetWidth, bh = b.el.offsetHeight;
      const sx = (b.x - cx) * S;
      const su = (b.up - cy) * S, sd = (b.down - cy) * S;
      // 放上面還是下面，只在剛出現時決定，之後不換邊（不然會跳來跳去）
      if (b.side === null) b.side = su - bh - 8 < TOP ? "below" : "above";
      const below = b.side === "below";
      const left = clamp(sx - bw / 2, 8, Math.max(8, W - 8 - bw));
      const top = clamp(below ? sd + 10 : su - bh - 8, TOP, Math.max(TOP, H - bh - 8));
      b.el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      b.el.style.setProperty("--tail", `${Math.round(clamp(sx - left, 12, bw - 12))}px`);
      b.el.classList.toggle("below", below);
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
    help.textContent = helpText();
    help.hidden = false; help.classList.remove("out");
    clearTimeout(showHelp.t); showHelp.t = setTimeout(hideHelp, 7000);
  }
  // 操作說明跟著模式：夜裡多一句「展品會跑」
  function helpText() {
    const tail = night ? "展品會跑，走近它就乖乖站好。" : "右上角的月亮可以熄燈。";
    return coarse ? `按住畫面任一處拖曳，就能走。走近展品，點展櫃上方的小展牌。${tail}` : `方向鍵或 WASD 走動，空白鍵看說明牌。${tail}`;
  }
  function hideHelp() { if (help.hidden || help.classList.contains("out")) return; help.classList.add("out"); setTimeout(() => help.hidden = true, 600); }

  /* ---------- 輸入：鍵盤、拖曳搖桿（按下的地方就是底座） ---------- */
  const KEY = { arrowleft: "l", a: "l", arrowright: "r", d: "r", arrowup: "u", w: "u", arrowdown: "d", s: "d" };
  addEventListener("keydown", e => {
    if (!running || opt.blocked() || e.target.closest?.("input, textarea")) return;
    const k = e.key.toLowerCase();
    if (KEY[k]) { keys.add(KEY[k]); target = null; e.preventDefault(); if (document.activeElement === act) act.blur(); }
    else if ((k === " " || k === "enter" || k === "e") && !e.target.closest?.("button:not(.m-tag), a")) { if (!e.repeat) interact(); e.preventDefault(); }
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
      night = isNight; running = true; guardSaid = false; resize();
      Object.assign(p, { x: SPAWN.x, y: SPAWN.y, dir: "up", ang: -Math.PI / 2, frame: 0 });
      camX = clamp(Math.round(p.x) - (vw >> 1), 0, Math.max(0, MW * T - vw)); camY = clamp(Math.round(p.y) - 10 - (vh >> 1), 0, Math.max(0, MH * T - vh));
      curRoom = "hall"; showBanner("hall"); loop();
      if (!helpShown) showHelp();
    },
    setNight(isNight) { night = isNight; guardSaid = false; for (const b of bubbles) b.el.hidden = true; if (!help.hidden) help.textContent = helpText(); },
    resume() { running = true; resize(); loop(); },
    pause() { running = false; cancelAnimationFrame(raf); keys.clear(); joy.id = null; joyEl.hidden = true; },
    stop() { this.pause(); helpShown = false; help.hidden = true; act.hidden = true; nearest.key = null; near = null; },
    get started() { return running || camX !== 0 || camY !== 0; }
  };
}
