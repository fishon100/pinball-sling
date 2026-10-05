# opening-animation 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| First launch shows the coin screen | 缺測試：清掉 localStorage `sprayrun.save.v1` 後重新載入，檢查 `SR_GAME.G.screen==="opening"`、`G.op.phase==="coin"` | game.js 啟動段 `if (!save.seenOpening) openingScreen()` |
| Later launch skips the opening | 缺測試：存檔寫入 `seenOpening:true` 後重新載入，檢查 `G.screen==="title"` | game.js 啟動段 |
| Finishing marks the opening as seen | 缺測試：`openingScreen()`→`openingTap()`→`tick(1/60)` 推進 7 秒，檢查 `save.seenOpening===true`、`G.screen==="title"` | game.js `tickOpening`、`finishOpening` |
| Coin screen waits for input | 缺測試：`openingScreen()` 後推進 10 秒不點，檢查 `G.op.phase==="coin"` | game.js `tickOpening`（coin 階段直接 return） |
| Tap inserts the coin | 缺測試：coin 階段呼叫 `openingTap()`，檢查 `G.op.phase==="play"`、`G.op.t===0`（音效與震動需人工確認） | game.js `openingTap` |
| Sound and vibration cues follow the timeline | 缺測試：推進到 1.3／4.4／5.3 秒，分別檢查 `G.op.lit`、`G.op.slam`、`G.op.pop` 為 true，之前為 false | game.js `tickOpening` |
| Paint splat count over time (example) | 缺測試：推進到 2.0／3.0／4.0／4.2 秒，檢查 `G.op.splats` 為 0／7／25／28 | game.js `tickOpening` |
| Splats are accompanied by brick sounds | 不需測試：音效與震動的實際感受需人工試玩（觸發條件與 splat 計數同一段程式） | game.js `tickOpening` |
| Automatic exit at 7 seconds | 缺測試：同「Finishing marks the opening as seen」，另檢查 6.9 秒時仍在 opening | game.js `OP_DUR = 7` |
| Early tap is ignored | 缺測試：投幣後推進 0.5 秒呼叫 `openingTap()`，檢查仍在 opening | game.js `openingTap`（`op.t > 0.8`） |
| Later tap skips | 缺測試：投幣後推進 1.5 秒呼叫 `openingTap()`，檢查 `G.screen==="title"`、`seenOpening===true` | game.js `openingTap`、`finishOpening` |
| Replay button restarts the opening | 缺測試：標題畫面點 `#goOpening`，檢查 `G.screen==="opening"`、`G.op.phase==="coin"`、`G.attract===false` | game.js `titleScreen`、`openingScreen` |

## 文件與程式不一致

- F01「點一下＝投幣」「播放中點一下可跳過」只寫點擊：程式**按鍵盤任意鍵**也等同點一下（投幣或跳過）。
- F01 驗收寫「第一次進遊戲播放、之後直接到標題」打勾，但 tests.js 22 項沒有任何開場測試，目前只靠人工實測。
- 程式註解寫「老彈珠台：1.0 秒起亮起來」，實際程式是 1.2 秒（與 F01 一致，僅註解過時）。
