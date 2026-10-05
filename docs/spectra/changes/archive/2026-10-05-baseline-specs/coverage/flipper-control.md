# flipper-control 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Touch halves control each flipper | 缺測試：擋板模式遊玩中在畫布左半派送 `pointerdown`，檢查左擋板 `pressed===true`、右擋板 false | game.js `pointerdown`、`setFlipper` |
| Multi-touch keeps a flipper up | 缺測試：左半派送兩個 pointerId 的 pointerdown，放開一個後左擋板仍 pressed，兩個都放開才放下 | game.js `pointerEnd` |
| Right-half press pulls the plunger when a ball is waiting | 缺測試：球在發射道落定時右半 pointerdown，檢查 `G.plunger.holding===true` 且右擋板未按下 | game.js `pointerdown`（`plunge` 判斷） |
| Full lift time matches v2 | 已有測試：AC-S10 | tests.js AC-S10（35.4 ms ±0.1）；另有 run_tests.gd AC1（≤ 50 ms） |
| Release returns the flipper slower than it rose | 缺測試：全舉後放開，以 1/480 s 子步推進到靜止角度，檢查約 72.5 ms | physics.js `updateFlipper` |
| Tip shot speed matches v2 | 已有測試：AC-S10 | tests.js AC-S10（尖端 0.85 處 1901 ±2 px/s） |
| Tip is faster than base | 已有測試：run_tests.gd AC3 | Godot v2 `ac3_tip_faster_than_base`（0.9 處 > 0.25 處 ×1.2）；網頁版沒有對應測試，物理相同 |
| Flipper contact resets the combo | 缺測試：`processEvents` 餵一個 `flipper_touch` 事件，檢查 `st.combo===0` | rules.js `processEvents` |
| Largest ball fits through the flipper gap | 已有測試：AC-S9c | tests.js AC-S9c |
| No stuck spots on any layout | 已有測試：AC-S7 | tests.js AC-S7（15 種配置、每 24px 放球、含大罐滿級的球） |
| Sling kicks the ball | 缺測試：重力 0，球以 300 px/s 垂直撞彈弓斜面，檢查離開時法向速度 ≥ 800、有 sling 事件 | physics.js `collideSegment`（kind "sling"） |
| Hint lights the reachable flipper in district 1 | 缺測試：第 3 關把球放在 (150,930)、vy>0，檢查 `inReach("L")` 為真且 `G.assists.timing` 為真（繪圖本身需人工確認） | game.js `inReach`、`render` |
| No hint from district 3 | 缺測試：第 21 關同樣擺法，檢查 `G.assists.timing===false` | data.js `SR.DISTRICTS[2].assists` |
| Wide item lengthens then restores | 已有測試：AC-S14 | tests.js AC-S14（擋板模式 flipperBonus > 0，13 秒後回 0） |
| Camera shows flippers when a ball approaches | 已有測試：AC-S5 | tests.js AC-S5 |

## 文件與程式不一致

- F03「時機提示：球進到可打範圍時擋板發光」沒寫限制：程式只在**第 1、2 區**（`assists.timing`）或第一次教學時發光，第 3 區起沒有。
- F03 電腦按鍵只寫 Z（←）與 /（→）：程式右擋板另外接受 `M` 鍵。
- F03「道具寬板：擋板變長 12 秒」沒寫變長多少：程式是 +14 px（72→86）。
- F03 擋板數值寫「尖端約 1900 px/s」：AC-S10 實測要求 1901 ±2 px/s（一致，只是精度不同）；「擋板打點越靠尖端越快」只有 Godot v2 的 AC3 驗，網頁版沒有。
