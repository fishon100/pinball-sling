## MODIFIED Requirements

### Requirement: Brick Hit Points

The game SHALL give each `1`–`3` brick its digit as base HP, then add 1 HP with probability `min(0.65, 0.14 × d + 0.025 × local)`. In districts 3, 4 and 5 (d ≥ 2) the game SHALL then add 1 more HP to every brick. Brick HP SHALL be capped at 5. Paint buckets and gift bricks SHALL always have 1 HP.

> 中文：磚血從圖案的數字開始，越後面的區與關越容易多 1 血（最多 65% 機率）；第 3～5 區每塊再多 1 血，最多 5 血。

#### Scenario: No bonus HP on the first stage

- **WHEN** stage 1 is generated
- **THEN** every brick's HP equals its pattern digit (bonus chance 0)

##### Example: Bonus HP chance

| Stage | d | local | Bonus chance | District 3–5 extra HP |
|---|---|---|---|---|
| 1 | 0 | 0 | 0 | no |
| 9 | 0 | 8 | 0.20 | no |
| 15 | 1 | 4 | 0.24 | no |
| 25 | 2 | 4 | 0.38 | yes |
| 49 | 4 | 8 | 0.65 (capped from 0.76) | yes |

#### Scenario: Late districts are harder

- **WHEN** any normal brick in stages 21–49 (excluding boss stages) is generated
- **THEN** its HP is at least its pattern digit + 1 and at most 5
