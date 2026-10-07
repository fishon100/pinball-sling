## ADDED Requirements

### Requirement: Lane Slides Out After Launch

While no ball is waiting in the lane the lane and plunger SHALL slide 40 px to the right (off the table) over 0.3 s so the right edge reads as a plain wall and the brick area as the full width; when a ball is placed in the lane (new ball, ball save) the lane SHALL slide back within 0.3 s before the ball is shown. Physics SHALL be unchanged: the lane walls stay where they are.

> 中文：發射道沒有球時 0.3 秒往右滑出畫面（右邊看起來就是一面牆、磚區撐滿），球回到發射道時 0.3 秒滑回來；物理不變。

#### Scenario: Lane slides out after the ball leaves

- **WHEN** the ball has been launched and 0.3 s has passed
- **THEN** the lane's drawn offset is 40 px to the right

#### Scenario: Lane slides back for a new ball

- **WHEN** a new ball is placed in the lane
- **THEN** the lane's drawn offset returns to 0 within 0.3 s
