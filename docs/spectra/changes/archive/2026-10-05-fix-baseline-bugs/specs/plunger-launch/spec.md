## MODIFIED Requirements

### Requirement: Plunger Keyboard Charge

The game SHALL let the player hold Space to pull the plunger, increasing the charge linearly from 0 to 1 over 0.9 seconds, and SHALL release the plunger when Space is released. Only the first Space keydown of a press SHALL start the pull; operating-system key auto-repeat keydown events SHALL be ignored and SHALL NOT reset the charge.

> 中文：電腦按住空白鍵會慢慢往後拉，0.9 秒拉滿，放開就發射；按住時系統自動連發的訊號不會再讓力道歸零。

#### Scenario: Holding Space charges over time

- **WHEN** a ball waits in the lane and the player holds Space for 0.45 seconds and releases
- **THEN** the charge at release SHALL be 0.5 and the ball SHALL launch at 1900 px/s

#### Scenario: Holding longer caps at full

- **WHEN** a single Space keydown is received and 2 seconds pass with no further keydown
- **THEN** the charge SHALL stay at 1.0

#### Scenario: Auto-repeat keydown keeps the pull

- **WHEN** the charge is 0.6 and a Space keydown event with repeat set arrives while Space is still held
- **THEN** the charge SHALL stay at 0.6 and keep rising
