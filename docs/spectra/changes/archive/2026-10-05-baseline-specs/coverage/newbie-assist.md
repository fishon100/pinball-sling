# newbie-assist 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Assists come from the stage's district | 缺測試：對 n=1、11、21、31、41 呼叫 `SR.Rules.assistsFor(n)`，比對表格的 preview／timing／ballSave／finisher | `data.js` `DISTRICTS[].assists`、`rules.js` `assistsFor`；AC-S20／AC-S17 只是拿來用，沒有檢查數值 |
| Map card shows no-assist line | 缺測試：存檔 unlocked=31 開地圖，檢查第 4 區卡片 `.assist-line` 文字是「沒有輔助：全靠你的手感」 | `game.js` `mapScreen`、`assistText` |
| Assist announcement on the first stage of a district | 缺測試：tutorialDone=true 後 `SR_GAME.goStage(11)`，推進約 2.4 秒，檢查 `#bubble` 以「這一區的輔助：」開頭 | `game.js` `startIntro` |
| Preview matches real motion | 已有測試：AC-S13（4 條軌跡 0.5 秒內誤差 < 6px） | `tests.js` AC-S13 呼叫 `predictPath` 並逐子步比對 |
| Preview while charging the plunger | 缺測試：第 21 關用 `SR_GAME.setPlunger(true)` 蓄力，tick 後檢查 `G.previews[0]` 的點數對應 0.8 秒 | `game.js` `computePreviews` |
| No preview in late districts | 缺測試：第 31 關遊玩中 tick 數幀，檢查 `G.previews.length === 0` | `game.js` `computePreviews`（`secs` 為 0 直接 return） |
| Ring turns green under the paddle | 不需測試：純外觀（圈的顏色），需人工試玩確認 | `game.js` `render` 落點圈 |
| No ring in district 3 | 缺測試：第 25 關滑板模式 tick 數幀，檢查 `G.landing === null` | `game.js` `computePreviews` |
| Ball save saves a drain | 缺測試：第 1 關發射後讓球掉進出口，檢查 `G.run.hearts` 不變且 `G.world.balls` 有新球 | `game.js` `ballLost`、`rules.js` `ballSaveTime`；playStage 有算 saved 但沒有測試檢查 |
| Ball-save length without upgrades（Example） | 缺測試：`ballSaveTime(T, newRun, assistsFor(n))` 對 n=1、11、21 應為 6／4.5／3 | `rules.js` `ballSaveTime` |
| Finisher keeps the tail short | 已有測試：AC-S17（9 關 × 5 局，有輔助 ≤ 10 秒且不比沒輔助慢 0.5 秒以上） | `tests.js` AC-S17 |
| Finisher waits for the delay | 缺測試：造 2 塊磚的世界，`updateFinisher(T, w, assists, 2)` 應回傳 false、`w.magnet === null`；改成 3 應為 true | `rules.js` `updateFinisher` |
| Tutorial runs on the first play | 缺測試：`emptySave` 狀態 `goStage(1)`，檢查 `G.tut.step === "press"` | `game.js` `goStage`、`TUT_TEXT`、`drawTutorial` |
| Move step in paddle control | 缺測試：把 `G.tut` 設為 move 步驟且 `slow=true`，tick 1/60 秒後檢查世界時間只前進約 0.35 倍 | `game.js` `tick`（tutSlow）、`drawTutorial` |
| Tutorial step transitions（Example） | 缺測試：設 `G.tut={step:"move",flips:2,hit:true,t:0}` 後呼叫 tick，檢查 step 變 done | `game.js` `tickTutorial` |
| Replay tutorial from the map | 缺測試：tutorialDone=true 開地圖點 `#replayTut`，檢查 `G.stage.n===1` 且 `G.tut.step==="press"` | `game.js` `mapScreen` `replayTut` |

## 文件與程式不一致

- F10 表格寫「A-ballsave 開場球保險加長 +3 秒／+1.5 秒」：程式是「每次發射」都套用（基本 3 秒＋強化＋街區加成），不只開場。
- F10 收尾輔助寫「剩 ≤3 塊時球往磚的方向偏」：程式另外要求「3 秒沒碎磚」（`assist.finisher_delay: 3`），而且只吸往上飛、位置在 y<860 的球、只改水平速度。`rules.js` 的註解還寫「8 秒沒碎磚」，是過時註解（程式讀 tuning 的 3 秒）。
- F10 教學表 press 只寫「按住畫面，往下拉」：經典擋板模式實際文字是「按住右下角，往下拉」。
- F10 寫地圖會顯示輔助：地圖卡片只列彈道預覽、落點／擋板時機提示、球保險，不列收尾輔助。
- `F10` 嵌入 `![[數值總表#輔助]]`，但數值總表的「輔助」段只有收尾輔助 3 秒／1200，沒有各區表。
