# newbie-assist Specification

## Purpose

Newbie assist lets a first-time player clear the first district while losing at most about one heart per stage, and then withdraws help district by district so difficulty rises. It covers the per-district assist schedule, trajectory preview, landing ring and flipper timing hint, extended ball save, finisher assist and the first-play interactive tutorial.

## Requirements

### Requirement: Per-District Assist Schedule

The game SHALL take the active assists of a stage from the district that contains the stage (stages 1-10 district 1, 11-20 district 2, 21-30 district 3, 31-40 district 4, 41-50 district 5), and SHALL apply exactly the values in the table below. The map card of every unlocked district SHALL list that district's preview seconds, landing hint (paddle) or flipper timing hint (flipper), and extra ball-save seconds, and SHALL show "沒有輔助：全靠你的手感" when none of those three is active.

> 中文：輔助跟著街區走，只有第 1、2 區有彈道預覽線和落點圈；第 3 區起全部關掉，地圖卡片上會寫出這一區有哪些輔助。

#### Scenario: Assists come from the stage's district

- **WHEN** a stage starts
- **THEN** the trajectory preview, landing/timing hint, extra ball save and finisher assist SHALL match the row of the stage's district

##### Example: Assist values per district

| District | Stages | Preview (s) | Landing / timing hint | Extra ball save (s) | Finisher |
|---|---|---|---|---|---|
| 1 巷口 | 1-10 | 1.0 | on | 3 | on |
| 2 地鐵站 | 11-20 | 0.7 | on | 1.5 | on |
| 3 屋頂 | 21-30 | 0 | off | 0 | off |
| 4 河堤 | 31-40 | 0 | off | 0 | off |
| 5 市中心大牆 | 41-50 | 0 | off | 0 | off |

#### Scenario: Map card shows no-assist line

- **WHEN** the player opens the map and district 3 is unlocked
- **THEN** the district 3 card SHALL show "沒有輔助：全靠你的手感"

#### Scenario: Assist announcement on the first stage of a district

- **WHEN** the first stage of a district that has any listed assist starts and the tutorial is not running
- **THEN** Pinky SHALL say the district's assist list prefixed with "這一區的輔助：" for 4 seconds

---
### Requirement: Trajectory Preview

While playing, the game SHALL draw a white dotted predicted path for every ball on the table, simulated forward for the district's preview seconds; the prediction SHALL treat bricks as bounce-only (no damage) and flippers as frozen at their current pressed/rest angle. While the player is pulling the plunger with a ball resting in the launch lane, the game SHALL preview that ball launched at the current charge for max(preview seconds, 0.8) seconds. When the district's preview value is 0 the game SHALL NOT draw any preview.

> 中文：第 1～3 區會畫出白色虛點告訴你球接下來會怎麼走，第 4 區起就沒有了。

#### Scenario: Preview matches real motion

- **WHEN** a ball is predicted for 0.5 s and then simulated for real on stage 1
- **THEN** every predicted point SHALL be within 6 px of the real position

#### Scenario: Preview while charging the plunger

- **WHEN** the player holds the plunger in district 3 (preview 0.4 s)
- **THEN** the preview SHALL show the launch path for 0.8 s at the current charge

#### Scenario: No preview in late districts

- **WHEN** the player plays any stage from 31 to 50
- **THEN** no preview dots SHALL be drawn


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Landing Ring And Flipper Timing Hint

In paddle control, when the district's timing hint is on or the tutorial is running, the game SHALL compute (every 3 frames) the landing point on the paddle line of the earliest-landing ball that is out of the launch lane and has vertical speed greater than -400 px/s, looking ahead 1.6 s, and SHALL draw a ring with a down arrow at that x on the paddle line; the ring SHALL turn green when the landing x is within (paddle half-width - 6 px) of the paddle center and white otherwise. In flipper control, when the timing hint is on, the game SHALL highlight a flipper while any ball moving down (vy > -50) is inside that flipper's reach zone (y between FLIP_Y-75 and FLIP_Y+20; left x 95-185, right x 185-275). When the timing hint is off and no tutorial runs, neither hint SHALL be drawn.

> 中文：第 1、2 區會在滑板線上畫一個圈告訴你球會掉在哪，滑板對準了圈會變綠；經典擋板則是球到可以打的範圍時擋板會亮。

#### Scenario: Ring turns green under the paddle

- **WHEN** in stage 3 (paddle control) the predicted landing x is 10 px from the paddle center with medium paddle (half-width 56)
- **THEN** the landing ring SHALL be drawn green

#### Scenario: No ring in district 3

- **WHEN** the player plays stage 25 in paddle control
- **THEN** no landing ring SHALL be drawn


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Extended Ball Save

On every launch the game SHALL set the ball-save time to base 3 s + 3 s per "safety" upgrade level + the district's extra ball-save seconds, SHALL count it down only while a ball is out of the launch lane, SHALL show "球保險 N.Ns" at the bottom while counting, and SHALL return a drained ball to the lane without losing a heart while the time is above 0.

> 中文：剛發射的幾秒內掉球不扣愛心，第 1 區有 6 秒、第 2 區 4.5 秒、之後 3 秒。

#### Scenario: Ball save saves a drain

- **WHEN** the ball drains 2 s after launch in stage 1 with no safety upgrade
- **THEN** a new ball SHALL be placed in the lane, "BALL SAVED" SHALL pop up and no heart SHALL be lost

##### Example: Ball-save length without upgrades

| District | Base | Extra | Total |
|---|---|---|---|
| 1 | 3 | 3 | 6 s |
| 2 | 3 | 1.5 | 4.5 s |
| 3-5 | 3 | 0 | 3 s |


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Finisher Assist

When the finisher assist is on, the stage is not a boss stage, at most 3 normal (non-boss) bricks are alive and at least 3 s (assist.finisher_delay) have passed since the last brick broke, the game SHALL pick the live brick horizontally nearest to the first upward-moving ball as the target, SHALL pull every upward-moving ball above y = 860 horizontally toward it with strength 1200 px/s² (scaled down linearly within 60 px of the target x), SHALL draw a pulsing frame around every remaining brick and a dashed ring on the target, and SHALL have Pinky say "剩下的磚我幫你標出來了，球會往那邊偏！" once per stage. The assist SHALL switch off as soon as a brick breaks or the conditions stop holding.

> 中文：第 1、2 區只剩 3 塊以內、3 秒沒打碎磚時，球往上飛會被輕輕往剩下的磚吸過去，剩下的磚會發光。

#### Scenario: Finisher keeps the tail short

- **WHEN** a novice human-like bot plays stages 1-9 in paddle control, 5 seeds each, with the finisher on and then off
- **THEN** the average time spent with 3 or fewer bricks left SHALL be at most 10 s with the finisher on, and SHALL NOT exceed the finisher-off average by more than 0.5 s

#### Scenario: Finisher waits for the delay

- **WHEN** 2 bricks are left and the last brick broke 2 s ago in stage 4
- **THEN** no target SHALL be set and no ball SHALL be pulled


<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->

---
### Requirement: Interactive Tutorial

The game SHALL run the interactive tutorial on stage 1 whenever the save's tutorialDone flag is false, and the map's "重看教學" button SHALL set tutorialDone to false and start district 1 from stage 1. The tutorial SHALL dim the screen except a highlighted area, show a pointing hand and a two-line hint box, and step as follows: press (hold the plunger) → release (let go; back to press if the ball is still in the lane) → watch (at least 1.2 s, until a ball falls near the bottom) → move (paddle) or flip (flipper) in slow motion (time ×0.35 for paddle, ×0.12 for flipper) until the player hits the ball → back to watch, three times → done. The tutorial SHALL set tutorialDone to true 3.2 s after the done step starts or when stage 1 is cleared, whichever comes first.

> 中文：第一次玩第 1 關會有手把手教學（按住往下拉 → 放開 → 看球 → 慢動作接球 3 次），地圖上的「重看教學」可以再來一次。

#### Scenario: Tutorial runs on the first play

- **WHEN** a new save starts stage 1
- **THEN** the hint box SHALL show "按住畫面，往下拉" (paddle) or "按住右下角，往下拉" (flipper) and the stage intro SHALL NOT show the district assist announcement

#### Scenario: Move step in paddle control

- **WHEN** the tutorial reaches the move step in paddle control
- **THEN** time SHALL run at 0.35×, the landing ring SHALL be drawn and the hint SHALL read "把滑板移到圈圈下面"

##### Example: Tutorial step transitions

- **GIVEN** the tutorial is at step move with 2 completed hits
- **WHEN** the paddle hits the ball
- **THEN** the step SHALL become done and Pinky SHALL say "很好！接下來靠你自己了。打碎所有灰磚就過關！"

#### Scenario: Replay tutorial from the map

- **WHEN** the player presses "重看教學" on the map after finishing the tutorial
- **THEN** stage 1 SHALL start with the tutorial at the press step

<!-- @trace
source: baseline-specs
updated: 2026-10-05
code:
  - CLAUDE.md
-->
