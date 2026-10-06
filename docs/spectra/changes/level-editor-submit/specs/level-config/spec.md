## MODIFIED Requirements

### Requirement: Level Table Drives Every Stage

The game SHALL build all 50 stages from the synced level data `SR.LEVELS` (file `web/street/js/levels.js`). Every column (brick walls, table layouts, and the stage settings: name, item pool, layout, paddle size, ball radius, trail length, trajectory preview, landing hint, extra ball save, finisher assist, boss stats, par time) SHALL come from the level editor: edits submitted from the editor and applied with 「套用關卡修改」 SHALL be written into `levels.js`. The planner sheets SHALL be a generated copy; syncing them with 「同步關卡表」 SHALL remain possible for bulk edits. For stage n the game SHALL take the brick wall, item pool, table layout, paddle size, ball radius, trail length, trajectory preview, landing hint, extra ball save, finisher assist, boss stats and par time from row n of `SR.LEVELS`, and the layout geometry (pop bumpers, fish, rubber rails, boost pads) from its layouts. The code formula `SR.generateStage(n)` SHALL be kept only to produce the first table and as the reference for reports.

> 中文：50 關全部照 levels.js 來建。所有欄位（磚牆、台面、數值）都以**關卡編輯器**為主（送出後說「套用關卡修改」寫進遊戲）；試算表是 AI 產生的備份，想大量改時仍可以改表再說「同步關卡表」。程式裡的公式只留著當第一版和參考用。

#### Scenario: A table edit changes the game

- **WHEN** stage 12's paddle is set to L in the editor's settings mode, submitted and applied
- **THEN** stage 12 starts with the large paddle

#### Scenario: An editor edit changes the game

- **WHEN** stage 12's first brick row is changed to "333333333" in the editor, submitted and applied
- **THEN** stage 12's first brick row has nine 3 HP bricks

#### Scenario: Table rows are independent

- **WHEN** only row 12 is changed and synced
- **THEN** every other stage builds exactly as before

### Requirement: Level Sync Checks

When a planner says 「同步關卡表」, the sync SHALL download both sheets as CSV, convert them, and block the sync with a list of "stage, column, problem" when any of these breaking rules fails: a required column is missing or renamed; a value is out of range (paddle not S/M/L, ball radius not 8–16, trail not 0–20, preview not 0–2 s, extra ball save not 0–10 s, landing hint and finisher not 是/否, item pool not 「隨機」 or a comma list of bomb/slow/save/ball/wide, boss HP 1–200, boss speed 0–300, boss refill 1–30 s, par time 10–600 s); the layout id is not in the layout table; a wall row is not 9 characters or has another character; a boss stage (10, 20, 30, 40, 50) lacks exactly one X or a normal stage has an X; a stage has no brick and no boss; bricks do not fit the table (more than 40% of cells cut off, or a brick within 2 px of a wall); a layout has a stuck spot; a bumper, fish lane or boost pad is closer than 46 px to a brick; a boss cannot be beaten by the machine bot within 7 minutes. Difficulty measurements SHALL be reported but SHALL NOT block. Before deploying, the sync SHALL list which stages changed since the last sync and wait for the planner's confirmation. When any column of the sheet differs from the current `levels.js`, that difference SHALL be marked "⚠ 會蓋掉編輯器的修改" in the list.

> 中文：說「同步關卡表」時，欄位缺漏、數值超出範圍、磚牆字元不對、首領位置不對、磚放不進台面、卡球、柱子貼磚、首領打不倒，都會擋下並列出「第幾關、哪一欄、什麼問題」；難度只報告不擋；部署前先列出這次改了哪幾關，企劃確認才部署；表裡任何欄位跟遊戲不一樣時，標「⚠ 會蓋掉編輯器的修改」。

#### Scenario: Broken value is blocked

- **WHEN** row 7 sets the paddle to "Q" and row 9 has a brick "9" in its third wall row
- **THEN** the sync is blocked and lists "第 7 關・滑板：只能是 S／M／L" and "第 9 關・第3排：只能用 . 1～5 B G X"

##### Example: Range checks

| Column | Value | Result |
|---|---|---|
| 球半徑 | 7 | blocked (8–16) |
| 球半徑 | 10.5 | ok |
| 道具池 | bomb,wide | ok |
| 道具池 | bomb,lazer | blocked (unknown item) |
| 台面配置 | z_new | blocked unless z_new is in the layout table |

#### Scenario: Difficulty only reports

- **WHEN** a synced table makes district 1 lose 2 hearts per stage for the novice bot
- **THEN** the sync is not blocked and the report shows the measured hearts per stage and seconds per district

#### Scenario: Stale sheet would overwrite an editor edit

- **WHEN** stage 12's brick wall was changed in the editor and applied, and an older sheet is synced
- **THEN** the change list SHALL show stage 12's brick rows marked "⚠ 會蓋掉編輯器的修改"

## ADDED Requirements

### Requirement: Stage Settings Editor

The level editor SHALL have a third mode 「設定」 that edits the selected stage's name, item pool (「隨機」 or any of bomb/slow/save/ball/wide), layout (any layout id), paddle (S/M/L), ball radius, trail, trajectory preview seconds, landing hint, extra ball save seconds, finisher assist and par seconds, and for boss stages boss HP, speed and refill seconds. Each number SHALL use the same allowed range as 「Level Sync Checks」; an out-of-range value SHALL be marked on its field with the allowed range, and 送出修改 SHALL be disabled while any field is invalid.

> 中文：編輯器的「設定」模式可以改這一關的名稱、道具池、台面配置、滑板、球半徑、拖尾、彈道預覽、落點提示、加長球保險、收尾輔助、標準時間，首領關多首領血量、速度、補磚秒；超出範圍的數字當場標出允許範圍，有錯就不能送出。

#### Scenario: Change a stage setting

- **WHEN** the planner sets stage 12's paddle to L and ball radius to 14 in 設定 mode
- **THEN** 送出修改 SHALL list 第 12 關 (滑板、球半徑) and the edit file SHALL contain those two values

#### Scenario: Out-of-range value blocks submit

- **WHEN** the planner types 20 into 球半徑
- **THEN** the field SHALL show 8–16 and 送出修改 SHALL be disabled

##### Example: Allowed ranges

| Field | Allowed |
|---|---|
| 球半徑 | 8–16 |
| 拖尾 | 0–20 |
| 彈道預覽秒 | 0–2 |
| 加長球保險秒 | 0–10 |
| 標準時間秒 | 10–600 |
| 首領血量 | 1–200 |
| 首領速度 | 0–300 |
| 首領補磚秒 | 1–30 |

### Requirement: Editor Submit

The level editor SHALL offer a "送出修改" button that lists the stages whose brick wall or settings changed (naming the changed settings) and the layouts that changed or were added, and on confirmation SHALL submit one edit file `tools/levels/edits/<YYYYMMDD-HHMMSS>.json` containing only those changes and an optional note. When the browser holds a console login token with write access to the repository the editor SHALL commit the file directly; otherwise it SHALL open GitHub's new-file page pre-filled with the file name and content. The editor SHALL keep unsent edits in the browser (localStorage) and, when reopened with a draft, SHALL offer to continue it; the draft SHALL be cleared after a successful submit. With no changes the button SHALL say there is nothing to submit.

> 中文：編輯器的「送出修改」會列出這次改了哪幾關、哪些台面，確認後送出成一個修改檔；有管理台登入碼就直接送出，沒有就打開填好的 GitHub 頁面按一下。還沒送出的修改自動暫存在這台電腦的瀏覽器，下次打開會問要不要接著改。

#### Scenario: Submit lists only changed stages

- **WHEN** the planner changes stage 3's brick wall and moves a bumper of layout a_pair, then presses 送出修改
- **THEN** the confirmation SHALL list 第 3 關 (磚牆) and 台面 a_pair, and the edit file SHALL contain only stage 3's grid and layout a_pair

#### Scenario: Draft survives a reload

- **WHEN** the planner changes stage 5's brick wall and reloads the editor without submitting
- **THEN** the editor SHALL offer to continue the draft and restore stage 5's change

#### Scenario: Nothing to submit

- **WHEN** nothing was changed
- **THEN** 送出修改 SHALL report there is nothing to submit and SHALL NOT create a file

### Requirement: Apply Editor Edits

「套用關卡修改」 (`node tools/levels/apply.js`) SHALL merge every edit file in `tools/levels/edits/` in name order into the current level data, run the same checks as 「同步關卡表」, and SHALL block and list problems as "第幾關・什麼問題". Without `--write` it SHALL only list which stages and columns would change. With `--write` it SHALL write `levels.js`, run the blocking tests, move the applied edit files to `tools/levels/edits/applied/`, and write the current tables to `tools/levels/out/關卡設定表.xlsx` and `tools/levels/out/台面配置表.xlsx` in the same columns as the planner sheets.

> 中文：說「套用關卡修改」時，AI 把還沒套用的修改檔依送出順序合併、檢查（跟同步關卡表一樣），先列出改了哪幾關給企劃確認；確認後寫進遊戲、跑測試，並產生最新版的兩份關卡表給企劃換掉 Google Drive 上的舊表。

#### Scenario: Apply an edit

- **WHEN** an edit file changes stage 3's grid and apply runs with --write
- **THEN** levels.js stage 3 SHALL have the new grid, the file SHALL be in edits/applied/, and out/關卡設定表.xlsx row 3 SHALL show the new grid

#### Scenario: A bad edit is blocked

- **WHEN** an edit puts a bumper 20 px from a brick
- **THEN** apply SHALL stop, report the stage and problem, and SHALL NOT change levels.js

#### Scenario: Exported table reads back the same

- **WHEN** out/關卡設定表.xlsx and out/台面配置表.xlsx are synced with 「同步關卡表」
- **THEN** the sync SHALL report no changes
