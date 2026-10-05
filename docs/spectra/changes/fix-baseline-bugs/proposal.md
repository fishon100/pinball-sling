## Problem

盤點現有遊戲（申請單 `baseline-specs`）時發現 4 個 bug，企劃決定全部修正：

1. 電腦上按住空白鍵拉發射桿，常常拉不滿、甚至發射不出去
2. 音效、音樂開關重新整理後不會記住，每次都回到「開」
3. 已經全破的街區，地圖上的「從頭再打一次」會從第 10 關（首領關）開始
4. 第一次看漫畫時按「跳過」，也被記成「看過」，之後不會再自動播放

## Root Cause

1. 按住按鍵時，作業系統會一直重送「按下」訊號；遊戲每收到一次就把力道歸零重拉（`game.js` 的 keydown 沒有分辨重送）
2. 兩個開關只存在記憶體（`audio.js` 的 `sfxOn`／`musicOn`），沒有寫進存檔
3. 地圖主按鈕的關卡公式是 min(最後一關, max(第一關, 已解鎖關))；全破時已解鎖關大於最後一關，結果就是最後一關（首領關）
4. 漫畫一開始播放就寫入「看過」（`playStory`），而且漫畫播放器雖然知道按了跳過，卻沒有把這件事告訴遊戲

## Proposed Solution

1. 空白鍵的重送訊號不再重新拉桿；按住會一路拉滿
2. 開關狀態寫進存檔（`save.sfx`、`save.music`），開遊戲時套用
3. 全破的街區按「從頭再打一次」從該區第 1 關開始；其他情況維持原本公式
4. 漫畫完整看完才記成「看過」；按跳過不記，下次還會自動播放

## Non-Goals

- 不改漫畫內容、發射力道、地圖版面
- 不處理其他「文件與程式不一致」的項目

## Success Criteria

- 新增 4 個自動測試，修正前會失敗、修正後通過
- 測試頁原本 22 項＋新的測試全部通過

## Impact

- Affected code:
  - Modified: web/street/js/game.js, web/street/js/audio.js, web/street/js/comic.js, web/street/js/rules.js, web/street/js/tests.js, web/street/test.html, web/street/index.html
  - New: （無）
  - Removed: （無）
- Affected specs: `plunger-launch`, `audio-and-haptics`, `game-ui`, `comics-and-story-replay`
