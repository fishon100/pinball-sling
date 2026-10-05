## MODIFIED Requirements

### Requirement: Rising Difficulty Measured At Human Speed

Stage difficulty SHALL be set by planners in the level table (brick walls, bumpers, ball size, paddle size, boost pads, ball guides, assists, boss stats) while every table stays short. Difficulty SHALL be measured by a human-like player model (reaction 0.32 s, aim error 22 px) rather than machine-speed play, and the measurements SHALL be reported on every sync without blocking it. The first level table keeps the v3.7.1 difficulty curve.

> 中文：每關難度由企劃在關卡表決定；難度一定用「模擬真人手速」的自動玩家量，每次同步都會報告，但不會擋部署。

#### Scenario: Every table is short

- **WHEN** the layout of every stage from 1 to 50 is checked
- **THEN** visible table height SHALL be 740 px and no stage SHALL need camera scrolling

#### Scenario: Difficulty is reported

- **WHEN** the level table is synced
- **THEN** the report lists, per district, the novice bot's average hearts lost per stage and seconds per stage, and the sync continues whatever the numbers are

### Requirement: Ball Size Per District

Each stage SHALL use the base ball radius in its 「球半徑」 column of the level table (8–16 px). The "大罐" upgrade SHALL still add 1.5 px per level on top of the stage's base radius. The first level table keeps the v3.7.1 radii (12, 12, 11, 10.5, 10.5 px for districts 1–5).

> 中文：每關的球大小看關卡表「球半徑」欄（8～16）；「大罐」強化照樣每級再大 1.5。

#### Scenario: Base radius from the table

- **WHEN** stages 5, 15, 25, 35 and 45 start with no "大罐" upgrade and the first level table
- **THEN** the ball radius SHALL be 12, 12, 11, 10.5 and 10.5 px

#### Scenario: Big upgrade adds to the stage radius

- **WHEN** stage 35 starts with "大罐" at level 2 and the first level table
- **THEN** the ball radius SHALL be 13.5 px (10.5 + 2 × 1.5)
