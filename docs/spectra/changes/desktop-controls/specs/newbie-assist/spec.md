## MODIFIED Requirements

### Requirement: Interactive Tutorial

(Unchanged except) tutorial texts SHALL depend on the pointer type: on a fine pointer the press step reads 「按住空白鍵蓄力，放開發射」 (icon ␣) and the move step reads 「移動滑鼠接球，不用點」; on a coarse pointer the current texts stay.

> 中文：互動教學在電腦上說「按住空白鍵蓄力，放開發射」「移動滑鼠接球」，手機維持原本文字。

#### Scenario: Desktop tutorial text

- **WHEN** the interactive tutorial's press step is drawn on a fine-pointer device
- **THEN** the card's first line is 「按住空白鍵蓄力，放開發射」

## ADDED Requirements

### Requirement: Desktop Controls Card

On a fine-pointer device the first time the player reaches the play screen, the game SHALL show a translucent controls card (Space = charge and launch, mouse left/right = paddle, Esc = pause) that closes on any click or key and is never shown again (stored in the save). The bottom hint on desktop SHALL read 「空白鍵蓄力發射・滑鼠左右移動滑板」.

> 中文：電腦第一次進遊玩畫面出現操作卡（空白鍵、滑鼠、Esc），點一下或按鍵關掉，之後不再出現；下方提示改成「空白鍵蓄力發射・滑鼠左右移動滑板」。

#### Scenario: Controls card once

- **WHEN** a mouse user enters the play screen for the first time
- **THEN** the controls card is shown; after closing it and starting another stage it is not shown
