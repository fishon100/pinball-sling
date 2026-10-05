## MODIFIED Requirements

### Requirement: Paddle Input Following

In paddle mode during play, the game SHALL set the paddle target x from mouse movement anywhere in the window without a click, from a finger pressed on the canvas, or from held arrow keys at 950 px/s, and SHALL move the paddle toward the target at no more than 2600 px/s. A pointer (finger or mouse) that started a plunger pull SHALL NOT change the paddle target, neither when it is pressed nor while it moves, until it is released; after release it SHALL control the paddle again. The mouse cursor SHALL be hidden over the canvas while playing in paddle mode.

> 中文：滑板跟著滑鼠（不用點，移出畫面也跟）、手指或方向鍵移動；正在拉發射桿的那根手指不會帶動滑板，放開後才恢復；滑板追目標的速度最快每秒 2600 px，遊玩中滑鼠游標會藏起來。

#### Scenario: Mouse moves the paddle without clicking

- **WHEN** the player moves the mouse, including outside the canvas, during play
- **THEN** the paddle target SHALL be the mouse x converted to table coordinates and the paddle SHALL move toward it, stopping at the range edge when the mouse is beyond the table

#### Scenario: Pulling the plunger does not move the paddle

- **WHEN** a ball waits in the launch lane, the paddle target is x 180, and the player presses the canvas at the far left and drags down and sideways to pull the plunger
- **THEN** the paddle target SHALL stay at x 180 until the pointer is released, and the next pointer move after release SHALL set the target again

#### Scenario: Paddle speed is capped per frame

- **WHEN** the target is set far to the right (x 9999) and one frame (1/60 s) is simulated from x 180
- **THEN** the paddle SHALL move at most 2600 / 60 ≈ 43.3 px plus 0.5 px tolerance

#### Scenario: Arrow keys move the paddle

- **WHEN** the player holds the right arrow (or `/` or `M`) key during play
- **THEN** the paddle target SHALL advance 950 px per second to the right; holding the left arrow (or `Z`) SHALL move it left at the same rate

#### Scenario: Cursor is hidden during paddle play

- **WHEN** the screen is in play in paddle mode
- **THEN** the canvas cursor style SHALL be `none`, and it SHALL return to the default on any other screen
