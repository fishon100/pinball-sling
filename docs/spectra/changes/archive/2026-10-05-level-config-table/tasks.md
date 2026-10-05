## 1. 先寫測試（修改前要失敗）

- [x] 1.1 新增 AC-S36（First Table Reproduces The Game）：用 `SR.LEVELS` 建的 50 關，跟 `SR.generateStage(n)` 與 v3.7.1 每區函式產生的格子、台面、滑板、球、拖尾、輔助、首領、標準時間完全相同。驗收：修改前執行，AC-S36 失敗（沒有 `SR.LEVELS`）
- [x] 1.2 新增 AC-S37（Level Sync Checks）：`SR.LevelCheck.validate` 對正確的表回報 0 個問題；對故意填壞的表（滑板 Q、磚血 9、球半徑 7、道具池 lazer、未知台面、首領關沒有 X、一般關有 X、排不是 9 個字）逐一列出「第幾關・哪一欄・問題」。驗收：修改前執行，AC-S37 失敗
- [x] 1.3 新增 AC-S38（Level Table Drives Every Stage、Brick Wall Codes、Item Pool Per Stage）：複製一份表，第 12 關改大滑板、第一排 "333333333"、道具池 wide，其他關不變；純數字排讀成 9 個字；".1G.B..5." 變成對的格子。驗收：修改前執行，AC-S38 失敗
- [x] 1.4 Tests Split Into Blocking And Report：測試頁支援「報告」項目（另外一區顯示、不算進失敗）；AC-S17、AC-S20、AC-S29、AC-S30、AC-S34 改成報告，AC-S19 的相鄰台面與 AC-S28 的條數拆成報告。驗收：測試頁出現「報告」區，會擋的測試數量與原本相同或更多

## 2. 讀表

- [x] 2.1 Resolved Grids Per Stage 與 First Table Reproduces The Game：`tools/levels/export.js` 用原公式產生第一版 `web/street/js/levels.js`；原公式改名 `SR.generateStage`。驗收：AC-S36 通過 [after: 1.1]
- [x] 2.2 Level Table Drives Every Stage：`SR.buildStage(n)` 改讀 `SR.LEVELS`（Fifty Stages In Five Districts、Brick Hit Points、Gift Bricks、Boss Spawn And Stats、Brick Wall Codes）。驗收：AC-S36、AC-S38 的磚牆部分通過，AC-S6 通過 [after: 2.1, 1.3]
- [x] 2.3 台面配置照表（Layout Rotation Per Stage、Pop Bumpers、Fish Bumper A-Fin、Rubber Rails、Boost Pads）：`SR.layoutFor(n)` 與台面幾何改讀 `SR.LEVELS.layouts`。驗收：AC-S7、AC-S19、AC-S27、AC-S28 通過 [after: 2.1]
- [x] 2.4 每關數值照表（Paddle Sizes、Ball Size Per District、Ball Trail By District、Per-District Assist Schedule）：`SR.paddleSizeFor`、`SR.ballRadiusFor`、`SR.trailFor`、`R.assistsFor` 改讀表。驗收：AC-S38 的滑板部分通過、AC-S30 報告與原本一致 [after: 2.1]
- [x] 2.5 Item Pool Per Stage：道具膠囊的道具從該關道具池抽。驗收：AC-S38 的道具池部分通過、AC-S33 通過 [after: 2.2]

## 3. 同步與編輯器

- [x] 3.1 Level Sync Checks 與 Sync Blocks Only Breaking Problems：`web/street/js/levelcheck.js`（欄位、範圍、字元、首領位置檢查）。驗收：AC-S37 通過 [after: 1.2]
- [x] 3.2 Sync Downloads CSV And Shows The Diff：`tools/levels/sync.js` 讀 `tools/levels/in/` 的兩份 CSV（base64）→ 檢查 → 跟目前 `levels.js` 比對列出差異 → 寫出新的 `levels.js`；`tools/levels/in/` 不進 git。驗收：用 Drive 實際下載兩份表執行一次，0 個問題、差異 0 關 [after: 3.1, 2.1]
- [x] 3.3 Brick Pattern Editor 與 Pattern Editor Copies Back To The Sheet：`web/street/editor.html`。驗收：手機與電腦截圖；選第 12 關、點格子、複製出的文字是 tab 分隔的 8 排 [after: 2.2]

## 4. 難度改成報告

- [x] 4.1 Balance Difficulty Targets 與 Rising Difficulty Measured At Human Speed：AC-S20、AC-S29 顯示數字與設計目標，標成報告；AC-S8b（首領打得倒）維持會擋。驗收：測試頁報告區顯示第 1～5 區的數字 [after: 1.4]

## 5. 收尾

- [x] 5.1 `CLAUDE.md` 新增「同步關卡表」流程與 Google Sheet Is The Planner Source 的 Drive 檔案 ID；`?v=` 升版；測試頁全部會擋的測試通過；`tools/deploy.ps1` 部署；線上測試頁通過。驗收：線上測試頁會擋的測試全過，報告區有數字 [after: 2.3, 2.4, 2.5, 3.2, 3.3, 4.1]
