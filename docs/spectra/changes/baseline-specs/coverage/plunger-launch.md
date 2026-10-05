# plunger-launch 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Press without a lane ball is ignored | 缺測試：球已發射離開發射道時呼叫 `SR_GAME.setPlunger(true)`，檢查 `G.plunger.holding===false` | game.js `setPlunger` |
| Hint text while waiting | 缺測試：球在發射道時讀 `#hint` 文字（滑鼠環境應為「按住滑鼠往下拖（或按住空白鍵），放開發射」），`setPlunger(true)` 後變「拉越多力道越大，放開發射！」 | game.js `updateHintText` |
| Drag distance sets the charge | 缺測試：`setPlunger(true,{id:1,y:Y})` 後派送 pointerId 1 的 `pointermove`（clientY＝Y＋畫布高×0.08），檢查 `G.plunger.charge≈0.5` | game.js `pullPlunger`、`PULL_FULL = 0.16` |
| Drag to charge (example) | 缺測試：同上，拖 0／0.25／1.0／超過 1.7 倍滿拉距離，charge 為 0／0.25／1／1 | game.js `pullPlunger` |
| Pull clicks every 20% | 不需測試：震動手感需人工試玩（觸發公式 `floor(c*5)` 增加時震 6ms） | game.js `pullPlunger` |
| Holding Space charges over time | 缺測試：派送一次 Space keydown，`tick(1/60)` 27 次後 keyup，檢查發射後球 vy≈−1900 | game.js `tick`（charge_time 0.9）、`setPlunger` |
| Holding longer caps at full | 缺測試：一次 keydown 後推進 2 秒，檢查 `G.plunger.charge===1` | game.js `tick` |
| Auto-repeat keydown restarts the pull | 缺測試：charge 0.6 時再派送一次 Space keydown（`repeat:true`），檢查 charge 歸 0（若修正此行為，這條測試要改成「不歸 0」） | game.js `keydown`→`setPlunger(true)` 會把 charge 設 0 |
| Tap without pulling does not launch | 缺測試：`setPlunger(true,{id:1,y:0})` 後立刻 `setPlunger(false)`，檢查球仍在發射道、`G.plunger.nudge===1` | game.js `setPlunger`（charge < 0.08） |
| Just enough pull launches | 缺測試：charge 設 0.08 後放開，檢查球 vy≈−1396 | game.js `setPlunger`、rules.js `launch` |
| Launch speed follows the charge | 缺測試：直接呼叫 `SR.Rules.launch(T, run, ball, c)`，c＝0.08／0.5／1 時 vy＝−1396／−1900／−2500（AC-S9c 只用 max_speed 直接設速度，沒經過 `launch`） | rules.js `launch`、tuning.js `plunger` |
| Largest ball still leaves the lane | 已有測試：AC-S9c | tests.js AC-S9c（半徑 16.5、2500 px/s，最高到 y<500） |
| Launch starts ball save | 缺測試：第 1 關發射後檢查 `G.ballSave===6`；球留在發射道時不倒數 | game.js `launchIfReady`、`tick`、rules.js `ballSaveTime` |
| Gate blocks the ball from re-entering the lane | 缺測試：重力 0，球從台面側（左上方）撞向 (340,560)–(380,525) 的單向門，檢查被彈回；從發射道內往上的球能穿過 | physics.js `buildTable` gate（oneSide）、`collideSegment` |
| Preview follows the current charge | 缺測試：第 1 關 `setPlunger(true)`、charge 設 0.5，`tick` 後檢查 `G.previews.length===1`（AC-S13 只驗預覽與實際軌跡吻合，沒驗蓄力預覽） | game.js `computePreviews` |
| No launch preview without the assist | 缺測試：第 31 關蓄力中檢查 `G.previews.length===0` | game.js `computePreviews`、data.js 第 4 區 preview 0 |

## 文件與程式不一致

- **疑似錯誤**：F04 寫「按住空白鍵（慢慢往後拉）」，但程式每收到一次 Space keydown（包含按住不放時系統的自動連發，通常約 0.5 秒後開始）都會把力道重設為 0；按住超過自動連發延遲後放開，力道常低於 8% 而不發射。F04 驗收「鍵盤可用（實測）」可能只測了短按。
- 數值總表「發射桿」沒列鍵盤拉滿時間 0.9 秒（來自共用 tuning.json `plunger.charge_time`）。
- F04 只寫拉太少的提示「按住往下拉，再放開！」：那是觸控裝置的文字；滑鼠環境顯示「按住往下拖（或按住空白鍵），再放開！」。
- F04 沒寫發射的前提：球必須在發射道底部（y > 990）且幾乎靜止（垂直速度 < 30 px/s）才會真的發射。
- F04 修改紀錄 v3.4.10「點一下也能發射」已被 v3.5 取代：現在點一下不拉不會發射（與 F04 本文一致，僅提醒紀錄過時）。
