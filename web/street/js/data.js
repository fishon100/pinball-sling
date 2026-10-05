/* ============================================================
   噴漆闖關 SPRAY RUN — 遊戲資料（企劃可以直接改這個檔）
   規格：Obsidian 彈珠專案/08 遊戲規格 v3-噴漆闖關
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

/* ---------- 街區（5 區 × 10 關）---------- */
/* act（起承轉合）只給設計溝通用，不顯示在遊戲畫面上。
   assists：新手輔助，越後面的街區越少（第 3 輪回饋：輔助關掉＝難度提高的因素之一）
     preview＝彈道預覽秒數、timing＝擋板時機提示、ballSave＝額外球保險秒數、finisher＝收尾輔助（只剩幾塊磚時把球往磚的方向吸）
     數值依「新手／進步中／熟練」三種自動玩家量測（見 Obsidian 10 號規格）。
   台面配置見下面的 SR.LAYOUTS／SR.layoutFor（第 5 輪：每關台面不同、第 1 區台面變矮） */
SR.DISTRICTS = [
  { id: "alley",     name: "巷口",     en: "ALLEY",     act: "起", stages: [1, 10],  tempo: 88, root: 45,
    teaser: "遊樂場門口的那條巷子。第一面被打開的牆就在這裡。",
    assists: { preview: 1.0, timing: true, ballSave: 3, finisher: true },
    colors: { a: "#ff3ea5", b: "#ffe14d", c: "#3ee0ff", glow: "#ff7ac6" } },
  { id: "subway",    name: "地鐵站",   en: "SUBWAY",    act: "承", stages: [11, 20], tempo: 92, root: 43,
    teaser: "每天上萬人經過的灰色長廊。",
    assists: { preview: 0.7, timing: true, ballSave: 1.5, finisher: true },
    colors: { a: "#3ee0ff", b: "#b25cff", c: "#ffe14d", glow: "#7fe9ff" } },
  { id: "rooftops",  name: "屋頂",     en: "ROOFTOPS",  act: "轉", stages: [21, 30], tempo: 96, root: 41,
    teaser: "從這裡看得到整座城，也看得到整潔局的大樓。",
    assists: { preview: 0, timing: false, ballSave: 0 },          // v3.7：第 3 區起拿掉彈道預覽（企劃：隱藏球的軌跡也是難度）
    colors: { a: "#ff8a1f", b: "#9dff3a", c: "#ff3ea5", glow: "#ffb066" } },
  { id: "riverside", name: "河堤",     en: "RIVERSIDE", act: "轉", stages: [31, 40], tempo: 84, root: 38,
    teaser: "橋墩下藏著被刷掉一半的舊塗鴉。",
    assists: { preview: 0, timing: false, ballSave: 0 },
    colors: { a: "#2f7bff", b: "#34e89e", c: "#ffe14d", glow: "#6fa6ff" } },
  { id: "downtown",  name: "市中心大牆", en: "DOWNTOWN", act: "合", stages: [41, 50], tempo: 100, root: 45,
    teaser: "整座城最大的一面灰牆。",
    assists: { preview: 0, timing: false, ballSave: 0 },
    colors: { a: "#ff3ea5", b: "#3ee0ff", c: "#ffe14d", glow: "#ffffff", rainbow: true } }
];
/* ---------- 台面配置（第 5 輪回饋）----------
   ・第 1 區台面變矮（top 320＝整個台面一個畫面看完，磚離擋板近）；越後面越高（高台面留給難的街區）
   ・每一關換一種配置，不會每關都長一樣
   bumpers＝彈跳柱（企劃說的「中柱」）、rails＝導軌（rubber＝會彈的橡膠牆）、fish＝會左右游的阿鰭
   座標是台面座標（寬 400，左牆 x=20、發射道內牆 x=340，台面中線 x=180）。M() 會自動補上左右對稱的另一顆 */
const M = list => list.flatMap(([x, y]) => [[x, y], [360 - x, y]]);
SR.LAYOUTS = {
  // 第 1 區：矮台面
  a_pair:    { name: "雙柱",   top: 320, bumpers: M([[78, 664]]) },
  a_tri:     { name: "三角柱", top: 320, bumpers: M([[78, 640], [124, 688], [78, 736]]) },
  a_rubber:  { name: "彈力牆", top: 320, bumpers: M([[96, 664]]), rails: [[23, 610, 23, 730, "rubber"], [337, 610, 337, 730, "rubber"]] },
  a_fish:    { name: "阿鰭",   top: 320, bumpers: M([[70, 716]]), fish: { y: 652, x0: 70, x1: 290, speed: 70 } },
  a_four:    { name: "四柱",   top: 320, bumpers: M([[74, 640], [116, 716]]) },
  /* v3.7（企劃：鏡頭上下移動難操作、球落下時來不及反應）：所有區都用矮台面 top 320，鏡頭不捲動。
     難度改由「中柱變少、球變小、滑板變小、磚變硬、加速帶、軌跡提示變少」負責（申請單 short-tables-all-districts） */
  // 第 2 區：最多 2 對中柱
  b_tri:     { name: "四柱",   top: 320, bumpers: M([[74, 650], [116, 700]]) },
  b_steps:   { name: "階梯",   top: 320, bumpers: M([[70, 640], [110, 720]]) },
  b_fish:    { name: "阿鰭",   top: 320, bumpers: M([[70, 716]]), fish: { y: 652, x0: 70, x1: 290, speed: 90 } },
  // 第 3 區：最多 1 對中柱，1 條加速帶（boost＝加速帶的矩形，箭頭朝上）
  c_pair:    { name: "雙柱",   top: 320, bumpers: M([[78, 690]]), boost: [[152, 763]] },
  c_rubber:  { name: "彈力牆", top: 320, bumpers: M([[96, 690]]), rails: [[23, 610, 23, 730, "rubber"], [337, 610, 337, 730, "rubber"]], boost: [[152, 763]] },
  c_fish:    { name: "阿鰭",   top: 320, bumpers: [], fish: { y: 670, x0: 70, x1: 290, speed: 110 }, boost: [[152, 763]] },
  // 第 4、5 區：最多 1 對中柱，2 條加速帶
  d_classic: { name: "經典",   top: 320, bumpers: M([[60, 700]]), boost: [[82, 773], [222, 773]] },
  // 第 5 區的磚最低到 y 634（多 3 排）：中柱與阿鰭的中心要在 y 680 以下（離磚 ≥ 46，AC-S19）
  d_high:    { name: "高柱",   top: 320, bumpers: M([[100, 690]]), boost: [[82, 773], [222, 773]] },
  d_tri:     { name: "雙柱",   top: 320, bumpers: M([[80, 700]]), boost: [[82, 773], [222, 773]] },
  d_fish:    { name: "阿鰭",   top: 320, bumpers: [], fish: { y: 690, x0: 70, x1: 290, speed: 130 }, boost: [[82, 773], [222, 773]] }
};
for (const id in SR.LAYOUTS) SR.LAYOUTS[id].id = id;
SR.DISTRICT_LAYOUTS = [
  ["a_pair", "a_tri", "a_rubber", "a_four", "a_fish", "a_tri", "a_rubber", "a_fish", "a_four", "a_pair"],
  ["b_tri", "b_steps", "b_fish"],
  ["c_pair", "c_rubber", "c_fish"],
  ["d_tri", "d_high", "d_fish"],
  ["d_high", "d_tri", "d_classic", "d_fish", "d_tri"]
];
// 首領關（每區第 10 關）不要用阿鰭的配置：阿鰭會擋住打首領的路線（AC-S8b 抓到第 50 關 7 分鐘打不完）
/* 滑板尺寸（第 6 輪）：一般關卡＝中；首領關＝小（挑戰）；大＝道具「寬板」作用中（見 physics.js 的 paddleSize） */
// v3.7：第 4、5 區一般關卡也用小滑板
/* v3.7 每區的難度元件：球的半徑（第 3 區起變小，「大罐」強化另外加）、球的拖尾光長度（第 3 區剩一半、第 4、5 區沒有）
   量測定案（擬人新手，AC-S29）：原本規劃 12／12／10.5／9／9，第 5 區每關掉 3.39 顆太難，改成 12／12／11／10.5／10.5
   v3.7.2（申請單 level-config-table）：這些公式只用來產生「第一版關卡表」和當報告的參考（SR.DEFAULTS）；
   遊戲實際照企劃的關卡表（levels.js 的 SR.LEVELS）跑，見下面的 SR.row */
SR.DEFAULTS = {
  paddleSizeFor: n => n % 10 === 0 || n > 30 ? "S" : "M",
  ballRadiusFor: n => n > 30 ? 10.5 : n > 20 ? 11 : 12,
  trailFor: n => n > 30 ? 0 : n > 20 ? 4 : 8,
  layoutFor(n) {
    const d = Math.min(4, Math.floor((n - 1) / 10)), list = SR.DISTRICT_LAYOUTS[d];
    return SR.LAYOUTS[list[(n - 1) % 10 % list.length]];
  }
  // assistsFor 在 rules.js（照街區）
};
SR.row = n => SR.LEVELS && SR.LEVELS.stages ? SR.LEVELS.stages[n - 1] : null;
// 台面配置表 → 跟 SR.LAYOUTS 同樣的格式（同一份表只轉一次，物件固定，方便比對）
SR._layoutCache = null;
SR.tableLayout = function (id) {
  if (!SR.LEVELS) return null;
  if (!SR._layoutCache || SR._layoutCache.src !== SR.LEVELS) SR._layoutCache = { src: SR.LEVELS, map: {} };
  const map = SR._layoutCache.map;
  if (!map[id]) {
    const L = SR.LEVELS.layouts[id]; if (!L) return null;
    map[id] = { id, name: L.name, top: 320, bumpers: L.bumpers || [], rails: L.rails || [], boost: L.boost || [], fish: L.fish || undefined };
  }
  return map[id];
};
SR.paddleSizeFor = n => { const r = SR.row(n); return r ? r.paddle : SR.DEFAULTS.paddleSizeFor(n); };
SR.ballRadiusFor = n => { const r = SR.row(n); return r ? r.ball : SR.DEFAULTS.ballRadiusFor(n); };
SR.trailFor = n => { const r = SR.row(n); return r ? r.trail : SR.DEFAULTS.trailFor(n); };
SR.layoutFor = n => { const r = SR.row(n); return (r && SR.tableLayout(r.layout)) || SR.DEFAULTS.layoutFor(n); };
// 道具池：「隨機」＝5 種都有；或企劃指定的幾種
SR.itemPoolFor = n => { const r = SR.row(n); return r && Array.isArray(r.items) && r.items.length ? r.items : SR.ITEMS.map(i => i.id); };
// 測試用：暫時換一份關卡表
SR.withLevels = function (levels, fn) { const old = SR.LEVELS; SR.LEVELS = levels; try { return fn(); } finally { SR.LEVELS = old; } };
SR.ASSIST_NAMES ={ preview: "彈道預覽", timing: "擋板時機提示", ballSave: "加長球保險", finisher: "收尾輔助" };
SR.districtOf = n => SR.DISTRICTS[Math.min(4, Math.floor((n - 1) / 10))];

/* ---------- 關卡文字圖 ----------
   每列 9 格：. 空格  1/2/3 血量  B 油漆桶（碎掉時炸周圍）  X 首領（只放在首領關）
   第 1 列在 y=96，每列往下 20px；超出圓弧的格子會被自動略過 */
SR.PATTERNS = [
  { name: "HI", rows: [
    ".........",
    ".1.1.111.",
    ".1.1..1..",
    ".111..1..",
    ".1.1..1..",
    ".1.1.111."] },
  { name: "愛心", rows: [
    ".........",
    ".11...11.",
    "1111.1111",
    "111111111",
    ".1111111.",
    "..11111..",
    "...111...",
    "....1...."] },
  { name: "笑臉", rows: [
    ".........",
    "..11111..",
    ".1111111.",
    "11B111B11",
    "111111111",
    "11.111.11",
    ".11...11.",
    "..11111.."] },
  { name: "箭頭", rows: [
    "....2....",
    "...222...",
    "..22222..",
    ".2222222.",
    "...111...",
    "...111...",
    "...111...",
    "...111..."] },
  { name: "條紋", rows: [
    ".........",
    "222222222",
    ".........",
    "111B11B11",
    ".........",
    "222222222",
    ".........",
    "1111B1111"] },
  { name: "金字塔", rows: [
    ".........",
    "....3....",
    "...222...",
    "..11B11..",
    ".1111111.",
    "222222222",
    "111111111"] },
  { name: "棋盤", rows: [
    ".........",
    "1.1.1.1.1",
    ".2.B.2.2.",
    "1.1.1.1.1",
    ".2.2.B.2.",
    "1.1.1.1.1",
    ".2.2.2.2."] },
  { name: "鑽石", rows: [
    "....1....",
    "...121...",
    "..12321..",
    ".123B321.",
    "..12321..",
    "...121...",
    "....1...."] },
  { name: "堡壘", rows: [
    ".........",
    "3.3.3.3.3",
    "333333333",
    "3.......3",
    "3.1BBB1.3",
    "3.11111.3",
    "333...333"] },
  // 第 3 輪回饋：「磚塊疊成文字」很受歡迎，多加幾個
  { name: "GO", rows: [
    ".........",
    ".111.111.",
    ".1...1.1.",
    ".1.1.1.1.",
    ".1.1.1.1.",
    ".111.111."] },
  { name: "YO", rows: [
    ".........",
    "1.1..111.",
    "1.1..1.1.",
    ".1...1.1.",
    ".1...1.1.",
    ".1...111."] },
  { name: "OK", rows: [
    ".........",
    "111.1..1.",
    "1.1.1.1..",
    "1.1.11...",
    "1.1.1.1..",
    "111.1..1."] },
  { name: ":)", rows: [
    ".........",
    "..1...1..",
    "..1...1..",
    ".........",
    ".1.....1.",
    "..1...1..",
    "...111..."] }
];
SR.BOSS_PATTERN = { name: "灰先生", rows: [
  ".........",
  ".........",
  "....X....",
  ".........",
  ".........",
  ".1.2.2.1.",
  "11.1.1.11"] };

/* ---------- 50 關產生器（固定亂數，每次結果相同）---------- */
SR.rng = function (seed) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
};
/* 原本的公式（v3.7.1 以前）：v3.7.2 起只用來產生第一版關卡表、當報告的參考 */
SR.generateStage = function (n) {
  const d = Math.floor((n - 1) / 10), local = (n - 1) % 10, isBoss = local === 9;
  const rnd = SR.rng(n * 7919 + 13);
  const pat = isBoss ? SR.BOSS_PATTERN : SR.PATTERNS[(local + d * 3) % SR.PATTERNS.length];
  let rows = pat.rows.slice();
  if (!isBoss && d >= 1 && rnd() < 0.5) rows = rows.map(r => r.split("").reverse().join(""));   // 左右鏡像
  if (!isBoss && d >= 2) { const extra = Math.min(3, d - 1); for (let i = 0; i < extra; i++) rows.push(rows[rows.length - 1 - (i % 2)]); }
  const hpBonusChance = Math.min(0.65, d * 0.14 + local * 0.025);
  const cells = [];
  rows.forEach((row, r) => row.split("").forEach((ch, c) => {
    if (ch === ".") return;
    if (ch === "X") { cells.push({ r, c, type: "boss" }); return; }
    if (ch === "B") { cells.push({ r, c, type: "bucket", hp: 1 }); return; }
    let hp = +ch;
    if (rnd() < hpBonusChance) hp++;
    if (d >= 3) rnd();                 // 保持亂數取用順序（磚的排列跟以前一樣）
    // v3.7：拿掉 v3.5.5 的「第 4、5 區少 1 血」（那是高台面一關 165 秒才做的；矮台面一關只要 24～32 秒），
    // 所以第 4、5 區的磚比 v3.6 硬 1 血。原本規劃第 3～5 區再 +1 血，量測太難（第 5 區每關掉 1.83 顆以上）不採用
    cells.push({ r, c, type: "brick", hp: Math.min(5, hp), base: +ch });   // base＝圖案上的數字（測試用）
  }));
  // 道具磚★（v3.7.1 申請單 item-capsules）：第 2 關起每關把 2～3 塊 1 血的磚換成道具磚（首領關也有；第 1 關是教學關不放）。
  // 打破會掉下道具膠囊，用滑板接到就生效（見 physics.js 的 capsules）
  if (n >= 2) {
    const want = 2 + (rnd() < 0.5 ? 1 : 0);
    // 先從 1 血的磚挑；不夠的話（例如第 23 關只有 1 塊 1 血）再從血最少的磚挑，道具磚一律 1 血
    for (let i = 0; i < want; i++) {
      const plain = cells.filter(x => x.type === "brick"); if (!plain.length) break;
      const low = Math.min(...plain.map(x => x.hp)), pool = plain.filter(x => x.hp === low);
      const k = pool[Math.floor(rnd() * pool.length)]; k.type = "gift"; k.hp = 1;
    }
  }
  const bricks = cells.filter(x => x.type !== "boss").length;
  return {
    n, district: d, isBoss, name: isBoss ? "首領：灰先生" : pat.name, cells,
    // 首領數值由自動遊玩平衡：帶 9 張隨機強化卡，中位數約 30／80／110／140／100 秒（見 v3 規格平衡紀錄）
    boss: isBoss ? { hp: 18 + d * 9, speed: 45 + d * 18, regen: 7 - d * 0.5 } : null,
    parTime: Math.round(35 + bricks * 2.2 + (isBoss ? 40 : 0) + d * 6)
  };
};
/* v3.7.2：每一關照企劃的關卡表建（磚牆字元：. 空格、1～5 磚血、B 油漆桶、G 道具磚、X 首領）；沒有表時退回原公式 */
SR.buildStage = function (n) {
  const row = SR.row(n);
  if (!row) return SR.generateStage(n);
  const d = Math.floor((n - 1) / 10), isBoss = n % 10 === 0, cells = [];
  row.grid.forEach((line, r) => line.split("").forEach((ch, c) => {
    if (ch === ".") return;
    if (ch === "X") cells.push({ r, c, type: "boss" });
    else if (ch === "B") cells.push({ r, c, type: "bucket", hp: 1 });
    else if (ch === "G") cells.push({ r, c, type: "gift", hp: 1 });
    else cells.push({ r, c, type: "brick", hp: +ch });
  }));
  return { n, district: d, isBoss, name: row.name, cells, items: SR.itemPoolFor(n),
    boss: isBoss && row.boss ? { hp: row.boss.hp, speed: row.boss.speed, regen: row.boss.regen } : null, parTime: row.par };
};

/* ---------- 強化卡 ---------- */
SR.UPGRADES = [
  { id: "split",  name: "分裂彈",   icon: "✸", max: 3, desc: "發射後第一次打到磚塊時，分裂出 +1 顆球" },
  { id: "pierce", name: "穿透漆",   icon: "➶", max: 3, desc: "每次發射，前 2 塊被打碎的磚不會反彈球" },
  { id: "heavy",  name: "重漆",     icon: "⬢", max: 3, desc: "每次擊中 +1 傷害" },
  { id: "big",    name: "大罐",     icon: "●", max: 3, desc: "球變大一圈（半徑 +1.5），更好打中" },
  { id: "splash", name: "漆彈爆",   icon: "✺", max: 2, desc: "磚塊碎掉時，對相鄰磚造成 1 傷害" },
  { id: "power",  name: "強力擋板", icon: "▲", max: 2, desc: "擋板／滑板擊球力道 +12%" },
  { id: "safety", name: "保險罐",   icon: "⛨", max: 2, desc: "球保險時間 +3 秒" },
  { id: "refill", name: "補一罐",   icon: "♥", max: 99, desc: "立刻回 1 顆愛心（最多 5）" },
  { id: "bomb",   name: "連擊火力", icon: "✹", max: 2, desc: "每 15 連擊，在球的位置引爆一顆漆彈" }
];

/* ---------- 成就 ---------- */
SR.ACHIEVEMENTS = [
  { id: "first",     name: "第一筆",     desc: "通過第 1 關" },
  { id: "boss1",     name: "巷口重見天日", desc: "在巷口打倒灰先生" },
  { id: "boss2",     name: "地鐵站的顏色", desc: "在地鐵站打倒灰先生" },
  { id: "boss3",     name: "屋頂上的風", desc: "在屋頂打倒灰先生" },
  { id: "boss4",     name: "河堤的簽名", desc: "在河堤打倒灰先生" },
  { id: "boss5",     name: "自由創作牆", desc: "打完第 50 關，看到結局" },
  { id: "combo20",   name: "手感來了",   desc: "一次擊球打出 20 連擊" },
  { id: "combo50",   name: "停不下來",   desc: "一次擊球打出 50 連擊" },
  { id: "combo100",  name: "噴漆暴風",   desc: "一次擊球打出 100 連擊" },
  { id: "flawless",  name: "無傷過關",   desc: "沒掉愛心通過一關" },
  { id: "multi4",    name: "多球狂歡",   desc: "場上同時有 4 顆球" },
  { id: "bricks500", name: "拆牆專家",   desc: "累計打碎 500 塊磚" },
  { id: "gold10",    name: "金牌收藏家", desc: "累計拿到 10 面金牌（一顆愛心都沒掉）" },
  { id: "silver",    name: "差一點點",   desc: "拿到第一面銀牌（只掉 1 顆愛心）" },
  { id: "lastheart", name: "最後一顆心", desc: "只剩 1 顆愛心時過關" },
  { id: "allgold",   name: "完美街區",   desc: "一整區 10 關都拿金牌" },
  { id: "fish",      name: "吵醒阿鰭",   desc: "一關裡打到阿鰭 10 次" },
  { id: "chain6",    name: "連鎖爆破",   desc: "1 秒內打碎 6 塊磚" },
  { id: "onecoin",   name: "一枚硬幣",   desc: "不續關打完一整區" }
];

/* ---------- 道具（第 2 關起；打破道具磚★掉下膠囊，用滑板接到立刻生效）---------- */
SR.ITEMS = [
  { id: "bomb",  name: "漆彈",   icon: "💣", desc: "每顆球的位置炸開一顆漆彈" },
  { id: "slow",  name: "慢動作", icon: "⏳", desc: "5 秒內時間變慢一半" },
  { id: "save",  name: "球保險", icon: "🛟", desc: "10 秒內掉球，球會回到發射道" },
  { id: "ball",  name: "加一顆", icon: "➕", desc: "從上方多放一顆球" },
  { id: "wide",  name: "寬板",   icon: "🛹", desc: "12 秒內滑板變成大尺寸（經典擋板模式：擋板變長）" }
];

/* ---------- 角色 ---------- */
SR.SPEAKERS = {
  kid:      { name: "小葵",   color: "#ffb21f" },
  pinky:    { name: "噴噴",   color: "#ff3ea5" },
  grey:     { name: "灰先生", color: "#9a9aa3" },
  citizen:  { name: "路人",   color: "#3ee0ff" },
  boy:      { name: "小男孩", color: "#9dff3a" },
  fish:     { name: "阿鰭",   color: "#5fd3c8" }
};

/* ---------- 劇情：童話＋漫畫格 ----------
   童話骨架：很久很久以前（設定）→ 願望 → 魔法幫手 → 三次考驗 → 最低潮 → 真相與轉變 → 從此以後（結局＋寓意）
   設計用的段落：起（序章、巷口）承（地鐵站）轉（屋頂、河堤）合（市中心、結局）— 只在文件裡用，不顯示給玩家
   漫畫格式：每段＝幾頁；每頁＝幾格；同一列的格寬加起來 ≤ 1（1＝整列、0.5＝半列）；h＝格子高度比例
   每一格依序出現：背景框 → 角色 → 旁白框（cap）→ 對話框（say，尾巴指向說話的角色）
   cast：who＝kid／pinky／pinkyGrey／grey／greyYoung／citizen／boy，x/y＝在格子裡的位置（0～1），s＝大小，mood＝表情 */
const K = (mood, x, y, s = 1, flip) => ({ who: "kid", mood, x, y, s, flip });
const PK = (mood, x, y, s = 1) => ({ who: "pinky", mood, x, y, s });
const PG = (mood, x, y, s = 1) => ({ who: "pinkyGrey", mood, x, y, s });
const GR = (mood, x, y, s = 1, flip) => ({ who: "grey", mood, x, y, s, flip });
SR.COMICS = {
  intro: [
    [ { w: 1, h: 1.3, bg: "cityGrey", cap: "很久很久以前，有一座城，叫做灰城。" },
      { w: 0.5, h: 1, bg: "notice", cap: "城裡有一條規定：所有的牆，都必須是灰色。" },
      { w: 0.5, h: 1, bg: "wallPaint", cap: "誰畫上顏色，第二天就會被刷掉。" } ],
    [ { w: 1, h: 1.15, bg: "room", cast: [K("sad", 0.62, 0.95, 1.05)], cap: "小葵最喜歡畫畫。可是她畫的向日葵，只能藏在抽屜裡。" },
      { w: 1, h: 1, bg: "window", cast: [K("sad", 0.3, 1.0, 1.1, true)], say: [{ who: "kid", text: "要是外面的牆，也能開花就好了……", x: 0.68, y: 0.3 }] } ],
    [ { w: 1, h: 1.25, bg: "arcade", cast: [K("wow", 0.28, 0.98, 0.75)], cap: "有一天，小葵走進一間快要拆掉的老遊樂場。角落裡，有一台蓋著布的彈珠台。" },
      { w: 0.5, h: 1, bg: "machine", cap: "她投下口袋裡最後一枚硬幣——" },
      { w: 0.5, h: 1, bg: "machineGlow", cap: "叮！" } ],
    [ { w: 1, h: 1.25, bg: "machineGlow", cast: [PK("wow", 0.62, 0.72, 1.25), K("wow", 0.2, 1.02, 0.85)], say: [{ who: "pinky", text: "哇！好久好久，沒有人來玩了！", x: 0.62, y: 0.16 }] },
      { w: 1, h: 1.05, bg: "machineGlow", cast: [PK("happy", 0.25, 0.8, 1.15)], say: [{ who: "pinky", text: "我是噴噴，住在這台機器裡的噴漆精靈。", x: 0.66, y: 0.3 }] } ],
    [ { w: 1, h: 1.1, bg: "tableMagic", cast: [PK("happy", 0.16, 0.8, 0.8)], say: [{ who: "pinky", text: "這台機器很神奇。你在台子裡打碎一面灰牆——", x: 0.6, y: 0.2 }] },
      { w: 1, h: 1, bg: "alleyColor", say: [{ who: "pinky", text: "外面真正的那面牆，就會開出顏色！", x: 0.5, y: 0.22, tail: "none" }] },
      { w: 1, h: 0.95, bg: "machineGlow", cast: [K("determined", 0.3, 1.02, 1)], say: [{ who: "kid", text: "那就從遊樂場門口那面牆開始吧！", x: 0.68, y: 0.3 }] } ]
  ],
  // 第 5 關前：阿鰭登場（之後的台面有時會有阿鰭游來游去）
  d1_fish: [
    [ { w: 1, h: 1.15, bg: "machineGlow", cast: [{ who: "fish", mood: "sleepy", x: 0.6, y: 0.8, s: 1.2 }], cap: "機台的角落，還住著另一個塗鴉。" },
      { w: 0.5, h: 1.1, bg: "machineGlow", cast: [{ who: "fish", mood: "sleepy", x: 0.5, y: 0.86, s: 0.85 }], say: [{ who: "fish", text: "吵死了……誰在敲牆？", x: 0.5, y: 0.14 }] },
      { w: 0.5, h: 1.1, bg: "machineGlow", cast: [PK("happy", 0.5, 0.84, 0.85)], say: [{ who: "pinky", text: "阿鰭！你醒啦！", x: 0.5, y: 0.14 }] },
      { w: 1, h: 0.95, bg: "tableMagic", cast: [{ who: "fish", mood: "wow", x: 0.26, y: 0.8, s: 0.9 }], say: [{ who: "fish", text: "球別往我身上打……打到我，我就把它吐回去喔。", x: 0.64, y: 0.28 }] } ]
  ],
  d1_boss: [
    [ { w: 1, h: 1.2, bg: "alleyNight", cast: [GR("stern", 0.55, 1.0, 1)], cap: "巷口最後一面牆前，站著一個穿灰色大衣的人。" },
      { w: 0.5, h: 1.15, bg: "alleyNight", cast: [GR("stern", 0.5, 1.08, 1.1)], say: [{ who: "grey", text: "我是整潔局的灰先生。", x: 0.5, y: 0.12 }] },
      { w: 0.5, h: 1.15, bg: "alleyNight", cast: [GR("stern", 0.5, 1.08, 1.1, true)], say: [{ who: "grey", text: "顏色只會讓人吵架。", x: 0.5, y: 0.12 }] },
      { w: 1, h: 0.9, bg: "machineGlow", cast: [PK("wow", 0.22, 0.85, 0.95)], say: [{ who: "pinky", text: "他會在牆上補灰磚，要小心！", x: 0.66, y: 0.32 }] } ]
  ],
  d1_clear: [
    [ { w: 1, h: 1.3, bg: "alleyColor", cap: "第二天早上，巷口的牆開滿了向日葵。" },
      { w: 0.5, h: 1, bg: "alleyColor", cast: [{ who: "citizen", x: 0.5, y: 1.05, s: 1.1 }], say: [{ who: "citizen", text: "這是誰畫的？", x: 0.5, y: 0.2 }] },
      { w: 0.5, h: 1, bg: "machineGlow", cast: [K("happy", 0.3, 1.05, 0.8), PK("happy", 0.72, 0.8, 0.7)], say: [{ who: "pinky", text: "下一站，地鐵站！", x: 0.6, y: 0.2 }] } ]
  ],
  d2_start: [
    [ { w: 1, h: 1.3, bg: "subway", cap: "地鐵站裡每天有好多人經過，可是大家都低著頭。" },
      { w: 1, h: 1, bg: "machineGlow", cast: [PK("wow", 0.2, 0.82, 0.95)], say: [{ who: "pinky", text: "這裡的牆比較厚。金色的磚打碎了會掉出道具，記得用喔！", x: 0.64, y: 0.32 }] } ]
  ],
  d2_boss: [
    [ { w: 1, h: 1.1, bg: "subway", cast: [GR("stern", 0.3, 1.05, 1.15)], say: [{ who: "grey", text: "明天，我就派人把它們全部刷掉。", x: 0.68, y: 0.25 }] },
      { w: 1, h: 1, bg: "machineGlow", cast: [K("determined", 0.7, 1.02, 1, true)], say: [{ who: "kid", text: "那我們就畫得比你刷得快！", x: 0.32, y: 0.28 }] } ]
  ],
  d2_clear: [
    [ { w: 1, h: 1.3, bg: "subwayColor", cap: "那天，地鐵站裡的人，第一次抬起頭看牆。" },
      { w: 1, h: 1, bg: "chalk", cast: [{ who: "boy", x: 0.35, y: 1.0, s: 1 }], cap: "有個小男孩，拿粉筆在地上畫了一顆太陽。" } ]
  ],
  d3_start: [
    [ { w: 1, h: 1.2, bg: "rooftop", cast: [K("happy", 0.3, 1.0, 0.8), PK("happy", 0.55, 0.85, 0.6)], cap: "小葵和噴噴爬上屋頂，看見城裡一塊一塊亮了起來。" },
      { w: 1, h: 1.05, bg: "arcadeNight", cast: [GR("stern", 0.6, 1.0, 0.9)], cap: "可是那天晚上，灰先生走進了老遊樂場。" } ],
    [ { w: 0.5, h: 1, bg: "unplug", cap: "他拔掉了機台背後的一條線。" },
      { w: 0.5, h: 1, bg: "machineDark", cast: [PG("sad", 0.5, 0.8, 0.95)], say: [{ who: "pinky", text: "我的顏色……", x: 0.5, y: 0.2 }] },
      { w: 1, h: 1.05, bg: "machineDark", cast: [K("determined", 0.3, 1.02, 1), PG("sad", 0.75, 0.8, 0.7)], say: [{ who: "kid", text: "噴噴，別怕。我會繼續打下去。", x: 0.62, y: 0.2 }] },
      { w: 1, h: 0.65, bg: "black", cap: "從這裡開始，噴噴能幫的忙越來越少了。" } ]
  ],
  d3_boss: [
    [ { w: 1, h: 1.1, bg: "rooftop", cast: [GR("stern", 0.3, 1.05, 1.15)], say: [{ who: "grey", text: "這台機器是我修好的。我比誰都清楚它。", x: 0.68, y: 0.25 }] },
      { w: 1, h: 1, bg: "rooftop", cast: [K("wow", 0.7, 1.02, 1, true)], say: [{ who: "kid", text: "……你修過這台機器？", x: 0.32, y: 0.28 }] } ]
  ],
  d3_clear: [
    [ { w: 1, h: 1.3, bg: "rooftopColor", cast: [GR("back", 0.5, 1.02, 0.9)], cap: "灰先生沒有回答。他只是看著屋頂下那片彩色的街。" },
      { w: 1, h: 1, bg: "machineDark", cast: [PG("sad", 0.22, 0.82, 0.95)], say: [{ who: "pinky", text: "去河堤吧。我好像想起了一件事。", x: 0.64, y: 0.3 }] } ]
  ],
  d4_start: [
    [ { w: 1, h: 1.2, bg: "riverside", cap: "河堤的橋墩下，有一整排被刷掉一半的舊畫。" },
      { w: 1, h: 1, bg: "signature", cast: [PG("wow", 0.82, 0.85, 0.7)], say: [{ who: "pinky", text: "這個簽名……跟機台側面的一模一樣。", x: 0.42, y: 0.2 }] } ],
    [ { w: 1, h: 1.2, bg: "memoryWall", cast: [{ who: "greyYoung", mood: "happy", x: 0.65, y: 1.02, s: 1 }], cap: "很久以前，有個年輕人畫滿了這裡的牆，也親手做了一台彈珠台。", sepia: true },
      { w: 1, h: 1.1, bg: "memoryGrey", cast: [{ who: "greyYoung", mood: "back", x: 0.5, y: 1.02, s: 1 }], cap: "可是一夜之間，他的畫全被刷成了灰色。從那天起，他再也沒有畫過畫。", sepia: true },
      { w: 1, h: 0.95, bg: "riverside", cast: [K("sad", 0.3, 1.02, 1)], say: [{ who: "kid", text: "原來灰先生不是討厭顏色……他是怕再被刷掉一次。", x: 0.66, y: 0.3 }] } ]
  ],
  d4_boss: [
    [ { w: 1, h: 1.1, bg: "riverside", cast: [GR("stern", 0.3, 1.05, 1.15)], say: [{ who: "grey", text: "別碰那些舊東西。它們已經不在了。", x: 0.68, y: 0.25 }] },
      { w: 1, h: 1, bg: "riverside", cast: [K("determined", 0.7, 1.02, 1, true)], say: [{ who: "kid", text: "它們還在，只是被蓋住了。就像磚底下的顏色一樣。", x: 0.34, y: 0.28 }] } ]
  ],
  d4_clear: [
    [ { w: 1, h: 1, bg: "riversideColor", cast: [GR("sad", 0.3, 1.05, 1.1)], say: [{ who: "grey", text: "……如果又被刷掉呢？", x: 0.68, y: 0.25 }] },
      { w: 1, h: 1, bg: "riversideColor", cast: [K("happy", 0.7, 1.02, 1, true)], say: [{ who: "kid", text: "那就再畫一次。這一次，你不是一個人。", x: 0.34, y: 0.26 }] },
      { w: 1, h: 0.95, bg: "machineGlow", cast: [PK("happy", 0.5, 0.82, 0.95)], cap: "噴噴的臉頰，悄悄回來了一點粉紅色。" } ],
    [ { w: 1, h: 1.1, bg: "memoryWall", cast: [{ who: "fish", mood: "sleepy", x: 0.5, y: 0.82, s: 1.1 }], cap: "年輕的灰先生在橋墩上畫的第一個塗鴉，是一條愛睏的魚。", sepia: true },
      { w: 1, h: 1, bg: "riversideColor", cast: [{ who: "fish", mood: "wow", x: 0.28, y: 0.8, s: 0.95 }], say: [{ who: "fish", text: "……我想起來了。是他把我畫出來的。", x: 0.66, y: 0.28 }] } ]
  ],
  d5_start: [
    [ { w: 1, h: 1.3, bg: "bigwall", cap: "城中心的大牆，是灰城最大、最灰的一面牆。" },
      { w: 0.5, h: 1.15, bg: "bigwall", cast: [GR("stern", 0.5, 1.08, 1.05)], say: [{ who: "grey", text: "最後一面。打得開，我就不再擋你。", x: 0.5, y: 0.13 }] },
      { w: 0.5, h: 1.15, bg: "machineGlow", cast: [K("determined", 0.5, 1.05, 1.05)], say: [{ who: "kid", text: "一言為定！", x: 0.5, y: 0.13 }] } ]
  ],
  d5_boss: [
    [ { w: 1, h: 1.1, bg: "bigwall", cast: [GR("stern", 0.5, 1.1, 1.3)], say: [{ who: "grey", text: "讓我看看，你們的顏色有多頑固。", x: 0.5, y: 0.2 }] } ]
  ],
  ending: [
    [ { w: 1, h: 1.4, bg: "bigwallColor", cap: "最後一塊灰磚碎開的時候，大牆亮了起來。灰漆底下，是一幅沒有畫完的向日葵。" },
      { w: 1, h: 1, bg: "bigwallColor", cast: [GR("sad", 0.3, 1.05, 1.15)], say: [{ who: "grey", text: "……這是我年輕時畫的。我以為它早就不在了。", x: 0.68, y: 0.26 }] } ],
    [ { w: 1, h: 1.1, bg: "bigwallColor", cast: [K("happy", 0.28, 1.02, 1), GR("sad", 0.75, 1.05, 1, true)], say: [{ who: "kid", text: "我們一起把它畫完吧。", x: 0.42, y: 0.18 }] },
      { w: 1, h: 1.3, bg: "cityColor", cap: "從此以後，灰城的牆上開滿了花。大家改叫它「彩城」。" } ],
    [ { w: 1, h: 1.3, bg: "arcadeLit", cast: [PK("happy", 0.5, 0.78, 1.1)], cap: "那台老彈珠台，到現在都還亮著，等著下一個投下硬幣的孩子。" },
      { w: 1, h: 0.8, bg: "black", cap: "顏色可以被蓋住，但不會消失。　——完——" } ]
  ]
};
/* 劇情回放（地圖上的「劇情回放」）用的標題，照播放順序 */
SR.COMIC_TITLES = {
  intro: "序章：灰城", d1_fish: "阿鰭醒了", d1_boss: "整潔局的灰先生", d1_clear: "巷口開花",
  d2_start: "地鐵站", d2_boss: "比刷的快", d2_clear: "抬起頭",
  d3_start: "拔掉插頭", d3_boss: "修過機台的人", d3_clear: "屋頂上的風",
  d4_start: "橋墩下的簽名", d4_boss: "被蓋住的東西", d4_clear: "再畫一次",
  d5_start: "最後一面牆", d5_boss: "頑固的顏色", ending: "彩城"
};
/* 每一關開始前／後要播哪段漫畫 */
SR.storyBefore = function (n) {
  if (n === 1) return ["intro"];
  if (n === 5) return ["d1_fish"];
  const d = Math.floor((n - 1) / 10), local = (n - 1) % 10;
  const keys = [];
  if (local === 0 && d > 0) keys.push(`d${d + 1}_start`);
  if (local === 9) keys.push(`d${d + 1}_boss`);
  return keys;
};
SR.storyAfter = function (n) {
  if (n % 10 !== 0) return [];
  return n === 50 ? ["ending"] : [`d${n / 10}_clear`];
};
SR.CREDITS = [
  ["企劃", "你"],
  ["程式／關卡／劇本", "Claude（AI 協作）"],
  ["美術", "程式繪製占位圖（待 AI 圖像＋美術精修）"],
  ["音樂／音效", "WebAudio 即時合成（待 AI 音樂替換）"],
  ["特別感謝", "童年的打磚塊"]
];
