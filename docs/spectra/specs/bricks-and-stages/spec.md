# bricks-and-stages Specification

## Purpose

Bricks and stages turn walls of grey bricks shaped like letters and pictures into the game's 50 stages across 5 districts. The capability defines how each stage's brick grid is generated, how bricks take damage, and when a stage counts as cleared.

## Requirements

### Requirement: Fifty Stages In Five Districts

The game SHALL have 50 stages numbered 1 to 50, grouped into 5 districts of 10 stages each (alley 1–10, subway 11–20, rooftops 21–30, riverside 31–40, downtown 41–50). The 10th stage of every district (stages 10, 20, 30, 40, 50) SHALL be a boss stage and every other stage SHALL NOT contain a boss. Every stage SHALL be generated deterministically by `SR.buildStage(n)` from the fixed seed `n × 7919 + 13`, so the same stage number always yields the same bricks.

> 中文：遊戲有 5 區 × 10 關共 50 關，每區第 10 關是首領關；同一關每次產生的磚都一樣。

#### Scenario: Boss only on every 10th stage

- **WHEN** stages 1 to 50 are built and placed on their tables
- **THEN** a boss exists on stage n exactly when n mod 10 = 0, and every stage has at least one brick or a boss

#### Scenario: Stage generation is repeatable

- **WHEN** `SR.buildStage(n)` is called twice for the same n
- **THEN** both results have identical cells (row, column, type and HP)


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Text-Shaped Brick Patterns

Each non-boss stage SHALL use pattern `SR.PATTERNS[(local + d × 3) mod 13]`, where `d` is the 0-based district index and `local` is `(n-1) mod 10`. The 13 patterns SHALL be HI, 愛心, 笑臉, 箭頭, 條紋, 金字塔, 棋盤, 鑽石, 堡壘, GO, YO, OK and :). From district 2 on (d ≥ 1) the pattern SHALL be mirrored left-right with 50% chance; from district 3 on (d ≥ 2) the game SHALL append `min(3, d - 1)` extra rows copied from the last rows. Boss stages SHALL use the 灰先生 boss pattern without mirroring or extra rows. Each pattern character SHALL map to a cell: `.` empty, `1`–`3` a brick with that base HP, `B` a paint bucket, `X` the boss.

> 中文：關卡是用 13 種文字／圖案排成的磚牆；第 2 區起會隨機左右翻轉，第 3 區起多加 1～3 排。

#### Scenario: Pattern choice by stage

- **WHEN** stages are generated
- **THEN** the stage name equals the chosen pattern's name

##### Example: Pattern per stage

| Stage | d | local | Pattern |
|---|---|---|---|
| 1 | 0 | 0 | HI |
| 9 | 0 | 8 | 堡壘 |
| 11 | 1 | 0 | 箭頭 |
| 21 | 2 | 0 | 棋盤 |
| 41 | 4 | 0 | :) |
| 30 | 2 | 9 | 首領：灰先生 |

#### Scenario: Extra rows in later districts

- **WHEN** a non-boss stage of district 3, 4 or 5 is generated
- **THEN** its row count is the pattern's row count plus 1, 2 or 3 respectively


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Brick Grid Placement

The game SHALL lay bricks on a 9-column grid with 35 × 20 px cells and 33 × 18 px bricks, starting at x = 21 and y = 96 plus the table top offset. A cell SHALL be skipped when any of its four corners lies above the arc center line and more than 168 px from the arc center, or lies left of x = 22 or right of x = 338. Skipped cells SHALL NOT exceed 40% of a stage's non-boss cells, and no placed brick SHALL come within 2 px of any wall segment.

> 中文：磚塊排在 9 欄的格子裡，被頂部圓弧或牆切到的格子會自動略過，但每關至少保留 6 成的磚。

#### Scenario: All 50 stages fit their tables

- **WHEN** each of the 50 stages is placed on its own layout
- **THEN** at least 60% of its non-boss cells become bricks and no brick is closer than 2 px to a wall


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Brick Hit Points

The game SHALL give each `1`–`3` brick its digit as base HP, then add 1 HP with probability `min(0.65, 0.14 × d + 0.025 × local)`. Brick HP SHALL NOT be reduced in any district (the former district 4–5 reduction of 1 HP is removed, which makes district 4–5 bricks harder than before). Brick HP SHALL be capped at 5. Paint buckets and gift bricks SHALL always have 1 HP.

> 中文：磚血從圖案的數字開始，越後面的區與關越容易多 1 血（最多 65% 機率），最多 5 血；第 4、5 區不再「每塊少 1 血」，所以比以前硬。

#### Scenario: No bonus HP on the first stage

- **WHEN** stage 1 is generated
- **THEN** every brick's HP equals its pattern digit (bonus chance 0)

##### Example: Bonus HP chance

| Stage | d | local | Bonus chance |
|---|---|---|---|
| 1 | 0 | 0 | 0 |
| 9 | 0 | 8 | 0.20 |
| 15 | 1 | 4 | 0.24 |
| 35 | 3 | 4 | 0.52 |
| 49 | 4 | 8 | 0.65 (capped from 0.76) |

#### Scenario: Late districts are no longer reduced

- **WHEN** any normal brick in stages 31–49 (excluding boss stages) is generated
- **THEN** its HP is at least its pattern digit and at most its pattern digit + 1

---
### Requirement: Brick Damage And Bounce

When a ball hits a live brick with a normal speed above 60 px/s, and the same ball has not hit that brick within the last 0.05 s, the game SHALL subtract the current damage (1 plus the "heavy" upgrade level) from the brick's HP. A brick whose HP reaches 0 or below SHALL be destroyed and SHALL score `round(10 × maxHP × (1 + combo / 10))` points. Unless the ball has pierce charges left, the ball SHALL bounce off with a normal speed of `max(0.85 × incoming normal speed, 180)` px/s. When a paint bucket (`B`) is destroyed, the game SHALL deal 1 damage to each live brick in the 8 surrounding cells, and buckets destroyed by this chain SHALL chain again up to a depth of 6.

> 中文：球打到磚會扣血並彈回（最少 180 的彈力，不會黏在磚上），血歸零磚就碎掉並加分；油漆桶碎掉會炸周圍 8 格各 1 血並可連鎖。

#### Scenario: Two hits destroy a 2 HP brick

- **WHEN** a ball moving up at 800 px/s hits a 2 HP brick, and then a second ball does the same
- **THEN** after the first hit the brick has 1 HP and the ball moves downward, and after the second hit the brick is gone

#### Scenario: Slow touches do not damage

- **WHEN** a ball touches a brick with a normal speed of 50 px/s
- **THEN** the brick's HP is unchanged and the ball bounces off at 180 px/s

#### Scenario: Bucket damages its neighbors

- **WHEN** a bucket with eight 1 HP neighbors is destroyed by a ball
- **THEN** all eight neighbors are destroyed in the same step


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Gift Bricks

From stage 2 on (stages 2–50), the game SHALL turn plain bricks into gold gift bricks with 1 HP: 2 or 3 per stage (50% chance each), including boss stages. It SHALL pick among the plain bricks with the lowest HP first (normally 1 HP bricks), so every stage from 2 to 50 gets its full count. Stage 1 (the tutorial stage) SHALL NOT have gift bricks. Destroying a gift brick SHALL release an item capsule (see power-ups-and-items, Item Capsules).

> 中文：第 2 關起每關一定有 2～3 塊金色道具磚（首領關也有，第 1 關教學關沒有）；先挑 1 血的磚，不夠就挑血最少的磚改成 1 血；打碎會掉下一顆道具膠囊。

#### Scenario: Gift count by stage

- **WHEN** stages 1–50 are generated
- **THEN** stage 1 has 0 gift bricks and every stage from 2 to 50 has 2 or 3 gift bricks, each with 1 HP

#### Scenario: Not enough 1 HP bricks

- **WHEN** stage 23 is generated (it has only one plain 1 HP brick)
- **THEN** it still has 2 or 3 gift bricks, the extra ones taken from the lowest-HP plain bricks and set to 1 HP

---
### Requirement: Stage Clear

A normal stage SHALL be cleared when no live brick of any type (grey, bucket, gift, or bricks added by the boss) remains. A boss stage SHALL be cleared when the boss is destroyed, and all remaining bricks SHALL then be destroyed as part of the clear effect. On clearing stage n the game SHALL unlock stage n + 1 and, for non-boss stages only, restore 1 heart up to a maximum of 5.

> 中文：一般關卡打碎全部磚才過關，首領關打倒灰先生就過關；過關會開下一關，一般關還會回 1 顆愛心（最多 5 顆）。

#### Scenario: Last brick clears the stage

- **WHEN** the last live brick on a normal stage is destroyed while the player has 3 hearts
- **THEN** the stage is cleared, the next stage is unlocked and the player has 4 hearts

#### Scenario: Hearts are capped at five

- **WHEN** a normal stage is cleared while the player has 5 hearts
- **THEN** the player still has 5 hearts

#### Scenario: Boss stage clears on boss defeat

- **WHEN** the boss's HP reaches 0 while other bricks are still alive
- **THEN** the stage is cleared, the remaining bricks are destroyed, and no heart is restored

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->
