# game-ui 測試覆蓋

`tests.js` 目前 22 個測試都是物理／規則／資料測試，沒有一個開畫面或按按鈕，所以介面情境全部沒有自動測試。下列提案都可以用 `window.SR_GAME`（`G`、`save`、`goStage`、`mapScreen`、`tick` 等）在遊戲頁上寫。

| 情境 | 結果 | 依據 |
|---|---|---|
| First launch shows the opening | 缺測試：清空 `sprayrun.save.v1` 重新載入，檢查 `G.screen==="opening"`；呼叫 `openingTap()` 後 tick 7 秒，檢查 `G.screen==="title"` 且 `save.seenOpening` | `game.js` 啟動段、`tickOpening`、`finishOpening` |
| Later launches skip the opening | 缺測試：存檔 seenOpening=true 載入，檢查 `G.screen==="title"` | `game.js` 啟動段 |
| Skip the opening | 缺測試：`openingTap()` 後 tick 1 秒再 `openingTap()`，檢查到標題 | `game.js` `openingTap`（t>0.8） |
| Pick an already cleared stage | 缺測試：save.unlocked=7 開地圖點 `[data-n="3"]`，檢查 `G.stage.n===3`、`G.run.hearts===3` | `game.js` `mapScreen`、`startDistrict` |
| Locked stage cannot be picked | 缺測試：save.unlocked=7 開地圖，檢查 `[title="第 8 關"]` disabled、第 2 區卡片含「尚未解鎖」 | `game.js` `mapScreen`、`rules.js` `districtUnlocked` |
| District card main button（Example） | 缺測試：unlocked=1／6／11 各開一次地圖，檢查第 1 區主按鈕文字與 `data-n`（1／6／10） | `game.js` `mapScreen`（nextN） |
| Pause freezes the table | 缺測試：遊玩中送 Escape，記下球位置，tick 1 秒後位置不變、`#screen` 顯示 PAUSE | `game.js` `togglePause`、`tick`（`!G.paused`） |
| Pause is unavailable outside play | 缺測試：在地圖與關卡開場（`G.screen==="intro"`）送 Escape，檢查 `G.paused` 仍為 false | `game.js` `togglePause` |
| Retry keeps the run | 缺測試：過第 4 關後記下 hearts／score，點 `#retryBtn`，檢查同一關、數值不變、`SR.Comic.active()` 為 false | `game.js` `stageResult`、`goStage({replay:true})` |
| Boss stage result | 缺測試：過第 10 關後檢查沒有 `.reward`、`#nextBtn` 文字為「繼續」；點下去後 `closeDialog()`，檢查畫面含「ALLEY」「FREE!」 | `game.js` `afterClear`、`districtCleared` |
| Continue halves the score | 缺測試：`G.run.score=1235; G.run.hearts=0` 觸發 `runOver`，點 `#cont`，檢查 score 617、hearts 3、`G.continued` | `game.js` `runOver`、`rules.js` `continueRun`；AC-S22 只驗證續關時 `stars()` 回傳銅牌 |
| Switch to flippers | 缺測試：開操作頁點 `[data-c="flipper"]`，檢查 `save.control`、按鈕含「（使用中）」，下一關 `G.world.flippers.length===2` 且沒有 paddle | `game.js` `controlScreen`、`control()` |

## 文件與程式不一致

- F12 的 U-pause 只列「繼續／音效／音樂／震動／放棄回地圖」：程式還有「🎚 手感調整（邊玩邊調）」（F15 有寫，F12 沒寫）；按下後面板打開、遊戲直接繼續。
- 地圖第 1 區打完後主按鈕寫「從頭再打一次」，但程式實際開始的是第 10 關（首領關），不是第 1 關（`nextN = min(s1, max(s0, unlocked))`）。看起來是程式的問題，規格照程式寫。
- F12 結算寫「重玩這關」：程式是用同一輪重來（保留過關後回的愛心、這關剛抽到的強化與分數），而且不播關前漫畫，文件沒寫。
- F12 流程圖「愛心用完 → 續關」：續關畫面另有「整區重來」，F12 畫面表有列，流程圖沒畫。
- 從地圖中間選關時，程式會依跳過的關數模擬抽強化，文件 U-map 沒寫（只寫「點格子直接選關」）。
