<!-- SPECTRA:START v1.3.0 -->

# Spectra Instructions

This project uses Spectra for Spec-Driven Development(SDD). Specs live in `docs/spectra/specs/`, change proposals in `docs/spectra/changes/`.

## Skills

Each `/spectra-*` skill carries its own trigger description; these are the groups:

- Shape and plan → `/spectra-discuss`, `/spectra-propose`
- Continue tasks for an identified change → `/spectra-apply`
- Update requirements or plans for an identified change → `/spectra-ingest`
- Quality gate → `/spectra-verify`, `/spectra-review`, `/spectra-analyze`, `/spectra-audit`, `/spectra-drift`, `/spectra-debug`
- Finish → `/spectra-archive`, `/spectra-commit`

Explicit skill invocation takes precedence. Apply existing authorization within its unchanged scope.

## Workflow

discuss? → propose → apply ⇄ ingest → verify / review → archive

- `discuss` is optional — skip if requirements are clear
- Requirements change mid-work? Plan mode → `ingest` → resume `apply`

## Parked Changes

Changes can be parked（暫存）— temporarily moved out of `docs/spectra/changes/`. Parked changes won't appear in `spxa list` but can be found with `spxa list --parked`. To restore: `spxa unpark <name>`. The `/spectra-apply` and `/spectra-ingest` skills disclose parking and restore when the named operation is already explicitly requested; respect a known refusal, otherwise ask for missing authorization.

<!-- SPECTRA:END -->

# CLAUDE.md — 給 AI 的專案規則

> **開發流程依 [game-dev-flow-template](https://github.com/fishon100/game-dev-flow-template)**（`docs/flow/` 00～07：一輪開發、角色分工、Notion 與 GitHub、品質把關、工具與帳號、對 AI 說的話）。本專案是它的實戰範例；下面是本專案特有的規則。
> Notion 工作區尚未建立：建好前，需求／回饋／開發日誌沿用 Obsidian（`彈珠專案/`）。建好後 ID 寫進 `docs/notion.json`，改以 Notion 為正本、Obsidian 為備份。

## 這是什麼
彈珠台遊戲（Godot 4.7，GDScript）。目標是「彈射感到位」。
文件的正本在 Obsidian vault（可透過 Obsidian MCP 讀寫；`specs/` 是副本，不含原始需求筆記與參考圖）：
- `遊戲開發架構/`：所有專案共用的開發流程與範本（`00 開發架構總覽`、`06 專案文件架構規範`）
- `彈珠專案/`：`00 主架構規劃書`（遊戲核心）、`01 功能規劃書/F01～F15`、`02 知識庫/`（劇情腳本、角色、街區、數值總表、名詞與命名總表）、`03 媒體庫/`（美術／音樂音效清單、參考圖）、`04 紀錄/`（開發日誌、舊版本規格、舊版文件，只看不改）、`回饋.md`（企劃試玩回饋）

## 文件規則（企劃要求，2026-10-05）
- 「看回饋」＝讀 `彈珠專案/回饋.md` 最上面的「第 N 輪」；處理完把標題改成「已處理 → 版本」並開下一輪空段落；回饋裡貼的圖搬到 `03 媒體庫/參考圖/`，改成 `類別-內容.png` 並更新連結
- **正式規則＝`docs/spectra/specs/<capability>/spec.md`**（2026-10-05 起，英文規則＋每條一行 `> 中文：`）。任何改動（回饋、新功能、bug）都走 Spectra 申請單：`docs/spectra/changes/<name>/`（proposal → specs 差異 → design → tasks）→ 企劃說「開始」才實作（修 bug 且企劃已說要修時可直接做）→ 先寫會失敗的測試再修 → 部署 → 歸檔 `spxa archive <name> -y`（把規則併回 specs）。Obsidian 的主架構規劃書與 F01～F15 改為背景說明，最上面有連到對應規則書的註記
- 功能規劃書要記背景時，只改那一份（含修改紀錄）；新增功能要新增規則書（capability）並加進名詞與命名總表
- **單一來源**：劇情＝`02 知識庫/劇情/劇情腳本`（對應 `data.js` 的 `SR.COMICS`）、角色＝角色卡、數值＝`數值總表`（對應 `tuning.js`）、名詞＝`名詞與命名總表`。其他文件用 `![[ ]]` 嵌入，不重抄。企劃說「同步 <檔名>」→ 把文件內容套用到程式並跑相關測試；程式改了這些內容 → 回寫到對應的知識庫文件
- 「套用調參」＝企劃從遊戲內手感調整面板（`web/street/js/tune.js`，暫停 → 🎚 手感調整）複製的「參數：原 → 新」清單。寫進 `tuning.js` 的 `STREET_TUNING`（**不要改 `data/tuning.json`**，那是 Godot v2 共用、會動到 AC1–AC13），更新 `數值總表`，跑 22 項測試＋擬人玩家難度，數字有變就更新 F15
- Spectra（`spxa`，在 `D:\tools\node`）：Windows PowerShell 5.1 用管線餵 `spxa new artifact … --stdin` 會在檔頭加 BOM，Spectra 就讀不到第一個標題（例如 `## Purpose`）。做法：先用 Write 工具把內容寫成檔案，再用 `cmd /c "D:\tools\node\spxa.cmd new artifact … --stdin < 檔案"` 餵進去（`$OutputEncoding` 改了也沒用，npm 的 spxa.ps1 還是會加）
- 遊戲流程測試：`web/street/test.html` 會在看不見的框架開 `index.html?test=1`（另一份存檔 `sprayrun.save.test`、不套用手感面板），測試寫在 `tests.js` 的 `GAME_TESTS`。注意 `SR_GAME.closeDialog()` 和 `SR.Comic.finish()` 都等於「按跳過」；要模擬看完漫畫得一直 `SR.Comic.tap()`。本機測試若用同一個 `?v=` 版號重跑，框架可能吃到舊快取，要先 `fetch(…, {cache:'reload'})`
- **關卡由企劃的表決定**（v3.7.2 起）：Google Drive「我的雲端硬碟／噴漆闖關 關卡設定」資料夾（id `1nJBuCBLXMDiD-4f6PbYUT3KGsMf7HM5j`）裡的「關卡設定表」（id `1P3l9hWg8_ru_7mXKKm7rJ1yXSIx8U8yvyEFIMCUfe-Q`）與「台面配置表」（id `1waOIL6TOKerPAV93iw58mCoIBahRC96TAa2ilEIdY2w`）是正本；遊戲讀 `web/street/js/levels.js`（`SR.LEVELS`，自動產生，不要手改）。**不要用改公式的方式調關卡**（`SR.generateStage`、`SR.DEFAULTS` 只是第一版與報告參考）
- 「同步關卡表」＝ ① 企劃把兩份表匯出成 `.xlsx` 或 `.csv`，放進 `tools/levels/in/`（檔名 `關卡設定表`／`台面配置表` 或 `stages`／`layouts`；不進 git）。`sync.js` 會直接讀 `.xlsx`（`tools/levels/xlsx.mjs`，保留千分位、長數字不變形），同一份表有多個檔用最新的。目前 Claude 的 Google Drive 連接器不是企劃的帳號，**不要用連接器搜尋或下載** ② 看 `sync.js` 印出的「讀取 <檔名>」確認讀到剛匯出的檔 ③ `node tools/levels/sync.js` 檢查並列出「改了哪幾關、哪幾欄」→ 給企劃看、等確認 ④ `node tools/levels/sync.js --write`（寫出 levels.js 並在 Node 跑會擋的測試）⑤ 開 `web/street/test.html` 確認（漫畫版面與遊戲流程測試只在瀏覽器跑；難度報告以瀏覽器的數字為準，Node 的浮點數略有差異）⑥ 升 `?v=` 部署。檢查有問題（回傳碼 2）就把「第幾關・哪一欄・問題」原文告訴企劃，不要自己改表
- 測試分「會擋」與「報告」（`report: true`）：設計值與難度（AC-S17、S20、S29、S30、S34、S36、S39、S40）只報告；企劃改表後報告出現 ⚠ 不算失敗。磚塊圖案編輯器在 `web/street/editor.html`（線上 `/street/editor.html`）
- 知識庫／媒體庫要列出產出工具與管理工具（例：美術 ChatGPT／GPT Image 產出 → Figma 管理）
- 完成後在 `彈珠專案/04 紀錄/開發日誌.md` 最上面記一筆，再把有改的文件複製到 `specs/` 對應位置

## 開發流程（SDD + TDD）
1. 先讀 `specs/` 的規格與驗收條件（AC）
2. 新功能先在 `tests/run_tests.gd` 加測試，再實作
3. 每次改動後都要跑測試，全過才算完成：
   ```
   godot --headless --path . --script res://tests/run_tests.gd
   ```
4. 完成後更新 Obsidian `彈珠專案/04 紀錄/開發日誌.md`

## 規則
- 手感數值一律讀 `data/tuning.json`，禁止寫死在程式裡
- 物理在 `scripts/pinball_physics.gd`，與網頁原型 `tools/tuning-prototype/index.html` 演算法一一對應；改一邊就要同步改另一邊，兩邊的 AC1–AC5 測試數值要相同
- 不使用 Godot 內建 RigidBody2D 做球與擋板（要精準控制擋板線速度）
- 新增或移動任何台面元件後，AC13（無卡球死角）一定要通過；卡球點要用導球片或調整位置修掉，不能放寬測試
- 規則（模式、狂熱、球保險）在網頁版 `index.html` 與 Godot `scripts/main.gd` 各有一份，改一邊要同步另一邊
- 美術目前是程式繪製的占位圖形；正式資產放 `assets/`，命名 `物件_狀態.png`
- 改了規格要同步更新 Obsidian 的對應文件

## v3 噴漆闖關（`web/street/`，網頁版，部署在 `/street/`）
- **正式規則以 `docs/spectra/specs/` 為準**；Obsidian `彈珠專案/00 主架構規劃書` ＋ `01 功能規劃書/` 是背景說明（見上方「文件規則」）
- 舊的版本規格在 `04 紀錄/版本規格/`（02、06、07、08、10、11、12）；素材提示詞已併入 `03 媒體庫/` 的素材清單
- v3.5：滑板三種尺寸（`tuning.js` paddle.half_widths S/M/L；一般關卡 M、首領關 S、道具「寬板」L，`SR.paddleSizeFor`），可移動整個台面寬（x 20～340），滑板模式沒有彈弓與漏斗；發射桿是「按住往下拉」（`setPlunger／pullPlunger`，拉不到 8% 不發射）；第一次進遊戲播開場動畫（`save.seenOpening`）
- 只有網頁版（設計驗證階段），Godot 版仍是 v2 台面；移植要等設計定案
- 檔案分工：`data.js` 企劃可改的資料（關卡文字圖、劇情、強化卡、成就）／`physics.js` 物理／`rules.js` 規則／`art.js` 美術／`audio.js` 聲音／`game.js` 流程與畫面／`tests.js` 測試
- 手感讀 `tuning.json`（部署時從 `data/tuning.json` 複製過去），噴漆闖關專用參數在 `tuning.js` 的 `STREET_TUNING`
- **改了任何 street 的程式都要開 `web/street/test.html` 跑測試，22 項全過才能部署**（本機：`python -m http.server --directory web/street`；約 20 秒）
- v3.4 規格：Obsidian `12`。**難度一定要用擬人玩家量**（`SR.Tests.HUMAN.novice／casual／skilled`：反應時間＋時機／落點誤差），不能用機器反應速度（企劃第 5 輪）。第 1 區目標：擬人新手每關 ≤ 1 顆愛心（AC-S20）
- 操作有兩種：`paddle` 滑板（預設）／`flipper` 經典擋板，存在 `save.control`；`buildTable(T, assists, layout, control)`
- 台面配置在 `data.js` 的 `SR.LAYOUTS`（top＝台面往下移多少、bumpers、rails、fish），每區輪替表 `SR.DISTRICT_LAYOUTS`，`SR.layoutFor(n)`；改了要過 AC-S7、AC-S19。導軌不要和牆重疊（會被牆擋住、永遠不觸發）；首領關不要用阿鰭
- 漫畫「看過」紀錄是 `save.seenComic`（不要用舊的 seenStory）；新漫畫要在 `SR.COMIC_TITLES` 加回放標題（AC-S22）
- v3.2 規格：Obsidian `11`。劇情是格漫畫：資料在 `data.js` 的 `SR.COMICS`／`SR.SPEAKERS`，播放與畫格繪製在 `comic.js`；AC-S18 檢查對白不遮臉、不出框、畫格不重疊、每句 ≤ 32 字
- 不可加「擋板中間的救球柱」這類違反彈珠基本架構的東西（企劃第 4 輪回饋）；企劃說的「中柱」＝圓形彈跳柱（pop bumper）。彈跳柱群在台面配置裡（見下面 v3.4）
- v3.1 規格：Obsidian `10`。難度用三種自動玩家量（`SR.Tests.NOVICE`、進步中 `{delay:0.06,miss:0.15}`、熟練＝不給 skill）；彈珠物理對微小差異很敏感，平衡判斷至少用 40 局以上
- 每區的新手輔助在 `data.js` 的 `DISTRICTS[].assists`（彈道預覽、時機提示、球保險、收尾輔助）
- 改台面幾何後 AC-S7（卡球）與 AC-S9c（最大顆的球）一定要過；改數值後看 AC-S8／AC-S8b（自動遊玩清關時間）
- **改了 street 的 JS 要把 `index.html`、`test.html` 裡的 `?v=` 版本號一起加 1**，否則手機會拿到快取的舊檔（新舊檔混用會出錯）
- 測試用的自動玩家要「按一下就放開」，一直按住會把球卡在接球位置，誤判成遊戲問題

## 常用指令
| 做什麼 | 指令 |
|---|---|
| 跑測試（約 30 秒，AC13 卡球測試最久） | `godot --headless --path . --script res://tests/run_tests.gd` |
| 自動遊玩煙霧測試（15 秒） | `godot --headless --path . --quit-after 900 -- --demo` |
| 錄影驗收畫面 | `godot --path . --write-movie C:\tmp\f.png --fixed-fps 60 --quit-after 420 -- --demo` |
| 匯出網頁版 | `godot --headless --path . --export-release "Web" docs/index.html`（輸出到 `docs/`，GitHub Pages 直接讀這裡） |
| 部署到手機預覽＋通知 | `powershell -ExecutionPolicy Bypass -File tools\deploy.ps1 -Message "說明"` |
| 只送通知 | `powershell -ExecutionPolicy Bypass -File tools\notify.ps1 -Title "標題" -Message "內容"` |

## 完成時一定要通知使用者（含預覽連結）
使用者常把電腦畫面開著、人卻外出，所以**每次完成都要同時送電腦和手機**，不能只靠其中一個：
1. 有改到遊戲或原型 → 跑 `powershell -ExecutionPolicy Bypass -File tools\deploy.ps1 -Message "<這次改了什麼>"`
   （測試、匯出、推上 GitHub、等網頁更新，最後同時送 Windows 通知＋手機 ntfy 推播，都附預覽連結）
2. 沒有部署的任務（文件、調查、需要決定）→ 跑 `tools\notify.ps1`，一樣會送電腦＋手機：
   `powershell -ExecutionPolicy Bypass -File tools\notify.ps1 -Title "✅ <做了什麼>" -Message "<一句摘要>"`
   有相關連結就用 `-Links` 附上（GitHub、Obsidian 位置等）
3. 失敗或需要使用者決定時，也要通知，並說明卡在哪裡
4. 另外再用 PushNotification 補送一次（Claude App；電腦畫面開著時可能會被略過，所以不能只靠它）
5. 手機推播走 ntfy，主題設定在 `tools/notify.config.json`（已排除在 git 外，不要提交、不要寫進公開檔案）

## 部署
- GitHub repo：`pinball-sling`（公開），GitHub Pages 讀 `main` 分支的 `/docs`
- 遊戲：`https://<帳號>.github.io/pinball-sling/`；調參原型：`.../pinball-sling/tuning/`
- `docs/` 是匯出產物，要 commit（Pages 靠它）；每次改程式都要重新匯出再推
