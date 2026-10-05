## MODIFIED Requirements

### Requirement: Per-District Assist Schedule

The game SHALL take the active assists of a stage from the district that contains the stage (stages 1-10 district 1, 11-20 district 2, 21-30 district 3, 31-40 district 4, 41-50 district 5), and SHALL apply exactly the values in the table below. The map card of every unlocked district SHALL list that district's preview seconds, landing hint (paddle) or flipper timing hint (flipper), and extra ball-save seconds, and SHALL show "沒有輔助：全靠你的手感" when none of those three is active.

> 中文：輔助跟著街區走，只有第 1、2 區有彈道預覽線和落點圈；第 3 區起全部關掉，地圖卡片上會寫出這一區有哪些輔助。

#### Scenario: Assists come from the stage's district

- **WHEN** a stage starts
- **THEN** the trajectory preview, landing/timing hint, extra ball save and finisher assist SHALL match the row of the stage's district

##### Example: Assist values per district

| District | Stages | Preview (s) | Landing / timing hint | Extra ball save (s) | Finisher |
|---|---|---|---|---|---|
| 1 巷口 | 1-10 | 1.0 | on | 3 | on |
| 2 地鐵站 | 11-20 | 0.7 | on | 1.5 | on |
| 3 屋頂 | 21-30 | 0 | off | 0 | off |
| 4 河堤 | 31-40 | 0 | off | 0 | off |
| 5 市中心大牆 | 41-50 | 0 | off | 0 | off |

#### Scenario: Map card shows no-assist line

- **WHEN** the player opens the map and district 3 is unlocked
- **THEN** the district 3 card SHALL show "沒有輔助：全靠你的手感"

#### Scenario: Assist announcement on the first stage of a district

- **WHEN** the first stage of a district that has any listed assist starts and the tutorial is not running
- **THEN** Pinky SHALL say the district's assist list prefixed with "這一區的輔助：" for 4 seconds
