# boss-mr-grey 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Boss stats per district | 缺測試：對第 10～50 關檢查 `buildStage(n).boss` 的 hp／speed／regen 等於 18+9d／45+18d／7−0.5d，並用 `bossTick` 驗證補磚血量 1／1／2／2／3（AC-S6 只確認首領存在） | data.js `SR.buildStage`；rules.js `bossTick` |
| Boss turns at the right side | 缺測試：把首領放在右緣附近、vx > 0，跑一個 `substep`，檢查 x = 226 且 vx < 0 | physics.js `substep` 首領移動 |
| Refill after the first interval | 缺測試：第 10 關清空首領下方三格，呼叫 `bossTick` 累積 7 秒，檢查第 6 列新增 3 塊 1 血磚並有 `boss_regen` 事件 | rules.js `bossTick`、physics.js `addBrick` |
| Occupied cells are not refilled | 缺測試：中間格先放一塊活磚，觸發補磚後該格磚的 id 不變、只新增兩旁的磚 | physics.js `addBrick` 有活磚就回傳 null |
| Enrage threshold | 缺測試：第 10 關把首領 hp 設成 7 呼叫 `bossTick`，檢查 enraged、速度 ×1.5、regen 5.25、有 `boss_enrage` 事件；再呼叫一次不會再乘 | rules.js `bossTick` |
| Pierce does not pass through the boss | 缺測試：讓 pierce = 2 的球打首領（首領血夠多），檢查球反彈且 pierce 仍是 2 | physics.js `collideBrick` 的 `k.type !== "boss"` 條件 |
| All five bosses are beatable | 已有測試：AC-S8b | 第 10～50 關各 3 局、帶 9 張隨機強化、420 秒內 `isCleared`（注意：是擋板模式的熟練機器玩家，不是擬人玩家） |
| Small paddle on boss stages | 已有測試：AC-S21 | 檢查 `paddleSizeFor(3) === "M"` 且 `paddleSizeFor(10) === "S"` |
| Finisher assist stays off | 缺測試：第 10 關場上只留 1 塊磚，呼叫 `updateFinisher(T, w, {finisher:true}, 8)`，檢查回傳 false、`w.magnet` 為 null | rules.js `updateFinisher` 遇到 `world.boss` 直接回傳 |
| Pre-boss comic replays | 不需測試：流程與畫面串接（game.js `goStage`），需人工試玩；資料面已由 AC-S9 確認每關劇情 key 都存在 | game.js `goStage` 的 `k.endsWith("_boss")` 過濾 |

## 文件與程式不一致

- 數值總表首領公式寫「血量 18＋9×區、補磚間隔 7−0.5×區、補磚血量 1＋區÷2」，沒說「區」從 0 算。程式用的是 0 起算（第 1 區 d=0）：血量 18／27／36／45／54；如果照字面用 1～5 代入，會變成 27～63，補磚血量也會不同。建議文件改成「區號−1」或直接列表。
- 首領移動速度 `45 + 18 × d`（45～117 px/s）只在 data.js，F07 與數值總表都沒寫。
- F07 寫「每次都播首領前漫畫」：程式在**續關**與**重玩（再打一次）**時不播。
- F07 驗收寫「擬人一般玩家滑板模式都打得倒」，但 AC-S8b 實際跑的是擋板模式的熟練機器玩家；沒有擬人／滑板模式的首領測試。
- 首領關沒有收尾輔助、穿透漆對首領無效、油漆桶連鎖與漆彈爆不會傷到首領，這些程式行為文件都沒寫。
