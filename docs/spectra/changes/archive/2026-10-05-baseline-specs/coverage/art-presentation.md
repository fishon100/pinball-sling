# art-presentation 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Flippers visible whenever action is needed | 已有測試：AC-S5（24 顆隨機球、隨機鏡頭起點，需要操作時檢查 `flippersVisible`） | `tests.js` AC-S5；`physics.js` `cameraTarget`、`updateCamera`。注意 AC-S5 只用擋板模式，滑板模式（滑板線 y=948）沒有被測，可補同樣的測試改成 `buildTable(T, {}, null, "paddle")` 並檢查 `camY + 740 ≥ 948 + 滑板半高` |
| District 1 never scrolls | 缺測試：對第 1 區用到的每一種台面（不只第一種）放隨機球跑 `updateCamera`，檢查 cam.y 恆為 320 | AC-S19 只檢查 `DISTRICT_LAYOUTS[0][0]` 的 top ≥ CAM_MAX，沒有檢查其他配置與實際鏡頭 |
| Skip the intro | 缺測試：`goStage(2)`（看過漫畫）tick 0.5 秒後送 pointerdown，再 tick 0.3 秒，檢查 `G.screen==="play"` | `game.js` canvas `pointerdown`、`tickCine` |
| Clear cinematic timing | 缺測試：把 `G.world.bricks` 只留 1 塊後打破（或直接呼叫清關流程），tick 2.6 秒後檢查 `G.screen==="result"`；用計數 hook 檢查 `G.cine.splatted===70` | `game.js` `onCleared`、`tickCine` |
| Splats survive a ball loss | 不需測試：噴漆畫在 `G.paint` 圖層上，掉球流程完全不碰這個圖層；需人工試玩看畫面 | `game.js` `burstPaint`、`ballLost` |
| Splats reset on a new stage | 缺測試：重玩前後比較 `G.paint` 是不是新的 canvas 物件（`newPaintLayer`） | `game.js` `goStage` → `newPaintLayer` |

## 文件與程式不一致

- F13 驗收寫「AC-S5 需要操作時滑板／擋板一定在畫面內」：AC-S5 實際只測擋板模式，沒有測滑板。
- F13 寫「需要操作時一定看得到滑板／擋板」：程式判斷「需要操作」的條件是球在發射道、y>660，或往下掉且 y>540（`cameraTarget`），AC-S5 的判斷條件比較窄（發射道或 y>660 且往下），兩者不完全一樣。
- 美術風格指南寫「黃色滑板」，F13 寫「粉紅 SHOOT! 膠囊」：兩份文件彼此不一致（屬外觀，不寫進規格）。
