## MODIFIED Requirements

### Requirement: UI Map And Stage Select

The map SHALL show the cleared count "已解放 N/50" (N = unlocked - 1), gold/silver/bronze medal counts, and 5 district cards with 10 stage nodes each. A stage node SHALL be selectable when its number is ≤ save.unlocked: cleared nodes SHALL show their medal's first character (金／銀／銅), the next stage SHALL show "▶", uncleared boss stages SHALL show "王", and stages above save.unlocked SHALL be disabled. A district SHALL be unlocked when save.unlocked ≥ its first stage; a locked card SHALL show "？？？", "LOCKED" and "🔒 尚未解鎖". An unlocked card's main button SHALL read "出發", "繼續：第 N 關" or "從頭再打一次". "從頭再打一次" (save.unlocked above the district's last stage) SHALL start the district's first stage; otherwise the button SHALL start stage max(first stage of the district, save.unlocked). Selecting stage n SHALL start a new run with 3 hearts in n's district; when n is not the district's first stage the run SHALL be pre-built with one simulated upgrade per skipped stage. The map SHALL also offer "📖 劇情回放", "成就", "操作：…", "重看教學" and "回標題".

> 中文：地圖有 5 區、每區 10 格，打過或下一關的格子都能直接點來玩；全破的街區按「從頭再打一次」會從第 1 關開始。

#### Scenario: Pick an already cleared stage

- **WHEN** save.unlocked is 7 and the player taps node 3
- **THEN** stage 3 SHALL start with 3 hearts and a run built from 2 simulated upgrade picks

#### Scenario: Locked stage cannot be picked

- **WHEN** save.unlocked is 7
- **THEN** node 8 SHALL be disabled and the district 2 card SHALL show "🔒 尚未解鎖"

#### Scenario: Replay a finished district from its first stage

- **WHEN** save.unlocked is 11 and the player taps "從頭再打一次" on the district 1 card
- **THEN** stage 1 SHALL start

##### Example: District card main button

| save.unlocked | District 1 button | Starts stage |
|---|---|---|
| 1 | 出發 | 1 |
| 6 | 繼續：第 6 關 | 6 |
| 11 | 從頭再打一次 | 1 |
| 51 | 從頭再打一次 | 1 |
