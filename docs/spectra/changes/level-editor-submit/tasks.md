## 0. 企劃確認

- [x] 0.1 企劃確認：讀過 proposal 的為什麼、改什麼、需要企劃確認的事，同意開始實作（企劃於對話中同意，2026-10-07）

## 1. 先寫會失敗的測試

- [x] 1.1 新增編輯器測試 AC-S47（Editor Submit）：改第 3 關磚牆、移動 a_pair 的中柱後，送出清單只有「第 3 關（磚牆）」和「台面 a_pair」，修改檔只含這兩項；沒改東西時說「沒有要送出的修改」。驗收：修改前執行，AC-S47 失敗
- [x] 1.2 新增編輯器測試 AC-S48（Editor Submit）：改第 5 關磚牆後重新載入編輯器，會問要不要接著改，接著改後第 5 關的修改還在。驗收：修改前執行，AC-S48 失敗
- [x] 1.5 新增編輯器測試 AC-S49（Stage Settings Editor）：設定模式把第 12 關滑板改 L、球半徑改 14，送出清單列「第 12 關（滑板、球半徑）」；球半徑打 20 時欄位顯示 8–16、送出鈕不能按。驗收：修改前執行，AC-S49 失敗
- [x] 1.3 新增 Node 測試（Apply Editor Edits、Level Table Drives Every Stage）：修改檔改第 3 關磚牆 → apply --write 後 levels.js 第 3 關是新磚牆、修改檔移到 applied/、out/關卡設定表.xlsx 第 3 列是新磚牆；中柱離磚 20 px 的修改檔被擋下、levels.js 沒變；out/ 的兩份表拿去同步沒有任何差異。驗收：修改前執行，測試失敗
- [x] 1.4 新增 Node 測試（Level Sync Checks）：套用編輯器修改後，用舊表同步，差異清單（磚牆、台面、數值欄位都算）標「⚠ 會蓋掉編輯器的修改」。驗收：修改前執行，測試失敗

## 2. 實作

- [x] 2.1 Editor Submit：編輯器「送出修改」按鈕、確認清單、寫修改檔（有登入碼直接送出，沒有就打開填好的 GitHub 新增檔案頁）、選填「這次改了什麼」。驗收：AC-S47 通過 [after: 1.1]
- [x] 2.2 Editor Submit：自動暫存與「接著改」。驗收：AC-S48 通過 [after: 1.2]
- [x] 2.7 Stage Settings Editor：編輯器「設定」模式（全部數值欄位、範圍檢查、有錯不能送出）。驗收：AC-S49 通過 [after: 1.5]
- [x] 2.3 Apply Editor Edits（Level Table Drives Every Stage）：`tools/levels/apply.js`（合併、檢查、列差異、--write 寫入＋跑測試＋搬到 applied/）與 `tools/levels/xlsx-write.mjs`（產生兩份 .xlsx）。驗收：1.3 的測試通過 [after: 1.3]
- [x] 2.4 Level Sync Checks：`sync.js` 差異清單標「⚠ 會蓋掉編輯器的修改」。驗收：1.4 的測試通過 [after: 1.4]
- [x] 2.5 CLAUDE.md、開發流文件加「套用關卡修改」；編輯器下方的說明改成新流程。驗收：照說明從頭操作一次不會卡住 [after: 2.1, 2.3]
- [ ] 2.6 【企劃】實際用一次：在手機或電腦的編輯器改一關 → 送出 → 對 AI 說「套用關卡修改」→ 把產生的關卡表換到 Google Drive [after: 2.5]

## 3. 收尾

- [x] 3.1 跑全部測試：網頁版測試頁 41/41、Node 測試 4/4、Godot 9/9 [after: 2.1, 2.2, 2.3, 2.4, 2.7]
- [ ] 3.2 部署並通知：升 `?v=`，`tools/deploy.ps1`，線上測試頁全過，手機通知附編輯器連結 [after: 3.1]
