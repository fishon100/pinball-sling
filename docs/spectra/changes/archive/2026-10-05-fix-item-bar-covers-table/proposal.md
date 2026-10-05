> 中文標題：手機上道具欄蓋住台面

## Problem

手機上，道具欄出現後會蓋住台面最下面一段（約 30 px），剛好是發射桿和滑板線的位置，畫面變得很擠、看不清楚；道具按鈕的名字也被擠成兩行（例如「慢動／作」）。

## Root Cause

台面的大小只在遊戲啟動和視窗大小改變時計算（`game.js` 的 `fit()`）。道具欄是在進入第 2 區的關卡（或拿到道具）時才顯示，顯示後可用的高度變小了，但台面沒有重新計算大小，所以台面超出可用空間、被道具欄蓋住。道具按鈕本身也偏高（約 58 px），名字沒有限制成一行。

## Proposed Solution

- 台面所在區域的大小一改變（包含道具欄出現或消失）就重新計算台面大小，台面永遠不會跟上方資訊列或下方道具欄重疊
- 道具欄改成精簡的一行：圖示＋名字不換行、按鈕變矮，把空間留給台面

## Non-Goals

- 不改道具的效果、數量與取得方式
- 不改桌機版面配置以外的介面

## Success Criteria

- 新增自動測試 AC-S32：在 390×680 的畫面進入第 12 關（有道具），台面不和道具欄、上方資訊列重疊；修正前失敗、修正後通過
- 其他測試全部維持通過；手機截圖確認道具名字一行顯示

## Impact

- Affected code:
  - Modified: web/street/js/game.js, web/street/index.html, web/street/js/tests.js, web/street/test.html
  - New: （無）
  - Removed: （無）
- Affected specs: `power-ups-and-items`
