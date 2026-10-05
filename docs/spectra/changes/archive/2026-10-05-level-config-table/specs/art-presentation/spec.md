## MODIFIED Requirements

### Requirement: Ball Trail By District

The game SHALL draw a glowing trail behind each ball whose length (in stored points, 0–20) comes from the stage's 「拖尾」 column of the level table; 0 means no trail. The first level table keeps the v3.7.1 values (8 in districts 1–2, 4 in district 3, 0 in districts 4–5).

> 中文：球後面的拖尾光長度看關卡表「拖尾」欄，0＝沒有；第一版是第 1、2 區 8、第 3 區 4、第 4、5 區 0。

#### Scenario: Trail length from the table

- **WHEN** stages 5, 15, 25, 35 and 45 are played for 2 seconds with a ball in flight and the first level table
- **THEN** the stored trail of the ball SHALL hold at most 8, 8, 4, 0 and 0 points
