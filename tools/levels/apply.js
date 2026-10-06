/* 套用關卡修改（企劃在關卡編輯器按「送出修改」後，說「套用關卡修改」時 AI 執行）
   0. 先 git pull：修改檔是編輯器送到 GitHub 的 tools/levels/edits/*.json
   1. node tools/levels/apply.js          → 依送出順序合併、檢查、列出改了哪幾關（不寫檔）→ 給企劃確認
   2. node tools/levels/apply.js --write  → 欄位檢查＋會擋的測試都過，才寫出 levels.js、把修改檔搬到 edits/applied/、
                                            產生 out/關卡設定表.xlsx、out/台面配置表.xlsx（給企劃換掉 Google Drive 上的舊表）
   node tools/levels/apply.js --export → 不套用任何修改，只用目前的遊戲產生 out/ 的兩份關卡表（企劃要最新的表時）
   回傳碼：0＝OK、1＝沒有修改檔、2＝修改檔或欄位有問題、3＝會擋的測試沒過（2、3 都不會寫任何檔） */
"use strict";
const fs = require("fs"), path = require("path"), { load, JS } = require("./load");
const EDITS = path.join(__dirname, "edits"), OUT = path.join(__dirname, "out");
const STAGE_KEYS = ["name", "items", "layout", "paddle", "ball", "trail", "preview", "landing", "ballSave", "finisher", "boss", "par", "grid", "note"];
const taipei = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace("T", " ") + "（台北）";

// 用關卡資料產生兩份關卡表（欄位跟企劃的試算表一樣）
function exportTables(levels, outDir = OUT, LC) {
  const { rowsToXlsx } = require("./xlsx-write.mjs"), out = LC.toRows(levels);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "關卡設定表.xlsx"), rowsToXlsx(out.stages, "關卡設定表"));
  fs.writeFileSync(path.join(outDir, "台面配置表.xlsx"), rowsToXlsx(out.layouts, "台面配置表"));
}

async function applyEdits({ editsDir = EDITS, levelsJsPath = path.join(JS, "levels.js"), outDir = OUT, write = false, log = console.log } = {}) {
  const files = fs.existsSync(editsDir) ? fs.readdirSync(editsDir).filter(f => f.endsWith(".json")).sort() : [];
  if (!files.length) {
    log("沒有還沒套用的修改（tools/levels/edits/ 是空的）。企劃在編輯器送出後，先 git pull 再試一次");
    return { code: 1, message: "沒有修改檔" };
  }
  const oldCode = fs.readFileSync(levelsJsPath, "utf8");
  const SR = load(["data.js", { code: oldCode, name: "levels.js" }, "levelcheck.js"]).SR, LC = SR.LevelCheck, current = SR.LEVELS;

  // 1. 依送出順序合併（同一關後送的蓋前面的）
  const merged = JSON.parse(JSON.stringify(current));
  for (const f of files) {
    let e;
    try { e = JSON.parse(fs.readFileSync(path.join(editsDir, f), "utf8")); }
    catch (err) { log(`❌ ${f} 不是正確的修改檔：${err.message}`); return { code: 2, message: `${f} 讀不懂` }; }
    log(`讀取 ${f}${e.note ? `「${e.note}」` : ""}${e.by ? `（${e.by}）` : ""}`);
    for (const [n, ch] of Object.entries(e.stages || {})) {
      const s = merged.stages[+n - 1];
      if (!s) { log(`❌ ${f}：沒有第 ${n} 關`); return { code: 2, message: `沒有第 ${n} 關` }; }
      for (const k of STAGE_KEYS) if (k in ch) s[k] = ch[k];
    }
    for (const [id, L] of Object.entries(e.layouts || {})) merged.layouts[id] = L;
  }

  // 2. 跟「同步關卡表」一樣的欄位檢查（轉成表的列再驗，規則只有一份）
  const rows = LC.toRows(merged);
  const { levels, problems } = LC.validate(rows.stages, rows.layouts, { source: "editor", syncedAt: taipei() });
  if (problems.length) {
    log(`❌ 修改有 ${problems.length} 個問題，這次不套用：`);
    for (const p of problems) log(`  ・${p.stage ? `第 ${p.stage} 關・` : ""}${p.column}：${p.message}`);
    return { code: 2, message: problems.map(p => p.message).join("；"), problems };
  }
  const changes = LC.diff(current, levels);
  log(changes.length ? `這次改了 ${changes.length} 處：` : "跟目前的遊戲一樣（沒有改動）");
  for (const x of changes) log(x.layout ? `  ・台面 ${x.layout}` : `  ・第 ${x.n} 關：${x.columns.join("、")}`);
  if (!write) { log("（只檢查，沒有寫檔；企劃確認後加 --write）"); return { code: 0, changes }; }

  // 3. 先在記憶體裡跑會擋的測試（卡球、柱子貼磚、首領打不倒…），全過才寫檔
  const newCode = LC.toLevelsJs(levels);
  const ctx = load(["data.js", { code: newCode, name: "levels.js" }, "levelcheck.js", "tuning.js", "physics.js", "rules.js", "comic.js", "tests.js"]);
  const T = await ctx.SR.loadTuning(); ctx.SR.T = T;
  const res = ctx.SR.Tests.run(T, { node: true }), block = res.filter(r => !r.report), fail = block.filter(r => !r.pass);
  for (const r of res.filter(r => r.report)) log(`  ${r.pass ? "ⓘ" : "⚠"} 報告 ${r.id}（概略，以 test.html 為準）：${r.value}`);
  if (fail.length) {
    log(`❌ 會擋的測試 ${fail.length} 項沒過，這次不套用（什麼檔都沒改）：`);
    for (const r of fail) log(`  ✗ ${r.id} ${r.name}：${r.value}`);
    return { code: 3, message: fail.map(r => `${r.id}：${r.value}`).join("；"), changes };
  }

  // 4. 寫入：levels.js → 修改檔搬到 applied/ → 最新的兩份關卡表
  fs.writeFileSync(levelsJsPath, newCode, "utf8");
  const applied = path.join(editsDir, "applied");
  fs.mkdirSync(applied, { recursive: true });
  for (const f of files) fs.renameSync(path.join(editsDir, f), path.join(applied, f));
  exportTables(levels, outDir, LC);
  log(`✅ 已套用（會擋的測試 ${block.length}/${block.length} 通過）：寫出 levels.js，修改檔搬到 edits/applied/，最新關卡表在 tools/levels/out/`);
  return { code: 0, changes };
}

module.exports = { applyEdits, exportTables };

if (require.main === module) {
  if (process.argv.includes("--export")) {
    const SR = load(["data.js", "levels.js", "levelcheck.js"]).SR;
    exportTables(SR.LEVELS, OUT, SR.LevelCheck);
    console.log("✅ 已用目前的遊戲產生 tools/levels/out/關卡設定表.xlsx、台面配置表.xlsx");
  } else applyEdits({ write: process.argv.includes("--write") }).then(r => process.exit(r.code));
}
