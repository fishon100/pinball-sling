# core-game-loop Specification

## Purpose

The core game loop defines how a player moves from the district map through a stage and back, and the seven core rules that make SPRAY RUN a pinball game: real ball physics, drain as a normal risk, clearing grey bricks, a heart economy, rising difficulty, human-speed difficulty measurement, and a fairy-tale story. Every other capability builds on these rules and SHALL NOT break them.

## Requirements

### Requirement: Core Loop Stage Flow

The game SHALL run each stage in the order map selection, comic (when due), stage intro, play, clear cinematic, result screen, and SHALL then let the player choose to replay the stage, go to the next stage, or return to the map. After a boss stage (every 10th stage) the game SHALL show the district-cleared screen instead of a next stage, and after stage 50 it SHALL show the ending credits.

> 中文：玩家從地圖選關 → 看漫畫 → 關卡開場 → 開打 → 過關演出 → 結算畫面，結算後可以選「重玩／下一關／回地圖」；首領關打完會到「街區解放」畫面，第 50 關打完看結局。

#### Scenario: Any open stage can be selected from the map

- **WHEN** the player taps a stage node whose number is less than or equal to the highest unlocked stage
- **THEN** the game SHALL start a run in that stage's district at that stage, with 3 hearts
- **AND** when the chosen stage is not the first of its district, the run SHALL start with one simulated upgrade per skipped stage

#### Scenario: Comic plays before a stage only when due

- **WHEN** a stage starts normally (not a replay and not a continue)
- **THEN** the game SHALL play the stage's pre-stage comics that have not been seen yet, and SHALL always play the boss pre-stage comic
- **AND** when the stage starts from "replay this stage" or from a continue, no comic SHALL play

#### Scenario: Stage intro can be skipped

- **WHEN** the 2.3-second stage intro is playing and the player taps the screen or presses any key
- **THEN** the intro SHALL jump to its last 0.25 seconds and play SHALL begin right after

#### Scenario: Clearing a normal stage grants an upgrade and offers choices

- **WHEN** the player clears a non-boss stage
- **THEN** after the 2.6-second clear cinematic the game SHALL grant one random upgrade can and show the result screen with "next stage", "replay this stage" and "back to map"

#### Scenario: Clearing a boss stage ends the district

- **WHEN** the player clears stage 10, 20, 30 or 40 and presses "continue" on the result screen
- **THEN** the game SHALL play the post-stage comic, then show the district-cleared screen, grant 2 random items, and offer "back to city map"
- **AND** no upgrade can SHALL be granted for the boss stage

##### Example: Next action after the result screen

| Cleared stage | Result button | Next screen |
|---|---|---|
| 3 | 下一關 ▶（第 4 關） | stage 4 |
| 10 | 繼續 | district-cleared screen |
| 50 | 看結局 | ending credits |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Steel Ball Physics

The game SHALL simulate the ball as a steel ball under gravity of 1400 px/s², SHALL bounce it off walls with restitution 0.45, SHALL cap ball speed at 2600 px/s, and SHALL run 8 physics substeps per 60 Hz frame so that a ball at maximum speed never passes through a wall.

> 中文：鋼珠有重力、會反彈、速度有上限，每一幀切成 8 小步算碰撞，球再快都不會穿牆。

#### Scenario: Ball at maximum speed does not tunnel

- **WHEN** a ball is fired at 2600 px/s in any of 32 directions on the tall table
- **THEN** the ball SHALL never cross a wall segment and SHALL stay inside x 19–381 while above y 940

#### Scenario: Ball speed never exceeds the cap

- **WHEN** any collision (bumper kick 950 px/s, sling kick 800 px/s, paddle, flipper) would push the ball above 2600 px/s
- **THEN** at the end of the substep the ball speed SHALL be scaled down to exactly 2600 px/s

#### Scenario: Ball hitting a brick bounces and damages it

- **WHEN** a ball moving at 800 px/s hits a 2-HP brick
- **THEN** the brick SHALL lose 1 HP and the ball SHALL bounce back; a second hit SHALL remove the brick


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Drain Is A Normal Risk With No Drain-Blocking Post

The game SHALL treat a ball whose center passes below y 1080 as drained, and SHALL NOT place any post, pin or other obstacle in the drain opening that would stop a ball from draining. In flipper mode the only posts SHALL be the two sling-top posts at (58, 790) and (312, 790); in paddle mode the bottom SHALL be fully open with no slings, funnel or posts.

> 中文：球從底部掉下去就是掉球，這是正常風險；台面出口絕對不能加「擋住出口的救球柱」。

#### Scenario: Largest ball drains through the center in flipper mode

- **WHEN** the largest ball (radius 16.5, from max "big" upgrade) is dropped at (185, 880) in flipper mode with no flipper pressed
- **THEN** the ball SHALL fall between the two flippers and produce a drain event

#### Scenario: Paddle mode has no bottom obstacles

- **WHEN** the table is built in paddle mode
- **THEN** it SHALL contain no sling segments and no post circles, and the left wall SHALL run straight from the arc to the bottom

#### Scenario: Ball missed by the paddle drains

- **WHEN** in paddle mode a ball falls at an x position outside the paddle's current width
- **THEN** the ball SHALL continue down and produce a drain event

#### Scenario: Only the drained ball is removed in multiball

- **WHEN** two balls are in play and one passes below y 1080
- **THEN** exactly one drain event SHALL fire for that ball and the other ball SHALL stay in play


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Stage Clear Condition

The game SHALL clear a normal stage when no live grey brick remains, and SHALL clear a boss stage when the boss Mr. Grey is defeated, regardless of how many regenerated bricks remain.

> 中文：一般關卡打碎所有灰磚就過關；首領關打倒灰先生就過關（剩下的磚會一起碎掉）。

#### Scenario: Normal stage clears on last brick

- **WHEN** the last live brick of a non-boss stage breaks
- **THEN** the stage SHALL be marked cleared, the next stage SHALL unlock, and the clear cinematic SHALL start

#### Scenario: Boss stage clears on boss defeat

- **WHEN** the boss HP reaches 0 while other bricks are still alive
- **THEN** the stage SHALL be cleared and all remaining bricks SHALL burst into paint

#### Scenario: Stage 1 is clearable by the auto player

- **WHEN** the auto player plays stage 1 for up to 3 minutes
- **THEN** all bricks SHALL be broken


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Run Hearts And Continue

The game SHALL start every run with 3 hearts, SHALL remove 1 heart when the last ball in play drains outside ball-save time, SHALL restore 1 heart after clearing a non-boss stage up to a maximum of 5, and SHALL show the game-over screen 0.7 seconds after hearts reach 0. On game over the game SHALL offer "insert coin to continue", which restarts the current stage with 3 hearts, keeps upgrades, halves the score and caps the stage medal at bronze.

> 中文：一輪 3 顆愛心，掉球扣 1 顆，一般關過關回 1 顆（最多 5 顆）；愛心用完可以投幣從這一關重來，強化保留、分數減半、這關最多銅牌。

#### Scenario: Drain outside ball save costs a heart

- **WHEN** the last ball drains, the launch ball save has expired, and no "ball save" item is active
- **THEN** hearts SHALL decrease by 1 and a new ball SHALL be placed in the launch lane

#### Scenario: Drain inside ball save is free

- **WHEN** the last ball drains while launch ball save time remains
- **THEN** hearts SHALL NOT change and the game SHALL show "BALL SAVED" and return a ball to the launch lane

##### Example: Launch ball save length

| District | Base | Assist bonus | "Safety" upgrade | Total |
|---|---|---|---|---|
| 1 | 3 s | +3 s | none | 6 s |
| 2 | 3 s | +1.5 s | none | 4.5 s |
| 3–5 | 3 s | 0 s | level 1 (+3 s) | 6 s |

#### Scenario: Clearing restores a heart up to 5

- **WHEN** the player clears a non-boss stage
- **THEN** hearts SHALL increase by 1, never above 5
- **AND** clearing a boss stage SHALL NOT restore a heart

##### Example: Heart count across a clear

- **GIVEN** 5 hearts
- **WHEN** stage 4 is cleared
- **THEN** hearts stay 5

#### Scenario: Continue after game over

- **WHEN** hearts reach 0 on stage 7 with score 12000 and the player chooses "insert coin to continue"
- **THEN** stage 7 SHALL restart with 3 hearts, score 6000, all upgrades kept, no comic, and the stage medal SHALL be bronze at best


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Rising Difficulty Measured At Human Speed

The game SHALL make later districts harder through taller tables, fewer assists and a smaller paddle on boss stages, and SHALL keep district 1 beatable for a beginner as measured by a human-like player model (reaction 0.32 s, aim error 22 px) rather than machine-speed play.

> 中文：越後面越難（台面越高、輔助越少、首領關滑板變小），但第 1 區要讓新手打得過，而且難度一定用「模擬真人手速」的自動玩家量，不用機器速度。

#### Scenario: Tables grow taller by district

- **WHEN** the shortest table of each district is compared
- **THEN** visible table height SHALL be 740 / 900 / 980 / 1060 / 1060 px for districts 1–5, district 1 SHALL need no camera scrolling, and each stage SHALL use a different layout from the previous stage within a district

#### Scenario: Assists shrink by district

- **WHEN** a stage of each district starts
- **THEN** trajectory preview SHALL be 1.0 / 0.7 / 0.4 / 0 / 0 seconds, the timing or landing hint SHALL be on only in districts 1–2, extra ball save SHALL be 3 / 1.5 / 0 / 0 / 0 seconds, and the finisher assist SHALL be on only in districts 1–2

#### Scenario: Boss stages use the small paddle

- **WHEN** a boss stage (10, 20, 30, 40, 50) starts in paddle mode
- **THEN** the paddle SHALL be size S; all other stages SHALL use size M

#### Scenario: District 1 is beginner-friendly at human speed

- **WHEN** the human-like novice player plays stages 1–9 five times each in paddle mode with district assists
- **THEN** the average hearts lost per stage SHALL be at most 1 and at least half of the stages SHALL be perfect (0 hearts lost)


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Fairy-Tale Story Tone

The game SHALL tell its story as a fairy tale: the opening comic caption SHALL start with "很久很久以前", the ending SHALL contain "從此以後", the player SHALL NOT be described as a pinball, the villain SHALL be named 灰先生, and the screen SHALL NOT display the internal 起承轉合 act labels.

> 中文：故事是童話（「很久很久以前」開頭、「從此以後」結尾），不搞笑；畫面上不顯示「起承轉合」。

#### Scenario: Comic text follows fairy-tale rules

- **WHEN** all comic captions and speech bubbles are checked
- **THEN** the intro SHALL start with "很久很久以前", the ending SHALL include "從此以後", no text SHALL contain "鋼珠" or "變成彈珠" or "灰老大", and the intro SHALL include the hero 小葵

#### Scenario: HUD hides act labels

- **WHEN** a stage is in play
- **THEN** the stage chip SHALL show only the district name, the stage number in "district-stage" form and "首領" on boss stages, and SHALL NOT show 起, 承, 轉 or 合

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->