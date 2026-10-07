## MODIFIED Requirements

### Requirement: Paddle Input Following

(Unchanged except) on a fine-pointer device the mouse cursor SHALL be hidden over the game canvas while a stage is being played and time is running, and shown again when paused, during introductions or on any other screen. Keyboard ←/→ SHALL move the paddle target at the same top speed as the paddle follows the mouse.

> 中文：電腦上遊玩中（球在動）隱藏滑鼠游標，暫停或教學時恢復；方向鍵移滑板的速度跟滑鼠一樣快。

#### Scenario: Cursor hidden while playing

- **WHEN** a mouse user is playing a stage and the game is not paused
- **THEN** the canvas cursor style is "none"

#### Scenario: Cursor back on pause

- **WHEN** the player pauses
- **THEN** the canvas cursor style is the default
