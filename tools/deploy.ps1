<#
  一鍵部署：測試 → 匯出 Godot 網頁版 → 同步調參原型 → 推上 GitHub → 等 Pages 更新 → 跳通知附預覽連結。
  用法（在專案資料夾）：powershell -ExecutionPolicy Bypass -File tools\deploy.ps1 -Message "調整擋板力道"
  任何一步失敗都會停下來，並跳出失敗通知。
#>
param([string]$Message = "更新遊戲")

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
$env:PATH = [Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [Environment]::GetEnvironmentVariable("PATH", "User")

$repo = "fishon100/pinball-sling"
$site = "https://fishon100.github.io/pinball-sling/"
$links = [ordered]@{ "開啟遊戲" = $site; "調手感" = "${site}tuning/"; "看程式碼" = "https://github.com/$repo" }
$notify = Join-Path $PSScriptRoot "notify.ps1"

function Fail([string]$why) {
    & $notify -Title "❌ 部署失敗" -Message "$Message：$why" -Links ([ordered]@{ "看程式碼" = "https://github.com/$repo" })
    throw $why
}

$godot = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\GodotEngine.GodotEngine*\Godot_v*_console.exe" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
if (-not $godot) { $godot = (Get-Command godot -ErrorAction SilentlyContinue).Source }
if (-not $godot) { Fail "找不到 Godot" }

Write-Host "1/5 跑自動測試…"
& $godot --headless --path . --script res://tests/run_tests.gd
if ($LASTEXITCODE -ne 0) { Fail "自動測試沒有全部通過" }

Write-Host "2/5 匯出 Godot 網頁版…"
& $godot --headless --path . --export-release "Web" docs/index.html *> $null
if ($LASTEXITCODE -ne 0 -or -not (Test-Path docs\index.wasm)) { Fail "Godot 匯出失敗" }

Write-Host "3/5 同步手感調參原型…"
New-Item -ItemType Directory -Force docs\tuning | Out-Null
Copy-Item tools\tuning-prototype\index.html docs\tuning\index.html -Force
if (-not (Test-Path docs\.nojekyll)) { New-Item -ItemType File docs\.nojekyll | Out-Null }

Write-Host "4/5 推上 GitHub…"
git add -A
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) {
    $msgFile = New-TemporaryFile
    [IO.File]::WriteAllText($msgFile, "$Message`n`nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`n", (New-Object Text.UTF8Encoding $false))
    git commit -q -F $msgFile
    Remove-Item $msgFile
    if ($LASTEXITCODE -ne 0) { Fail "git commit 失敗" }
}
git push -q
if ($LASTEXITCODE -ne 0) { Fail "git push 失敗" }
$sha = (git rev-parse HEAD).Trim()

Write-Host "5/5 等 GitHub Pages 更新…"
$deadline = (Get-Date).AddMinutes(5)
$status = ""
do {
    Start-Sleep 10
    $build = gh api "repos/$repo/pages/builds/latest" | ConvertFrom-Json
    $status = if ($build.commit -eq $sha) { $build.status } else { "queued" }
    Write-Host "   狀態：$status"
} until ($status -in @("built", "errored") -or (Get-Date) -gt $deadline)
if ($status -ne "built") { Fail "GitHub Pages 沒有在 5 分鐘內更新完成（狀態：$status）" }

& $notify -Title "✅ 遊戲已更新" -Message "$Message（$($sha.Substring(0,7))）手機打開連結就能玩" -Links $links
Write-Host "完成：$site"
