# power-ups-and-items 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Caps are never exceeded | 已有測試：AC-S9b | 抽 60 次，檢查同一次不重複、各強化不超過上限、愛心 ≤ 5 |
| Boss clear gives no upgrade | 缺測試：把 game.js `afterClear` 的「n % 10 !== 0 才抽」抽成規則函式後，測第 10 關過關強化等級不變；目前需人工試玩 | game.js `afterClear` |
| Pierce passes through a brick | 已有測試：AC-S2 | pierce = 1 的球打碎 1 血磚，檢查磚碎掉、球繼續往上（vy < 0、y < 300）；未檢查 pierce 歸 0 |
| Maximum big ball still plays | 已有測試：AC-S9c | 半徑 16.5 的球全力發射最高點 < 500，且從擋板中間掉得下去 |
| Bonuses applied at stage start | 缺測試：建一個 heavy 3／big 3／power 2／safety 2／bomb 2 的 run，`applyBonuses` 後檢查 dmg 4、radiusBonus 4.5、flipperPower 1.24，`ballSaveTime` 第 1 區 = 12，`paintBomb` 事件半徑 67.6（AC-S9b 只把結果印出來，沒有比對數值） | rules.js `applyBonuses`、`ballSaveTime`、`paintBomb` |
| Split adds balls | 缺測試：split 等級 2 的 run，送一個 `ball_brick` 事件給 `processEvents`，檢查多 2 顆球、3 顆都標記 split、再送一次不會再分裂 | rules.js `processEvents` 分裂段 |
| Starting at stage 5 | 缺測試：把 `startDistrict` 的補強化邏輯抽成純函式，檢查從第 5 關開始時強化總等級 = `simulatedBuild(T, 4, seed)` 的結果、愛心 = 3 | game.js `startDistrict` |
| Item cap of three | 已有測試：AC-S14 | 對空存檔 `grantItem` bomb 5 次，檢查 = `SR.ITEM_MAX`（3） |
| District reward | 不需測試：流程串接（game.js `districtCleared`），隨機兩次 `grantItem` 已由 AC-S14 的上限規則涵蓋；畫面列出獎勵需人工試玩 | game.js `districtCleared` |
| Using an item outside play | 不需測試：DOM 按鈕與畫面狀態判斷（game.js `useItem` 的 `G.screen !== "play"`），需人工試玩 | game.js `useItem` |
| Bomb damages a nearby brick | 已有測試：AC-S14 | 球放在磚下 20 px 用漆彈，檢查磚扣血或消失且有 bomb 事件 |
| Timers start and end | 已有測試：AC-S14 | 檢查 slow = 5、save = 10，`tickItems` 11 秒後 save = 0 |
| Wide paddle and flippers revert | 已有測試：AC-S14 | 滑板半寬 中→大→中；擋板模式 `flipperBonus` > 0 後還原為 0（未比對剛好 14） |
| Extra ball | 已有測試：AC-S14 | 用「加一顆」後球數 +1 |

## 文件與程式不一致

- **分裂彈**：F08 與 data.js 說明寫「分裂 +1 顆球」；程式每次分裂出「等級」顆（3 級時 +3 顆）。
- **穿透漆**：F08 與 data.js 說明寫「每次發射前 2 塊碎磚不反彈」；程式是每級 2 次（3 級時 6 次），而且對首領無效。
- **漆彈爆**：F08 寫「對相鄰磚 1 傷害」；程式只打上下左右 4 格，傷害等於等級（2 級時 2 傷害），而且只有球直接打碎的磚會觸發。
- **連擊火力**：文件只寫「每 15 連擊引爆漆彈」；程式半徑 52，2 級時 ×1.3（67.6），傷害等於目前球傷害。
- **球保險（保險罐）**：數值總表沒寫基本時間；程式是 3 秒＋每級 3 秒＋該區輔助（第 1 區 +3、第 2 區 +1.5）。
- **慢動作**：數值總表寫「5 秒」；計時用遊戲時間，在 0.5 倍速下實際約 10 秒真實時間。
- **球保險道具**：用了之後 10 秒內**每一次**掉光球都會救回（不是只救一次），文件沒寫。
- **從中間關卡開始**：會補強化，但愛心固定重設為 3，所以補到的「補一罐」不會留下效果。
- **首領關過關不抽強化**：F08 寫「過關直接抽到一罐」，沒有排除首領關。
