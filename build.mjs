// 微光博物館｜建置：讀 content/museum.json，產生 dist/
// 1. 檢查資料，有錯就停下來，網站維持上一版
// 2. 只放公開的展品（草稿不出現在網站上），資料嵌進首頁
// 3. 複製前台檔案
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { OBJECTS } from "./src/site/objects.js";

const OUT = "dist";
const FOOTER = [
  { label: "引路人官網", url: "https://education-writing-ai.netlify.app/" },
  { label: "Instagram", url: "https://www.instagram.com/education_writing/" }
];
const GLOWS = ["gold", "moon", "mist", "rose"];
const STATUSES = ["open", "renovating", "draft"];

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
    title: e.title, en: e.en || "", kind: e.kind || "", version: e.version || "",
    object: e.object, glow: e.glow || "gold", note: e.note || "", tags: e.tags || [],
    links: e.status === "open" ? (e.links || []) : []
  }));
const live = new Set(exhibits.map(e => e.id));
const states = data.clockout.states.map(s => ({ ...s, picks: s.picks.filter(id => live.has(id)) }));
const payload = { floors: data.floors, exhibits, clockout: { states }, footer: FOOTER };

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });
await cp("src/site", OUT, { recursive: true });
const html = (await readFile("src/site/index.html", "utf8"))
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
  for (const s of d.clockout?.states || []) {
    if (!s.id || !s.name) errs.push(`下班狀態缺 id 或名稱`);
    if (!s.lines?.length) errs.push(`下班狀態「${s.name}」沒有警衛的話`);
    for (const p of s.picks || []) if (!ids.has(p)) errs.push(`下班狀態「${s.name}」推薦的展品「${p}」不存在`);
  }
  return errs;
}
