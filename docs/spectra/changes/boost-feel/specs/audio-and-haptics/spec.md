## MODIFIED Requirements

### Requirement: Haptics Event Vibration Patterns

(Unchanged except) the boost event SHALL vibrate 30 ms (was 10 ms).

> 中文：踩到加速帶震 30 毫秒。

#### Scenario: Boost vibration

- **WHEN** a boost event is handled with vibration on
- **THEN** the device vibrates 30 ms

### Requirement: Audio Sound Effects

(Unchanged except) the "boost" sound SHALL be a 0.3 s sawtooth sweep from 300 Hz to 1800 Hz followed by a short noise burst.

> 中文：加速帶音效改成 0.3 秒、音高 300→1800 往上掃再一聲短砰。

#### Scenario: Boost sound length

- **WHEN** the boost sound is played
- **THEN** its sweep lasts 0.3 s and ends at 1800 Hz
