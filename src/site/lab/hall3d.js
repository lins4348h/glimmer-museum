// 微光博物館｜3D 大廳試做版
// 使用者看到一張斜俯視的 3D 剖面辦公室（打開屋頂往下看的模型屋），想比較改成這種地圖適不適合。
// 使用者決定：不限墨藍，做得像真正的博物館：白色大理石、暖白牆、黃銅；人物是成人比例、簡約有質感（不做像素 Q 版）。
// 先做大廳＋北邊的理財廳（展廳牆刷深墨藍，留一點引路人的顏色）。白天有遊客，夜晚手電筒＋恐龍轉頭。
// 單位：1＝一格地磚（大約一公尺）。x 往右、z 往鏡頭（南）、y 往上。
import * as THREE from "./three.min.js";
import { engravingSVG } from "../engravings.js";
import DATA from "./data.js";

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = id => document.getElementById(id);
const stage = $("stage"), layer = $("layer");
const coarse = matchMedia("(pointer: coarse)").matches;

/* ---------- 場景、相機、算圖 ---------- */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, .5, 120);

/* ---------- 材質 ---------- */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: 0, ...o });
const M = {
  gold: std(0xc9a14e, { metalness: .9, roughness: .3 }),
  brass: std(0xb8913f, { metalness: .8, roughness: .38 }),
  ivory: std(0xf1e9d6, { roughness: .45 }),
  bone: std(0xe6d9bc, { roughness: .65 }),
  wallW: std(0xece6da, { roughness: .92 }),        // 大廳：暖白灰泥牆
  baseW: std(0xd6cdbd, { roughness: .8 }),         // 大廳：踢腳、護牆
  wallN: std(0x1d2b4f, { roughness: .92 }),        // 理財廳：深墨藍展牆（引路人的顏色）
  baseN: std(0x14203c, { roughness: .85 }),
  cap: std(0xd9d3c7, { roughness: .6 }),           // 牆頂：淺石材，看得出牆的厚度
  marble: std(0xf2efe9, { roughness: .25 }),
  darkMarble: std(0x2c3138, { roughness: .25 }),
  plinth: std(0xf4f1ea, { roughness: .55 }),
  leather: std(0x2c211b, { roughness: .55 }),
  wood: std(0x6b4a2e, { roughness: .55 }),
  leaf: std(0x3b5e44, { roughness: .8 }), leaf2: std(0x4f7a56, { roughness: .8 }),
  pot: std(0xe8e2d6, { roughness: .6 }),
  rope: std(0x7c2430, { roughness: .6 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xeef4ff, roughness: .04, metalness: 0, transparent: true, opacity: .14, depthWrite: false }),
  win: new THREE.MeshBasicMaterial({ color: 0xeaf2ff }),
  beam: new THREE.MeshBasicMaterial({ color: 0xffe2b0, transparent: true, opacity: .06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })
};

// 畫布材質：白色大理石、橡木人字拼、畫像
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function veins(g, w, h, n, col) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = col(rnd()); g.lineWidth = .5 + rnd() * 1.6; g.beginPath();
    let x = rnd() * w, y = rnd() * h; g.moveTo(x, y);
    for (let k = 0; k < 7; k++) { const nx = x + (rnd() - .35) * 220, ny = y + (rnd() - .5) * 160; g.quadraticCurveTo((x + nx) / 2 + (rnd() - .5) * 80, (y + ny) / 2 + (rnd() - .5) * 80, nx, ny); x = nx; y = ny; }
    g.stroke();
  }
}
// 卡拉拉白大理石：每一塊石板顏色略有不同、灰色細紋、細細的石縫
const marbleTex = canvasTex(1024, 1024, (g, w, h) => {
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const l = 93 + rnd() * 3; g.fillStyle = `hsl(40,14%,${l}%)`; g.fillRect(i * s, j * s, s, s); }
  veins(g, w, h, 34, r => `rgba(120,124,132,${.06 + r * .16})`);
  veins(g, w, h, 18, r => `rgba(170,160,140,${.05 + r * .1})`);
  g.strokeStyle = "rgba(150,145,135,.45)"; g.lineWidth = 2;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
});
marbleTex.repeat.set(14 / 8, 12 / 8);
const parquetTex = canvasTex(512, 512, (g, w, h) => {
  const s = 32, cols = ["#b98a5a", "#a97a4c", "#c49866", "#ae8052", "#b48557"];
  g.fillStyle = "#9c7046"; g.fillRect(0, 0, w, h);
  for (let y = -2; y < h / s + 2; y++) for (let x = -2; x < w / s + 2; x++) {   // 人字拼
    g.save(); g.translate(x * s * 2 + (y % 2) * s, y * s); g.rotate((x + y) % 2 ? Math.PI / 4 : -Math.PI / 4);
    g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.fillRect(-s * .95, -s * .24, s * 1.9, s * .48);
    g.strokeStyle = "rgba(60,36,18,.35)"; g.lineWidth = 1; g.strokeRect(-s * .95, -s * .24, s * 1.9, s * .48); g.restore();
  }
});
parquetTex.repeat.set(4, 2);
function portraitTex(hue, kind = 0) {
  return canvasTex(160, 200, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, `hsl(${hue},28%,30%)`); gr.addColorStop(1, `hsl(${hue + 10},30%,12%)`); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    if (kind) {   // 風景
      g.fillStyle = `hsl(${hue + 30},25%,55%)`; g.fillRect(0, h * .55, w, h * .45);
      g.fillStyle = "rgba(240,220,170,.85)"; g.beginPath(); g.arc(w * .7, h * .3, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = `hsl(${hue + 40},20%,25%)`; g.beginPath(); g.moveTo(0, h * .62); g.quadraticCurveTo(w * .4, h * .4, w, h * .6); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    } else {      // 肖像
      g.fillStyle = "#d9b896"; g.beginPath(); g.ellipse(80, 82, 26, 32, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#2b1d14"; g.beginPath(); g.ellipse(80, 62, 30, 24, 0, Math.PI, 0); g.fill();
      g.fillStyle = `hsl(${hue + 20},22%,22%)`; g.beginPath(); g.ellipse(80, 196, 62, 70, 0, Math.PI, 0); g.fill();
      g.fillStyle = "#efe6d2"; g.beginPath(); g.moveTo(70, 128); g.lineTo(80, 150); g.lineTo(90, 128); g.fill();
    }
  });
}

/* ---------- 小工具：方塊、圓柱、碰撞 ---------- */
const solids = [];   // [x0, z0, x1, z1]：人走不過去的地方
function box(w, h, d, mat, x, y, z, { shadow = true, solid = false } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z);
  m.castShadow = shadow; m.receiveShadow = true; scene.add(m);
  if (solid) solids.push([x - w / 2, z - d / 2, x + w / 2, z + d / 2]);
  return m;
}
function cyl(rt, rb, h, mat, x, y, z, seg = 24, parent = scene) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function sph(r, mat, x, y, z, parent = scene, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; parent.add(m); return m;
}
const solidCircle = (x, z, r) => solids.push([x - r, z - r, x + r, z + r]);

/* ---------- 平面配置 ---------- */
// 大廳 x -7..7、z -6..6；北邊理財廳 x -8..8、z -14..-6.4；牆厚 .4
const H = 3, LOW = .5;   // 牆高；靠鏡頭那面牆切低（剖面模型屋）
const HALL = { x0: -7, x1: 7, z0: -6, z1: 6 }, ROOM = { x0: -8, x1: 8, z0: -14, z1: -6.4 };
const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), std(0xffffff, { roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -.02; ground.receiveShadow = true; scene.add(ground);
function floor(r, tex, rough) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r.x1 - r.x0, r.z1 - r.z0), std(0xffffff, { map: tex, roughness: rough, metalness: 0 }));
  m.rotation.x = -Math.PI / 2; m.position.set((r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2); m.receiveShadow = true; scene.add(m);
}
floor(HALL, marbleTex, .22); floor(ROOM, parquetTex, .5);
// 牆：灰泥牆面＋踢腳板＋牆頂淺石材（看得出厚度）。tone：白（大廳）或墨藍（展廳）
function wall(x0, z0, x1, z1, { h = H, tone = "w" } = {}) {
  const w = Math.abs(x1 - x0) || .4, d = Math.abs(z1 - z0) || .4, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  box(w, h, d, tone === "n" ? M.wallN : M.wallW, cx, 0, cz, { solid: true });
  box(w + .03, .16, d + .03, tone === "n" ? M.baseN : M.baseW, cx, 0, cz, { shadow: false });
  if (h > 1.2) box(w + .05, .1, d + .05, M.cap, cx, h - .1, cz, { shadow: false });
  box(w + .07, .05, d + .07, M.cap, cx, h, cz, { shadow: false });
}
// 大廳四面：北牆中間留門（通理財廳）；西、東、南牆中間留門（其他廳，試做版先用紅龍柱擋住）
wall(-7.4, -6.4, -1.6, -6); wall(1.6, -6.4, 7.4, -6);
box(3.2, .6, .4, M.wallW, 0, H - .6, -6.2); box(3.3, .08, .46, M.gold, 0, H - .62, -6.2, { shadow: false });   // 門楣
wall(-7.4, -6, -7, -1.3); wall(-7.4, 1.3, -7, 6.4);
wall(7, -6, 7.4, -1.3); wall(7, 1.3, 7.4, 6.4);
wall(-7.4, 6, -1.6, 6.4, { h: LOW }); wall(1.6, 6, 7.4, 6.4, { h: LOW });
// 理財廳三面：深墨藍展牆
wall(-8.4, -14.4, 8.4, -14, { tone: "n" }); wall(-8.4, -14, -8, -6.4, { tone: "n" }); wall(8, -14, 8.4, -6.4, { tone: "n" });
wall(-8.4, -6.4, -7.4, -6, { tone: "n" }); wall(7.4, -6.4, 8.4, -6, { tone: "n" });
// 理財廳那一面的大廳北牆也刷墨藍（從展廳往回看）
box(5.8, H - .02, .02, M.wallN, -4.5, 0, -6.41, { shadow: false }); box(5.8, H - .02, .02, M.wallN, 4.5, 0, -6.41, { shadow: false });
// 被擋住的門：紅龍柱
for (const [x, z, rot] of [[-7.2, 0, 0], [7.2, 0, 0], [0, 6.2, Math.PI / 2]]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  for (const s of [-1, 1]) { cyl(.04, .05, .95, M.brass, 0, 0, s * 1.05, 12, g); cyl(.13, .15, .04, M.brass, 0, 0, s * 1.05, 16, g); sph(.055, M.brass, 0, .98, s * 1.05, g); }
  const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, .9, -1.05), new THREE.Vector3(0, .66, 0), new THREE.Vector3(0, .9, 1.05)]), 16, .028, 8), M.rope);
  rope.castShadow = true; g.add(rope);
}
solids.push([-7.6, -1.3, -6.9, 1.3], [6.9, -1.3, 7.6, 1.3], [-1.6, 5.9, 1.6, 7]);

/* ---------- 窗：北邊的高窗（白天天光、夜裡月光） ---------- */
const windows = [];
function windowAt(x, z, w = 1, h = 1.5, y = .95) {
  const g = new THREE.Group(); g.position.set(x, y, z + .21); scene.add(g);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.win.clone()); pane.position.y = h / 2; g.add(pane);
  const arch = new THREE.Mesh(new THREE.CircleGeometry(w / 2, 24, 0, Math.PI), pane.material); arch.position.y = h; g.add(arch);
  const frame = std(0xf2eee6, { roughness: .5 }); for (const fx of [-w / 2, 0, w / 2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.05, h, .04), frame); b.position.set(fx, h / 2, .01); g.add(b); }
  for (const fy of [h * .33, h * .66]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .04, .04), frame); b.position.set(0, fy, .01); g.add(b); }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(w + .2, .06, .14), M.gold); sill.position.set(0, -.03, .04); g.add(sill);
  windows.push(pane.material); return g;
}
for (const x of [-4.5, -1.5, 1.5, 4.5]) windowAt(x, -14.2, 1.1, 1.7, 1);
windowAt(4.4, -6.4, 1.1, 1.7, 1);

/* ---------- 大廳陳設 ---------- */
// 恐龍台座：深色大理石邊＋白色大理石台面＋黃銅細帶
const DAIS = { x: 0, z: .2 };
cyl(2.75, 2.85, .12, M.darkMarble, DAIS.x, 0, DAIS.z, 64);
cyl(2.6, 2.65, .2, M.marble, DAIS.x, .12, DAIS.z, 64);
{ const band = new THREE.Mesh(new THREE.TorusGeometry(2.6, .018, 6, 128), M.gold); band.rotation.x = Math.PI / 2; band.position.set(DAIS.x, .31, DAIS.z); scene.add(band); }
solidCircle(DAIS.x, DAIS.z, 2.8);
// 地上嵌的深色大理石圓環＋黃銅細線（大廳的地紋）
for (const [r0, r1, mat, y] of [[3.6, 3.85, M.darkMarble, .004], [3.95, 3.99, M.gold, .005]]) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 120), mat); m.rotation.x = -Math.PI / 2; m.position.set(DAIS.x, y, DAIS.z); m.receiveShadow = true; scene.add(m);
}
// 長椅：深色皮革座墊＋黃銅腳（博物館常見的那種）
function bench(x, z, rot) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g);
  const cush = new THREE.Mesh(new THREE.BoxGeometry(1.8, .14, .55), M.leather); cush.position.y = .44; cush.castShadow = cush.receiveShadow = true; g.add(cush);
  for (const lx of [-.8, .8]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.05, .38, .5), M.brass); l.position.set(lx, .19, 0); l.castShadow = true; g.add(l); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.6, .03, .03), M.brass); bar.position.set(0, .08, 0); g.add(bar);
  solids.push([x - .95, z - .32, x + .95, z + .32]);
}
bench(-4, 3.6, 0); bench(4, 3.6, 0);
// 四根古典柱子（柱礎、凹槽柱身、柱頭）
function column(x, z) {
  box(.7, .16, .7, M.marble, x, 0, z); cyl(.27, .3, .1, M.marble, x, .16, z, 24);
  const shaft = cyl(.22, .25, H - .5, M.marble, x, .26, z, 20);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, f = new THREE.Mesh(new THREE.BoxGeometry(.02, H - .56, .02), M.baseW); f.position.set(x + Math.cos(a) * .235, .26 + (H - .5) / 2, z + Math.sin(a) * .235); scene.add(f); }
  cyl(.3, .24, .14, M.marble, x, H - .24, z, 24); box(.66, .1, .66, M.marble, x, H - .1, z);
  solidCircle(x, z, .38);
}
for (const [x, z] of [[-4.6, -3.6], [4.6, -3.6], [-4.6, 1.2], [4.6, 1.2]]) column(x, z);
// 夜裡的值班燈（看不到燈具，只是天花板上幾盞暖光）
const lampLights = [];
for (const [x, z] of [[-4.5, -3], [4.5, -3], [-4.5, 3.5], [4.5, 3.5], [0, -10.4]]) { const L = new THREE.PointLight(0xffc98a, 0, 9, 1.5); L.position.set(x, 2.8, z); scene.add(L); lampLights.push(L); }
// 盆栽：白色陶盆、高高的葉子
function plant(x, z, s = 1) {
  cyl(.24 * s, .19 * s, .5 * s, M.pot, x, 0, z, 18);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, leaf = new THREE.Mesh(new THREE.SphereGeometry(.14 * s, 8, 6), i % 2 ? M.leaf : M.leaf2);
    leaf.scale.set(.6, 1.8, .25); leaf.position.set(x + Math.cos(a) * .16 * s, (.85 + (i % 3) * .18) * s, z + Math.sin(a) * .16 * s); leaf.rotation.set(Math.sin(a) * .6, a, -Math.cos(a) * .6); leaf.castShadow = true; scene.add(leaf);
  }
  solidCircle(x, z, .3 * s);
}
for (const [x, z, s] of [[-6.3, -5.3, 1.2], [6.3, -5.3, 1.2], [-6.3, 5.2, 1.1], [6.3, 5.2, 1.1], [-7.3, -13.3, 1.3], [7.3, -13.3, 1.3]]) plant(x, z, s);
// 大理石半身像（夜裡你走過去之後，牠會轉頭）
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
bust(-2.6, -5.45); bust(2.6, -5.45);
// 牆上的畫：金框（一幅肖像、一幅風景）
function painting(x, y, z, w, h, tex, rotY = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; scene.add(g);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + .14, h + .14, .07), M.gold); fr.castShadow = true; g.add(fr);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, { map: tex, roughness: .8 })); pic.position.z = .04; g.add(pic);
  const light = new THREE.Mesh(new THREE.BoxGeometry(.5, .04, .12), M.brass); light.position.set(0, h / 2 + .22, .1); g.add(light);
}
painting(-3.9, 1.75, -5.77, .7, .9, portraitTex(210));
painting(-6.77, 1.75, -3.6, 1.3, .9, portraitTex(150, 1), Math.PI / 2);
painting(6.77, 1.75, -3.6, 1.3, .9, portraitTex(30, 1), -Math.PI / 2);
// 出口（大廳北牆左邊）
const EXIT = { x: -5.6, z: -5.3 };
{
  const g = new THREE.Group(); g.position.set(-5.6, 0, -5.97); scene.add(g);
  const door = std(0x5a3e28, { roughness: .45 });
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(.66, 2.2, .06), door); d.position.set(s * .34, 1.1, 0); d.castShadow = true; g.add(d);
    for (const py of [.6, 1.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.46, .6, .02), std(0x4c3422, { roughness: .5 })); p.position.set(s * .34, py, .04); g.add(p); }
    const k = new THREE.Mesh(new THREE.BoxGeometry(.02, .22, .03), M.brass); k.position.set(s * .07, 1.1, .06); g.add(k); }
  const fr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.34, .05), M.marble); fr.position.set(0, 1.17, -.03); g.add(fr);
}
// 警衛的服務台
box(1.3, 1, .55, M.marble, -3, 0, 5.1, { solid: true }); box(1.38, .05, .62, M.darkMarble, -3, 1, 5.1);

/* ---------- 恐龍骨架（夜裡會轉頭看你、張嘴） ---------- */
const dino = new THREE.Group(); dino.position.set(DAIS.x, .33, DAIS.z); dino.scale.setScalar(1.45); scene.add(dino);
const dinoHead = new THREE.Group(), dinoJaw = new THREE.Group();
{
  const bone = M.bone, B = (geo, x, y, z, rx = 0, ry = 0, rz = 0, p = dino) => { const m = new THREE.Mesh(geo, bone); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; p.add(m); return m; };
  // 脊椎：一節一節的椎骨，從尾巴到脖子
  const spine = new THREE.CatmullRomCurve3([[-2.1, .9, 0], [-1.4, 1.15, 0], [-.6, 1.45, 0], [.2, 1.55, 0], [.8, 1.65, 0], [1.2, 1.95, 0]].map(p => new THREE.Vector3(...p)));
  for (let i = 0; i <= 26; i++) { const t = i / 26, p = spine.getPoint(t), r = .05 + Math.sin(t * Math.PI) * .07; B(new THREE.SphereGeometry(r, 10, 8), p.x, p.y, p.z); B(new THREE.BoxGeometry(.03, r * 2.4, .03), p.x, p.y + r * 1.4, p.z); }
  // 肋骨
  for (let i = 0; i < 7; i++) {
    const x = -.5 + i * .17, p = spine.getPoint(.42 + i * .045), r = .32 - Math.abs(i - 3) * .04;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(r, .022, 6, 20, Math.PI * 1.15), bone); rib.position.set(x, p.y - r * .95, 0); rib.rotation.set(0, Math.PI / 2, Math.PI * .43); rib.castShadow = true; dino.add(rib);
  }
  // 腿：大腿、小腿、腳掌
  for (const s of [-1, 1]) {
    B(new THREE.CylinderGeometry(.07, .05, .7, 10), .1, 1.08, s * .2, 0, 0, .35);
    B(new THREE.CylinderGeometry(.05, .04, .66, 10), .2, .48, s * .22, 0, 0, -.25);
    B(new THREE.BoxGeometry(.34, .05, .1), .32, .05, s * .22);
    B(new THREE.CylinderGeometry(.025, .02, .3, 8), .95, 1.32, s * .14, 0, 0, -.9);   // 小手
  }
  // 頭：頭骨＋下巴（下巴另外一組，夜裡會張嘴）
  dinoHead.position.set(1.25, 2, 0); dino.add(dinoHead);
  B(new THREE.BoxGeometry(.62, .26, .3), .3, .02, 0, 0, 0, -.08, dinoHead);
  B(new THREE.SphereGeometry(.17, 12, 10), .02, .04, 0, 0, 0, 0, dinoHead);
  const eye = std(0x0b1224); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), eye); e.position.set(.16, .08, s * .15); dinoHead.add(e); }
  dinoJaw.position.set(.02, -.1, 0); dinoHead.add(dinoJaw);
  B(new THREE.BoxGeometry(.56, .07, .24), .28, -.03, 0, 0, 0, 0, dinoJaw);
  for (let i = 0; i < 6; i++) B(new THREE.ConeGeometry(.018, .06, 5), .12 + i * .08, .04, .1, Math.PI, 0, 0, dinoJaw), B(new THREE.ConeGeometry(.018, .06, 5), .12 + i * .08, .04, -.1, Math.PI, 0, 0, dinoJaw);
}
dino.rotation.y = .5;

/* ---------- 理財廳：五座展櫃，牆上一盞聚光燈往下照 ---------- */
const VITRINE_X = [-6, -3, 0, 3, 6], VZ = -12.7;
const room = DATA.floors.find(f => f.id === "f2");
const roomItems = DATA.exhibits.filter(e => e.floor === "f2").slice(0, 5);
const vitrines = [];
function goldObject(key) {   // 展櫃裡的小擺件（燙金＋象牙瓷，跟線稿同一件物品）
  const g = new THREE.Group(), G = M.gold, I = M.ivory, add = (m, x, y, z, rx = 0, ry = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; g.add(m); return m; };
  if (key === "hourglass") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .04, 20), G), 0, .02, 0); add(new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .04, 20), G), 0, .62, 0);
    for (const a of [0, 2.1, 4.2]) add(new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .58, 8), G), Math.cos(a) * .14, .32, Math.sin(a) * .14);
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector2(.02 + Math.pow(Math.abs(t - .5) * 2, 1.6) * .1, .04 + t * .56)); }
    add(new THREE.Mesh(new THREE.LatheGeometry(pts, 20), M.glass), 0, 0, 0);
    add(new THREE.Mesh(new THREE.ConeGeometry(.09, .12, 16), std(0xe8c97a)), 0, .1, 0);
    add(new THREE.Mesh(new THREE.ConeGeometry(.07, .1, 16), std(0xe8c97a)), 0, .44, 0, Math.PI);
  } else if (key === "clock") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .06, 32), G), 0, .3, 0, Math.PI / 2);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .02, 32), I), 0, .3, .03, Math.PI / 2);
    add(new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 8, 16), G), 0, .58, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.012, .13, .01), std(0x222222)), 0, .35, .045);
    add(new THREE.Mesh(new THREE.BoxGeometry(.09, .012, .01), std(0x222222)), .04, .3, .045);
    add(new THREE.Mesh(new THREE.BoxGeometry(.16, .08, .1), G), 0, .04, 0);
  } else if (key === "piggy") {
    add(new THREE.Mesh(new THREE.SphereGeometry(.2, 20, 14), I), 0, .26, 0).scale.set(1.25, 1, 1);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .08, 16), I), .27, .26, 0, 0, 0, Math.PI / 2);
    for (const [x, z] of [[-.13, -.09], [-.13, .09], [.13, -.09], [.13, .09]]) add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .1, 10), I), x, .05, z);
    for (const z of [-.08, .08]) add(new THREE.Mesh(new THREE.ConeGeometry(.04, .08, 6), I), .14, .46, z);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .015, 20), G), 0, .55, 0, Math.PI / 2);
  } else if (key === "scale") {
    add(new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .04, 20), G), 0, .02, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .52, 8), G), 0, .3, 0);
    add(new THREE.Mesh(new THREE.BoxGeometry(.5, .02, .02), G), 0, .56, 0, 0, 0, -.12);
    for (const [x, y] of [[-.24, .26], [.24, .32]]) { add(new THREE.Mesh(new THREE.CylinderGeometry(.1, .06, .03, 20), G), x, y, 0); add(new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, .3, 4), G), x, y + .15, 0); }
    for (let i = 0; i < 3; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, .012, 16), G), -.24, .29 + i * .014, 0);
  } else {   // scroll：兩根軸＋展開的紙
    for (const y of [.06, .58]) { add(new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .42, 10), G), 0, y, 0, 0, 0, Math.PI / 2); }
    add(new THREE.Mesh(new THREE.PlaneGeometry(.34, .5), std(0xf3e8cc, { side: THREE.DoubleSide })), 0, .32, 0);
    add(new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), std(0xa8322c)), .1, .14, .002);
  }
  return g;
}
roomItems.forEach((e, i) => {
  const x = VITRINE_X[i], z = VZ;
  // 白色方台座＋黃銅細邊＋玻璃方罩（現代博物館的展櫃）
  box(.7, .06, .7, M.baseW, x, 0, z); box(.64, .92, .64, M.plinth, x, .06, z); box(.68, .03, .68, M.brass, x, .98, z);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.26, .1), M.brass); plate.position.set(x, .78, z + .325); scene.add(plate);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.6, .7, .6), M.glass); glass.position.set(x, 1.01 + .35, z); scene.add(glass);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: 0xc9a14e, transparent: true, opacity: .55 })); edges.position.copy(glass.position); scene.add(edges);
  const obj = goldObject(e.object); obj.position.set(x, 1.01, z); obj.scale.setScalar(1.1); scene.add(obj);
  // 牆上黃銅小燈＋往下照的光束
  box(.1, .08, .34, M.brass, x, 2.55, z - .95, { shadow: false });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(.5, 1.6, 24, 1, true), M.beam.clone()); beam.position.set(x, 1.85, z - .42); beam.rotation.x = -.38; scene.add(beam);
  const spot = new THREE.SpotLight(0xffe4b0, 0, 5, .5, .6, 1.2); spot.position.set(x, 2.6, z - .8); spot.target.position.set(x, 1.1, z); scene.add(spot, spot.target);
  solids.push([x - .4, z - .4, x + .4, z + .4]);
  vitrines.push({ e, x, z, obj, beam, spot, look: new THREE.Vector3(x, 0, z + 1.45) });
});
// 紅龍柱：展櫃前一條
{
  const posts = [];
  for (let i = 0; i <= 10; i++) posts.push(-7 + i * 1.4);
  for (const x of posts) { cyl(.035, .045, .9, M.brass, x, 0, VZ + 1, 10); cyl(.12, .14, .04, M.brass, x, 0, VZ + 1, 16); sph(.05, M.brass, x, .93, VZ + 1); }
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(a, .87, VZ + 1), new THREE.Vector3((a + b) / 2, .68, VZ + 1), new THREE.Vector3(b, .87, VZ + 1)]), 10, .022, 6), M.rope);
    rope.castShadow = true; scene.add(rope);
  }
  solids.push([-7.2, VZ + .9, 7.2, VZ + 1.1]);
}

/* ---------- 光：白天天光、夜裡月光＋值班燈＋手電筒 ---------- */
const hemi = new THREE.HemisphereLight(0xfbf6ee, 0x8a8070, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e2, 2.4); sun.position.set(8, 15, 7); sun.target.position.set(0, 0, -4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 17, bottom: -17, near: 1, far: 45 }); sun.shadow.bias = -.0005; sun.shadow.normalBias = .03; sun.shadow.radius = 4;
scene.add(sun, sun.target);
// 夜裡主角身邊一圈很淡的暖光，才看得到自己
const selfLight = new THREE.PointLight(0xffe6b8, 0, 3, 1.5); scene.add(selfLight);
const flash = new THREE.SpotLight(0xffe6b8, 0, 14, .52, .5, 1.2); flash.castShadow = !coarse; flash.shadow.mapSize.set(512, 512); scene.add(flash, flash.target);

/* ---------- 人：成人比例、簡約有質感（臉不畫五官，像建築模型裡的人） ---------- */
function person({ coat = 0x2a3a5c, pants = 0x22262e, hair = 0x2b2019, skin = 0xe2c3a2, scarf = null, hat = null, long = false, flashlight = false, h = 1 } = {}) {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(h); g.add(inner);
  const add = (geo, mat, x, y, z, p = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
  const coatM = std(coat, { roughness: .8 }), pantsM = std(pants, { roughness: .8 }), skinM = std(skin, { roughness: .6 }), hairM = std(hair, { roughness: .75 }), shoeM = std(0x1a1614, { roughness: .4 });
  const legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * .085, .86, 0); inner.add(hip);
    add(new THREE.CylinderGeometry(.068, .056, .8, 10), pantsM, 0, -.4, 0, hip); add(new THREE.BoxGeometry(.1, .06, .2), shoeM, 0, -.83, .04, hip); return hip; });
  add(new THREE.CylinderGeometry(.16, .145, .5, 16), coatM, 0, 1.12, 0);                       // 上身
  if (long) add(new THREE.CylinderGeometry(.165, .23, .5, 16), coatM, 0, .72, 0);               // 長大衣下擺
  add(new THREE.SphereGeometry(.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), coatM, 0, 1.36, 0).scale.set(1.25, .55, .9);   // 肩
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .2, 1.36, 0); inner.add(sh);
    add(new THREE.CylinderGeometry(.05, .042, .62, 10), coatM, 0, -.31, 0, sh); add(new THREE.SphereGeometry(.042, 8, 6), skinM, 0, -.65, 0, sh); sh.rotation.z = s * .08; return sh; });
  add(new THREE.CylinderGeometry(.045, .05, .1, 10), skinM, 0, 1.46, 0);
  const head = add(new THREE.SphereGeometry(.105, 20, 16), skinM, 0, 1.6, 0); head.scale.set(.92, 1.08, 1);
  add(new THREE.SphereGeometry(.112, 18, 12, 0, Math.PI * 2, 0, Math.PI * .55), hairM, 0, 1.62, -.012).rotation.x = -.3;
  add(new THREE.SphereGeometry(.09, 14, 10), hairM, 0, 1.56, -.05).scale.set(1.05, 1, .9);
  if (scarf) { const sc = add(new THREE.TorusGeometry(.07, .03, 8, 18), std(scarf, { roughness: .9 }), 0, 1.45, 0); sc.rotation.x = Math.PI / 2; add(new THREE.BoxGeometry(.06, .2, .03), std(scarf, { roughness: .9 }), .05, 1.33, .14); }
  if (hat) { add(new THREE.CylinderGeometry(.1, .11, .07, 18), std(hat), 0, 1.71, 0); add(new THREE.CylinderGeometry(.13, .13, .015, 18), std(0x15181e), 0, 1.68, .03); }
  let torch = null;
  if (flashlight) { torch = add(new THREE.CylinderGeometry(.022, .03, .16, 10), M.brass, 0, -.6, .06, arms[1]); torch.rotation.x = Math.PI / 2; }
  g.userData = { inner, legs, arms, torch };
  scene.add(g); return g;
}
// Q 版大頭小人（使用者說「蠻可愛的」，保留當預設）；網址加 ?adult 換成成人比例比較
function chibi({ coat = 0x2b3f6e, pants = 0x1a2238, hair = 0x3a2a22, skin = 0xf3d2b5, scarf = null, hat = null, flashlight = false, glasses = false, h = 1 } = {}) {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(1.25 * h); g.add(inner);
  const S = (geo, mat, x, y, z, p = inner) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
  const skinM = std(skin, { roughness: .55 }), hairM = std(hair, { roughness: .6 }), shirtM = std(coat, { roughness: .8 }), pantsM = std(pants, { roughness: .8 });
  const legs = [-1, 1].map(s => { const hip = new THREE.Group(); hip.position.set(s * .07, .22, 0); inner.add(hip); S(new THREE.CylinderGeometry(.055, .05, .22, 10), pantsM, 0, -.11, 0, hip); S(new THREE.SphereGeometry(.055, 10, 6), std(0x1a1614, { roughness: .4 }), 0, -.21, .02, hip).scale.set(1, .6, 1.4); return hip; });
  S(new THREE.CylinderGeometry(.13, .17, .3, 18), shirtM, 0, .36, 0);
  const arms = [-1, 1].map(s => { const sh = new THREE.Group(); sh.position.set(s * .16, .48, 0); inner.add(sh); S(new THREE.CylinderGeometry(.04, .035, .22, 10), shirtM, 0, -.1, 0, sh); S(new THREE.SphereGeometry(.035, 8, 6), skinM, 0, -.22, 0, sh); sh.rotation.z = s * .3; return sh; });
  const head = S(new THREE.SphereGeometry(.26, 28, 20), skinM, 0, .76, 0);
  const cap = S(new THREE.SphereGeometry(.275, 28, 16, 0, Math.PI * 2, 0, Math.PI * .55), hairM, 0, .78, -.02); cap.rotation.x = -.35;
  S(new THREE.SphereGeometry(.2, 16, 10), hairM, 0, .7, -.12).scale.set(1.15, 1, .9);   // 後腦的頭髮
  const tuft = S(new THREE.ConeGeometry(.035, .13, 8), hairM, .03, 1.06, -.02); tuft.rotation.z = -.5;
  const eyeM = std(0x1a1410, { roughness: .25 });
  for (const s of [-1, 1]) {
    S(new THREE.SphereGeometry(.042, 12, 8), eyeM, s * .09, .74, .225).scale.set(1, 1.3, .6);
    S(new THREE.SphereGeometry(.013, 6, 4), std(0xffffff, { emissive: 0xffffff, emissiveIntensity: .5 }), s * .09 + .015, .765, .254);
    S(new THREE.SphereGeometry(.035, 10, 6), std(0xf0a9a2, { roughness: .9 }), s * .16, .67, .2).scale.set(1, .55, .4);
  }
  if (glasses) for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.055, .008, 6, 16), std(0x2a2a2a)); r.position.set(s * .09, .74, .245); inner.add(r); }
  if (scarf) { const sc = S(new THREE.TorusGeometry(.12, .035, 8, 20), std(scarf, { roughness: .9 }), 0, .5, 0); sc.rotation.x = Math.PI / 2; S(new THREE.OctahedronGeometry(.045), M.gold, .2, .92, .08).scale.set(1, 1, .4); }
  if (hat) { S(new THREE.CylinderGeometry(.24, .26, .1, 20), std(hat), 0, 1, 0); S(new THREE.CylinderGeometry(.3, .3, .02, 20), std(0x111111), 0, .95, .06); }
  let torch = null;
  if (flashlight) { torch = S(new THREE.CylinderGeometry(.025, .033, .13, 10), M.brass, 0, -.22, .06, arms[1]); torch.rotation.x = Math.PI / 2; }
  else if (!hat) S(new THREE.BoxGeometry(.17, .19, .07), std(0xc79b5a, { roughness: .8 }), -.19, .3, -.03);   // 帆布包
  g.userData = { inner, legs, arms, torch };
  scene.add(g); return g;
}
const ADULT = new URLSearchParams(location.search).has("adult");
const makePerson = o => ADULT ? person(o) : chibi(o);
// 主角：下班的老師，深藍大衣＋芥末黃圍巾（引路人的燈火金）
const player = makePerson({ coat: 0x24365e, pants: 0x2a2a30, scarf: 0xd2a24c, long: true, flashlight: true });
player.position.set(0, 0, 4.6); player.rotation.y = Math.PI;
const guard = makePerson({ coat: 0x22262e, pants: 0x1b1e24, hat: 0x22262e, hair: 0x2a2018 });
guard.position.set(-3, 0, 5.75); guard.rotation.y = Math.PI;
// 白天的遊客：大廳繞著恐龍走一圈、理財廳在展櫃前停一下
const LOOKS = [{ coat: 0xb79a76, long: true, hair: 0x5a3a28 }, { coat: 0x5d6b5a, hair: 0x1f1a16 }, { coat: 0x9a5a4e, hair: 0x6a4630, h: .8, skin: 0xe8c8a8 }, { coat: 0x3c4150, long: true, hair: 0x8a8a88 }, { coat: 0xd8cfc0, hair: 0x2a2018, pants: 0x4a4f5c }];
const visitors = LOOKS.map((o, i) => {
  const v = makePerson({ pants: 0x2d3038, ...o });
  v.userData.mode = i < 3 ? "ring" : "room"; v.userData.t = i * 2.1; v.userData.wait = 0; v.userData.speed = .7 + i * .06;
  v.userData.target = i < 3 ? null : VITRINE_X[i % 5];
  return v;
});

/* ---------- DOM：小展牌、牌子、對話泡泡 ---------- */
const tag = document.createElement("button"); tag.className = "tag"; tag.hidden = true; layer.appendChild(tag);
const signs = [
  { el: mkSign("出口<i>EXIT</i>", ""), p: new THREE.Vector3(EXIT.x, 2.55, -5.95) },
  { el: mkSign(`II ${room?.label || "理財廳"}<i>${room?.en || ""}</i>`, "room"), p: new THREE.Vector3(0, 2.75, -6.2) },
  { el: mkSign("I 遊戲廳<i>試做版未開放</i>", "room"), p: new THREE.Vector3(-7.2, 2.2, 0) },
  { el: mkSign("III 測驗廳<i>試做版未開放</i>", "room"), p: new THREE.Vector3(7.2, 2.2, 0) }
];
function mkSign(html, cls) { const p = document.createElement("p"); p.className = "sign " + cls; p.innerHTML = html; layer.appendChild(p); return p; }
const bubble = document.createElement("p"); bubble.className = "bubble"; bubble.hidden = true; layer.appendChild(bubble);
let bubbleUntil = 0, bubbleAt = new THREE.Vector3();
function say(html, at, ms = 2800) { bubble.innerHTML = html; bubble.hidden = false; bubble.classList.remove("out"); bubbleAt.copy(at); bubbleUntil = performance.now() + ms; }

/* ---------- 輸入：鍵盤、拖曳搖桿（跟像素版一樣） ---------- */
const keys = new Set(), joy = { id: null, bx: 0, by: 0, dx: 0, dy: 0 }, joyEl = $("joy");
const KEYMAP = { ArrowUp: "u", KeyW: "u", ArrowDown: "d", KeyS: "d", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
addEventListener("keydown", e => {
  if (!$("placard").hidden) { if (e.key === "Escape") closePlacard(); return; }
  if (KEYMAP[e.code]) { keys.add(KEYMAP[e.code]); e.preventDefault(); }
  if ((e.code === "Space" || e.code === "Enter") && near) { e.preventDefault(); interact(); }
});
addEventListener("keyup", e => { if (KEYMAP[e.code]) keys.delete(KEYMAP[e.code]); });
stage.addEventListener("pointerdown", e => { if (joy.id !== null) return; joy.id = e.pointerId; joy.bx = e.clientX; joy.by = e.clientY; joy.dx = joy.dy = 0;
  joyEl.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`; joyEl.hidden = false; joyEl.firstElementChild.style.transform = ""; stage.setPointerCapture(e.pointerId); hideHelp(); });
stage.addEventListener("pointermove", e => { if (e.pointerId !== joy.id) return; joy.dx = e.clientX - joy.bx; joy.dy = e.clientY - joy.by;
  const l = Math.hypot(joy.dx, joy.dy), m = Math.min(l, 34); joyEl.firstElementChild.style.transform = l ? `translate(${joy.dx / l * m}px, ${joy.dy / l * m}px)` : ""; });
const endJoy = e => { if (e.pointerId !== joy.id) return; joy.id = null; joyEl.hidden = true; };
stage.addEventListener("pointerup", endJoy); stage.addEventListener("pointercancel", endJoy);
function inputVec() {
  let x = (keys.has("r") ? 1 : 0) - (keys.has("l") ? 1 : 0), y = (keys.has("d") ? 1 : 0) - (keys.has("u") ? 1 : 0);
  if (joy.id !== null) { const l = Math.hypot(joy.dx, joy.dy); if (l > 8) { x = joy.dx / l * Math.min(1, l / 36); y = joy.dy / l * Math.min(1, l / 36); } }
  const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } return { x, y };
}
function blocked(x, z, r = .24) { for (const [a, b, c, d] of solids) if (x + r > a && x - r < c && z + r > b && z - r < d) return true; return x < -8.2 || x > 8.2 || z < -14.2 || z > 6.6; }

/* ---------- 白天／夜晚 ---------- */
let night = false;
function setNight(n) {
  night = n; document.body.classList.toggle("is-night", n); document.body.classList.toggle("is-day", !n);
  const dn = $("daynight"); dn.setAttribute("aria-pressed", String(n)); dn.title = n ? "開燈，回到白天" : "熄燈，切到夜晚"; dn.setAttribute("aria-label", dn.title);
  // 白天：暖白天光從窗戶進來；夜裡：月光、幾盞值班燈、展櫃聚光燈、手電筒
  hemi.color.set(n ? 0x6d82b8 : 0xfbf6ee); hemi.groundColor.set(n ? 0x0a0c12 : 0x8a8070); hemi.intensity = n ? .16 : 1.2;
  sun.color.set(n ? 0xa9bce6 : 0xfff3e2); sun.intensity = n ? .32 : 2.4;
  renderer.toneMappingExposure = n ? 1.1 : 1;
  flash.intensity = n ? 60 : 0; selfLight.intensity = n ? 2.2 : 0;
  for (const L of lampLights) L.intensity = n ? 4.5 : 0;
  for (const v of vitrines) { v.spot.intensity = n ? 14 : 4; v.beam.material.opacity = n ? .12 : .04; }
  for (const w of windows) w.color.set(n ? 0x6a84bc : 0xf4f8ff);
  ground.material.color.set(n ? 0x0b0f18 : 0xd6d1c7);
  scene.background = new THREE.Color(n ? 0x05070d : 0xd6d1c7);
  scene.fog = n ? new THREE.Fog(0x05070d, 26, 46) : new THREE.Fog(0xd6d1c7, 34, 60);
  for (const v of visitors) v.visible = !n;
  guardSaid = false; bubble.hidden = true;
  help(n ? "夜裡展品會活過來。恐龍會轉頭看你。" : "白天開館，有遊客在逛。右上角的月亮可以熄燈。");
}
$("daynight").addEventListener("click", e => { if (e.detail) e.currentTarget.blur(); setNight(!night); });

/* ---------- 說明牌 ---------- */
function openPlacard(e) {
  $("pl-art").innerHTML = engravingSVG(e.object);
  $("pl-floor").textContent = `II ・ ${room?.label || ""}・${room?.name || ""}`;
  $("pl-title").textContent = e.title; $("pl-en").textContent = e.en;
  const q = night && e.persona?.quip; $("pl-quip").hidden = !q; $("pl-quip").textContent = q ? `「${e.persona.quip}」` : "";
  $("pl-note").textContent = e.note;
  $("pl-links").innerHTML = (e.links || []).map(l => `<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join("");
  $("placard").hidden = false; $("placard").scrollTop = 0; $("pl-close").focus({ preventScroll: true });
}
function closePlacard() { $("placard").hidden = true; }
$("pl-close").addEventListener("click", closePlacard);
$("placard").addEventListener("click", e => { if (e.target === $("placard")) closePlacard(); });
tag.addEventListener("click", interact);
function interact() { if (!near || !$("placard").hidden) return; if (near.exit) location.href = "../"; else openPlacard(near.e); }

/* ---------- 每一格畫面 ---------- */
let near = null, guardSaid = false, dinoSaidAt = -99, curRoom = "hall", last = performance.now(), walkT = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
  // 走路
  const iv = $("placard").hidden ? inputVec() : { x: 0, y: 0 }, SPEED = 3.2;
  const moving = Math.hypot(iv.x, iv.y) > .05;
  if (moving) {
    const nx = player.position.x + iv.x * SPEED * dt, nz = player.position.z + iv.y * SPEED * dt;
    if (!blocked(nx, player.position.z)) player.position.x = nx;
    if (!blocked(player.position.x, nz)) player.position.z = nz;
    const want = Math.atan2(iv.x, iv.y); let d = want - player.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); player.rotation.y += d * Math.min(1, dt * 14);
    walkT += dt * 9;
  }
  animatePerson(player, moving ? walkT : 0, moving);
  // 手電筒：從手上往前照
  if (night) {
    const fx = Math.sin(player.rotation.y), fz = Math.cos(player.rotation.y);
    flash.position.set(player.position.x + fx * .2, .9, player.position.z + fz * .2);
    flash.target.position.set(player.position.x + fx * 4, 0, player.position.z + fz * 4);
    selfLight.position.set(player.position.x - fx * .3, 1.9, player.position.z - fz * .3 + .4);
  }
  // 在哪一廳：進理財廳時上方浮出廳名
  const inRoom = player.position.z < -6.3 ? "f2" : "hall";
  if (inRoom !== curRoom) { curRoom = inRoom; banner(inRoom === "f2" ? room : null); }
  // 遊客
  if (!night) visitors.forEach((v, i) => updateVisitor(v, dt, t, i));
  // 恐龍：夜裡轉頭看你、偶爾張嘴；靠太近跳一下說一句（隔 20 秒）
  const dd = player.position.distanceTo(tmp.set(DAIS.x, 0, DAIS.z));
  if (night && !REDUCED) {
    const local = dino.worldToLocal(player.position.clone().setY(2)), yaw = Math.atan2(-local.z, local.x);
    dinoHead.rotation.y += (THREE.MathUtils.clamp(yaw, -1, 1) - dinoHead.rotation.y) * Math.min(1, dt * 3);
    dinoJaw.rotation.z = -Math.max(0, Math.sin(t * 1.3)) * .35;
    dino.position.y = .33 + (dd < 3 ? Math.max(0, Math.sin(t * 10)) * .04 : 0);
    if (dd < 3.6 && t - dinoSaidAt > 20) { dinoSaidAt = t; say(["喀啦。", "（牠歪頭看了你一眼。）", "吼——（骨頭版）"][Math.floor(Math.random() * 3)], tmp.set(DAIS.x + 1, 3, DAIS.z)); }
  } else { dinoHead.rotation.y *= .9; dinoJaw.rotation.z = 0; dino.position.y = .33; }
  // 半身像：夜裡你走過去之後，牠把頭轉過來
  for (const s of statues) {
    const d = Math.hypot(player.position.x - s.x, player.position.z - s.z);
    if (night && !REDUCED) { if (d < 1.6) s.near = true; else if (s.near && d > 2.4) { s.near = false; s.pose = 1 - s.pose; } }
    else s.pose = 0;
    s.head.rotation.y += ((s.pose ? .9 : 0) - s.head.rotation.y) * Math.min(1, dt * 4);   // 半身像轉頭看你
  }
  // 警衛：一次只在第一次走近時說一句
  if (!guardSaid && player.position.distanceTo(guard.position) < 1.6) {
    guardSaid = true; const pool = (night ? DATA.guard : DATA.guardDay) || [];
    const l = pool[Math.floor(Math.random() * pool.length)]; if (l) say(`<b>${night ? "夜班警衛" : "警衛"}</b>${l.zh}`, tmp.set(guard.position.x, 1.5, guard.position.z));
  }
  guard.rotation.y = Math.atan2(player.position.x - guard.position.x, player.position.z - guard.position.z);
  // 展品的光、擺件輕輕轉
  for (const v of vitrines) v.obj.rotation.y = REDUCED ? 0 : Math.sin(t * .4 + v.x) * (night ? .5 : .15);
  // 靠近什麼
  near = null; let bd = 1.25;
  for (const v of vitrines) { const d = Math.hypot(player.position.x - v.look.x, player.position.z - v.look.z); if (d < bd) { bd = d; near = v; } }
  if (Math.hypot(player.position.x - EXIT.x, player.position.z - EXIT.z) < 1) near = { exit: true, x: EXIT.x, z: -6 };
  // 鏡頭：斜俯視跟著人；直式手機拉遠一點才看得到兩側
  const aspect = innerWidth / innerHeight, far = aspect < 1 ? 1.35 : 1;
  camLook.set(player.position.x * .85, .4, player.position.z - 1.8);
  tmp.set(camLook.x, camLook.y + 14 * far, camLook.z + 11.5 * far);
  camPos.lerp(tmp, REDUCED ? 1 : Math.min(1, dt * 5)); camera.position.copy(camPos); camera.lookAt(camLook.x, camLook.y, camLook.z - (camPos.z - tmp.z) * 0);
  renderer.render(scene, camera);
  placeDom(now);
  requestAnimationFrame(frame);
}
function animatePerson(c, wt, moving) {
  const u = c.userData; if (REDUCED) wt = 0;
  u.legs[0].rotation.x = Math.sin(wt) * .6; u.legs[1].rotation.x = -Math.sin(wt) * .6;
  u.arms[0].rotation.x = -Math.sin(wt) * .5; u.arms[1].rotation.x = Math.sin(wt) * .5;
  u.inner.position.y = moving && !REDUCED ? Math.abs(Math.sin(wt)) * .04 : 0;
}
function updateVisitor(v, dt, t, i) {
  const u = v.userData;
  if (u.wait > 0) { u.wait -= dt; animatePerson(v, 0, false); return; }
  let tx, tz;
  if (u.mode === "ring") { u.t += dt * u.speed / 3.6; tx = DAIS.x + Math.cos(u.t + i * 2.1) * 3.5; tz = DAIS.z + Math.sin(u.t + i * 2.1) * 3.3; if (Math.random() < dt * .08) u.wait = 2 + Math.random() * 3; }
  else {
    tx = u.target; tz = VZ + 1.5;
    if (Math.hypot(v.position.x - tx, v.position.z - tz) < .1) { u.wait = 3 + Math.random() * 4; u.target = VITRINE_X[Math.floor(Math.random() * 5)]; v.rotation.y = Math.PI; animatePerson(v, 0, false); return; }
  }
  const dx = tx - v.position.x, dz = tz - v.position.z, l = Math.hypot(dx, dz);
  if (u.mode === "ring" && v.position.lengthSq() === 0) { v.position.set(tx, 0, tz); return; }
  const step = Math.min(l, u.speed * dt * (u.mode === "ring" ? 1.6 : 1));
  if (l > .001) { v.position.x += dx / l * step; v.position.z += dz / l * step; v.rotation.y = Math.atan2(dx, dz); }
  u.wt = (u.wt || 0) + dt * 7; animatePerson(v, u.wt, true);
}
visitors.forEach((v, i) => { if (v.userData.mode === "room") v.position.set(VITRINE_X[(i * 2) % 5], 0, VZ + 1.5); });

function toScreen(p) { tmp.copy(p).project(camera); return [(tmp.x + 1) / 2 * innerWidth, (1 - tmp.y) / 2 * innerHeight, tmp.z < 1]; }
function placeDom(now) {
  // 牌子一定在畫面裡（太靠邊就往內推）
  for (const s of signs) { const [x, y, ok] = toScreen(s.p), hw = s.el.offsetWidth / 2 + 8; s.el.style.transform = `translate(${Math.round(Math.min(Math.max(x, hw), innerWidth - hw))}px, ${Math.round(y)}px)`; s.el.hidden = !ok || y < 70; }
  if (near && $("placard").hidden) {
    tag.innerHTML = near.exit ? "<b>出口</b><span>回到現在的館 ›</span>" : `<b>${near.e.title}</b><span>看說明牌 ›</span>`;
    const [x, y] = toScreen(tmp.set(near.x, near.exit ? 2.3 : 2.05, near.z));
    tag.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(y, 120))}px)`; tag.hidden = false;
  } else tag.hidden = true;
  if (!bubble.hidden) {
    const far = Math.hypot(player.position.x - bubbleAt.x, player.position.z - bubbleAt.z) > 3.5;
    if (far && bubbleUntil - now > 220) bubbleUntil = now + 220;
    bubble.classList.toggle("out", bubbleUntil - now < 300);
    if (now > bubbleUntil) bubble.hidden = true;
    const [x, y] = toScreen(bubbleAt); bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(Math.max(y, 110))}px)`;
  }
}
function banner(r) {
  const b = $("banner"); b.innerHTML = r ? `<i>${r.numeral}</i><b>${r.name}</b><span>${r.label}・${r.en}</span>` : "<b>大廳</b><span>Grand Hall</span>";
  b.hidden = false; b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
  clearTimeout(banner.t); banner.t = setTimeout(() => b.hidden = true, 2600);
}
let helpT; function help(text) { const h = $("help"); h.textContent = (coarse ? "按住畫面任一處拖曳就能走。" : "方向鍵或 WASD 走動，空白鍵看說明牌。") + text; h.classList.remove("out"); clearTimeout(helpT); helpT = setTimeout(hideHelp, 7000); }
function hideHelp() { $("help").classList.add("out"); }

function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < innerHeight ? 44 : 34; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();
window.__lab = { player };   // 只給測試用：把人搬到某個位置截圖
setNight(false);
camPos.set(player.position.x, 12, player.position.z + 12);
banner(null);
requestAnimationFrame(t => { last = t; frame(t); $("loading").classList.add("done"); });
