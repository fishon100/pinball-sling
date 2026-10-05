## MODIFIED Requirements

### Requirement: Boss Spawn And Stats

On each boss stage (stages 10, 20, 30, 40, 50) the game SHALL place one boss block of 110 × 44 px, horizontally centered (x = 145), on the wall row that holds the `X` in the level table (y = 96 + 20 × row plus the table top offset). The boss SHALL take its HP, horizontal speed (px/s) and brick-refill interval (seconds) from the stage's 「首領血量」, 「首領速度」 and 「首領補磚秒」 columns. The first level table keeps the v3.7.1 values.

> 中文：首領出現在關卡表標 X 的那一排，血量、速度、補磚間隔都照關卡表；第一版的數值跟原本一樣。

#### Scenario: Boss stats come from the table

- **WHEN** the boss stage of each district is built from the first level table
- **THEN** the boss HP, speed and refill interval follow the table below

##### Example: Boss stats in the first table

| Stage | HP | Speed (px/s) | Refill interval (s) |
|---|---|---|---|
| 10 | 18 | 45 | 7.0 |
| 20 | 27 | 63 | 6.5 |
| 30 | 36 | 81 | 6.0 |
| 40 | 45 | 99 | 5.5 |
| 50 | 54 | 117 | 5.0 |

#### Scenario: Planner changes a boss

- **WHEN** row 30 sets 首領血量 to 50 and the table is synced
- **THEN** the stage 30 boss starts with 50 HP
