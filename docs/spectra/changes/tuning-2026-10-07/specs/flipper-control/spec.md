## MODIFIED Requirements

### Requirement: Flipper Shot Power

The game SHALL model each flipper as a 72 px tapered capsule (base radius 11, tip radius 5) pivoting at (100, 960) for the left and (270, 960) for the right, SHALL transfer the flipper's surface velocity to the ball scaled by power 0.8 times the "強力擋板" bonus (1 + 0.12 per level), SHALL use restitution 0.3 against the flipper, and SHALL therefore hit faster the closer the contact is to the tip.

> 中文：擋板長 72，打在越靠尖端的地方球飛越快；尖端擊球約每秒 1884 px（2026-10-07 套用調參後：擋板沒變，球的阻力與摩擦變了）。

#### Scenario: Tip shot speed with the 2026-10-07 ball tuning

- **WHEN** a ball rests on the left flipper at 0.85 of its length and the flipper is pressed, simulated for 12 frames
- **THEN** the best ball speed SHALL be 1884 px/s (within 2 px/s)

#### Scenario: Tip is faster than base

- **WHEN** the same shot is taken at 0.9 of the length and at 0.25 of the length
- **THEN** the tip shot speed SHALL be more than 1.2 times the base shot speed

#### Scenario: Flipper contact resets the combo

- **WHEN** the combo counter is above 0 and the ball touches a flipper
- **THEN** the combo counter SHALL become 0
