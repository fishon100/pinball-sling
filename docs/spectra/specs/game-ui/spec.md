# game-ui Specification

## Purpose

The game UI defines which screens exist and how the player moves between them: the first-run opening gate, the title, the city map with stage select, the pause menu, the stage results screen, the game-over continue screen and the control select. It exists so every flow has a clear way forward, a way back and no dead ends.

## Requirements

### Requirement: UI Opening Gate And Title Screen

On launch the game SHALL show the opening animation when save.seenOpening is not true, and the title screen otherwise. The opening SHALL wait on an "INSERT COIN" screen until the first tap or key; it SHALL then play for 7 s and go to the title. A tap or key more than 0.8 s into playback SHALL skip to the title. Reaching the title from the opening SHALL set save.seenOpening to true. The title screen SHALL offer: "開始" (go to the map and start district 1 music), "成就 N/19", a music toggle "音樂：開／關", "重看開場" (replay the opening) and the control button "操作：…" that opens the control select and returns to the title.

> 中文：第一次打開遊戲先看投幣開場（約 7 秒，可跳過），之後直接到標題；標題可以開始、看成就、開關音樂、重看開場、換操作方式。

#### Scenario: First launch shows the opening

- **WHEN** the game loads with an empty save
- **THEN** the "INSERT COIN" screen SHALL be shown, and after one tap and 7 s the title SHALL appear with save.seenOpening true

#### Scenario: Later launches skip the opening

- **WHEN** the game loads with save.seenOpening true
- **THEN** the title screen SHALL be shown directly

#### Scenario: Skip the opening

- **WHEN** the player taps 1 s after inserting the coin
- **THEN** the title screen SHALL appear immediately


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: UI Map And Stage Select

The map SHALL show the cleared count "已解放 N/50" (N = unlocked - 1), gold/silver/bronze medal counts, and 5 district cards with 10 stage buttons each. Each stage button SHALL show its stage number and SHALL be at least 44 CSS px wide and tall on a 375 px wide screen; the 10 buttons SHALL be laid out as a route in two rows (stages 1–5 left to right, stages 6–10 right to left) joined by a road. The routes of consecutive districts SHALL form one continuous street: the road SHALL continue from the last stage of district N (bottom-left) down the left side to the first stage of district N+1 (top-left), and each district's text (name, story, assists, next stage, secondary button) SHALL sit above its route, indented so the road can pass on its left. All 5 districts SHALL be shown in one map frame; a locked district's road SHALL be drawn greyed out. A stage button SHALL be selectable when its number is ≤ save.unlocked: cleared buttons SHALL also show their medal's first character (金／銀／銅), the next stage SHALL show "▶", uncleared boss stages SHALL show "王", and stages above save.unlocked SHALL be disabled and show a lock. Each unlocked district card SHALL show, below the route, the stage its secondary button starts as "▶ 第 N 關・<名稱>". A district SHALL be unlocked when save.unlocked ≥ its first stage; a locked card SHALL show "？？？", "LOCKED" and "🔒 尚未解鎖". An unlocked card's secondary button SHALL read "出發", "繼續：第 N 關" or "從頭再打一次". "從頭再打一次" (save.unlocked above the district's last stage) SHALL start the district's first stage; otherwise the button SHALL start stage max(first stage of the district, save.unlocked). Selecting stage n SHALL start a new run with 3 hearts in n's district; when n is not the district's first stage the run SHALL be pre-built with one simulated upgrade per skipped stage. The map SHALL also offer "📖 劇情回放", "成就", "操作：…", "重看教學" and "回標題".

> 中文：地圖每區 10 個有編號的關卡按鈕，排成一條來回的街道路線（手機上每顆至少 44 px）；打過的和下一關都能直接點來玩，還沒解鎖的顯示鎖頭；按鈕下方顯示主按鈕會開始的那一關（第 N 關・關名）；「出發／繼續／從頭再打一次」變成次要按鈕。5 區的路連成一整條街：第 10 關的路往下轉彎接第 11 關，一路到第 50 關；每區的介紹放在路線上方、往右縮排，路從左邊經過；還沒解鎖的區路一樣畫出來但變灰。

#### Scenario: Stage buttons show numbers

- **WHEN** the map is shown with save.unlocked 1
- **THEN** district 1 SHALL show 10 stage buttons labelled 1 to 10, button 1 SHALL show "▶", and buttons 2–10 SHALL be disabled

#### Scenario: Stage buttons are big enough to tap

- **WHEN** the map is shown on a 375 px wide screen
- **THEN** every stage button in an unlocked district SHALL be at least 44 × 44 CSS px

#### Scenario: Route order

- **WHEN** the map is shown
- **THEN** in each district stages 1–5 SHALL be in the first row from left to right and stages 6–10 SHALL be in the second row from right to left

#### Scenario: Districts form one continuous street

- **WHEN** the map is shown
- **THEN** for each district N from 1 to 4 a road segment SHALL run from below stage 10N to above stage 10N+1, both stage buttons SHALL be horizontally aligned with that segment (centres within 4 px), and no district text SHALL overlap the segment

#### Scenario: Pick an already cleared stage

- **WHEN** save.unlocked is 7 and the player taps stage button 3
- **THEN** stage 3 SHALL start with 3 hearts and a run built from 2 simulated upgrade picks

#### Scenario: Locked stage cannot be picked

- **WHEN** save.unlocked is 7
- **THEN** stage button 8 SHALL be disabled and the district 2 card SHALL show "🔒 尚未解鎖"

#### Scenario: Next stage name

- **WHEN** save.unlocked is 3
- **THEN** the district 1 card SHALL show "第 3 關・" followed by stage 3's name

#### Scenario: Replay a finished district from its first stage

- **WHEN** save.unlocked is 11 and the player taps "從頭再打一次" on the district 1 card
- **THEN** stage 1 SHALL start

##### Example: District card secondary button

| save.unlocked | District 1 button | Starts stage |
|---|---|---|
| 1 | 出發 | 1 |
| 6 | 繼續：第 6 關 | 6 |
| 11 | 從頭再打一次 | 1 |
| 51 | 從頭再打一次 | 1 |


<!-- @trace
source: stage-select-map
updated: 2026-10-06
code:
  - web/street/js/game.js
  - docs/street/editor.html
  - docs/street/js/game.js
  - web/street/index.html
  - docs/street/js/tests.js
  - web/street/editor.html
  - web/street/js/tests.js
  - docs/企劃/開發日誌.md
  - web/street/test.html
  - tools/workbench/sync.mjs
  - docs/street/test.html
  - docs/street/index.html
  - docs/企劃/.mirror.json
-->

---
### Requirement: UI Pause Menu

During play (screen "play" only), the ❚❚ button, Escape or P SHALL pause the game, freeze physics and show "PAUSE" with: "繼續", sound toggles "音效：開／關", "音樂：開／關", "震動：開／關", the button "🎚 手感調整（邊玩邊調）" when the tuning panel is loaded, and "放棄這一輪，回地圖". Toggling a setting SHALL keep the menu open with the new label. "🎚 手感調整" SHALL open the tuning panel and resume play. "放棄這一輪，回地圖" SHALL discard the run and show the map. Pressing pause again, Escape, P or "繼續" SHALL resume.

> 中文：遊戲中按暫停可以繼續、開關音效／音樂／震動、打開手感調整，或放棄這一輪回地圖。

#### Scenario: Pause freezes the table

- **WHEN** the player presses Escape during play
- **THEN** the pause menu SHALL appear and no ball SHALL move until the player resumes

#### Scenario: Pause is unavailable outside play

- **WHEN** the player presses Escape during the stage intro or on the map
- **THEN** the pause menu SHALL NOT open


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: UI Stage Results Screen

After the stage-clear cinematic the game SHALL show "WALL CLEARED!", the medal (金牌 for 0 hearts lost, 銀牌 for 1, 銅牌 for 2 or more or after a continue) with a one-line reason, the upgrade drawn this stage (non-boss stages only), and stats: stage number and name, time in seconds with one decimal, hearts lost this stage, best combo and score. Non-boss stages SHALL also show "過關回 1 顆愛心 ♥ N". The screen SHALL offer three buttons: the next button ("下一關 ▶（第 N+1 關）" on normal stages, "繼續" on boss stages, "看結局" on stage 50), "↻ 重玩這關" and "回地圖". The next button SHALL play any after-stage comic and then go to the next stage, the district-cleared screen (boss stages) or the credits (stage 50). "↻ 重玩這關" SHALL restart the same stage in the same run without comics.

> 中文：過關後看到獎牌和成績，可以選下一關、重玩這關或回地圖。

#### Scenario: Retry keeps the run

- **WHEN** the player clears stage 4 and presses "↻ 重玩這關"
- **THEN** stage 4 SHALL restart with the run's current hearts, score and upgrades, and no comic SHALL play

#### Scenario: Boss stage result

- **WHEN** the player clears stage 10
- **THEN** no upgrade SHALL be drawn, the next button SHALL read "繼續", and pressing it SHALL play "d1_clear" and then show "ALLEY FREE!"


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: UI Game Over Continue Screen

When hearts reach 0 the game SHALL show "GAME OVER?" after 0.7 s with the stage reached, run score, bricks broken and best combo, and SHALL offer "🪙 投幣續關（從這一關重來）", "整區重來" and "回地圖". Continuing SHALL restart the same stage with 3 hearts, keep upgrades, halve the score (rounded down) and cap that stage's medal at 銅牌. "整區重來" SHALL start a new run at the district's first stage.

> 中文：愛心用完可以投幣續關（分數減半、這關最多銅牌）、整區重來或回地圖。

#### Scenario: Continue halves the score

- **WHEN** the run has 1,235 points and the player presses "🪙 投幣續關"
- **THEN** the same stage SHALL restart with 3 hearts and 617 points


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: UI Control Select

The control select screen SHALL offer "🛹 滑板（推薦）" and "🎰 經典擋板", mark the active one "（使用中）", save the choice to save.control immediately and return to the screen it was opened from (title or map) via "返回". A new save SHALL default to paddle control. The choice SHALL apply from the next stage start.

> 中文：可以選滑板（推薦、預設）或經典擋板，選了會記在存檔裡。

#### Scenario: Switch to flippers

- **WHEN** the player opens the control select from the map and picks "🎰 經典擋板"
- **THEN** save.control SHALL be "flipper", the option SHALL show "（使用中）" and the next started stage SHALL use two flippers

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->