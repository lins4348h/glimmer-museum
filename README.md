# 微光博物館（Museum of Glimmers）

引路人教育園區的第四座館：老師台下的人生——理財、測驗、遊戲。
白天，你是老師；熄燈後，你是你自己。接手工作請先讀 `CLAUDE.md`。

- 前台：`dist/index.html`（由 `src/site/` 產生）
- 資料：`content/museum.json`
- 後台：網址加 `/admin/`（製作中）

## 參觀動線

點售票窗 → 抽到今晚的一張票根（100 句隨機；感性＝月白銀箔、幽默＝暖金燙金；可以一直抽；「存下票根」只存票本身）→ 進館：俯視像素地圖。
「略過，直接進館」直接進全覽。

館內三種看法，右上角切換：

- **夜遊**（Wander）：館內暗，像素老師提手電筒走。展品活過來在廳裡亂跑；你一靠近，它就跑回台座裝死、說一句自白，這時下方出現「看說明牌」。大廳的恐龍骨架會走、轉頭看你、靠太近會跳；畫像眼睛跟著你；雕像在你經過後換姿勢；門口警衛會說話。商店南邊是出口，走出去回售票口。
- **開館**（Daytime）：同一張地圖變白天，窗外是天光，有安靜的遊客在逛；展品乖乖待在台座上，警衛換白天的台詞。
- **全覽**（Overview）：燈全亮的館藏目錄，依展廳分組，可以篩類型。

操作：電腦用方向鍵或 WASD、空白鍵看說明牌；手機按住畫面任一處拖曳（按下的地方就是搖桿底座）。

地圖：中央大廳，`floors` 第 1～4 個依序放在西、北、東、南（南＝商店＋出口），最多 4 個。
程式：`museum.js`（售票口、票根、模式、全覽、說明牌）、`map.js`（像素地圖）、`pixels.js`（像素素材）、`museum.css`、`inside.css`。

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
    "kind": "遊戲", "version": "v4.6",   // 說明牌上的「類型」「年代」
    "object": "phone",              // 立體擺件，從 src/site/objects.js 的圖庫選
    "glow": "gold",                 // 櫥窗光色：gold 暖金／moon 月白／mist 霧藍／rose 玫瑰
    "note": "策展說明（200 字內）", "tags": ["LINE 互動"],
    "links": [{ "label": "開始遊戲", "url": "https://…" }],
    "persona": { "move": "hop", "quip": "被抓到時說的一句話" }  // 夜遊時怎麼動：hop 跳／roll 滾／waddle 搖擺／float 飄／scuttle 小碎步／spin 翻轉／tilt 晃／slide 滑／wobble 搖／none 不動
  }],
  "guard": [{ "zh": "夜班警衛說的話", "en": "…" }],
  "guardDay": [{ "zh": "白天警衛說的話", "en": "…" }],
  "admission": { "lines": [{ "zh": "票根上的一句話", "en": "…", "tone": "tender" }] }  // tender 感性（銀）／wry 幽默（金），隨機抽
}
```

2F（`f2`）的說明牌固定加一行「個人研究參考，不構成投資建議」。

## 物件圖庫

`src/site/objects.js`：時鐘、沙漏、天秤、存錢筒、薪資條卷軸、面具、放大鏡、指南針、打卡鐘、手機、打字機、像素小人、手搖杯、鑰匙、燈籠、書、地球儀、獎盃。
材質統一是象牙瓷＋黃銅，畫布 120×120，底部落在 y≈108。要加物件就在 `OBJECTS` 加一筆。
