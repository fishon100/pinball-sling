## MODIFIED Requirements

### Requirement: Boost Pads

A layout's 「加速帶左上角」 column SHALL add one 56 × 14 boost pad (加速帶, arrow pointing up) per listed point; boss stages SHALL have none. When a ball's center enters a pad while the ball is moving upward (vertical speed below 0), the game SHALL multiply the ball's speed by 1.35 keeping its direction, raise it to at least 1000 px/s, cap it at 1900 px/s (the ball's maximum speed), emit a "boost" event (sound and flash), and SHALL NOT boost the same ball again within 0.5 s. A ball moving downward across a pad SHALL NOT be boosted. Pads SHALL stay at least 46 px away from every brick and bumper. The first layout table keeps the v3.7.1 pads (1 per district 3 layout, 2 per district 4–5 layout).

> 中文：台面配置表填的位置會出現加速帶（首領關沒有）：球往上經過加速 1.35 倍（最少 1000、最多 1900＝球的最高速）、往下不加速、0.5 秒內不重複。

#### Scenario: Upward ball is boosted

- **WHEN** a ball moving straight up at 800 px/s enters a boost pad
- **THEN** its speed becomes 1080 px/s in the same direction and a boost event is emitted

##### Example: Boost results

| Speed entering (upward) | Speed after |
|---|---|
| 500 px/s | 1000 px/s (raised to minimum) |
| 800 px/s | 1080 px/s |
| 1700 px/s | 1900 px/s (capped) |

#### Scenario: Falling ball is not boosted

- **WHEN** a ball moving down at 800 px/s crosses a boost pad
- **THEN** its speed is unchanged by the pad and no boost event is emitted

#### Scenario: Cooldown prevents double boosts

- **WHEN** a boosted ball touches the same or another pad again within 0.5 s
- **THEN** it is not boosted a second time

#### Scenario: No pads on boss stages

- **WHEN** a boss stage uses a layout that lists boost pads
- **THEN** the stage has no boost pads
