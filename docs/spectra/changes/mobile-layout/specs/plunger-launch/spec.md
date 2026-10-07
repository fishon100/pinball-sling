## ADDED Requirements

### Requirement: Lane Dims After Launch

While no ball is waiting in the lane the lane and plunger SHALL be drawn at 35% opacity so the brick area reads as wider; when a ball returns to the lane (new ball, ball save) the lane SHALL fade back to full opacity within 0.3 s.

> 中文：發射道沒有球時畫成 35% 透明度（看起來磚區更寬），球回到發射道時 0.3 秒內亮回來。

#### Scenario: Lane dims after the ball leaves

- **WHEN** the ball has been launched and 0.3 s has passed
- **THEN** the lane opacity is 0.35

#### Scenario: Lane lights up for a new ball

- **WHEN** a new ball is placed in the lane
- **THEN** the lane opacity returns to 1 within 0.3 s
