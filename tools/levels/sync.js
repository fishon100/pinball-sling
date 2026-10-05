/* 同步關卡表（企劃說「同步關卡表」時 AI 執行）
   1. AI 用 Google Drive 下載兩份試算表的 CSV（base64），存成 tools/levels/in/stages.b64、layouts.b64（不進 git）
   2. node tools/levels/sync.js          → 檢查＋列出跟目前 levels.js 的差異（不寫檔）
      node tools/levels/sync.js --write  → 檢查通過才寫出新的 levels.js，並在 Node 裡跑一次會擋的測試
   回傳碼：0＝OK、2＝表格有問題（擋下）、3＝會擋的測試沒過 */
"use strict";
const fs = require("fs"), path = require("path"), { load, JS } = require("./load");
const IN = path.join(__dirname, "in"), write = process.argv.includes("--write");

function readInput(name) {
  for (const ext of [".csv", ".b64"]) {
    const f = path.join(IN, name + ext);
    if (fs.existsSync(f)) { const raw = fs.readFileSync(f, "utf8").trim(); return ext === ".csv" ? raw : Buffer.from(raw.replace(/\s+/g, ""), "base64").toString("utf8"); }
  }
  throw new Error(`找不到 tools/levels/in/${name}.b64（或 .csv）`);
}
function parseCsv(text) {
  text = text.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const head = rows.shift().map(h => h.trim());
  return rows.filter(r => r.some(c => c.trim() !== "")).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
}

const stagesCsv = readInput("stages"), layoutsCsv = readInput("layouts");
const base = load(["data.js", "levels.js", "levelcheck.js"]), SR = base.SR, current = SR.LEVELS;
const stamp = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace("T", " ") + "（台北）";
const { levels, problems } = SR.LevelCheck.validate(parseCsv(stagesCsv), parseCsv(layoutsCsv), { source: "sheet", syncedAt: stamp });

if (problems.length) {
  console.log(`❌ 表格有 ${problems.length} 個問題，這次不同步：`);
  for (const p of problems) console.log(`  ・${p.stage ? `第 ${p.stage} 關・` : ""}${p.column}：${p.message}`);
  process.exit(2);
}
const d = SR.LevelCheck.diff(current, levels);
console.log(d.length ? `這次改了 ${d.length} 處：` : "跟目前的關卡表一樣（沒有改動）");
for (const x of d) console.log(x.layout ? `  ・台面 ${x.layout}` : `  ・第 ${x.n} 關：${x.columns.join("、")}`);
if (!write) { console.log("（只檢查，沒有寫檔；確認後加 --write）"); process.exit(0); }

fs.writeFileSync(path.join(JS, "levels.js"), SR.LevelCheck.toLevelsJs(levels), "utf8");
console.log("已寫出 web/street/js/levels.js，開始跑會擋的測試…");
const ctx = load(["data.js", "levels.js", "levelcheck.js", "tuning.js", "physics.js", "rules.js", "comic.js", "tests.js"]);
ctx.SR.loadTuning().then(T => {
  ctx.SR.T = T;
  const res = ctx.SR.Tests.run(T, { node: true }), block = res.filter(r => !r.report), fail = block.filter(r => !r.pass);
  // Node 和瀏覽器的浮點數學有極小差異，彈珠物理會放大：難度報告以 test.html 的數字為準，這裡只是先看大概
  for (const r of res.filter(r => r.report)) console.log(`  ${r.pass ? "ⓘ" : "⚠"} 報告 ${r.id}（概略，以 test.html 為準）：${r.value}`);
  if (fail.length) { console.log(`❌ 會擋的測試 ${fail.length} 項沒過（levels.js 已寫出，請改表後再同步，或還原）：`); for (const r of fail) console.log(`  ✗ ${r.id} ${r.name}：${r.value}`); process.exit(3); }
  console.log(`✅ 會擋的測試 ${block.length}/${block.length} 通過（漫畫版面 AC-S18 與遊戲流程測試請在 test.html 確認）`);
});
