// 微光博物館｜物件圖庫
// 每件展品的立體擺件都從這裡選：象牙瓷＋黃銅的材質，放在櫥窗裡打光。
// 畫布 0 0 120 120，物件底部落在 y≈108（櫥窗的展台）。前台與建置（檢查物件名稱）共用。

const L = 'stroke="rgba(64,46,20,.42)" stroke-width=".8"';
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");
const ticks = (cx, cy, r1, r2, n, w = 1.2, c = "rgba(52,38,18,.7)") => range(n, i => {
  const a = i / n * Math.PI * 2;
  return `<line x1="${(cx + Math.sin(a) * r1).toFixed(2)}" y1="${(cy - Math.cos(a) * r1).toFixed(2)}" x2="${(cx + Math.sin(a) * r2).toFixed(2)}" y2="${(cy - Math.cos(a) * r2).toFixed(2)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
});

// 每個物件：name＝後台顯示的名字；draw(u)＝SVG 內容，u 是漸層 id 的字尾
export const OBJECTS = {
  clock: { name: "時鐘", draw: u => `
    <path d="M30 34 A13 13 0 0 1 48 22" fill="none" stroke="url(#br${u})" stroke-width="7" stroke-linecap="round"/>
    <path d="M90 34 A13 13 0 0 0 72 22" fill="none" stroke="url(#br${u})" stroke-width="7" stroke-linecap="round"/>
    <rect x="57" y="16" width="6" height="10" rx="2" fill="url(#br${u})"/>
    <path d="M38 96 L32 108 M82 96 L88 108" stroke="url(#br${u})" stroke-width="5" stroke-linecap="round"/>
    <circle cx="60" cy="64" r="37" fill="url(#br${u})"/>
    <circle cx="60" cy="64" r="31" fill="url(#iv${u})" ${L}/>
    ${ticks(60, 64, 26, 29, 12, 1.6)}${ticks(60, 64, 28, 29, 60, .5, "rgba(52,38,18,.35)")}
    <circle cx="35.4" cy="49.8" r="2.4" fill="#b0503c"/><circle cx="84.6" cy="49.8" r="2.4" fill="#b0503c"/>
    <line x1="60" y1="64" x2="60" y2="45" stroke="#2b2216" stroke-width="2.6" stroke-linecap="round"/>
    <line x1="60" y1="64" x2="75" y2="71" stroke="#2b2216" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="60" cy="64" r="3" fill="url(#br${u})"/>` },

  hourglass: { name: "沙漏", draw: u => `
    <path d="M40 24 C40 48 56 52 56 60 C56 68 40 72 40 96 L80 96 C80 72 64 68 64 60 C64 52 80 48 80 24 Z" fill="url(#gl${u})" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    <path d="M47 40 Q60 48 59.4 58 L60.6 58 Q60 48 73 40 Z" fill="url(#sd${u})"/>
    <line x1="60" y1="58" x2="60" y2="90" stroke="#d9b468" stroke-width="1" opacity=".8"/>
    <path d="M42 96 Q60 72 78 96 Z" fill="url(#sd${u})"/>
    <path d="M45 28 C45 44 54 50 55 56" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="34" y="24" width="4" height="72" rx="2" fill="url(#br${u})"/><rect x="82" y="24" width="4" height="72" rx="2" fill="url(#br${u})"/>
    <rect x="28" y="15" width="64" height="10" rx="3" fill="url(#br${u})"/>
    <rect x="28" y="95" width="64" height="11" rx="3" fill="url(#br${u})"/>` },

  scale: { name: "天秤", draw: u => `
    <path d="M42 108 L78 108 L71 99 L49 99 Z" fill="url(#br${u})"/>
    <rect x="57.5" y="30" width="5" height="70" rx="2" fill="url(#br${u})"/>
    <circle cx="60" cy="25" r="5" fill="url(#br${u})"/>
    <g transform="rotate(-5 60 34)">
      <rect x="18" y="32" width="84" height="4" rx="2" fill="url(#br${u})"/>
      <path d="M22 35 L12 72 M22 35 L32 72 M98 35 L88 72 M98 35 L108 72" stroke="#c49a46" stroke-width=".9"/>
    </g>
    <path d="M8 76 Q22 92 36 76 Z" fill="url(#iv${u})" ${L}/><line x1="8" y1="76" x2="36" y2="76" stroke="url(#br${u})" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M84 69 Q98 85 112 69 Z" fill="url(#iv${u})" ${L}/><line x1="84" y1="69" x2="112" y2="69" stroke="url(#br${u})" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="16" cy="72" r="4" fill="url(#br${u})"/><circle cx="24" cy="71" r="4" fill="url(#br${u})"/><circle cx="20" cy="66" r="4" fill="url(#br${u})"/>` },

  piggy: { name: "存錢筒", draw: u => `
    <circle cx="58" cy="24" r="9" fill="url(#br${u})"/><circle cx="58" cy="24" r="5.5" fill="none" stroke="rgba(110,78,20,.55)" stroke-width="1"/>
    <rect x="34" y="84" width="9" height="18" rx="4" fill="url(#ivs${u})"/><rect x="72" y="84" width="9" height="18" rx="4" fill="url(#ivs${u})"/>
    <path d="M20 66 q-8 -2 -6 -9 q2 -6 8 -2" fill="none" stroke="url(#ivs${u})" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="57" cy="70" rx="37" ry="27" fill="url(#iv${u})" ${L}/>
    <path d="M70 48 L76 34 L84 52 Z" fill="url(#ivs${u})"/>
    <rect x="44" y="94" width="9" height="12" rx="4" fill="url(#iv${u})" ${L}/><rect x="64" y="94" width="9" height="12" rx="4" fill="url(#iv${u})" ${L}/>
    <ellipse cx="94" cy="72" rx="8" ry="9" fill="url(#ivs${u})"/>
    <ellipse cx="92" cy="69" rx="1.4" ry="2" fill="rgba(60,40,20,.55)"/><ellipse cx="96.5" cy="69" rx="1.4" ry="2" fill="rgba(60,40,20,.55)"/>
    <circle cx="80" cy="61" r="2.2" fill="#2b2216"/>
    <rect x="49" y="44" width="18" height="3.2" rx="1.6" fill="#2b2216" opacity=".75"/>
    <path d="M32 58 Q44 48 60 47" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-linecap="round"/>` },

  scroll: { name: "薪資條卷軸", draw: u => `
    <rect x="32" y="20" width="56" height="78" fill="url(#iv${u})" ${L}/>
    <rect x="40" y="30" width="28" height="3" rx="1" fill="rgba(52,38,18,.62)"/>
    ${range(7, i => `<rect x="40" y="${40 + i * 6.4}" width="${[40, 30, 36, 24, 38, 28, 33][i]}" height="1.6" rx=".8" fill="rgba(52,38,18,.3)"/><rect x="${74 - (i % 3) * 2}" y="${40 + i * 6.4}" width="${6 + (i % 3) * 2}" height="1.6" rx=".8" fill="rgba(52,38,18,.45)"/>`)}
    <g transform="rotate(-8 75 85)"><rect x="68" y="78" width="14" height="14" rx="1.5" fill="none" stroke="#b0503c" stroke-width="1.6" opacity=".9"/><path d="M71 82 h8 M71 85 h8 M71 88 h8 M75 80 v10" stroke="#b0503c" stroke-width="1.1" opacity=".85"/></g>
    <rect x="24" y="13" width="72" height="9" rx="4.5" fill="url(#br${u})"/><circle cx="23" cy="17.5" r="5" fill="url(#br${u})"/><circle cx="97" cy="17.5" r="5" fill="url(#br${u})"/>
    <rect x="24" y="96" width="72" height="9" rx="4.5" fill="url(#br${u})"/><circle cx="23" cy="100.5" r="5" fill="url(#br${u})"/><circle cx="97" cy="100.5" r="5" fill="url(#br${u})"/>` },

  mask: { name: "面具", draw: u => `
    <path d="M28 46 q-10 4 -14 14 q-2 6 4 8" fill="none" stroke="url(#br${u})" stroke-width="2" stroke-linecap="round"/>
    <path d="M92 46 q10 4 14 14 q2 6 -4 8" fill="none" stroke="url(#br${u})" stroke-width="2" stroke-linecap="round"/>
    <path d="M28 42 C28 20 92 20 92 42 C92 68 78 94 60 100 C42 94 28 68 28 42 Z" fill="url(#iv${u})" ${L}/>
    <path d="M36 52 Q46 40 56 51 Q46 58 36 52 Z" fill="#1a2238"/><path d="M84 52 Q74 40 64 51 Q74 58 84 52 Z" fill="#1a2238"/>
    <path d="M34 48 Q46 34 58 47 M86 48 Q74 34 62 47" fill="none" stroke="url(#br${u})" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M60 27 L63.5 32 L60 37 L56.5 32 Z" fill="url(#br${u})"/>
    <path d="M60 56 Q58 66 60 72 Q62 66 60 56" fill="url(#ivs${u})"/>
    <path d="M51 82 Q60 87 69 82" fill="none" stroke="rgba(64,46,20,.6)" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M36 32 Q46 24 58 24" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2" stroke-linecap="round"/>` },

  magnifier: { name: "放大鏡", draw: u => `
    <g transform="rotate(42 78 82)"><rect x="72" y="70" width="12" height="40" rx="6" fill="url(#ivs${u})"/><rect x="71" y="70" width="14" height="7" rx="2" fill="url(#br${u})"/></g>
    <circle cx="50" cy="50" r="27" fill="url(#gl${u})"/>
    <path d="M32 44 A20 20 0 0 1 48 30" fill="none" stroke="rgba(255,255,255,.8)" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="27" fill="none" stroke="url(#br${u})" stroke-width="7"/>` },

  compass: { name: "指南針", draw: u => `
    <circle cx="60" cy="14" r="6" fill="none" stroke="url(#br${u})" stroke-width="3"/>
    <circle cx="60" cy="62" r="40" fill="url(#br${u})"/>
    <circle cx="60" cy="62" r="33" fill="url(#iv${u})" ${L}/>
    ${ticks(60, 62, 28, 31, 8, 1.4)}${ticks(60, 62, 30, 31, 32, .5, "rgba(52,38,18,.4)")}
    <text x="60" y="41" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="9" font-weight="600" fill="#2b2216">N</text>
    <g transform="rotate(28 60 62)"><path d="M60 38 L66 62 L54 62 Z" fill="#b0503c"/><path d="M60 86 L66 62 L54 62 Z" fill="#33405e"/></g>
    <circle cx="60" cy="62" r="3.2" fill="url(#br${u})"/>` },

  timeclock: { name: "打卡鐘", draw: u => `
    <rect x="48" y="4" width="24" height="26" rx="1" fill="url(#iv${u})" ${L}/>
    <path d="M52 10 h16 M52 14 h12 M52 18 h14" stroke="rgba(52,38,18,.35)" stroke-width="1"/>
    <rect x="28" y="18" width="64" height="82" rx="7" fill="url(#iv${u})" ${L}/>
    <rect x="44" y="17" width="32" height="5" rx="2" fill="#2b2216" opacity=".8"/>
    <circle cx="60" cy="48" r="20" fill="url(#br${u})"/><circle cx="60" cy="48" r="16" fill="#fbf6ea"/>
    ${ticks(60, 48, 12.5, 14.5, 12, 1.1)}
    <line x1="60" y1="48" x2="60" y2="37" stroke="#2b2216" stroke-width="1.8" stroke-linecap="round"/><line x1="60" y1="48" x2="68" y2="52" stroke="#2b2216" stroke-width="1.4" stroke-linecap="round"/>
    <rect x="40" y="76" width="40" height="7" rx="1.5" fill="url(#br${u})"/>
    <rect x="38" y="88" width="44" height="4" rx="2" fill="#2b2216" opacity=".75"/>
    <rect x="24" y="100" width="72" height="7" rx="2" fill="url(#br${u})"/>` },

  phone: { name: "手機", draw: u => `
    <g class="obj-buzz"><path d="M28 40 Q22 58 28 76 M20 34 Q12 58 20 82" fill="none" stroke="#e8c889" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>
    <path d="M92 40 Q98 58 92 76 M100 34 Q108 58 100 82" fill="none" stroke="#e8c889" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></g>
    <rect x="37" y="12" width="46" height="94" rx="9" fill="url(#dk${u})" stroke="url(#br${u})" stroke-width="2"/>
    <rect x="41.5" y="20" width="37" height="78" rx="4" fill="#16223b"/>
    <rect x="45" y="30" width="22" height="9" rx="4.5" fill="#efe6d2"/>
    <rect x="53" y="44" width="22" height="9" rx="4.5" fill="#d4a64a"/>
    <rect x="45" y="58" width="27" height="9" rx="4.5" fill="#efe6d2"/>
    <rect x="45" y="72" width="16" height="9" rx="4.5" fill="#efe6d2"/>
    <rect x="53" y="15" width="14" height="2" rx="1" fill="#2c3958"/>
    <circle cx="82" cy="14" r="7" fill="#b0503c"/><text x="82" y="17.4" text-anchor="middle" font-family="DM Mono, monospace" font-size="9" fill="#fff">9</text>` },

  typewriter: { name: "打字機", draw: u => `
    <rect x="40" y="10" width="40" height="38" fill="url(#iv${u})" ${L}/>
    ${range(4, i => `<rect x="45" y="${18 + i * 6}" width="${[28, 22, 26, 14][i]}" height="1.6" rx=".8" fill="rgba(52,38,18,.45)"/>`)}
    <rect x="24" y="42" width="72" height="9" rx="4.5" fill="url(#dk${u})"/><circle cx="22" cy="46.5" r="5" fill="url(#br${u})"/><circle cx="98" cy="46.5" r="5" fill="url(#br${u})"/>
    <path d="M24 56 L96 56 L106 98 L14 98 Z" fill="url(#dk${u})"/>
    <path d="M24 56 L96 56" stroke="url(#br${u})" stroke-width="2"/>
    ${range(9, i => `<circle cx="${27 + i * 8.25}" cy="68" r="3" fill="#efe6d2"/>`)}
    ${range(8, i => `<circle cx="${30 + i * 8.6}" cy="77" r="3" fill="#efe6d2"/>`)}
    ${range(7, i => `<circle cx="${33 + i * 9}" cy="86" r="3" fill="#efe6d2"/>`)}
    <rect x="40" y="92" width="40" height="3.4" rx="1.7" fill="#efe6d2"/>
    <rect x="12" y="98" width="96" height="8" rx="2" fill="url(#br${u})"/>` },

  pixel: { name: "像素小人", draw: u => {
    const map = ["..HHH..", ".HHHHH.", ".HESEH.", ".HSSSH.", "..SSS..", ".BBBBB.", "ABBBBBA", "A.BBB.A", "..BBB..", "..D.D..", ".D...D.", "DD...DD"];
    const col = { H: `url(#br${u})`, S: "#f3e8d0", E: "#1a2238", B: "#d4a64a", A: "#f3e8d0", D: "#33405e" };
    const s = 7.4, ox = 60 - 3.5 * s, oy = 108 - map.length * s;
    let out = '<g shape-rendering="crispEdges">';
    map.forEach((row, y) => [...row].forEach((c, x) => {
      if (col[c]) out += `<rect x="${(ox + x * s).toFixed(2)}" y="${(oy + y * s).toFixed(2)}" width="${s + .3}" height="${s + .3}" fill="${col[c]}"/>`;
    }));
    return out + "</g>";
  } },

  cup: { name: "手搖杯", draw: u => `
    <rect x="60" y="2" width="6" height="48" rx="3" transform="rotate(12 63 26)" fill="#c98a8a"/>
    <path d="M36 40 L84 40 L78 106 L42 106 Z" fill="url(#tea${u})"/>
    ${range(11, i => `<circle cx="${46 + (i % 6) * 5.6 + (i > 5 ? 2.8 : 0)}" cy="${i > 5 ? 92 : 99}" r="2.8" fill="#2a1d14"/>`)}
    <path d="M36 40 L84 40 L78 106 L42 106 Z" fill="url(#gl${u})" stroke="rgba(255,255,255,.5)" stroke-width="1"/>
    <path d="M42 46 L46 100" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M34 40 Q60 20 86 40 Z" fill="rgba(245,240,230,.55)" stroke="rgba(255,255,255,.7)" stroke-width="1"/>
    <rect x="32" y="38" width="56" height="5" rx="2.5" fill="#f4ecdc"/>` },

  key: { name: "鑰匙", draw: u => `<g transform="rotate(-32 60 60)">
    <circle cx="32" cy="60" r="17" fill="none" stroke="url(#br${u})" stroke-width="7"/>
    <circle cx="32" cy="60" r="6" fill="none" stroke="url(#br${u})" stroke-width="2.4"/>
    <rect x="47" y="56.5" width="56" height="7" rx="2" fill="url(#br${u})"/>
    <rect x="86" y="62" width="6" height="12" rx="1" fill="url(#br${u})"/><rect x="96" y="62" width="6" height="8" rx="1" fill="url(#br${u})"/>
    <rect x="52" y="54" width="4" height="12" rx="2" fill="url(#br${u})"/></g>` },

  lantern: { name: "燈籠", draw: u => `
    <circle cx="60" cy="10" r="5" fill="none" stroke="url(#br${u})" stroke-width="2.4"/>
    <path d="M42 28 L78 28 L70 16 L50 16 Z" fill="url(#br${u})"/>
    <rect x="43" y="28" width="34" height="58" fill="url(#gl${u})"/>
    <ellipse cx="60" cy="62" rx="16" ry="22" fill="url(#fl${u})"/>
    <path d="M60 50 C66 60 66 68 60 72 C54 68 54 60 60 50 Z" fill="#ffe6a8"/>
    <rect x="42" y="28" width="3" height="58" fill="url(#br${u})"/><rect x="75" y="28" width="3" height="58" fill="url(#br${u})"/>
    <rect x="38" y="86" width="44" height="9" rx="2" fill="url(#br${u})"/>
    <path d="M46 95 L50 106 L70 106 L74 95 Z" fill="url(#br${u})"/>` },

  book: { name: "書", draw: u => `
    <rect x="80" y="21" width="9" height="82" fill="#f7f0e0" ${L}/>
    ${range(6, i => `<line x1="82" y1="${30 + i * 12}" x2="88" y2="${30 + i * 12}" stroke="rgba(52,38,18,.15)" stroke-width=".8"/>`)}
    <rect x="32" y="16" width="50" height="88" rx="3" fill="url(#iv${u})" ${L}/>
    <rect x="32" y="16" width="8" height="88" rx="2" fill="url(#ivs${u})"/>
    <rect x="46" y="34" width="28" height="22" fill="none" stroke="url(#br${u})" stroke-width="1.6"/>
    <path d="M60 39 L62.4 44 L68 44.6 L63.8 48 L65 53.4 L60 50.6 L55 53.4 L56.2 48 L52 44.6 L57.6 44 Z" fill="url(#br${u})"/>
    <rect x="48" y="66" width="24" height="2" rx="1" fill="rgba(52,38,18,.4)"/><rect x="52" y="72" width="16" height="1.6" rx=".8" fill="rgba(52,38,18,.3)"/>` },

  globe: { name: "地球儀", draw: u => `
    <path d="M44 106 L76 106 L70 98 L50 98 Z" fill="url(#br${u})"/><rect x="58" y="86" width="4" height="13" fill="url(#br${u})"/>
    <circle cx="60" cy="50" r="30" fill="url(#mist${u})"/>
    <path d="M44 36 q8 -6 14 0 q4 6 -2 10 q-8 2 -12 -2 Z M64 56 q10 -4 14 4 q2 10 -8 12 q-8 -2 -6 -16 Z M40 58 q6 2 6 8 q-4 4 -8 0 Z" fill="url(#iv${u})" opacity=".9"/>
    <ellipse cx="60" cy="50" rx="30" ry="9" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".8"/>
    <ellipse cx="60" cy="50" rx="12" ry="30" fill="none" stroke="rgba(255,255,255,.45)" stroke-width=".8"/>
    <path d="M30 56 A32 32 0 0 0 84 78" fill="none" stroke="url(#br${u})" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M40 30 A26 26 0 0 1 58 22" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.4" stroke-linecap="round"/>` },

  trophy: { name: "獎盃", draw: u => `
    <path d="M38 30 Q20 30 22 46 Q24 58 40 58" fill="none" stroke="url(#br${u})" stroke-width="4"/>
    <path d="M82 30 Q100 30 98 46 Q96 58 80 58" fill="none" stroke="url(#br${u})" stroke-width="4"/>
    <path d="M36 20 L84 20 Q84 62 60 68 Q36 62 36 20 Z" fill="url(#br${u})"/>
    <path d="M44 26 Q44 50 56 60" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="55" y="66" width="10" height="18" fill="url(#br${u})"/>
    <rect x="42" y="84" width="36" height="8" rx="2" fill="url(#br${u})"/>
    <rect x="36" y="92" width="48" height="14" rx="2" fill="url(#dk${u})"/>
    <rect x="48" y="96" width="24" height="6" rx="1" fill="url(#br${u})"/>` }
};

// 共用材質：象牙瓷、陰影瓷、黃銅、玻璃、深色烤漆、沙、茶、火光、霧藍
function defs(u) {
  return `<defs>
    <linearGradient id="iv${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdf8ec"/><stop offset=".55" stop-color="#ecdfc3"/><stop offset="1" stop-color="#c4ad80"/></linearGradient>
    <linearGradient id="ivs${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2d2b0"/><stop offset="1" stop-color="#a99266"/></linearGradient>
    <linearGradient id="br${u}" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#f6e2a6"/><stop offset=".45" stop-color="#d4a64a"/><stop offset="1" stop-color="#8a6420"/></linearGradient>
    <linearGradient id="gl${u}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(230,240,255,.42)"/><stop offset="1" stop-color="rgba(150,180,220,.1)"/></linearGradient>
    <linearGradient id="dk${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34405e"/><stop offset="1" stop-color="#141c30"/></linearGradient>
    <linearGradient id="sd${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0d38a"/><stop offset="1" stop-color="#c4943c"/></linearGradient>
    <linearGradient id="tea${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ead4a8"/><stop offset="1" stop-color="#a87a46"/></linearGradient>
    <radialGradient id="fl${u}"><stop offset="0" stop-color="rgba(255,214,130,.95)"/><stop offset="1" stop-color="rgba(255,190,90,0)"/></radialGradient>
    <radialGradient id="mist${u}" cx=".35" cy=".3"><stop offset="0" stop-color="#b7cde3"/><stop offset="1" stop-color="#4f6f93"/></radialGradient>
  </defs>`;
}

let seq = 0;
export function objectSVG(key, cls = "") {
  const o = OBJECTS[key] || OBJECTS.lantern, u = "o" + (++seq);
  return `<svg class="obj ${cls}" viewBox="0 0 120 120" aria-hidden="true" focusable="false">${defs(u)}${o.draw(u)}</svg>`;
}
