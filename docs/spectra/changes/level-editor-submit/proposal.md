> 中文標題：關卡編輯器改完直接送出

## Why

企劃回饋：關卡編輯器改完之後「好複雜」——要按複製、貼回試算表對應的格子、匯出 .xlsx、放進資料夾、再跟 AI 說「同步關卡表」，五個步驟裡貼錯格子、忘了匯出、改到一半關掉網頁都會出錯。

企劃決定（2026-10-07）：**磚牆圖案與台面配置以編輯器為主**。編輯器改完直接送出，AI 套用、檢查、上線，再幫企劃產生最新版的關卡表。

服務的設計支柱：**每關都新鮮**（企劃改關卡更快、更敢試）。不改任何核心規則。

## What Changes

- 編輯器加「**送出修改**」按鈕：列出這次改了哪幾關、哪些台面，確認後送出成一個修改檔（`tools/levels/edits/`）
  - 這個瀏覽器有管理台的登入碼（同一個網站，會自動帶過來）→ 直接送出
  - 沒有登入碼 → 打開已經填好的 GitHub 頁面，按「Commit changes」就完成（跟管理台不登入時一樣）
- 編輯器**自動暫存**：改到一半關掉或重新整理不會不見，下次打開會問要不要接著改；送出後才清掉
- 新增 AI 指令「**套用關卡修改**」（`node tools/levels/apply.js`）：
  - 把還沒套用的修改檔依送出順序合併進關卡資料，跑跟「同步關卡表」一樣的檢查（磚放不進台面、中柱離磚太近、卡球、首領打不倒…），有問題就列出「第幾關・什麼問題」擋下
  - 列出「改了哪幾關、哪幾欄」給企劃確認 → 寫進遊戲、跑測試、部署、手機通知
  - 產生**最新版的兩份關卡表**（`tools/levels/out/關卡設定表.xlsx`、`台面配置表.xlsx`），企劃換掉 Google Drive 上的舊表，表跟遊戲就一致
- 「同步關卡表」保留，給改數值欄位用（道具池、輔助、滑板大小…）；如果表裡的磚牆或台面跟遊戲不一樣，差異清單會標「⚠ 會蓋掉編輯器的修改」讓企劃確認
- 編輯器原本的「複製」按鈕保留，當備用

## Non-Goals

- 不讓編輯器改數值欄位（道具池、輔助、滑板、球、首領數值）——這些還是在試算表改
- 不讓 AI 直接改企劃 Google Drive 上的表（目前的雲端硬碟連接器不是企劃的帳號）；改成產生新檔給企劃換
- 管理台不會自動叫 AI 套用（團隊決定：AI 一律由人下指令）

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `level-config`：「Level Table Drives Every Stage」改成磚牆與台面以編輯器送出的修改為主；新增「Editor Submit」「Apply Editor Edits」；「Level Sync Checks」加上會蓋掉編輯器修改的警告

## Impact

- Affected code:
  - Modified: web/street/editor.html, tools/levels/sync.js, tools/levels/load.js, web/street/js/tests.js, CLAUDE.md
  - New: tools/levels/apply.js, tools/levels/xlsx-write.mjs, tools/levels/edits/.gitkeep
  - Removed: （無）
- Affected specs: `level-config`

## 需要企劃確認的事

1. **編輯器只管磚牆和台面**，數值欄位（道具池、輔助、滑板大小等）還是在試算表改，改完照舊說「同步關卡表」（建議）？
2. 套用後產生的最新關卡表放在 GitHub 的 `tools/levels/out/`，AI 同時複製一份到你電腦的 `D:\ai文件\pinball-godot\tools\levels\out\`，你上傳到 Google Drive 換掉舊的（建議）？還是只要 AI 告訴你「哪幾格改了什麼」，你自己在表上改？
3. 自動暫存只存在**那台電腦的瀏覽器**（換電腦看不到還沒送出的修改），可以嗎？
4. 送出時會請你寫一句「這次改了什麼」（選填，會記在修改紀錄），可以嗎？
