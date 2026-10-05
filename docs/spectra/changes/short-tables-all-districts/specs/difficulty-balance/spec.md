## MODIFIED Requirements

### Requirement: Balance Difficulty Targets

With the novice human bot, paddle control and each district's default assists, stages 1–9 played with 5 seeds each (45 runs, 300 s limit, a run pre-built with one simulated upgrade per earlier stage) SHALL lose on average at most 1 heart per stage, and at least half of the runs SHALL lose no heart. For districts 2–5, the normal stages of each district played by the novice human bot with 2 seeds each (18 runs per district, same setup) SHALL lose on average a number of hearts per stage that does not drop by more than 0.15 from one district to the next, district 5 SHALL lose between 0.8 and 1.4 hearts per stage, and every district SHALL average at most 90 s per stage. Every boss stage (10, 20, 30, 40, 50), played by the machine bot in flipper control with 9 simulated upgrades, SHALL be cleared within 7 minutes in each of 3 seeds.

> 中文：第 1 區新手每關平均最多掉 1 顆愛心、一半以上的關卡一顆都不掉；第 2～5 區越後面越難（每區掉的愛心不會比前一區少超過 0.15），第 5 區每關掉 0.8～1.4 顆，每區平均一關不超過 90 秒；5 個首領都要打得倒。

#### Scenario: District 1 novice target

- **WHEN** AC-S20 runs 45 novice runs on stages 1–9
- **THEN** average hearts lost per stage SHALL be ≤ 1 and perfect runs SHALL be ≥ 23 of 45

#### Scenario: Later districts keep getting harder

- **WHEN** the novice bot plays the 9 normal stages of districts 2, 3, 4 and 5 with 2 seeds each
- **THEN** each district's average hearts lost per stage SHALL be no more than 0.15 below the previous district's, district 5 SHALL be between 0.8 and 1.4, and each district's average stage time SHALL be at most 90 s

#### Scenario: Bosses are beatable

- **WHEN** AC-S8b plays each boss stage with 3 seeds
- **THEN** all 15 runs SHALL clear within 420 s
