## ADDED Requirements

### Requirement: Tutorial Stages Have Few Bricks

In the first level table after this change, stages 1–5 SHALL be tutorial stages with few bricks that grow stage by stage (suggested 1, 3, 6, 10, 15), each stage introducing at most one or two new object kinds in this order: launch and paddle (stage 1), gift brick and capsule (stage 2), boost pad (stage 3), 2-HP brick (stage 4), A-Fin and paint bucket (stage 5). The exact brick walls come from the level editor (planner) or an AI-written edit file marked as such; this requirement is a report, not a blocking check.

> 中文：第 1～5 關是教學關，磚很少且一關比一關多（建議 1、3、6、10、15 塊），每關最多認識一兩種新物件；磚牆由編輯器決定，這一條只報告。

#### Scenario: Brick counts grow across tutorial stages

- **WHEN** the level table is loaded
- **THEN** the brick count of stages 1 to 5 is non-decreasing and stage 1 has at most 2 bricks (reported, not blocking)
