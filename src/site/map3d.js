// 微光博物館｜3D 館內地圖（取代原本的像素地圖）
// 使用者看了 3D 試做版說「這個就是我想要呈現的感覺」，決定整張改 3D、人物用 Q 版。
// 斜俯視跟著人走，靠鏡頭那面牆切低（剖面模型屋）；人走進理財廳時，大廳北牆自動降下來，才不會擋住人。
// 像真正的博物館：白色大理石大廳、古典柱、半身像；四個展廳各有自己的牆色和地板，門口是燙金門框＋燙金廳名牌（固定在牆上，不跟著畫面跑）。
// 白天（開館）：天光、安靜的遊客；夜晚：月光、展櫃聚光燈、手電筒，展品跑出展櫃亂逛，你一靠近就跑回去裝死。
// 介面跟像素地圖一樣：createMap(root, opt) → { start, setNight, resume, pause, stop, started }。
// 單位：1＝大約一公尺。x 往右（東）、z 往鏡頭（南）、y 往上。
import * as THREE from "./three.min.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const rr = (a, b) => a + Math.random() * (b - a);

export function createMap(root, opt) {
  const { floors, exhibits, reduced } = opt;
  const coarse = matchMedia("(pointer: coarse)").matches;
  root.innerHTML = `<div class="m-stage"></div><div class="m-layer"></div><div class="m-joy" hidden><span></span></div><p class="m-banner" hidden></p><p class="m-help" hidden></p>`;
  const q = s => root.querySelector(s);
  const stage = q(".m-stage"), layer = q(".m-layer"), joyEl = q(".m-joy"), banner = q(".m-banner"), help = q(".m-help");
  const act = document.createElement("button"); act.type = "button"; act.className = "m-tag"; act.hidden = true; layer.appendChild(act);
  const bubble = document.createElement("p"); bubble.className = "m-bubble"; bubble.hidden = true; layer.appendChild(bubble);

  /* ---------- 算圖 ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.6 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  stage.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .5, 140);

  /* ---------- 材質 ---------- */
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: 0, ...o });
  const M = {
    gold: std(0xc9a14e, { metalness: .9, roughness: .3 }), brass: std(0xb8913f, { metalness: .8, roughness: .38 }),
    exGold: std(0xd2a84f, { metalness: .85, roughness: .3, emissive: 0x6a4a10, emissiveIntensity: 0 }),   // 展品：夜裡微微發光
    exIvory: std(0xf1e9d6, { roughness: .45, emissive: 0x5a4a30, emissiveIntensity: 0 }),
    ivory: std(0xf1e9d6, { roughness: .45 }), bone: std(0xe4d6b8, { roughness: .58 }), boneDark: std(0xc9b994, { roughness: .6 }),
    wallW: std(0xece6da, { roughness: .92 }), baseW: std(0xd6cdbd, { roughness: .8 }), cap: std(0xd9d3c7, { roughness: .6 }),
    marble: std(0xf2efe9, { roughness: .25 }), darkMarble: std(0x2c3138, { roughness: .25 }), plinth: std(0xf4f1ea, { roughness: .55 }),
    leather: std(0x2c211b, { roughness: .55 }), wood: std(0x6b4a2e, { roughness: .55 }), steel: std(0x3a3f47, { metalness: .6, roughness: .45 }),
    leaf: std(0x3b5e44, { roughness: .8 }), leaf2: std(0x4f7a56, { roughness: .8 }), pot: std(0xe8e2d6, { roughness: .6 }),
    rope: std(0x7c2430, { roughness: .6 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xeef4ff, roughness: .04, transparent: true, opacity: .14, depthWrite: false }),
    beam: new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: .05, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
  };
  function canvasTex(w, h, draw, rep = [1, 1]) {
    const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); return t;
  }
  function veins(g, w, h, n, col) {
    for (let i = 0; i < n; i++) {
      g.strokeStyle = col(rnd()); g.lineWidth = .5 + rnd() * 1.6; g.beginPath();
      let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
      for (let k = 0; k < 7; k++) { const nx = x + (rnd() - .35) * 220, ny = y + (rnd() - .5) * 160; g.quadraticCurveTo((x + nx) / 2 + (rnd() - .5) * 80, (y + ny) / 2 + (rnd() - .5) * 80, nx, ny); x = nx; y = ny; }
      g.stroke();
    }
  }
  const tiles = (g, w, h, n, col) => { g.strokeStyle = col; g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke(); } };
  // 地板：大廳白色大理石、遊戲廳星空地毯、理財廳人字拼、測驗廳石板、商店橡木
  const FLOORS = {
    marble: () => canvasTex(1024, 1024, (g, w, h) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(40,14%,${93 + rnd() * 3}%)`; g.fillRect(i * w / 4, j * h / 4, w / 4, h / 4); }
      veins(g, w, h, 34, r => `rgba(120,124,132,${.06 + r * .16})`); veins(g, w, h, 18, r => `rgba(170,160,140,${.05 + r * .1})`);
      tiles(g, w, h, 4, "rgba(150,145,135,.45)");
    }),
    stars: () => canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#1a2346"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(232,200,137,${.15 + rnd() * .5})`; const s = rnd() < .9 ? 1.5 : 3; g.fillRect(rnd() * w, rnd() * h, s, s); }
      g.strokeStyle = "rgba(232,200,137,.35)"; g.lineWidth = 1.2; for (let i = 0; i < 6; i++) { const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 3; g.beginPath(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? r * .45 : r; g.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } g.closePath(); g.stroke(); }
    }),
    parquet: () => canvasTex(512, 512, (g, w, h) => {
      const s = 32, cols = ["#b98a5a", "#a97a4c", "#c49866", "#ae8052", "#b48557"]; g.fillStyle = "#9c7046"; g.fillRect(0, 0, w, h);
      for (let y = -2; y < h / s + 2; y++) for (let x = -2; x < w / s + 2; x++) {
        g.save(); g.translate(x * s * 2 + (y % 2) * s, y * s); g.rotate((x + y) % 2 ? Math.PI / 4 : -Math.PI / 4);
        g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.fillRect(-s * .95, -s * .24, s * 1.9, s * .48);
        g.strokeStyle = "rgba(60,36,18,.35)"; g.lineWidth = 1; g.strokeRect(-s * .95, -s * .24, s * 1.9, s * .48); g.restore();
      }
    }),
    slate: () => canvasTex(512, 512, (g, w, h) => {
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = `hsl(215,9%,${40 + rnd() * 7}%)`; g.fillRect(i * w / 4, j * h / 4, w / 4, h / 4); }
      veins(g, w, h, 20, r => `rgba(20,24,30,${.05 + r * .1})`); tiles(g, w, h, 4, "rgba(20,24,30,.55)");
    }),
    oak: () => canvasTex(512, 512, (g, w, h) => {
      const n = 8; for (let i = 0; i < n; i++) { let y = 0; while (y < h) { const l = 120 + rnd() * 160; g.fillStyle = `hsl(34,${38 + rnd() * 10}%,${58 + rnd() * 8}%)`; g.fillRect(i * w / n, y, w / n, l); g.fillStyle = "rgba(70,44,20,.35)"; g.fillRect(i * w / n, y, w / n, 2); y += l; } g.fillStyle = "rgba(70,44,20,.4)"; g.fillRect(i * w / n, 0, 2, h); }
    })
  };
  function portraitTex(hue, kind = 0) {
    return canvasTex(160, 200, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, `hsl(${hue},28%,30%)`); gr.addColorStop(1, `hsl(${hue + 10},30%,12%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      if (kind) {
        g.fillStyle = `hsl(${hue + 30},25%,55%)`; g.fillRect(0, h * .55, w, h * .45);
        g.fillStyle = "rgba(240,220,170,.85)"; g.beginPath(); g.arc(w * .7, h * .3, 16, 0, Math.PI * 2); g.fill();
        g.fillStyle = `hsl(${hue + 40},20%,25%)`; g.beginPath(); g.moveTo(0, h * .62); g.quadraticCurveTo(w * .4, h * .4, w, h * .6); g.lineTo(w, h); g.lineTo(0, h); g.fill();
      } else {
        g.fillStyle = "#d9b896"; g.beginPath(); g.ellipse(80, 82, 26, 32, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#2b1d14"; g.beginPath(); g.ellipse(80, 62, 30, 24, 0, Math.PI, 0); g.fill();
        g.fillStyle = `hsl(${hue + 20},22%,22%)`; g.beginPath(); g.ellipse(80, 196, 62, 70, 0, Math.PI, 0); g.fill();
        g.fillStyle = "#efe6d2"; g.beginPath(); g.moveTo(70, 128); g.lineTo(80, 150); g.lineTo(90, 128); g.fill();
      }
    });
  }
  // 燙金廳名牌：深墨藍底、細金框、金字（固定在門楣上）
  function plaqueTex(big, small, { moon = false } = {}) {
    return canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = moon ? "#e9eef6" : "#14203f"; g.fillRect(0, 0, w, h);
      const gold = g.createLinearGradient(0, 0, w, h); gold.addColorStop(0, "#f6e3a8"); gold.addColorStop(.45, "#d4a64a"); gold.addColorStop(1, "#a07a2e");
      const ink = moon ? "#1b2d4f" : gold;
      g.strokeStyle = ink; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 2; g.strokeRect(28, 28, w - 56, h - 56);
      g.fillStyle = ink; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `700 ${small ? 92 : 104}px "Noto Serif TC", serif`; g.fillText(big, w / 2, small ? h * .42 : h / 2 + 4);
      if (small) { g.font = `italic 500 52px "Cormorant Garamond", serif`; g.fillText(small, w / 2, h * .76); }
    }, [1, 1]);
  }

  /* ---------- 小工具 ---------- */
  const solids = [], circles = [];
  function box(w, h, d, mat, x, y, z, { shadow = true, solid = false, parent = scene } = {}) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z);
    m.castShadow = shadow; m.receiveShadow = true; parent.add(m);
    if (solid) solids.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
    return m;
  }
  function cyl(rt, rb, h, mat, x, y, z, seg = 24, parent = scene) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function sph(r, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
  const solidCircle = (x, z, r) => circles.push([x, z, r]);
  function blocked(x, z, r = .26) {
    for (const [a, b, c, d] of solids) if (x + r > a && x - r < c && z + r > b && z - r < d) return true;
    for (const [cx, cz, cr] of circles) if (Math.hypot(x - cx, z - cz) < cr + r) return true;
    return !inside(x, z, r);
  }

  /* ---------- 平面：大廳＋四個展廳（floors 依序放西、北、東、南） ---------- */
  const H = 3, LOW = .5;
  const HALL = { x0: -7, x1: 7, z0: -6, z1: 6 };
  const SLOTS = {
    west: { x0: -17.4, x1: -7.4, z0: -5, z1: 5, floor: "stars", wall: 0x23392f, base: 0x182a22 },
    north: { x0: -8, x1: 8, z0: -14, z1: -6.4, floor: "parquet", wall: 0x1d2b4f, base: 0x14203c },
    east: { x0: 7.4, x1: 17.4, z0: -5, z1: 5, floor: "slate", wall: 0x4a2329, base: 0x35181d },
    south: { x0: -5, x1: 5, z0: 6.4, z1: 12.6, floor: "oak", wall: 0xece6da, base: 0xd6cdbd }
  };
  const POS = ["west", "north", "east", "south"];
  const rooms = floors.slice(0, 4).map((f, i) => ({ f, pos: POS[i], ...SLOTS[POS[i]] }));
  const roomAt = pos => rooms.find(r => r.pos === pos);
  const areas = [HALL, ...rooms];
  // 可以走的範圍：大廳、各廳、門口
  const DOORS = { west: [-7.6, -1.3, -6.8, 1.3], north: [-1.6, -6.6, 1.6, -5.8], east: [6.8, -1.3, 7.6, 1.3], south: [-1.6, 5.8, 1.6, 6.6] };
  function inside(x, z, r) {
    for (const a of areas) if (x - r >= a.x0 && x + r <= a.x1 && z - r >= a.z0 && z + r <= a.z1) return true;
    for (const r0 of rooms) { const [a, b, c, d] = DOORS[r0.pos]; if (x >= a && x <= c && z >= b && z <= d) return true; }
    return false;
  }
  // 外面的地面
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), std(0xd6d1c7, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; scene.add(ground);
  function floorPlane(a, kind, rough) {
    const tex = FLOORS[kind](); const w = a.x1 - a.x0, d = a.z1 - a.z0;
    tex.repeat.set(kind === "marble" ? w / 8 : w / 4, kind === "marble" ? d / 8 : d / 4);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std(0xffffff, { map: tex, roughness: rough }));
    m.rotation.x = -Math.PI / 2; m.position.set((a.x0 + a.x1) / 2, 0, (a.z0 + a.z1) / 2); m.receiveShadow = true; scene.add(m);
  }
  floorPlane(HALL, "marble", .22);
  for (const r of rooms) floorPlane(r, r.floor, r.floor === "stars" ? .95 : r.floor === "parquet" ? .5 : .4);
  // 門口（牆的厚度那一段）也鋪大理石，剛好接在大廳地板外面，不重疊
  const GAP = { west: [-7.4, -1.3, -7, 1.3], north: [-1.6, -6.4, 1.6, -6], east: [7, -1.3, 7.4, 1.3], south: [-1.6, 6, 1.6, 6.4] };
  for (const r of rooms) { const [a, b, c, d] = GAP[r.pos]; floorPlane({ x0: a, x1: c, z0: b, z1: d }, "marble", .22); }

  // 牆：灰泥牆面＋踢腳板＋牆頂淺石材。mat＝牆色；h＝高度
  const wallMat = {}; const matFor = c => wallMat[c] ||= std(c, { roughness: .92 });
  function wall(x0, z0, x1, z1, { h = H, color = 0xece6da, base = 0xd6cdbd, parent = scene, solid = true } = {}) {
    const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (w < .01 || d < .01) return;
    box(w, h, d, matFor(color), cx, 0, cz, { solid, parent });
    box(w + .03, .16, d + .03, matFor(base), cx, 0, cz, { shadow: false, parent });
    if (h > 1.2) box(w + .05, .1, d + .05, M.cap, cx, h - .1, cz, { shadow: false, parent });
    box(w + .07, .05, d + .07, M.cap, cx, h, cz, { shadow: false, parent });
  }
  // 大廳北牆：人走進北邊的廳時要降下來（不然擋住人），所以放在一個群組裡
  const northWall = new THREE.Group(); scene.add(northWall);
  const hasN = !!roomAt("north"), hasW = !!roomAt("west"), hasE = !!roomAt("east"), hasS = !!roomAt("south");
  if (hasN) { wall(-7.4, -6.4, -1.6, -6, { parent: northWall }); wall(1.6, -6.4, 7.4, -6, { parent: northWall }); box(3.2, .6, .4, M.wallW, 0, H - .6, -6.2, { parent: northWall }); }
  else wall(-7.4, -6.4, 7.4, -6, { parent: northWall });
  const northLow = new THREE.Group(); scene.add(northLow); northLow.visible = false;   // 降下來時看到的矮牆
  wall(-7.4, -6.4, hasN ? -1.6 : 7.4, -6, { h: LOW, parent: northLow, solid: false }); if (hasN) wall(1.6, -6.4, 7.4, -6, { h: LOW, parent: northLow, solid: false });
  // 大廳西、東、南牆（有展廳的那面在中間留門）
  const sideWall = (x0, x1, open) => open ? (wall(x0, -6, x1, -1.3), wall(x0, 1.3, x1, 6.4)) : wall(x0, -6, x1, 6.4);
  sideWall(-7.4, -7, hasW); sideWall(7, 7.4, hasE);
  if (hasS) { wall(-7.4, 6, -1.6, 6.4, { h: LOW }); wall(1.6, 6, 7.4, 6.4, { h: LOW }); } else wall(-7.4, 6, 7.4, 6.4, { h: LOW });
  // 各展廳的牆（靠鏡頭那面切低）
  for (const r of rooms) {
    const o = { color: r.wall, base: r.base };
    if (r.pos === "west") { wall(r.x0 - .4, r.z0 - .4, r.x1, r.z0, o); wall(r.x0 - .4, r.z0, r.x0, r.z1 + .4, o); wall(r.x0 - .4, r.z1, r.x1, r.z1 + .4, { ...o, h: LOW }); }
    if (r.pos === "east") { wall(r.x0, r.z0 - .4, r.x1 + .4, r.z0, o); wall(r.x1, r.z0, r.x1 + .4, r.z1 + .4, o); wall(r.x0, r.z1, r.x1 + .4, r.z1 + .4, { ...o, h: LOW }); }
    if (r.pos === "north") {
      wall(r.x0 - .4, r.z0 - .4, r.x1 + .4, r.z0, o); wall(r.x0 - .4, r.z0, r.x0, r.z1, o); wall(r.x1, r.z0, r.x1 + .4, r.z1, o);
      wall(r.x0 - .4, r.z1, -7.4, r.z1 + .4, o); wall(7.4, r.z1, r.x1 + .4, r.z1 + .4, o);
      // 大廳北牆背面（展廳這一側）刷展廳的顏色
      box(5.8, H - .02, .02, matFor(r.wall), -4.5, 0, -6.41, { shadow: false, parent: northWall }); box(5.8, H - .02, .02, matFor(r.wall), 4.5, 0, -6.41, { shadow: false, parent: northWall });
    }
    if (r.pos === "south") { wall(r.x0 - .4, r.z0, r.x0, r.z1 + .4, { ...o, h: 1.4 }); wall(r.x1, r.z0, r.x1 + .4, r.z1 + .4, { ...o, h: 1.4 }); wall(r.x0 - .4, r.z1, r.x1 + .4, r.z1 + .4, { ...o, h: LOW }); }
  }

  /* ---------- 展廳入口：燙金門框＋燙金廳名牌（固定在門上，走過去就看得到是哪一廳） ---------- */
  const glowMats = [];   // 夜裡要亮一點的牌子
  function plaque(tex, w, h, x, y, z, rotY = 0, parent = scene) {
    const mat = std(0xffffff, { map: tex, roughness: .4, metalness: .25, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: .05 });
    glowMats.push(mat);
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; parent.add(g);
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + .08, h + .08, .05), M.gold); back.castShadow = true; g.add(back);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); face.position.z = .03; g.add(face);
    return g;
  }
  function portal(r) {
    const label = `${r.f.numeral || ""}　${r.f.label}`, en = r.f.en || "";
    if (r.pos === "north") {
      for (const s of [-1, 1]) { box(.12, H - .62, .12, M.gold, s * 1.66, 0, -5.98, { parent: northWall }); }
      box(3.5, .1, .14, M.gold, 0, H - .7, -5.98, { parent: northWall });
      plaque(plaqueTex(label, en), 2.2, .55, 0, H - .32, -5.94, 0, northWall);
    } else if (r.pos === "south") {
      // 南門那面牆切低了：門兩邊兩根矮金柱，牌子斜放在矮牆上朝鏡頭（不做高拱門，才不會擋住大廳裡的人）
      for (const s of [-1, 1]) { cyl(.06, .08, .9, M.gold, s * 1.72, 0, 6.2, 16); sph(.08, M.gold, s * 1.72, .95, 6.2); }
      const g = plaque(plaqueTex(label, en), 1.7, .42, 3.6, .78, 6.05); g.rotation.x = -.55;
    } else {
      // 側門：燙金門框＋一塊從牆上伸出來的掛牌（牌面朝鏡頭，一眼讀得到）
      const s = r.pos === "west" ? -1 : 1, x = s * 7;
      for (const z of [-1.36, 1.36]) box(.12, H - .4, .12, M.gold, x - s * .04, 0, z);
      box(.12, .1, 2.84, M.gold, x - s * .04, H - .5, 0);
      const arm = box(.9, .05, .05, M.gold, x - s * .45, H - .2, 1.6, { shadow: false });
      const g = plaque(plaqueTex(label, en), 1.5, .38, x - s * .78, H - .5, 1.6);
      for (const dx of [-.5, .5]) box(.012, .14, .012, M.gold, x - s * .78 + dx, H - .32, 1.6, { shadow: false });
    }
  }
  rooms.forEach(portal);

  /* ---------- 窗 ---------- */
  const windows = [];
  function windowAt(x, z, rotY = 0, w = 1.1, h = 1.7, y = 1) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
    const pm = new THREE.MeshBasicMaterial({ color: 0xf4f8ff }); windows.push(pm);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), pm); pane.position.y = h / 2; g.add(pane);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), pm); arch.position.y = h; g.add(arch);
    const fm = std(0xf2eee6, { roughness: .5 });
    for (const fx of [-w / 2, 0, w / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, h, .04), fm); b.position.set(fx, h / 2, .01); g.add(b); }
    for (const fy of [h * .33, h * .66]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .04, .04), fm); b.position.set(0, fy, .01); g.add(b); }
    const sill = new THREE.Mesh(new THREE.BoxGeometry(w + .2, .06, .14), M.gold); sill.position.set(0, -.03, .04); g.add(sill);
    return g;
  }
  function painting(x, y, z, w, h, tex, rotY = 0, eyes = false) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(w + .14, h + .14, .07), M.gold); fr.castShadow = true; g.add(fr);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, { map: tex, roughness: .8 })); pic.position.z = .04; g.add(pic);
    const light = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .12), M.brass); light.position.set(0, h / 2 + .22, .1); g.add(light);
    if (eyes) {   // 肖像的眼睛：夜裡跟著你轉
      const em = std(0x1a1410, { roughness: .3 }), wm = std(0xf4eee2, { roughness: .5 });
      const pupils = [-1, 1].map(s => { const white = new THREE.Mesh(new THREE.CircleGeometry(.03, 12), wm); white.position.set(s * .06 * w / .7, .03 * h / .9 + h * .06, .045); g.add(white);
        const p = new THREE.Mesh(new THREE.CircleGeometry(.016, 10), em); p.position.set(white.position.x, white.position.y, .047); g.add(p); return { p, x: white.position.x, y: white.position.y }; });
      portraits.push({ g, pupils });
    }
    return g;
  }
  const portraits = [];

  /* ---------- 大廳陳設（擺在牆邊，不擋路） ---------- */
  const DAIS = { x: 0, z: .2, r: 2.8 };
  cyl(2.75, 2.85, .12, M.darkMarble, DAIS.x, 0, DAIS.z, 64);
  cyl(2.6, 2.65, .2, M.marble, DAIS.x, .12, DAIS.z, 64);
  { const band = new THREE.Mesh(new THREE.TorusGeometry(2.6, .018, 6, 128), M.gold); band.rotation.x = Math.PI / 2; band.position.set(DAIS.x, .31, DAIS.z); scene.add(band); }
  solidCircle(DAIS.x, DAIS.z, 2.85);
  for (const [r0, r1, mat, y] of [[3.6, 3.85, M.darkMarble, .004], [3.95, 3.99, M.gold, .005]]) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 120), mat); m.rotation.x = -Math.PI / 2; m.position.set(DAIS.x, y, DAIS.z); m.receiveShadow = true; scene.add(m);
  }
  function bench(x, z, rot) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
    const cush = new THREE.Mesh(new THREE.BoxGeometry(1.6, .14, .5), M.leather); cush.position.y = .44; cush.castShadow = cush.receiveShadow = true; g.add(cush);
    for (const lx of [-.7, .7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .38, .45), M.brass); l.position.set(lx, .19, 0); l.castShadow = true; g.add(l); }
    const along = Math.abs(Math.sin(rot)) > .5;
    solids.push(along ? [x - .3, z - .85, x + .3, z + .85] : [x - .85, z - .3, x + .85, z + .3]);
  }
  bench(-6.45, 3.4, Math.PI / 2); bench(6.45, 3.4, Math.PI / 2);
  function column(x, z) {
    box(.7, .16, .7, M.marble, x, 0, z); cyl(.27, .3, .1, M.marble, x, .16, z, 24);
    cyl(.22, .25, H - .5, M.marble, x, .26, z, 20);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, f = new THREE.Mesh(new THREE.BoxGeometry(.02, H - .56, .02), M.baseW); f.position.set(x + Math.cos(a) * .235, .26 + (H - .5) / 2, z + Math.sin(a) * .235); scene.add(f); }
    cyl(.3, .24, .14, M.marble, x, H - .24, z, 24); box(.66, .1, .66, M.marble, x, H - .1, z);
    solidCircle(x, z, .36);
  }
  for (const [x, z] of [[-4.9, -4.1], [4.9, -4.1], [-4.9, 4.1], [4.9, 4.1]]) column(x, z);
  function plant(x, z, s = 1) {
    cyl(.24 * s, .19 * s, .5 * s, M.pot, x, 0, z, 18);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, leaf = new THREE.Mesh(new THREE.SphereGeometry(.14 * s, 8, 6), i % 2 ? M.leaf : M.leaf2);
      leaf.scale.set(.6, 1.8, .25); leaf.position.set(x + Math.cos(a) * .16 * s, (.85 + (i % 3) * .18) * s, z + Math.sin(a) * .16 * s); leaf.rotation.set(Math.sin(a) * .6, a, -Math.cos(a) * .6); leaf.castShadow = true; scene.add(leaf);
    }
    solidCircle(x, z, .28 * s);
  }
  for (const [x, z] of [[-6.4, -5.4], [6.4, -5.4], [-6.4, 5.5], [6.4, 5.5]]) plant(x, z, 1.15);
  // 大理石半身像（夜裡你走過去之後，牠把頭轉過來）
  const statues = [];
  function bust(x, z) {
    box(.56, 1.1, .56, M.plinth, x, 0, z, { solid: true }); box(.64, .06, .64, M.plinth, x, 1.1, z); box(.64, .08, .64, M.plinth, x, 0, z);
    const g = new THREE.Group(); g.position.set(x, 1.16, z); scene.add(g);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(.24, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), M.marble); chest.scale.set(1.15, .9, .7); chest.castShadow = true; g.add(chest);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(.06, .07, .14, 12), M.marble); neck.position.y = .26; g.add(neck);
    const head = new THREE.Group(); head.position.y = .44; g.add(head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(.13, 20, 16), M.marble); skull.scale.set(.9, 1.1, 1); skull.castShadow = true; head.add(skull);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(.135, 16, 10, 0, Math.PI * 2, 0, Math.PI * .5), M.marble); hair.position.set(0, .03, -.02); hair.rotation.x = -.4; head.add(hair);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(.025, .06, 6), M.marble); nose.position.set(0, -.01, .13); nose.rotation.x = Math.PI / 2; head.add(nose);
    statues.push({ x, z, head, near: false, pose: 0 });
  }
  if (hasN) { bust(-2.6, -5.45); bust(2.6, -5.45); }
  // 牆上的畫：北牆一幅肖像（眼睛會跟著你）、側牆兩幅風景
  { const p = painting(-3.9, 1.75, -5.77, .7, .9, portraitTex(210), 0, true); northWall.add(p); }
  painting(-6.77, 1.75, -3.4, 1.3, .9, portraitTex(150, 1), Math.PI / 2);
  painting(6.77, 1.75, -3.4, 1.3, .9, portraitTex(30, 1), -Math.PI / 2);
  { const w = windowAt(4.2, -5.79); northWall.add(w); }
  // 出口（大廳北牆左邊，跟進館的位置相反）＋月白琺瑯牌
  const EXIT = { x: -5.6, z: -5.3 };
  {
    const g = new THREE.Group(); g.position.set(-5.6, 0, -5.97); northWall.add(g);
    const door = std(0x5a3e28, { roughness: .45 });
    for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.66, 2.2, .06), door); d.position.set(s * .34, 1.1, 0); d.castShadow = true; g.add(d);
      for (const py of [.6, 1.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.46, .6, .02), std(0x4c3422, { roughness: .5 })); p.position.set(s * .34, py, .04); g.add(p); }
      const k = new THREE.Mesh(new THREE.BoxGeometry(.02, .22, .03), M.brass); k.position.set(s * .07, 1.1, .06); g.add(k); }
    const fr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.34, .05), M.marble); fr.position.set(0, 1.17, -.03); g.add(fr);
    plaque(plaqueTex("出口　EXIT", "", { moon: true }), 1, .26, 0, 2.58, .04, 0, g);
  }
  // 警衛的服務台（大廳西南角，不擋路）
  box(1.3, 1, .55, M.marble, -3.4, 0, 5.15, { solid: true }); box(1.38, .05, .62, M.darkMarble, -3.4, 1, 5.15);
  const GUARD_AT = new THREE.Vector3(-3.4, 0, 5.75);

  /* ---------- 恐龍骨架：脊椎、肋骨、骨盆、腿、頭骨（掏空的眼窩）、支架 ---------- */
  const dino = new THREE.Group(); dino.position.set(DAIS.x, .32, DAIS.z); scene.add(dino);
  const dinoBody = new THREE.Group(); dinoBody.scale.setScalar(.82); dino.add(dinoBody);
  const dinoHead = new THREE.Group(), dinoJaw = new THREE.Group();
  {
    const B = M.bone, add = (m, p = dinoBody) => { m.castShadow = true; p.add(m); return m; };
    const tube = (pts, r, p = dinoBody, mat = B) => add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v => new THREE.Vector3(...v))), 24, r, 8), mat), p);
    const joint = (x, y, z, r, p = dinoBody) => add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), B), p).position.set(x, y, z);
    // 脊椎：尾巴尖 → 骨盆 → 肩膀 → 脖子（S 形）
    const spine = new THREE.CatmullRomCurve3([[-3.3, .95, 0], [-2.5, 1.3, 0], [-1.4, 1.75, 0], [-.3, 2.02, 0], [.6, 2.05, 0], [1.4, 1.95, 0], [1.85, 2.15, 0], [2.1, 2.5, 0], [2.35, 2.62, 0]].map(v => new THREE.Vector3(...v)));
    const N = 46, up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= N; i++) {
      const t = i / N, p = spine.getPoint(t), tan = spine.getTangent(t);
      const body = t > .3 && t < .75, neck = t >= .75;
      const r = t < .3 ? .03 + t * .2 : body ? .095 : .075 - (t - .75) * .1;
      const v = add(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, r * 1.5, 10), B)); v.position.copy(p);
      v.quaternion.setFromUnitVectors(up, tan);
      // 棘突：背上的一片一片
      const sh = (t < .3 ? .05 + t * .5 : body ? .28 - Math.abs(t - .5) * .4 : .07);
      const sp = add(new THREE.Mesh(new THREE.BoxGeometry(.035, sh, r * 1.1), B)); sp.position.set(p.x - .02, p.y + r + sh / 2 - .02, 0); sp.rotation.z = .25;
      if (t < .3 && i % 2 === 0) { const ch = add(new THREE.Mesh(new THREE.BoxGeometry(.025, .12 + t * .4, .03), B)); ch.position.set(p.x, p.y - r - .05 - t * .15, 0); ch.rotation.z = -.35; }   // 尾巴下的人字骨
    }
    // 肋骨：從背往下彎、往外撐
    for (let i = 0; i < 9; i++) {
      const x = -.15 + i * .18, top = spine.getPoint(.45 + i * .033), len = .95 - Math.abs(i - 3.5) * .09;
      for (const s of [-1, 1]) tube([[x, top.y - .05, 0], [x - .04, top.y - .2, s * .3], [x - .1, top.y - len * .65, s * .4], [x - .16, top.y - len, s * .14]], .02);
    }
    // 骨盆：髂骨一片、恥骨往前下（腳）、坐骨往後下
    const ilium = new THREE.Shape(); ilium.moveTo(-.65, 0); ilium.quadraticCurveTo(-.1, .32, .5, .06); ilium.lineTo(.4, -.22); ilium.quadraticCurveTo(-.1, -.12, -.55, -.24); ilium.closePath();
    for (const s of [-1, 1]) { const m = add(new THREE.Mesh(new THREE.ExtrudeGeometry(ilium, { depth: .04, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2 }), B)); m.position.set(-.2, 1.88, s * .14 - .02); }
    tube([[-.1, 1.72, 0], [.15, 1.35, 0], [.38, .98, 0]], .045); joint(.42, .95, 0, .09);
    tube([[-.4, 1.72, 0], [-.6, 1.4, 0], [-.75, 1.18, 0]], .035);
    // 腿：大腿、小腿、蹠骨、三根腳趾
    for (const s of [-1, 1]) {
      const z = s * .3;
      joint(-.15, 1.78, z, .1); tube([[-.15, 1.78, z], [.05, 1.4, z], [.18, 1.02, z]], .075); joint(.18, 1.0, z, .085);
      tube([[.18, 1.0, z], [.05, .7, z], [-.12, .42, z]], .055); joint(-.12, .42, z, .06);
      tube([[-.12, .42, z], [.0, .22, z], [.14, .06, z]], .045);
      for (const dz of [-.09, 0, .09]) tube([[.14, .06, z], [.32, .04, z + dz * 1.6], [.46, .02, z + dz * 2.2]], .022);
      // 小手
      tube([[1.35, 1.72, s * .18], [1.46, 1.48, s * .22], [1.6, 1.42, s * .2]], .025);
      for (const dz of [-.03, .03]) tube([[1.6, 1.42, s * .2 + dz], [1.68, 1.36, s * .2 + dz * 2]], .012);
    }
    // 頭骨：側面輪廓擠出來，掏空眼窩和顱側的孔
    dinoHead.position.copy(spine.getPoint(1)); dinoHead.rotation.z = -.12; dinoBody.add(dinoHead);
    const sk = new THREE.Shape();
    sk.moveTo(-.12, .02); sk.quadraticCurveTo(-.14, .3, .08, .36); sk.quadraticCurveTo(.5, .34, .95, .2); sk.quadraticCurveTo(1.06, .14, 1.04, .04);
    sk.lineTo(.98, -.04); sk.quadraticCurveTo(.5, -.06, .08, -.1); sk.quadraticCurveTo(-.08, -.08, -.12, .02);
    const hole = (cx, cy, rx, ry) => { const h = new THREE.Path(); h.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0); return h; };
    sk.holes.push(hole(.22, .2, .075, .085), hole(.52, .12, .14, .065), hole(.02, .14, .05, .08));
    const skull = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sk, { depth: .26, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 3, curveSegments: 18 }), B), dinoHead);
    skull.position.z = -.17; skull.scale.z = 1.3;   // 頭骨加寬一點，從上面看才不會像一片板子
    for (const sd of [-1, 1]) { const brow = add(new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 8), B), dinoHead); brow.position.set(.2, .3, sd * .14); brow.scale.set(1.4, .5, .8); }
    for (const s of [-1, 1]) for (let i = 0; i < 7; i++) { const t = add(new THREE.Mesh(new THREE.ConeGeometry(.02, .08, 6), M.boneDark), dinoHead); t.position.set(.2 + i * .11, -.11, s * .1); t.rotation.x = Math.PI; }
    // 下巴：另外一組，從後面轉開（張嘴）
    dinoJaw.position.set(-.02, -.08, 0); dinoHead.add(dinoJaw);
    const jw = new THREE.Shape(); jw.moveTo(0, 0); jw.lineTo(.96, -.02); jw.quadraticCurveTo(.98, -.08, .9, -.1); jw.quadraticCurveTo(.45, -.2, .05, -.18); jw.quadraticCurveTo(-.06, -.1, 0, 0);
    const jaw = add(new THREE.Mesh(new THREE.ExtrudeGeometry(jw, { depth: .22, bevelEnabled: true, bevelThickness: .03, bevelSize: .02, bevelSegments: 2 }), B), dinoJaw); jaw.position.z = -.11;
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const t = add(new THREE.Mesh(new THREE.ConeGeometry(.018, .07, 6), M.boneDark), dinoJaw); t.position.set(.22 + i * .11, .02, s * .09); }
    // 博物館的鋼支架
    for (const [x, y] of [[-.3, 1.9], [1.3, 1.9], [-2.1, 1.3]]) { const r = add(new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, y, 8), M.steel)); r.position.set(x, y / 2, 0); }
  }
  dino.rotation.y = .55;
  const DINO_BASE = .55;

  /* ---------- 展品：每廳沿著後牆一排展櫃；夜裡會跑出來 ---------- */
  function goldObject(key) {
    const g = new THREE.Group(), G = M.exGold, I = M.exIvory;
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
    const C = (rt, rb, h, s = 16) => new THREE.CylinderGeometry(rt, rb, h, s), S = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h), Bx = (a, b, c) => new THREE.BoxGeometry(a, b, c);
    const dark = std(0x2a2420, { roughness: .4 });
    switch (key) {
      case "phone":   // 燭台電話
        add(S(.14, 20, 10), G, 0, 0, 0).scale.set(1, .45, 1); add(C(.025, .03, .42), G, 0, .26, 0); add(C(.06, .035, .06), G, 0, .5, 0);
        add(C(.07, .07, .03, 24), G, 0, .56, .02, Math.PI / 2); add(C(.04, .04, .032, 20), dark, 0, .56, .03, Math.PI / 2);
        add(Bx(.1, .015, .015), G, -.06, .4, 0); add(C(.025, .025, .16), G, -.12, .35, 0); add(C(.045, .02, .06), G, -.12, .25, 0);
        break;
      case "pixel": { // 公事包
        const lea = std(0x6b4024, { roughness: .5 });
        add(Bx(.46, .3, .14), lea, 0, .17, 0); add(Bx(.47, .12, .15), std(0x5a341c, { roughness: .5 }), 0, .27, .002);
        for (const s of [-1, 1]) add(Bx(.04, .06, .02), G, s * .14, .22, .08);
        add(new THREE.TorusGeometry(.07, .015, 8, 16, Math.PI), G, 0, .33, 0);
        break; }
      case "typewriter":
        add(Bx(.44, .1, .3), dark, 0, .05, 0); add(Bx(.4, .08, .2), std(0x1e2430, { roughness: .4 }), 0, .14, -.04, -.35);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) add(C(.014, .014, .02, 8), I, -.15 + c * .05, .14 + r * .03, .06 - r * .045);
        add(C(.035, .035, .42, 14), dark, 0, .24, -.1, 0, 0, Math.PI / 2); add(new THREE.PlaneGeometry(.26, .24), I, 0, .38, -.1, -.1);
        for (const s of [-1, 1]) add(S(.03), G, s * .23, .24, -.1);
        break;
      case "scroll":
        for (const y of [.06, .58]) add(C(.025, .025, .42, 10), G, 0, y, 0, 0, 0, Math.PI / 2);
        add(new THREE.PlaneGeometry(.34, .5), std(0xf3e8cc, { side: THREE.DoubleSide }), 0, .32, 0); add(new THREE.PlaneGeometry(.06, .06), std(0xa8322c), .1, .14, .002);
        break;
      case "clock":   // 懷錶
        add(C(.22, .22, .06, 32), G, 0, .3, 0, Math.PI / 2); add(C(.19, .19, .02, 32), I, 0, .3, .03, Math.PI / 2);
        add(new THREE.TorusGeometry(.05, .012, 8, 16), G, 0, .58, 0); add(Bx(.012, .13, .01), dark, 0, .35, .045); add(Bx(.09, .012, .01), dark, .04, .3, .045);
        add(Bx(.16, .08, .1), G, 0, .04, 0);
        break;
      case "piggy":
        add(S(.2, 20, 14), I, 0, .26, 0).scale.set(1.25, 1, 1); add(C(.07, .08, .08), I, .27, .26, 0, 0, 0, Math.PI / 2);
        for (const [x, z] of [[-.13, -.09], [-.13, .09], [.13, -.09], [.13, .09]]) add(C(.04, .04, .1, 10), I, x, .05, z);
        for (const z of [-.08, .08]) add(new THREE.ConeGeometry(.04, .08, 6), I, .14, .46, z);
        add(C(.07, .07, .015, 20), G, 0, .55, 0, Math.PI / 2);
        break;
      case "hourglass": {
        add(C(.17, .17, .04, 20), G, 0, .02, 0); add(C(.17, .17, .04, 20), G, 0, .62, 0);
        for (const a of [0, 2.1, 4.2]) add(C(.015, .015, .58, 8), G, Math.cos(a) * .14, .32, Math.sin(a) * .14);
        const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(.02 + Math.pow(Math.abs(t - .5) * 2, 1.6) * .1, .04 + t * .56)); }
        add(new THREE.LatheGeometry(pts, 20), M.glass, 0, 0, 0);
        add(new THREE.ConeGeometry(.09, .12, 16), std(0xe8c97a), 0, .1, 0); add(new THREE.ConeGeometry(.07, .1, 16), std(0xe8c97a), 0, .44, 0, Math.PI);
        break; }
      case "scale":
        add(C(.12, .15, .04, 20), G, 0, .02, 0); add(C(.015, .015, .52, 8), G, 0, .3, 0); add(Bx(.5, .02, .02), G, 0, .56, 0, 0, 0, -.12);
        for (const [x, y] of [[-.24, .26], [.24, .32]]) { add(C(.1, .06, .03, 20), G, x, y, 0); add(C(.003, .003, .3, 4), G, x, y + .15, 0); }
        for (let i = 0; i < 3; i++) add(C(.04, .04, .012, 16), G, -.24, .29 + i * .014, 0);
        break;
      case "mask": {  // 威尼斯面具＋握柄＋羽毛
        const sh = new THREE.Shape(); sh.moveTo(-.2, .02); sh.quadraticCurveTo(-.2, .14, 0, .08); sh.quadraticCurveTo(.2, .14, .2, .02); sh.quadraticCurveTo(.18, -.1, .06, -.08); sh.quadraticCurveTo(0, -.02, -.06, -.08); sh.quadraticCurveTo(-.18, -.1, -.2, .02);
        for (const s of [-1, 1]) { const h = new THREE.Path(); h.absellipse(s * .09, .02, .045, .025, 0, Math.PI * 2, false, 0); sh.holes.push(h); }
        add(new THREE.ExtrudeGeometry(sh, { depth: .02, bevelEnabled: true, bevelThickness: .01, bevelSize: .008, bevelSegments: 2 }), G, 0, .42, 0);
        add(C(.01, .01, .4, 8), G, .17, .2, 0, 0, 0, -.15);
        for (const [x, r] of [[-.14, .3], [-.08, .1]]) add(new THREE.ConeGeometry(.03, .26, 6), I, x, .62, 0, 0, 0, r);
        break; }
      case "magnifier":
        add(Bx(.22, .02, .3), I, -.11, .03, 0, 0, 0, .12); add(Bx(.22, .02, .3), I, .11, .03, 0, 0, 0, -.12);
        add(new THREE.TorusGeometry(.12, .015, 10, 32), G, -.02, .24, 0); add(C(.115, .115, .01, 32), M.glass, -.02, .24, 0, Math.PI / 2);
        add(C(.018, .022, .2, 10), dark, .13, .1, 0, 0, 0, .8);
        break;
      case "compass":
        add(C(.2, .21, .07, 32), G, 0, .04, 0); add(C(.17, .17, .01, 32), I, 0, .08, 0);
        add(Bx(.26, .006, .025), std(0xa8322c), 0, .09, 0, 0, .5); add(S(.018), G, 0, .095, 0);
        add(new THREE.TorusGeometry(.035, .01, 8, 16), G, 0, .1, -.21);
        break;
      case "timeclock": { // 一疊捆起來的作業簿
        const cols = [0x7a3a32, 0x2f4a6a, 0x5a6b4a, 0x8a6a3a, 0x3a3a4a, 0x9a8a6a];
        cols.forEach((c, i) => add(Bx(.36, .06, .26), std(c, { roughness: .8 }), (i % 2 ? .02 : -.02), .03 + i * .062, 0, 0, (i % 3 - 1) * .05));
        add(Bx(.012, .38, .27), std(0xc9a86a), 0, .19, 0); add(Bx(.37, .38, .012), std(0xc9a86a), 0, .19, .0);
        break; }
      case "cup":     // 封膜手搖飲＋粗吸管
        add(C(.1, .08, .36, 24), M.glass, 0, .18, 0); add(C(.092, .074, .26, 20), std(0xc99a6a, { roughness: .4 }), 0, .14, 0);
        for (let i = 0; i < 10; i++) add(S(.022, 8, 6), dark, Math.cos(i) * .05, .03 + (i % 2) * .03, Math.sin(i) * .05);
        add(C(.1, .1, .01, 24), std(0xf3ead6), 0, .36, 0); add(C(.015, .015, .34, 10), G, .03, .48, 0, 0, 0, -.25);
        break;
      default:        // 燈籠
        add(C(.12, .12, .3, 6), std(0xffd98a, { emissive: 0xffb84a, emissiveIntensity: .4 }), 0, .2, 0); add(C(.14, .14, .03, 6), G, 0, .05, 0); add(C(.14, .14, .03, 6), G, 0, .36, 0);
    }
    return g;
  }
  const items = [], vitrines = [];
  const MOVES = { hop: 1.5, roll: 1.8, waddle: 1.2, float: 1, scuttle: 2.2, spin: 1.1, tilt: 1, slide: 1.4, wobble: 1, none: 0 };
  const poolTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,226,170,.9)"); gr.addColorStop(1, "rgba(255,226,170,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const pools = [];
  function lightPool(x, z, r, op = .5) {   // 地上一圈暖光（不用真的燈，手機才跑得動）
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, .012, z); scene.add(m); pools.push({ m, op }); return m;
  }
  for (const r of rooms) {
    const list = exhibits.filter(e => e.floor === r.f.id);
    const w = r.x1 - r.x0, n = list.length;
    // 南邊的商店：後牆是大廳的矮牆，展櫃擺在中間；其他廳沿著北牆排一排
    const vz = r.pos === "south" ? r.z0 + 2.4 : r.z0 + 1.3;
    const xs = list.map((_, i) => r.x0 + (i + .5) * w / n);
    list.forEach((e, i) => {
      const x = xs[i], z = vz;
      box(.7, .06, .7, M.baseW, x, 0, z); box(.64, .92, .64, M.plinth, x, .06, z); box(.68, .03, .68, M.brass, x, .98, z);
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(.26, .1), M.brass); plate.position.set(x, .78, z + .325); scene.add(plate);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(.6, .7, .6), M.glass); glass.position.set(x, 1.36, z); scene.add(glass);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0xc9a14e, transparent: true, opacity: .55 })); edges.position.copy(glass.position); scene.add(edges);
      if (r.pos !== "south") box(.1, .08, .34, M.brass, x, 2.55, z - .95, { shadow: false });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.6, 24, 1, true), M.beam.clone()); beam.position.set(x, 1.85, z - .42); beam.rotation.x = -.38; scene.add(beam);
      lightPool(x, z + .55, 1, .35);
      solids.push([x - .4, z - .4, x + .4, z + .4]);
      const obj = goldObject(e.object); const home = new THREE.Vector3(x, 1.01, z); obj.position.copy(home); obj.scale.setScalar(1.1); scene.add(obj);
      const move = e.status === "renovating" ? "none" : (e.persona?.move || "hop");
      const it = { e, room: r, obj, home, x, z, beam, state: "home", move, speed: MOVES[move] ?? 1.2, t: rr(0, 6), wait: rr(2, 6), gx: 0, gz: 0, hopT: 0,
        look: new THREE.Vector3(x, 0, z + 1.45),
        box: { x0: r.x0 + .8, x1: r.x1 - .8, z0: vz + 1.6, z1: r.z1 - .8 } };
      if (e.status === "renovating") {   // 整修中：蓋一塊布
        const cloth = new THREE.Mesh(new THREE.CylinderGeometry(.3, .38, .72, 16), std(0xe9e1cf, { roughness: .95 })); cloth.position.set(x, 1.37, z); cloth.castShadow = true; scene.add(cloth);
        obj.visible = false;
      }
      items.push(it); vitrines.push(it);
    });
    // 展櫃前一條紅龍柱（商店不用）
    if (r.pos !== "south" && n) {
      const posts = []; for (let x = r.x0 + .6; x <= r.x1 - .55; x += 1.4) posts.push(x);
      for (const x of posts) { cyl(.035, .045, .9, M.brass, x, 0, vz + 1, 10); cyl(.12, .14, .04, M.brass, x, 0, vz + 1, 16); sph(.05, M.brass, x, .93, vz + 1); }
      for (let i = 0; i < posts.length - 1; i++) {
        const a = posts[i], b = posts[i + 1];
        const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(a, .87, vz + 1), new THREE.Vector3((a + b) / 2, .68, vz + 1), new THREE.Vector3(b, .87, vz + 1)]), 10, .022, 6), M.rope);
        rope.castShadow = true; scene.add(rope);
      }
      solids.push([posts[0] - .1, vz + .9, posts[posts.length - 1] + .1, vz + 1.1]);
      // 展櫃之間的後牆：窗和畫輪流掛
      const gaps = []; for (let i = 0; i <= n; i++) { const a = i ? xs[i - 1] + .5 : r.x0, b = i < n ? xs[i] - .5 : r.x1; if (b - a > 1.3) gaps.push((a + b) / 2); }
      gaps.forEach((gx, k) => k % 2 === 0 ? windowAt(gx, r.z0 + .01) : painting(gx, 1.75, r.z0 + .05, .9, 1.1, portraitTex(30 + k * 70, k % 3 ? 1 : 0)));
    }
    // 各廳的陳設
    const cx = (r.x0 + r.x1) / 2;
    if (r.pos === "west") {   // 遊戲廳：一台老街機
      const g = new THREE.Group(); g.position.set(r.x0 + .9, 0, r.z1 - 1.4); g.rotation.y = Math.PI / 2; scene.add(g);
      const cab = std(0x2a1f3d, { roughness: .5 });
      box(.8, 1.7, .7, cab, 0, 0, 0, { parent: g }); box(.84, .3, .74, std(0xd4a64a, { metalness: .6, roughness: .4 }), 0, 1.7, 0, { parent: g });
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(.56, .42), std(0x0b1430, { emissive: 0x3a6ad0, emissiveIntensity: .8 })); scr.position.set(0, 1.3, .36); scr.rotation.x = -.15; g.add(scr);
      box(.8, .08, .3, cab, 0, .95, .45, { parent: g });
      solids.push([r.x0 + .4, r.z1 - 1.9, r.x0 + 1.4, r.z1 - .9]);
      plant(r.x1 - 1, r.z1 - .9, 1.1);
    }
    if (r.pos === "east") {   // 測驗廳：一面大鏡子（照見自己）
      const g = new THREE.Group(); g.position.set(r.x1 - .06, 0, r.z1 - 2.2); g.rotation.y = -Math.PI / 2; scene.add(g);
      box(1.1, 2.2, .06, M.gold, 0, .2, 0, { parent: g });
      const mir = new THREE.Mesh(new THREE.PlaneGeometry(.94, 2.04), std(0xb9c6d8, { metalness: 1, roughness: .08 })); mir.position.set(0, 1.3, .04); g.add(mir);
      plant(r.x0 + 1, r.z1 - .9, 1.1);
    }
    if (r.pos === "north") { plant(r.x0 + .7, r.z0 + .7, 1.3); plant(r.x1 - .7, r.z0 + .7, 1.3); }
    if (r.pos === "south") {  // 商店：兩側書架
      const spines = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#3a2a1c"; g.fillRect(0, 0, w, h); for (let row = 0; row < 4; row++) { let x = 4; while (x < w - 6) { const bw = 8 + rnd() * 14; g.fillStyle = `hsl(${rnd() * 360},${25 + rnd() * 25}%,${30 + rnd() * 30}%)`; g.fillRect(x, row * 64 + 8, bw, 52); x += bw + 2; } g.fillStyle = "#6b4a2e"; g.fillRect(0, row * 64 + 60, w, 4); } });
      for (const s of [-1, 1]) {
        const g = new THREE.Group(); g.position.set(cx + s * (r.x1 - r.x0) / 2 - s * .32, 0, (r.z0 + r.z1) / 2 + .4); g.rotation.y = -s * Math.PI / 2; scene.add(g);
        box(2.4, 1.3, .5, M.wood, 0, 0, 0, { parent: g });
        const f = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), std(0xffffff, { map: spines, roughness: .8 })); f.position.set(0, .66, .26); g.add(f);
        solids.push(s < 0 ? [r.x0, (r.z0 + r.z1) / 2 + .4 - 1.2, r.x0 + .6, (r.z0 + r.z1) / 2 + .4 + 1.2] : [r.x1 - .6, (r.z0 + r.z1) / 2 + .4 - 1.2, r.x1, (r.z0 + r.z1) / 2 + .4 + 1.2]);
      }
    }
  }

  /* ---------- 光：白天天光、夜裡月光＋手電筒＋最近幾座展櫃的聚光燈 ---------- */
  const hemi = new THREE.HemisphereLight(0xfbf6ee, 0x8a8070, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3e2, 2.4); sun.castShadow = true; sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const selfLight = new THREE.PointLight(0xffe6b8, 0, 3, 1.5); scene.add(selfLight);
  const flash = new THREE.SpotLight(0xffe6b8, 0, 14, .52, .5, 1.2); flash.castShadow = !coarse; flash.shadow.mapSize.set(512, 512); scene.add(flash, flash.target);
  const hallLights = [new THREE.Vector3(-3.5, 2.8, -2.5), new THREE.Vector3(3.5, 2.8, 2.5)].map(p => { const L = new THREE.PointLight(0xffc98a, 0, 10, 1.5); L.position.copy(p); scene.add(L); return L; });
  // 展櫃聚光燈：固定 5 盞，給離你最近的 5 座展櫃（燈的數量不變，手機才不會卡）
  const spots = Array.from({ length: 5 }, () => { const s = new THREE.SpotLight(0xffe4b0, 0, 5, .5, .6, 1.2); scene.add(s, s.target); return s; });
  let spotT = 0;
  function assignSpots() {
    const near5 = [...vitrines].sort((a, b) => a.look.distanceToSquared(player.position) - b.look.distanceToSquared(player.position)).slice(0, 5);
    spots.forEach((s, i) => { const v = near5[i]; if (!v) { s.visible = false; return; } s.visible = true; s.position.set(v.x, 2.6, v.z - .8); s.target.position.set(v.x, 1.1, v.z); });
  }
  for (const [x, z] of [[-3.5, -2.5], [3.5, 2.5], [-3.5, 2.5], [3.5, -2.5]]) lightPool(x, z, 2.4, .22);
  for (const r of rooms) lightPool((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2 + 1, Math.min(r.x1 - r.x0, r.z1 - r.z0) * .55, .16);   // 夜裡展廳中間一片淡淡的值班燈光

  /* ---------- 人：Q 版大頭（主角是下班的老師） ---------- */
  function chibi({ coat = 0x2b3f6e, pants = 0x1a2238, hair = 0x3a2a22, skin = 0xf3d2b5, scarf = null, hat = null, flashlight = false, glasses = false, h = 1, bag = true } = {}) {
    const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(1.25 * h); g.add(inner);
    const S = (geo, mat, x, y, z, p = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
    const skinM = std(skin, { roughness: .55 }), hairM = std(hair, { roughness: .6 }), shirtM = std(coat, { roughness: .8 }), pantsM = std(pants, { roughness: .8 });
    const legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * .07, .22, 0); inner.add(hip); S(new THREE.CylinderGeometry(.055, .05, .22, 10), pantsM, 0, -.11, 0, hip); S(new THREE.SphereGeometry(.055, 10, 6), std(0x1a1614, { roughness: .4 }), 0, -.21, .02, hip).scale.set(1, .6, 1.4); return hip; });
    S(new THREE.CylinderGeometry(.13, .17, .3, 18), shirtM, 0, .36, 0);
    const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .16, .48, 0); inner.add(sh); S(new THREE.CylinderGeometry(.04, .035, .22, 10), shirtM, 0, -.1, 0, sh); S(new THREE.SphereGeometry(.035, 8, 6), skinM, 0, -.22, 0, sh); sh.rotation.z = s * .3; return sh; });
    S(new THREE.SphereGeometry(.26, 28, 20), skinM, 0, .76, 0);
    const cap = S(new THREE.SphereGeometry(.275, 28, 16, 0, Math.PI * 2, 0, Math.PI * .55), hairM, 0, .78, -.02); cap.rotation.x = -.35;
    S(new THREE.SphereGeometry(.2, 16, 10), hairM, 0, .7, -.12).scale.set(1.15, 1, .9);
    S(new THREE.ConeGeometry(.035, .13, 8), hairM, .03, 1.06, -.02).rotation.z = -.5;   // 頭頂一撮翹毛
    const eyeM = std(0x1a1410, { roughness: .25 });
    for (const s of [-1, 1]) {
      S(new THREE.SphereGeometry(.042, 12, 8), eyeM, s * .09, .74, .225).scale.set(1, 1.3, .6);
      S(new THREE.SphereGeometry(.013, 6, 4), std(0xffffff, { emissive: 0xffffff, emissiveIntensity: .5 }), s * .09 + .015, .765, .254);
      S(new THREE.SphereGeometry(.035, 10, 6), std(0xf0a9a2, { roughness: .9 }), s * .16, .67, .2).scale.set(1, .55, .4);
    }
    if (glasses) for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.055, .008, 6, 16), std(0x2a2a2a)); r.position.set(s * .09, .74, .245); inner.add(r); }
    if (scarf) { const sc = S(new THREE.TorusGeometry(.12, .035, 8, 20), std(scarf, { roughness: .9 }), 0, .5, 0); sc.rotation.x = Math.PI / 2; S(new THREE.OctahedronGeometry(.045), M.gold, .2, .92, .08).scale.set(1, 1, .4); }
    if (hat) { S(new THREE.CylinderGeometry(.24, .26, .1, 20), std(hat), 0, 1, 0); S(new THREE.CylinderGeometry(.3, .3, .02, 20), std(0x111111), 0, .95, .06); }
    if (flashlight) S(new THREE.CylinderGeometry(.025, .033, .13, 10), M.brass, 0, -.22, .06, arms[1]).rotation.x = Math.PI / 2;
    else if (bag && !hat) S(new THREE.BoxGeometry(.17, .19, .07), std(0xc79b5a, { roughness: .8 }), -.19, .3, -.03);
    g.userData = { inner, legs, arms };
    scene.add(g); return g;
  }
  // 主角：深藍上衣＋燈火金圍巾＋星星髮夾
  const player = chibi({ coat: 0x24365e, pants: 0x2a2a30, scarf: 0xd2a24c, flashlight: true });
  const guard = chibi({ coat: 0x22262e, pants: 0x1b1e24, hat: 0x22262e, hair: 0x2a2018 });
  guard.position.copy(GUARD_AT); guard.rotation.y = Math.PI;
  // 白天的遊客：大廳兩位繞著恐龍走；每個展廳一位在展櫃前慢慢看
  const LOOKS = [{ coat: 0xb79a76, hair: 0x5a3a28 }, { coat: 0x5d6b5a, hair: 0x1f1a16, glasses: true }, { coat: 0x9a5a4e, hair: 0x6a4630, h: .82 }, { coat: 0x3c4150, hair: 0x8a8a88, glasses: true }, { coat: 0xd8cfc0, hair: 0x2a2018, pants: 0x4a4f5c }, { coat: 0x6a7fa8, hair: 0x3a2a22 }];
  const visitors = [];
  LOOKS.forEach((o, i) => {
    const roomsWith = rooms.filter(r => vitrines.some(v => v.room === r));
    const r = i < 2 ? null : roomsWith[(i - 2) % Math.max(1, roomsWith.length)];
    if (i >= 2 && (!r || i - 2 >= roomsWith.length)) return;
    const v = chibi({ pants: 0x2d3038, ...o });
    v.userData.mode = r ? "room" : "ring"; v.userData.room = r; v.userData.t = i * 3.1; v.userData.wait = 0; v.userData.speed = .7 + i * .05;
    if (r) { const vs = vitrines.filter(x => x.room === r); const t = vs[i % vs.length]; v.userData.target = t; v.position.set(t.x, 0, t.look.z + .2); }
    visitors.push(v);
  });

  /* ---------- 輸入：鍵盤、拖曳搖桿（按下的地方就是底座） ---------- */
  const keys = new Set(), joy = { id: null, bx: 0, by: 0, dx: 0, dy: 0 };
  const KEY = { arrowleft: "l", a: "l", arrowright: "r", d: "r", arrowup: "u", w: "u", arrowdown: "d", s: "d" };
  addEventListener("keydown", e => {
    if (!running || opt.blocked() || e.target.closest?.("input, textarea")) return;
    const k = e.key.toLowerCase();
    if (KEY[k]) { keys.add(KEY[k]); e.preventDefault(); if (document.activeElement === act) act.blur(); }
    else if ((k === " " || k === "enter" || k === "e") && !e.target.closest?.("button:not(.m-tag), a")) { if (!e.repeat) interact(); e.preventDefault(); }
  });
  addEventListener("keyup", e => { const k = KEY[e.key.toLowerCase()]; if (k) keys.delete(k); });
  addEventListener("blur", () => keys.clear());
  root.addEventListener("pointerdown", e => {
    if (!running || e.target.closest("button") || joy.id !== null) return;
    joy.id = e.pointerId; joy.bx = e.clientX; joy.by = e.clientY; joy.dx = joy.dy = 0;
    root.setPointerCapture(e.pointerId);
    const r = root.getBoundingClientRect();
    joyEl.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`; joyEl.firstElementChild.style.transform = ""; joyEl.hidden = false; hideHelp();
  });
  root.addEventListener("pointermove", e => {
    if (e.pointerId !== joy.id) return;
    joy.dx = e.clientX - joy.bx; joy.dy = e.clientY - joy.by;
    const l = Math.hypot(joy.dx, joy.dy), m = Math.min(l, 34);
    joyEl.firstElementChild.style.transform = l ? `translate(${(joy.dx / l * m).toFixed(1)}px, ${(joy.dy / l * m).toFixed(1)}px)` : "";
  });
  const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.dx = joy.dy = 0; joyEl.hidden = true; };
  root.addEventListener("pointerup", endJoy); root.addEventListener("pointercancel", endJoy);
  act.addEventListener("click", interact);
  function inputVec() {
    let x = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0), y = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0);
    if (joy.id !== null) { const l = Math.hypot(joy.dx, joy.dy); if (l > 8) { x = joy.dx / l * Math.min(1, l / 36); y = joy.dy / l * Math.min(1, l / 36); } }
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
  }

  /* ---------- 白天／夜晚 ---------- */
  let night = false;
  function applyNight() {
    const n = night;
    hemi.color.set(n ? 0x6d82b8 : 0xfbf6ee); hemi.groundColor.set(n ? 0x0a0c12 : 0x8a8070); hemi.intensity = n ? .26 : 1.2;
    sun.color.set(n ? 0xa9bce6 : 0xfff3e2); sun.intensity = n ? .34 : 2.4;
    renderer.toneMappingExposure = n ? 1.1 : 1;
    flash.intensity = n ? 60 : 0; selfLight.intensity = n ? 2.2 : 0;
    for (const L of hallLights) L.intensity = n ? 5 : 0;
    for (const s of spots) s.intensity = n ? 14 : 3.5;
    for (const v of vitrines) v.beam.material.opacity = n ? .12 : .035;
    for (const p of pools) p.m.material.opacity = n ? p.op : 0;
    for (const w of windows) w.color.set(n ? 0x6a84bc : 0xf4f8ff);
    for (const m of glowMats) m.emissiveIntensity = n ? .55 : .05;
    M.exGold.emissiveIntensity = n ? .35 : 0; M.exIvory.emissiveIntensity = n ? .25 : 0;
    ground.material.color.set(n ? 0x0b0f18 : 0xd6d1c7);
    scene.background = new THREE.Color(n ? 0x05070d : 0xd6d1c7);
    scene.fog = n ? new THREE.Fog(0x05070d, 26, 48) : new THREE.Fog(0xd6d1c7, 34, 64);
    for (const v of visitors) v.visible = !n;
    if (!n || reduced) for (const it of items) homeItem(it);
  }

  /* ---------- 小展牌、對話泡泡、廳名 ---------- */
  let near = null, guardSaid = false, dinoSaidAt = -99, curRoom = "hall", helpShown = false;
  let bubbleUntil = 0, bubbleSide = null; const bubbleAt = new THREE.Vector3();
  function say(html, at, ms = 2800) { bubble.innerHTML = html; bubble.hidden = false; bubble.classList.remove("in", "out"); void bubble.offsetWidth; bubble.classList.add("in"); bubbleAt.copy(at); bubbleUntil = performance.now() + ms; bubbleSide = null; }
  function interact() {
    if (!near || opt.blocked()) return;
    bubble.hidden = true;
    if (near.exit) opt.exit(); else opt.openPlacard(near.e, act, night);   // 自白只在夜裡出現
  }
  function showBanner(r) {
    banner.innerHTML = r ? `<i>${esc(r.f.numeral || "")}</i><b>${esc(r.f.name)}</b><span>${esc(r.f.label)}・${esc(r.f.en)}</span>` : `<b>大廳</b><span>Grand Hall</span>`;
    banner.hidden = false; banner.classList.remove("in"); void banner.offsetWidth; banner.classList.add("in");
    clearTimeout(showBanner.t); showBanner.t = setTimeout(() => banner.hidden = true, 2600);
  }
  function helpText() {
    const tail = night ? "展品會跑，走近它就乖乖站好。" : "右上角的月亮可以熄燈。";
    return coarse ? `按住畫面任一處拖曳，就能走。走近展品，點展櫃上方的小展牌。${tail}` : `方向鍵或 WASD 走動，空白鍵看說明牌。${tail}`;
  }
  function showHelp() { helpShown = true; help.textContent = helpText(); help.hidden = false; help.classList.remove("out"); clearTimeout(showHelp.t); showHelp.t = setTimeout(hideHelp, 7000); }
  function hideHelp() { if (help.hidden || help.classList.contains("out")) return; help.classList.add("out"); setTimeout(() => help.hidden = true, 600); }

  /* ---------- 展品：夜裡跑出展櫃、在廳裡亂逛；你一靠近就跑回去 ---------- */
  function homeItem(it) { it.state = "home"; it.obj.position.copy(it.home); it.obj.rotation.set(0, 0, 0); it.obj.scale.setScalar(1.1); it.wait = rr(3, 7); }
  const tmpV = new THREE.Vector3();
  function updateItem(it, dt, t) {
    if (!night || reduced || it.move === "none") return;
    const pd = Math.hypot(player.position.x - it.obj.position.x, player.position.z - it.obj.position.z);
    const ld = Math.hypot(player.position.x - it.look.x, player.position.z - it.look.z);
    const o = it.obj;
    if (it.state === "home") {
      if (ld > 4.5) { it.wait -= dt; if (it.wait <= 0) { it.state = "out"; it.hopT = 0; it.from = it.home.clone(); it.to = new THREE.Vector3(it.x, 0, it.z + .85); } }
      return;
    }
    if (it.state === "out" || it.state === "in") {   // 跳出／跳回展櫃：一道小拋物線
      it.hopT = Math.min(1, it.hopT + dt / .45); const k = it.hopT;
      o.position.lerpVectors(it.from, it.to, k); o.position.y += Math.sin(k * Math.PI) * .7;
      o.scale.setScalar(1.1 + (it.state === "out" ? k : 1 - k) * .4);
      if (k >= 1) { if (it.state === "out") { it.state = "roam"; pick(it); } else homeItem(it); }
      return;
    }
    if (pd < 3 || ld < 2.4) { it.state = "flee"; }
    let tx = it.gx, tz = it.gz, sp = it.speed;
    if (it.state === "flee") { tx = it.x; tz = it.z + .85; sp = Math.max(4.5, it.speed * 3); }
    const dx = tx - o.position.x, dz = tz - o.position.z, l = Math.hypot(dx, dz);
    if (l < .06) {
      if (it.state === "flee") { it.state = "in"; it.hopT = 0; it.from = o.position.clone(); it.to = it.home.clone(); o.rotation.set(0, 0, 0); return; }
      it.pause = rr(.4, 1.6); pick(it); return;
    }
    if (it.pause > 0 && it.state === "roam") { it.pause -= dt; return; }
    const step = Math.min(l, sp * dt); o.position.x += dx / l * step; o.position.z += dz / l * step;
    o.rotation.y = Math.atan2(dx, dz) * .5;
    // 每件展品有自己的走法
    const k = t * 8 + it.t; let y = 0;
    switch (it.move) {
      case "hop": y = Math.abs(Math.sin(k)) * .3; break;
      case "roll": o.rotation.z -= step * 5; break;
      case "waddle": o.rotation.z = Math.sin(k * 1.4) * .25; y = Math.abs(Math.sin(k * 1.4)) * .05; break;
      case "float": y = .35 + Math.sin(t * 2 + it.t) * .12; break;
      case "scuttle": o.rotation.y += Math.sin(k * 3) * .4; break;
      case "spin": o.rotation.y = t * 6; break;
      case "tilt": o.rotation.x = Math.sin(k * .6) * .3; break;
      case "wobble": o.rotation.z = Math.sin(k * .8) * .18; y = Math.abs(Math.sin(k * .8)) * .06; break;
    }
    o.position.y = y;
  }
  function pick(it) { it.gx = rr(it.box.x0, it.box.x1); it.gz = rr(it.box.z0, it.box.z1); }

  /* ---------- 每一格畫面 ---------- */
  let running = false, raf = 0, last = 0, walkT = 0, startedOnce = false, northLowered = false;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
  const SPEED = 4.8;   // 使用者嫌過走太慢
  function frame(now) {
    if (!running) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; const t = now / 1000;
    const iv = opt.blocked() ? { x: 0, y: 0 } : inputVec();
    const moving = Math.hypot(iv.x, iv.y) > .05;
    if (moving) {
      const nx = player.position.x + iv.x * SPEED * dt, nz = player.position.z + iv.y * SPEED * dt;
      if (!blocked(nx, player.position.z)) player.position.x = nx;
      if (!blocked(player.position.x, nz)) player.position.z = nz;
      const want = Math.atan2(iv.x, iv.y); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 14);
      walkT += dt * 11; hideHelp();
    }
    animate(player, moving ? walkT : 0, moving);
    const px = player.position.x, pz = player.position.z;
    if (night) {
      const fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y);
      flash.position.set(px + fx * .2, .9, pz + fz * .2); flash.target.position.set(px + fx * 4, 0, pz + fz * 4);
      selfLight.position.set(px - fx * .3, 1.9, pz - fz * .3 + .4);
    }
    sun.position.set(px + (night ? -6 : 8), 15, pz + 7); sun.target.position.set(px, 0, pz);
    if ((spotT -= dt) <= 0) { spotT = .4; assignSpots(); }
    // 在哪一廳：上方浮出廳名
    const here = rooms.find(r => px > r.x0 && px < r.x1 && pz > r.z0 && pz < r.z1) || null;
    const key = here ? here.pos : "hall";
    if (key !== curRoom) { curRoom = key; showBanner(here); }
    // 走進北邊的廳：大廳北牆降下來
    const lower = pz < -6.1;
    if (lower !== northLowered) { northLowered = lower; northWall.visible = !lower; northLow.visible = lower; }
    // 遊客、展品、恐龍、半身像、肖像、警衛
    if (!night) visitors.forEach((v, i) => updateVisitor(v, dt, t, i));
    for (const it of items) updateItem(it, dt, t);
    const dd = Math.hypot(px - DAIS.x, pz - DAIS.z);
    if (night && !reduced) {
      const local = dino.worldToLocal(tmp.set(px, 2.2, pz));
      const yaw = Math.atan2(-local.z, local.x - 1.9);
      dinoHead.rotation.y += (clamp(yaw, -.9, .9) - dinoHead.rotation.y) * Math.min(1, dt * 3);
      dinoJaw.rotation.z = -Math.max(0, Math.sin(t * 1.2)) * .38;
      // 慢慢轉身面向你
      const want = Math.atan2(-(pz - DAIS.z), px - DAIS.x); let d = want - dino.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
      dino.rotation.y += clamp(d, -1, 1) * dt * .25;
      dino.position.y = .32 + (dd < 4 ? Math.max(0, Math.sin(t * 9)) * .05 : 0);
      if (dd < 4 && t - dinoSaidAt > 20) { dinoSaidAt = t; say(["喀啦。", "（牠歪頭看了你一眼。）", "吼——（骨頭版）", "（牠假裝自己只是一堆骨頭。）"][Math.floor(Math.random() * 4)], tmp.set(DAIS.x, 2.8, DAIS.z)); }
    } else { dinoHead.rotation.y *= .9; dinoJaw.rotation.z *= .9; dino.position.y = .32; dino.rotation.y += (DINO_BASE - dino.rotation.y) * Math.min(1, dt * 2); }
    for (const s of statues) {
      const d = Math.hypot(px - s.x, pz - s.z);
      if (night && !reduced) { if (d < 1.8) s.near = true; else if (s.near && d > 2.6) { s.near = false; s.pose = 1 - s.pose; } } else s.pose = 0;
      s.head.rotation.y += ((s.pose ? .9 : 0) - s.head.rotation.y) * Math.min(1, dt * 4);
    }
    for (const p of portraits) {
      p.g.updateMatrixWorld(); const l = p.g.worldToLocal(tmp.set(px, 1.2, pz));
      const ox = night && !reduced ? clamp(l.x * .004, -.012, .012) : 0, oy = night && !reduced ? clamp((l.y - .2) * .004, -.008, .008) : 0;
      for (const e of p.pupils) e.p.position.set(e.x + ox, e.y + oy, .047);
    }
    if (!guardSaid && Math.hypot(px - GUARD_AT.x, pz - GUARD_AT.z) < 1.8) {
      guardSaid = true; const l = opt.guardLine(night);   // 一次進館只說一句；只說中文
      if (l) say(`<b>${night ? "夜班警衛" : "警衛"}</b>${esc(l.zh)}`, tmp.set(GUARD_AT.x, 2, GUARD_AT.z), 3200);
    }
    guard.rotation.y = Math.atan2(px - GUARD_AT.x, pz - GUARD_AT.z);
    for (const v of vitrines) if (v.state === "home" && v.move !== "none") v.obj.rotation.y = reduced ? 0 : Math.sin(t * .4 + v.x) * .2;
    // 靠近什麼
    near = null; let bd = 1.35;
    for (const v of vitrines) { if (v.state !== "home") continue; const d = Math.hypot(px - v.look.x, pz - v.look.z); if (d < bd) { bd = d; near = v; } }
    if (!northLowered && Math.hypot(px - EXIT.x, pz - EXIT.z) < 1.1) near = { exit: true, x: EXIT.x, z: -6 };
    // 鏡頭：斜俯視跟著人；直式手機拉遠一點才看得到兩側
    const aspect = W / Hh, far = aspect < 1 ? 1.35 : 1;
    // 鏡頭不要拍到館外太多：往北看到北牆就停（直式手機看得比較遠，停得早一點）
    const zMin = rooms.some(r => r.pos === "north") ? (aspect < 1 ? -9.2 : -10.6) : (aspect < 1 ? -1.5 : -2.5);
    camLook.set(px, .4, Math.max(pz - 1.8, zMin));
    tmp.set(camLook.x, camLook.y + 14 * far, camLook.z + 11.5 * far);
    camPos.lerp(tmp, reduced ? 1 : Math.min(1, dt * 5)); camera.position.copy(camPos); camera.lookAt(camLook);
    renderer.render(scene, camera);
    placeDom(now);
    raf = requestAnimationFrame(frame);
  }
  function animate(c, wt, moving) {
    const u = c.userData; if (reduced) wt = 0;
    u.legs[0].rotation.x = Math.sin(wt) * .6; u.legs[1].rotation.x = -Math.sin(wt) * .6;
    u.arms[0].rotation.x = -Math.sin(wt) * .5; u.arms[1].rotation.x = Math.sin(wt) * .5;
    u.inner.position.y = moving && !reduced ? Math.abs(Math.sin(wt)) * .04 : 0;
  }
  function updateVisitor(v, dt, t, i) {
    const u = v.userData;
    if (u.wait > 0) { u.wait -= dt; animate(v, 0, false); return; }
    let tx, tz;
    if (u.mode === "ring") { u.t += dt * u.speed / 3.6; tx = DAIS.x + Math.cos(u.t) * 3.4; tz = DAIS.z + Math.sin(u.t) * 3.3; if (Math.random() < dt * .06) u.wait = rr(2, 4); }
    else {
      tx = u.target.x; tz = u.target.look.z + .2;
      if (Math.hypot(v.position.x - tx, v.position.z - tz) < .08) { u.wait = rr(3, 7); const vs = vitrines.filter(x => x.room === u.room); u.target = vs[Math.floor(Math.random() * vs.length)]; v.rotation.y = Math.PI; animate(v, 0, false); return; }
    }
    if (u.mode === "ring" && !u.placed) { u.placed = true; v.position.set(tx, 0, tz); }
    const dx = tx - v.position.x, dz = tz - v.position.z, l = Math.hypot(dx, dz);
    const step = Math.min(l, u.speed * dt * (u.mode === "ring" ? 1.6 : 1));
    if (l > .001) { v.position.x += dx / l * step; v.position.z += dz / l * step; v.rotation.y = Math.atan2(dx, dz); }
    u.wt = (u.wt || 0) + dt * 7; animate(v, u.wt, true);
  }
  function toScreen(p) { tmp.copy(p).project(camera); return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * Hh, tmp.z < 1]; }
  const TOP = 64;
  function placeDom(now) {
    // 小展牌：浮在展櫃上方；上面放不下就放到人的下面
    if (near && !opt.blocked()) {
      const html = near.exit ? `<b>出口</b><span>回到售票口 ›${coarse ? "" : "<kbd>空白鍵</kbd>"}</span>` : `<b>${esc(near.e.title)}</b><span>看說明牌 ›${coarse ? "" : "<kbd>空白鍵</kbd>"}</span>`;
      if (act.dataset.key !== (near.exit ? "exit" : near.e.id)) { act.dataset.key = near.exit ? "exit" : near.e.id; act.innerHTML = html; act.classList.remove("in"); void act.offsetWidth; act.classList.add("in"); }
      act.hidden = false;
      const [sx, sy] = toScreen(tmp.set(near.x, near.exit ? 2.4 : 1.95, near.exit ? -6 : near.z));
      const bw = act.offsetWidth, bh = act.offsetHeight;
      let top = sy - bh - 6, below = false;
      if (top < TOP) { const [, fy] = toScreen(tmp.set(player.position.x, 0, player.position.z)); top = fy + 10; below = true; }
      const left = clamp(sx - bw / 2, 8, Math.max(8, W - 8 - bw));
      act.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      act.style.setProperty("--tail", `${Math.round(clamp(sx - left, 10, bw - 10))}px`); act.classList.toggle("below", below);
    } else { act.hidden = true; act.dataset.key = ""; }
    // 對話泡泡：說話那一刻定位，之後釘在原地；時間到或人走開就淡出
    if (!bubble.hidden) {
      if (bubbleUntil - now > 220 && Math.hypot(player.position.x - bubbleAt.x, player.position.z - bubbleAt.z) > 4) bubbleUntil = now + 220;
      bubble.classList.toggle("out", bubbleUntil - now < 450);
      if (now > bubbleUntil) bubble.hidden = true;
      const [sx, sy] = toScreen(bubbleAt), bw = bubble.offsetWidth, bh = bubble.offsetHeight;
      if (bubbleSide === null) bubbleSide = sy - bh - 8 < TOP ? "below" : "above";
      const left = clamp(sx - bw / 2, 8, Math.max(8, W - 8 - bw)), top = clamp(bubbleSide === "below" ? sy + 40 : sy - bh - 8, TOP, Math.max(TOP, Hh - bh - 8));
      bubble.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      bubble.style.setProperty("--tail", `${Math.round(clamp(sx - left, 12, bw - 12))}px`); bubble.classList.toggle("below", bubbleSide === "below");
    }
  }
  let W = 1, Hh = 1;
  function resize() {
    W = root.clientWidth || innerWidth; Hh = root.clientHeight || innerHeight;
    renderer.setSize(W, Hh); camera.aspect = W / Hh; camera.fov = W < Hh ? 44 : 34; camera.updateProjectionMatrix();
  }
  addEventListener("resize", () => { if (running) resize(); });
  function snapCamera() { const far = W / Hh < 1 ? 1.35 : 1; camPos.set(player.position.x, .4 + 14 * far, Math.max(player.position.z - 1.8, -9.2) + 11.5 * far); }
  function loop() { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame); }

  return {
    // night：true＝夜晚、false＝白天開館
    start(isNight) {
      night = isNight; running = true; startedOnce = true; guardSaid = false; resize();
      player.position.set(0, 0, 4.6); player.rotation.y = Math.PI;
      for (const it of items) homeItem(it);
      applyNight(); assignSpots(); snapCamera();
      curRoom = "hall"; showBanner(null); loop();
      if (!helpShown) showHelp();
    },
    setNight(isNight) { night = isNight; guardSaid = false; bubble.hidden = true; applyNight(); if (!help.hidden) help.textContent = helpText(); },
    resume() { running = true; resize(); loop(); },
    pause() { running = false; cancelAnimationFrame(raf); keys.clear(); joy.id = null; joyEl.hidden = true; },
    stop() { this.pause(); helpShown = false; help.hidden = true; act.hidden = true; near = null; bubble.hidden = true; },
    get started() { return running || startedOnce; }
  };
}
