# flipper-control Specification

## Purpose

Flipper control is the optional challenge scheme that keeps the classic two-flipper pinball feel ported from the v2 prototype. It exists for players who want timing-based play, and it shares the same flipper physics and tuning file as the Godot v2 build.

## Requirements

### Requirement: Flipper Input Mapping

In flipper mode during play, the game SHALL raise the left flipper while the left half of the canvas is pressed or `Z` / left arrow is held, and SHALL raise the right flipper while the right half is pressed or `/`, `M` or right arrow is held. A flipper SHALL drop only when no remaining pointer is holding its side. While a ball waits in the launch lane, a press on the right half SHALL pull the plunger instead of raising the right flipper.

> 中文：經典擋板模式點左半邊／右半邊（電腦 Z、← 或 /、→）控制左右擋板；球在發射道時，按右半邊是拉發射桿，不是揮右擋板。

#### Scenario: Touch halves control each flipper

- **WHEN** the player presses the left half of the canvas during play
- **THEN** the left flipper SHALL be pressed and the right flipper SHALL stay down until the right half is also pressed

#### Scenario: Multi-touch keeps a flipper up

- **WHEN** two fingers hold the left half and one of them lifts
- **THEN** the left flipper SHALL stay raised until the second finger also lifts

#### Scenario: Right-half press pulls the plunger when a ball is waiting

- **WHEN** a ball is settled in the launch lane (x > 340, y > 990) and the player presses the right half
- **THEN** the plunger SHALL start pulling and the right flipper SHALL NOT be pressed


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Flipper Stroke Motion

The game SHALL rotate each flipper between a rest angle of 30° below horizontal and a raised angle 58° above rest, moving up at 1700°/s while pressed and back down at 800°/s when released, so that a full lift takes 35.4 ms in the 8-substep simulation (matching v2).

> 中文：擋板往上揮每秒 1700°、放下每秒 800°，從靜止到全舉 35.4 毫秒，跟 v2 手感一樣。

#### Scenario: Full lift time matches v2

- **WHEN** a resting left flipper is pressed and updated in 1/480 s substeps until it reaches the raised angle
- **THEN** the elapsed time SHALL be 35.4 ms (within 0.1 ms), and at most 50 ms

#### Scenario: Release returns the flipper slower than it rose

- **WHEN** a fully raised flipper is released
- **THEN** it SHALL rotate back to rest at 800°/s, taking about 72.5 ms


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Flipper Shot Power

The game SHALL model each flipper as a 72 px tapered capsule (base radius 11, tip radius 5) pivoting at (100, 960) for the left and (270, 960) for the right, SHALL transfer the flipper's surface velocity to the ball scaled by power 0.8 times the "強力擋板" bonus (1 + 0.12 per level), SHALL use restitution 0.3 against the flipper, and SHALL therefore hit faster the closer the contact is to the tip.

> 中文：擋板長 72，打在越靠尖端的地方球飛越快；尖端擊球約每秒 1900 px。

#### Scenario: Tip shot speed matches v2

- **WHEN** a ball rests on the left flipper at 0.85 of its length and the flipper is pressed, simulated for 12 frames
- **THEN** the best ball speed SHALL be 1901 px/s (within 2 px/s)

#### Scenario: Tip is faster than base

- **WHEN** the same shot is taken at 0.9 of the length and at 0.25 of the length
- **THEN** the tip shot speed SHALL be more than 1.2 times the base shot speed

#### Scenario: Flipper contact resets the combo

- **WHEN** the combo counter is above 0 and the ball touches a flipper
- **THEN** the combo counter SHALL become 0


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Flipper Mode Bottom Geometry

In flipper mode the game SHALL build the bottom of the table as one continuous boundary per side: wall to x 20 / 340 down to y 760, inlane guide to the sling top, sling, funnel to the flipper pivot, with no outlane. Slings SHALL kick the ball at 800 px/s, the gap between the resting flipper tips SHALL let the largest ball (radius 16.5) drain, and no table layout SHALL contain a spot where a ball stays below 8 px/s for 3 seconds.

> 中文：擋板模式底部是「牆 → 導球片 → 彈弓 → 漏斗 → 擋板」連成一條線，沒有外線道；最大的球也能從兩支擋板中間掉下去，任何台面配置都不會卡球。

#### Scenario: Largest ball fits through the flipper gap

- **WHEN** a ball of radius 16.5 is dropped at (185, 880) with both flippers at rest
- **THEN** it SHALL drain within 3 seconds

#### Scenario: No stuck spots on any layout

- **WHEN** balls (normal and radius 16.5) are placed every 24 px over each of the 15 table layouts with ±5 px/s nudges and simulated for 10 seconds
- **THEN** no ball SHALL stay below 8 px/s for 180 consecutive frames

#### Scenario: Sling kicks the ball

- **WHEN** a ball hits a sling face with normal speed above 40 px/s
- **THEN** the ball SHALL leave with at least 800 px/s along the sling normal and the sling SHALL flash


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Flipper Timing Hint

When the stage's district has the timing assist (districts 1 and 2), the game SHALL light up a flipper while any ball is within that flipper's reach (vertical speed above −50 px/s, y between 885 and 980, and x 95–185 for the left or 185–275 for the right). During the first-play tutorial the flipper on the ball's side SHALL light up regardless of district.

> 中文：第 1、2 區有「擋板時機提示」：球進到某一支擋板打得到的範圍時，那支擋板會發光。

#### Scenario: Hint lights the reachable flipper in district 1

- **WHEN** in stage 3 a ball falls at (150, 930) with positive vertical speed
- **THEN** the left flipper SHALL be drawn highlighted and the right flipper SHALL NOT

#### Scenario: No hint from district 3

- **WHEN** in stage 21 a ball falls at (150, 930)
- **THEN** neither flipper SHALL be highlighted


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Flipper Wide Item

When the "寬板" item is used in flipper mode, the game SHALL lengthen both flippers by 14 px for 12 seconds and SHALL then restore the original length.

> 中文：擋板模式用道具「寬板」，兩支擋板變長 14 px，維持 12 秒後變回來。

#### Scenario: Wide item lengthens then restores

- **WHEN** the "寬板" item is used in flipper mode
- **THEN** flipper length SHALL become 86 px at once and SHALL return to 72 px after 12 seconds of item time


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Flippers Visible When Needed

The game SHALL keep both flippers including their tips fully on screen whenever a ball is in the launch lane, within 300 px above the flipper pivots, or falling below y 540, by snapping the camera to the bottom of the table.

> 中文：需要操作的時候（球在發射道、球接近擋板、球往下掉），鏡頭一定拉回最底下，兩支擋板完整看得到。

#### Scenario: Camera shows flippers when a ball approaches

- **WHEN** 24 random balls are played with the auto player and the camera updates every frame
- **THEN** in every frame where a ball is in the lane or falling within 300 px above the flippers, the camera SHALL show both flippers completely

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->