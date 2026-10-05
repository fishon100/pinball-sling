## Context

噴漆闖關已經做到 v3.6.1，但規則只寫在 Obsidian 的主架構規劃書與 F01～F15 功能規劃書（企劃本機），而且部分內容已經跟程式不同步。Spectra 的每張申請單都要拿「主規則書」（`docs/spectra/specs/`）來比對，目前主規則書是空的。這張申請單只負責把「現在的遊戲」記錄下來。

## Goals / Non-Goals

**Goals:**

- 16 個功能各有一份規則書，內容以目前程式的實際行為為準
- 每個情境都歸類為「已有測試／不需測試／缺測試」，對照表放在 `coverage/`
- 現有測試全部通過

**Non-Goals:**

- 不改任何遊戲行為、數值、美術或劇情
- 不在這張單補測試：盤點出 143 個缺測試的情境，數量太多，另開申請單 `baseline-test-gaps` 分批補
- 不修 bug：盤點時發現的疑似 bug（例如按住空白鍵發射桿一直歸零）各自另開 bug-fix 申請單
- 不在這張單搬移知識庫到 Notion（另開申請單）
- 不移植 Godot 版

## Decisions

### Baseline Follows Current Code

規則書寫的是程式「現在真的怎麼做」，不是文件「原本打算怎麼做」。文件與程式不一致的地方列在任務裡，由企劃決定要改哪一邊；這張單不改程式行為。
替代方案：照文件寫 → 規則書一開始就跟遊戲不一致，之後每次 verify 都會報錯，所以不採用。

### English Rules With Chinese Notes

Spectra 規定規則書用英文（SHALL／WHEN／THEN）。每條規則下面加一行 `> 中文：`，讓不懂程式的企劃也看得懂。已在練習專案確認這一行不會讓 `spxa validate`／`spxa analyze` 多出警告。

### Scenario To Test Mapping

每個情境歸成三種：已有測試、不需測試（純外觀或需要人工試玩）、缺測試。對照表放在 `coverage/<capability>.md`。缺測試的情境由後續申請單 `baseline-test-gaps` 補上；手感與好不好玩仍由企劃試玩與擬人玩家量測負責。
替代方案：在這張單一起補 143 個測試 → 單子太大，企劃看不完也很難驗收，所以不採用。

### Feature Docs Become Reference

歸檔後，正式規則以 `docs/spectra/specs/` 為準。Obsidian 的功能規劃書保留給企劃當背景說明，不再是正本。

## Implementation Contract

- 行為：遊戲玩起來與 v3.6.1 完全相同；新增的只有規則書與測試
- 產出：`docs/spectra/changes/baseline-specs/specs/<capability>/spec.md` 共 16 份，歸檔後出現在 `docs/spectra/specs/`
- 對照表：`docs/spectra/changes/baseline-specs/coverage/<capability>.md` 共 16 份，每個情境一列
- 測試：`web/street/test.html` 22 項通過；Godot `tests/run_tests.gd` 9 項通過（這張單不新增測試）
- 驗收：`spxa validate baseline-specs` 通過、`spxa analyze baseline-specs` 沒有 Critical；企劃看過中文說明確認「遊戲現在就是這樣」
- 範圍外：修正文件與程式不一致（只列出、不修）、補測試、修 bug、Notion 搬移、新功能

## Risks / Trade-offs

- [規則寫太細，之後每次改數值都要改規則] → 數值只寫在情境的範例裡，規則本身寫行為
- [規則書以程式為準，等於把現有 bug 也寫成規則] → bug 列在任務 4，由企劃決定，修的時候用 bug-fix 申請單改那條規則
