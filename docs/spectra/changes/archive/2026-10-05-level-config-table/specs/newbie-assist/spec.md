## MODIFIED Requirements

### Requirement: Per-District Assist Schedule

The game SHALL take the active assists of each stage from its row in the level table: trajectory preview seconds (「彈道預覽秒」), landing or flipper timing hint (「落點提示」 是／否), extra ball-save seconds (「加長球保險秒」) and finisher assist (「收尾輔助」 是／否). The map card of every unlocked district SHALL list the assists of the district's first stage, and SHALL show "沒有輔助：全靠你的手感" when none of preview, hint and extra ball save is active there. The first level table keeps the v3.7.1 values.

> 中文：每關的輔助看關卡表（預覽秒數、落點提示、加長球保險、收尾輔助）；地圖卡片寫出這一區第一關的輔助，都沒有就顯示「沒有輔助：全靠你的手感」。

#### Scenario: Assists come from the table

- **WHEN** a stage starts
- **THEN** the trajectory preview, landing/timing hint, extra ball save and finisher assist SHALL match the stage's row

##### Example: Assist values in the first table

| Stages | Preview (s) | Landing / timing hint | Extra ball save (s) | Finisher |
|---|---|---|---|---|
| 1-10 | 1.0 | 是 | 3 | 是 |
| 11-20 | 0.7 | 是 | 1.5 | 是 |
| 21-50 | 0 | 否 | 0 | 否 |

#### Scenario: Map card shows no-assist line

- **WHEN** the player opens the map, district 3 is unlocked and stage 21 has no preview, no hint and no extra ball save
- **THEN** the district 3 card SHALL show "沒有輔助：全靠你的手感"

#### Scenario: Assist announcement on the first stage of a district

- **WHEN** the first stage of a district that has any listed assist starts and the tutorial is not running
- **THEN** Pinky SHALL say the district's assist list prefixed with "這一區的輔助：" for 4 seconds
