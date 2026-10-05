# bricks-and-stages 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Boss only on every 10th stage | 已有測試：AC-S6 | 50 關逐一檢查 `(n % 10 === 0) === !!w.boss`，並檢查每關有磚或首領 |
| Stage generation is repeatable | 缺測試：對 1～50 關各呼叫兩次 `SR.buildStage(n)`，比對 cells 的 JSON 完全相同 | data.js `SR.rng(n*7919+13)` |
| Pattern choice by stage | 缺測試：檢查 `buildStage(1/9/11/21/41).name` 分別是 HI／堡壘／箭頭／棋盤／:)，第 30 關是「首領：灰先生」 | data.js `SR.buildStage` 選圖案公式 |
| Extra rows in later districts | 缺測試：第 21、31、41 關最大列號 = 圖案列數 − 1 + 1／2／3 | data.js 額外排 `min(3, d-1)` |
| All 50 stages fit their tables | 已有測試：AC-S6 | 檢查被圓弧切掉不超過 4 成、磚到牆距離 ≥ 2 px |
| No bonus HP on the first stage | 缺測試：第 1 關每個 brick cell 的 hp 等於 HI 圖案的數字（1） | data.js 加成機率 `d*0.14+local*0.025` 在第 1 關為 0 |
| Late districts never exceed base plus one | 缺測試：第 31～49 關每塊磚 hp 介於 max(1, 數字−1) 與數字之間 | data.js `if (d >= 3 && hp > 1) hp--` |
| Two hits destroy a 2 HP brick | 已有測試：AC-S1 | 2 血磚第 1 擊後血 1 且球反彈（vy > 0），第 2 擊後磚消失 |
| Slow touches do not damage | 缺測試：以 50 px/s 法向速度碰磚，檢查 hp 不變、反彈速度 = 180 | physics.js `min_hit_speed 60`、`min_bounce 180` |
| Bucket damages its neighbors | 缺測試：放一個油漆桶與周圍 8 塊 1 血磚，打碎油漆桶後 8 塊全部消失 | physics.js `damageBrick` 的 bucket 分支 |
| Gift count by district | 缺測試：統計 1～50 關 `type === "gift"` 數量：1～10 關 0、一般關 1～2、首領關 ≤ 1 | data.js 道具磚段落 |
| Last brick clears the stage | 缺測試：純函式部分可測 `Rules.isCleared` 與 `Rules.heartOnClear`（3→4）；解鎖下一關在 game.js `onCleared`，需人工試玩或把它抽成純函式 | rules.js `isCleared`、`heartOnClear`；game.js `save.unlocked` |
| Hearts are capped at five | 缺測試：`heartOnClear` 在 5 顆時呼叫後仍是 5 | rules.js `heartOnClear` |
| Boss stage clears on boss defeat | 缺測試：首領關把 `world.boss.alive` 設 false、其他磚還在，`isCleared` 回傳 true；「剩下的磚一起碎掉、不回愛心」在 game.js，需人工試玩 | rules.js `isCleared`；game.js `onCleared` |

## 文件與程式不一致

- F06 寫「打碎全部**灰磚**就過關」：程式要求場上**所有**活著的磚（含油漆桶、道具磚、首領補的磚）都碎掉才過關；首領關則只要打倒灰先生，剩下的磚自動碎掉。
- F06 只寫道具磚「每關 1～2 塊」：首領關固定只換 1 塊（而且要有 1 血磚可換）。
- F06 列出 `B-grey` 有「裂痕與血量點」等外觀，本規格不列（純外觀）。
- 數值總表的「磚塊」只列反彈 0.85／最低反彈 180／最低有效撞擊 60／分數 10，程式另外有「同一顆球 0.05 秒內不重複扣同一塊磚」與分數乘上 `(1 + 連擊/10)`，文件沒寫。
- 油漆桶連鎖在程式裡最多 6 層，文件沒寫上限。
