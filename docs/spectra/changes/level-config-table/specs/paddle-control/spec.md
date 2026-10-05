## MODIFIED Requirements

### Requirement: Paddle Sizes

The game SHALL use three paddle sizes with half-widths S 48, M 56 and L 76 (widths 96 / 112 / 152). Each stage SHALL start with the size in its 「滑板」 column of the level table; while the "寬板" item is active for 12 seconds the paddle SHALL be size L, after which it SHALL return to the stage's size. The first level table keeps the v3.7.1 sizes (M on normal stages of districts 1–3, S on districts 4–5 and every boss stage).

> 中文：滑板有小中大三種（寬 96／112／152）；每關用關卡表「滑板」欄的尺寸；道具「寬板」12 秒內＝大。

#### Scenario: Stage decides the base size

- **WHEN** stages 3, 25, 35 and 10 start in paddle mode with the first level table
- **THEN** the paddle SHALL be size M, M, S and S, and the size S half-width SHALL be 48

#### Scenario: Wide item enlarges then restores

- **WHEN** the "寬板" item is used on a size-M paddle
- **THEN** the half-width SHALL become 76 at once and SHALL return to 56 once 12 seconds of play time have passed
