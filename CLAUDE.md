# CLAUDE.md — 給 AI 的專案規則

## 這是什麼
彈珠台遊戲（Godot 4.7，GDScript）。目標是「彈射感到位」。
規格的正本在 Obsidian vault 的 `彈珠專案/` 資料夾（可透過 Obsidian MCP 讀寫；`specs/` 是副本）。

## 開發流程（SDD + TDD）
1. 先讀 `specs/` 的規格與驗收條件（AC）
2. 新功能先在 `tests/run_tests.gd` 加測試，再實作
3. 每次改動後都要跑測試，全過才算完成：
   ```
   godot --headless --path . --script res://tests/run_tests.gd
   ```
4. 完成後更新 Obsidian `彈珠專案/05 開發日誌.md`

## 規則
- 手感數值一律讀 `data/tuning.json`，禁止寫死在程式裡
- 物理在 `scripts/pinball_physics.gd`，與網頁原型 `tools/tuning-prototype/index.html` 演算法一一對應；改一邊就要同步改另一邊，兩邊的 AC1–AC5 測試數值要相同
- 不使用 Godot 內建 RigidBody2D 做球與擋板（要精準控制擋板線速度）
- 新增或移動任何台面元件後，AC13（無卡球死角）一定要通過；卡球點要用導球片或調整位置修掉，不能放寬測試
- 規則（模式、狂熱、球保險）在網頁版 `index.html` 與 Godot `scripts/main.gd` 各有一份，改一邊要同步另一邊
- 美術目前是程式繪製的占位圖形；正式資產放 `assets/`，命名 `物件_狀態.png`
- 改了規格要同步更新 Obsidian 的對應文件

## 常用指令
| 做什麼 | 指令 |
|---|---|
| 跑測試（約 30 秒，AC13 卡球測試最久） | `godot --headless --path . --script res://tests/run_tests.gd` |
| 自動遊玩煙霧測試（15 秒） | `godot --headless --path . --quit-after 900 -- --demo` |
| 錄影驗收畫面 | `godot --path . --write-movie C:\tmp\f.png --fixed-fps 60 --quit-after 420 -- --demo` |
| 匯出網頁版 | `godot --headless --path . --export-release "Web" docs/index.html`（輸出到 `docs/`，GitHub Pages 直接讀這裡） |
| 部署到手機預覽＋通知 | `powershell -ExecutionPolicy Bypass -File tools\deploy.ps1 -Message "說明"` |
| 只送通知 | `powershell -ExecutionPolicy Bypass -File tools\notify.ps1 -Title "標題" -Message "內容"` |

## 完成時一定要通知使用者（含預覽連結）
使用者常把電腦畫面開著、人卻外出，所以**每次完成都要同時送電腦和手機**，不能只靠其中一個：
1. 有改到遊戲或原型 → 跑 `powershell -ExecutionPolicy Bypass -File tools\deploy.ps1 -Message "<這次改了什麼>"`
   （測試、匯出、推上 GitHub、等網頁更新，最後同時送 Windows 通知＋手機 ntfy 推播，都附預覽連結）
2. 沒有部署的任務（文件、調查、需要決定）→ 跑 `tools\notify.ps1`，一樣會送電腦＋手機：
   `powershell -ExecutionPolicy Bypass -File tools\notify.ps1 -Title "✅ <做了什麼>" -Message "<一句摘要>"`
   有相關連結就用 `-Links` 附上（GitHub、Obsidian 位置等）
3. 失敗或需要使用者決定時，也要通知，並說明卡在哪裡
4. 另外再用 PushNotification 補送一次（Claude App；電腦畫面開著時可能會被略過，所以不能只靠它）
5. 手機推播走 ntfy，主題設定在 `tools/notify.config.json`（已排除在 git 外，不要提交、不要寫進公開檔案）

## 部署
- GitHub repo：`pinball-sling`（公開），GitHub Pages 讀 `main` 分支的 `/docs`
- 遊戲：`https://<帳號>.github.io/pinball-sling/`；調參原型：`.../pinball-sling/tuning/`
- `docs/` 是匯出產物，要 commit（Pages 靠它）；每次改程式都要重新匯出再推
