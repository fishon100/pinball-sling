## Context

申請單 `baseline-specs` 盤點出 4 個 bug，企劃決定全部修。4 個 bug 都在遊戲流程（`game.js`、`audio.js`、`comic.js`），但現在的測試頁 `web/street/test.html` 只載入物理與規則，沒有載入遊戲本體，所以這些 bug 目前沒有任何自動測試抓得到。

## Goals / Non-Goals

**Goals:**

- 4 個 bug 都修好，各有一個「修之前會失敗、修之後會通過」的自動測試
- 測試頁多一段「遊戲流程測試」，之後的介面、流程類規則也能用它補測試

**Non-Goals:**

- 不改漫畫內容、發射力道數值、地圖版面
- 不補 `baseline-specs` 盤點出的其他缺測試（那是 `baseline-test-gaps`）

## Decisions

### Game Flow Test Harness

測試頁在看不見的框架裡開 `index.html?test=1`，用框架裡的 `SR_GAME` 操作遊戲。`?test=1` 時存檔改用另一個名字（`sprayrun.save.test`），手感調整面板的個人調整也不套用，所以跑測試不會動到玩家的存檔，也不會被個人手感調整影響。
替代方案：把遊戲邏輯拆成可單獨測的小函式 → 改動太大，而且按鍵、存檔、漫畫播放這些就是要在真的遊戲裡才測得準，所以不採用。

### Ignore Key Auto-Repeat

空白鍵的 keydown 事件帶有 `repeat` 時直接忽略，只有第一次按下才開始拉桿。

### Store Audio Toggles In Save

音效、音樂開關寫進存檔的 `save.sfx`、`save.music`（舊存檔沒有這兩個欄位時視為「開」），遊戲啟動時套用。跟震動開關（`save.vibrate`）同一個做法。

### Replay Starts At District First Stage

地圖主按鈕要開哪一關，改由 `rules.js` 的 `R.districtStartStage(save, i)` 計算：全破的街區回傳第一關，其他情況是 max(第一關, 已解鎖關)。抽成純函式，測試頁不用開遊戲就能測。

### Mark Comic Seen On Completion

漫畫播放器結束時告訴遊戲「是不是按了跳過」；遊戲只在「看完」時把那次播放的段落寫進 `save.seenComic`。

## Implementation Contract

- 行為：按住空白鍵會一路拉滿；音效、音樂開關重新整理後維持；全破街區「從頭再打一次」從第 1 關開始；跳過的漫畫下次還會播
- 介面：`R.districtStartStage(save, districtIndex) → stage number`；`SR.Comic.play(keys, done)` 的 `done(skipped)` 多一個布林參數；存檔多 `sfx`、`music` 兩個布林欄位；`index.html?test=1` 是測試模式
- 失敗情況：舊存檔沒有 `sfx`／`music` 時視為開；`?test=1` 以外的網址行為不變
- 驗收：測試頁新增 AC-S23～AC-S26 四項，修正前跑一次確認失敗、修正後通過；原本 22 項維持通過；Godot 9 項通過
- 範圍外：其他流程規則的測試、漫畫與介面的外觀

## Risks / Trade-offs

- [看不見的框架在某些瀏覽器會被暫停計時] → 測試用 `SR_GAME.tick` 手動推進時間，不依賴畫面更新
- [跳過的漫畫每次都會再播，可能讓不想看的玩家覺得煩] → 跳過按鈕一直都在；之後若企劃覺得煩，再開申請單改成「跳過兩次就不再播」
