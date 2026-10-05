## MODIFIED Requirements

### Requirement: Gift Bricks

From stage 2 on (stages 2–50), the game SHALL turn plain bricks into gold gift bricks with 1 HP: 2 or 3 per stage (50% chance each), including boss stages. It SHALL pick among the plain bricks with the lowest HP first (normally 1 HP bricks), so every stage from 2 to 50 gets its full count. Stage 1 (the tutorial stage) SHALL NOT have gift bricks. Destroying a gift brick SHALL release an item capsule (see power-ups-and-items, Item Capsules).

> 中文：第 2 關起每關一定有 2～3 塊金色道具磚（首領關也有，第 1 關教學關沒有）；先挑 1 血的磚，不夠就挑血最少的磚改成 1 血；打碎會掉下一顆道具膠囊。

#### Scenario: Gift count by stage

- **WHEN** stages 1–50 are generated
- **THEN** stage 1 has 0 gift bricks and every stage from 2 to 50 has 2 or 3 gift bricks, each with 1 HP

#### Scenario: Not enough 1 HP bricks

- **WHEN** stage 23 is generated (it has only one plain 1 HP brick)
- **THEN** it still has 2 or 3 gift bricks, the extra ones taken from the lowest-HP plain bricks and set to 1 HP
