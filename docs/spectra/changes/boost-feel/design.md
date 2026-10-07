# 設計：加速帶衝刺演出

- `tuning.js` boost：mult 1.6, min 1300, max 1900, cooldown 0.5；數值總表更新。
- `physics.js` 不變（讀 tuning）。
- `game.js` handleEvents boost：hitstop 0.04、`G.view.nudge`（沿球方向 6 px，tick 裡 ease back）、`e.b.dash = 0.5`、popup「BOOST!」（lime）、pad flash 0.5、噴 12 顆 lime 粒子（沿用現有碎片粒子系統）、vibrate(30)。
- `art.js`：球的拖尾讀 `b.dash > 0` → 長度 ×2、顏色 lime、兩側速度線；boostPad 箭頭 phase 速度 2.2 → 4.4、shadowBlur 8 → 14。
- `audio.js` boost：sawtooth 300→1800、0.3 秒 ＋ noise 0.08。
- 碎磚：brick_break 事件加 `G.flashes`（60ms 白色矩形）、粒子數 ×1.5；`G.recentBreaks`（1 秒窗）≥ 3 → shake ≥ 6。
- 測試：AC-S28 數值改（1.6／1300）；新增 AC-S56 衝刺演出（hitstop、popup、dash timer）、AC-S57 連鎖震動 ≥ 6；擬人玩家重量第 3～5 區難度（加速只影響往上的球，預期不變，仍要量）。
