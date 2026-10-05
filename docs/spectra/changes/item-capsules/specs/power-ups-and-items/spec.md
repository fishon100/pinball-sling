## MODIFIED Requirements

### Requirement: Item Effects

Each item SHALL take effect at the moment its capsule is caught, as follows:

- **bomb (漆彈)**: at every live ball's position, deal 2 damage to every live brick (including the boss) within 60 px.
- **slow (慢動作)**: run the game at 0.5× speed for 5 seconds of game time.
- **save (球保險)**: for 10 seconds, losing the last ball SHALL return a new ball to the launch lane without losing a heart.
- **ball (加一顆)**: add one extra ball at (185, 110) near the top with a random sideways speed between −100 and +100 px/s.
- **wide (寬板)**: for 12 seconds, switch the paddle to the large size (half-width 76 px); in flipper mode, lengthen both flippers by 14 px and restore them when the time ends.

> 中文：接到膠囊的瞬間就生效：漆彈在每顆球的位置炸開、慢動作讓時間變慢一半 5 秒、球保險 10 秒內掉球不扣愛心、加一顆從上方多放一顆球、寬板 12 秒內滑板變大（擋板模式擋板變長）。

#### Scenario: Bomb damages a nearby brick

- **WHEN** a bomb capsule is caught with a ball 20 px below a brick
- **THEN** the brick loses HP or is destroyed and a bomb event is produced

#### Scenario: Timers start and end

- **WHEN** slow and save capsules are caught and then 11 seconds of game time pass
- **THEN** the slow timer started at 5 s and the save timer started at 10 s, and the save timer is 0 at the end

#### Scenario: Wide paddle and flippers revert

- **WHEN** a wide capsule is caught in paddle mode and 13 seconds pass, and separately in flipper mode and 13 seconds pass
- **THEN** the paddle half-width goes 56 → 76 → 56, and the flipper bonus goes 0 → 14 → 0

#### Scenario: Extra ball

- **WHEN** a ball capsule is caught with 1 ball on the table
- **THEN** there are 2 balls on the table

## ADDED Requirements

### Requirement: Item Capsules

Destroying a gift brick SHALL release an item capsule at the brick's center holding one item chosen uniformly at random from bomb, slow, save, ball and wide. A capsule SHALL fall straight down at 170 px/s, SHALL NOT collide with balls, bricks or bumpers, and SHALL be caught when it touches the paddle (paddle mode) or either flipper (flipper mode); a caught capsule SHALL apply its item at once, show "<icon> <name>！" and play the item sound. A capsule that falls below y 1000 without being caught SHALL disappear with no effect. When several capsules are falling, each capsule SHALL be caught or missed on its own. The first time in a save that a capsule appears, Pinky SHALL say "道具掉下來了！用滑板接住！".

> 中文：打破道具磚會掉下一顆道具膠囊（隨機 5 種之一），每秒 170 px 直直往下掉，不會撞到球和磚；滑板（或擋板）碰到就接住、馬上生效並顯示道具名稱；沒接到掉出台面就消失。第一次出現時噴噴會提醒「用滑板接住」。

#### Scenario: Capsule is caught by the paddle

- **WHEN** a gift brick directly above the paddle is destroyed and the paddle stays still
- **THEN** a capsule falls at 170 px/s, touches the paddle, its item takes effect at once and the capsule is removed

#### Scenario: Missed capsule has no effect

- **WHEN** a capsule falls while the paddle is at the far other side of the table
- **THEN** the capsule disappears after passing y 1000 and no item effect starts

#### Scenario: Capsule ignores the ball

- **WHEN** a ball crosses a falling capsule
- **THEN** neither the ball's velocity nor the capsule's fall changes

## REMOVED Requirements

### Requirement: Item Inventory And Sources

**Reason**: 道具改成「打破道具磚 → 掉落膠囊 → 接到立刻生效」，不再存起來，所以不需要庫存、上限與街區獎勵。
**Migration**: 道具來源只剩道具磚（見 bricks-and-stages 的 Gift Bricks 與本規則書的 Item Capsules）；舊存檔的 `save.items` 保留但不再讀取。

### Requirement: Item Use From The Item Bar

**Reason**: 道具接到就生效，遊玩畫面不再有道具欄（也解決道具欄擠壓台面的問題）。
**Migration**: 道具效果改在接到膠囊時觸發，見 Item Capsules 與 Item Effects。
