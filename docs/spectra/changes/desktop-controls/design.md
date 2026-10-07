# 設計：電腦版操作說明與游標

- `game.js`：FINE ＝ 不是 coarse pointer。
- TUT_TEXT 改成依 FINE 回傳的函式；drawTutorial 的手指圖示在 FINE 時畫「␣」鍵帽（press）或滑鼠（move）。
- 操作卡：`G.ctrlCard = FINE && !save.seenControlsCard`，在 beginPlay() 顯示（canvas 上畫，跟教學卡同風格），任何 pointerdown／keydown 關閉並存檔。
- 游標：canvas.style.cursor 在 FINE、play、未暫停、沒有教學卡時設 "none"，其餘清空；在 tick 裡同步。
- tickKeys：方向鍵速度改成與滑板跟隨速度同級（讀 tuning）。
- 提示列 .hint：字 12px → 14px、顏色 --muted → --text，電腦版文字照規則。
- 空白鍵／Enter 也可關閉教學卡與物件特寫教學（keydown 已處理 dialog，加上這兩種狀態）。
- 測試：AC-S58 電腦教學文字；AC-S59 操作卡只出現一次；AC-S60 游標隱藏／恢復。
