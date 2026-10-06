// 關卡工具的測試（提案 level-editor-submit）：套用編輯器修改、產生關卡表、同步舊表時的警告
// 執行：node --test tools/levels/
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path");
const { load, JS, parseCsv, diffLines } = require("./load");
const { applyEdits } = require("./apply");
const { xlsxToCsv } = require("./xlsx.mjs");

const LEVELS_JS = fs.readFileSync(path.join(JS, "levels.js"), "utf8");
const levelsOf = code => load(["data.js", { code, name: "levels.js" }, "levelcheck.js"]).SR;
function sandbox(edits) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "levels-")), editsDir = path.join(dir, "edits");
  fs.mkdirSync(editsDir);
  fs.writeFileSync(path.join(dir, "levels.js"), LEVELS_JS);
  edits.forEach((e, i) => fs.writeFileSync(path.join(editsDir, `20261007-12000${i}.json`), JSON.stringify(e)));
  return { dir, editsDir, levelsJsPath: path.join(dir, "levels.js"), outDir: path.join(dir, "out") };
}
const quiet = { log() {} };
const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);   // 遊戲資料是在另一個 vm 裡建的，用 JSON 比較

test("套用：修改檔改第 3 關磚牆 → levels.js、applied/、out 的關卡表都更新", async () => {
  const sb = sandbox([{ version: 1, note: "測試", stages: { 3: { grid: ["333333333"] } }, layouts: {} }]);
  const r = await applyEdits({ ...sb, write: true, ...quiet });
  assert.equal(r.code, 0, r.message);
  const SR = levelsOf(fs.readFileSync(sb.levelsJsPath, "utf8"));
  same(SR.LEVELS.stages[2].grid, ["333333333"]);
  assert.equal(SR.LEVELS.source, "editor");
  same(fs.readdirSync(sb.editsDir).filter(f => f.endsWith(".json")), []);
  assert.equal(fs.readdirSync(path.join(sb.editsDir, "applied")).length, 1);
  const rows = parseCsv(xlsxToCsv(fs.readFileSync(path.join(sb.outDir, "關卡設定表.xlsx"))));
  assert.equal(rows[2]["第1排"], "333333333");
  assert.ok(fs.existsSync(path.join(sb.outDir, "台面配置表.xlsx")));
});

test("套用：中柱離磚 20 px 的修改被擋下，levels.js 不變", async () => {
  // 第 1 關（台面 a_pair）最下面一排磚的正下方 20 px 放一顆中柱
  const ctx = load(["data.js", "levels.js", "levelcheck.js", "tuning.js", "physics.js"]), P = ctx.SR.Physics;
  const st = ctx.SR.LEVELS.stages[0], r = st.grid.length - 1, c = st.grid[r].split("").findIndex(ch => ch !== ".");
  const rc = P.cellRect(r, c, 320), L = JSON.parse(JSON.stringify(ctx.SR.LEVELS.layouts.a_pair));
  L.bumpers.push([Math.round(rc.x + rc.w / 2), Math.round(rc.y + rc.h + 20)]);   // 中柱中心離磚 20 px（規定要 46 以上）
  const sb = sandbox([{ version: 1, stages: {}, layouts: { a_pair: L } }]);
  const res = await applyEdits({ ...sb, write: true, ...quiet });
  assert.notEqual(res.code, 0);
  assert.equal(fs.readFileSync(sb.levelsJsPath, "utf8"), LEVELS_JS);
  assert.equal(fs.readdirSync(sb.editsDir).filter(f => f.endsWith(".json")).length, 1);
});

test("產生的兩份關卡表拿去同步，跟遊戲沒有任何差異", async () => {
  const sb = sandbox([{ version: 1, stages: { 7: { paddle: "L" } }, layouts: {} }]);
  const r = await applyEdits({ ...sb, write: true, ...quiet });
  assert.equal(r.code, 0, r.message);
  const SR = levelsOf(fs.readFileSync(sb.levelsJsPath, "utf8")), LC = SR.LevelCheck;
  const read = f => parseCsv(xlsxToCsv(fs.readFileSync(path.join(sb.outDir, f))));
  const { levels, problems } = LC.validate(read("關卡設定表.xlsx"), read("台面配置表.xlsx"));
  same(problems, []);
  same(LC.diff(SR.LEVELS, levels), []);
});

test("同步舊表：遊戲是編輯器改過的，差異都標「⚠ 會蓋掉編輯器的修改」", async () => {
  const sb = sandbox([{ version: 1, stages: { 3: { grid: ["333333333"] } }, layouts: {} }]);   // 第 12 關有「一定要有道具磚」的測試，改用第 3 關
  await applyEdits({ ...sb, write: true, ...quiet });
  const edited = levelsOf(fs.readFileSync(sb.levelsJsPath, "utf8")).LEVELS, before = { ...JSON.parse(JSON.stringify(levelsOf(LEVELS_JS).LEVELS)), source: "editor" };   // 遊戲是編輯器版本
  const lines = diffLines(edited, before);
  assert.ok(lines.some(l => /第 3 關/.test(l) && /⚠ 會蓋掉編輯器的修改/.test(l)), lines.join("\n"));
  // 遊戲是從表同步來的（source＝sheet）：不標。自己做一份 sheet 版，不靠目前 levels.js 剛好是哪一種
  const fromSheet = { ...JSON.parse(JSON.stringify(before)), source: "sheet" };
  assert.ok(diffLines(fromSheet, edited).every(l => !/⚠/.test(l)));
});
