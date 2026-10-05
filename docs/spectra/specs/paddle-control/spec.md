# paddle-control Specification

## Purpose

Paddle control is the default control scheme: a single paddle near the bottom of the table follows one finger, the mouse or the arrow keys, so the game is playable without flipper timing or two hands. Where the ball lands on the paddle sets its outgoing angle, which lets the player aim at bricks.

## Requirements

### Requirement: Paddle Input Following

In paddle mode during play, the game SHALL set the paddle target x from mouse movement anywhere in the window without a click, from a finger pressed on the canvas, or from held arrow keys at 950 px/s, and SHALL move the paddle toward the target at no more than 2600 px/s. A pointer (finger or mouse) that started a plunger pull SHALL NOT change the paddle target, neither when it is pressed nor while it moves, until it is released; after release it SHALL control the paddle again. The mouse cursor SHALL be hidden over the canvas while playing in paddle mode.

> 中文：滑板跟著滑鼠（不用點，移出畫面也跟）、手指或方向鍵移動；正在拉發射桿的那根手指不會帶動滑板，放開後才恢復；滑板追目標的速度最快每秒 2600 px，遊玩中滑鼠游標會藏起來。

#### Scenario: Mouse moves the paddle without clicking

- **WHEN** the player moves the mouse, including outside the canvas, during play
- **THEN** the paddle target SHALL be the mouse x converted to table coordinates and the paddle SHALL move toward it, stopping at the range edge when the mouse is beyond the table

#### Scenario: Pulling the plunger does not move the paddle

- **WHEN** a ball waits in the launch lane, the paddle target is x 180, and the player presses the canvas at the far left and drags down and sideways to pull the plunger
- **THEN** the paddle target SHALL stay at x 180 until the pointer is released, and the next pointer move after release SHALL set the target again

#### Scenario: Paddle speed is capped per frame

- **WHEN** the target is set far to the right (x 9999) and one frame (1/60 s) is simulated from x 180
- **THEN** the paddle SHALL move at most 2600 / 60 ≈ 43.3 px plus 0.5 px tolerance

#### Scenario: Arrow keys move the paddle

- **WHEN** the player holds the right arrow (or `/` or `M`) key during play
- **THEN** the paddle target SHALL advance 950 px per second to the right; holding the left arrow (or `Z`) SHALL move it left at the same rate

#### Scenario: Cursor is hidden during paddle play

- **WHEN** the screen is in play in paddle mode
- **THEN** the canvas cursor style SHALL be `none`, and it SHALL return to the default on any other screen


<!-- @trace
source: fix-plunger-moves-paddle
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Paddle Movement Range

The game SHALL let the paddle travel the full table width, keeping its edges between the left wall at x 20 and the launch-lane inner wall at x 340, so the paddle center range is [20 + half-width, 340 − half-width].

> 中文：滑板可以在整個台面寬度移動，左邊到左牆 x=20、右邊到發射道內牆 x=340。

#### Scenario: Paddle edges reach both walls

- **WHEN** the paddle range is computed for the current size
- **THEN** the left paddle edge SHALL reach x 20 and the right paddle edge SHALL reach x 340

##### Example: Center range by size

| Size | Half-width | Center range |
|---|---|---|
| S | 40 | 60 – 300 |
| M | 56 | 76 – 284 |
| L | 76 | 96 – 264 |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Paddle Aimed Rebound

When a ball hits the top of the paddle (contact normal pointing upward more steeply than −0.35), the game SHALL send the ball out at a fixed speed of 1550 px/s multiplied by the flipper-power bonus (1 + 0.12 per "power" upgrade level), at an angle from vertical equal to the hit offset (−1 at the left end to +1 at the right end) times 55°, plus 0.15 of the paddle's horizontal velocity. A hit on the paddle's side SHALL bounce like a wall with restitution 0.45 plus 0.3 of the paddle velocity.

> 中文：球打在滑板中間直直往上，越靠邊越斜（最斜 55°），出球速度固定 1550；滑板移動中擊球會帶一點側向速度。

#### Scenario: Center hit goes straight up

- **WHEN** a falling ball hits the center of a still paddle
- **THEN** the ball SHALL leave within 3° of vertical at about 1550 px/s (within 40 px/s)

#### Scenario: Edge hit goes at a steep angle

- **WHEN** a falling ball hits a still paddle at 0.9 of its half-width to the right
- **THEN** the ball SHALL leave at least 35° from vertical toward the right (49.5° by formula)

##### Example: Outgoing velocity on a still paddle, no upgrades

| Hit offset | Angle | vx (px/s) | vy (px/s) |
|---|---|---|---|
| 0 | 0° | 0 | −1550 |
| +0.5 | 27.5° | +716 | −1375 |
| +0.9 | 49.5° | +1179 | −1007 |
| −1.0 | −55° | −1270 | −889 |

#### Scenario: Ball never rests on the paddle

- **WHEN** a ball is dropped gently from (185, 900) onto the paddle and 3 seconds are simulated
- **THEN** the ball SHALL NOT stay near the paddle (below y 900 with speed under 50 px/s) for more than 30 frames

#### Scenario: Side hit bounces like a wall

- **WHEN** a ball moving horizontally at 600 px/s hits the end of a still paddle from the side
- **THEN** the ball's horizontal velocity SHALL reverse at 0.45 of its incoming normal speed and no aimed shot SHALL be applied

#### Scenario: Power upgrade raises the paddle shot speed

- **WHEN** the run holds "強力擋板" at level 2
- **THEN** a top hit SHALL send the ball out at 1550 × 1.24 = 1922 px/s before the 2600 px/s speed cap


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Paddle Sizes

The game SHALL use three paddle sizes with half-widths S 48, M 56 and L 76 (widths 96 / 112 / 152). Each stage SHALL start with the size in its 「滑板」 column of the level table; while the "寬板" item is active for 12 seconds the paddle SHALL be size L, after which it SHALL return to the stage's size. The first level table keeps the v3.7.1 sizes (M on normal stages of districts 1–3, S on districts 4–5 and every boss stage).

> 中文：滑板有小中大三種（寬 96／112／152）；每關用關卡表「滑板」欄的尺寸；道具「寬板」12 秒內＝大。

#### Scenario: Stage decides the base size

- **WHEN** stages 3, 25, 35 and 10 start in paddle mode with the first level table
- **THEN** the paddle SHALL be size M, M, S and S, and the size S half-width SHALL be 48

#### Scenario: Wide item enlarges then restores

- **WHEN** the "寬板" item is used on a size-M paddle
- **THEN** the half-width SHALL become 76 at once and SHALL return to 56 once 12 seconds of play time have passed

---
### Requirement: Paddle Hit Feedback And Combo Reset

On each top hit the game SHALL play the paddle sound, SHALL vibrate 16 ms for a center hit or 24 ms for an edge hit (absolute offset above 0.6), SHALL show a "↖" or "↗" arrow popup on edge hits, and SHALL reset the brick combo counter to 0.

> 中文：滑板擊球會有音效和震動（打中間 16ms、打邊邊 24ms 並顯示 ↖／↗），而且每次球回到滑板，連擊數歸零。

#### Scenario: Edge hit shows an arrow and stronger vibration

- **WHEN** the ball hits the paddle at offset −0.8
- **THEN** a "↖" popup SHALL appear above the contact point and the device SHALL vibrate 24 ms

#### Scenario: Paddle hit resets the combo

- **WHEN** the combo counter is 12 and the ball hits the paddle
- **THEN** the combo counter SHALL become 0 and the best combo of the stage SHALL stay 12

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->
