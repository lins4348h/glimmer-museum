# 微光博物館（Museum of Glimmers）

引路人文創園區的第四座館：老師台下的人生——理財、測驗、遊戲。
白天，你是老師；熄燈後，你是你自己。接手工作請先讀 `CLAUDE.md`。

- 前台：`dist/index.html`（由 `src/site/` 產生）
- 資料：`content/museum.json`
- 後台：網址加 `/admin/`（製作中）

## 參觀動線

夜間售票口選展區 → 今晚的票（深墨藍燙金，可存成 1080×1920 圖）→ 前往：吊燈快速熄滅、拿到手電筒 → 樓層。
樓層還在佈展，目前先停在樓層導覽圖。

## 怎麼運作

1. 改 `content/museum.json`（之後由後台改），推到 GitHub 的 `main`。
2. Cloudflare 執行 `npm run build`（`build.mjs`）：檢查資料、拿掉草稿、把資料嵌進首頁，輸出 `dist/`。
   資料有錯（樓層不存在、物件不在圖庫、展區選項缺警衛的話）會停止建置，網站維持上一版。
3. 大約 1 分鐘後網站更新。

## 第一次設定（Cloudflare Workers）

1. Cloudflare → Workers & Pages → Create → Import a repository → 選 `glimmer-museum`。
2. 專案名稱 `glimmer-museum`（要跟 `wrangler.jsonc` 的 name 一樣）。
3. Build command `npm run build`；Deploy command `npx wrangler deploy`；Production branch `main`。
4. 網址會是 https://glimmer-museum.lins4348h.workers.dev

## 本機預覽

```bash
npm install
npm run build
python3 -m http.server -d dist 8080   # 打開 http://localhost:8080
```

## 資料格式（content/museum.json）

```jsonc
{
  "floors": [{ "id": "f1", "label": "1F", "name": "夜間互動區", "en": "After Dark", "blurb": "一句說明" }],  // 順序＝樓層導覽圖的順序
  "exhibits": [{
    "id": "e01", "floor": "f1",
    "status": "open",               // open 上線／renovating 整修中（櫥窗蓋布、按鈕變灰）／draft 草稿（不出網站）
    "onDisplay": true, "order": 1,  // 放櫥窗或收庫房；同層樓的排序
    "title": "《老師，在嗎？》", "en": "Are You There, Teacher?",
    "kind": "遊戲", "version": "v4.6",   // 說明牌上的「類型」「年代」
    "object": "phone",              // 立體擺件，從 src/site/objects.js 的圖庫選
    "glow": "gold",                 // 櫥窗光色：gold 暖金／moon 月白／mist 霧藍／rose 玫瑰
    "note": "策展說明（200 字內）", "tags": ["LINE 互動"],
    "links": [{ "label": "開始遊戲", "url": "https://…" }]
  }],
  "admission": { "zones": [{
    "id": "f2", "floor": "f2",       // floor 空白＝全館（要另外寫 name、en）
    "numeral": "II", "choice": "想算清楚",
    "lines": [{ "zh": "數字會說話，但怎麼過日子，由你決定。", "en": "Numbers speak. How you live is yours to decide." }]  // 多句就隨機抽一句
  }] }
}
```

2F（`f2`）的說明牌固定加一行「個人研究參考，不構成投資建議」。

## 物件圖庫

`src/site/objects.js`：時鐘、沙漏、天秤、存錢筒、薪資條卷軸、面具、放大鏡、指南針、打卡鐘、手機、打字機、像素小人、手搖杯、鑰匙、燈籠、書、地球儀、獎盃。
材質統一是象牙瓷＋黃銅，畫布 120×120，底部落在 y≈108。要加物件就在 `OBJECTS` 加一筆。
