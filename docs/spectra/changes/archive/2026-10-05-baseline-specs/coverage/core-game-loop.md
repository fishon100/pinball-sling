# core-game-loop 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Any open stage can be selected from the map | 缺測試：用 `SR_GAME.startDistrict(0, 5)` 開第 5 關，檢查 `G.run.hearts===3`、`G.stage.n===5`、強化數＝4 | game.js `mapScreen`、`startDistrict` |
| Comic plays before a stage only when due | 缺測試：清空 `save.seenComic` 後 `goStage(1)` 應進入漫畫；`goStage(1,{replay:true})` 應直接到 intro | game.js `goStage`、`playStory` |
| Stage intro can be skipped | 缺測試：intro 中送一次 pointerdown／keydown，檢查 `G.cine.t >= 2.05`，下一幀 `G.screen==="play"` | game.js `pointerdown`／`keydown`、`tickCine` |
| Clearing a normal stage grants an upgrade and offers choices | 缺測試：清空第 3 關所有磚後推進 2.6 秒，檢查畫面有 nextBtn／retryBtn／mapBtn 且強化數 +1 | game.js `onCleared`、`afterClear`、`stageResult` |
| Clearing a boss stage ends the district | 缺測試：第 10 關把首領 hp 設 0，推進後按 nextBtn，檢查 `G.screen==="districtDone"`、強化數不變、道具 +2（未滿時） | game.js `afterClear`、`districtCleared` |
| Ball at maximum speed does not tunnel | 已有測試：AC-S4 | tests.js AC-S4（32 方向 2600 px/s 不穿牆） |
| Ball speed never exceeds the cap | 缺測試：網頁版加一個隨機擊球 20 秒、記錄最高速 ≤ 2600 的測試（Godot v2 有 run_tests.gd AC6，但網頁版沒有對應） | physics.js `substep` 速度上限 |
| Ball hitting a brick bounces and damages it | 已有測試：AC-S1 | tests.js AC-S1 |
| Largest ball drains through the center in flipper mode | 已有測試：AC-S9c | tests.js AC-S9c（半徑 16.5 的球從 (185,880) 掉得下去） |
| Paddle mode has no bottom obstacles | 缺測試：AC-S21 只檢查沒有 sling 線段；補一條檢查滑板模式 `circles` 沒有 kind==="post"、左牆從 200 直到底 | physics.js `buildTable` |
| Ball missed by the paddle drains | 缺測試：滑板停在 x=60，從 (300, 880) 放球，3 秒內應有 drain 事件 | physics.js `buildTable`（滑板模式） |
| Only the drained ball is removed in multiball | 已有測試：AC-S3 | tests.js AC-S3 |
| Normal stage clears on last brick | 缺測試：AC-S8 只檢查磚數歸零；補一條在遊戲中打碎最後一塊後 `save.unlocked` 增加、`G.cine.type==="clear"` | rules.js `isCleared`、game.js `onCleared` |
| Boss stage clears on boss defeat | 已有測試：AC-S8b | tests.js AC-S8b（以 `isCleared` 判定首領被打倒） |
| Stage 1 is clearable by the auto player | 已有測試：AC-S8 | tests.js AC-S8 |
| Drain outside ball save costs a heart | 缺測試：球保險 0 時讓最後一顆球掉落，檢查 `G.run.hearts` 減 1、發射道有新球 | game.js `ballLost` |
| Drain inside ball save is free | 缺測試：發射後立即讓球掉落，檢查愛心不變、`G.ballSave===0` | game.js `ballLost`、rules.js `ballSaveTime` |
| Launch ball save length (example) | 缺測試：`ballSaveTime(T, run, assistsFor(n))` 第 1、11、21 關分別等於 6／4.5／3 秒 | rules.js `ballSaveTime` |
| Clearing restores a heart up to 5 | 缺測試：`heartOnClear` 從 5 不超過 5、從 2 變 3；第 10 關過關愛心不變（AC-S9b 只測補一罐的上限） | rules.js `heartOnClear`、game.js `onCleared` |
| Continue after game over | 缺測試：`continueRun` 後 hearts＝3、分數減半；續關過關 `stars(...,true)===1`（銅牌部分已在 AC-S22） | rules.js `continueRun`、`stars` |
| Tables grow taller by district | 已有測試：AC-S19 | tests.js AC-S19 |
| Assists shrink by district | 缺測試：逐區檢查 `SR.DISTRICTS[i].assists` 的 preview／timing／ballSave／finisher 數值遞減 | data.js `SR.DISTRICTS` |
| Boss stages use the small paddle | 已有測試：AC-S21 | tests.js AC-S21（`paddleSizeFor(3)==="M"`、`paddleSizeFor(10)==="S"`） |
| District 1 is beginner-friendly at human speed | 已有測試：AC-S20 | tests.js AC-S20（HUMAN.novice、滑板、9 關 × 5 局） |
| Comic text follows fairy-tale rules | 已有測試：AC-S16 | tests.js AC-S16 |
| HUD hides act labels | 缺測試：每個街區開一關，檢查 `#stageChip` 文字不含「起承轉合」任一字 | game.js `updateHud` |

## 文件與程式不一致

- 主架構「過關回 1 顆（最多 5）」：程式只在**一般關卡**回愛心，首領關（每區第 10 關）過關不回（game.js `onCleared` 的 `n % 10 !== 0`）。
- 主架構核心循環「過關：獎牌＋抽一罐強化」：首領關過關**不抽強化**，改成街區解放畫面送 2 個隨機道具。
- 主架構核心規則 2「掉下去就扣愛心」沒寫例外：程式有發射後球保險（基本 3 秒＋第 1 區 3 秒／第 2 區 1.5 秒＋保險罐每級 3 秒）與道具「球保險」10 秒，期間掉球不扣愛心。
- 主架構核心規則 4「用完可投幣續關」沒寫代價：程式續關＝分數減半、這關最多銅牌、保留強化、愛心回 3 顆。
