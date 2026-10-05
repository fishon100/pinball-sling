# plunger-launch Specification

## Purpose

The plunger launches each new ball from the launch lane the way a real pinball machine does: the player holds and pulls back, and the further the pull, the stronger the shot. It adds a tactile, physical moment to the start of every ball.

## Requirements

### Requirement: Plunger Ready State

The game SHALL accept a plunger pull only while a ball is waiting in the launch lane (x > 340 and y > 990), SHALL launch only a ball that has settled (vertical speed below 30 px/s), and SHALL show the waiting hint text while the ball waits.

> 中文：只有球停在發射道底部時才能拉發射桿；等待時下方提示會告訴玩家怎麼拉。

#### Scenario: Press without a lane ball is ignored

- **WHEN** no ball is in the launch lane and the player presses Space or presses the canvas in paddle mode
- **THEN** the plunger SHALL NOT start holding

#### Scenario: Hint text while waiting

- **WHEN** a ball waits in the launch lane and the plunger is not held
- **THEN** the hint SHALL read "按住畫面往下拉，放開發射" on touch devices in paddle mode, "按住右半邊往下拉，放開發射" on touch devices in flipper mode, and "按住滑鼠往下拖（或按住空白鍵），放開發射" with a mouse
- **AND** while the plunger is held the hint SHALL read "拉越多力道越大，放開發射！"


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Plunger Drag Pull

The game SHALL start a pull when the player presses the canvas while a ball waits (anywhere in paddle mode, right half only in flipper mode), SHALL set the charge to the downward drag distance divided by 16% of the canvas's on-screen height, clamped to 0–1, and SHALL vibrate 6 ms each time the charge crosses into a new 20% step.

> 中文：按住後往下拉，拉的距離÷畫面高度的 16%＝力道（0～1）；每多拉 2 成「喀」一下震動。

#### Scenario: Drag distance sets the charge

- **WHEN** the canvas is 740 px tall on screen and the player drags 59.2 px downward from the press point
- **THEN** the charge SHALL be 0.5

##### Example: Drag to charge on a 740 px tall canvas (full pull 118.4 px)

| Drag down | Charge |
|---|---|
| 0 px or upward | 0 |
| 29.6 px | 0.25 |
| 118.4 px | 1.0 |
| 200 px | 1.0 (clamped) |

#### Scenario: Pull clicks every 20%

- **WHEN** the player drags smoothly so the charge rises from 0 to 0.45
- **THEN** the device SHALL vibrate 6 ms twice, once when the charge passes 0.2 and once when it passes 0.4


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
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


<!-- @trace
source: fix-baseline-bugs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Plunger Minimum Pull

The game SHALL NOT launch when the plunger is released with a charge below 0.08; instead it SHALL reset the charge, shake the plunger knob and show "按住往下拉，再放開！" on touch devices or "按住往下拖（或按住空白鍵），再放開！" with a mouse for 1.8 seconds.

> 中文：拉不到 8% 就放開不會發射，拉柄會抖一下並提示「按住往下拉，再放開！」。

#### Scenario: Tap without pulling does not launch

- **WHEN** the player presses and releases the canvas without dragging while a ball waits
- **THEN** the ball SHALL stay in the lane, the charge SHALL be 0 and the reminder message SHALL appear

#### Scenario: Just enough pull launches

- **WHEN** the plunger is released with charge 0.08
- **THEN** the ball SHALL launch at 1396 px/s


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Plunger Launch Speed

On a valid release the game SHALL set the waiting ball's upward speed to 1300 + 1200 × charge px/s (1300 at minimum, 2500 at full), SHALL give the ball 2 pierce charges per "穿透漆" upgrade level, SHALL start the launch ball-save timer, and SHALL play the launch sound with a 20 ms vibration. The launched ball SHALL leave the lane through the one-way gate at the lane top and SHALL NOT re-enter through it.

> 中文：放開時的發射速度＝1300＋1200×力道（最小 1300、最大 2500）；發射同時開始計算球保險。

#### Scenario: Launch speed follows the charge

- **WHEN** the plunger is released at a given charge
- **THEN** the ball's vertical velocity SHALL be set as in the table below

##### Example: Charge to launch speed

| Charge | Launch speed (px/s, upward) |
|---|---|
| 0.08 | 1396 |
| 0.5 | 1900 |
| 1.0 | 2500 |

#### Scenario: Largest ball still leaves the lane

- **WHEN** a ball of radius 16.5 settles in the lane and is launched at 2500 px/s
- **THEN** the ball SHALL rise above y 500 within 1 second

#### Scenario: Gate blocks the ball from re-entering the lane

- **WHEN** a ball on the table side hits the one-way gate segment from (340, 560) to (380, 525)
- **THEN** the ball SHALL bounce off the gate, while a ball rising from inside the lane SHALL pass through it

#### Scenario: Launch starts ball save

- **WHEN** a ball is launched in stage 1 with no "保險罐" upgrade
- **THEN** ball save SHALL be 6 seconds and SHALL count down only while a ball is outside the lane


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Plunger Launch Preview

While the plunger is held and the district has trajectory preview (districts 1–3), the game SHALL draw the predicted path of a ghost ball launched at the current charge, for at least 0.8 seconds of flight.

> 中文：第 1～3 區拉發射桿時，會畫出「現在放開會飛到哪」的彈道預覽，跟著力道即時變化。

#### Scenario: Preview follows the current charge

- **WHEN** in stage 1 the player holds the plunger at charge 0.5
- **THEN** one preview path SHALL be computed from a ghost ball with upward speed 1900 px/s for 1.0 seconds

#### Scenario: No launch preview without the assist

- **WHEN** in stage 31 the player holds the plunger
- **THEN** no preview path SHALL be drawn

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->