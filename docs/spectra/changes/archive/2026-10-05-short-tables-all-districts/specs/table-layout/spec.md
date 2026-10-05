## MODIFIED Requirements

### Requirement: Table Height Per District

The game SHALL use the short table in every stage: every layout's `top` value SHALL be 320, so the playable table height (1060 minus `top`) is 740 px in all five districts and the whole table fits in one 740 px screen.

> 中文：50 關全部用矮台面，跟第 1 區一樣一個畫面就看完。

#### Scenario: Every stage uses the short table

- **WHEN** `SR.layoutFor(n)` is called for every stage n from 1 to 50
- **THEN** every returned layout has `top` equal to 320

### Requirement: Pop Bumpers

The game SHALL place each layout's pop bumpers (planner term 「中柱」) as left-right mirrored pairs at (x, y) and (360 - x, y). Later districts SHALL have fewer bumpers: a district 1 layout SHALL have 1 to 3 pairs, a district 2 layout at most 2 pairs, and a district 3, 4 or 5 layout at most 1 pair. A ball touching a bumper (bumper radius 22 px) SHALL be pushed away with a normal speed of at least 950 px/s, add 5 points to the score and count as one combo hit. Every bumper, and every point on the fish's swim path, SHALL stay at least 46 px (bumper radius + 2 × ball radius) away from every brick and the boss in all 50 stages.

> 中文：中柱左右對稱成對擺放，越後面的區越少（第 2 區最多 2 對、第 3～5 區最多 1 對）；球打到會被用力彈開、加 5 分、算一次連擊；中柱和阿鰭的路線不會貼著磚塊。

#### Scenario: Bumper kicks the ball

- **WHEN** a ball moving at 300 px/s hits a bumper head-on
- **THEN** the ball leaves the bumper at no less than 950 px/s along the contact normal, the score rises by 5 and the combo counter rises by 1

#### Scenario: Bumpers keep clear of bricks

- **WHEN** any of the 50 stages is built with its own layout
- **THEN** no bumper center and no sampled fish-path point is closer than 46 px to any brick or the boss

#### Scenario: Fewer bumpers in later districts

- **WHEN** the bumper pairs of every layout used by each district are counted
- **THEN** every district 2 layout has at most 2 pairs and every district 3, 4 and 5 layout has at most 1 pair

### Requirement: Fish Bumper A-Fin

The layouts a_fish, b_fish, c_fish and d_fish SHALL add one swimming fish bumper (阿鰭) with radius 20 px that starts at x = 180 and moves horizontally between x = 70 and x = 290, reversing direction at each end. Its speed SHALL be 70 px/s (a_fish), 90 px/s (b_fish), 110 px/s (c_fish) and 130 px/s (d_fish), and its swim line SHALL lie on the short table at least 46 px from every brick. A ball touching the fish SHALL be kicked like a pop bumper (at least 950 px/s) and SHALL add 1 to the stage's fish-hit count. The first stage with a fish (stage 5) SHALL be preceded by the "d1_fish" comic.

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

### Requirement: Rubber Rails

The a_rubber and c_rubber layouts SHALL add rubber rail segments 3 px inside the side walls (at x = 23 and x = 337) on the lower half of the short table. A ball hitting a rubber rail with a normal speed above 40 px/s SHALL bounce off with a normal speed of at least 640 px/s (sling kick 800 × 0.8).

> 中文：彈力牆貼在左右牆內側 3px，球撞上去會被彈回（至少 640）。

#### Scenario: Rubber rail kicks the ball

- **WHEN** a ball hits a rubber rail with a normal speed of 200 px/s
- **THEN** the ball bounces off with a normal speed of at least 640 px/s and a sling event is emitted

## ADDED Requirements

### Requirement: Boost Pads

Starting in district 3, normal (non-boss) stages SHALL have boost pads (加速帶): 1 pad in district 3 and 2 pads in districts 4 and 5; districts 1 and 2 and all boss stages SHALL have none. A boost pad is an upward-pointing strip on the table. When a ball's center enters a pad while the ball is moving upward (vertical speed below 0), the game SHALL multiply the ball's speed by 1.35 keeping its direction, raise it to at least 1000 px/s, cap it at 2000 px/s, emit a "boost" event (sound and flash), and SHALL NOT boost the same ball again within 0.5 s. A ball moving downward across a pad SHALL NOT be boosted. Pads SHALL stay at least 46 px away from every brick and bumper.

> 中文：第 3 區起台面上有「加速帶」（第 3 區 1 條、第 4、5 區 2 條，首領關沒有），像瑪利歐賽車那樣：球往上經過時會被加速 1.35 倍（最多 2000）；球往下掉經過時不加速，免得來不及接。

#### Scenario: Upward ball is boosted

- **WHEN** a ball moving straight up at 800 px/s enters a boost pad
- **THEN** its speed becomes 1080 px/s in the same direction and a boost event is emitted

##### Example: Boost results

| Speed entering (upward) | Speed after |
|---|---|
| 500 px/s | 1000 px/s (raised to minimum) |
| 800 px/s | 1080 px/s |
| 1700 px/s | 2000 px/s (capped) |

#### Scenario: Falling ball is not boosted

- **WHEN** a ball moving down at 800 px/s crosses a boost pad
- **THEN** its speed is unchanged by the pad and no boost event is emitted

#### Scenario: Cooldown prevents double boosts

- **WHEN** a boosted ball touches the same or another pad again within 0.5 s
- **THEN** it is not boosted a second time

#### Scenario: Pad count by district

- **WHEN** stages 25, 35, 45, 30 and 15 are built
- **THEN** they have 1, 2, 2, 0 and 0 boost pads respectively
