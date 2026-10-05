## 1. 先寫測試（修改前要失敗）

- [ ] 1.1 新增 AC-S33（Item Capsules、Item Effects）：打破滑板正上方的道具磚 → 膠囊每秒 170 px 掉落、碰到滑板生效並移除；滑板在另一邊時膠囊過 y 1000 消失且沒有效果；球穿過膠囊時兩者都不受影響。驗收：修改前執行，AC-S33 失敗
- [ ] 1.2 新增 AC-S34（Gift Bricks）：第 1 關 0 塊、第 2～50 關每關 2～3 塊道具磚。驗收：修改前執行，AC-S34 失敗
- [ ] 1.3 新增 AC-S35（Core Loop Stage Flow）：遊戲流程測試，第 12 關遊玩畫面沒有道具欄；打完第 10 關的街區解放畫面沒有「街區獎勵」。驗收：修改前執行，AC-S35 失敗

## 2. 實作

- [ ] 2.1 Gift Bricks From Stage Two：`SR.buildStage` 第 2 關起每關 2～3 塊道具磚。驗收：AC-S34 通過 [after: 1.2]
- [ ] 2.2 Capsules Fall Straight And Ignore The Ball 與 Catch Means Touching The Paddle Or A Flipper：膠囊物理、接住與漏接事件、接到時套用道具效果。驗收：AC-S33 通過 [after: 1.1]
- [ ] 2.3 Remove Inventory And Item Bar：拿掉道具欄、道具按鈕、庫存與街區獎勵；接到時顯示「圖示 名稱！」；第一次出現膠囊時噴噴提醒。驗收：AC-S35 通過；AC-S32 改成檢查沒有道具欄後通過 [after: 1.3, 2.2]
- [ ] 2.4 膠囊外觀（程式繪製：圓角膠囊＋道具圖示＋發光）與接到的音效。驗收：手機截圖看得到膠囊與圖示 [after: 2.2]

## 3. 收尾

- [ ] 3.1 全部測試通過並部署：`?v=` 升版、測試頁全過、Godot 9 項全過、`tools/deploy.ps1` 部署、線上測試頁全過；擬人新手難度（AC-S20、AC-S8b）通過。驗收：線上測試頁全過，企劃在手機試玩 [after: 2.1, 2.3, 2.4]
