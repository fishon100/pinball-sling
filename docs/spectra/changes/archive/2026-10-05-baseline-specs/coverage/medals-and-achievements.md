# medals-and-achievements 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Medal rules | 已有測試：AC-S22 | 第 3 關 `stars(st, 0, 999, false) = 3`、`(1,1,false) = 2`、`(2,1,false) = 1`、`(0,1,true) = 1` |
| Worse replay keeps gold | 缺測試：把 game.js `onCleared` 的 `save.stars[n] = Math.max(...)` 抽成規則函式，測存金牌後再存銅牌仍是 3 | game.js `onCleared` |
| Better replay upgrades | 缺測試：同上，存銅牌後再存銀牌變成 2 | game.js `onCleared` |
| Catalog is complete | 缺測試：AC-S9 只檢查成就 id 不重複；需加檢查 `SR.ACHIEVEMENTS.length === 19` 且列出的 19 個 id 都存在 | data.js `SR.ACHIEVEMENTS`；AC-S9 |
| Combo achievements during play | 缺測試：對空存檔呼叫 `checkAchievements(save, {combo: 50})`，檢查回傳含 combo20、combo50、不含 combo100 | rules.js `checkAchievements` |
| Last heart is counted before refill | 缺測試：`checkAchievements(save, {clearedStage: 3, medal: 1, heartsLeft: 1})` 回傳含 lastheart；遊戲傳入的是回愛心前的數字（game.js `onCleared`）需人工確認 | rules.js `checkAchievements`；game.js `onCleared` |
| Fish hits only count on clear | 不需測試：只有 game.js `onCleared` 會傳 `fishHits`，屬流程串接，需人工試玩；條件本身可用 `checkAchievements(save, {fishHits: 10})` 補單元測試 | game.js `onCleared`、`handleEvents` |
| One coin district | 缺測試：`checkAchievements(save, {oneCoin: true})` 回傳含 onecoin；`districtCleared` 傳入 `!run.continues` 需人工試玩 | rules.js `checkAchievements`；game.js `districtCleared` |
| No repeat unlock | 缺測試：同一份存檔連續兩次 `checkAchievements(save, {clearedStage: 1})`，第二次回傳空陣列、`save.achievements.first` 時間不變 | rules.js `checkAchievements` 的 `give` |

## 文件與程式不一致

- F09 寫成就 first 是「通過第 1 關」：程式是「通過任何一關」（`clearedStage >= 1`）。
- F09 寫 combo 是「一次擊球」的連擊：程式的連擊算磚塊與中柱／阿鰭的命中次數，球碰到滑板或擋板才歸零；多顆球同時在場時是一起累計的。
- F09 寫 boss5「看到結局」：程式在第 50 關過關當下就解鎖，結局漫畫在之後才播。
- F09 寫「2 以上、或續關＝銅牌」：程式中「續關」只影響續關後重打的那一次；同一次續關重打若沒掉愛心，仍會解鎖「無傷過關」（flawless 不看續關）。
- 數值總表的「獎牌」條件沒有寫「球保險救回的球不算掉愛心」，程式是不算。
- `MEDALS` 圖示在 rules.js 還是 emoji（🥇🥈🥉），F09 v3.4.8 寫已改為程式繪製；結算畫面確實用程式畫的獎牌，emoji 只是殘留資料。
