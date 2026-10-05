# bricks-and-stages Specification

## Purpose

Bricks and stages turn walls of grey bricks shaped like letters and pictures into the game's 50 stages across 5 districts. The capability defines how each stage's brick grid is generated, how bricks take damage, and when a stage counts as cleared.

## Requirements

### Requirement: Fifty Stages In Five Districts

The game SHALL have 50 stages numbered 1 to 50, grouped into 5 districts of 10 stages each (alley 1–10, subway 11–20, rooftops 21–30, riverside 31–40, downtown 41–50). The 10th stage of every district (stages 10, 20, 30, 40, 50) SHALL be a boss stage and every other stage SHALL NOT contain a boss. Every stage SHALL be built from its row of the level table (see level-config), so the same table always yields the same bricks.

> 中文：遊戲有 5 區 × 10 關共 50 關，每區第 10 關是首領關；每一關照關卡設定表建立，表不變磚就不變。

#### Scenario: Boss only on every 10th stage

- **WHEN** stages 1 to 50 are built and placed on their tables
- **THEN** a boss exists on stage n exactly when n mod 10 = 0, and every stage has at least one brick or a boss

#### Scenario: Stage building is repeatable

- **WHEN** `SR.buildStage(n)` is called twice for the same n with the same level table
- **THEN** both results have identical cells (row, column, type and HP)

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

Each brick's HP SHALL be the digit written in its level-table wall cell (1–5). Paint buckets (`B`) and gift bricks (`G`) SHALL always have 1 HP. The first level table keeps the v3.7.1 values (pattern digit, a district- and stage-dependent chance of +1 HP, no district 4–5 reduction).

> 中文：每塊磚的血就是關卡表磚牆上寫的數字（1～5）；油漆桶和道具磚一律 1 血。

#### Scenario: HP comes from the table

- **WHEN** a stage's wall row is "123451234"
- **THEN** its bricks have 1, 2, 3, 4, 5, 1, 2, 3 and 4 HP from left to right

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

Gift bricks SHALL be exactly the cells marked `G` in the level table, each with 1 HP; destroying one SHALL release an item capsule (see power-ups-and-items, Item Capsules). The first level table has 2 or 3 gift bricks on every stage from 2 to 50, including boss stages, and none on stage 1.

> 中文：道具磚就是關卡表上標 G 的格子（1 血），打碎掉下一顆道具膠囊；第一版表是第 2 關起每關 2～3 塊、第 1 關沒有。

#### Scenario: Gift bricks follow the table

- **WHEN** a stage's wall has G in two cells
- **THEN** the stage has exactly two gift bricks, at those cells

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
