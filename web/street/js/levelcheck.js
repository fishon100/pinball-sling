/* ============================================================
   關卡設定表的轉換與檢查（v3.7.2 申請單 level-config-table）
   - 同步工具（tools/levels/sync.js，Node）和測試頁共用這一份
   - toRows(levels)：把 SR.LEVELS 轉回試算表的一列一列（欄位名稱跟試算表一樣）
   - validate(關卡列, 台面列)：檢查「不能壞掉的規則」中跟欄位、範圍、字元有關的部分，
     回傳 { levels, problems: [{ stage, column, message }] }；要跑物理的檢查（卡球、首領打得倒、磚放得下）在測試頁
   ============================================================ */
"use strict";
var SR = (typeof window !== "undefined" ? window : globalThis).SR || ((typeof window !== "undefined" ? window : globalThis).SR = {});

SR.LevelCheck = (function () {
  const MAX_ROWS = 11, ITEM_IDS = ["bomb", "slow", "save", "ball", "wide"];
  const STAGE_COLS = ["關卡", "名稱", "道具池", "台面配置", "滑板", "球半徑", "拖尾", "彈道預覽秒", "落點提示", "加長球保險秒", "收尾輔助", "首領血量", "首領速度", "首領補磚秒", "標準時間秒"];
  const WALL_COLS = Array.from({ length: MAX_ROWS }, (_, i) => `第${i + 1}排`);
  // 台面配置表的欄位：用開頭比對（括號裡的說明文字可以改）
  const LAYOUT_COLS = { id: "代號", name: "名稱", bumpers: "中柱座標", fish: "阿鰭", rails: "彈力牆", boost: "加速帶" };
  const DISTRICT_NAMES = ["巷口", "地鐵站", "屋頂", "河堤", "市中心大牆"];

  const empty = v => v === undefined || v === null || String(v).trim() === "";
  const num = v => (empty(v) ? NaN : Number(String(v).trim()));
  const yes = v => ["是", "true", "TRUE", "1", "yes", "Y"].includes(String(v).trim());
  const no = v => ["否", "false", "FALSE", "0", "no", "N"].includes(String(v).trim());
  const pairList = (s, n) => empty(s) ? [] : String(s).split(";").map(x => x.trim()).filter(Boolean).map(x => x.split(",").map(y => y.trim()));

  /* SR.LEVELS → 試算表的列 */
  function toRows(levels) {
    const stages = levels.stages.map(s => {
      const r = { "關卡": s.n, "區": Math.floor((s.n - 1) / 10) + 1, "街區": DISTRICT_NAMES[Math.floor((s.n - 1) / 10)], "名稱": s.name,
        "道具池": Array.isArray(s.items) ? s.items.join(",") : "隨機", "台面配置": s.layout, "滑板": s.paddle, "球半徑": s.ball, "拖尾": s.trail,
        "彈道預覽秒": s.preview, "落點提示": s.landing ? "是" : "否", "加長球保險秒": s.ballSave, "收尾輔助": s.finisher ? "是" : "否",
        "首領血量": s.boss ? s.boss.hp : "", "首領速度": s.boss ? s.boss.speed : "", "首領補磚秒": s.boss ? s.boss.regen : "", "標準時間秒": s.par, "備註": s.note || "" };
      WALL_COLS.forEach((c, i) => { r[c] = s.grid[i] || ""; });
      return r;
    });
    const fmt = list => (list || []).map(p => p.join(",")).join("; ");
    const layouts = Object.entries(levels.layouts).map(([id, L]) => ({ "代號": id, "名稱": L.name, "中柱座標（x,y; x,y）": fmt(L.bumpers),
      "阿鰭（y,左界,右界,速度）": L.fish ? [L.fish.y, L.fish.x0, L.fish.x1, L.fish.speed].join(",") : "", "彈力牆（x1,y1,x2,y2,種類; …）": fmt(L.rails), "加速帶左上角（x,y; …）": fmt(L.boost) }));
    return { stages, layouts };
  }

  function validate(stageRows, layoutRows, meta = {}) {
    const problems = [], P = (stage, column, message) => problems.push({ stage, column, message });

    /* ---- 台面配置表 ---- */
    const col = (row, key) => { const k = Object.keys(row).find(h => h.trim().startsWith(LAYOUT_COLS[key])); return k === undefined ? undefined : row[k]; };
    const layouts = {};
    if (!layoutRows || !layoutRows.length) P(null, "台面配置表", "是空的");
    else for (const k of Object.keys(LAYOUT_COLS)) if (k !== "fish" && k !== "rails" && k !== "boost" && col(layoutRows[0], k) === undefined) P(null, "台面配置表", `少了「${LAYOUT_COLS[k]}」欄`);
    for (const row of layoutRows || []) {
      const id = String(col(row, "id") ?? "").trim(); if (!id) continue;
      const where = `台面 ${id}`, L = { name: String(col(row, "name") ?? "").trim() || id, bumpers: [], fish: null, rails: [], boost: [] };
      const xy = (v, what) => { const x = num(v[0]), y = num(v[1]); if (v.length !== 2 || !isFinite(x) || !isFinite(y)) { P(null, where, `${what}「${v.join(",")}」要寫成 x,y`); return null; }
        if (x < 20 || x > 340 || y < 340 || y > 1000) P(null, where, `${what}（${x},${y}）超出台面（x 20～340、y 340～1000）`); return [x, y]; };
      for (const v of pairList(col(row, "bumpers"))) { const p = xy(v, "中柱"); if (p) L.bumpers.push(p); }
      for (const v of pairList(col(row, "boost"))) { const p = xy(v, "加速帶"); if (p) L.boost.push(p); }
      const fish = col(row, "fish");
      if (!empty(fish)) { const f = String(fish).split(",").map(num);
        if (f.length !== 4 || f.some(x => !isFinite(x))) P(null, where, `阿鰭「${fish}」要寫成 y,左界,右界,速度`);
        else if (!(f[1] < f[2]) || f[3] < 0 || f[3] > 400) P(null, where, `阿鰭「${fish}」左界要小於右界、速度 0～400`);
        else L.fish = { y: f[0], x0: f[1], x1: f[2], speed: f[3] }; }
      for (const v of pairList(col(row, "rails"))) { const p = v.slice(0, 4).map(num);
        if (v.length < 4 || p.some(x => !isFinite(x))) { P(null, where, `彈力牆「${v.join(",")}」要寫成 x1,y1,x2,y2,種類`); continue; }
        L.rails.push([...p, v[4] || "rubber"]); }
      if (layouts[id]) P(null, where, "代號重複");
      layouts[id] = L;
    }

    /* ---- 關卡設定表 ---- */
    const stages = [];
    if (!stageRows || !stageRows.length) P(null, "關卡設定表", "是空的");
    else for (const c of STAGE_COLS.concat(WALL_COLS)) if (!(c in stageRows[0])) P(null, "關卡設定表", `少了「${c}」欄（欄位名稱不能改）`);
    const byN = new Map();
    for (const row of stageRows || []) { const n = num(row["關卡"]); if (Number.isInteger(n)) { if (byN.has(n)) P(n, "關卡", "重複"); byN.set(n, row); } }
    for (let n = 1; n <= 50; n++) {
      const row = byN.get(n); if (!row) { P(n, "關卡", "這一關不見了"); continue; }
      const s = { n, name: String(row["名稱"] ?? "").trim() || `第 ${n} 關` };
      const range = (column, lo, hi, key) => { const v = num(row[column]); if (!isFinite(v) || v < lo || v > hi) P(n, column, `要填 ${lo}～${hi} 的數字（現在是「${row[column] ?? ""}」）`); s[key] = v; };
      const bool = (column, key) => { if (yes(row[column])) s[key] = true; else if (no(row[column])) s[key] = false; else P(n, column, `只能填「是」或「否」（現在是「${row[column] ?? ""}」）`); };
      // 道具池
      const pool = String(row["道具池"] ?? "").trim();
      if (pool === "隨機" || pool === "" || pool.toLowerCase() === "random") s.items = "random";
      else { const ids = pool.split(/[,，、\s]+/).filter(Boolean), bad = ids.filter(i => !ITEM_IDS.includes(i));
        if (bad.length) P(n, "道具池", `不認識的道具「${bad.join("、")}」（只能用 隨機 或 ${ITEM_IDS.join("、")}）`);
        s.items = ids.filter(i => ITEM_IDS.includes(i)); }
      // 台面
      s.layout = String(row["台面配置"] ?? "").trim();
      if (!layouts[s.layout]) P(n, "台面配置", `「${s.layout}」不在台面配置表裡`);
      // 滑板
      s.paddle = String(row["滑板"] ?? "").trim().toUpperCase();
      if (!["S", "M", "L"].includes(s.paddle)) P(n, "滑板", `只能是 S／M／L（現在是「${row["滑板"] ?? ""}」）`);
      range("球半徑", 8, 16, "ball"); range("拖尾", 0, 20, "trail"); range("彈道預覽秒", 0, 2, "preview"); range("加長球保險秒", 0, 10, "ballSave"); range("標準時間秒", 10, 600, "par");
      bool("落點提示", "landing"); bool("收尾輔助", "finisher");
      // 首領
      if (n % 10 === 0) { s.boss = {}; const b = (column, lo, hi, key) => { const v = num(row[column]); if (!isFinite(v) || v < lo || v > hi) P(n, column, `首領關要填 ${lo}～${hi}（現在是「${row[column] ?? ""}」）`); s.boss[key] = v; };
        b("首領血量", 1, 200, "hp"); b("首領速度", 0, 300, "speed"); b("首領補磚秒", 1, 30, "regen"); }
      else s.boss = null;
      // 磚牆：第1排～第11排，遇到空白就結束；純數字的排被試算表當成數字也照樣讀
      s.grid = [];
      for (const c of WALL_COLS) {
        const v = row[c]; if (empty(v)) break;
        const line = String(v).trim();
        if (line.length !== 9) P(n, c, `一排要剛好 9 個字（現在 ${line.length} 個：「${line}」）`);
        else if (!/^[.1-5BGX]{9}$/.test(line)) P(n, c, `只能用 . 1～5 B G X（現在是「${line}」）`);
        s.grid.push(line);
      }
      const all = s.grid.join(""), xs = (all.match(/X/g) || []).length, bricks = (all.match(/[1-5BG]/g) || []).length;
      if (n % 10 === 0 && xs !== 1) P(n, "磚牆", `首領關要剛好 1 個 X（現在 ${xs} 個）`);
      if (n % 10 !== 0 && xs) P(n, "磚牆", "只有首領關（第 10、20、30、40、50 關）可以放 X");
      if (!bricks && !xs) P(n, "磚牆", "沒有任何磚");
      if (!empty(row["備註"])) s.note = String(row["備註"]);
      stages.push(s);
    }
    const levels = { version: 1, source: meta.source || "sheet", syncedAt: meta.syncedAt || "", stages, layouts };
    return { levels, problems };
  }

  /* levels.js 的內容（一關一行，方便看 git 差異） */
  function toLevelsJs(levels) {
    const head = "/* 關卡設定（自動產生，不要手改）：企劃在 Google Drive「噴漆闖關 關卡設定」改表後，跟 AI 說「同步關卡表」。\n   source＝" + levels.source + "  syncedAt＝" + (levels.syncedAt || "") + " */\n\"use strict\";\nvar SR = window.SR || (window.SR = {});\n";
    const st = levels.stages.map(s => "    " + JSON.stringify(s)).join(",\n");
    const ly = Object.entries(levels.layouts).map(([id, L]) => "    " + JSON.stringify(id) + ": " + JSON.stringify(L)).join(",\n");
    return head + "SR.LEVELS = {\n  version: " + levels.version + ", source: " + JSON.stringify(levels.source) + ", syncedAt: " + JSON.stringify(levels.syncedAt || "") +
      ",\n  stages: [\n" + st + "\n  ],\n  layouts: {\n" + ly + "\n  }\n};\n";
  }

  /* 兩份關卡表差在哪：[{ n, columns: [...] }] */
  function diff(a, b) {
    const out = [], keys = ["name", "items", "layout", "paddle", "ball", "trail", "preview", "landing", "ballSave", "finisher", "boss", "par", "grid"];
    const names = { name: "名稱", items: "道具池", layout: "台面配置", paddle: "滑板", ball: "球半徑", trail: "拖尾", preview: "彈道預覽秒", landing: "落點提示", ballSave: "加長球保險秒", finisher: "收尾輔助", boss: "首領", par: "標準時間秒", grid: "磚牆" };
    for (let i = 0; i < 50; i++) { const x = a.stages[i], y = b.stages[i]; if (!x || !y) continue;
      const cols = keys.filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])).map(k => names[k]); if (cols.length) out.push({ n: i + 1, columns: cols }); }
    const lids = new Set([...Object.keys(a.layouts), ...Object.keys(b.layouts)]);
    for (const id of lids) if (JSON.stringify(a.layouts[id]) !== JSON.stringify(b.layouts[id])) out.push({ layout: id });
    return out;
  }

  return { toRows, validate, toLevelsJs, diff, STAGE_COLS, WALL_COLS, ITEM_IDS };
})();
