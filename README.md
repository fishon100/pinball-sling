# Pinball Sling｜彈射感原型

> **開發管理台**（進度、提案、規則書、企劃內容、素材、交給 AI）：[💻 電腦版](https://fishon100.github.io/game-dev-flow-template/console/?repo=fishon100/pinball-sling)・[📱 手機版](https://fishon100.github.io/game-dev-flow-template/workbench/?repo=fishon100/pinball-sling)

Godot 4.7 彈珠台。物理自製、手感參數全在 `data/tuning.json`。

| 版本 | 網址 | 原始碼 |
|---|---|---|
| v3 噴漆闖關 SPRAY RUN（彈珠 × 打磚塊 × Roguelite，5 區 50 關） | https://fishon100.github.io/pinball-sling/street/ | `web/street/` |
| v2 Godot 網頁版 | https://fishon100.github.io/pinball-sling/ | `scripts/`、`scenes/` |
| 手感調參原型 | https://fishon100.github.io/pinball-sling/tuning/ | `tools/tuning-prototype/` |

## 快速開始
1. 用 Godot 4.7 開啟這個資料夾（`project.godot`）
2. 按 F5 執行
3. 操作：`Z`/`←` 左擋板、`/`/`→` 右擋板、按住 `空白鍵` 蓄力放開發射、`↑` 推台；手機點左右半邊

## 資料夾
```
data/tuning.json              手感參數（企劃／數值調整這裡）
scripts/pinball_physics.gd    物理核心
scripts/main.gd               遊戲主程式（輸入、得分、打擊感、繪圖）
tests/run_tests.gd            自動測試 AC1–AC6
tools/tuning-prototype/       網頁版手感原型（含調參面板，手機可玩）
specs/                        規格副本（正本在 Obsidian）
export_presets.cfg            Web 匯出設定
```

## 調手感的流程
1. 用手機打開網頁原型 → 「調手感」→ 邊玩邊調
2. 按「匯出 JSON」→ 貼到 `data/tuning.json`
3. 跑測試確認沒有壞掉：`godot --headless --path . --script res://tests/run_tests.gd`

## 發布到手機預覽（GitHub Pages）
- 遊戲：`https://<帳號>.github.io/pinball-sling/`
- 手感調參原型：`https://<帳號>.github.io/pinball-sling/tuning/`

更新步驟：
1. 匯出：`godot --headless --path . --export-release "Web" docs/index.html`
2. 同步原型：把 `tools/tuning-prototype/index.html` 複製到 `docs/tuning/index.html`
3. `git add -A`、`git commit`、`git push` → 約 1 分鐘後網址更新

已關閉執行緒支援（`variant/thread_support=false`），GitHub Pages 不用額外設定標頭。
