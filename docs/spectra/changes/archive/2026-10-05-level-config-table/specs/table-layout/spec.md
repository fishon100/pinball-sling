## MODIFIED Requirements

### Requirement: Layout Rotation Per Stage

The game SHALL use for each stage the layout named in its 「台面配置」 column of the level table, and SHALL build that layout's geometry from the layout table 「台面配置表」 (pop bumpers, fish, rubber rails, boost pads; every layout uses the short table, top 320). The stage intro SHALL display the text "台面：<layout name>". The first level table keeps the v3.7.1 rotation; a stage using the same layout as the previous stage SHALL only be reported, not blocked.

> 中文：每關用哪個台面看關卡表的「台面配置」欄，台面長什麼樣看「台面配置表」；開場會顯示「台面：○○」；相鄰兩關一樣只報告、不擋。

#### Scenario: Layout from the table

- **WHEN** row 15 sets 台面配置 to d_high and the table is synced
- **THEN** stage 15 is built with the d_high bumpers, boost pads and name "高柱"

#### Scenario: Intro shows the layout name

- **WHEN** a stage intro plays
- **THEN** the intro shows "台面：" followed by the layout's Chinese name, for example "台面：雙柱" on stage 1

### Requirement: Pop Bumpers

The game SHALL place each layout's pop bumpers (planner term 「中柱」) at the coordinates listed in the layout table. A ball touching a bumper (bumper radius 22 px) SHALL be pushed away with a normal speed of at least 950 px/s, add 5 points to the score and count as one combo hit. Every bumper, and every point on the fish's swim path, SHALL stay at least 46 px (bumper radius + 2 × ball radius) away from every brick and the boss in all 50 stages; a sync that breaks this SHALL be blocked. The first layout table keeps the v3.7.1 bumpers (fewer in later districts).

> 中文：中柱的位置照台面配置表；球打到會被用力彈開（至少 950）、加 5 分、算一次連擊；中柱和阿鰭的路線一定離磚 46 px 以上，否則同步會擋下。

#### Scenario: Bumper kicks the ball

- **WHEN** a ball moving at 300 px/s hits a bumper head-on
- **THEN** the ball leaves the bumper at no less than 950 px/s along the contact normal, the score rises by 5 and the combo counter rises by 1

#### Scenario: Bumpers keep clear of bricks

- **WHEN** any of the 50 stages is built with its own layout
- **THEN** no bumper center and no sampled fish-path point is closer than 46 px to any brick or the boss

### Requirement: Fish Bumper A-Fin

A layout whose 「阿鰭」 column is filled (y, left bound, right bound, speed) SHALL add one swimming fish bumper (阿鰭) with radius 20 px that starts midway between the bounds at that y and moves horizontally between the bounds at that speed, reversing direction at each end. A ball touching the fish SHALL be kicked like a pop bumper (at least 950 px/s) and SHALL add 1 to the stage's fish-hit count. The first stage with a fish SHALL be preceded by the "d1_fish" comic.

> 中文：台面配置表有填「阿鰭」的台面，阿鰭會照填的高度、左右界和速度游來游去；打到它跟打中柱一樣會彈開，並記一次「打到阿鰭」。

#### Scenario: Fish turns around at the edge

- **WHEN** the fish on a layout with 阿鰭 "690,70,290,130", moving right at 130 px/s, would pass x = 290 in a physics step
- **THEN** its position is set to x = 290 and its velocity becomes -130 px/s (moving left)

#### Scenario: Fish hit is counted

- **WHEN** a ball touches the fish during play
- **THEN** the ball is kicked away at no less than 950 px/s and the stage fish-hit count increases by 1

#### Scenario: Fish is introduced by a comic first

- **WHEN** the first stage whose layout has a fish is found
- **THEN** `SR.storyBefore` of that stage or an earlier one contains "d1_fish"

### Requirement: Rubber Rails

A layout's 「彈力牆」 column SHALL add rubber rail segments at the listed endpoints. A ball hitting a rubber rail with a normal speed above 40 px/s SHALL bounce off with a normal speed of at least 640 px/s (sling kick 800 × 0.8).

> 中文：台面配置表的「彈力牆」會在填的位置加上彈力牆，球撞上去會被彈回（至少 640）。

#### Scenario: Rubber rail kicks the ball

- **WHEN** a ball hits a rubber rail with a normal speed of 200 px/s
- **THEN** the ball bounces off with a normal speed of at least 640 px/s and a sling event is emitted

### Requirement: Boost Pads

A layout's 「加速帶左上角」 column SHALL add one 56 × 14 boost pad (加速帶, arrow pointing up) per listed point; boss stages SHALL have none. When a ball's center enters a pad while the ball is moving upward (vertical speed below 0), the game SHALL multiply the ball's speed by 1.35 keeping its direction, raise it to at least 1000 px/s, cap it at 2000 px/s, emit a "boost" event (sound and flash), and SHALL NOT boost the same ball again within 0.5 s. A ball moving downward across a pad SHALL NOT be boosted. Pads SHALL stay at least 46 px away from every brick and bumper. The first layout table keeps the v3.7.1 pads (1 per district 3 layout, 2 per district 4–5 layout).

> 中文：台面配置表填的位置會出現加速帶（首領關沒有）：球往上經過加速 1.35 倍（最少 1000、最多 2000）、往下不加速、0.5 秒內不重複。

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

#### Scenario: No pads on boss stages

- **WHEN** a boss stage uses a layout that lists boost pads
- **THEN** the stage has no boost pads
