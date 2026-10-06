# art-presentation Specification

## Purpose

Art presentation covers the observable on-screen contracts of the table view: the camera keeps the player's controls visible whenever the player must act, cinematic camera moves frame stage start and stage clear, and the paint left by broken bricks stays on the wall for the whole stage. Colors, shapes and sizes of individual elements are out of scope.

## Requirements

### Requirement: Art Controls Always Visible When Acting

The table view SHALL show a 400×740 window of the 1060-px-tall table. Because every stage uses the short table (table top 320), the camera SHALL stay at the bottom position (camera y = 320) throughout play in every stage, so the whole table, the paddle line (y = 948) and both flippers including their tips are always on screen and the view SHALL NOT scroll up or down while the player is controlling the ball. Stage intro and stage clear cinematics are allowed to tilt and zoom the view, and SHALL return it to camera y = 320 before play continues.

> 中文：所有關卡玩的時候鏡頭都固定不動，整個台面、滑板／擋板一直都看得到；只有開場和過關演出會短暫運鏡，結束後回到原位。

#### Scenario: Flippers visible whenever action is needed

- **WHEN** 24 random balls with random camera starts are played by the bot for up to 20 s each in flipper control
- **THEN** in every frame where a ball is in the lane or falling within 300 px above the flippers, both flippers SHALL be fully inside the view

#### Scenario: No stage scrolls during play

- **WHEN** stages 5, 15, 25, 35 and 45 are played by the bot for 20 s each after the intro
- **THEN** the camera y SHALL stay at 320 in every frame

---
### Requirement: Art Stage Intro Camera

Every stage SHALL open with a 2.3 s intro in two parts while "STAGE N", the stage name and "台面：<layout name>" are shown in the upper wall area: (1) from 0 to 1.2 s the view SHALL be tilted 38° (3D) and SHALL zoom to 2× on the left end of the topmost brick row, then pan to its right end; on boss stages part (1) SHALL instead zoom to 2× on the boss with a screen shake; (2) from 1.2 to 2.3 s the view SHALL zoom back to 1× while untilting to flat, scaling from 0.88 to 1 and rotating from -3° to 0°, ending in the normal play view (camera y = 320, no tilt, no rotation). When the same stage is started again within the same run (continue or retry), the intro SHALL be a 1.2 s short version that only does part (2). Physics SHALL NOT run during the intro, and a tap or key SHALL jump the intro to its last 0.25 s.

> 中文：每關開場 2.3 秒：台面傾斜的 3D 畫面上，先拉近 2 倍特寫磚牆最上排的左端、橫移到右端（首領關改成特寫首領＋震動），再拉遠、台面從傾斜轉平回到平常畫面；同一關重打時播 1.2 秒短版。點一下可以快轉。

#### Scenario: Intro sweeps the top bricks from left to right

- **WHEN** stage 3 starts
- **THEN** at 0.4 s the view zoom SHALL be 2×, the view SHALL be tilted, and the view centre SHALL be within 40 px of the left end of the topmost brick row; at 1.1 s the view centre SHALL be within 40 px of its right end

#### Scenario: Intro zooms out and flattens

- **WHEN** the intro of stage 3 is at 1.75 s
- **THEN** the zoom SHALL be between 1× and 2× and the tilt between 0° and 38°, and when the intro ends zoom SHALL be 1, camera y 320, tilt and rotation 0, and play SHALL begin

#### Scenario: Boss intro starts on the boss

- **WHEN** stage 10 starts and the intro is 0.5 s in
- **THEN** the view centre SHALL be within 40 px of the boss and the screen SHALL shake

#### Scenario: Short intro on retry

- **WHEN** stage 3 is started again in the same run
- **THEN** the intro SHALL last 1.2 s

#### Scenario: Skip the intro

- **WHEN** the player taps 0.5 s into a stage intro
- **THEN** play SHALL begin about 0.25 s later


<!-- @trace
source: stage-intro-sweep
updated: 2026-10-07
code:
  - docs/street/index.html
  - docs/street/js/tests.js
  - web/street/editor.html
  - web/street/js/game.js
  - web/street/js/tests.js
  - docs/street/test.html
  - docs/street/editor.html
  - docs/street/js/game.js
  - web/street/test.html
  - web/street/index.html
  - docs/企劃/開發日誌.md
-->

---
### Requirement: Art Stage Clear Cinematic

When the last brick breaks (or the boss falls), the game SHALL break all remaining bricks with paint bursts and run a 2.6 s cinematic: for the first 0.9 s time SHALL run at 0.15× while the view zooms to 1.7× on the last broken brick; then time SHALL freeze, the view SHALL zoom back out, the camera SHALL return to the table top, the view SHALL tilt to 24°, 70 large paint splats SHALL fill the wall and "WALL" / "CLEARED!" SHALL slam in. The results screen SHALL appear when the cinematic ends.

> 中文：打碎最後一塊磚時會慢動作特寫，接著定格、整面牆噴滿顏色、出現 WALL CLEARED!，然後才到結算。

#### Scenario: Clear cinematic timing

- **WHEN** the last brick of stage 2 breaks
- **THEN** the results screen SHALL appear 2.6 s later and the wall SHALL carry 70 extra splats


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Art Paint Splats Persist For The Stage

Every broken brick SHALL leave a paint splat on the wall at the brick's center (size 14 + 3 × brick max HP; 30 for a paint bucket), using the district's palette (random hue in district 5). Splats SHALL stay on the wall for the rest of the stage, including across ball losses and pauses, and SHALL be cleared only when a new stage (or retry) starts.

> 中文：打碎的磚會在牆上留下噴漆，整關都不會消失，下一關才重新開始。

#### Scenario: Splats survive a ball loss

- **WHEN** the player breaks 5 bricks and then loses a ball
- **THEN** all 5 splats SHALL still be on the wall

#### Scenario: Splats reset on a new stage

- **WHEN** the player presses "↻ 重玩這關" after clearing a stage
- **THEN** the wall SHALL start with no splats

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Ball Trail By District

The game SHALL draw a glowing trail behind each ball whose length (in stored points, 0–20) comes from the stage's 「拖尾」 column of the level table; 0 means no trail. The first level table keeps the v3.7.1 values (8 in districts 1–2, 4 in district 3, 0 in districts 4–5).

> 中文：球後面的拖尾光長度看關卡表「拖尾」欄，0＝沒有；第一版是第 1、2 區 8、第 3 區 4、第 4、5 區 0。

#### Scenario: Trail length from the table

- **WHEN** stages 5, 15, 25, 35 and 45 are played for 2 seconds with a ball in flight and the first level table
- **THEN** the stored trail of the ball SHALL hold at most 8, 8, 4, 0 and 0 points