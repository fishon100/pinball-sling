> 中文標題：把現有遊戲寫成 16 份規則書

## Why

噴漆闖關目前的規則散在 Obsidian 的主架構規劃書與 F01～F15 功能規劃書，只有企劃這台電腦看得到，也沒有逐條對應到自動測試。團隊要改用 Spectra 的「申請單」流程，第一步必須先把「遊戲現在已經是這樣」寫成正式規則書，之後每張申請單才有比對的基準。

## What Changes

- 把主架構規劃書與 F01～F15 的現有行為，寫成 16 份 Spectra 規則書（每份一個功能）
- 每條規則都寫成「當……就要……」的情境，並標出目前由哪一個自動測試檢查
- 找出還沒有測試的情境，補上測試或寫明為什麼不用測（例如純外觀）
- 遊戲行為完全不改；只新增規則書與缺少的測試

## Capabilities

### New Capabilities

- `core-game-loop`: 遊戲核心——一輪的流程、愛心、過關與失敗、不能違反的核心規則（主架構規劃書）
- `opening-animation`: 第一次進遊戲的開場動畫（F01）
- `paddle-control`: 滑板操作與三種尺寸（F02）
- `flipper-control`: 經典擋板操作（F03）
- `plunger-launch`: 往下拉的發射桿（F04）
- `table-layout`: 台面配置、彈跳柱、各區台面高度（F05）
- `bricks-and-stages`: 磚塊、文字磚、五區五十關（F06）
- `boss-mr-grey`: 首領灰先生（F07）
- `power-ups-and-items`: 強化罐與道具（F08）
- `medals-and-achievements`: 獎牌與成就（F09）
- `newbie-assist`: 新手輔助與教學（F10）
- `comics-and-story-replay`: 漫畫劇情與回放（F11）
- `game-ui`: 介面畫面、暫停、地圖（F12）
- `art-presentation`: 美術呈現與鏡頭（F13）
- `audio-and-haptics`: 聲音與震動（F14）
- `difficulty-balance`: 難度量測（擬人玩家）與手感調整面板（F15）

### Modified Capabilities

（無）

## Impact

- 新增 `docs/spectra/specs/` 下 16 份規則書（歸檔時產生）
- 可能新增測試：`web/street/js/tests.js`
- Obsidian 的 `彈珠專案/01 功能規劃書` 之後改為參考用，正式規則以 `docs/spectra/specs/` 為準
- 遊戲程式行為不變
