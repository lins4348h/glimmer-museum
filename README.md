# 微光博物館（Museum of Glimmers）

引路人教育園區的第四座館：老師台下的人生——理財、測驗、遊戲。
白天，你是老師；熄燈後，你是你自己。接手工作請先讀 `CLAUDE.md`。

- 前台：`dist/index.html`（由 `src/site/` 產生）
- 資料：`content/museum.json`
- 後台：網址加 `/admin/`（製作中）

## 參觀動線

點售票窗或「點我購票」→ 抽到今晚的一張票根（100 句溫柔的鼓勵，隨機；一半月白銀箔、一半暖金燙金；可以一直抽；「存下票根」存成 1080×1920 的整張票）→ 進館：3D 斜俯視的博物館地圖。
右上角「略過，直接進館」也是進地圖。進館後預設是探索的白天。

館內兩種看法，右上角切換：

- **探索**（Wander）：3D 地圖（`map3d.js`）。旁邊一顆日／月鈕切白天和夜晚。
  - 白天：窗外是天光，有安靜的遊客在逛；展品乖乖待在展櫃裡，警衛換白天的台詞。
  - 夜晚：館內暗，Q 版老師提手電筒走。展品從玻璃罩跳出來在廳裡亂跑；你一靠近，它就跳回展櫃裝死（不冒對話框，自白寫在說明牌上）。恐龍骨架轉身、轉頭看你、張嘴，靠太近會跳；肖像眼睛跟著你；半身像在你經過後轉頭；警衛會說話。
  - 走近展櫃，上方浮出小展牌，點它看說明牌。出口在大廳左上角，按下去會先問「要離開博物館嗎？」。
- **總覽**（Gallery）：畫廊式的館藏目錄，依展廳分段，每件一張藏品海報（銅版線稿＋直書標題＋編號），可以篩類型。

展品圖：總覽海報和說明牌都用 `engravings.js` 的銅版線稿（燙金細線＋排線陰影，key 跟 `object` 一樣）；3D 地圖的展櫃裡是 `map3d.js` 的 `goldObject` 小擺件。新增物件要兩邊都做。

操作：電腦用方向鍵或 WASD、空白鍵看說明牌；手機按住畫面任一處拖曳（按下的地方就是搖桿底座）。

地圖：中央大廳，`floors` 第 1～4 個依序放在西、北、東、南（南＝商店），最多 4 個；出口在大廳左上角。
程式：`museum.js`（售票口、票根、模式、總覽、說明牌）、`map3d.js`（3D 地圖，進館時才載入 `three.min.js`）、`engravings.js`（銅版線稿）、`museum.css`、`inside.css`。

## 怎麼運作

1. 改 `content/museum.json`（之後由後台改），推到 GitHub 的 `main`。
2. Cloudflare 執行 `npm run build`（`build.mjs`）：檢查資料、拿掉草稿、把資料嵌進首頁，輸出 `dist/`。
   資料有錯（樓層不存在、物件不在圖庫、展區選項缺警衛的話）會停止建置，網站維持上一版。
3. 大約 1 分鐘後網站更新。

## 第一次設定（Cloudflare Workers）

1. Cloudflare → Workers & Pages → Create → Import a repository → 選 `glimmer-museum`。
2. 專案名稱 `glimmer-museum`（要跟 `wrangler.jsonc` 的 name 一樣）。
3. Build command `npm run build`；Deploy command `npx wrangler deploy`；Production branch `main`。
4. 正式網址：https://glimmer-museum.lins4348h-12a.workers.dev

## 本機預覽

```bash
npm install
npm run build
python3 -m http.server -d dist 8080   # 打開 http://localhost:8080
```

## 資料格式（content/museum.json）

```jsonc
{
  "floors": [{ "id": "f1", "label": "遊戲廳", "numeral": "I", "name": "夜間互動區", "en": "After Dark", "blurb": "一句說明" }],  // 順序＝西、北、東、南
  "exhibits": [{
    "id": "e01", "floor": "f1",
    "status": "open",               // open 上線／renovating 整修中（櫥窗蓋布、按鈕變灰）／draft 草稿（不出網站）
    "onDisplay": true, "order": 1,  // 放櫥窗或收庫房；同層樓的排序
    "title": "《老師，在嗎？》", "en": "Are You There, Teacher?",
    "kind": "遊戲", "version": "v4.6",   // 類型；版本號只留在資料裡，不顯示
    "year": "2025",                      // 年代：展牌、說明牌、總覽海報上顯示
    "object": "phone",              // 立體擺件，從 src/site/objects.js 的圖庫選
    "glow": "gold",                 // 櫥窗光色：gold 暖金／moon 月白／mist 霧藍／rose 玫瑰
    "note": "策展說明（200 字內）", "tags": ["LINE 互動"],
    "links": [{ "label": "開始遊戲", "url": "https://…" }],
    "persona": { "move": "hop", "quip": "被抓到時說的一句話" }  // 夜遊時怎麼動：hop 跳／roll 滾／waddle 搖擺／float 飄／scuttle 小碎步／spin 翻轉／tilt 晃／slide 滑／wobble 搖／none 不動
  }],
  "guard": [{ "zh": "夜班警衛說的話", "en": "…" }],
  "guardDay": [{ "zh": "白天警衛說的話", "en": "…" }],
  "admission": { "lines": [{ "zh": "票根上的一句話", "en": "…", "tone": "tender" }] }  // tender 月白銀箔／warm 暖金燙金，隨機抽
}
```

2F（`f2`）的說明牌固定加一行「個人研究參考，不構成投資建議」。

## 物件圖庫

`src/site/objects.js`：時鐘、沙漏、天秤、存錢筒、薪資條卷軸、面具、放大鏡、指南針、打卡鐘、手機、打字機、像素小人、手搖杯、鑰匙、燈籠、書、地球儀、獎盃。
材質統一是象牙瓷＋黃銅，畫布 120×120，底部落在 y≈108。要加物件就在 `OBJECTS` 加一筆。
