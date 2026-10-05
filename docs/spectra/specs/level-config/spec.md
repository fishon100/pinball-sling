# level-config Specification

## Purpose

Level config lets game planners tune every stage without programming: a Google Sheet level table in the team Drive is the planner-owned source for brick walls, items, table layouts, difficulty knobs and boss stats, and the game reads a synced copy of it. It exists because per-stage balancing is a planner job and must not depend on code formulas.

## Requirements

### Requirement: Level Table Drives Every Stage

The game SHALL build all 50 stages from the synced level data `SR.LEVELS` (file `web/street/js/levels.js`, generated from the planner sheets 「關卡設定表」 and 「台面配置表」 in the Drive folder 「噴漆闖關 關卡設定」). For stage n the game SHALL take the brick wall, item pool, table layout, paddle size, ball radius, trail length, trajectory preview, landing hint, extra ball save, finisher assist, boss stats and par time from row n, and the layout geometry (pop bumpers, fish, rubber rails, boost pads) from the layout table. The code formula `SR.generateStage(n)` SHALL be kept only to produce the first table and as the reference for reports.

> 中文：50 關全部照「關卡設定表」和「台面配置表」（同步後的 levels.js）來建；程式裡的公式只留著當第一版和參考用。

#### Scenario: A table edit changes the game

- **WHEN** row 12 of the level table sets the paddle to L and changes its first brick row to "333333333", and the table is synced
- **THEN** stage 12 starts with the large paddle and its first brick row has nine 3 HP bricks

#### Scenario: Table rows are independent

- **WHEN** only row 12 is changed and synced
- **THEN** every other stage builds exactly as before

---
### Requirement: Brick Wall Codes

Each stage row SHALL hold its brick wall in columns 「第1排」 to 「第11排」, one row of exactly 9 characters per column, top row first; empty columns end the wall. The characters SHALL mean: `.` empty cell, `1`–`5` a brick with that many HP, `B` a paint bucket (1 HP), `G` a gift brick (1 HP, releases an item capsule), `X` the boss position. A row made only of digits that the sheet returned as a number SHALL be read as the same 9 characters.

> 中文：磚牆一排 9 個字：. 空格、1～5 磚血、B 油漆桶、G 道具磚、X 首領；全是數字的排被試算表當成數字也照樣讀成 9 個字。

#### Scenario: Codes become cells

- **WHEN** a row reads ".1G.B..5."
- **THEN** the stage has a 1 HP brick in column 2, a 1 HP gift brick in column 3, a paint bucket in column 5 and a 5 HP brick in column 8, and the other cells are empty

#### Scenario: Numeric row is read as text

- **WHEN** the sheet returns the number 222232233 in a wall column
- **THEN** the row is read as "222232233"

---
### Requirement: First Table Reproduces The Game

The first level table (exported 2026-10-05 from game v3.7.1) SHALL reproduce the formula-generated game exactly: for every stage, the same cells (row, column, type, HP), layout, paddle size, ball radius, trail, assists, boss stats and par time as `SR.generateStage(n)` and the v3.7.1 per-district functions. After planners edit the table this comparison SHALL become a report that lists which stages differ from the first table.

> 中文：第一版關卡表跟原本公式產生的遊戲完全一樣；之後企劃改過表，這項檢查就變成「哪些關跟第一版不一樣」的報告。

#### Scenario: Migration changes nothing

- **WHEN** the first table is synced and all 50 stages are built from it
- **THEN** zero stages differ from the formula-generated stages

---
### Requirement: Level Sync Checks

When a planner says 「同步關卡表」, the sync SHALL download both sheets as CSV, convert them, and block the sync with a list of "stage, column, problem" when any of these breaking rules fails: a required column is missing or renamed; a value is out of range (paddle not S/M/L, ball radius not 8–16, trail not 0–20, preview not 0–2 s, extra ball save not 0–10 s, landing hint and finisher not 是/否, item pool not 「隨機」 or a comma list of bomb/slow/save/ball/wide, boss HP 1–200, boss speed 0–300, boss refill 1–30 s, par time 10–600 s); the layout id is not in the layout table; a wall row is not 9 characters or has another character; a boss stage (10, 20, 30, 40, 50) lacks exactly one X or a normal stage has an X; a stage has no brick and no boss; bricks do not fit the table (more than 40% of cells cut off, or a brick within 2 px of a wall); a layout has a stuck spot; a bumper, fish lane or boost pad is closer than 46 px to a brick; a boss cannot be beaten by the machine bot within 7 minutes. Difficulty measurements SHALL be reported but SHALL NOT block. Before deploying, the sync SHALL list which stages changed since the last sync and wait for the planner's confirmation.

> 中文：說「同步關卡表」時，欄位缺漏、數值超出範圍、磚牆字元不對、首領位置不對、磚放不進台面、卡球、柱子貼磚、首領打不倒，都會擋下並列出「第幾關、哪一欄、什麼問題」；難度只報告不擋；部署前先列出這次改了哪幾關，企劃確認才部署。

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

---
### Requirement: Item Pool Per Stage

Each gift brick SHALL release a capsule whose item is drawn uniformly from the stage's item pool: all five items when the pool is 「隨機」, otherwise only the listed items.

> 中文：每關的道具池決定道具磚會掉什麼：「隨機」＝5 種都有可能，填道具代號就只會掉那幾種。

#### Scenario: Restricted pool

- **WHEN** stage 12's item pool is "wide" and a gift brick of stage 12 breaks
- **THEN** the capsule holds wide

---
### Requirement: Brick Pattern Editor

The page `web/street/editor.html` SHALL let a planner pick any stage, show its brick wall drawn with the game's art on the stage's own table (cells cut off by the arc are shown as unavailable), cycle a clicked cell through `.`, `1`–`5`, `B`, `G` (and `X` on boss stages), add or remove rows (up to 11), show the brick count, total HP and gift count live, and copy the wall as tab-separated text that pastes into the stage's 「第1排」 to 「第11排」 cells of the level table.

> 中文：磚塊圖案編輯器：選一關 → 用遊戲美術畫出磚牆 → 點格子切換 . 1～5 B G（首領關多 X）→ 可加減排數 → 即時顯示磚數、總血量、道具數 → 「複製」後直接貼到試算表那一關的第1排～第11排。

#### Scenario: Edit and copy

- **WHEN** the planner opens stage 12, clicks the first cell of row 2 three times and presses 「複製」
- **THEN** the clipboard holds 8 tab-separated wall rows whose second row starts with the code reached after three clicks and is otherwise unchanged
