## MODIFIED Requirements

### Requirement: Art Stage Intro Camera

Every stage SHALL open with a 2.3 s intro in two parts while "STAGE N", the stage name and "台面：<layout name>" are shown in the upper wall area: (1) from 0 to 1.2 s the view SHALL be tilted 38° (3D) and SHALL zoom to 2× on the left end of the topmost brick row, then pan to its right end; on boss stages part (1) SHALL instead zoom to 2× on the boss with a screen shake; (2) from 1.2 to 2.3 s the view SHALL zoom back to 1× while untilting to flat, scaling from 0.88 to 1 and rotating from -3° to 0°, ending in the normal play view (camera y = 320, no tilt, no rotation). When the same stage is started again within the same run (continue or retry), the intro SHALL be a 1.2 s short version that only does part (2). Physics SHALL NOT run during the intro, and a tap or key SHALL jump the intro to its last 0.25 s.

> 中文：每關開場 2.3 秒：台面傾斜的 3D 畫面上，先拉近 2 倍特寫磚牆最上排的左端、橫移到右端（首領關改成特寫首領＋震動），再拉遠、台面從傾斜轉平回到平常畫面；同一關重打時播 1.2 秒短版。點一下可以快轉。

#### Scenario: Intro sweeps the top bricks from left to right

- **WHEN** stage 3 starts
- **THEN** at 0.4 s the view zoom SHALL be 2×, the view SHALL be tilted, and the view centre SHALL be within 40 px of the left end of the topmost brick row; at 1.1 s the view centre SHALL be within 40 px of its right end

#### Scenario: Intro zooms out and flattens

- **WHEN** the intro of stage 3 is at 1.75 s
- **THEN** the zoom SHALL be between 1× and 2× and the tilt between 0° and 38°, and when the intro ends zoom SHALL be 1, camera y 320, tilt and rotation 0, and play SHALL begin

#### Scenario: Boss intro starts on the boss

- **WHEN** stage 10 starts and the intro is 0.5 s in
- **THEN** the view centre SHALL be within 40 px of the boss and the screen SHALL shake

#### Scenario: Short intro on retry

- **WHEN** stage 3 is started again in the same run
- **THEN** the intro SHALL last 1.2 s

#### Scenario: Skip the intro

- **WHEN** the player taps 0.5 s into a stage intro
- **THEN** play SHALL begin about 0.25 s later
