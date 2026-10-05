# audio-and-haptics 測試覆蓋

`tests.js` 沒有任何聲音或震動的測試（test.html 甚至不載入 `audio.js`）。

| 情境 | 結果 | 依據 |
|---|---|---|
| Mute sound effects from pause | 缺測試：包一層 `SR.Audio.play` 記錄是否真的進到合成；`setSfx(false)` 後觸發碎磚，檢查沒有合成任何音效、音樂排程仍在跑 | `audio.js` `play`（`!sfxOn` 直接 return）、`setSfx` |
| Toggles reset on reload | 不需測試：程式刻意只存在記憶體（`let sfxOn = true, musicOn = true`），重新整理就重置；需人工確認這是否是想要的行為 | `audio.js` 開頭 |
| Vibration off persists | 缺測試：stub `navigator.vibrate` 記錄呼叫；點 `#pVib` 後檢查 `save.vibrate===false` 且 localStorage 有存，接著觸發掉球，stub 沒被呼叫 | `game.js` `vibrate`、`togglePause` 的 `pVib` |
| Brick break vibration grows with combo | 缺測試：stub `navigator.vibrate`，在連擊 12 時送一個 brick_break 事件給遊戲，檢查收到 30 | `game.js` `handleEvents` |
| Event vibration table（Example） | 缺測試：同上的 stub，逐一送 launch／paddle／flipper／brick_hit／bucket／bumper／sling／boss hit／drain／clear 事件，比對表格數值 | `game.js` `handleEvents`、`launchIfReady`、`pullPlunger`、`ballLost`、`onCleared`、`tickOpening` |
| Higher combo, higher break sound | 不需測試：音高是聽感，需人工試玩；參數 `brickBreak(min(8, combo/4))` 一目了然 | `audio.js` `SFX.brickBreak`、`game.js` `handleEvents` |
| Combo raises intensity | 缺測試：包一層 `SR.Audio.setIntensity` 記錄最後值，在一般關卡把連擊推到 10，檢查為 2 | `game.js` `handleEvents` 的 `AU.setIntensity`、`audio.js` `tick`（換小節才切換） |
| Intensity rules（Example） | 缺測試：同上，分別在連擊 3／4／10、首領關、首領暴怒時檢查 0／1／2 | `game.js` `handleEvents` |

## 文件與程式不一致

- 音效與音樂開關沒有存檔：`audio.js` 只存在記憶體，重新整理後都回到「開」（F14 沒寫是否要保留；震動開關則有存在 `save.vibrate`）。
- F14 寫「連擊 ≥4、首領關、暴怒時疊加樂器（強度 0／1／2）」：程式是連擊 ≥4 或首領關＝1、連擊 ≥10 或暴怒＝2；過關時也會設成 2、愛心用完設成 0。`audio.js` 開頭註解寫「2＝連擊 ≥10 或首領戰」，首領戰其實只有 1（暴怒才 2）。
- F14 震動表寫「碰到磚／碎磚 8ms／18ms＋連擊數（最多 38ms）」：與程式一致；但表裡沒有「打開震動時的確認震動 30-40-60」與開場動畫的震動（投幣 30、噴漆 12、招牌 40-30-80）。
- F14 寫「拉發射桿 每 2 成 6ms」：一致。F14 震動表沒有提到「道具禮物磚」——程式碎禮物磚時不震動（只有一般磚、油漆桶有震動）。
- F14 寫「U-title：音樂開關」：一致；標題沒有音效與震動開關。
