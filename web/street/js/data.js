/* ============================================================
   噴漆闖關 SPRAY RUN — 遊戲資料（企劃可以直接改這個檔）
   規格：Obsidian 彈珠專案/08 遊戲規格 v3-噴漆闖關
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

/* ---------- 街區（5 區 × 10 關）---------- */
/* act（起承轉合）只給設計溝通用，不顯示在遊戲畫面上。
   assists：新手輔助，越後面的街區越少（第 3 輪回饋：輔助關掉＝難度提高的因素之一）
     preview＝彈道預覽秒數、timing＝擋板時機提示、centerPost＝擋板中間救球柱的次數（每關；99＝不限）、ballSave＝額外球保險秒數、finisher＝收尾輔助（只剩幾塊磚時把球往磚的方向吸）
     數值依「新手／進步中／熟練」三種自動玩家量測（見 Obsidian 10 號規格）。中段反彈柱量測後沒有幫助（還會擋住往上打的球），已拿掉 */
SR.DISTRICTS = [
  { id: "alley",     name: "巷口",     en: "ALLEY",     act: "起", stages: [1, 10],  tempo: 88, root: 45,
    teaser: "遊樂場門口的那條巷子。第一面被打開的牆就在這裡。",
    assists: { preview: 1.0, timing: true, centerPost: 99, ballSave: 3, finisher: true },
    colors: { a: "#ff3ea5", b: "#ffe14d", c: "#3ee0ff", glow: "#ff7ac6" } },
  { id: "subway",    name: "地鐵站",   en: "SUBWAY",    act: "承", stages: [11, 20], tempo: 92, root: 43,
    teaser: "每天上萬人經過的灰色長廊。",
    assists: { preview: 0.7, timing: true, centerPost: 8, ballSave: 1.5, finisher: true },
    colors: { a: "#3ee0ff", b: "#b25cff", c: "#ffe14d", glow: "#7fe9ff" } },
  { id: "rooftops",  name: "屋頂",     en: "ROOFTOPS",  act: "轉", stages: [21, 30], tempo: 96, root: 41,
    teaser: "從這裡看得到整座城，也看得到整潔局的大樓。",
    assists: { preview: 0.4, timing: false, centerPost: 4, ballSave: 0 },
    colors: { a: "#ff8a1f", b: "#9dff3a", c: "#ff3ea5", glow: "#ffb066" } },
  { id: "riverside", name: "河堤",     en: "RIVERSIDE", act: "轉", stages: [31, 40], tempo: 84, root: 38,
    teaser: "橋墩下藏著被刷掉一半的舊塗鴉。",
    assists: { preview: 0, timing: false, centerPost: 0, ballSave: 0 },
    colors: { a: "#2f7bff", b: "#34e89e", c: "#ffe14d", glow: "#6fa6ff" } },
  { id: "downtown",  name: "市中心大牆", en: "DOWNTOWN", act: "合", stages: [41, 50], tempo: 100, root: 45,
    teaser: "整座城最大的一面灰牆。",
    assists: { preview: 0, timing: false, centerPost: 0, ballSave: 0 },
    colors: { a: "#ff3ea5", b: "#3ee0ff", c: "#ffe14d", glow: "#ffffff", rainbow: true } }
];
SR.ASSIST_NAMES = { preview: "彈道預覽", timing: "擋板時機提示", centerPost: "救球柱", ballSave: "加長球保險", finisher: "收尾輔助" };
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
SR.buildStage = function (n) {
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
    if (d >= 3 && rnd() < hpBonusChance * 0.4) hp++;
    cells.push({ r, c, type: "brick", hp: Math.min(5, hp) });
  }));
  // 道具磚★：第 2 區起，每關把 1～2 塊 1 血的磚換成道具磚
  if (d >= 1) {
    const plain = cells.filter(x => x.type === "brick" && x.hp === 1);
    const want = Math.min(plain.length, isBoss ? 1 : 1 + (rnd() < 0.5 ? 1 : 0));
    for (let i = 0; i < want; i++) { const k = plain.splice(Math.floor(rnd() * plain.length), 1)[0]; k.type = "gift"; }
  }
  const bricks = cells.filter(x => x.type !== "boss").length;
  return {
    n, district: d, isBoss, name: isBoss ? "首領：灰先生" : pat.name, cells,
    // 首領數值由自動遊玩平衡：帶 9 張隨機強化卡，中位數約 30／80／110／140／100 秒（見 v3 規格平衡紀錄）
    boss: isBoss ? { hp: 18 + d * 9, speed: 45 + d * 18, regen: 7 - d * 0.5 } : null,
    parTime: Math.round(35 + bricks * 2.2 + (isBoss ? 40 : 0) + d * 6)
  };
};

/* ---------- 強化卡 ---------- */
SR.UPGRADES = [
  { id: "split",  name: "分裂彈",   icon: "✸", max: 3, desc: "發射後第一次打到磚塊時，分裂出 +1 顆球" },
  { id: "pierce", name: "穿透漆",   icon: "➶", max: 3, desc: "每次發射，前 2 塊被打碎的磚不會反彈球" },
  { id: "heavy",  name: "重漆",     icon: "⬢", max: 3, desc: "每次擊中 +1 傷害" },
  { id: "big",    name: "大罐",     icon: "●", max: 3, desc: "球變大一圈（半徑 +1.5），更好打中" },
  { id: "splash", name: "漆彈爆",   icon: "✺", max: 2, desc: "磚塊碎掉時，對相鄰磚造成 1 傷害" },
  { id: "power",  name: "強力擋板", icon: "▲", max: 2, desc: "擋板擊球力道 +12%" },
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
  { id: "stars30",   name: "滿天星",     desc: "累計拿到 30 顆星" },
  { id: "chain6",    name: "連鎖爆破",   desc: "1 秒內打碎 6 塊磚" },
  { id: "onecoin",   name: "一枚硬幣",   desc: "不續關打完一整區" }
];

/* ---------- 道具（第 2 區起；道具磚★掉落、街區獎勵）---------- */
SR.ITEMS = [
  { id: "bomb",  name: "漆彈",   icon: "💣", desc: "每顆球的位置炸開一顆漆彈" },
  { id: "slow",  name: "慢動作", icon: "⏳", desc: "5 秒內時間變慢一半" },
  { id: "guard", name: "護欄",   icon: "🛡️", desc: "12 秒內擋板中間出現救球柱" },
  { id: "ball",  name: "加一顆", icon: "➕", desc: "從上方多放一顆球" }
];
SR.ITEM_MAX = 3;

/* ---------- 角色 ---------- */
SR.SPEAKERS = {
  pinky:    { name: "噴噴",   color: "#ff3ea5" },
  boss:     { name: "灰先生", color: "#9a9aa3" },
  narrator: { name: "",       color: "#ffe14d" },
  citizen:  { name: "路人",   color: "#3ee0ff" }
};

/* ---------- 劇情 ----------
   前提：你（玩家）在快拆的老遊樂場投幣玩一台彈珠台。台面上每面牆都連著城裡一面真的牆；
   在機台裡打碎灰磚，外面那面牆被蓋住的畫就會回來。噴噴是住在機台裡的噴漆精靈。
   設計用的段落：起（巷口）承（地鐵站）轉（屋頂、河堤）合（市中心）— 只在文件裡用，不顯示給玩家 */
SR.STORY = {
  intro: [
    { who: "narrator", text: "灰城有一條規定：所有的牆，都必須是灰色。" },
    { who: "narrator", text: "城東那間快要拆掉的老遊樂場裡，有一台蓋著布的彈珠台。" },
    { who: "narrator", text: "你掀開布。機台側面噴著褪色的字：SPRAY RUN。" },
    { who: "narrator", text: "投下一枚硬幣，台面一格一格亮了起來。" },
    { who: "pinky", mood: "wow", text: "……有人投幣了？好久沒人來玩了。" },
    { who: "pinky", mood: "happy", text: "我是噴噴，住在這台機器裡的噴漆精靈。" },
    { who: "pinky", mood: "happy", text: "這台機器很特別：台面上的每一面牆，都連著城裡一面真正的牆。" },
    { who: "pinky", mood: "sad", text: "那些牆原本都有畫，後來被灰漆蓋住了。在這裡把灰磚打碎，外面的畫就會回來。" },
    { who: "pinky", mood: "happy", text: "第一面，就是遊樂場門口那面牆。我來教你怎麼玩。" }
  ],
  tutorial: [],
  d1_boss: [
    { who: "narrator", text: "巷口最後一面牆上，噴著整潔局的標誌。" },
    { who: "boss", text: "這台機器，竟然還能動。" },
    { who: "pinky", mood: "wow", text: "是整潔局的灰先生。城裡的灰牆，都是他下令刷的。" },
    { who: "boss", text: "牆就該乾乾淨淨。顏色只會讓人吵架。" }
  ],
  d1_clear: [
    { who: "citizen", text: "欸，巷口那面牆……什麼時候變成這樣的？" },
    { who: "pinky", mood: "happy", text: "外面真的變了。下一站是地鐵站，那裡的牆最多。" }
  ],
  d2_start: [
    { who: "narrator", text: "隔天早上，通勤的人在地鐵站一面彩色的牆前停下腳步。" },
    { who: "pinky", mood: "happy", text: "這裡的磚比較厚，深灰色的要多打幾下。" },
    { who: "pinky", mood: "wow", text: "金色的道具磚打碎可以拿到道具，按畫面上方的按鈕就能用。" }
  ],
  d2_boss: [
    { who: "boss", text: "明天，整潔局就會派人把它們刷掉。" },
    { who: "pinky", mood: "sad", text: "……那我們就畫得比你們刷得快。" }
  ],
  d2_clear: [
    { who: "citizen", text: "有人在彩色牆前面拍照，還有小孩拿粉筆在地上畫畫。" },
    { who: "pinky", mood: "happy", text: "下一區是屋頂。從那裡看得到整座城。" }
  ],
  d3_start: [
    { who: "narrator", text: "屋頂的風很大。遊樂場的燈突然閃了一下。" },
    { who: "boss", text: "我知道是誰在玩這台機器。" },
    { who: "narrator", text: "灰先生拔掉了機台背後的一條線。噴噴身上的顏色，一點一點褪掉。" },
    { who: "pinky", mood: "sad", text: "我的顏色……在流失。不過機台還能動，別停下來。" },
    { who: "pinky", mood: "sad", text: "從這裡開始，彈道預覽會越來越短。我幫不了你那麼多了。" }
  ],
  d3_boss: [
    { who: "boss", text: "這台機器是我修好的。我比誰都清楚它。" },
    { who: "pinky", mood: "wow", text: "……你修過這台機器？" }
  ],
  d3_clear: [
    { who: "narrator", text: "灰先生沒再說話，只是看著屋頂下那片開始變彩色的街區。" },
    { who: "pinky", mood: "sad", text: "我們去河堤看看。我好像想起了一些事。" }
  ],
  d4_start: [
    { who: "narrator", text: "河堤的橋墩下，有一整排被刷掉一半的舊塗鴉。" },
    { who: "pinky", mood: "wow", text: "這個簽名……跟機台側面的一模一樣。" },
    { who: "narrator", text: "很多年前，有個年輕人畫滿了這裡的牆，也親手做了這台彈珠台。" },
    { who: "narrator", text: "後來，那些牆在一夜之間，全被刷成了灰色。" },
    { who: "pinky", mood: "sad", text: "原來灰先生不是討厭顏色。他只是不想再看一次自己的畫被刷掉。" }
  ],
  d4_boss: [
    { who: "boss", text: "別碰那些舊東西。它們已經不在了。" },
    { who: "pinky", mood: "sad", text: "它們還在，只是被蓋住了。就跟機台裡那些磚底下一樣。" }
  ],
  d4_clear: [
    { who: "boss", text: "……如果又被刷掉呢？" },
    { who: "pinky", mood: "happy", text: "那就再畫一次。這一次，不會只有你一個人。" },
    { who: "narrator", text: "噴噴身上，慢慢回來了一點粉紅色。" }
  ],
  d5_start: [
    { who: "narrator", text: "市中心的大牆，是整座城最大的一面灰牆。" },
    { who: "boss", text: "最後一面。如果你能把它打開，我就不再擋你。" },
    { who: "pinky", mood: "happy", text: "他是認真的。我們也認真打吧。" }
  ],
  d5_boss: [
    { who: "boss", text: "讓我看看，你們的顏色有多頑固。" },
    { who: "pinky", mood: "wow", text: "他補磚的速度變快了，抓準時機！" }
  ],
  ending: [
    { who: "narrator", text: "最後一塊灰磚碎開的瞬間，市中心的大牆亮了起來。" },
    { who: "narrator", text: "灰漆底下，是很多年前那幅沒有畫完的壁畫。" },
    { who: "boss", text: "……我以為它早就不在了。" },
    { who: "pinky", mood: "happy", text: "一直都在。只是需要有人把灰漆打開。" },
    { who: "narrator", text: "那年夏天，整潔局在大牆旁邊立了一塊新牌子：「自由創作牆」。" },
    { who: "narrator", text: "遊樂場沒有被拆掉。那台彈珠台，到現在都還亮著。" },
    { who: "pinky", mood: "happy", text: "謝謝你投下那枚硬幣。" }
  ]
};
/* 每一關開始前要播哪段劇情 */
SR.storyBefore = function (n) {
  if (n === 1) return ["intro"];
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
