## MODIFIED Requirements

### Requirement: Art Stage Intro Camera

Every stage SHALL open with a 3.0 s intro in three parts: (1) from 0 to 0.8 s the view SHALL zoom to 2× on the topmost brick row (on boss stages on the boss, with a screen shake) while "STAGE N", the stage name and "台面：<layout name>" are shown; (2) from 0.8 to 2.3 s the view SHALL stay at 2× and pan straight down from the bricks to the paddle line; (3) from 2.3 to 3.0 s the view SHALL zoom back to 1× and return to the normal play view (camera y = 320, no tilt, no rotation). When the same stage is started again within the same run (continue or retry), the intro SHALL be a 1.2 s short version that only does part (3) from the paddle close-up. Physics SHALL NOT run during the intro, and a tap or key SHALL jump the intro to its last 0.25 s.

> 中文：每關開場約 3 秒：先拉近 2 倍特寫最上面的磚（首領關特寫首領），一路往下帶到滑板，最後拉遠回到平常的固定畫面；同一關重打時播 1.2 秒短版。點一下可以快轉。

#### Scenario: Intro starts on the top bricks

- **WHEN** stage 3 starts and the intro is 0.5 s in
- **THEN** the view zoom SHALL be 2× and the view centre SHALL be within 40 px of the topmost brick row

#### Scenario: Intro pans down

- **WHEN** the intro of stage 3 is at 0.9 s, 1.5 s and 2.2 s
- **THEN** the view centre SHALL move down every time and be within 60 px of the paddle line at 2.2 s

#### Scenario: Intro returns to the play view

- **WHEN** the intro of stage 3 ends
- **THEN** zoom SHALL be 1, camera y SHALL be 320, tilt and rotation SHALL be 0, and play SHALL begin

#### Scenario: Boss intro starts on the boss

- **WHEN** stage 10 starts and the intro is 0.5 s in
- **THEN** the view centre SHALL be within 40 px of the boss

#### Scenario: Short intro on retry

- **WHEN** stage 3 is started again in the same run
- **THEN** the intro SHALL last 1.2 s

#### Scenario: Skip the intro

- **WHEN** the player taps 0.5 s into a stage intro
- **THEN** play SHALL begin about 0.25 s later
