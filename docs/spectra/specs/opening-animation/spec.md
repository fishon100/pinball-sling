# opening-animation Specification

## Purpose

The opening animation is a roughly 7-second sequence shown on the first launch that takes the player from a grey city to an old pinball machine to an explosion of spray paint, introducing the SPRAY RUN sign and the mascot Pinky. It starts with an "insert coin" tap so the browser unlocks audio, which also echoes the story's first coin.

## Requirements

### Requirement: Opening First-Launch Autoplay

The game SHALL show the opening sequence on launch when the save does not record `seenOpening`, SHALL record `seenOpening = true` when the sequence finishes or is skipped, and SHALL go straight to the title screen on later launches.

> 中文：第一次打開遊戲會自動播開場，看完或跳過後記在存檔裡，之後打開直接到標題。

#### Scenario: First launch shows the coin screen

- **WHEN** the game boots with a save that has no `seenOpening` flag
- **THEN** the screen SHALL be the opening coin screen showing "INSERT COIN" and "點一下 投下硬幣"

#### Scenario: Later launch skips the opening

- **WHEN** the game boots with `seenOpening = true` in the save
- **THEN** the title screen SHALL appear directly

#### Scenario: Finishing marks the opening as seen

- **WHEN** the opening reaches 7 seconds of playback or is skipped
- **THEN** the save SHALL be persisted with `seenOpening = true` and the title screen SHALL appear


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Opening Insert Coin Start

The game SHALL hold the opening on the coin screen until the player taps the canvas or presses any key, and SHALL treat that first input as inserting a coin: it SHALL unlock audio, play the coin sound, vibrate 30 ms and start the timed playback from 0 seconds.

> 中文：開場先停在投幣畫面，點一下（或按任意鍵）＝投幣，同時讓瀏覽器可以出聲，然後動畫才開始計時。

#### Scenario: Coin screen waits for input

- **WHEN** the coin screen has been shown for any length of time without input
- **THEN** the playback timeline SHALL NOT start and the game SHALL stay on the coin screen

#### Scenario: Tap inserts the coin

- **WHEN** the player taps the canvas or presses any key on the coin screen
- **THEN** the phase SHALL change to playback at time 0, the launch sound SHALL play and the device SHALL vibrate 30 ms


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Opening Timed Beats

The game SHALL play the opening beats on a fixed timeline measured from the coin tap: narration "很久很久以前，有一座灰城……" until 2.6 s, the old machine lighting up with a ding at 1.2 s, 28 paint splats in 6 colors bursting at 18 per second from 2.6 s, the SPRAY / RUN sign slamming down at 4.3 s, Pinky jumping out at 5.2 s with "把灰城砸回彩色！" from 5.9 s, and automatic exit to the title at 7 s.

> 中文：投幣後照固定時間表播：旁白到 2.6 秒、1.2 秒機台亮、2.6 秒起噴漆炸開 28 團、4.3 秒招牌砸下、5.2 秒噴噴跳出來、7 秒自動進標題。

#### Scenario: Sound and vibration cues follow the timeline

- **WHEN** playback runs uninterrupted from the coin tap
- **THEN** the ding SHALL play once after 1.2 s, the clear sound and a 40/30/80 ms vibration SHALL play once after 4.3 s, and the combo sound SHALL play once after 5.2 s

##### Example: Paint splat count over time

| Time since coin tap | Splats shown |
|---|---|
| 2.0 s | 0 |
| 3.0 s | 7 |
| 4.0 s | 25 |
| 4.2 s and later | 28 |

#### Scenario: Splats are accompanied by brick sounds

- **WHEN** splat number 1, 5, 9, 13, 17, 21 or 25 appears
- **THEN** a brick-break sound SHALL play and the device SHALL vibrate 12 ms

#### Scenario: Automatic exit at 7 seconds

- **WHEN** playback time reaches 7 seconds
- **THEN** the opening SHALL end and the title screen SHALL appear


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Opening Skip

The game SHALL let the player skip the opening by tapping or pressing any key once playback has run longer than 0.8 seconds, and SHALL ignore taps during the first 0.8 seconds of playback.

> 中文：播放 0.8 秒後點一下就能跳過；剛投幣的 0.8 秒內點了不算，避免投幣那一下連帶跳過。

#### Scenario: Early tap is ignored

- **WHEN** the player taps 0.5 seconds after inserting the coin
- **THEN** the opening SHALL keep playing

#### Scenario: Later tap skips

- **WHEN** the player taps 1.5 seconds after inserting the coin
- **THEN** the opening SHALL end immediately, `seenOpening` SHALL be saved and the title screen SHALL appear


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Opening Replay From Title

The game SHALL offer a "重看開場" button on the title screen that restarts the opening from the coin screen, regardless of `seenOpening`.

> 中文：標題畫面有「重看開場」，按了會從投幣畫面重新播一次。

#### Scenario: Replay button restarts the opening

- **WHEN** the player presses "重看開場" on the title screen
- **THEN** the opening coin screen SHALL appear and the title attract demo SHALL stop

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->