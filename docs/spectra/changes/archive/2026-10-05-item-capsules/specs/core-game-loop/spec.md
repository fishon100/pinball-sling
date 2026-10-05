## MODIFIED Requirements

### Requirement: Core Loop Stage Flow

The game SHALL run each stage in the order map selection, comic (when due), stage intro, play, clear cinematic, result screen, and SHALL then let the player choose to replay the stage, go to the next stage, or return to the map. After a boss stage (every 10th stage) the game SHALL show the district-cleared screen instead of a next stage, and after stage 50 it SHALL show the ending credits.

> 中文：玩家從地圖選關 → 看漫畫 → 關卡開場 → 開打 → 過關演出 → 結算畫面，結算後可以選「重玩／下一關／回地圖」；首領關打完會到「街區解放」畫面，第 50 關打完看結局。

#### Scenario: Any open stage can be selected from the map

- **WHEN** the player taps a stage node whose number is less than or equal to the highest unlocked stage
- **THEN** the game SHALL start a run in that stage's district at that stage, with 3 hearts
- **AND** when the chosen stage is not the first of its district, the run SHALL start with one simulated upgrade per skipped stage

#### Scenario: Comic plays before a stage only when due

- **WHEN** a stage starts normally (not a replay and not a continue)
- **THEN** the game SHALL play the stage's pre-stage comics that have not been seen yet, and SHALL always play the boss pre-stage comic
- **AND** when the stage starts from "replay this stage" or from a continue, no comic SHALL play

#### Scenario: Stage intro can be skipped

- **WHEN** the 2.3-second stage intro is playing and the player taps the screen or presses any key
- **THEN** the intro SHALL jump to its last 0.25 seconds and play SHALL begin right after

#### Scenario: Clearing a normal stage grants an upgrade and offers choices

- **WHEN** the player clears a non-boss stage
- **THEN** after the 2.6-second clear cinematic the game SHALL grant one random upgrade can and show the result screen with "next stage", "replay this stage" and "back to map"

#### Scenario: Clearing a boss stage ends the district

- **WHEN** the player clears stage 10, 20, 30 or 40 and presses "continue" on the result screen
- **THEN** the game SHALL play the post-stage comic, then show the district-cleared screen and offer "back to city map", without granting any item
- **AND** no upgrade can SHALL be granted for the boss stage

##### Example: Next action after the result screen

| Cleared stage | Result button | Next screen |
|---|---|---|
| 3 | 下一關 ▶（第 4 關） | stage 4 |
| 10 | 繼續 | district-cleared screen |
| 50 | 看結局 | ending credits |
