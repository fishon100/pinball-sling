# CLAUDE.md — 給 AI 的專案規則

## 這是什麼
彈珠台遊戲（Godot 4.7，GDScript）。目標是「彈射感到位」。
文件的正本在 Obsidian vault（可透過 Obsidian MCP 讀寫；`specs/` 是副本，不含原始需求筆記與參考圖）：
- `遊戲開發架構/`：所有專案共用的開發流程與範本（`00 開發架構總覽`、`06 專案文件架構規範`）
- `彈珠專案/`：`00 主架構規劃書`（遊戲核心）、`01 功能規劃書/F01～F15`、`02 知識庫/`（劇情腳本、角色、街區、數值總表、名詞與命名總表）、`03 媒體庫/`（美術／音樂音效清單、參考圖）、`04 紀錄/`（開發日誌、舊版本規格、舊版文件，只看不改）、`回饋.md`（企劃試玩回饋）

## 文件規則（企劃要求，2026-10-05）
- 「看回饋」＝讀 `彈珠專案/回饋.md` 最上面的「第 N 輪」；處理完把標題改成「已處理 → 版本」並開下一輪空段落；回饋裡貼的圖搬到 `03 媒體庫/參考圖/`，改成 `類別-內容.png` 並更新連結
- **改一個功能只改那份功能規劃書**（含修改紀錄）；新增功能要新增規劃書並加進主架構規劃書的索引與名詞與命名總表
- **單一來源**：劇情＝`02 知識庫/劇情/劇情腳本`（對應 `data.js` 的 `SR.COMICS`）、角色＝角色卡、數值＝`數值總表`（對應 `tuning.js`）、名詞＝`名詞與命名總表`。其他文件用 `![[ ]]` 嵌入，不重抄。企劃說「同步 <檔名>」→ 把文件內容套用到程式並跑相關測試；程式改了這些內容 → 回寫到對應的知識庫文件
- 「套用調參」＝企劃從遊戲內手感調整面板（`web/street/js/tune.js`，暫停 → 🎚 手感調整）複製的「參數：原 → 新」清單。寫進 `tuning.js` 的 `STREET_TUNING`（**不要改 `data/tuning.json`**，那是 Godot v2 共用、會動到 AC1–AC13），更新 `數值總表`，跑 22 項測試＋擬人玩家難度，數字有變就更新 F15
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
- **完整設計以 Obsidian `彈珠專案/00 主架構規劃書` ＋ `01 功能規劃書/` 為準**（見上方「文件規則」）
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
