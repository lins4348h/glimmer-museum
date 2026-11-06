// 微光博物館｜建置：讀 content/museum.json，產生 dist/
// 1. 檢查資料，有錯就停下來，網站維持上一版
// 2. 只放公開的展品（草稿不出現在網站上），資料嵌進首頁
// 3. 複製前台檔案
import { readFile, writeFile, mkdir, rm, cp, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { OBJECTS } from "./src/site/objects.js";

const OUT = "dist";
const FOOTER = [
  { label: "引路人官網", url: "https://education-writing-ai.netlify.app/" },
  { label: "Instagram", url: "https://www.instagram.com/education_writing/" }
];
const GLOWS = ["gold", "moon", "mist", "rose"];
const STATUSES = ["open", "renovating", "draft"];
const MOVES = ["hop", "roll", "waddle", "float", "scuttle", "spin", "tilt", "slide", "wobble", "none"];
const TONES = ["tender", "warm"];

const data = JSON.parse(await readFile("content/museum.json", "utf8"));
const errs = check(data);
if (errs.length) {
  console.error("資料有錯，停止建置：\n- " + errs.join("\n- "));
  process.exit(1);
}

// 公開的展品：草稿不出網站；樓層照資料順序
const floorIds = data.floors.map(f => f.id);
const exhibits = data.exhibits
  .filter(e => e.status !== "draft")
  .sort((a, b) => floorIds.indexOf(a.floor) - floorIds.indexOf(b.floor) || (a.order ?? 99) - (b.order ?? 99))
  .map(e => ({
    id: e.id, floor: e.floor, status: e.status, onDisplay: e.onDisplay !== false,
    title: e.title, en: e.en || "", kind: e.kind || "", version: e.version || "", year: String(e.year || ""),
    object: e.object, glow: e.glow || "gold", note: e.note || "", tags: e.tags || [], persona: e.persona || null,
    links: e.status === "open" ? (e.links || []) : []
  }));
const payload = { floors: data.floors, exhibits, admission: data.admission, guard: data.guard || [], guardDay: data.guardDay || [], footer: FOOTER };

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp("src/site", OUT, { recursive: true });
// 版本號：所有前台檔案的內容算一個雜湊，加在 css／js 網址後面。
// 不然手機可能拿到「新的首頁＋快取裡舊的程式」，對不上就壞掉（使用者遇過說明牌跳不出來）
const files = (await readdir("src/site")).filter(f => /\.(js|css)$/.test(f));
const hash = createHash("sha1");
for (const f of files.sort()) hash.update(await readFile(`src/site/${f}`));
hash.update(JSON.stringify(payload));
const V = hash.digest("hex").slice(0, 8);
for (const f of files.filter(f => f.endsWith(".js"))) {
  const js = (await readFile(`src/site/${f}`, "utf8")).replace(/from "\.\/([\w-]+\.js)"/g, `from "./$1?v=${V}"`);
  await writeFile(`${OUT}/${f}`, js);
}
const html = (await readFile("src/site/index.html", "utf8"))
  .replace(/(href|src)="([\w-]+\.(?:css|js))"/g, `$1="$2?v=${V}"`)
  .replace("/*MUSEUM_DATA*/null", JSON.stringify(payload).replace(/</g, "\\u003c"));
await writeFile(`${OUT}/index.html`, html);
await writeFile(`${OUT}/_headers`, [
  "/*", "  X-Content-Type-Options: nosniff", "  Referrer-Policy: strict-origin-when-cross-origin",
  "/index.html", "  Cache-Control: no-cache",
  "/*.js", "  Cache-Control: public, max-age=300",
  "/*.css", "  Cache-Control: public, max-age=300", ""
].join("\n"));
console.log(`完成：${exhibits.length} 件展品（另有 ${data.exhibits.length - exhibits.length} 件草稿），${data.floors.length} 層樓`);

// 資料有錯就停下來，不要發布壞掉的網站
function check(d) {
  const errs = [];
  if (!Array.isArray(d.floors) || !d.floors.length) errs.push("沒有任何樓層");
  if (!Array.isArray(d.exhibits)) errs.push("沒有展品清單");
  if (errs.length) return errs;
  const fl = new Set(d.floors.map(f => f.id)), ids = new Set();
  for (const f of d.floors) if (!f.id || !f.name) errs.push(`樓層缺 id 或名稱：${JSON.stringify(f)}`);
  for (const e of d.exhibits) {
    const who = `展品「${e.title || e.id}」`;
    if (!e.id) errs.push(`${who}缺 id`);
    if (ids.has(e.id)) errs.push(`${who}的 id 重複`);
    ids.add(e.id);
    if (!e.title) errs.push(`${who}缺名稱`);
    if (!fl.has(e.floor)) errs.push(`${who}的樓層「${e.floor}」不存在`);
    if (!STATUSES.includes(e.status)) errs.push(`${who}的狀態「${e.status}」不對（open／renovating／draft）`);
    if (!OBJECTS[e.object]) errs.push(`${who}的物件「${e.object}」不在圖庫裡`);
    if (e.glow && !GLOWS.includes(e.glow)) errs.push(`${who}的光色「${e.glow}」不對`);
  }
  // 展品的個性：怎麼動、被抓到時說什麼
  for (const e of d.exhibits) if (e.persona?.move && !MOVES.includes(e.persona.move)) errs.push(`展品「${e.title}」的動法「${e.persona.move}」不對（${MOVES.join("／")}）`);
  // 售票口的票根：一句溫柔的鼓勵＋顏色（tender 月白銀箔、warm 暖金燙金）
  const lines = d.admission?.lines || [];
  if (!lines.length) errs.push("售票口沒有任何票根的句子");
  lines.forEach((l, i) => {
    if (!l.zh) errs.push(`第 ${i + 1} 句票根沒有中文`);
    if (!TONES.includes(l.tone)) errs.push(`第 ${i + 1} 句票根的調性「${l.tone}」不對（tender 月白銀箔／warm 暖金燙金）`);
  });
  if (d.floors.length > 4) errs.push("地圖只有四個展廳的位置（西、北、東、南），樓層最多 4 個");
  return errs;
}
