## MODIFIED Requirements

### Requirement: Story Playback Schedule

The game SHALL play comic segments before and after stages as follows: "intro" before stage 1; "d1_fish" before stage 5; "dN_start" before the first stage of districts 2–5 (stages 11, 21, 31, 41); "dN_boss" before each boss stage (10, 20, 30, 40, 50); "dN_clear" after boss stages 10, 20, 30, 40; "ending" after stage 50, followed by the credits. Before a stage, a segment SHALL play only if save.seenComic does not contain it, except boss segments, which SHALL play every time. A segment SHALL be recorded in save.seenComic only when the player watches it to the end; when the player presses "跳過劇情" the segments of that playback SHALL NOT be recorded. Retrying a stage from the results screen and continuing after game over SHALL NOT play any before-stage segment. The first stage that uses a layout with the fish 阿鰭 (stage 5) SHALL be preceded by the "d1_fish" segment.

> 中文：每段漫畫第一次一定播，看完才算「看過」；按跳過的話下次還會再播。首領前的漫畫每次都播；重玩這關和投幣續關不播。

#### Scenario: Seen segment is not replayed before a stage

- **WHEN** the player starts stage 11 a second time after having watched "d2_start" to the end
- **THEN** no comic SHALL play before the stage intro

#### Scenario: Skipped segment plays again

- **WHEN** the player presses "跳過劇情" during "intro" before stage 1 and later starts stage 1 again
- **THEN** save.seenComic SHALL NOT contain "intro" and "intro" SHALL play again

#### Scenario: Boss segment plays every time

- **WHEN** the player starts stage 10 after having seen "d1_boss"
- **THEN** "d1_boss" SHALL play again

#### Scenario: Fish appears only after its comic

- **WHEN** the stages are scanned from 1 upward
- **THEN** the first stage whose layout has the fish SHALL be stage 5, and storyBefore of some stage up to it SHALL include "d1_fish"
