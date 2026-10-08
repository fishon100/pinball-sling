## ADDED Requirements

### Requirement: Brick Rows Up To Fourteen

The brick wall editor and the level checks SHALL allow up to 14 rows (was 11) so planners can place bricks three rows lower; the usual 46 px clearance from bumpers, A-Fin paths and boost pads still applies.

> 中文：磚牆最多 14 排（原 11），企劃可以在編輯器往下多加 3 排；離中柱、阿鰭、加速帶 46 px 的檢查照舊。

#### Scenario: Editor accepts a fourteenth row

- **WHEN** the planner adds rows to a stage in the editor
- **THEN** rows can be added until the wall has 14 rows and the level check accepts a 14-row wall
