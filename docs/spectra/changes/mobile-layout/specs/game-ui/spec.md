## ADDED Requirements

### Requirement: UI Mobile Edge-To-Edge Layout

On viewports 520 px wide or narrower the game canvas SHALL be drawn edge to edge with no border, rounded corner or shadow, respecting safe-area insets; the HUD (Pinky, stage chip, hearts, score, pause) SHALL overlay the top of the table as a translucent bar and the bottom hint SHALL overlay the bottom. The view SHALL show only the table itself (from the left wall at x = 20): while a ball waits in the lane the view spans x 20–380, and once the ball has left the lane column the view narrows to x 20–340 within 0.3 s (the lane slides out, see plunger-launch); when the screen is wider than the table the view shows equal extra wall on both sides so the table always touches both screen edges. On wider viewports the framed 0–400 layout SHALL stay as before. On a 375 × 812 viewport a 1-HP brick SHALL be at least 36 px wide after launch and no brick SHALL be covered by the HUD bar.

> 中文：手機（寬 ≤ 520）台面無邊框貼齊兩邊、資訊列與提示列半透明疊在台面上；畫面只看台面本體（左牆起）：球在發射道時看 20～380，球離開後 0.3 秒內收到 20～340（發射道滑出），螢幕比台面寬就左右多看一點牆。電腦維持 0～400 有外框。375 寬的手機發射後一塊磚至少 36 px，資訊列不蓋到磚。

#### Scenario: Phone layout is edge to edge

- **WHEN** the game runs in a 375 × 812 viewport
- **THEN** the canvas has no border, spans the full width, the HUD overlays its top, and after launch a brick measures at least 36 px wide on screen

#### Scenario: Desktop keeps the frame

- **WHEN** the game runs in a 711 × 914 viewport
- **THEN** the canvas keeps its 4 px ink border and the view spans x 0–400

#### Scenario: HUD does not cover bricks

- **WHEN** a stage with bricks in the top row is played on a 375 × 812 viewport
- **THEN** no brick overlaps the HUD bar
