## 1. 先寫測試（修改前要失敗）

- [ ] 1.1 新增 AC-S27：每一關 `SR.layoutFor(n).top` 都是 320，並抽第 5／15／25／35／45 關讓機器人玩 20 秒，鏡頭 y 一直是 320（Table Height Per District、Art Controls Always Visible When Acting）。驗收：修改前執行，AC-S27 失敗
- [ ] 1.2 新增 AC-S28：加速帶規則（Boost Pads）——往上 800 變 1080、500 變 1000、1700 變 2000、往下不加速、0.5 秒內不重複、第 25／35／45／30／15 關分別 1／2／2／0／0 條。驗收：修改前執行，AC-S28 失敗
- [ ] 1.3 新增 AC-S30：第 5／15／25／35／45 關球半徑 12／12／10.5／9／9、第 35 關大罐 2 級＝12（Ball Size Per District）；第 3／25／35／10 關滑板 M／M／S／S（Paddle Sizes）；第 21～49 關一般磚血 ≥ 圖案數字＋1（Brick Hit Points）；第 2 區配置最多 2 對、第 3～5 區最多 1 對彈跳柱（Pop Bumpers）；第 25 關彈道預覽 0 秒；第 5／15／25／35／45 關拖尾最多 10／10／5／0／0 點。驗收：修改前執行，AC-S30 失敗
- [ ] 1.4 新增 AC-S29：第 2～5 區擬人新手難度目標（Balance Difficulty Targets）。驗收：修改前執行並記下現在的數字（預期第 3～5 區不符合「每區平均 ≤ 90 秒」）

## 2. 矮台面與配置

- [ ] 2.1 All Layouts Use The Short Table 與 Fewer Bumpers In Later Districts：第 2～5 區配置改成 `top` 320、照設計表重新擺彈跳柱、阿鰭與彈力牆（Fish Bumper A-Fin、Rubber Rails）。驗收：AC-S27 通過、AC-S30 的彈跳柱數量通過、AC-S7（卡球）與 AC-S19（柱離磚）通過 [after: 1.1, 1.3]

## 3. 難度元件

- [ ] 3.1 Ball Size Per District：`SR.ballRadiusFor(n)` 與 `world.ballRadius`，遊戲與 `playStage` 都套用。驗收：AC-S30 的球大小通過 [after: 1.3]
- [ ] 3.2 Paddle Size By District：第 4、5 區一般關用 S。驗收：AC-S30 的滑板大小通過 [after: 1.3]
- [ ] 3.3 Harder Bricks From District 3：第 3～5 區每塊 +1 血，拿掉第 4、5 區 −1 血，亂數順序不變。驗收：AC-S30 的磚血通過 [after: 1.3]
- [ ] 3.5 Hide Ball Guides In Later Districts：第 3 區彈道預覽改 0（Per-District Assist Schedule）；球的拖尾光第 1、2 區 10 點、第 3 區 5 點、第 4、5 區 0（Ball Trail By District）。驗收：AC-S30 的預覽秒數與拖尾長度通過 [after: 1.3]
- [ ] 3.4 Boost Pads Point Upward：加速帶的物理、事件、霓虹箭頭外觀與音效。驗收：AC-S28 通過；手機截圖看得到加速帶 [after: 1.2, 2.1]

## 4. 量難度並調整

- [ ] 4.1 Difficulty Measured Per District（Rising Difficulty Measured At Human Speed）：跑 AC-S29，沒達標就依設計的順序調整並記錄每次數字，定案後用 `/spectra-ingest` 把最終數值寫回規則書。驗收：AC-S29、AC-S20、AC-S8b 通過 [after: 2.1, 3.1, 3.2, 3.3, 3.4, 3.5]

## 5. 收尾

- [ ] 5.1 全部測試通過並部署：`?v=` 升到 3.7.0、測試頁全過、Godot 9 項全過、`tools/deploy.ps1` 部署、線上測試頁全過；更新 Obsidian F05／F13／F15 與數值總表。驗收：線上測試頁全過，企劃在手機試玩第 3～5 區 [after: 4.1]
