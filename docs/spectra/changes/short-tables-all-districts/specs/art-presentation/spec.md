## MODIFIED Requirements

### Requirement: Art Controls Always Visible When Acting

The table view SHALL show a 400×740 window of the 1060-px-tall table. Because every stage uses the short table (table top 320), the camera SHALL stay at the bottom position (camera y = 320) throughout play in every stage, so the whole table, the paddle line (y = 948) and both flippers including their tips are always on screen and the view SHALL NOT scroll up or down while the player is controlling the ball. Stage intro and stage clear cinematics are allowed to tilt and zoom the view, and SHALL return it to camera y = 320 before play continues.

> 中文：所有關卡玩的時候鏡頭都固定不動，整個台面、滑板／擋板一直都看得到；只有開場和過關演出會短暫運鏡，結束後回到原位。

#### Scenario: Flippers visible whenever action is needed

- **WHEN** 24 random balls with random camera starts are played by the bot for up to 20 s each in flipper control
- **THEN** in every frame where a ball is in the lane or falling within 300 px above the flippers, both flippers SHALL be fully inside the view

#### Scenario: No stage scrolls during play

- **WHEN** stages 5, 15, 25, 35 and 45 are played by the bot for 20 s each after the intro
- **THEN** the camera y SHALL stay at 320 in every frame
