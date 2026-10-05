## MODIFIED Requirements

### Requirement: Balance Difficulty Targets

The test page SHALL report, as information that does not block deploys, the novice human bot's results with paddle control and each stage's own assists: for stages 1–9 with 5 seeds each (45 runs, 300 s limit, a run pre-built with one simulated upgrade per earlier stage) the average hearts lost per stage and the share of runs that lose no heart, compared with the design goal "at most 1 heart per stage and at least half perfect"; and for districts 2–5 the average hearts lost and seconds per stage, compared with the design goal "no district more than 0.15 easier than the previous one, district 5 between 0.8 and 1.4, at most 90 s per stage". Every boss stage (10, 20, 30, 40, 50), played by the machine bot in flipper control with 9 simulated upgrades, SHALL be cleared within 7 minutes in each of 3 seeds; this boss check SHALL block deploys.

> 中文：新手難度（第 1 區、第 2～5 區）只當報告顯示，跟設計目標比較，但不擋部署；5 個首領一定要打得倒，這項會擋。

#### Scenario: District 1 novice report

- **WHEN** AC-S20 runs 45 novice runs on stages 1–9
- **THEN** the test page shows the average hearts lost per stage and the number of perfect runs next to the goal, marked as a report

#### Scenario: Later districts report

- **WHEN** AC-S29 runs the novice bot on the normal stages of districts 2–5
- **THEN** the test page shows each district's hearts and seconds per stage next to the goals, marked as a report

#### Scenario: Bosses are beatable

- **WHEN** AC-S8b plays each boss stage with 3 seeds
- **THEN** all 15 runs SHALL clear within 420 s
