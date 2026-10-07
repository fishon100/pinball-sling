# 設計：手機版面（版本 A ＋ 發射區 ①，其他選項由企劃決定後再調）

## 幾何（physics.js）
- 牆：左牆 20 → 0；右外牆 380 → 400；發射道內牆 340 → 368（道寬 32）；柱塞段與單向門跟著右移 20。
- 頂端圓弧：圓心 y 200 → 160（降 40 px，半徑 180 不變，圓心 x 200 → 184 置中於 0～368）。
- GRID：`{ x0: 7, y0: 60, cw: 39.4, ch: 20, bw: 37, bh: 18, cols: 9 }`；磚最低排允許到 y=640（placeStage 的排數上限）。
- 滑板移動範圍：x=0 → 368（paddle-control 規則「左牆 20、內牆 340」改成 0／368，數值是幾何推導，不改玩法）。
- 擋板模式（經典）：導球片、彈弓、漏斗整組左右各外推 20。
- 台面配置（layouts）：所有座標 x 乘 368/320 再對齊（中柱、彈力牆、加速帶、阿鰭 x0/x1），用 `tools/levels/export.js` 寫回台面配置表；重跑卡球（AC-S7）與離磚 46 px 檢查。
- 球最大半徑：`power-ups` 大罐每級 +1.5 → 上限 15（3 級 → 2 級 … 由企劃確認）。

## 版面（index.html / game.js fit）
- `@media (max-width: 520px)`：`.app` padding 0、`canvas#game` border 0 / radius 0 / shadow none、`.hud` 改 `position:absolute; top: env(safe-area-inset-top)` 半透明 `rgba(12,12,16,.55)` 高 44；`.hint` 隱藏（畫布內畫）。
- fit()：手機用 `availW = innerWidth`、`availH = innerHeight - safe insets`；VW 400 × VH 740 比例不變（寬 375 → 高 694；812 高的螢幕剩餘空間平均留在上下）。
- HUD 疊圖時，磚格起點 y=60 在畫布內對應 56 px 螢幕高度 ＞ 44，磚不會被資訊列蓋到；測試 AC-S32 更新。

## 發射道淡出（art.js）
- `world.laneAlpha` 目標：有球在道內 1，否則 0.35；每幀 lerp（0.3 秒）。畫發射道、柱塞時 `g.globalAlpha = laneAlpha`。

## 測試
- AC-S32 改寫（375×812：畫布寬 375、無邊框、磚 ≥ 36 px、資訊列不蓋磚）；AC-S61 電腦維持外框；AC-S62 發射道透明度；關卡工具：50 關都放得進 9 欄新格、至少 6 成磚；AC-S7 卡球全台面；擬人玩家重量 5 區難度（台面寬了、磚大了，預期變簡單一點，數字要記進開發日誌）。
- 開場運鏡（AC-S50／51）座標用 GRID 推導，確認仍對準最上排磚。
