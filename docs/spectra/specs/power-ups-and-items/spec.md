# power-ups-and-items Specification

## Purpose

Power-ups and items make the player stronger during a district run (upgrade cans, roguelite style) and give them saved tools for critical moments (items). Upgrade cans last for one district run; items are stored in the save file and used from the item bar.

## Requirements

### Requirement: Upgrade Draw On Stage Clear

When a non-boss stage is cleared, the game SHALL draw one upgrade can at random from the eligible pool and apply it immediately, without asking the player to choose. The eligible pool SHALL exclude upgrades already at their max level and SHALL exclude "refill" when the player has 5 hearts. Internally the game SHALL deal up to 3 distinct eligible upgrades and take the first. Clearing a boss stage SHALL NOT draw an upgrade. Upgrade levels SHALL belong to the current district run and SHALL reset to none when a new run starts from the map.

> 中文：一般關卡過關會直接隨機拿到一罐強化（已滿級的不會抽到），首領關不給；強化只在這一輪有效，回地圖重新開始就清空。

#### Scenario: Caps are never exceeded

- **WHEN** 60 upgrade draws are taken in a row on one run
- **THEN** no draw deals the same upgrade twice at once, no upgrade exceeds its max level, and hearts never exceed 5

#### Scenario: Boss clear gives no upgrade

- **WHEN** stage 10 is cleared
- **THEN** the run's upgrade levels are unchanged


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Upgrade Can Effects

Each upgrade level SHALL apply the following effects from the start of the next stage (or at once for "refill"):

| id | Name | Max | Effect per level |
|---|---|---|---|
| split | 分裂彈 | 3 | The first brick hit by each not-yet-split ball spawns `level` extra balls (speed at least 700 px/s, fanned out); spawned balls do not split again |
| pierce | 穿透漆 | 3 | Each launch gives the ball `2 × level` pierce charges; breaking a non-boss brick with a charge uses one and the ball passes through without bouncing |
| heavy | 重漆 | 3 | Ball damage = 1 + level |
| big | 大罐 | 3 | Ball radius = 12 + 1.5 × level (max 16.5) |
| splash | 漆彈爆 | 2 | A brick destroyed directly by a ball deals `level` damage to its 4 side neighbors (up, down, left, right) |
| power | 強力擋板 | 2 | Paddle and flipper hit power × (1 + 0.12 × level) |
| safety | 保險罐 | 2 | Ball-save time after launch = 3 s + 3 s × level + the district's assist bonus |
| refill | 補一罐 | 99 | Restore 1 heart immediately, max 5 |
| bomb | 連擊火力 | 2 | Every 15th combo hit sets off a paint bomb at the ball, radius 52 × (1 + 0.3 × (level − 1)), dealing the current ball damage |

> 中文：9 種強化罐各有上限，例如重漆每級 +1 傷害、大罐每級球半徑 +1.5、穿透漆每級每次發射多 2 次穿透。

#### Scenario: Pierce passes through a brick

- **WHEN** a ball with 1 pierce charge moving up at 800 px/s breaks a 1 HP brick
- **THEN** the brick is destroyed, the ball keeps moving upward past the brick, and its pierce charges drop to 0

#### Scenario: Maximum big ball still plays

- **WHEN** the ball has the maximum big level (radius 16.5)
- **THEN** a full-power launch carries it out of the launch lane above y = 500, and a ball dropped between the flippers drains

#### Scenario: Bonuses applied at stage start

- **WHEN** a stage starts for a run holding the levels below
- **THEN** the world values match the table

##### Example: Bonuses after a full build

| Upgrade levels | World value |
|---|---|
| heavy 3 | damage 4 |
| big 3 | radius bonus +4.5 |
| power 2 | hit power × 1.24 |
| safety 2, district 1 assist 3 s | ball save 12 s |
| bomb 2 | combo bomb radius 67.6 |

#### Scenario: Split adds balls

- **WHEN** a launched ball with split level 2 hits its first brick
- **THEN** 2 extra balls appear at the hit point, and none of the 3 balls splits again


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Mid-District Start Upgrade Backfill

When the player starts a run from stage n of a district that is not the district's first stage, the game SHALL first take `n − firstStage` simulated upgrade draws (one per skipped stage) so the run carries the cans the player would have collected, SHALL then set hearts to 3, and SHALL tell the player "從第 n 關開始，先幫你帶上 k 罐強化！".

> 中文：從地圖選中間的關卡開始時，會先自動補上前面幾關該拿的強化罐，愛心一樣是 3 顆。

#### Scenario: Starting at stage 5

- **WHEN** the player starts district 1 at stage 5
- **THEN** the run begins with the result of 4 upgrade draws and 3 hearts


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Item Effects

Each item SHALL take effect at the moment its capsule is caught, as follows:

- **bomb (漆彈)**: at every live ball's position, deal 2 damage to every live brick (including the boss) within 60 px.
- **slow (慢動作)**: run the game at 0.5× speed for 5 seconds of game time.
- **save (球保險)**: for 10 seconds, losing the last ball SHALL return a new ball to the launch lane without losing a heart.
- **ball (加一顆)**: add one extra ball at (185, 110) near the top with a random sideways speed between −100 and +100 px/s.
- **wide (寬板)**: for 12 seconds, switch the paddle to the large size (half-width 76 px); in flipper mode, lengthen both flippers by 14 px and restore them when the time ends.

> 中文：接到膠囊的瞬間就生效：漆彈在每顆球的位置炸開、慢動作讓時間變慢一半 5 秒、球保險 10 秒內掉球不扣愛心、加一顆從上方多放一顆球、寬板 12 秒內滑板變大（擋板模式擋板變長）。

#### Scenario: Bomb damages a nearby brick

- **WHEN** a bomb capsule is caught with a ball 20 px below a brick
- **THEN** the brick loses HP or is destroyed and a bomb event is produced

#### Scenario: Timers start and end

- **WHEN** slow and save capsules are caught and then 11 seconds of game time pass
- **THEN** the slow timer started at 5 s and the save timer started at 10 s, and the save timer is 0 at the end

#### Scenario: Wide paddle and flippers revert

- **WHEN** a wide capsule is caught in paddle mode and 13 seconds pass, and separately in flipper mode and 13 seconds pass
- **THEN** the paddle half-width goes 56 → 76 → 56, and the flipper bonus goes 0 → 14 → 0

#### Scenario: Extra ball

- **WHEN** a ball capsule is caught with 1 ball on the table
- **THEN** there are 2 balls on the table

---
### Requirement: Item Capsules

Destroying a gift brick SHALL release an item capsule at the brick's center holding one item chosen uniformly at random from bomb, slow, save, ball and wide. A capsule SHALL fall straight down at 170 px/s, SHALL NOT collide with balls, bricks or bumpers, and SHALL be caught when it touches the paddle (paddle mode) or either flipper (flipper mode); a caught capsule SHALL apply its item at once, show "<icon> <name>！" and play the item sound. A capsule that falls below y 1000 without being caught SHALL disappear with no effect. When several capsules are falling, each capsule SHALL be caught or missed on its own. The first time in a save that a capsule appears, Pinky SHALL say "道具掉下來了！用滑板接住！".

> 中文：打破道具磚會掉下一顆道具膠囊（隨機 5 種之一），每秒 170 px 直直往下掉，不會撞到球和磚；滑板（或擋板）碰到就接住、馬上生效並顯示道具名稱；沒接到掉出台面就消失。第一次出現時噴噴會提醒「用滑板接住」。

#### Scenario: Capsule is caught by the paddle

- **WHEN** a gift brick directly above the paddle is destroyed and the paddle stays still
- **THEN** a capsule falls at 170 px/s, touches the paddle, its item takes effect at once and the capsule is removed

#### Scenario: Missed capsule has no effect

- **WHEN** a capsule falls while the paddle is at the far other side of the table
- **THEN** the capsule disappears after passing y 1000 and no item effect starts

#### Scenario: Capsule ignores the ball

- **WHEN** a ball crosses a falling capsule
- **THEN** neither the ball's velocity nor the capsule's fall changes
