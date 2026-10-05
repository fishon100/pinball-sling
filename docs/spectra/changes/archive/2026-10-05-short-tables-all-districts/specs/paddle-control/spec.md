## MODIFIED Requirements

### Requirement: Paddle Sizes

The game SHALL use three paddle sizes with half-widths S 48, M 56 and L 76 (widths 96 / 112 / 152): size M on normal stages of districts 1–3, size S on normal stages of districts 4–5 and on every boss stage (every 10th stage), and size L while the "寬板" item is active for 12 seconds, after which the paddle SHALL return to the stage's size.

> 中文：滑板有小中大三種（寬 96／112／152）：第 1～3 區一般關＝中、第 4、5 區一般關和所有首領關＝小、用了道具「寬板」12 秒內＝大。

#### Scenario: Stage decides the base size

- **WHEN** stages 3, 25, 35 and 10 start in paddle mode
- **THEN** the paddle SHALL be size M, M, S and S, and the size S half-width SHALL be 48

#### Scenario: Wide item enlarges then restores

- **WHEN** the "寬板" item is used on a size-M paddle
- **THEN** the half-width SHALL become 76 at once and SHALL return to 56 once 12 seconds of play time have passed
