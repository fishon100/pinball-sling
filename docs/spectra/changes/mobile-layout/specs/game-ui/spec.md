## ADDED Requirements

### Requirement: UI Mobile Edge-To-Edge Layout

On viewports 520 px wide or narrower the game canvas SHALL be drawn edge to edge with no border, rounded corner or shadow, respecting safe-area insets; the HUD (Pinky, stage chip, hearts, score, pause) SHALL overlay the top 44 px of the table as a translucent bar and the bottom hint SHALL be drawn inside the canvas. On wider viewports the framed layout SHALL stay as before. On a 375 × 812 viewport the canvas SHALL be at least 375 px wide and a 1-HP brick SHALL be at least 36 px wide.

> 中文：手機（寬 ≤ 520）台面無邊框貼齊螢幕、資訊列半透明疊在台面上方 44 px、提示畫在畫布裡；電腦維持外框。375 寬的手機上畫布至少 375 px 寬、一塊磚至少 36 px 寬。

#### Scenario: Phone layout is edge to edge

- **WHEN** the game runs in a 375 × 812 viewport
- **THEN** the canvas has no border, its width is 375 px and a brick measures at least 36 px wide on screen

#### Scenario: Desktop keeps the frame

- **WHEN** the game runs in a 711 × 914 viewport
- **THEN** the canvas keeps its 4 px ink border and pink outline

#### Scenario: HUD does not cover bricks

- **WHEN** a stage with bricks in the top row is played on a 375 × 812 viewport
- **THEN** no brick overlaps the HUD bar
