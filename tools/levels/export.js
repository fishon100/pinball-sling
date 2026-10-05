/* 用原本的公式（SR.generateStage、SR.DEFAULTS、SR.LAYOUTS）產生第一版 web/street/js/levels.js
   用法：node tools/levels/export.js        （只在建立第一版、或要「重設回公式」時用） */
"use strict";
const fs = require("fs"), path = require("path"), { load, JS } = require("./load");
const ctx = load(["data.js", "levelcheck.js", "rules.js"]);
const SR = ctx.SR, R = SR.Rules, D = SR.DEFAULTS;

const stages = [];
for (let n = 1; n <= 50; n++) {
  const st = SR.generateStage(n), a = D.assistsFor(n);
  const rows = Math.max(...st.cells.map(c => c.r)) + 1, grid = Array.from({ length: rows }, () => Array(9).fill("."));
  for (const c of st.cells) grid[c.r][c.c] = c.type === "boss" ? "X" : c.type === "bucket" ? "B" : c.type === "gift" ? "G" : String(c.hp);
  stages.push({ n, name: st.name, items: "random", layout: D.layoutFor(n).id, paddle: D.paddleSizeFor(n), ball: D.ballRadiusFor(n), trail: D.trailFor(n),
    preview: a.preview || 0, landing: !!a.timing, ballSave: a.ballSave || 0, finisher: !!a.finisher,
    boss: st.boss ? { hp: st.boss.hp, speed: st.boss.speed, regen: st.boss.regen } : null, par: st.parTime, grid: grid.map(r => r.join("")) });
}
const layouts = {};
for (const [id, L] of Object.entries(SR.LAYOUTS)) layouts[id] = { name: L.name, bumpers: L.bumpers || [], fish: L.fish ? { y: L.fish.y, x0: L.fish.x0, x1: L.fish.x1, speed: L.fish.speed } : null, rails: (L.rails || []).map(r => [r[0], r[1], r[2], r[3], r[4] || "rubber"]), boost: L.boost || [] };
const levels = { version: 1, source: "export", syncedAt: "2026-10-05（第一版，從 v3.7.1 公式匯出）", stages, layouts };

// 自我檢查：轉成試算表的列再讀回來，必須一模一樣、而且沒有問題
const rows = SR.LevelCheck.toRows(levels), back = SR.LevelCheck.validate(rows.stages, rows.layouts, { source: levels.source, syncedAt: levels.syncedAt });
if (back.problems.length) { console.error("第一版就有問題：", back.problems.slice(0, 5)); process.exit(1); }
const d = SR.LevelCheck.diff(levels, back.levels);
if (d.length) { console.error("轉回來不一樣：", JSON.stringify(d.slice(0, 5))); process.exit(1); }
fs.writeFileSync(path.join(JS, "levels.js"), SR.LevelCheck.toLevelsJs(levels), "utf8");
console.log(`寫出 levels.js：${stages.length} 關、${Object.keys(layouts).length} 種台面，轉回試算表再讀回 0 差異`);
