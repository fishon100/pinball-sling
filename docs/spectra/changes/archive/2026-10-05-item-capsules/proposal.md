## Why

道具欄放在台面下方會擠壓台面（申請單 `fix-item-bar-covers-table` 修過一次），而且玩家要一邊接球一邊去按下面的按鈕，操作分心。企劃決定改成經典打磚塊的做法：道具藏在磚塊裡，打破後道具會掉下來，用滑板接到就馬上生效。這樣遊玩畫面上不需要道具欄，台面永遠是最大的。

## What Changes

- 道具磚：第 2 關起每關 2～3 塊（第 1 關是教學關，不放），首領關也有
- 打破道具磚，會掉下一顆「道具膠囊」（上面是道具圖示），直直往下掉
- 用滑板（經典擋板模式：擋板）接到膠囊，就立刻用掉這個道具；沒接到就消失
- 5 種道具的效果不變（漆彈、慢動作、球保險、加一顆、寬板）
- **BREAKING** 拿掉道具欄與道具庫存：道具不再存起來帶到下一關；打完一區送 2 個道具的「街區獎勵」也拿掉；舊存檔裡的道具不再使用

## Capabilities

### New Capabilities

（無）

### Modified Capabilities

- `power-ups-and-items`: 道具改成「打破道具磚 → 掉落膠囊 → 接到立刻生效」；拿掉道具庫存與道具欄
- `bricks-and-stages`: 道具磚改成第 2 關起每關 2～3 塊，打破會掉膠囊
- `core-game-loop`: 打完一區不再送道具

## Impact

- 程式：`web/street/js/data.js`（道具磚數量）、`web/street/js/physics.js`（膠囊掉落與接住）、`web/street/js/rules.js`（拿掉庫存）、`web/street/js/game.js`（拿掉道具欄、街區獎勵，接到時套用效果與提示）、`web/street/js/art.js`（膠囊外觀）、`web/street/index.html`（拿掉道具欄）、`web/street/js/tests.js`
- 存檔：`save.items` 不再使用（保留欄位不刪，避免舊存檔出錯）
- 遊玩畫面：台面下方不再有道具欄
