# art-presentation Specification

## Purpose

Art presentation covers the observable on-screen contracts of the table view: the camera keeps the player's controls visible whenever the player must act, cinematic camera moves frame stage start and stage clear, and the paint left by broken bricks stays on the wall for the whole stage. Colors, shapes and sizes of individual elements are out of scope.

## Requirements

### Requirement: Art Controls Always Visible When Acting

The table view SHALL show a 400×740 window of the 1060-px-tall table. Whenever any ball is in the launch lane, any ball is below y = 660 (FLIP_Y 960 - 300), or any ball is moving down below y = 540, the camera SHALL target the bottom position (camera y = 320) so the paddle line (y = 948) and both flippers including their tips are fully on screen; the camera SHALL move down toward that target with rate 14/s and SHALL snap to it once within 1 px. Otherwise the camera SHALL follow the lowest ball, aiming 0.15 s ahead, moving up at rate 5/s, and never above the table top. On the district 1 tables (table top 320) the camera SHALL NOT scroll.

> 中文：只要球在發射道、快掉下來或正往下掉，鏡頭一定回到最底下，滑板／擋板一定看得到；第 1 區台面矮，鏡頭完全不用捲。

#### Scenario: Flippers visible whenever action is needed

- **WHEN** 24 random balls with random camera starts are played by the bot for up to 20 s each in flipper control
- **THEN** in every frame where a ball is in the lane or falling within 300 px above the flippers, both flippers SHALL be fully inside the view

#### Scenario: District 1 never scrolls

- **WHEN** any stage from 1 to 10 is played
- **THEN** the camera y SHALL stay at 320 throughout play


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Art Stage Intro Camera

Every stage SHALL open with a 2.3 s intro: the camera SHALL swoop from the table top (or 320, whichever is lower) to the bottom position while the view untilts from 38° to flat, scales from 0.88 to 1 and rotates from -3° to 0°, showing "STAGE N", the stage name and "台面：<layout name>". On boss stages the view SHALL additionally zoom up to 1.35× toward the boss area between 15% and 50% of the intro with a screen shake. Physics SHALL NOT run during the intro, and a tap or key SHALL jump the intro to its last 0.25 s.

> 中文：每關開場有 2.3 秒的 3D 俯衝鏡頭，顯示關卡編號、名稱和台面；首領關會拉近看首領；點一下可以快轉。

#### Scenario: Skip the intro

- **WHEN** the player taps 0.5 s into a stage intro
- **THEN** play SHALL begin about 0.25 s later


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
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