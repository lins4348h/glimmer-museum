// 微光博物館｜像素素材
// 每張圖是一組字串，一個字元＝一個像素，對照 PAL 上色；「.」是透明。
// 正面、背面的人物只畫左半邊，右半邊鏡像，再用 over 補上不對稱的地方（帆布包、手電筒）。

export const PAL = {
  k: "#0a0e1a", K: "#262f48",
  h: "#3b2a20", H: "#5d4331",
  s: "#f0c8a0", S: "#cf9a74",
  i: "#efe6d2", I: "#c9b994", j: "#8f8062",
  c: "#4d6390", C: "#36486e",
  w: "#f4efe2",
  p: "#2b3452", P: "#1d2439",
  o: "#2a1f18",
  t: "#d9c7a0", T: "#a8936a",
  g: "#d4a64a", G: "#f3d895", b: "#8a6420",
  n: "#1b2d4f", N: "#2f4775", u: "#16223d",
  m: "#dfe7f2", M: "#9fb2cf",
  r: "#c0503c", R: "#e07a5f",
  e: "#7fa9d0", E: "#b9d3ea",
  a: "#c98a4a", A: "#ecc48c",
  f: "#fff3cf",
  v: "#7a5c35", V: "#5e4428",
  z: "#3d3a47",
  // 白天遊客的衣服、頭髮
  x: "#8a4f4a", X: "#6b3a37", y: "#4f6b58", Y: "#3b5244", q: "#b59a6e", Q: "#8f7853",
  l: "#a9a9b4", L: "#7d7d89", d: "#6a4a8a", D: "#523870", F: "#e7d9b8"
};

const mirror = rows => rows.map(r => r + [...r].reverse().join(""));
const put = (rows, pts) => {
  const g = rows.map(r => [...r]);
  for (const [x, y, c] of pts) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c;
  return g.map(r => r.join(""));
};
const flipX = rows => rows.map(r => [...r].reverse().join(""));

/* ---------- 下班的老師（16×24） ---------- */
// 正面：頭、眼鏡、開襟毛衣；腿另外畫，才能走路
const T_FRONT_TOP = mirror([
  "........",
  ".....kkk",
  "....khhh",
  "...khhhh",
  "..khhhhh",
  "..khhhhh",
  "..khhhHs",
  "..khssss",
  "..khgkgs",
  "..kSssss",
  "...kssss",
  "....kkks",
  "...kccww",
  "..kcccww",
  "..kcCcww",
  "..kcCcww",
  "..kscccw",
  "...kpppp",
  "...kpppp"
]);
const legsFront = f => {
  // f：0 站、1 左腳抬、2 右腳抬
  const L = ["....kppk", "....kppk", "....kppk", "...kook.", "...kkkk."];
  const up = ["....kppk", "....kook", "....kkk.", "........", "........"];
  const left = f === 1 ? up : L, right = f === 2 ? up : L;
  return left.map((l, i) => l + [...right[i]].reverse().join(""));
};
const T_FRONT_OVER = [
  // 右手（畫面左邊）拿手電筒，往下照
  [2, 17, "K"], [2, 18, "K"], [2, 19, "f"], [3, 17, "s"],
  // 左肩（畫面右邊）帆布包
  [10, 12, "T"], [11, 13, "T"], [12, 14, "T"], [12, 15, "k"], [13, 15, "k"], [14, 15, "k"],
  [11, 16, "k"], [12, 16, "t"], [13, 16, "t"], [14, 16, "t"], [15, 16, "k"],
  [11, 17, "k"], [12, 17, "t"], [13, 17, "T"], [14, 17, "t"], [15, 17, "k"],
  [11, 18, "k"], [12, 18, "t"], [13, 18, "t"], [14, 18, "t"], [15, 18, "k"],
  [12, 19, "k"], [13, 19, "k"], [14, 19, "k"]
];
// 背面：看到後腦勺和背上的包
const T_BACK_TOP = mirror([
  "........",
  ".....kkk",
  "....khhh",
  "...khhhh",
  "..khhhhh",
  "..khhhhh",
  "..khhhhh",
  "..khhhhh",
  "..khhhHH",
  "..kHhhhh",
  "...khhhh",
  "....kkks",
  "...kcccc",
  "..kccccc",
  "..kcCccc",
  "..kcCccc",
  "..kscccc",
  "...kpppp",
  "...kpppp"
]);
const T_BACK_OVER = [
  [12, 12, "T"], [11, 13, "T"], [10, 14, "T"], [9, 15, "k"], [10, 15, "k"], [11, 15, "k"], [12, 15, "k"],
  [8, 16, "k"], [9, 16, "t"], [10, 16, "t"], [11, 16, "t"], [12, 16, "k"],
  [8, 17, "k"], [9, 17, "T"], [10, 17, "t"], [11, 17, "T"], [12, 17, "k"],
  [9, 18, "k"], [10, 18, "k"], [11, 18, "k"],
  [13, 16, "s"], [13, 17, "K"], [13, 18, "K"]
];
// 側面（面向左）：手電筒往前照，包在背後
const T_SIDE_TOP = [
  "................",
  "......kkkkk.....",
  ".....khhhhhk....",
  "....khhhhhhhk...",
  "...khhhhhhhhhk..",
  "...khhhhhhhhhk..",
  "...kHsshhhhhhk..",
  "..kssssshhhhk...",
  "..ksgkgsshhhk...",
  "..kssssssshk....",
  "...kSsssshk.....",
  "....kkksskk.....",
  "....kwwccck.....",
  "...kcwcccccTk...",
  "..kscccccccTtk..",
  ".kKscCcccckttk..",
  ".fKkcCccccktTk..",
  "...kcccccckttk..",
  "....kppppp.kk...",
  "....kppppk......"
];
const legsSide = f => f === 0
  ? ["....kppk........", "....kppk........", "....kppk........", "...koook........", "...kkkkk........"]
  : f === 1
    ? ["...kppkpk.......", "..kppk.kpk......", "..kppk..kpk.....", ".kook...kook....", ".kkkk...kkkk...."]
    : ["....kpppk.......", "....kppk........", "...kppkpk.......", "..kook.kook.....", "..kkkk.kkkk....."];

function teacher() {
  const out = {};
  for (const f of [0, 1, 2]) {
    out["down" + f] = put([...T_FRONT_TOP, ...legsFront(f)], T_FRONT_OVER);
    out["up" + f] = put([...T_BACK_TOP, ...legsFront(f)], T_BACK_OVER);
    out["left" + f] = [...T_SIDE_TOP, ...legsSide(f)];
    out["right" + f] = flipX(out["left" + f]);
  }
  return out;
}
export const TEACHER = teacher();

/* ---------- 白天的遊客：從老師換顏色、拿掉手電筒；小孩矮一點 ---------- */
// o：hair／hairS 頭髮、coat／coatS 上衣、pants 褲子、bag／bagS 包、glasses 眼鏡、kid 小孩
export function visitor(o) {
  const swap = { h: o.hair, H: o.hairS, c: o.coat, C: o.coatS, p: o.pants, t: o.bag, T: o.bagS };
  const out = {};
  for (const [k, rows] of Object.entries(TEACHER)) {
    let g = rows.map(r => [...r].map(ch => swap[ch] || ch));
    // 拿掉手電筒（K 機身、f 鏡頭）
    g = g.map(r => r.map(ch => ch === "f" ? "." : ch));
    if (k.startsWith("down")) { g[17][2] = "."; g[18][2] = "."; }
    if (k.startsWith("up")) { g[17][13] = "."; g[18][13] = "."; }
    if (k.startsWith("left") || k.startsWith("right")) g = g.map((r, y) => y === 15 || y === 16 ? r.map((ch, x) => ch === "K" ? "." : ch) : r);
    if (!o.glasses && (k.startsWith("down") || k.startsWith("left") || k.startsWith("right"))) g = g.map((r, y) => y === 8 ? r.map(ch => ch === "g" ? "s" : ch) : r);
    let rr = g.map(r => r.join(""));
    // 小孩：身體短兩排、腿短一排
    if (o.kid) rr = rr.filter((_, y) => y !== 13 && y !== 15 && y !== 19);
    out[k] = rr;
  }
  return out;
}

/* ---------- 夜班警衛（16×24，正面，大盤帽） ---------- */
export const GUARD = put([...mirror([
  "........",
  "....kkkk",
  "...knnnn",
  "..knnnNg",
  "..kkkkkk",
  "...kbbbb",
  "...kssss",
  "...ksksS",
  "...kssss",
  "...kshhh",
  "....ksss",
  ".....kks",
  "...knnnn",
  "..knnnng",
  "..knNnnn",
  "..knNnng",
  "..knnnnn",
  "..ksnnng",
  "...knnnn",
  "...kpppp"
]), "....kppk....kppk", "....kppk....kppk", "...kook....kook.", "...kkkk....kkkk."], [[7, 3, "G"], [8, 3, "G"]]);

/* ---------- 雕像（16×24）：兩個姿勢，你走過去它會換 ---------- */
const STATUE_BASE = ["...kjjjjjjjjk...", "..kIIIIIIIIIIk..", "..kjjjjjjjjjjk..", "...kkkkkkkkkk..."];
export const STATUE = [
  [
    "......kkkk......",
    ".....kiiiik.....",
    ".....kiiiIk.....",
    ".....kiiiIk.....",
    "......kiik......",
    "....kkiiiikk....",
    "...kiiiiiiiIk...",
    "...kiikiiiiIk...",
    "...kiikiiikIk...",
    "...kiikiiikIk...",
    "...kiikiiikIk...",
    "....kkiiiikkk...",
    ".....kiiiIk.....",
    ".....kiikIk.....",
    ".....kiikIk.....",
    ".....kiikIk.....",
    ".....kiikIk.....",
    "....kiiikiIk....",
    "....kkkkkkkk....",
    "...kIIIIIIIIk...",
    ...STATUE_BASE
  ],
  [
    "..kk..kkkk......",
    ".kiik.kiiik.....",
    ".kiik.kiiIk.....",
    "..kiikkiiIk.....",
    "...kik.kiik.....",
    "....kiiiiikk....",
    ".....kiiiiiIk...",
    ".....kiiiiikIk..",
    ".....kiiiiikIk..",
    ".....kiiiiikIk..",
    ".....kiiiiikIk..",
    ".....kiiiiikkk..",
    ".....kiiiIk.....",
    "....kiik.kIk....",
    "...kiik...kIk...",
    "...kiik...kIk...",
    "...kiik...kIk...",
    "..kiiik...kiIk..",
    "...kkkkkkkkkk...",
    "...kIIIIIIIIk...",
    ...STATUE_BASE
  ]
];

/* ---------- 鎮館之寶：恐龍骨架（40×28，面向左） ---------- */
const DINO_BODY = [
  "........................................",
  "..kkkkkk................................",
  ".kiiiiiik...............................",
  "kiikiiiiik..............................",
  "kiiiiiiiiik.............................",
  "kiiiiiiiiiik............................",
  ".kIIIIIiiiik.k.k.k.k....................",
  "..kkkkkkiiik.i.i.i.i.k..................",
  "........kiikkiiiiiiiiikk.k.k.k..........",
  "........kiiiiiiiiiiiiiiiikiikiikk.......",
  ".........kiikiikiikiikiiiiiiiiiiiikk....",
  ".........kik.i.ki.i.ki.iiiiiiiiiiiiiik..",
  "..........ki.i.ki.i.kiiiikkkkiiiiiiiiik.",
  "..........kik.kki.i.kiiik....kkkkkiiiik.",
  "...........kk.i.kikk.kiik.........kkiik.",
  ".............kik.kik.kiik...........kik.",
  "..............k...kk.kiik............kk.",
  ".....................kiik...............",
  "...........kiik......kiik..............."
];
const DINO_JAW_SHUT = { 6: ".kIIIIIiiiik.k.k.k.k....................", 7: "..kkkkkkiiik.i.i.i.i.k.................." };
const DINO_JAW_OPEN = { 6: ".kkkkkkkiiik.k.k.k.k....................", 7: "..kIIIIkiiik.i.i.i.i.k..................", 8: "...kkkk.kiikkiiiiiiiiikk.k.k.k.........." };
const dinoLegs = f => f === 0 ? [
  "...........kiik......kiik...............",
  "...........kiik.....kiik................",
  "............kiik....kiik................",
  "............kiik....kiik................",
  "...........kiiik...kiiik................",
  "..........kiiiik..kiiiik................",
  "..........kkkkkk..kkkkkk................",
  "........................................",
  "........................................"
] : [
  "..........kiik.......kiik...............",
  ".........kiik.........kiik..............",
  "........kiik...........kiik.............",
  "........kiik...........kiik.............",
  ".......kiiik...........kiiik............",
  "......kiiiik...........kiiiik...........",
  "......kkkkkk...........kkkkkk...........",
  "........................................",
  "........................................"
];
function dino(open, f) {
  const rows = DINO_BODY.map((r, i) => (open ? DINO_JAW_OPEN : DINO_JAW_SHUT)[i] || r);
  return [...rows, ...dinoLegs(f)];
}
export const DINO = { shut0: dino(false, 0), shut1: dino(false, 1), open0: dino(true, 0), open1: dino(true, 1) };

/* ---------- 13 件展品的小擺件（16×16） ---------- */
export const ITEMS = {
  phone: [
    "................",
    ".....kkkkkk.....",
    "....kzzzzzzk....",
    "....kziiizzkrr..",
    "....kzzzzzzkrr..",
    "....kzzgggzk....",
    "....kzzzzzzk....",
    "....kziiiizk....",
    "....kzzzzzzk....",
    "....kzggzzzk....",
    "....kzzzzzzk....",
    "....kzzzzzzk....",
    "....kzzzggzk....",
    "....kgggggg k...".replace(" ", "g"),
    ".....kkkkkk.....",
    "................"
  ],
  pixel: [
    "................",
    ".....kkkkkk.....",
    "....kggGGggk....",
    "....kgggggg k...".replace(" ", "g"),
    "....kgiiiigk....",
    "....kikiikik....",
    "....kiiiiiik....",
    ".....kkiikk.....",
    "...kkggggggkk...",
    "...kiggggggik...",
    "...kikggggkik...",
    "....kkggggkk....",
    ".....knnnnk.....",
    ".....knkknk.....",
    "....knnk.knnk...",
    "....kkkk.kkkk..."
  ],
  typewriter: [
    "................",
    "......kkkkk.....",
    "......kiiiik....",
    "......kijjik....",
    "......kiiiik....",
    "...kkkkkkkkkkk..",
    "..kgkzzzzzzzkgk.",
    "..kkzzzzzzzzzkk.",
    "..kziziziziziik.",
    "..kzzzzzzzzzzzk.",
    "..kzizizizizizk.",
    "..kzzzzzzzzzzzk.",
    ".kzzziiiiiiizzzk",
    ".kgggggggggggggk",
    ".kkkkkkkkkkkkkkk",
    "................"
  ],
  scroll: [
    "................",
    "..kkkkkkkkkkkk..",
    ".kgbgggggggbggk.",
    "..kkkkkkkkkkkk..",
    "...kiiiiiiiik...",
    "...kijjjjjjik...",
    "...kiiiiiiiik...",
    "...kijjjjjiik...",
    "...kiiiiiiiik...",
    "...kijjjjjjik...",
    "...kiiiiiiiik...",
    "...kijjjiirrk...",
    "...kiiiiiirrk...",
    "..kkkkkkkkkkkk..",
    ".kgbgggggggbggk.",
    "..kkkkkkkkkkkk.."
  ],
  clock: [
    "................",
    "..kkk......kkk..",
    ".kgggk....kgggk.",
    ".kggkkkkkkkkggk.",
    "..kkgggggggggk..",
    "...kgiiiiiiigk..",
    "..kgiiiikiiiigk.",
    "..kgiiiikiiiigk.",
    "..kgiiiikiiiigk.",
    "..kgiiiikkkkigk.",
    "..kgiiiiiiiiigk.",
    "...kgiiiiiiigk..",
    "....kgggggggk...",
    "...kk.kkkkk.kk..",
    "..kgk.......kgk.",
    "..kk.........kk."
  ],
  piggy: [
    "................",
    "................",
    "....kk....kk....",
    "...kIik..kiIk...",
    "...kiiikkkiiik..",
    "..kiiiikkkiiiik.",
    ".kiiiiiiiiiiiiik",
    ".kiikiiiiiiiiRRk",
    ".kiiiiiiiiiiRkRk",
    "kTiiiiiiiiiiiRRk",
    ".kiiiiiiiiiiiik.",
    "..kiiiiiiiiiik..",
    "...kIkkkkkkIk...",
    "...kIk....kIk...",
    "...kkk....kkk...",
    "................"
  ],
  hourglass: [
    "................",
    "..kkkkkkkkkkkk..",
    "..kgggggggggGk..",
    "..kkkkkkkkkkkk..",
    "...kEeeeeeeek...",
    "...kEAAAAAAek...",
    "....kEAAAAek....",
    ".....kEAAek.....",
    "......kAAk......",
    ".....kEeAek.....",
    "....kEeeAeek....",
    "...kEeAAAAeek...",
    "...kAAAAAAAAk...",
    "..kkkkkkkkkkkk..",
    "..kgggggggggGk..",
    "..kkkkkkkkkkkk.."
  ],
  scale: [
    "................",
    ".......kk.......",
    "......kGgk......",
    ".kkkkkkggkkkkkk.",
    ".kgggggggggggggk",
    ".kkkkkkggkkkkkk.",
    "..k.k..kgk.k.k..",
    ".k...k.kgk.k...k",
    "kiiiiik.kgkiiiiik".slice(0, 16),
    ".kiiik..kgk.kiik",
    "..kkk...kgk..kk.",
    ".......kggk.....",
    "......kgggk.....",
    ".....kgggggk....",
    "....kkkkkkkkk...",
    "................"
  ],
  mask: [
    "................",
    "....kkkkkkkk....",
    "...kiiiiiiiik...",
    "..kiiiiiiiiiik..",
    "..kiikkiikkiik..",
    "..kikkkiikkkik..",
    "..kiiiiiiiiiik..",
    "..kiiiiIiiiiik..",
    "...kiiiIIiiik...",
    "...kiikiikiik...",
    "....kiikkiik....",
    "....kiiiiiik....",
    ".....kiiiik.....",
    "......kkkk......",
    ".....kg..gk.....",
    "................"
  ],
  magnifier: [
    "................",
    "....kkkkkk......",
    "...kggggggk.....",
    "..kgeEEeeegk....",
    "..kgEEeeeegk....",
    "..kgeeeeeegk....",
    "..kgeeeeeegk....",
    "..kgeeeeeegk....",
    "...kggggggk.....",
    "....kkkkkkgk....",
    "..........kgk...",
    "...........kbk..",
    "............kbk.",
    ".............kbk",
    "..............kk",
    "................"
  ],
  compass: [
    "................",
    "......kkkk......",
    ".....kgGGgk.....",
    "....kkkkkkkk....",
    "...kgiiiiiigk...",
    "..kgiiiriiiigk..",
    "..kgiiirriiigk..",
    "..kgiiirriiigk..",
    "..kgiiikkiiigk..",
    "..kgiiikkiiigk..",
    "..kgiiikiiiigk..",
    "...kgiiiiiigk...",
    "....kggggggk....",
    ".....kkkkkk.....",
    "................",
    "................"
  ],
  timeclock: [
    "................",
    "...kkkkkkkkkk...",
    "..knnnnnnnnnnk..",
    "..knkkkkkkkknk..",
    "..knkiiiiiiknk..",
    "..knkiiikiiknk..",
    "..knkiiikkiknk..",
    "..knkiiiiiiknk..",
    "..knkkkkkkkknk..",
    "..knnnnnnnnnnk..",
    "..knnkkkkkknnk..",
    "..knnkzzzzknnk..",
    "..knnnnnnnnnnk..",
    "..kggggggggggk..",
    "..kkkkkkkkkkkk..",
    "................"
  ],
  cup: [
    "........kk......",
    ".......kgk......",
    "......kgk.......",
    "....kkgkkkkk....",
    "...kmmgmmmmmk...",
    "...kkkkkkkkkk...",
    "....kAAAAAAk....",
    "....kAAAAAAk....",
    "....kaAAAAak....",
    "....kaaaaaak....",
    "....kakakaak....",
    ".....kaaaak.....",
    ".....kkaakk.....",
    ".....kkkkkk.....",
    "................",
    "................"
  ],
  lantern: [
    "................",
    ".......kk.......",
    "......kgGk......",
    ".....kkkkkk.....",
    "....kggggggk....",
    "....kkkkkkkk....",
    ".....kfffAk.....",
    ".....kfAAAk.....",
    ".....kfAgAk.....",
    ".....kfAAAk.....",
    ".....kAAAAk.....",
    "....kkkkkkkk....",
    "....kggggggk....",
    ".....kkkkkk.....",
    "................",
    "................"
  ]
};

/* ---------- 把字串圖做成小畫布（快取） ---------- */
const cache = new Map();
export function sprite(rows, key) {
  if (key && cache.has(key)) return cache.get(key);
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d");
  rows.forEach((r, y) => [...r].forEach((ch, i) => { const col = PAL[ch]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }));
  if (key) cache.set(key, c);
  return c;
}
// 畫布版本的鏡像（左右翻）
export function flipped(cv, key) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height;
  const x = c.getContext("2d"); x.translate(cv.width, 0); x.scale(-1, 1); x.drawImage(cv, 0, 0);
  cache.set(key, c); return c;
}
