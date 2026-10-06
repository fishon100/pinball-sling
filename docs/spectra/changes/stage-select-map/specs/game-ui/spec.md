## MODIFIED Requirements

### Requirement: UI Map And Stage Select

The map SHALL show the cleared count "已解放 N/50" (N = unlocked - 1), gold/silver/bronze medal counts, and 5 district cards with 10 stage buttons each. Each stage button SHALL show its stage number and SHALL be at least 44 CSS px wide and tall on a 375 px wide screen; the 10 buttons SHALL be laid out as a route in two rows (stages 1–5 left to right, stages 6–10 right to left) joined by a path line. A stage button SHALL be selectable when its number is ≤ save.unlocked: cleared buttons SHALL also show their medal's first character (金／銀／銅), the next stage SHALL show "▶", uncleared boss stages SHALL show "王", and stages above save.unlocked SHALL be disabled and show a lock. Each unlocked district card SHALL show, below the route, the stage its secondary button starts as "▶ 第 N 關・<名稱>". A district SHALL be unlocked when save.unlocked ≥ its first stage; a locked card SHALL show "？？？", "LOCKED" and "🔒 尚未解鎖". An unlocked card's secondary button SHALL read "出發", "繼續：第 N 關" or "從頭再打一次". "從頭再打一次" (save.unlocked above the district's last stage) SHALL start the district's first stage; otherwise the button SHALL start stage max(first stage of the district, save.unlocked). Selecting stage n SHALL start a new run with 3 hearts in n's district; when n is not the district's first stage the run SHALL be pre-built with one simulated upgrade per skipped stage. The map SHALL also offer "📖 劇情回放", "成就", "操作：…", "重看教學" and "回標題".

> 中文：地圖每區 10 個有編號的關卡按鈕，排成一條來回的街道路線（手機上每顆至少 44 px）；打過的和下一關都能直接點來玩，還沒解鎖的顯示鎖頭；按鈕下方顯示主按鈕會開始的那一關（第 N 關・關名）；「出發／繼續／從頭再打一次」變成次要按鈕。

#### Scenario: Stage buttons show numbers

- **WHEN** the map is shown with save.unlocked 1
- **THEN** district 1 SHALL show 10 stage buttons labelled 1 to 10, button 1 SHALL show "▶", and buttons 2–10 SHALL be disabled

#### Scenario: Stage buttons are big enough to tap

- **WHEN** the map is shown on a 375 px wide screen
- **THEN** every stage button in an unlocked district SHALL be at least 44 × 44 CSS px

#### Scenario: Route order

- **WHEN** the map is shown
- **THEN** in each district stages 1–5 SHALL be in the first row from left to right and stages 6–10 SHALL be in the second row from right to left

#### Scenario: Pick an already cleared stage

- **WHEN** save.unlocked is 7 and the player taps stage button 3
- **THEN** stage 3 SHALL start with 3 hearts and a run built from 2 simulated upgrade picks

#### Scenario: Locked stage cannot be picked

- **WHEN** save.unlocked is 7
- **THEN** stage button 8 SHALL be disabled and the district 2 card SHALL show "🔒 尚未解鎖"

#### Scenario: Next stage name

- **WHEN** save.unlocked is 3
- **THEN** the district 1 card SHALL show "第 3 關・" followed by stage 3's name

#### Scenario: Replay a finished district from its first stage

- **WHEN** save.unlocked is 11 and the player taps "從頭再打一次" on the district 1 card
- **THEN** stage 1 SHALL start

##### Example: District card secondary button

| save.unlocked | District 1 button | Starts stage |
|---|---|---|
| 1 | 出發 | 1 |
| 6 | 繼續：第 6 關 | 6 |
| 11 | 從頭再打一次 | 1 |
| 51 | 從頭再打一次 | 1 |
