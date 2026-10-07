## ADDED Requirements

### Requirement: Object Introduction Close-up

The first time a stage contains an object kind the player has never been introduced to (gift brick ★, item capsule, rubber rail, boost pad, brick with 2+ HP, paint bucket, A-Fin, pop bumper, boss), the game SHALL run an introduction before the player launches: after the stage intro camera ends and while the ball is still in the lane, the game SHALL pause time, dim the table, zoom the view 2× onto the object, draw a dashed yellow frame around it and show a card with the object's name, one sentence of explanation and 「點一下繼續」. The introduction SHALL end only when the player taps anywhere or presses Space/Enter. Several new kinds in one stage SHALL be introduced one after another. The item capsule SHALL instead be introduced the first time one drops (pausing at that moment). Introduced kinds SHALL be stored in the save so each kind is introduced once; 「重看教學」 on the title screen SHALL clear both the introductions and the interactive tutorial.

> 中文：每種物件（道具磚、膠囊、彈力牆、加速帶、2 血磚、油漆桶、阿鰭、中柱、首領）第一次出現時，開場運鏡結束、發射前會暫停、暗下來、鏡頭拉近特寫、框起來、一句說明，點一下才繼續；膠囊是第一次掉下來時暫停特寫。每種只教一次，標題畫面「重看教學」可以清掉重教。

#### Scenario: Boost pad introduced before the first launch

- **WHEN** a player who has never seen a boost pad starts stage 3 and the intro camera ends
- **THEN** time is paused, the view zooms onto a boost pad, the card shows 「加速帶」 and the ball stays in the lane until the player taps

#### Scenario: Tap resumes play

- **WHEN** an introduction is showing and the player taps anywhere
- **THEN** the view returns to normal, time resumes and the plunger can be pulled

#### Scenario: Each kind is introduced once

- **WHEN** the player has already been introduced to boost pads and starts stage 7 (which also has boost pads)
- **THEN** no introduction is shown

#### Scenario: Two new kinds queue

- **WHEN** a stage contains two kinds the player has never seen
- **THEN** the second introduction starts right after the first one is dismissed

#### Scenario: Capsule introduced when it first drops

- **WHEN** the first-ever item capsule drops from a gift brick
- **THEN** time pauses at that moment, the capsule is framed and explained, and play resumes on tap

#### Scenario: Replay tutorial clears introductions

- **WHEN** the player presses 「重看教學」 on the title screen
- **THEN** every object kind and the interactive tutorial are marked as not seen

## MODIFIED Requirements

### Requirement: Interactive Tutorial

(Unchanged except) the closing line of the tutorial SHALL be 「打碎那塊灰磚就過關！」 when the stage has exactly one brick, otherwise 「打碎所有灰磚就過關！」.

> 中文：教學結束那句話照磚數：只有 1 塊磚就說「打碎那塊灰磚就過關！」。

#### Scenario: Closing line for a one-brick stage

- **WHEN** the interactive tutorial finishes on a stage with one brick
- **THEN** Pinky says 「很好！接下來靠你自己了。打碎那塊灰磚就過關！」
