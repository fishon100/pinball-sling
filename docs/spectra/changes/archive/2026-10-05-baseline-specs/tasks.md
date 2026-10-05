## 1. 規則書內容與程式一致（Baseline Follows Current Code）

- [x] 1.1 核心與操作 5 份規則書寫的是程式目前的行為：Core Loop Stage Flow、Steel Ball Physics、Drain Is A Normal Risk With No Drain-Blocking Post、Stage Clear Condition、Run Hearts And Continue、Rising Difficulty Measured At Human Speed、Fairy-Tale Story Tone、Opening First-Launch Autoplay、Opening Insert Coin Start、Opening Timed Beats、Opening Skip、Opening Replay From Title、Paddle Input Following、Paddle Movement Range、Paddle Aimed Rebound、Paddle Sizes、Paddle Hit Feedback And Combo Reset、Flipper Input Mapping、Flipper Stroke Motion、Flipper Shot Power、Flipper Mode Bottom Geometry、Flipper Timing Hint、Flipper Wide Item、Flippers Visible When Needed、Plunger Ready State、Plunger Drag Pull、Plunger Keyboard Charge、Plunger Minimum Pull、Plunger Launch Speed、Plunger Launch Preview。驗收：每條規則的數值能在 `tuning.js`／`data.js`／`game.js`／`physics.js` 找到對應，`spxa validate baseline-specs` 通過
- [x] 1.2 台面與關卡 5 份規則書寫的是程式目前的行為：Table Height Per District、Layout Rotation Per Stage、Pop Bumpers、Fish Bumper A-Fin、Boss Stages Use No Fish、Rubber Rails、Layouts Have No Stuck Spots、Fifty Stages In Five Districts、Text-Shaped Brick Patterns、Brick Grid Placement、Brick Hit Points、Brick Damage And Bounce、Gift Bricks、Stage Clear、Boss Spawn And Stats、Boss Side To Side Movement、Boss Brick Refill、Boss Enrage、Boss Damage And Defeat、Boss Stage Rules、Upgrade Draw On Stage Clear、Upgrade Can Effects、Mid-District Start Upgrade Backfill、Item Inventory And Sources、Item Use From The Item Bar、Item Effects、Stage Medal By Hearts Lost、Best Medal Is Kept、Achievement Catalog、Achievement Unlock Conditions、Achievement Unlock Is Permanent。驗收：同 1.1
- [x] 1.3 輔助、劇情、介面、表現與平衡 6 份規則書寫的是程式目前的行為：Per-District Assist Schedule、Trajectory Preview、Landing Ring And Flipper Timing Hint、Extended Ball Save、Finisher Assist、Interactive Tutorial、Comic Panel Reveal Sequence、Comic Tap Advance And Skip、Story Playback Schedule、Story Replay Gallery、Fairy Tale Story Content、Comic Layout Constraints、UI Opening Gate And Title Screen、UI Map And Stage Select、UI Pause Menu、UI Stage Results Screen、UI Game Over Continue Screen、UI Control Select、Art Controls Always Visible When Acting、Art Stage Intro Camera、Art Stage Clear Cinematic、Art Paint Splats Persist For The Stage、Audio Sound And Music Toggles、Haptics Vibration Toggle、Haptics Event Vibration Patterns、Audio Sound Effects、Audio Adaptive Music、Balance Human-Like Bot Profiles、Balance Difficulty Targets、Tuning Panel Live Sliders、Tuning Persistence And Reset、Tuning Practice Mode、Tuning Copy Changed Values、Tuning Panel Excluded From Test Page。驗收：同 1.1

## 2. 中文說明（English Rules With Chinese Notes）

- [x] 2.1 每條規則下面都有一行 `> 中文：` 白話說明，企劃不用懂英文也看得懂。驗收：16 份規則書共 95 條規則、95 行中文說明（用搜尋計數），`spxa analyze baseline-specs` 沒有語言相關的 Critical

## 3. 情境與測試對照（Scenario To Test Mapping）

- [x] 3.1 16 份 `coverage/<capability>.md` 把每個情境歸成「已有測試／不需測試／缺測試」，引用的測試名稱在 `web/street/js/tests.js` 或 `tests/run_tests.gd` 真的存在。驗收：抽查每份至少 1 個「已有測試」列
- [x] 3.2 遊戲行為沒有改變。驗收：`web/street/test.html` 22/22 通過、Godot `tests/run_tests.gd` 9/9 通過

## 4. 企劃確認

- [x] 4.1 企劃讀過 16 份規則書的中文說明，確認「遊戲現在就是這樣」。驗收：企劃在對話中回覆確認
- [x] 4.2 把盤點發現的「文件與程式不一致」與疑似 bug（例如按住空白鍵發射桿一直歸零、音效開關重新整理後不記得、已通關街區的「從頭再打一次」從第 10 關開始、跳過漫畫也算看過）整理成清單交給企劃決定。驗收：企劃對每一項選「改程式／改規則／不處理」，選「改」的各開一張申請單

## 5. 功能規劃書改為參考用（Feature Docs Become Reference）

- [x] 5.1 歸檔後 Obsidian `彈珠專案/01 功能規劃書` 每份最上面註明「正式規則在 `docs/spectra/specs/<capability>/spec.md`」，`CLAUDE.md` 的文件規則改成以 `docs/spectra/specs/` 為準。驗收：開啟任一份功能規劃書看得到註記；`CLAUDE.md` 的文件規則段落提到 `docs/spectra/specs/`
