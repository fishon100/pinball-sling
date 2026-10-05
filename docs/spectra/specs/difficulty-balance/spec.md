# difficulty-balance Specification

## Purpose

Difficulty balance measures the game with human-speed bots so district 1 stays friendly to novices while later districts get harder, and gives the planner an in-game tuning panel to adjust ball, brick and bumper physics live while playing. Tuned values are copied out and written back into the official numbers, while the automated test page always uses the official values.

## Requirements

### Requirement: Balance Human-Like Bot Profiles

The test suite SHALL provide human-like bot profiles SR.Tests.HUMAN with the values below. A paddle bot SHALL re-read the table only once every `react` seconds, SHALL aim at the predicted landing point of the earliest-landing ball (2 s look-ahead) plus Gaussian noise of `aim × (1 + ball speed / 2000)` px. A flipper bot SHALL plan one press per incoming ball at the estimated arrival time minus 0.04 s plus Gaussian noise of `timing` s, never earlier than `react` s from now, and SHALL hold the flipper 0.25 s. Every bot SHALL launch a resting lane ball with a random charge between 0.6 and 1.0.

> 中文：用「像人」的自動玩家量難度：新手、普通、熟練三種，反應時間和瞄準誤差不同，不用機器的完美手速。

#### Scenario: Novice reacts slower than skilled

- **WHEN** the novice and skilled profiles are compared
- **THEN** the novice SHALL have react 0.32 s and aim 22 px, and the skilled SHALL have react 0.2 s and aim 8 px

##### Example: Profiles

| Profile | react (s) | timing σ (s) | aim (px) |
|---|---|---|---|
| novice | 0.32 | 0.07 | 22 |
| casual | 0.26 | 0.05 | 14 |
| skilled | 0.20 | 0.03 | 8 |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Balance Difficulty Targets

With the novice human bot, paddle control and each district's default assists, stages 1–9 played with 5 seeds each (45 runs, 300 s limit, a run pre-built with one simulated upgrade per earlier stage) SHALL lose on average at most 1 heart per stage, and at least half of the runs SHALL lose no heart. Every boss stage (10, 20, 30, 40, 50), played by the machine bot in flipper control with 9 simulated upgrades, SHALL be cleared within 7 minutes in each of 3 seeds.

> 中文：第 1 區新手每關平均最多掉 1 顆愛心、一半以上的關卡一顆都不掉；5 個首領都要打得倒。

#### Scenario: District 1 novice target

- **WHEN** AC-S20 runs 45 novice runs on stages 1–9
- **THEN** average hearts lost per stage SHALL be ≤ 1 and perfect runs SHALL be ≥ 23 of 45

#### Scenario: Bosses are beatable

- **WHEN** AC-S8b plays each boss stage with 3 seeds
- **THEN** all 15 runs SHALL clear within 420 s


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Tuning Panel Live Sliders

On the game page, the pause menu SHALL show "🎚 手感調整（邊玩邊調）"; pressing it SHALL open the tuning panel expanded and resume play. The panel SHALL hold one slider per entry of SR.TUNE_PARAMS (table below); moving a slider SHALL write the value into the live tuning SR.T so the next physics step uses it. A modified value SHALL be highlighted and show its default as "原 <default>", and the header SHALL read "手感調整（改了 N 項）". Pointer input on the panel SHALL NOT move the paddle. "收起" SHALL collapse the panel to its header ("展開" restores it) and "關閉" SHALL hide it.

> 中文：暫停 → 手感調整，拉滑桿馬上生效，改過的項目會變色並顯示原本的數字。

#### Scenario: Slider changes physics immediately

- **WHEN** the player drags 重力 from 1400 to 2000
- **THEN** SR.T.ball.gravity SHALL be 2000 on the next frame and the row SHALL show "2000" with "原 1400"

##### Example: Tunable parameters

| Group | Parameter | Min | Max | Step |
|---|---|---|---|---|
| 球 | ball.gravity | 600 | 2600 | 20 |
| 球 | ball.max_speed | 1400 | 3600 | 50 |
| 球 | ball.restitution_wall | 0.1 | 0.95 | 0.01 |
| 球 | ball.friction | 0 | 0.2 | 0.005 |
| 球 | ball.rolling_friction | 0 | 0.02 | 0.001 |
| 球 | ball.damping | 0 | 0.5 | 0.01 |
| 磚塊 | brick.restitution | 0.3 | 1.2 | 0.01 |
| 磚塊 | brick.min_bounce | 0 | 600 | 10 |
| 彈跳柱 | bumper.kick_speed | 400 | 1800 | 10 |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Tuning Persistence And Reset

The panel SHALL store every modified value (and only modified values) in localStorage key "sr.tune.v1" on each slider change. On page load the game SHALL record the official values as defaults and then apply any stored numeric values over them. "恢復預設" SHALL restore all nine defaults, clear the stored values and show "已恢復預設".

> 中文：調過的數值會存在這台裝置，重新整理還在；按「恢復預設」全部回到原本的數字。

#### Scenario: Tuned value survives reload

- **WHEN** the player sets 撞磚反彈 to 0.95 and reloads the page
- **THEN** SR.T.brick.restitution SHALL be 0.95 and the panel SHALL show it as modified with "原 0.85"

#### Scenario: Reset clears tuning

- **WHEN** the player presses "恢復預設"
- **THEN** every slider SHALL return to its default and "sr.tune.v1" SHALL hold an empty object


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Tuning Practice Mode

The panel SHALL offer a checkbox "練習模式（掉球不扣愛心）", off on every page load. While it is on, a ball loss that is not covered by ball save or the ball-save item SHALL put a new ball in the lane, show "PRACTICE" and SHALL NOT reduce hearts or count a lost heart for the medal.

> 中文：打開練習模式後掉球不扣愛心，方便一直試手感。

#### Scenario: Drain in practice mode

- **WHEN** practice mode is on, ball save has run out and the ball drains with 2 hearts left
- **THEN** hearts SHALL stay 2, the stage's lost-heart count SHALL stay unchanged and a new ball SHALL wait in the lane


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Tuning Copy Changed Values

"複製數值" SHALL copy to the clipboard a text that starts with the line "套用調參" followed by one line per modified value in the form "<group>｜<name>（<id>）：<default> → <value>", or "（沒有改動）" when nothing changed, and SHALL show "已複製，貼給 AI 或寫進回饋.md". When clipboard access fails, the game SHALL show the same text in a prompt dialog for manual copying.

> 中文：按「複製數值」會把改過的項目整理成一段文字，貼給 AI 說「套用調參」就能寫回正式數值。

##### Example: Copied text

- **GIVEN** only gravity was changed from 1400 to 2000
- **WHEN** the player presses "複製數值"
- **THEN** the clipboard SHALL contain "套用調參\n球｜重力（球掉多快）（ball.gravity）：1400 → 2000"

#### Scenario: Nothing changed

- **WHEN** no value differs from its default and the player presses "複製數值"
- **THEN** the clipboard SHALL contain "套用調參\n（沒有改動）"


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Tuning Panel Excluded From Test Page

The automated test page test.html SHALL NOT load tune.js, so its tests SHALL always run with the official tuning values; without the panel the pause menu SHALL NOT show the "🎚 手感調整" button.

> 中文：自動測試頁不載入手感調整面板，測試永遠用正式數值。

#### Scenario: Test page uses official values

- **WHEN** the player has stored tuned values on the device and opens test.html
- **THEN** SR.TUNE SHALL be undefined and the tuning passed to the tests SHALL equal tuning.json merged with SR.STREET_TUNING, ignoring the stored values

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->