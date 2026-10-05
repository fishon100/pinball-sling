## MODIFIED Requirements

### Requirement: Rising Difficulty Measured At Human Speed

The game SHALL make later districts harder while every table stays short: through fewer pop bumpers, a smaller ball from district 3, a small paddle on district 4–5 normal stages and on every boss stage, harder bricks from district 3, boost pads from district 3, fewer ball guides (no trajectory preview or landing ring from district 3, a shorter ball trail in district 3 and none in districts 4–5), and fewer assists. District 1 SHALL stay beatable for a beginner, and difficulty SHALL be measured by a human-like player model (reaction 0.32 s, aim error 22 px) rather than machine-speed play.

> 中文：越後面越難，但台面都一樣矮：中柱變少、球變小、滑板變小、磚變硬、多了加速帶、球的軌跡提示（預覽線、落點圈、拖尾光）越來越少、輔助變少；第 1 區要讓新手打得過，難度一定用「模擬真人手速」的自動玩家量。

#### Scenario: Every table is short

- **WHEN** the layout of every stage from 1 to 50 is checked
- **THEN** visible table height SHALL be 740 px, no stage SHALL need camera scrolling, and each stage SHALL use a different layout from the previous stage within a district

#### Scenario: Assists shrink by district

- **WHEN** a stage of each district starts
- **THEN** trajectory preview SHALL be 1.0 / 0.7 / 0 / 0 / 0 seconds, the timing or landing hint SHALL be on only in districts 1–2, extra ball save SHALL be 3 / 1.5 / 0 / 0 / 0 seconds, and the finisher assist SHALL be on only in districts 1–2

#### Scenario: Paddle shrinks in late districts

- **WHEN** a stage starts in paddle mode
- **THEN** the paddle SHALL be size M on normal stages of districts 1–3 and size S on normal stages of districts 4–5 and on every boss stage

#### Scenario: District 1 is beginner-friendly at human speed

- **WHEN** the human-like novice player plays stages 1–9 five times each in paddle mode with district assists
- **THEN** the average hearts lost per stage SHALL be at most 1 and at least half of the stages SHALL be perfect (0 hearts lost)

## ADDED Requirements

### Requirement: Ball Size Per District

The game SHALL set the base ball radius by district: 12 px in districts 1 and 2, 10.5 px in district 3 and 9 px in districts 4 and 5. The "大罐" upgrade SHALL still add 1.5 px per level on top of the district's base radius.

> 中文：球越後面越小：第 1、2 區半徑 12、第 3 區 10.5、第 4、5 區 9；「大罐」強化照樣每級再大 1.5。

#### Scenario: Base radius by district

- **WHEN** stages 5, 15, 25, 35 and 45 start with no "大罐" upgrade
- **THEN** the ball radius SHALL be 12, 12, 10.5, 9 and 9 px

#### Scenario: Big upgrade adds to the district radius

- **WHEN** stage 35 starts with "大罐" at level 2
- **THEN** the ball radius SHALL be 12 px (9 + 2 × 1.5)
