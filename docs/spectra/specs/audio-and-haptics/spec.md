# audio-and-haptics Specification

## Purpose

Audio and haptics give every hit, launch and loss an audible and (on phones) tactile response, with synthesized music that intensifies with play. The player can switch sound effects, music and vibration on and off.

## Requirements

### Requirement: Audio Sound And Music Toggles

The game SHALL start with sound effects and music on for a new save. The title screen SHALL offer a music toggle and the pause menu SHALL offer both a sound-effect toggle and a music toggle; each toggle SHALL take effect immediately (sound effects muted means no effect plays; music muted means the beat keeps running silently). Each toggle SHALL be stored in the save file (save.sfx, save.music) and SHALL be restored when the page is reloaded.

> 中文：音效和音樂可以在暫停選單（音樂也能在標題）開關，馬上生效，而且會記在存檔裡，重新整理後維持你選的設定。

#### Scenario: Mute sound effects from pause

- **WHEN** the player sets "音效：關" in the pause menu and resumes
- **THEN** brick hits, launches and drains SHALL make no sound while music continues

#### Scenario: Toggles survive a reload

- **WHEN** the player turns music off and reloads the page
- **THEN** the title screen SHALL show "音樂：關" and music SHALL stay muted


<!-- @trace
source: fix-baseline-bugs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Haptics Vibration Toggle

The pause menu SHALL offer "震動：開／關". The setting SHALL be stored in save.vibrate and persist across reloads; a new save SHALL have vibration on. When it is turned on the device SHALL give a confirmation pattern 30-40-60 ms. While it is off the game SHALL NOT request any vibration.

> 中文：震動可以在暫停選單關掉，會記在存檔裡；打開的時候會震一下讓你知道。

#### Scenario: Vibration off persists

- **WHEN** the player sets "震動：關" and reloads the page
- **THEN** the pause menu SHALL show "震動：關" and no event SHALL vibrate


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Haptics Event Vibration Patterns

When vibration is on, the game SHALL request exactly these vibrations for these events.

> 中文：各種事件的震動長度照下表，碎磚連擊越高震越久，最多 38ms。

#### Scenario: Brick break vibration grows with combo

- **WHEN** a normal brick breaks at combo 12
- **THEN** the device SHALL vibrate 30 ms

##### Example: Event vibration table

| Event | Vibration (ms) |
|---|---|
| Plunger pull, each additional 20% of charge | 6 |
| Launch | 20 |
| Paddle hit, center / edge (offset > 0.6) | 16 / 24 |
| Flipper hit | 12 |
| Brick hit without break (non-boss) | 8 |
| Normal brick break | 18 + min(20, combo) (max 38) |
| Paint bucket break | 40-30-60 |
| Bumper or fish 阿鰭 | 14 |
| Sling | 10 |
| Boss hit | 28 |
| Combo milestone 10/20/30/50/100 | 30-40-30-40-60 |
| Heart lost (drain without ball save) | 90-50-160 |
| Stage clear | 60-50-140 |
| Opening: coin inserted / splat burst / sign slam | 30 / 12 / 40-30-80 |
| Vibration switched on | 30-40-60 |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Audio Sound Effects

The game SHALL synthesize 19 sound effects in real time (no audio files): spray, brickHit, brickBreak, bucket, bumper, sling, flipper, wall, launch, drain, save, combo, bossHit, bossRegen, clear, achievement, card, ui, lose. brickBreak pitch SHALL rise with combo (pitch = min(8, combo / 4)); brick-hit sounds SHALL be throttled to at most one per 0.03 s; wall volume SHALL scale with impact speed; the combo sound SHALL play from combo 5 upward with pitch rising up to combo 60. Audio SHALL start on the first user gesture (tap, click or key).

> 中文：19 種音效全部用程式即時合成，連擊越高碎磚聲音越高。

#### Scenario: Higher combo, higher break sound

- **WHEN** bricks break at combo 4 and then at combo 20
- **THEN** the second brickBreak SHALL play at a higher pitch than the first


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Audio Adaptive Music

The game SHALL play a synthesized 16-step boom-bap loop whose tempo and root note come from the district (88/45, 92/43, 96/41, 84/38, 100/45 for districts 1–5). Music intensity SHALL be 0 (drums and bass), 1 (adds piano chords) or 2 (adds high arpeggio and a spray fill); during play it SHALL be 2 when combo ≥ 10 or the boss is enraged, otherwise 1 when combo ≥ 4 or the stage is a boss stage, otherwise 0. Stage clear SHALL set intensity 2 and game over SHALL set 0. A change of intensity SHALL take effect at the next bar start.

> 中文：背景音樂每區速度不同，連擊越多、首領關或首領生氣時會加樂器，換小節時才切換。

#### Scenario: Combo raises intensity

- **WHEN** combo reaches 10 in a normal stage
- **THEN** the high arpeggio layer SHALL start at the next bar

##### Example: Intensity rules

| Situation | Intensity |
|---|---|
| Normal stage, combo 0–3 | 0 |
| Normal stage, combo 4–9 | 1 |
| Boss stage, not enraged, combo < 10 | 1 |
| Combo ≥ 10, or boss enraged | 2 |

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->