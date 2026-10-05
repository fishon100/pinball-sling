/* 把目前的 levels.js 轉成兩份 CSV（跟試算表一樣的欄位），放到 tools/levels/in/：
   用來自我測試 sync.js，或企劃要「把遊戲現在的關卡重新匯出到試算表」時使用 */
"use strict";
const fs = require("fs"), path = require("path"), { load } = require("./load");
const c = load(["data.js", "levels.js", "levelcheck.js"]), r = c.SR.LevelCheck.toRows(c.SR.LEVELS);
const q = v => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = rows => { const h = Object.keys(rows[0]); return [h.map(q).join(",")].concat(rows.map(x => h.map(k => q(x[k])).join(","))).join("\n"); };
const out = path.join(__dirname, "in"); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "stages.csv"), csv(r.stages), "utf8");
fs.writeFileSync(path.join(out, "layouts.csv"), csv(r.layouts), "utf8");
console.log("寫出 tools/levels/in/stages.csv、layouts.csv");
