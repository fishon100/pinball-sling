## MODIFIED Requirements

### Requirement: Item Use From The Item Bar

Pressing an item button SHALL use one of that item only while a stage is in play and the player owns at least one; the count SHALL drop by 1 and be saved at once. The button of a timed item SHALL be highlighted while its effect is active. The item bar SHALL be a single compact row whose item names stay on one line, and the table canvas SHALL be resized whenever the item bar appears or disappears so that the canvas never overlaps the item bar or the HUD above it.

> 中文：在遊戲中按下面的道具按鈕就會用掉一個（數量馬上存檔）；作用中的道具按鈕會發亮。道具欄是精簡的一行，名字不換行；道具欄出現或消失時台面會重新調整大小，永遠不會被道具欄蓋住。

#### Scenario: Using an item outside play

- **WHEN** the player presses an item button on a result or map screen
- **THEN** nothing happens and the item count is unchanged

#### Scenario: Item bar never covers the table

- **WHEN** the game window is 390×680 and the player starts stage 12 while owning items, so the item bar appears after the title screen was laid out
- **THEN** the canvas bottom edge SHALL be at or above the item bar's top edge and the canvas top edge SHALL be at or below the HUD's bottom edge
