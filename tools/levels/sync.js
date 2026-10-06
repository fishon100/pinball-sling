/* 同步關卡表（企劃說「同步關卡表」時 AI 執行）
   1. 企劃把兩份試算表匯出成 .xlsx（或 .csv）放進 tools/levels/in/（檔名：關卡設定表／台面配置表，或 stages／layouts；不進 git）
   2. node tools/levels/sync.js          → 檢查＋列出跟目前 levels.js 的差異（不寫檔）
      node tools/levels/sync.js --write  → 檢查通過才寫出新的 levels.js，並在 Node 裡跑一次會擋的測試
   回傳碼：0＝OK、2＝表格有問題（擋下）、3＝會擋的測試沒過 */
"use strict";
const fs = require("fs"), path = require("path"), { load, JS, parseCsv, diffLines } = require("./load");
const IN = path.join(__dirname, "in"), write = process.argv.includes("--write");

// 企劃可以直接放試算表匯出的 .xlsx（用中文表名或英文代號），也可以放 .csv／.b64；同一份表有好幾個檔時，用最新的那個
const SHEET_NAMES = { stages: ["stages", "關卡設定表"], layouts: ["layouts", "台面配置表"] };
function readInput(name) {
  const found = [];
  for (const base of SHEET_NAMES[name] || [name])
    for (const ext of [".xlsx", ".csv", ".b64"]) {
      const f = path.join(IN, base + ext);
      if (fs.existsSync(f)) found.push({ f, ext, t: fs.statSync(f).mtimeMs });
    }
  if (!found.length) throw new Error(`找不到 tools/levels/in/ 的${SHEET_NAMES[name]?.[1] || name}（.xlsx、.csv 或 .b64）`);
  const { f, ext } = found.sort((a, b) => b.t - a.t)[0];
  console.log(`讀取 ${path.basename(f)}`);
  if (ext === ".xlsx") return require("./xlsx.mjs").xlsxToCsv(fs.readFileSync(f)).trim();
  const raw = fs.readFileSync(f, "utf8").trim();
  return ext === ".csv" ? raw : Buffer.from(raw.replace(/\s+/g, ""), "base64").toString("utf8");
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
const d = diffLines(current, levels);
console.log(d.length ? `這次改了 ${d.length} 處：` : "跟目前的關卡表一樣（沒有改動）");
for (const x of d) console.log(`  ・${x}`);
if (current.source === "editor" && d.length) console.log("⚠ 遊戲目前是關卡編輯器送出的版本：上面標 ⚠ 的都會被表蓋掉。表是舊的話，請先換成 tools/levels/out/ 裡最新的關卡表");
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
