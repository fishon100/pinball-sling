## ADDED Requirements

### Requirement: Boost Dash Effect

When a boost event happens the game SHALL play a 0.5 s dash effect: a 0.04 s hit-stop, the view nudged 6 px along the ball's direction and eased back, the ball's trail doubled in length and tinted lime for the effect's duration, speed lines beside the ball, the pad flashing white with 12 lime sparks rising from its arrows, and a "BOOST!" popup above the pad. Idle pads SHALL animate their arrows twice as fast as before with a brighter breathing glow.

> 中文：踩到加速帶：停格 0.04 秒、畫面往前推一下、球的拖尾變綠變 2 倍長、速度線、加速帶白閃噴光點、跳「BOOST!」；平常的箭頭流動更快更亮。

#### Scenario: Dash effect on boost

- **WHEN** a boost event is handled
- **THEN** the hit-stop is 0.04 s, a "BOOST!" popup is created and the ball's dash timer is 0.5 s

#### Scenario: Effect ends

- **WHEN** 0.5 s has passed since the boost
- **THEN** the trail length and colour are back to the stage's values

### Requirement: Brick Break Flash

When a brick breaks the game SHALL flash the brick's area white for 60 ms and spawn 1.5× the previous number of fragments; when 3 or more bricks break within 1 s the screen shake SHALL be at least 6 px.

> 中文：磚碎掉白閃 60 毫秒、碎片 1.5 倍；1 秒內碎 3 塊以上畫面震動加大到 6 px。

#### Scenario: Chain shake

- **WHEN** the third brick breaks within one second
- **THEN** the shake amount is at least 6
