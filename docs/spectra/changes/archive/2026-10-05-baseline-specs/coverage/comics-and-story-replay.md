# comics-and-story-replay 測試覆蓋

| 情境 | 結果 | 依據 |
|---|---|---|
| Reveal order inside one panel | 不需測試：演出節奏，需人工試玩看順序與手感 | `comic.js` `drawPanel`（0.32／0.28＋0.12／0.45／0.62＋0.3） |
| Typewriter length（Example） | 缺測試：`SR.Comic.play` 一段 34 字的格，`update` 推進 1.5 秒後用 `SR.Comic.state()` 搭配 tap 檢查第一次 tap 直接進下一格（代表已打完） | `comic.js` `update`（age>0.5 後每秒 34 字） |
| First tap completes the panel | 缺測試：播放後立刻 `SR.Comic.tap()`，檢查 `state().shown` 仍為 1；再 tap 一次變 2 | `comic.js` `tap`、`panelDone` |
| Skip ends all queued segments | 缺測試：`play(["d1_clear","d2_start"], done)` 後呼叫 `finish()`、推進 0.35 秒，檢查 done 被呼叫且 `active()` 為 false | `comic.js` `finish`、`game.js` `playStory` |
| Seen segment is not replayed before a stage | 缺測試：seenComic 含 d2_start，`SR_GAME.goStage(11)` 後檢查 `G.screen==="intro"`（沒有進漫畫） | `game.js` `goStage` 的 keys 過濾 |
| Boss segment plays every time | 缺測試：seenComic 含 d1_boss，`goStage(10)` 後檢查 `SR.Comic.active()` 為 true | `game.js` `goStage`（`k.endsWith("_boss")`） |
| Fish appears only after its comic | 已有測試：AC-S22（找第一個有阿鰭的關卡，確認之前 storyBefore 含 d1_fish） | `tests.js` AC-S22 |
| Replay a seen segment | 缺測試：seenComic.intro=true 開 `comicGallery`，點 `[data-k="intro"]`，`closeDialog()` 後檢查 `G.screen==="gallery"` | `game.js` `comicGallery` |
| Unseen segment is locked | 缺測試：空存檔開回放頁，檢查第 9 個按鈕 disabled 且文字含「還沒看到」 | `game.js` `comicGallery` |
| Titles and comics match one to one | 已有測試：AC-S22（COMICS 與 COMIC_TITLES 互相對得上） | `tests.js` AC-S22；AC-S9 另外檢查 50 關的 storyBefore／After 都找得到漫畫 |
| Fairy tale framing | 已有測試：AC-S16（很久很久以前、從此以後、沒有彈珠說法、灰先生、序章有小葵） | `tests.js` AC-S16 |
| Stage label hides the story structure | 缺測試：`goStage(23)` 後檢查 `#stageChip` 文字為「屋頂 3-3」且不含起承轉合；地圖 HTML 也不含 act 值 | `game.js` `updateHud`、`mapScreen` |
| All pages pass layout checks | 已有測試：AC-S18（背景／角色／說話者存在、≤32 字、不蓋臉、不出格、不重疊、不出頁、格高 ≥ 90、每頁 ≤ 5 格） | `tests.js` AC-S18 |

## 文件與程式不一致

- F11「元件」寫「30 種背景」，但 F11 自己列出的與 `comic.js` 的 `BG` 實際都是 29 種（含 black）。
- F11 寫「播放時機：第一次一定播」：程式在漫畫「開始播」時就記進 `seenComic`，所以第一次播放時按「跳過劇情」也算看過，之後不再自動播（只能在劇情回放看）。
- F11 沒寫：從結算畫面「重玩這關」與「投幣續關」都不播關前漫畫（連首領前的也不播）。
- F11 寫打字機 34 字／秒，沒寫起點：程式是每格出現 0.5 秒後才開始打字。
- F11 對話框寫「≤32 字」；`comic.js` 開頭註解寫「不超過約 30 字」，實際檢查（AC-S18）是 32 字。
