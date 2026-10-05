## Problem

滑板模式下，球在發射道時按住畫面往下拉發射桿，滑板也會跟著手指（或滑鼠）左右移動。玩家只是想發射，滑板卻被拉走，發射後常常接不到第一球。

## Root Cause

`game.js` 的按下（pointerdown）在滑板模式一律把滑板目標設成按下的位置，而移動（pointermove）也一律讓滑板跟著指標走；兩段都沒有檢查「這根手指正在拉發射桿」。

## Proposed Solution

正在拉發射桿的那根手指（或滑鼠）不控制滑板：按下開始拉桿時不移動滑板，拉的過程中移動也不帶動滑板。放開（發射或沒拉夠）之後，滑板恢復跟著指標走。其他手指（多指觸控）仍然可以控制滑板。

## Non-Goals

- 不改發射力道、拉桿距離、經典擋板模式的操作
- 不改鍵盤操作（空白鍵拉桿時方向鍵本來就能移動滑板）

## Success Criteria

- 新增自動測試 AC-S31：修正前失敗、修正後通過
- 其他測試全部維持通過

## Impact

- Affected code:
  - Modified: web/street/js/game.js, web/street/js/tests.js, web/street/index.html, web/street/test.html
  - New: （無）
  - Removed: （無）
- Affected specs: `paddle-control`
