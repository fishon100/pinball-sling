# paddle-control 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Mouse moves the paddle without clicking | 缺測試：遊玩中對 window 派送 `pointermove`（pointerType mouse、clientX 在畫布外右側），檢查 `paddle.target` 已更新、數幀後 `paddle.x===284`（M） | game.js `pointermove`、physics.js `movePaddle` |
| Paddle speed is capped per frame | 已有測試：AC-S21 | tests.js AC-S21（target 9999 一幀移動 ≤ 2600/60+0.5） |
| Arrow keys move the paddle | 缺測試：派送 ArrowRight keydown，`tick(1/60)` 後檢查 `paddle.target - paddle.x` 約 950/60；keyup 後停止 | game.js `tickKeys`、`KEYS` |
| Cursor is hidden during paddle play | 不需測試：純外觀（游標樣式），人工試玩確認 | game.js `tick` 的 `canvas.style.cursor` |
| Paddle edges reach both walls | 已有測試：AC-S21 | tests.js AC-S21（範圍 20～340） |
| Center range by size (example) | 缺測試：AC-S21 只測 M；補 S／L 各自 `paddleRange` 等於 60–300／96–264 | physics.js `paddleRange` |
| Center hit goes straight up | 已有測試：AC-S21 | tests.js AC-S21（中間偏差 ≤ 3°、速度 1550±40） |
| Edge hit goes at a steep angle | 已有測試：AC-S21 | tests.js AC-S21（off 0.9 ≥ 35°） |
| Outgoing velocity on a still paddle (example) | 缺測試：直接呼叫碰撞，off 0／0.5／0.9／−1 的 vx、vy 各在表列值 ±40 內 | physics.js `collidePaddle` |
| Ball never rests on the paddle | 已有測試：AC-S21 | tests.js AC-S21（3 秒內停留 ≤ 30 幀） |
| Power upgrade raises the paddle shot speed | 缺測試：`world.flipperPower=1.24` 時中間擊球速度約 1922 | physics.js `collidePaddle`、rules.js `applyBonuses` |
| Stage decides the base size | 已有測試：AC-S21 | tests.js AC-S21（`paddleSizeFor(3)==="M"`、`(10)==="S"`、S<M<L） |
| Wide item enlarges then restores | 已有測試：AC-S14 | tests.js AC-S14（寬板 56→76，13 秒後回 56） |
| Edge hit shows an arrow and stronger vibration | 不需測試：震動與提示箭頭屬回饋手感，需人工試玩 | game.js `handleEvents` case "paddle" |
| Paddle hit resets the combo | 缺測試：`processEvents` 餵 combo 12 後一個 `paddle` 事件，檢查 `st.combo===0`、`st.maxCombo===12` | rules.js `processEvents` |
| Side hit bounces like a wall | 缺測試：重力 0、球以 600 px/s 從滑板側面水平撞上，檢查反彈 vx 反向且約 270、沒有 paddle 事件 | physics.js `collidePaddle` else 分支 |

## 文件與程式不一致

- F02 鍵盤只寫「←／→」：程式還接受 `Z`（左）、`/` 與 `M`（右），與擋板模式共用按鍵表；鍵盤移動速度 950 px/s 沒寫在文件或數值總表。
- F02 未提「強力擋板」強化也會提高滑板出球速度（每級 +12%）；程式 `collidePaddle` 會乘上 `flipperPower`（強化卡說明有寫「擋板／滑板」）。
- F02 未提滑板擊球會把連擊數歸零（rules.js `processEvents`）。
- 數值總表滑板未列 `radius 8`（圓角）與側面反彈（牆面反彈 0.45＋滑板速度 ×0.3）。
- F02 驗收 AC-S21 敘述「首領關＝小」：測試只檢查 `paddleSizeFor(10)`，沒逐一檢查 20／30／40／50 關（程式規則 `n % 10 === 0` 是一致的）。
