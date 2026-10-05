## MODIFIED Requirements

### Requirement: Brick Hit Points

The game SHALL give each `1`–`3` brick its digit as base HP, then add 1 HP with probability `min(0.65, 0.14 × d + 0.025 × local)`. Brick HP SHALL NOT be reduced in any district (the former district 4–5 reduction of 1 HP is removed, which makes district 4–5 bricks harder than before). Brick HP SHALL be capped at 5. Paint buckets and gift bricks SHALL always have 1 HP.

> 中文：磚血從圖案的數字開始，越後面的區與關越容易多 1 血（最多 65% 機率），最多 5 血；第 4、5 區不再「每塊少 1 血」，所以比以前硬。

#### Scenario: No bonus HP on the first stage

- **WHEN** stage 1 is generated
- **THEN** every brick's HP equals its pattern digit (bonus chance 0)

##### Example: Bonus HP chance

| Stage | d | local | Bonus chance |
|---|---|---|---|
| 1 | 0 | 0 | 0 |
| 9 | 0 | 8 | 0.20 |
| 15 | 1 | 4 | 0.24 |
| 35 | 3 | 4 | 0.52 |
| 49 | 4 | 8 | 0.65 (capped from 0.76) |

#### Scenario: Late districts are no longer reduced

- **WHEN** any normal brick in stages 31–49 (excluding boss stages) is generated
- **THEN** its HP is at least its pattern digit and at most its pattern digit + 1
