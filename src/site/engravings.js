// 微光博物館｜銅版線稿
// 每件展品一張燙金細線的雕版畫：輪廓線＋排線陰影＋點描，光從左上來，陰影排線在右下。
// 總覽的藏品海報、說明牌的聚光燈台座都用這一張（使用者選的 A 海報＋B 線稿）。
// 畫布 0 0 160 200，物件底部落在 y≈186（台座上）。key 跟 objects.js 的物件名稱一樣。

const C = "#ecd59e";   // 主線：淡金
// 排線、點描的圖樣；u 是 id 字尾，同一頁有很多張圖不會互相打架
function defs(u) {
  const hatch = (id, rot, gap, w = .5, op = .9) =>
    `<pattern id="${id}${u}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${rot})"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${C}" stroke-width="${w}" opacity="${op}"/></pattern>`;
  return `<defs>
    ${hatch("h", 38, 2.4)}${hatch("hx", -38, 2.4)}${hatch("hl", 38, 3.6, .4, .7)}${hatch("hh", 90, 2.2, .45, .8)}
    <pattern id="dt${u}" patternUnits="userSpaceOnUse" width="3" height="3"><circle cx=".8" cy=".8" r=".42" fill="${C}"/><circle cx="2.3" cy="2.2" r=".32" fill="${C}" opacity=".8"/></pattern>
  </defs>`;
}
// 常用：輪廓（粗）、細部（細）、陰影（排線填色、不描邊）
const line = (d, w = 1.15) => `<path d="${d}" fill="none" stroke="${C}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const thin = d => line(d, .6);
const shade = (d, u, p = "h") => `<path d="${d}" fill="url(#${p}${u})" stroke="none"/>`;
const ground = (u, cx = 80, rx = 52) =>
  shade(`M${cx - rx} 188 A${rx} 6 0 0 0 ${cx + rx} 188 A${rx} 6 0 0 0 ${cx - rx} 188 Z`, u, "hh");
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
// 排線明暗：在一個形狀裡畫平行線，越往陰影那一側線越粗（像銅版畫的「漸層排線」）
// box＝[x0,y0,x1,y1]；ang＝線的方向（0＝直線、90＝橫線）；dir＝陰影在哪個方向；from＝從哪裡開始變暗（0～1）
let clipN = 0;
function tone(u, d, box, { ang = 0, gap = 2.1, dir = [1, .4], from = .3, max = .78, min = 0 } = {}) {
  const id = `cp${u}_${++clipN}`, a = ang * Math.PI / 180;
  const L = [Math.sin(a), Math.cos(a)], N = [Math.cos(a), -Math.sin(a)];
  const [x0, y0, x1, y1] = box, pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
  const pn = pts.map(p => p[0] * N[0] + p[1] * N[1]), pl = pts.map(p => p[0] * L[0] + p[1] * L[1]);
  const n0 = Math.min(...pn), n1 = Math.max(...pn), m0 = Math.min(...pl), m1 = Math.max(...pl);
  const flip = N[0] * dir[0] + N[1] * dir[1] < 0;
  let out = "";
  for (let n = n0 + gap / 2; n < n1; n += gap) {
    let t = (n - n0) / (n1 - n0); if (flip) t = 1 - t;
    const w = min + (max - min) * Math.max(0, Math.min(1, (t - from) / (1 - from)));
    if (w < .07) continue;
    const ax = N[0] * n + L[0] * m0, ay = N[1] * n + L[1] * m0, bx = N[0] * n + L[0] * m1, by = N[1] * n + L[1] * m1;
    out += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke-width="${w.toFixed(2)}"/>`;
  }
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})" stroke="${C}" opacity=".92">${out}</g>`;
}
// 車木柱：一節一節鼓起來的柱子（沙漏的柱、欄杆）
function spindle(u, x, y0, y1, n = 4) {
  const seg = (y1 - y0) / n; let l = `M${x - 2.6} ${y0}`, r = `M${x + 2.6} ${y0}`;
  for (let i = 0; i < n; i++) {
    const a = y0 + i * seg, m = a + seg / 2, b = a + seg;
    l += ` L${x - 2.6} ${m - 6} C${x - 6.5} ${m - 5} ${x - 6.5} ${m + 5} ${x - 2.6} ${m + 6} L${x - 2.6} ${b}`;
    r += ` L${x + 2.6} ${m - 6} C${x + 6.5} ${m - 5} ${x + 6.5} ${m + 5} ${x + 2.6} ${m + 6} L${x + 2.6} ${b}`;
  }
  // 陰影：右半邊
  const shapeR = `M${x} ${y0} L` + r.slice(1) + ` L${x} ${y1} Z`;
  return line(l, .9) + line(r, .9) + tone(u, shapeR, [x - 7, y0, x + 7, y1], { from: .45, max: .8 })
    + range(n + 1, i => thin(`M${x - 4} ${y0 + i * seg} L${x + 4} ${y0 + i * seg}`));
}

const circ = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0 Z`;

export const ENGRAVINGS = {
  // 老師，在嗎？——一具老式燭台電話：聽筒掛在一側，電話線捲捲的
  phone: u => {
    const dome = "M46 178 C48 166 64 158 80 156 C96 158 112 166 114 178 A34 6 0 0 1 46 178 Z";
    const stem = "M75 156 L75 70 L85 70 L85 156 Z", rec = "M48 84 L60 84 L60 120 L48 120 Z", cup = "M44 120 L64 120 C64 132 58 137 54 137 C50 137 44 132 44 120 Z";
    return `${ground(u, 84, 50)}
    ${tone(u, dome, [44, 154, 116, 186], { ang: -12, dir: [1, .5], from: .25 })}
    ${line(dome)}${thin("M54 172 C60 166 70 162 80 161")}
    ${line("M42 180 A38 7 0 0 0 118 180")}
    ${tone(u, stem, [74, 70, 86, 156], { gap: 1.8, from: .4, max: .85 })}${line(stem)}
    ${line(ell(80, 150, 9, 2.6), .9)}${line(ell(80, 104, 9, 2.6), .9)}
    ${tone(u, "M70 70 L90 70 L94 60 L66 60 Z", [66, 60, 94, 70], { gap: 1.6, from: .35 })}${line("M70 70 L90 70 L94 60 L66 60 Z")}
    ${line("M76 60 L76 55 L84 55 L84 60", .9)}
    ${tone(u, circ(80, 36, 19), [61, 17, 99, 55], { ang: 50, from: .45, max: .85 })}
    ${line(circ(80, 36, 19))}${line(circ(80, 36, 15.5), .6)}
    ${line(circ(80, 36, 10), .8)}${tone(u, circ(80, 36, 10), [70, 26, 90, 46], { ang: 0, gap: 1.5, dir: [-1, -.4], from: 0, min: .25, max: .7 })}
    ${line(circ(80, 36, 3.5), .7)}
    ${line("M75 92 L60 92", .9)}${line("M75 96 L60 96", .6)}${line("M60 92 L60 84", .9)}
    ${tone(u, rec, [48, 84, 60, 120], { gap: 1.8, from: .35 })}${line(rec)}
    ${tone(u, cup, [44, 120, 64, 137], { gap: 1.7, from: .25, max: .9 })}${line(cup)}
    ${line(ell(54, 120, 10, 2.2), .7)}
    ${line("M50 84 C46 80 46 76 50 74 C53 73 55 76 54 78", .7)}
    ${line("M54 137 C54 147 40 146 42 154 C44 162 58 158 58 166 C58 172 52 174 54 179", .9)}
    ${thin("M53 138 C53 147 39 146 41 154 C43 161 57 158 57 166")}`;
  },

  // 每月收支體檢——兩根車木柱的沙漏，上面的沙快漏完了
  hourglass: u => {
    const topRim = "M34 30 L34 38 A46 9 0 0 0 126 38 L126 30 A46 9 0 0 1 34 30 Z", botRim = "M34 172 L34 180 A46 9 0 0 0 126 180 L126 172 A46 9 0 0 1 34 172 Z";
    const glass = "M58 41 C58 72 76 92 78 105 C76 118 58 138 58 168 L102 168 C102 138 84 118 82 105 C84 92 102 72 102 41 Z";
    const sandT = "M63 74 C70 76 90 76 97 74 C92 86 84 96 80 104 C76 96 68 86 63 74 Z", sandB = "M60 168 C64 150 74 146 80 145 C86 146 96 150 100 168 Z";
    return `${ground(u)}
    ${tone(u, topRim, [34, 30, 126, 48], { gap: 1.8, from: .2, max: .9 })}${line(topRim)}
    ${line(ell(80, 30, 46, 9))}${tone(u, ell(80, 30, 46, 9), [34, 21, 126, 39], { ang: 90, gap: 2.4, dir: [0, -1], from: .55, max: .5 })}
    ${tone(u, botRim, [34, 172, 126, 190], { gap: 1.8, from: .2, max: .9 })}${line(botRim)}${line(ell(80, 172, 46, 9))}
    ${spindle(u, 42, 47, 163)}${spindle(u, 118, 47, 163)}
    ${tone(u, glass, [58, 41, 102, 168], { gap: 2.2, from: .72, max: .55 })}
    ${tone(u, sandT, [62, 73, 98, 105], { ang: 0, gap: 1.4, from: 0, min: .3, max: .75 })}
    ${tone(u, sandB, [60, 144, 100, 168], { ang: 0, gap: 1.4, from: 0, min: .3, max: .8 })}
    ${line("M58 41 C58 72 76 92 78 105 C76 118 58 138 58 168")}${line("M102 41 C102 72 84 92 82 105 C84 118 102 138 102 168")}
    ${thin("M63 74 C70 76 90 76 97 74")}${thin("M60 168 C64 150 74 146 80 145 C86 146 96 150 100 168")}
    ${line("M80 105 L80 145", .5)}
    ${line("M64 52 C64 66 70 77 74 85", .9)}${line("M64 158 C64 146 69 134 73 126", .9)}`;
  },

  // 趣味教師人格測驗——一張威尼斯半臉面具，插著羽毛，旁邊一根握柄
  mask: u => {
    const face = "M24 82 C22 60 50 50 80 62 C110 50 138 60 136 82 C134 102 114 114 98 110 C90 108 86 98 80 98 C74 98 70 108 62 110 C46 114 26 102 24 82 Z";
    const eyeL = "M42 80 C48 70 64 70 70 82 C62 90 48 90 42 80 Z", eyeR = "M90 82 C96 70 112 70 118 80 C112 90 98 90 90 82 Z";
    const stick = "M124 104 L128 104 L138 186 L134 186 Z";
    const f1 = "M40 62 C30 40 34 18 52 8 C50 26 50 44 56 58 Z", f2 = "M50 60 C48 40 58 26 76 22 C68 34 64 48 64 58 Z";
    return `${ground(u, 98, 40)}
    ${tone(u, stick, [124, 104, 138, 186], { gap: 1.4, from: .3, max: .9 })}${line(stick, 1)}
    ${tone(u, f1, [30, 8, 56, 62], { ang: 30, gap: 2.1, from: .35, max: .7 })}${line(f1, 1)}${thin("M40 62 C40 42 44 24 52 8")}
    ${tone(u, f2, [48, 22, 76, 60], { ang: 30, gap: 2.1, from: .35, max: .7 })}${line(f2, 1)}${thin("M50 60 C54 44 62 32 76 22")}
    ${tone(u, face + " " + eyeL + " " + eyeR, [22, 50, 138, 114], { ang: 28, gap: 2, dir: [1, 1], from: .22, max: .9 })}
    <path d="${eyeL} ${eyeR}" fill="#0b1630"/>
    ${line(face)}${line(eyeL)}${line(eyeR)}
    ${thin("M30 82 C30 66 52 58 80 68 C108 58 130 66 130 82")}
    ${thin("M80 62 C78 72 78 84 80 90")}
    ${range(9, i => `<circle cx="${33 + i * 3.4}" cy="${(97 + Math.sin(i / 8 * Math.PI) * 6).toFixed(1)}" r=".95" fill="${C}"/>`)}
    ${range(9, i => `<circle cx="${100 + i * 3.4}" cy="${(103 - Math.sin(i / 8 * Math.PI) * 6).toFixed(1)}" r=".95" fill="${C}"/>`)}
    ${line("M80 62 C74 52 70 46 74 40 C78 46 80 52 80 62 Z", .9)}
    ${line(circ(80, 66, 2.2), .8)}`;
  }
,

  // 離職，不殉職——一只老師的皮革公事包，把手上掛著一張空白的名牌
  pixel: u => {
    const body = "M28 112 C28 104 32 100 40 100 L120 100 C128 100 132 104 132 112 L132 172 C132 178 128 182 122 182 L38 182 C32 182 28 178 28 172 Z";
    const flap = "M28 112 C28 104 32 100 40 100 L120 100 C128 100 132 104 132 112 L132 128 C116 138 98 142 80 142 C62 142 44 138 28 128 Z";
    return `${ground(u, 82, 58)}
    ${tone(u, body, [28, 100, 132, 182], { ang: 0, gap: 1.9, dir: [1, .6], from: .45, max: .85 })}
    ${tone(u, "M28 130 C44 140 62 144 80 144 C98 144 116 140 132 130 L132 150 L28 150 Z", [28, 130, 132, 150], { ang: 90, gap: 1.6, dir: [0, -1], from: 0, min: .25, max: .7 })}
    ${line(body)}${line(flap)}
    ${thin("M32 116 C32 110 36 106 42 106 L118 106 C124 106 128 110 128 116")}
    ${thin("M32 174 L128 174")}
    ${[56, 104].map(x => `${line(`M${x - 6} 100 L${x - 6} 152 M${x + 6} 100 L${x + 6} 152`, .9)}${line(`M${x - 8} 136 L${x + 8} 136 L${x + 8} 148 L${x - 8} 148 Z`, 1)}${thin(`M${x} 136 L${x} 148`)}${tone(u, `M${x} 100 L${x + 6} 100 L${x + 6} 152 L${x} 152 Z`, [x, 100, x + 6, 152], { gap: 1.5, from: .2 })}`).join("")}
    ${line("M60 100 C60 78 66 72 80 72 C94 72 100 78 100 100", 1.3)}${line("M66 100 C66 84 70 79 80 79 C90 79 94 84 94 100", .7)}
    ${tone(u, "M94 100 C94 84 90 79 80 79 L80 72 C94 72 100 78 100 100 Z", [80, 72, 100, 100], { gap: 1.4, from: 0, min: .3 })}
    ${line("M66 88 C56 90 50 96 48 104", .6)}
    ${line("M36 102 L50 96 L56 112 L42 118 Z", .9)}${line(circ(43.5, 104, 1.6), .6)}${thin("M44 110 L52 107 M46 114 L53 111")}`;
  },

  // 文字無限流——一台老打字機，紙捲在滾筒上，最後一行還沒打完
  typewriter: u => {
    const deck = "M40 120 L120 120 L132 152 L28 152 Z", front = "M28 152 L132 152 L136 176 L24 176 Z";
    const platen = "M38 98 L122 98 L122 112 L38 112 Z", paper = "M54 100 L57 34 L105 34 L104 100 Z";
    const keys = range(3, r => range(9 - r, c => line(circ(46 + r * 4 + c * 9.6 - (r ? 0 : 0), 128 + r * 8, 2.9), .7))).replace(/\n/g, "");
    return `${ground(u, 80, 60)}
    ${tone(u, paper, [54, 34, 106, 100], { ang: 0, gap: 2.4, from: .78, max: .45 })}${line(paper)}
    ${range(7, i => thin(`M62 ${46 + i * 7} L${i === 6 ? 80 : 97 - (i % 3) * 4} ${46 + i * 7}`))}
    ${tone(u, deck, [28, 120, 132, 152], { ang: 0, gap: 2, dir: [1, .5], from: .5, max: .7 })}${line(deck)}
    ${keys}
    ${tone(u, front, [24, 152, 136, 176], { ang: 0, gap: 1.7, from: .1, min: .2, max: .85 })}${line(front)}
    ${line("M52 160 L108 160 L106 166 L54 166 Z", .8)}
    ${tone(u, platen, [38, 98, 122, 112], { ang: 90, gap: 1.6, dir: [0, 1], from: .1, min: .15, max: .85 })}${line(platen)}
    ${line(ell(38, 105, 3, 7), .9)}${line(circ(31, 105, 5.5))}${line(circ(129, 105, 5.5))}
    ${tone(u, circ(129, 105, 5.5), [123, 99, 135, 111], { gap: 1.3, from: .2 })}
    ${line("M40 112 L40 120 M120 112 L120 120", .9)}
    ${line("M124 98 C130 90 138 88 146 90", 1.1)}${line(circ(147, 90, 2.4), .8)}
    ${thin("M70 112 L90 112 L88 118 L72 118 Z")}`;
  },

  // 教師薪資試算——一卷攤開的薪資卷軸，上下兩根軸，角落蓋了一顆章
  scroll: u => {
    const sheet = "M40 34 L120 34 L120 156 C112 152 48 152 40 156 Z", roll = "M38 156 C46 150 114 150 122 156 L122 168 C114 162 46 162 38 168 Z";
    return `${ground(u, 80, 54)}
    ${tone(u, sheet, [40, 34, 120, 158], { ang: 0, gap: 2.2, from: .7, max: .55 })}${line(sheet)}
    ${line("M48 46 L112 46", .9)}${thin("M48 50 L112 50")}
    ${range(8, i => thin(`M48 ${62 + i * 9} L${66 + (i * 7) % 14} ${62 + i * 9} M86 ${62 + i * 9} L112 ${62 + i * 9}`))}
    ${range(8, i => `<circle cx="${110 - (i % 3) * 4}" cy="${60 + i * 9}" r=".7" fill="${C}"/>`)}
    ${line("M92 128 L110 128 L110 146 L92 146 Z", .9)}${tone(u, "M92 128 L110 128 L110 146 L92 146 Z", [92, 128, 110, 146], { ang: 45, gap: 1.4, from: 0, min: .35, max: .6 })}
    ${thin("M96 132 L106 142 M106 132 L96 142")}
    ${tone(u, roll, [38, 150, 122, 168], { ang: 90, gap: 1.5, dir: [0, 1], from: 0, min: .2, max: .85 })}${line(roll)}
    ${line(ell(38, 162, 3.5, 6), .9)}${line(ell(122, 162, 3.5, 6), .9)}
    ${line("M30 24 L130 24 L130 34 L30 34 Z")}
    ${tone(u, "M30 24 L130 24 L130 34 L30 34 Z", [30, 24, 130, 34], { ang: 90, gap: 1.5, dir: [0, 1], from: .1, min: .15, max: .8 })}
    ${line(circ(26, 29, 5))}${line(circ(134, 29, 5))}${line(circ(28, 165, 4.5))}${line(circ(132, 165, 4.5))}
    ${tone(u, circ(134, 29, 5), [128, 23, 140, 35], { gap: 1.3, from: .2 })}${tone(u, circ(132, 165, 4.5), [127, 160, 137, 170], { gap: 1.3, from: .2 })}`;
  },

  // 教師退休金試算——一只懷錶，錶鏈垂下來，秒針還在走
  clock: u => {
    const cx = 82, cy = 116;
    const ticks = range(60, i => { const a = i / 60 * Math.PI * 2, r1 = i % 5 ? 32 : 29;
      return thin(`M${(cx + Math.sin(a) * r1).toFixed(1)} ${(cy - Math.cos(a) * r1).toFixed(1)} L${(cx + Math.sin(a) * 34).toFixed(1)} ${(cy - Math.cos(a) * 34).toFixed(1)}`); });
    return `${ground(u, 84, 48)}
    ${line("M64 70 C40 86 30 120 36 150 C40 170 52 180 60 186", .9)}
    
    ${range(12, i => { const t = i / 11, x = (1 - t) ** 3 * 64 + 3 * (1 - t) ** 2 * t * 40 + 3 * (1 - t) * t * t * 30 + t ** 3 * 36, y = (1 - t) ** 3 * 70 + 3 * (1 - t) ** 2 * t * 86 + 3 * (1 - t) * t * t * 120 + t ** 3 * 150;
      return line(ell(x, y, 2.6, 1.6), .7); })}
    ${tone(u, circ(cx, cy, 44), [38, 72, 126, 160], { ang: 40, gap: 1.9, dir: [1, 1], from: .62, max: .9 })}
    ${line(circ(cx, cy, 44), 1.3)}${line(circ(cx, cy, 39), .7)}
    ${line(circ(cx, cy, 35), .8)}${ticks}
    ${line(`M${cx} 72 L${cx} 66`, 1)}${line("M76 66 L88 66 L88 58 L76 58 Z")}${tone(u, "M82 58 L88 58 L88 66 L82 66 Z", [82, 58, 88, 66], { gap: 1.2, from: 0, min: .3 })}
    ${range(4, i => thin(`M${77.5 + i * 3} 58 L${77.5 + i * 3} 66`))}
    ${line("M70 58 C70 44 94 44 94 58", 1.2)}${line("M73 58 C73 48 91 48 91 58", .6)}
    ${line(circ(cx, cy + 16, 7), .7)}${thin(`M${cx} ${cy + 16} L${cx + 4} ${cy + 12}`)}
    ${line(`M${cx} ${cy} L${cx} ${cy - 24}`, 1.4)}${line(`M${cx} ${cy} L${cx + 15} ${cy + 6}`, 1.1)}
    ${line(circ(cx, cy, 2.2), 1)}`;
  },

  // 教師理財試算器——一隻存錢小豬，背上的投幣孔正接住一枚硬幣
  piggy: u => {
    const body = "M34 128 C34 104 56 90 82 90 C108 90 126 104 128 120 L136 118 C140 118 142 122 142 128 C142 134 140 138 136 138 L128 136 C124 154 106 166 82 166 C56 166 34 152 34 128 Z";
    return `${ground(u, 84, 54)}
    ${[[48, 156], [62, 160], [100, 160], [114, 156]].map(([x, y]) => `${tone(u, `M${x - 6} ${y} L${x + 6} ${y} L${x + 6} ${y + 24} L${x - 6} ${y + 24} Z`, [x - 6, y, x + 6, y + 24], { gap: 1.4, from: .2 })}${line(`M${x - 6} ${y} L${x - 6} ${y + 22} A6 2.4 0 0 0 ${x + 6} ${y + 22} L${x + 6} ${y}`)}`).join("")}
    ${tone(u, body, [34, 90, 142, 166], { ang: 30, gap: 2, dir: [.6, 1], from: .42, max: .9 })}
    ${line(body)}
    ${thin("M44 118 C50 104 64 96 80 96")}
    ${line(ell(139, 128, 3.2, 10), .9)}${line(circ(138.5, 124, 1.2), .7)}${line(circ(138.5, 132, 1.2), .7)}
    ${line("M104 96 L112 78 L120 102", 1)}${tone(u, "M104 96 L112 78 L120 102 Z", [104, 78, 120, 102], { gap: 1.5, from: .3 })}
    ${`<circle cx="116" cy="114" r="2.4" fill="${C}"/>`}${thin("M112 110 C114 108 118 108 120 110")}
    ${line("M34 122 C26 120 22 114 26 110 C30 106 34 112 30 116", .9)}
    ${line("M68 92 L92 92", 1.4)}${line(ell(80, 92, 13, 2.4), .7)}
    ${line(ell(80, 66, 12, 4), 1)}${line("M68 66 L68 70 A12 4 0 0 0 92 70 L92 66", 1)}
    ${tone(u, "M80 70 A12 4 0 0 0 92 70 L92 66 A12 4 0 0 1 80 70 Z", [80, 66, 92, 74], { gap: 1.2, from: 0, min: .3 })}
    ${thin("M80 63 L80 69")}${thin("M77 66 L83 66")}
    ${thin("M72 82 L72 76 M80 84 L80 78 M88 82 L88 76")}`;
  },

  // 財務資產總覽——一座黃銅天秤，左邊的盤子放著一疊硬幣，比較重
  scale: u => {
    const pan = (x, y) => `M${x - 22} ${y} C${x - 18} ${y + 14} ${x + 18} ${y + 14} ${x + 22} ${y} Z`;
    return `${ground(u, 80, 56)}
    ${line(ell(80, 178, 34, 6))}${line("M46 178 L46 184 A34 6 0 0 0 114 184 L114 178")}
    ${tone(u, "M80 184 L114 178 L114 184 A34 6 0 0 1 80 190 Z", [80, 178, 114, 190], { gap: 1.5, from: 0, min: .2 })}
    ${line("M62 176 C66 168 72 166 76 164 L84 164 C88 166 94 168 98 176", 1)}
    ${line("M76 164 L76 48 M84 164 L84 48")}${tone(u, "M80 164 L84 164 L84 48 L80 48 Z", [80, 48, 84, 164], { gap: 1.3, from: 0, min: .3 })}
    ${line(ell(80, 120, 7, 2.4), .9)}${line(ell(80, 80, 7, 2.4), .9)}
    ${line(circ(80, 40, 7))}${line("M80 33 L80 24", .9)}${line(circ(80, 22, 2.6), .9)}
    ${tone(u, circ(80, 40, 7), [73, 33, 87, 47], { gap: 1.3, from: .3 })}
    ${line("M22 50 L138 38", 1.6)}${line("M22 54 L138 42", .6)}
    ${line(circ(22, 52, 3))}${line(circ(138, 40, 3))}
    ${line("M22 55 L4 118 M22 55 L40 118 M22 55 L22 118", .55)}
    ${line("M138 43 L120 104 M138 43 L156 104 M138 43 L138 104", .55)}
    ${tone(u, pan(22, 118), [0, 118, 44, 130], { ang: 90, gap: 1.5, dir: [0, 1], from: 0, min: .2, max: .8 })}${line(pan(22, 118))}${line(ell(22, 118, 22, 3), .8)}
    ${tone(u, pan(138, 104), [116, 104, 160, 116], { ang: 90, gap: 1.5, dir: [0, 1], from: 0, min: .2, max: .8 })}${line(pan(138, 104))}${line(ell(138, 104, 22, 3), .8)}
    ${range(4, i => `${line(ell(22, 114 - i * 4, 8, 2.2), .8)}${line(`M14 ${114 - i * 4} L14 ${117 - i * 4} M30 ${114 - i * 4} L30 ${117 - i * 4}`, .7)}`)}`;
  },

  // 人格測驗結果剖析——一把放大鏡，壓在攤開的報告上，鏡片底下的字變大了
  magnifier: u => {
    const pageL = "M16 160 C40 152 64 152 80 160 L80 186 C64 178 40 178 16 186 Z", pageR = "M80 160 C96 152 120 152 144 160 L144 186 C120 178 96 178 80 186 Z";
    return `${ground(u, 80, 66)}
    ${tone(u, pageR, [80, 152, 144, 186], { ang: -10, gap: 2.2, from: .45, max: .6 })}${line(pageL)}${line(pageR)}
    ${range(3, i => thin(`M24 ${166 + i * 5} C40 ${161 + i * 5} 60 ${161 + i * 5} 74 ${166 + i * 5} M86 ${166 + i * 5} C100 ${161 + i * 5} 118 ${161 + i * 5} 136 ${166 + i * 5}`))}
    ${line("M100 126 L108 120 L140 166 L130 172 Z", 1)}${tone(u, "M104 123 L108 120 L140 166 L135 169 Z", [100, 120, 140, 172], { ang: -34, gap: 1.4, from: 0, min: .3 })}
    ${line("M96 122 L104 116 L110 124 L102 130 Z", .9)}${range(3, i => thin(`M${100 + i * 2.2} ${119 - i * 1.6} L${106 + i * 2.2} ${127 - i * 1.6}`))}
    ${line(circ(72, 94, 38), 1.5)}${line(circ(72, 94, 33), .8)}
    ${tone(u, `M72 56 A38 38 0 0 1 72 132 A33 33 0 0 0 72 61 Z`, [72, 56, 110, 132], { ang: 40, gap: 1.5, from: 0, min: .25, max: .8 })}
    ${range(4, i => line(`M${50 + (i % 2) * 4} ${80 + i * 10} L${92 - (i % 3) * 6} ${80 + i * 10}`, 1))}
    ${line("M50 74 C54 66 62 62 70 61", .9)}${thin("M48 84 C48 80 49 77 50 75")}`;
  },

  // 教師轉職探索測驗——一只黃銅羅盤，指針還在找方向
  compass: u => {
    const cx = 80, cy = 132;
    const star = range(8, i => { const a = i / 8 * Math.PI * 2, r = i % 2 ? 16 : 30, a1 = a - Math.PI / 8, a2 = a + Math.PI / 8;
      const P = (ang, rr) => `${(cx + Math.sin(ang) * rr).toFixed(1)} ${(cy - Math.cos(ang) * rr * .62).toFixed(1)}`;
      return `${line(`M${P(a1, 6)} L${P(a, r)} L${P(a2, 6)}`, i % 2 ? .6 : .8)}${i % 2 ? "" : tone(u, `M${cx} ${cy} L${P(a, r)} L${P(a2, 6)} Z`, [cx - 32, cy - 22, cx + 32, cy + 22], { gap: 1.2, from: 0, min: .35, max: .5 })}`; });
    return `${ground(u, 80, 58)}
    ${line(`M${cx - 54} ${cy} L${cx - 54} ${cy + 12} A54 33 0 0 0 ${cx + 54} ${cy + 12} L${cx + 54} ${cy}`)}
    ${tone(u, `M${cx - 54} ${cy} L${cx - 54} ${cy + 12} A54 33 0 0 0 ${cx + 54} ${cy + 12} L${cx + 54} ${cy} A54 33 0 0 1 ${cx - 54} ${cy} Z`, [cx - 54, cy, cx + 54, cy + 46], { gap: 1.7, from: .15, min: .15, max: .85 })}
    ${line(ell(cx, cy, 54, 33))}${line(ell(cx, cy, 47, 28.5), .8)}${line(ell(cx, cy, 41, 25), .5)}
    ${range(32, i => { const a = i / 32 * Math.PI * 2; return thin(`M${(cx + Math.sin(a) * 41).toFixed(1)} ${(cy - Math.cos(a) * 25).toFixed(1)} L${(cx + Math.sin(a) * (i % 4 ? 44 : 46.5)).toFixed(1)} ${(cy - Math.cos(a) * (i % 4 ? 26.8 : 28.2)).toFixed(1)}`); })}
    ${star}
    ${line(`M${cx - 26} ${cy + 8} L${cx + 26} ${cy - 8}`, 1.6)}${line(circ(cx, cy, 3), 1)}
    ${line(`M${cx - 5} ${cy - 33} L${cx - 5} ${cy - 40} L${cx + 5} ${cy - 40} L${cx + 5} ${cy - 33}`, .9)}
    ${line(ell(cx, cy - 50, 9, 11), 1.2)}${line(ell(cx, cy - 50, 6, 8), .6)}
    ${tone(u, ell(cx, cy - 50, 9, 11), [cx - 9, cy - 61, cx + 9, cy - 39], { gap: 1.3, from: .55, max: .8 })}
    <text x="${cx}" y="${cy - 19}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="7" fill="${C}">N</text>
`;
  },

  // 教師工作負荷調查——一疊用麻繩捆起來的作業簿，高到快要倒了
  timeclock: u => {
    const books = [[34, 168, 92, 14, 0], [40, 152, 86, 14, -2], [30, 136, 94, 14, 3], [42, 120, 84, 14, -1], [36, 104, 88, 14, 2], [46, 88, 80, 14, 0]];
    return `${ground(u, 80, 56)}
    ${books.map(([x, y, w, h, dx]) => {
      const top = `M${x + dx} ${y} L${x + w + dx} ${y} L${x + w + dx + 10} ${y - 8} L${x + dx + 10} ${y - 8} Z`, front = `M${x + dx} ${y} L${x + w + dx} ${y} L${x + w + dx} ${y + h} L${x + dx} ${y + h} Z`, side = `M${x + w + dx} ${y} L${x + w + dx + 10} ${y - 8} L${x + w + dx + 10} ${y + h - 8} L${x + w + dx} ${y + h} Z`;
      return `${tone(u, front, [x + dx, y, x + w + dx, y + h], { gap: 2, from: .55, max: .6 })}${tone(u, side, [x + w + dx, y - 8, x + w + dx + 10, y + h], { gap: 1.3, from: 0, min: .4, max: .8 })}${line(front, 1)}${line(side, 1)}${line(top, .8)}${range(3, i => thin(`M${x + dx + 2} ${y + 4 + i * 3.4} L${x + w + dx - 2} ${y + 4 + i * 3.4}`))}`;
    }).reverse().join("")}
    ${line("M86 80 L86 182", .9)}${line("M88 80 L88 182", .5)}
    ${line("M86 80 C78 70 70 72 72 78 C74 84 84 82 86 80 C90 72 102 70 100 78 C98 84 90 82 86 80", .9)}
    ${line("M86 80 L80 94 M88 80 L96 92", .7)}
    ${line("M56 82 L80 82 L80 90 L56 90 Z", .7)}`;
  },

  // 辦公室飲料隨機生成器——一杯封膜的手搖飲，粗吸管斜斜插著，杯底一層珍珠
  cup: u => {
    const cupD = "M52 66 L108 66 L100 182 L60 182 Z";
    return `${ground(u, 80, 40)}
    ${tone(u, "M53 92 L107 92 L100 182 L60 182 Z", [52, 92, 108, 182], { ang: 0, gap: 1.8, from: .45, max: .75 })}
    ${line("M54 92 L106 92", .7)}${thin("M55 98 C66 96 94 96 105 98")}
    ${range(14, i => { const r = Math.floor(i / 5), c = i % 5; return line(circ(65 + c * 7.4 + (r % 2) * 3.4, 175 - r * 6.4, 3), .7); })}
    ${tone(u, "M60 120 L100 120 L99 140 L61 140 Z", [60, 120, 100, 140], { ang: 0, gap: 2.4, from: 0, min: .15, max: .35 })}
    ${line("M60 120 L100 120 M61 140 L99 140", .8)}
    ${line(cupD, 1.2)}
    ${line(ell(80, 66, 28, 6))}${tone(u, ell(80, 66, 28, 6), [52, 60, 108, 72], { ang: 90, gap: 1.6, dir: [0, 1], from: .4, max: .5 })}
    ${line("M86 70 L104 14 L113 17 L95 72", 1.1)}${tone(u, "M90 71 L108.5 15.5 L113 17 L95 72 Z", [86, 14, 113, 72], { ang: 18, gap: 1.3, from: 0, min: .35 })}
    ${line(ell(108.5, 15.5, 4.6, 1.6), .8)}
    ${thin("M58 76 L56 108")}${thin("M62 78 L61 90")}
    ${range(5, i => `<circle cx="${70 + (i * 13) % 26}" cy="${104 + i * 9}" r=".9" fill="${C}"/>`)}`;
  }
};

let seq = 0;
export const hasEngraving = key => key in ENGRAVINGS;
export function engravingSVG(key, cls = "") {
  const f = ENGRAVINGS[key]; if (!f) return "";
  const u = "g" + (++seq);
  return `<svg class="engr ${cls}" viewBox="0 0 160 200" aria-hidden="true" focusable="false">${defs(u)}${f(u)}</svg>`;
}
