# difficulty-balance 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Novice reacts slower than skilled | 缺測試：檢查 `SR.Tests.HUMAN` 三組數值與表格一致，且 novice.react > casual.react > skilled.react、aim 同樣遞減 | `tests.js` `HUMAN`；AC-S20／AC-S17 只用 novice，沒有檢查數值本身 |
| Profiles（Example） | 缺測試：同上一列 | `tests.js` `HUMAN` |
| District 1 novice target | 已有測試：AC-S20（9 關 × 5 局、擬人新手、滑板、含輔助：每關掉愛心 ≤ 1、完美 ≥ 一半） | `tests.js` AC-S20 |
| Bosses are beatable | 已有測試：AC-S8b（5 個首領 × 3 局、9 張模擬強化、420 秒內） | `tests.js` AC-S8b |
| Slider changes physics immediately | 缺測試：在遊戲頁對 `#tn-ball.gravity` 設值並送 input 事件，檢查 `SR.T.ball.gravity`、該列的 `.v.mod` 與「原 1400」、標題「改了 1 項」 | `tune.js` input 監聽、`refresh` |
| Tunable parameters（Example） | 缺測試：比對 `SR.TUNE_PARAMS` 的 9 項 id／min／max／step 與表格，並確認每個預設值落在 min～max 之內 | `tune.js` `SR.TUNE_PARAMS` |
| Tuned value survives reload | 缺測試：localStorage 寫入 `{"brick.restitution":0.95}` 後呼叫 `SR.loadTuning()`，檢查回傳 T 的值為 0.95、`SR.TUNE.defaults["brick.restitution"]===0.85` | `tune.js` 包裝的 `SR.loadTuning` |
| Reset clears tuning | 缺測試：改兩個滑桿後點 `[data-act="reset"]`，檢查 9 項都回預設且 `localStorage["sr.tune.v1"]==="{}"` | `tune.js` reset |
| Drain in practice mode | 缺測試：`SR.TUNE.practice=true`、`G.ballSave=0`，讓球掉進出口，檢查 `G.run.hearts` 與 `G.heartsLost` 不變、場上有新球 | `game.js` `ballLost` |
| Copied text（Example） | 缺測試：stub `navigator.clipboard.writeText`，改重力為 2000 後點 `[data-act="copy"]`，比對字串 | `tune.js` copy |
| Nothing changed | 缺測試：同上 stub，不改任何值按複製，比對「套用調參\n（沒有改動）」 | `tune.js` copy |
| Test page uses official values | 缺測試：在 test.html 檢查 `SR.TUNE === undefined`，並在 localStorage 有 `sr.tune.v1` 時比對 `SR.loadTuning()` 結果等於 tuning.json＋STREET_TUNING | `test.html` 的 script 清單（沒有 tune.js） |

## 文件與程式不一致

- F15「目前數字（v3.5.5）」表（各區每關掉愛心、秒數、首領關）不在任何測試裡，自動測試只量第 1 區（AC-S20）與首領打得倒（AC-S8b，用機器玩家、擋板模式，不是擬人新手），表中第 2～5 區與首領關的擬人數字無法從程式確認。
- F15 寫 AC-S20「一半以上金牌」：測試算的是「掉 0 顆愛心」的局數，不是真的發獎牌；而且用的強化是 `simulatedBuild` 模擬出來的。
- F15 寫「自動測試頁不載入面板，測試永遠用正式數值」：只對 `test.html` 成立。遊戲頁 `index.html#test` 也能跑同一組測試，那時 tune.js 已載入，這台裝置存的調整值會被套用到測試上。
- F15 沒寫：練習模式每次重新整理都會關掉（不存檔）；球保險／球保險道具優先於練習模式（先顯示 BALL SAVED）。
- F15 沒寫：按「🎚 手感調整」後暫停選單會關掉、遊戲直接繼續（面板開著邊玩邊調）。
