## Purpose

Table layout defines how tall each stage's table is and which pop bumpers, rubber rails and the swimming fish bumper (A-Fin) appear on it. It exists so that every stage feels fresh and so that table height and bumper placement can control difficulty per district.

## ADDED Requirements

### Requirement: Table Height Per District

The game SHALL set the table top offset from the layout's `top` value so that the playable table height (1060 minus `top`) is 740 px in district 1, 900 px in district 2, 980 px in district 3 and 1060 px in districts 4 and 5. The district 1 table SHALL fit in one 740 px screen so that the camera does not need to scroll.

> 中文：第 1 區台面最矮（一個畫面看完不用捲動），第 2、3 區越來越高，第 4、5 區最高。

#### Scenario: Tables get taller in later districts

- **WHEN** the minimum layout `top` of each district's layout list is compared in district order
- **THEN** no district has a larger `top` (shorter table) than the district before it

##### Example: Table height by district

| District | Layout `top` | Table height |
|---|---|---|
| 1 (alley) | 320 | 740 |
| 2 (subway) | 160 | 900 |
| 3 (rooftops) | 80 | 980 |
| 4, 5 (riverside, downtown) | 0 | 1060 |

#### Scenario: District 1 needs no camera scroll

- **WHEN** a stage in district 1 is loaded
- **THEN** the layout `top` is at least the camera's maximum scroll (320), so the whole table is visible at once

### Requirement: Layout Rotation Per Stage

The game SHALL pick each stage's layout with `SR.layoutFor(n)`: district index `d = min(4, floor((n-1)/10))`, and layout `SR.DISTRICT_LAYOUTS[d][((n-1) mod 10) mod listLength]`. District 1 SHALL use the fixed 10-entry list a_pair, a_tri, a_rubber, a_four, a_fish, a_tri, a_rubber, a_fish, a_four, a_pair; district 2 SHALL cycle b_tri, b_steps, b_fish; district 3 SHALL cycle c_pair, c_rubber, c_fish; district 4 SHALL cycle d_tri, d_high, d_fish; district 5 SHALL cycle d_high, d_tri, d_classic, d_fish, d_tri. Two consecutive stages inside the same district SHALL NOT use the same layout. The stage intro SHALL display the text "台面：<layout name>".

> 中文：每一關換一種台面配置，同一區相鄰兩關一定不一樣，開場會顯示「台面：○○」。

#### Scenario: Adjacent stages differ

- **WHEN** stage n (2 to 50, not the first stage of a district) and stage n-1 are compared
- **THEN** `SR.layoutFor(n)` and `SR.layoutFor(n-1)` are different layouts

##### Example: Layout picks

| Stage | Layout |
|---|---|
| 1 | a_pair (雙柱) |
| 5 | a_fish (阿鰭) |
| 11 | b_tri (三角柱) |
| 13 | b_fish (阿鰭) |
| 23 | c_fish (阿鰭) |
| 44 | d_fish (阿鰭) |

#### Scenario: Intro shows the layout name

- **WHEN** a stage intro plays
- **THEN** the intro shows "台面：" followed by the layout's Chinese name, for example "台面：雙柱" on stage 1

### Requirement: Pop Bumpers

The game SHALL place each layout's pop bumpers (planner term 「中柱」) as left-right mirrored pairs at (x, y) and (360 - x, y). A ball touching a bumper (bumper radius 22 px) SHALL be pushed away with a normal speed of at least 950 px/s, add 5 points to the score and count as one combo hit. Every bumper, and every point on the fish's swim path, SHALL stay at least 46 px (bumper radius + 2 × ball radius) away from every brick and the boss in all 50 stages.

> 中文：中柱左右對稱成對擺放，球打到會被用力彈開（至少 950）、加 5 分、算一次連擊；中柱和阿鰭的路線不會貼著磚塊。

#### Scenario: Bumper kicks the ball

- **WHEN** a ball moving at 300 px/s hits a bumper head-on
- **THEN** the ball leaves the bumper at no less than 950 px/s along the contact normal, the score rises by 5 and the combo counter rises by 1

#### Scenario: Bumpers keep clear of bricks

- **WHEN** any of the 50 stages is built with its own layout
- **THEN** no bumper center and no sampled fish-path point is closer than 46 px to any brick or the boss

### Requirement: Fish Bumper A-Fin

The layouts a_fish, b_fish, c_fish and d_fish SHALL add one swimming fish bumper (阿鰭) with radius 20 px that starts at x = 180 and moves horizontally between x = 70 and x = 290, reversing direction at each end. Its speed SHALL be 70 px/s (a_fish, y 652), 90 px/s (b_fish, y 520), 110 px/s (c_fish, y 440) and 130 px/s (d_fish, y 420). A ball touching the fish SHALL be kicked like a pop bumper (at least 950 px/s) and SHALL add 1 to the stage's fish-hit count. The first stage with a fish (stage 5) SHALL be preceded by the "d1_fish" comic.

> 中文：阿鰭會在台面上左右游，越後面的區游越快；打到它跟打中柱一樣會彈開，並記一次「打到阿鰭」。

#### Scenario: Fish turns around at the edge

- **WHEN** the fish on a d_fish table, moving right at 130 px/s, would pass x = 290 in a physics step
- **THEN** its position is set to x = 290 and its velocity becomes -130 px/s (moving left)

#### Scenario: Fish hit is counted

- **WHEN** a ball touches the fish during play
- **THEN** the ball is kicked away at no less than 950 px/s and the stage fish-hit count increases by 1

#### Scenario: Fish is introduced by a comic first

- **WHEN** the first stage whose layout has a fish is found (stage 5)
- **THEN** `SR.storyBefore` of that stage or an earlier one contains "d1_fish"

### Requirement: Boss Stages Use No Fish

Every boss stage (stages 10, 20, 30, 40, 50) SHALL use a layout without a fish, because the fish blocks the shooting line to the boss.

> 中文：首領關（每區第 10 關）不放阿鰭，免得擋住打首領的路線。

#### Scenario: Boss stage layouts

- **WHEN** `SR.layoutFor(n)` is called for n = 10, 20, 30, 40, 50
- **THEN** the layouts are a_pair, b_tri, c_pair, d_tri and d_tri, and none has a fish

### Requirement: Rubber Rails

The a_rubber and c_rubber layouts SHALL add rubber rail segments 3 px inside the side walls: a_rubber at x = 23 and x = 337 from y 610 to 730 (plus top offset), c_rubber at x = 23 from y 520 to 640 and at x = 337 from y 600 to 700. A ball hitting a rubber rail with a normal speed above 40 px/s SHALL bounce off with a normal speed of at least 640 px/s (sling kick 800 × 0.8).

> 中文：彈力牆貼在左右牆內側 3px，球撞上去會被彈回（至少 640）。

#### Scenario: Rubber rail kicks the ball

- **WHEN** a ball hits a rubber rail with a normal speed of 200 px/s
- **THEN** the ball bounces off with a normal speed of at least 640 px/s and a sling event is emitted

### Requirement: Layouts Have No Stuck Spots

For every one of the 15 layouts, a ball dropped anywhere on the open table (grid every 24 px, with ±5 px/s nudge, also with the maximum "big" ball of radius 16.5) SHALL NOT stay below 8 px/s for 3 continuous seconds.

> 中文：15 種台面配置都沒有會讓球卡住不動的死角。

#### Scenario: Stuck probe in flipper mode

- **WHEN** the stuck probe runs on all 15 layouts in flipper control mode
- **THEN** zero drops are reported as stuck

#### Scenario: Stuck probe in paddle mode

- **WHEN** the stuck probe runs on all 15 layouts in paddle control mode (open bottom, no slings)
- **THEN** zero drops are reported as stuck

