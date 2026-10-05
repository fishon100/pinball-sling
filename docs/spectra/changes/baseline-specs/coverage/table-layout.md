# table-layout 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Tables get taller in later districts | 已有測試：AC-S19 | 測試算出每區配置的最小 `top`，後一區比前一區大就記問題 |
| District 1 needs no camera scroll | 已有測試：AC-S19 | 檢查第 1 區第一個配置的 `top` ≥ `CAM_MAX`（320）；只查清單第一個，第 1 區其他配置 `top` 也都是 320 |
| Adjacent stages differ | 已有測試：AC-S19 | 第 2～50 關（跳過每區第 1 關）逐關比對 `layoutFor(n)` 與上一關 |
| Intro shows the layout name | 不需測試：純外觀（開場畫在畫布上的文字），需人工試玩確認 | game.js 開場繪製 `台面：${w.layout.name}` |
| Bumper kicks the ball | 缺測試：在空台面放一顆中柱，以 300 px/s 撞擊，檢查離開的法向速度 ≥ 950、事件有 `bumper`、`processEvents` 後連擊 +1 | physics.js `collideCircle`；game.js 加 5 分 |
| Bumpers keep clear of bricks | 已有測試：AC-S19 | 50 關逐一檢查中柱與阿鰭路線 5 個取樣點到磚／首領的距離 ≥ 22 + 2×12 |
| Fish turns around at the edge | 缺測試：建 d_fish 台面，跑 `substep` 直到阿鰭 x 到 290，檢查 x 不超過 290 且 vx 變成 −130 | physics.js `substep` 阿鰭移動 |
| Fish hit is counted | 缺測試：讓球撞阿鰭，檢查出球速度 ≥ 950 且事件 `bumper` 的 `c.kind === "fish"`（遊戲層 `G.fishHits` 需把計數抽成純函式才能測） | physics.js `collideCircle`；game.js `G.fishHits++` |
| Fish is introduced by a comic first | 已有測試：AC-S22 | 找第一個有阿鰭的關卡，確認在它之前（含）有關卡播 `d1_fish` |
| Boss stage layouts | 已有測試：AC-S19 | 第 10、20、30、40、50 關 `layoutFor(n).fish` 不可存在 |
| Rubber rail kicks the ball | 缺測試：建 a_rubber 台面，以法向 200 px/s 撞左彈力牆，檢查反彈法向速度 ≥ 640 且有 `sling` 事件 | physics.js `collideSegment` 的 rubber 分支 |
| Stuck probe in flipper mode | 已有測試：AC-S7 | `stuckProbe` 對 15 種配置各跑，`buildTable` 預設擋板模式 |
| Stuck probe in paddle mode | 缺測試：AC-S7 加跑 `control = "paddle"`（底部打開、沒有彈弓），台面下緣改用滑板高度 | AC-S7 只測擋板模式，但存檔預設操作是滑板（`emptySave().control = "paddle"`） |

## 文件與程式不一致

- F05 驗收寫「AC-S7 15 種配置都不卡球」，但 AC-S7 只在**擋板模式**跑；目前預設的滑板模式（底部打開）沒有卡球測試。
- F05 只寫「彈開力道」引用數值總表；數值總表寫「彈力牆 ×0.8」，程式一致（800 × 0.8 = 640），但只在撞擊法向速度 > 40 px/s 時才觸發，文件沒寫。
- 阿鰭的半徑（20）、游的範圍（x 70～290）與各區速度（70／90／110／130）只寫在 data.js／physics.js，F05 與數值總表都沒有列出。
- 打到中柱遊戲裡加 5 分（game.js），tuning.json 的 `bumper.score: 100` 在噴漆闖關沒有使用。
