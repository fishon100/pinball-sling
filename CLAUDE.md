# CLAUDE.md — 給 AI 的專案規則

## 這是什麼
彈珠台遊戲（Godot 4.7，GDScript）。目標是「彈射感到位」。
規格的正本在 Obsidian vault 的 `彈珠專案/` 資料夾（可透過 Obsidian MCP 讀寫；`specs/` 是副本）。

## 開發流程（SDD + TDD）
1. 先讀 `specs/` 的規格與驗收條件（AC）
2. 新功能先在 `tests/run_tests.gd` 加測試，再實作
3. 每次改動後都要跑測試，全過才算完成：
   ```
   godot --headless --path . --script res://tests/run_tests.gd
   ```
4. 完成後更新 Obsidian `彈珠專案/05 開發日誌.md`

## 規則
- 手感數值一律讀 `data/tuning.json`，禁止寫死在程式裡
- 物理在 `scripts/pinball_physics.gd`，與網頁原型 `tools/tuning-prototype/index.html` 演算法一一對應；改一邊就要同步改另一邊，兩邊的 AC1–AC5 測試數值要相同
- 不使用 Godot 內建 RigidBody2D 做球與擋板（要精準控制擋板線速度）
- 新增或移動任何台面元件後，AC13（無卡球死角）一定要通過；卡球點要用導球片或調整位置修掉，不能放寬測試
- 規則（模式、狂熱、球保險）在網頁版 `index.html` 與 Godot `scripts/main.gd` 各有一份，改一邊要同步另一邊
- 美術目前是程式繪製的占位圖形；正式資產放 `assets/`，命名 `物件_狀態.png`
- 改了規格要同步更新 Obsidian 的對應文件

## v3 噴漆闖關（`web/street/`，網頁版，部署在 `/street/`）
- 規格：Obsidian `彈珠專案/08 遊戲規格 v3-噴漆闖關`；素材提示詞：`09`
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
