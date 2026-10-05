## Why

現在每一關的磚塊圖案、磚血、道具磚數量、台面配置、滑板與球的大小、首領數值，全部由程式裡的公式自動產生（`SR.buildStage`、`SR.layoutFor`、`SR.paddleSizeFor`…）。企劃想調某一關，只能請 AI 改公式，而且一改就影響很多關。正式的遊戲開發是由企劃逐關調配，所以要把這些數值搬到企劃自己能編輯的「關卡設定表」，程式只負責照表演出。

## What Changes

- 新增 **關卡設定表**（Google 試算表，放在團隊的 Google Drive）：一關一列，企劃逐關填寫磚塊圖案、道具、難度元件、首領數值
- 新增 **磚塊圖案編輯器**（網頁）：在 9 欄格子上點選畫出這一關的磚（血量 1～5、油漆桶、道具磚），畫好複製回試算表
- 遊戲改成讀關卡設定表的匯出檔（`web/street/levels.json`），不再用公式產生關卡
- 企劃說「**同步關卡表**」：AI 讀試算表 → 檢查「不能壞掉的規則」（不卡球、柱子不貼磚、磚放得進台面、首領打得倒、數值在合理範圍）→ 跑測試 → 部署
- 第一版關卡表 = 目前遊戲的 50 關，換成讀表後遊戲玩起來完全一樣
- **BREAKING** 難度目標（第 1 區新手每關 ≤ 1 顆、每區越來越難）改成「只報告、不擋部署」，難度由企劃試玩判斷

## Non-Goals

- 不改遊戲玩法、物理與操作
- 不做線上即時改表（遊戲執行時直接讀試算表）：改表一定要經過「同步 → 檢查 → 部署」
- 不做劇情、美術、音樂的表格（另開申請單）

## Capabilities

### New Capabilities

- `level-config`: 關卡設定表、磚塊圖案編輯器、同步與檢查流程

### Modified Capabilities

- `bricks-and-stages`: 關卡、磚塊圖案、磚血、道具磚改由關卡設定表決定
- `boss-mr-grey`: 首領血量、速度、補磚間隔改由關卡設定表決定
- `table-layout`: 每關用哪個台面配置改由關卡設定表決定
- `paddle-control`、`core-game-loop`、`art-presentation`、`newbie-assist`: 滑板大小、球大小、拖尾長度、輔助改成每關由表格決定
- `difficulty-balance`: 難度目標改成報告，不擋部署

## Impact

- 程式：`web/street/js/data.js`（改成讀表）、新增 `web/street/levels.json`、新增 `web/street/editor.html`、`web/street/js/tests.js`（同步檢查）
- 外部工具：Google 試算表「噴漆闖關 關卡設定表」（Google Drive）
- 流程：`CLAUDE.md` 新增「同步關卡表」規則
- 先決條件：申請單 `short-tables-all-districts`、`item-capsules` 先歸檔，本申請單的規則書差異以歸檔後的正式規則書為基準
