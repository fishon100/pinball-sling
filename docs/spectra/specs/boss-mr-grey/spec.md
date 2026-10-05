# boss-mr-grey Specification

## Purpose

Mr. Grey (灰先生) is the boss of every district's 10th stage: a moving grey block that keeps refilling grey bricks below itself and gets angry when badly hurt. The boss fight is the climax of each district and ties the gameplay to the story of the Tidy Bureau painting walls grey.

## Requirements

### Requirement: Boss Spawn And Stats

On each boss stage (stages 10, 20, 30, 40, 50) the game SHALL place one boss block of 110 × 44 px, horizontally centered (x = 145), at y = 136 plus the table top offset. With `d` as the 0-based district index, the boss SHALL have `18 + 9 × d` HP, a horizontal speed of `45 + 18 × d` px/s, and a brick-refill interval of `7 − 0.5 × d` seconds. The boss pattern SHALL also contain two rows of grey bricks below the boss (".1.2.2.1." and "11.1.1.11").

> 中文：首領灰先生出現在每區第 10 關台面上方，越後面的區血越多、動得越快、補磚越勤。

#### Scenario: Boss stats per district

- **WHEN** the boss stage of each district is built
- **THEN** the boss HP, speed and refill interval follow the table below

##### Example: Boss stats

| Stage | d | HP | Speed (px/s) | Refill interval (s) | Refill brick HP |
|---|---|---|---|---|---|
| 10 | 0 | 18 | 45 | 7.0 | 1 |
| 20 | 1 | 27 | 63 | 6.5 | 1 |
| 30 | 2 | 36 | 81 | 6.0 | 2 |
| 40 | 3 | 45 | 99 | 5.5 | 2 |
| 50 | 4 | 54 | 117 | 5.0 | 3 |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Boss Side To Side Movement

The boss SHALL move horizontally at its current speed and SHALL reverse direction when its left edge reaches x = 26 or its right edge reaches x = 336. A ball bouncing off the moving boss SHALL take on the boss's horizontal velocity in the bounce.

> 中文：灰先生在上方左右來回移動，碰到兩側就轉向。

#### Scenario: Boss turns at the right side

- **WHEN** the boss moving right would push its right edge past x = 336
- **THEN** its left edge is set to x = 226 and its horizontal velocity becomes negative with the same magnitude


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Boss Brick Refill

Every refill interval while the boss is alive (the first refill happens one full interval after the stage starts), the boss SHALL try to add 3 grey bricks in the grid row two rows below the boss's bottom edge (row 6 for the starting position), in the column under the boss's center and the columns directly left and right of it. A brick SHALL only be added to a cell that is empty (or holds a destroyed brick), lies inside the 9 columns, and fits inside the table arc. Added bricks SHALL have `1 + floor(d / 2)` HP. Each refill that adds at least one brick SHALL show the message "他在補灰磚！".

> 中文：灰先生每隔幾秒會在身體下方補 3 塊灰磚（格子有磚就不補），後面的區補的磚比較硬。

#### Scenario: Refill after the first interval

- **WHEN** stage 10 has run 7 seconds with the boss alive and the three cells under the boss are empty
- **THEN** three new 1 HP bricks appear in row 6 under the boss

#### Scenario: Occupied cells are not refilled

- **WHEN** a refill happens and the center cell under the boss still holds a live brick
- **THEN** that cell keeps its existing brick and only the empty neighboring cells receive new bricks


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Boss Enrage

The first time the boss's HP drops below 40% of its maximum HP, the boss SHALL become enraged: its horizontal speed SHALL be multiplied by 1.5 and its refill interval SHALL be multiplied by 0.75 for all following refills. The game SHALL show the popup "灰先生生氣了！" when this happens. Enrage SHALL happen at most once per boss.

> 中文：灰先生血量剩不到 4 成會暴怒：移動變快 1.5 倍、補磚間隔變成 0.75 倍。

#### Scenario: Enrage threshold

- **WHEN** the boss's HP falls below 40% of its maximum
- **THEN** it becomes enraged once, with speed and refill interval changed as in the table

##### Example: Enrage values

| Stage | Max HP | Enraged at HP ≤ | Speed after | Refill interval after (s) |
|---|---|---|---|---|
| 10 | 18 | 7 | 67.5 | 5.25 |
| 30 | 36 | 14 | 121.5 | 4.5 |
| 50 | 54 | 21 | 175.5 | 3.75 |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Boss Damage And Defeat

A ball hit on the boss above 60 px/s SHALL deal the current damage (1 plus the "heavy" upgrade level) and the ball SHALL always bounce off the boss, without using pierce charges. Paint bombs (the bomb item and the combo-bomb upgrade) SHALL also damage the boss when it is inside their radius. Paint-bucket chains and the splash upgrade SHALL NOT damage the boss. When the boss's HP reaches 0 the boss stage SHALL be cleared (see Stage Clear in bricks-and-stages), no upgrade SHALL be drawn, and after the clear comic the district-cleared screen SHALL follow. Every boss SHALL be beatable by the skilled auto player carrying a 9-upgrade random build within 7 minutes.

> 中文：球打灰先生會扣血並一定彈回（穿透漆對他無效），漆彈也炸得到他；打倒就過關、這區結束。

#### Scenario: Pierce does not pass through the boss

- **WHEN** a ball with 2 pierce charges hits the boss without killing it
- **THEN** the ball bounces off and still has 2 pierce charges

#### Scenario: All five bosses are beatable

- **WHEN** the skilled auto player plays stages 10, 20, 30, 40 and 50 three times each with a 9-upgrade random build
- **THEN** every run defeats the boss within 420 seconds


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Boss Stage Rules

On a boss stage the paddle SHALL use the small size (half-width 40 px), the layout SHALL have no fish bumper, and the finisher assist SHALL stay off. The pre-boss comic ("d1_boss" … "d5_boss") SHALL play every time the boss stage is entered, except when the stage is entered by continuing after a game over or by the retry button.

> 中文：首領關滑板用小尺寸、沒有阿鰭、沒有收尾輔助；每次進首領關都會播首領前漫畫（續關和重玩除外）。

#### Scenario: Small paddle on boss stages

- **WHEN** `SR.paddleSizeFor(n)` is called for stage 10 and for stage 3
- **THEN** it returns "S" for stage 10 and "M" for stage 3

#### Scenario: Finisher assist stays off

- **WHEN** only 1 grey brick is left on stage 10 and 8 seconds pass without a brick breaking
- **THEN** no finisher magnet is set

#### Scenario: Pre-boss comic replays

- **WHEN** the player enters stage 10 from the map a second time, after already having seen the "d1_boss" comic
- **THEN** the "d1_boss" comic plays again before the stage intro

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->