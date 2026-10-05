## MODIFIED Requirements

### Requirement: Fifty Stages In Five Districts

The game SHALL have 50 stages numbered 1 to 50, grouped into 5 districts of 10 stages each (alley 1–10, subway 11–20, rooftops 21–30, riverside 31–40, downtown 41–50). The 10th stage of every district (stages 10, 20, 30, 40, 50) SHALL be a boss stage and every other stage SHALL NOT contain a boss. Every stage SHALL be built from its row of the level table (see level-config), so the same table always yields the same bricks.

> 中文：遊戲有 5 區 × 10 關共 50 關，每區第 10 關是首領關；每一關照關卡設定表建立，表不變磚就不變。

#### Scenario: Boss only on every 10th stage

- **WHEN** stages 1 to 50 are built and placed on their tables
- **THEN** a boss exists on stage n exactly when n mod 10 = 0, and every stage has at least one brick or a boss

#### Scenario: Stage building is repeatable

- **WHEN** `SR.buildStage(n)` is called twice for the same n with the same level table
- **THEN** both results have identical cells (row, column, type and HP)

### Requirement: Brick Hit Points

Each brick's HP SHALL be the digit written in its level-table wall cell (1–5). Paint buckets (`B`) and gift bricks (`G`) SHALL always have 1 HP. The first level table keeps the v3.7.1 values (pattern digit, a district- and stage-dependent chance of +1 HP, no district 4–5 reduction).

> 中文：每塊磚的血就是關卡表磚牆上寫的數字（1～5）；油漆桶和道具磚一律 1 血。

#### Scenario: HP comes from the table

- **WHEN** a stage's wall row is "123451234"
- **THEN** its bricks have 1, 2, 3, 4, 5, 1, 2, 3 and 4 HP from left to right

### Requirement: Gift Bricks

Gift bricks SHALL be exactly the cells marked `G` in the level table, each with 1 HP; destroying one SHALL release an item capsule (see power-ups-and-items, Item Capsules). The first level table has 2 or 3 gift bricks on every stage from 2 to 50, including boss stages, and none on stage 1.

> 中文：道具磚就是關卡表上標 G 的格子（1 血），打碎掉下一顆道具膠囊；第一版表是第 2 關起每關 2～3 塊、第 1 關沒有。

#### Scenario: Gift bricks follow the table

- **WHEN** a stage's wall has G in two cells
- **THEN** the stage has exactly two gift bricks, at those cells

## REMOVED Requirements

### Requirement: Text-Shaped Brick Patterns

**Reason**: 磚牆改由企劃在關卡設定表逐關畫（存的是最後的樣子），不再由「13 種圖案＋隨機翻轉＋加排」公式產生。
**Migration**: 第一版關卡表保留了原本 13 種文字圖案算出來的 50 關磚牆；公式留在 `SR.generateStage(n)` 只當參考。要改磚牆就改關卡表的「第1排～第11排」或用磚塊圖案編輯器（見 level-config）。
