/* ============================================================
   噴漆闖關 SPRAY RUN — 遊戲資料（企劃可以直接改這個檔）
   規格：Obsidian 彈珠專案/08 遊戲規格 v3-噴漆闖關
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

/* ---------- 街區（5 區 × 10 關）---------- */
SR.DISTRICTS = [
  { id: "alley",     name: "巷口",     en: "ALLEY",     act: "起", stages: [1, 10],  tempo: 88, root: 45,
    colors: { a: "#ff3ea5", b: "#ffe14d", c: "#3ee0ff", glow: "#ff7ac6" } },
  { id: "subway",    name: "地鐵站",   en: "SUBWAY",    act: "承", stages: [11, 20], tempo: 92, root: 43,
    colors: { a: "#3ee0ff", b: "#b25cff", c: "#ffe14d", glow: "#7fe9ff" } },
  { id: "rooftops",  name: "屋頂",     en: "ROOFTOPS",  act: "轉", stages: [21, 30], tempo: 96, root: 41,
    colors: { a: "#ff8a1f", b: "#9dff3a", c: "#ff3ea5", glow: "#ffb066" } },
  { id: "riverside", name: "河堤",     en: "RIVERSIDE", act: "轉", stages: [31, 40], tempo: 84, root: 38,
    colors: { a: "#2f7bff", b: "#34e89e", c: "#ffe14d", glow: "#6fa6ff" } },
  { id: "downtown",  name: "市中心大牆", en: "DOWNTOWN", act: "合", stages: [41, 50], tempo: 100, root: 45,
    colors: { a: "#ff3ea5", b: "#3ee0ff", c: "#ffe14d", glow: "#ffffff", rainbow: true } }
];
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
    "333...333"] }
];
SR.BOSS_PATTERN = { name: "灰老大", rows: [
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
  const pat = isBoss ? SR.BOSS_PATTERN : SR.PATTERNS[(local + d * 2) % SR.PATTERNS.length];
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
  const bricks = cells.filter(x => x.type !== "boss").length;
  return {
    n, district: d, isBoss, name: isBoss ? "首領：灰老大" : pat.name, cells,
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
  { id: "boss1",     name: "巷口英雄",   desc: "打倒巷口的灰老大" },
  { id: "boss2",     name: "地鐵站英雄", desc: "打倒地鐵站的灰老大" },
  { id: "boss3",     name: "屋頂英雄",   desc: "打倒屋頂的灰老大" },
  { id: "boss4",     name: "河堤英雄",   desc: "打倒河堤的灰老大" },
  { id: "boss5",     name: "城市傳說",   desc: "打完第 50 關，看到結局" },
  { id: "combo20",   name: "手感來了",   desc: "一次擊球打出 20 連擊" },
  { id: "combo50",   name: "停不下來",   desc: "一次擊球打出 50 連擊" },
  { id: "combo100",  name: "噴漆暴風",   desc: "一次擊球打出 100 連擊" },
  { id: "flawless",  name: "無傷過關",   desc: "沒掉愛心通過一關" },
  { id: "multi4",    name: "多球狂歡",   desc: "場上同時有 4 顆球" },
  { id: "bricks500", name: "拆牆專家",   desc: "累計打碎 500 塊磚" },
  { id: "stars30",   name: "滿天星",     desc: "累計拿到 30 顆星" },
  { id: "chain6",    name: "連鎖爆破",   desc: "1 秒內打碎 6 塊磚" }
];

/* ---------- 角色 ---------- */
SR.SPEAKERS = {
  pinky:    { name: "噴噴",   color: "#ff3ea5" },
  boss:     { name: "灰老大", color: "#9a9aa3" },
  narrator: { name: "",       color: "#ffe14d" },
  citizen:  { name: "路人",   color: "#3ee0ff" }
};

/* ---------- 劇情（起承轉合）---------- */
SR.STORY = {
  intro: [
    { who: "narrator", text: "灰城。一夜之間，所有的牆都被刷成了灰色。" },
    { who: "narrator", text: "巷子深處，一罐被丟掉的噴漆，輕輕晃了一下。" },
    { who: "pinky", mood: "wow", text: "噗哈！終於有人把我撿起來了！我是噴噴，噴漆罐裡的精靈！" },
    { who: "pinky", mood: "sad", text: "你看，整座城都被灰幫刷灰了……顏色全被關在那些灰漆磚底下。" },
    { who: "pinky", mood: "happy", text: "你是顆鋼珠對吧？太好了！只要把灰磚砸碎，顏色就會噴回牆上！" }
  ],
  tutorial: [
    { who: "pinky", mood: "happy", text: "球在右下角的發射道。按住右半邊蓄力，放開就發射！" },
    { who: "pinky", mood: "happy", text: "球掉下來時，點左半邊、右半邊控制擋板，把它打回去！" },
    { who: "pinky", mood: "wow", text: "砸碎所有灰磚就過關。擋板尖端打得最遠，試試看！" }
  ],
  d1_boss: [
    { who: "boss", text: "誰在我的巷子裡亂噴？" },
    { who: "pinky", mood: "wow", text: "是灰幫的頭頭，灰老大！小心，他會一直補灰磚！" },
    { who: "boss", text: "灰色多好，不吵、不鬧、不會被刷掉。" }
  ],
  d1_clear: [
    { who: "boss", text: "哼……一條巷子而已。" },
    { who: "citizen", text: "牆、牆變彩色了！好久沒看到這種顏色了……" },
    { who: "pinky", mood: "happy", text: "聽到了嗎？大家在笑！下一站，地鐵站！" }
  ],
  d2_start: [
    { who: "narrator", text: "顏色順著地鐵線，一站一站擴散出去。" },
    { who: "pinky", mood: "happy", text: "這裡的磚比較硬，深灰色的要多打幾下喔！" },
    { who: "pinky", mood: "wow", text: "看到油漆桶磚了嗎？打碎它，旁邊的磚會一起炸開！" }
  ],
  d2_boss: [
    { who: "boss", text: "你們以為顏色能留多久？明天市政府就會派人來刷掉。" },
    { who: "pinky", mood: "sad", text: "……他為什麼這麼確定？" }
  ],
  d2_clear: [
    { who: "citizen", text: "地鐵站變得好熱鬧！有人在牆邊跳舞！" },
    { who: "pinky", mood: "happy", text: "我們越來越強了！去屋頂，那裡能看到整座城！" }
  ],
  d3_start: [
    { who: "pinky", mood: "happy", text: "風好大！從這裡看，城裡已經有好幾塊彩色了！" },
    { who: "boss", text: "夠了。" },
    { who: "narrator", text: "灰老大一揮手，一道灰色的霧把噴噴整個包住。" },
    { who: "pinky", mood: "sad", text: "我……我的顏色……被吸走了……" },
    { who: "boss", text: "沒有顏色的精靈，還能噴什麼？" }
  ],
  d3_boss: [
    { who: "pinky", mood: "sad", text: "（小聲）鋼珠……就算我是灰色的，你還是可以砸碎他的磚……" },
    { who: "boss", text: "為什麼還不放棄？" }
  ],
  d3_clear: [
    { who: "boss", text: "……" },
    { who: "narrator", text: "灰老大沒有說話，轉身跳下屋頂，往河堤的方向走去。" },
    { who: "pinky", mood: "sad", text: "我們追上去吧……我總覺得，他不是單純的壞人。" }
  ],
  d4_start: [
    { who: "narrator", text: "河堤的橋墩下，有一整排被刷掉一半的舊塗鴉。" },
    { who: "pinky", mood: "wow", text: "這個簽名……跟灰老大噴漆罐上的一樣！" },
    { who: "narrator", text: "很多年前，他畫的每一面牆，隔天都被刷成灰色。" },
    { who: "pinky", mood: "sad", text: "原來他不是討厭顏色……他是怕顏色再被刷掉一次。" }
  ],
  d4_boss: [
    { who: "boss", text: "別看那些。那些都已經不在了。" },
    { who: "pinky", mood: "sad", text: "它們還在。只是被蓋住了，就像這些磚底下的顏色。" }
  ],
  d4_clear: [
    { who: "boss", text: "……如果顏色又被刷掉呢？" },
    { who: "pinky", mood: "happy", text: "那就再噴一次！一起噴！" },
    { who: "narrator", text: "噴噴身上，悄悄回來了一點粉紅色。" }
  ],
  d5_start: [
    { who: "narrator", text: "市中心的大牆，整座城最大的一面灰牆。" },
    { who: "boss", text: "這是最後一面。要上色，就先打倒我。" },
    { who: "pinky", mood: "happy", text: "鋼珠，最後一次了！全力打出去！" }
  ],
  d5_boss: [
    { who: "boss", text: "讓我看看，你們的顏色有多頑固！" },
    { who: "pinky", mood: "wow", text: "他是認真的！這次的磚補得超快！" }
  ],
  ending: [
    { who: "narrator", text: "最後一塊灰磚碎開的瞬間，整面大牆噴出了顏色。" },
    { who: "boss", text: "……我好久沒有拿起噴漆罐了。" },
    { who: "pinky", mood: "happy", text: "來嘛！大牆這麼大，一個人噴不完的！" },
    { who: "narrator", text: "那天晚上，灰老大和噴噴在大牆上噴了一行字：SPREAD COLOR。" },
    { who: "narrator", text: "隔天，沒有人來刷掉它。" },
    { who: "pinky", mood: "happy", text: "謝謝你，鋼珠。灰城……不，現在是彩城了！" }
  ]
};
/* 每一關開始前要播哪段劇情 */
SR.storyBefore = function (n) {
  if (n === 1) return ["intro", "tutorial"];
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
