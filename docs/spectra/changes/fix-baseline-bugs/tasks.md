## 1. 遊戲流程測試（Game Flow Test Harness）

- [x] 1.1 Game Flow Test Harness：測試頁 `web/street/test.html` 在看不見的框架開 `index.html?test=1` 並執行 `SR.Tests.GAME_TESTS`；`?test=1` 時存檔用 `sprayrun.save.test`、不套用手感調整面板的個人數值。驗收：測試頁出現「遊戲流程」一段；跑完後玩家存檔 `sprayrun.save.v1` 內容沒變

## 2. 發射桿：按住空白鍵（Plunger Keyboard Charge）

- [x] 2.1 新增測試 AC-S23：力道 0.6 時送出帶 repeat 的空白鍵按下，力道不歸零。驗收：修正前執行，AC-S23 失敗 [after: 1.1]
- [x] 2.2 Ignore Key Auto-Repeat（Plunger Keyboard Charge）：空白鍵重送訊號不再重新拉桿。驗收：AC-S23 通過 [after: 2.1]

## 3. 音效音樂開關（Audio Sound And Music Toggles）

- [x] 3.1 新增測試 AC-S24：關掉音樂後重新載入遊戲，音樂仍是關。驗收：修正前執行，AC-S24 失敗 [after: 1.1]
- [x] 3.2 Store Audio Toggles In Save（Audio Sound And Music Toggles）：開關寫進 `save.sfx`／`save.music`，啟動時套用，舊存檔視為開。驗收：AC-S24 通過 [after: 3.1]

## 4. 地圖「從頭再打一次」（UI Map And Stage Select）

- [x] 4.1 新增測試 AC-S25：`R.districtStartStage` 在已解鎖 1／6／11／51 時，第 1 區分別回傳 1／6／1／1。驗收：修正前執行，AC-S25 失敗
- [x] 4.2 Replay Starts At District First Stage（UI Map And Stage Select）：地圖主按鈕改用 `R.districtStartStage`。驗收：AC-S25 通過 [after: 4.1]

## 5. 漫畫跳過（Story Playback Schedule）

- [x] 5.1 新增測試 AC-S26：第 1 關前的 intro 按跳過後 `save.seenComic.intro` 不存在；看完則存在。驗收：修正前執行，AC-S26 失敗 [after: 1.1]
- [x] 5.2 Mark Comic Seen On Completion（Story Playback Schedule）：`SR.Comic.play` 的結束回呼帶出是否跳過，只有看完才寫入看過。驗收：AC-S26 通過 [after: 5.1]

## 6. 收尾

- [ ] 6.1 全部測試通過並部署：`index.html`、`test.html` 的 `?v=` 升到 3.6.2，測試頁 26 項全過、Godot 9 項全過，用 `tools/deploy.ps1` 部署，線上測試頁也 26/26。驗收：線上測試頁顯示 26/26 [after: 2.2, 3.2, 4.2, 5.2]
