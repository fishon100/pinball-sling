## MODIFIED Requirements

### Requirement: Gift Bricks

From stage 2 on (stages 2–50), the game SHALL turn plain 1 HP bricks into gold gift bricks: 2 or 3 per stage (50% chance each), including boss stages, limited by the number of 1 HP bricks available. Stage 1 (the tutorial stage) SHALL NOT have gift bricks. Destroying a gift brick SHALL release an item capsule (see power-ups-and-items, Item Capsules).

> 中文：第 2 關起每關有 2～3 塊金色道具磚（首領關也有，第 1 關教學關沒有），打碎會掉下一顆道具膠囊。

#### Scenario: Gift count by stage

- **WHEN** stages 1–50 are generated
- **THEN** stage 1 has 0 gift bricks and every stage from 2 to 50 has 2 or 3 gift bricks, unless it has fewer plain 1 HP bricks than that
