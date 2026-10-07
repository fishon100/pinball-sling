# 設計：教學關與物件特寫教學

## 關卡資料
- 第 1～5 關磚牆走「套用關卡修改」：AI 寫 `tools/levels/edits/<時間>-ai.json`（note 註明「AI 代做：教學關磚數」），`node tools/levels/apply.js` 列差異給企劃看，確認後 `--write`。
- 道具池：第 2 關 `["ball"]`、第 3～9 關 `["bomb","ball"]`，一樣寫在修改檔。
- 第 4 關 2 血磚、第 5 關油漆桶由磚牆字元（2、B）決定，不用改程式。

## 物件特寫教學（game.js）
- 新增 `G.intro`（物件教學狀態）：`{ queue: [kind...], cur, t }`。物件種類判斷：gift（磚 type gift）、rail（segments kind rubber/rail）、boost（world.boosts）、hp2（brick hp ≥ 2）、bucket、fish、bumper、boss；capsule 在 handleEvents 的膠囊掉落事件觸發。
- 時機：`beginPlay()` 之後（開場運鏡結束）、互動教學 press 步驟之前，若 queue 不空就 `G.timeScale = 0`（不用暫停選單），畫面暗幕＋鏡頭：沿用 `G.view.zoom / tx / ty` 把物件放到畫面中央放大 2 倍（開場運鏡已經用同一組）。
- 卡片文案（`data.js` 的 `SR.OBJECT_INTROS`，童話口吻）：
  - gift：「道具磚：打破它會掉下道具膠囊」
  - capsule：「道具膠囊：用滑板接住，馬上生效」
  - rail：「彈力牆：球撞上去會被彈回來」
  - boost：「加速帶：球往上經過會衝得更快」
  - hp2：「硬磚：上面的數字是要打幾下」
  - bucket：「油漆桶：打碎會炸開周圍的磚」
  - fish：「阿鰭：會游來游去，撞到會把球彈開」
  - bumper：「中柱：撞到會用力把球彈開」
  - boss：「灰先生：打掉他身下那排磚就能打倒他」
- 結束：pointerdown（任何地方）或 Space/Enter → 下一個 queue 或恢復 timeScale、鏡頭回原位。存檔 `save.seenObjects[kind] = true`。
- 「重看教學」：標題畫面按鈕，清 `save.tutorialDone` 與 `save.seenObjects`，並從第 1 關開始（沿用現有 replayTut）。
- 互動教學與物件教學同時在第 1 關：第 1 關沒有物件，不會撞。

## 測試（tests.js GAME_TESTS）
- AC-S52 第 3 關第一次：開場後 `G.intro.cur === "boost"`、`timeScale === 0`、球在發射道；tap 後恢復。
- AC-S53 已教過的不再教；兩種物件排隊。
- AC-S54 第一次膠囊掉落暫停。
- AC-S55 重看教學清掉紀錄。
- 關卡工具測試：教學關磚數報告。
- 擬人玩家：第 1 區每關愛心損失仍在 0～1。
