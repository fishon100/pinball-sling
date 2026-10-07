## ADDED Requirements

### Requirement: Wide Table Geometry

The playfield SHALL span x = 0 (left wall) to x = 368 (lane inner wall) with the lane from x = 368 to 400 (32 px wide) and the top arc lowered 40 px; the brick grid SHALL keep 9 columns with cell width 39.4 px (bricks 37 × 18) starting at x = 7, y = 60, and SHALL allow rows down to y = 640. Every layout's bumpers, rails, boost pads and A-Fin paths SHALL be re-checked for the no-stuck-spot and 46 px-from-brick rules after the move.

> 中文：台面加寬：左牆 x=0、發射道內牆 x=368、發射道 32 px、頂端圓弧降 40 px；磚仍 9 欄、每格 39.4、磚 37×18、從 y=60 起最低可到 y=640；台面物件搬過去後重跑卡球與離磚檢查。

#### Scenario: Grid fits the wide table

- **WHEN** any of the 50 stages is placed
- **THEN** every brick lies between x = 0 and x = 368 and at least 60% of its bricks are kept

#### Scenario: Lane fits the largest ball

- **WHEN** the ball radius is at its maximum (15 with the largest 大罐 upgrade)
- **THEN** the ball fits in the 32 px lane and can be launched

#### Scenario: Layouts still have no stuck spots

- **WHEN** every layout is probed for stuck spots on the wide table
- **THEN** none is found
