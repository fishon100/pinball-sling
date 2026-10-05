# medals-and-achievements Specification

## Purpose

Medals grade each cleared stage by how many hearts the player lost, and achievements reward long-term goals such as defeating bosses, long combos and collecting gold medals. Together they give players a reason to replay stages.

## Requirements

### Requirement: Stage Medal By Hearts Lost

On each stage clear the game SHALL award a medal based only on hearts lost in that stage attempt and whether the attempt is a continue: gold (3) for 0 hearts lost, silver (2) for exactly 1 heart lost, and bronze (1) for 2 or more hearts lost or for any attempt started by continuing after a game over. Balls rescued by ball save SHALL NOT count as hearts lost. Clear time SHALL NOT affect the medal.

> 中文：過關獎牌只看這關掉了幾顆愛心：沒掉＝金牌、掉 1 顆＝銀牌、掉 2 顆以上或有續關＝銅牌。

#### Scenario: Medal rules

- **WHEN** the medal is computed for stage 3
- **THEN** it follows the table below

##### Example: Medal table

| Hearts lost | Continued | Seconds | Medal |
|---|---|---|---|
| 0 | no | 999 | gold (3) |
| 1 | no | 1 | silver (2) |
| 2 | no | 1 | bronze (1) |
| 0 | yes | 1 | bronze (1) |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Best Medal Is Kept

The save file SHALL keep, per stage, the best medal ever earned; replaying a stage SHALL upgrade the stored medal when the new medal is better and SHALL NOT lower it when the new medal is worse. The map SHALL show the total number of gold, silver and bronze medals from these stored values.

> 中文：每關存最好的那一面獎牌，重玩拿更好的會更新、拿更差的不會被蓋掉。

#### Scenario: Worse replay keeps gold

- **WHEN** a stage stored as gold is replayed and cleared with a bronze medal
- **THEN** the stored medal for that stage is still gold

#### Scenario: Better replay upgrades

- **WHEN** a stage stored as bronze is replayed and cleared with a silver medal
- **THEN** the stored medal for that stage becomes silver


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Achievement Catalog

The game SHALL define exactly 19 achievements with unique ids: first, boss1, boss2, boss3, boss4, boss5, combo20, combo50, combo100, flawless, multi4, bricks500, gold10, silver, lastheart, allgold, fish, chain6 and onecoin, each with a Chinese name and description.

> 中文：遊戲共有 19 個成就，代號不重複。

#### Scenario: Catalog is complete

- **WHEN** `SR.ACHIEVEMENTS` is read
- **THEN** it has 19 entries, the ids are unique, and every id listed above is present


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Achievement Unlock Conditions

The game SHALL unlock each achievement when its condition is met at a check point. Checks SHALL run at every stage clear; during play whenever the current combo is at least 20, the most balls on the table is at least 4, or the most bricks broken within 1 second is at least 6; and at every district clear (for onecoin only).

| id | Condition when checked |
|---|---|
| first | Any stage is cleared |
| boss1–boss5 | The boss stage of district 1–5 (stage 10, 20, 30, 40, 50) is cleared |
| combo20 / combo50 / combo100 | The stage's highest combo is at least 20 / 50 / 100 (combo counts brick and bumper hits and resets when the ball touches the paddle or a flipper) |
| flawless | A stage is cleared with 0 hearts lost in that attempt |
| multi4 | At least 4 balls are on the table at the same time |
| bricks500 | The save's total broken non-boss bricks is at least 500 |
| gold10 | At least 10 stages are stored with a gold medal |
| silver | A stage is cleared with a silver medal |
| lastheart | A stage is cleared while the player has exactly 1 heart (counted before the clear's heart refill) |
| allgold | All 10 stages of any one district are stored with a gold medal |
| fish | The fish bumper was hit at least 10 times in the cleared stage |
| chain6 | At least 6 bricks broke within 1 second |
| onecoin | A district is cleared with no continues in that run |

> 中文：19 個成就的解鎖條件，例如打倒各區首領、一次擊球打出 20／50／100 連擊、累計 10 面金牌、一關打到阿鰭 10 次。

#### Scenario: Combo achievements during play

- **WHEN** the combo reaches 50 without the ball touching the paddle
- **THEN** combo20 and combo50 unlock immediately, and combo100 stays locked

#### Scenario: Last heart is counted before refill

- **WHEN** a normal stage is cleared while the player has 1 heart left
- **THEN** lastheart unlocks, even though the clear then restores the player to 2 hearts

#### Scenario: Fish hits only count on clear

- **WHEN** the player hits the fish 12 times on a stage and then loses all hearts before clearing it
- **THEN** the fish achievement stays locked

#### Scenario: One coin district

- **WHEN** district 1 is cleared in a run that never continued
- **THEN** onecoin unlocks


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Achievement Unlock Is Permanent

An achievement SHALL unlock at most once: the save file SHALL store the unlock time per achievement id, a met condition for an already unlocked achievement SHALL NOT unlock it again, and each new unlock SHALL show a toast "成就解鎖：<name>" with its description and play the achievement sound, then save.

> 中文：成就只會解鎖一次並記在存檔裡，解鎖時跳出「成就解鎖：○○」提示。

#### Scenario: No repeat unlock

- **WHEN** stage 1 is cleared a second time after "first" is already unlocked
- **THEN** no new achievement id is returned for "first" and its stored unlock time is unchanged

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->