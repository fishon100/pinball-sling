/* ============================================================
   噴漆闖關 — 遊戲主程式：流程、鏡頭／過場、輸入、繪圖、畫面（標題／地圖／強化卡／結算／結局）
   ============================================================ */
"use strict";
(async function () {
  const P = SR.Physics, R = SR.Rules, A = SR.Art, AU = SR.Audio;
  const T = await SR.loadTuning();
  SR.T = T;
  const save = R.load();
  // 音效／音樂開關記在存檔（舊存檔沒有這兩個欄位＝開）
  AU.setSfx(save.sfx !== false); AU.setMusic(save.music !== false);
  function setSound(kind, on) {
    if (kind === "sfx") { AU.setSfx(on); save.sfx = on; } else { AU.setMusic(on); save.music = on; }
    R.persist(save);
  }
  const $ = id => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d");
  let VW = 400;                       // 畫面寬（手機會依「鏡頭視窗」變，見 layoutWindow）
  const VH = P.VIEW_H;
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- 狀態 ---------- */
  const G = {
    screen: "title", world: null, stage: null, run: null, ps: null, district: SR.DISTRICTS[0],
    cam: { y: P.CAM_MAX }, view: { zoom: 1, fx: 200, fy: 370, tilt: 0, rz: 0, scale: 1 },
    cine: null, timeScale: 1, paused: false, hitstop: 0, shake: 0, nudge: null, flashes: [], recentBreaks: [],
    win: { x0: 0, w: 400 }, laneK: 0,   // 鏡頭視窗（台面座標 x0 起、寬 w）與發射道滑出程度（0 在、1 滑出）
    paint: null, particles: [], popups: [], trails: new Map(),
    plunger: { holding: false, charge: 0 }, ballSave: 0, stageTime: 0, heartsLost: 0,
    lastBreak: null, comboFx: { n: 0, t: 0 }, attract: false, ending: false, t: 0,
    assists: {}, itemFx: { slow: 0, save: 0, wide: 0 }, continued: false, tut: null, previews: []
  };

  /* ---------- 小工具 ---------- */
  function pal() { return G.district.colors; }
  function paintColor(rnd = Math.random) {
    const p = pal();
    if (p.rainbow) return `hsl(${Math.floor(rnd() * 360)},95%,60%)`;
    return [p.a, p.b, p.c][Math.floor(rnd() * 3)];
  }
  // 操作方式：paddle＝滑板（預設，一根手指／滑鼠）、flipper＝經典兩支擋板
  function control() { return save.control === "flipper" ? "flipper" : "paddle"; }
  function newPaintLayer() { G.paint = A.off(VW, P.H); }
  function vibrate(ms) { if (save.vibrate === false) return; try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
  // 電腦（滑鼠）還是手機（手指）：教學文字、操作卡、游標都看這個（提案 desktop-controls）
  const FINE = !matchMedia("(pointer: coarse)").matches;

  /* ---------- 噴噴（HUD 角落＋對話泡泡）---------- */
  const pinkyHud = $("pinkyHud").getContext("2d");
  let pinkyMood = "happy", pinkyMoodT = 0, bubbleT = null;
  function say(text, mood = "happy", ms = 2200) {
    pinkyMood = mood; pinkyMoodT = ms / 1000;
    const b = $("bubble"); b.textContent = text; b.hidden = false;
    b.style.animation = "none"; void b.offsetWidth; b.style.animation = "";
    clearTimeout(bubbleT); bubbleT = setTimeout(() => { b.hidden = true; }, ms);
  }
  function drawPinkyHud(dt) {
    pinkyMoodT -= dt; if (pinkyMoodT <= 0) pinkyMood = "happy";
    const g = pinkyHud; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 104, 104);
    const grey = G.district.id === "rooftops" || (G.district.id === "riverside" && !G.ending);
    A.pinky(g, 52, 58, 0.9, pinkyMood === "happy" && pinkyMoodT > 0 ? "happy" : pinkyMood === "happy" ? "idle" : pinkyMood, G.t, grey);
  }

  /* ---------- HUD ---------- */
  function updateHud() {
    const st = G.stage, run = G.run;
    // 不顯示「起承轉合」（那是設計溝通用的，第 3 輪回饋）
    $("stageChip").textContent = st ? `${G.district.name} ${Math.floor((st.n - 1) / 10) + 1}-${(st.n - 1) % 10 + 1}${st.isBoss ? " 首領" : ""}` : "噴漆闖關 SPRAY RUN";
    const hearts = run ? run.hearts : 0, max = Math.max(3, hearts);
    $("hearts").innerHTML = run ? Array.from({ length: max }, (_, i) => `<span class="${i < hearts ? "" : "empty"}">♥</span>`).join("") : "";
    $("score").textContent = run ? run.score.toLocaleString() : "";
  }
  /* 道具（v3.7.1 申請單 item-capsules）：打破道具磚掉下膠囊，滑板／擋板接到就立刻生效；遊玩畫面沒有道具欄、也不存庫存 */
  function catchItem(id, x, y) {
    const extra = R.useItem(T, G.world, id, G.itemFx);
    const it = SR.ITEMS.find(i => i.id === id);
    popup(x, y - 30, `${it.icon} ${it.name}！`, true, pal().b);
    AU.play(id === "bomb" ? "bucket" : "card"); vibrate([20, 30, 20]);
    if (extra.length) handleEvents(extra);
    updateHud();
  }
  function hint(text) { if ($("hint").textContent !== text) $("hint").textContent = text; }

  /* ---------- 成就 ---------- */
  function toast(title, sub) {
    const el = document.createElement("div"); el.className = "toast";
    el.innerHTML = `★ ${title}<small>${sub}</small>`;
    $("toasts").appendChild(el); setTimeout(() => el.remove(), 3200);
  }
  function achieve(s) {
    const got = R.checkAchievements(save, s);
    for (const id of got) { const a = SR.ACHIEVEMENTS.find(x => x.id === id); toast("成就解鎖：" + a.name, a.desc); AU.play("achievement"); }
    if (got.length) R.persist(save);
  }

  /* ============================================================
     畫面（DOM）
     ============================================================ */
  const screen = $("screen");
  function show(html) { screen.innerHTML = `<div class="inner">${html}</div>`; screen.hidden = false; screen.scrollTop = 0; }
  function hideScreen() { screen.hidden = true; screen.innerHTML = ""; }
  function on(id, fn) { const el = $(id); if (el) el.addEventListener("click", e => { AU.ensure(); AU.play("ui"); fn(e); }); }

  function titleScreen() {
    G.screen = "title"; G.run = null; G.stage = null; G.ending = false;
    startAttract();
    show(`
      <h1 class="tag-title">SPRAY<br><span class="y">RUN</span></h1>
      <p class="sub">噴漆闖關・把灰城砸回彩色</p>
      <canvas id="titlePinky" width="360" height="360" aria-label="噴噴"></canvas>
      <button class="big-btn" id="goMap">開始</button>
      <div class="row">
        <button class="big-btn ghost" id="goAch">成就 ${Object.keys(save.achievements).length}/${SR.ACHIEVEMENTS.length}</button>
        <button class="big-btn ghost" id="goSound">${AU.musicOn ? "音樂：開" : "音樂：關"}</button>
        <button class="big-btn ghost" id="goOpening">重看開場</button>
        <button class="big-btn ghost" id="goTut">重看教學</button>
      </div>
      <button class="big-btn ghost" id="goControl">操作：${control() === "paddle" ? "🛹 滑板（一根手指／滑鼠）" : "🎰 經典擋板"}</button>
      <p class="sub" style="font-size:12px">${control() === "paddle" ? "手指左右滑或移動滑鼠＝滑板・球在發射道時按住畫面蓄力" : "左半邊／右半邊＝擋板・球在發射道時按住右半邊蓄力・電腦：Z、/、空白鍵"}</p>`);
    on("goMap", () => { AU.startMusic(SR.DISTRICTS[0]); mapScreen(); });
    on("goControl", () => controlScreen(titleScreen));
    on("goOpening", openingScreen);
    on("goTut", replayTutorial);
    on("goAch", achievementScreen);
    on("goSound", () => { setSound("music", !AU.musicOn); titleScreen(); });
    updateHud();
  }

  /* 地圖的街道路線底圖（提案 stage-select-map 2.4）：程式畫的柏油路，路緣、車道線、噴漆塗鴉用各區的配色。
     座標系 500×110：上排關卡中心 y=24、下排 y=86、左右兩端 x=50／450（＝5 欄的第 1、5 欄中心）；寬度隨卡片伸縮，線條粗細不變
     2.6：5 區連成一條街——第 1 區的路從左邊起點開始，其他區從上方接進來（.lane-in），第 10 關往下接到下一區（.lane-out） */
  function routeArt(d, first) {
    const c = d.colors, road = `M${first ? 14 : 50} 24 H450 A31 31 0 0 1 450 86 H50`;
    const s = (dPath, color, w, extra = "") => `<path d="${dPath}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" ${extra}/>`;
    const tags = [[130, 50, 162, 45], [290, 52, 318, 58], [370, 2, 400, 6], [205, 104, 236, 100], [60, 60, 30, 64]]
      .map(([x1, y1, x2, y2], i) => s(`M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + (i % 2 ? 6 : -6)} ${x2} ${y2}`, i % 2 ? c.c : c.b, 3, 'opacity=".55"')).join("");
    return `<svg class="route-art" viewBox="0 0 500 110" preserveAspectRatio="none" aria-hidden="true">
      ${s(road, "#111114", 40)}${s(road, c.a, 36, 'opacity=".85"')}${s(road, "#2b2b34", 30)}
      ${s(road, c.b, 2, 'stroke-dasharray="9 10" opacity=".8"')}
      ${tags}
    </svg>`;
  }

  function mapScreen() {
    G.screen = "map"; G.run = null; G.stage = null;
    startAttract();
    const cleared = Math.max(0, save.unlocked - 1);
    const cards = SR.DISTRICTS.map((d, i) => {
      const unlocked = R.districtUnlocked(save, i);
      const [s0, s1] = d.stages;
      // v3.8（提案 stage-select-map）：每一關都有自己的入口按鈕，排成來回的街道路線 1→5、10←6
      const stops = [];
      for (let n = s0; n <= s1; n++) {
        const k = n - s0, st = save.stars[n] || 0, done = n < save.unlocked, next = n === save.unlocked, open = n <= save.unlocked, boss = n % 10 === 0;
        const tag = done ? (R.MEDALS[st] ? R.MEDALS[st].name[0] : "") : next ? "▶" : boss ? "王" : open ? "" : "🔒";
        const pos = `grid-row:${k < 5 ? 1 : 2};grid-column:${k < 5 ? k + 1 : 10 - k}`;
        stops.push(`<button class="stop ${done ? "done m" + st : ""} ${next ? "next" : ""} ${boss ? "boss" : ""}" style="${pos}" data-stage="${n}" ${open ? `data-n="${n}"` : "disabled"} title="第 ${n} 關・${unlocked ? SR.buildStage(n).name : "？？？"}" aria-label="第 ${n} 關${done ? `（${R.MEDALS[st] ? R.MEDALS[st].name : "已過"}）` : next ? "（下一關）" : open ? "" : "（未解鎖）"}">${n}${tag ? `<span class="tag">${tag}</span>` : ""}</button>`);
      }
      const best = save.best[i] ? `最佳 ${save.best[i].toLocaleString()} 分` : "";
      const nextN = R.districtStartStage(save, i);
      const nodes = [routeArt(d, i === 0), ...stops];
      const last = i === SR.DISTRICTS.length - 1;
      // 介紹在路線上方、往右縮排；路從左邊經過（上一區第 10 關 → 這一區第 1 關）
      return `<article class="district ${unlocked ? "" : "locked"}" style="--curb:${d.colors.a};--lane:${d.colors.b}">
        <div class="bg" style="background:linear-gradient(120deg, ${d.colors.a}, ${d.colors.b} 55%, ${d.colors.c})"></div>
        ${i ? `<div class="lane lane-in" aria-hidden="true"></div>` : ""}${last ? "" : `<div class="lane lane-out" aria-hidden="true"></div>`}
        <span class="act">第 ${i + 1} 區</span>
        <h3>${unlocked ? d.name : "？？？"}<small>${unlocked ? d.en : "LOCKED"} · ${s0}–${s1}</small></h3>
        <p class="story">${unlocked ? d.teaser : "在上一區打倒灰先生才會解鎖。"}</p>
        ${unlocked ? `<p class="assist-line">${assistText(R.assistsFor(s0)) || "沒有輔助：全靠你的手感"}</p>
        <p class="nextname">▶ 第 ${nextN} 關・${SR.buildStage(nextN).name}</p>
        <div class="row"><button class="big-btn small ${i % 2 ? "alt" : ""}" data-n="${nextN}">${save.unlocked > s1 ? "從頭再打一次" : save.unlocked > s0 ? `繼續：第 ${nextN} 關` : "出發"}</button></div><p class="sub" style="text-align:left;margin-top:6px;font-size:12px">點關卡按鈕可以直接選關${best ? `・${best}` : ""}</p>` : `<p class="lockmsg">🔒 尚未解鎖</p>`}
        <div class="route">${nodes.join("")}</div>
      </article>`;
    }).join("");
    const gold = R.medalCount(save, 3), silver = R.medalCount(save, 2), bronze = R.medalCount(save, 1);
    show(`
      <div class="progress"><h2 class="h2">灰城地圖</h2><span>已解放 <b>${cleared}</b>/50・<i class="mc m3">金</i>${gold} <i class="mc m2">銀</i>${silver} <i class="mc m1">銅</i>${bronze}</span></div>
      <p class="sub" style="text-align:left">3 顆愛心、每過一關回 1 顆。一顆都沒掉＝金牌、掉 1 顆＝銀牌、掉 2 顆以上＝銅牌。每過一關會抽到一罐強化，一直帶到你回地圖為止。</p>
      <div class="city">${cards}</div>
      <div class="row"><button class="big-btn ghost" id="goComics">📖 劇情回放</button><button class="big-btn ghost" id="goAch2">成就</button></div>
      <div class="row"><button class="big-btn ghost" id="goControl">操作：${control() === "paddle" ? "滑板" : "經典擋板"}</button><button class="big-btn ghost" id="replayTut">重看教學</button><button class="big-btn ghost" id="backTitle">回標題</button></div>`);
    screen.querySelectorAll("[data-n]").forEach(b => b.addEventListener("click", () => {
      AU.ensure(); AU.play("card");
      const n = +b.dataset.n; startDistrict(Math.floor((n - 1) / 10), n);
    }));
    on("backTitle", titleScreen);
    on("goAch2", achievementScreen);
    on("goComics", comicGallery);
    on("goControl", () => controlScreen(mapScreen));
    on("replayTut", replayTutorial);
    updateHud();
  }

  // 重看教學＝互動教學與物件特寫教學都重來（提案 newbie-tutorial）
  function replayTutorial() { save.tutorialDone = false; save.seenObjects = {}; R.persist(save); startDistrict(0); }

  /* 劇情回放（第 5 輪：漫畫要能回放）：看過的段落都能再看 */
  function comicGallery() {
    G.screen = "gallery";
    const keys = Object.keys(SR.COMIC_TITLES);
    const list = keys.map((k, i) => {
      const seen = !!save.seenComic[k];
      return `<button class="ach ${seen ? "got" : ""}" ${seen ? `data-k="${k}"` : "disabled"} style="width:100%;text-align:left;cursor:${seen ? "pointer" : "default"}"><div class="badge">${seen ? "▶" : "？"}</div><div><b>${i + 1}. ${seen ? SR.COMIC_TITLES[k] : "還沒看到"}</b><span>${seen ? "點一下重看" : "繼續玩下去就會解鎖"}</span></div></button>`;
    }).join("");
    show(`<h2 class="h2">📖 劇情回放</h2>${list}<button class="big-btn ghost" id="galBack">返回地圖</button>`);
    screen.querySelectorAll("[data-k]").forEach(b => b.addEventListener("click", () => {
      AU.ensure(); AU.play("ui"); hideScreen();
      dlg = true; SR.Comic.play([b.dataset.k], () => { dlg = null; comicGallery(); });
    }));
    on("galBack", mapScreen);
  }

  /* 操作方式（第 5 輪：兩支擋板要兩手、反應跟不上；滑鼠更來不及）*/
  function controlScreen(back) {
    G.screen = "control";
    const opt = (id, title, desc) => `<button class="card ${control() === id ? "picked" : ""}" data-c="${id}" style="width:100%"><b>${title}${control() === id ? "（使用中）" : ""}</b><span>${desc}</span></button>`;
    show(`<h2 class="h2">操作方式</h2>
      ${opt("paddle", "🛹 滑板（推薦）", "一根手指左右滑，電腦用滑鼠移動就好。打在滑板哪裡決定球往哪飛。")}
      ${opt("flipper", "🎰 經典擋板", "傳統彈珠台的左右兩支擋板，要抓時機。難度較高，適合想挑戰的玩家。")}
      <button class="big-btn ghost" id="ctlBack">返回</button>`);
    screen.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => { AU.ensure(); AU.play("card"); save.control = b.dataset.c; R.persist(save); controlScreen(back); }));
    on("ctlBack", back);
  }
  function assistText(a) {
    const parts = [];
    if (a.preview) parts.push(`彈道預覽 ${a.preview} 秒`);
    if (a.timing) parts.push(control() === "paddle" ? "落點提示" : "擋板時機提示");
    if (a.ballSave) parts.push(`球保險 +${a.ballSave} 秒`);
    return parts.length ? "輔助：" + parts.join("・") : "";
  }

  function achievementScreen() {
    const back = G.screen === "map" ? mapScreen : titleScreen;
    const list = SR.ACHIEVEMENTS.map(a => {
      const got = !!save.achievements[a.id];
      return `<div class="ach ${got ? "got" : ""}"><div class="badge">${got ? "★" : "？"}</div><div><b>${a.name}</b><span>${a.desc}</span></div></div>`;
    }).join("");
    show(`<h2 class="h2">成就 ${Object.keys(save.achievements).length}/${SR.ACHIEVEMENTS.length}</h2>
      <dl class="stat-grid"><dt>累計碎磚</dt><dd>${save.stats.bricks.toLocaleString()}</dd><dt>累計星星</dt><dd>${R.totalStars(save)}</dd><dt>挑戰次數</dt><dd>${save.stats.runs}</dd></dl>
      ${list}<button class="big-btn ghost" id="achBack">返回</button>`);
    on("achBack", back);
  }


  /* 過關結算（第 5 輪）：獎牌依愛心；強化不再「三選一」（選了卻不打下一關會衝突），改成過關直接抽到一罐；
     接著讓玩家自己選：重玩這關／下一關／回地圖 */
  function stageResult(medal, secs, reward, onNext) {
    G.screen = "result";
    const st = G.stage, m = R.MEDALS[medal], last = st.n === 50;
    const why = G.continued ? "這一關有續關，最多銅牌" : medal === 3 ? "一顆愛心都沒掉，完美！" : medal === 2 ? "只掉 1 顆愛心，再一次就金牌了！" : "掉 2 顆以上也是過關！重玩可以拿更好的獎牌";
    show(`<h2 class="tag-title" style="font-size:44px">WALL<br><span class="c">CLEARED!</span></h2>
      <div class="medal medal-${medal}"><div class="disc">${m.name[0]}</div><b>${m.name}</b></div>
      <p class="sub" style="font-size:13px">${why}</p>
      ${reward ? `<div class="reward"><div class="ico" style="background:${pal().a}">${reward.icon}</div><div><b>抽到強化：${reward.name}</b><span>${reward.desc}</span></div></div>` : ""}
      <dl class="stat-grid">
        <dt>關卡</dt><dd>${st.n}・${st.name}</dd>
        <dt>時間</dt><dd>${secs.toFixed(1)} 秒</dd>
        <dt>本關掉的愛心</dt><dd>${G.heartsLost}</dd>
        <dt>最高連擊</dt><dd>${G.ps.maxCombo}</dd>
        <dt>分數</dt><dd>${G.run.score.toLocaleString()}</dd>
      </dl>
      ${st.n % 10 !== 0 ? `<p class="sub" style="font-size:13px;color:var(--pink)">過關回 1 顆愛心 ♥ ${G.run.hearts}</p>` : ""}
      <button class="big-btn" id="nextBtn">${last ? "看結局" : st.n % 10 === 0 ? "繼續" : `下一關 ▶（第 ${st.n + 1} 關）`}</button>
      <div class="row"><button class="big-btn ghost" id="retryBtn">↻ 重玩這關</button><button class="big-btn ghost" id="mapBtn">回地圖</button></div>`);
    on("nextBtn", () => { hideScreen(); onNext(); });
    on("retryBtn", () => { goStage(st.n, { replay: true }); });
    on("mapBtn", mapScreen);
  }

  function districtCleared() {
    G.screen = "districtDone";
    const d = G.district, i = SR.DISTRICTS.indexOf(d), next = SR.DISTRICTS[i + 1];
    save.best[i] = Math.max(save.best[i] || 0, G.run.score);
    // v3.7.1：道具改成關卡裡掉落的膠囊，打完一區不再送道具
    R.persist(save);
    achieve({ oneCoin: !G.run.continues });
    show(`<h2 class="tag-title" style="font-size:46px">${d.en}<br><span class="y">FREE!</span></h2>
      <p class="sub">${d.name} 的牆，全都回來了。</p>
      <dl class="stat-grid"><dt>本輪分數</dt><dd>${G.run.score.toLocaleString()}</dd><dt>打碎的磚</dt><dd>${G.run.bricks}</dd><dt>剩下的愛心</dt><dd>${G.run.hearts}</dd><dt>續關次數</dt><dd>${G.run.continues || 0}</dd></dl>
      ${next ? `<p class="sub">下一區：<b style="color:${next.colors.a}">${next.name}</b> 已經出現在地圖上</p>` : ""}
      <button class="big-btn" id="toMap">回到城市地圖</button>`);
    on("toMap", mapScreen);
  }

  /* 愛心用完：投幣續關（從這一關重來，保留強化卡；分數減半、這關最多 1 星），或回地圖 */
  function runOver() {
    G.screen = "runover"; AU.play("lose"); AU.setIntensity(0);
    const i = SR.DISTRICTS.indexOf(G.district);
    save.best[i] = Math.max(save.best[i] || 0, G.run.score); R.persist(save);
    say("沒關係，再投一枚硬幣吧。", "sad", 3000);
    show(`<h2 class="tag-title" style="font-size:46px;color:#9a9aa3">GAME<br><span class="y">OVER?</span></h2>
      <p class="sub">愛心用完了。機台在等你投下一枚硬幣。</p>
      <dl class="stat-grid"><dt>打到</dt><dd>第 ${G.stage.n} 關</dd><dt>本輪分數</dt><dd>${G.run.score.toLocaleString()}</dd><dt>打碎的磚</dt><dd>${G.run.bricks}</dd><dt>最高連擊</dt><dd>${G.run.maxCombo}</dd></dl>
      <button class="big-btn" id="cont">🪙 投幣續關（從這一關重來）</button>
      <p class="sub" style="font-size:12px">保留強化卡、愛心回到 3 顆；分數減半，這一關最多 1★</p>
      <div class="row"><button class="big-btn ghost" id="retry">整區重來</button><button class="big-btn ghost" id="toMap2">回地圖</button></div>`);
    on("cont", () => { R.continueRun(T, G.run); AU.play("save"); goStage(G.stage.n, { continued: true }); });
    on("retry", () => startDistrict(i));
    on("toMap2", mapScreen);
  }

  function credits() {
    G.screen = "credits";
    show(`<h2 class="tag-title">THE<br><span class="y">END</span></h2>
      <p class="sub">灰城……不，彩城。謝謝你玩到最後。</p>
      <dl class="credits">${SR.CREDITS.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
      <p class="sub">所有街區都可以回去刷三星，還有成就等著你。</p>
      <button class="big-btn" id="endMap">回到城市地圖</button>`);
    on("endMap", mapScreen);
  }

  /* ---------- 劇情：漫畫格（背景框 → 角色 → 旁白 → 對話框，點一下下一格）---------- */
  let dlg = null;                                         // 播漫畫時為 true（遊戲暫停）
  function playStory(keys, done) {
    if (!keys.some(k => SR.COMICS[k])) { done(); return; }
    dlg = true; AU.ensure();
    SR.Comic.play(keys, skipped => {
      // 看完才記成「看過」；按跳過的話下次還會自動播
      if (!skipped) { keys.forEach(k => save.seenComic[k] = true); R.persist(save); }
      dlg = null; done();
    });
  }
  function advanceDialog() { SR.Comic.tap(); }
  function closeDialog() { SR.Comic.finish(); }
  function tickDialog(dt) { SR.Comic.update(dt); }

  /* ============================================================
     一輪／一關
     ============================================================ */
  /* 開始一輪：可以從這一區的任何一關開始（選關）；從中間開始時，先幫你帶上前面幾關該有的強化罐 */
  function startDistrict(i, startN) {
    G.attract = false;
    const d = SR.DISTRICTS[i], n = startN || d.stages[0], skipped = n - d.stages[0];
    G.run = skipped ? R.simulatedBuild(T, skipped, Date.now() % 100000) : R.newRun(T, i);
    G.run.district = i; G.run.hearts = T.run.hearts;
    save.stats.runs++; R.persist(save);
    G.district = d;
    AU.startMusic(G.district);
    goStage(n);
    if (skipped) setTimeout(() => say(`從第 ${n} 關開始，先幫你帶上 ${skipped} 罐強化！`, "happy", 3000), 2600);
  }
  function goStage(n, opts = {}) {
    hideScreen();
    G.stage = SR.buildStage(n); G.district = SR.districtOf(n);
    G.assists = R.assistsFor(n);
    G.world = P.buildTable(T, G.assists, SR.layoutFor(n), control());
    if (G.world.paddle) G.world.paddle.size = SR.paddleSizeFor(n);
    G.world.ballRadius = SR.ballRadiusFor(n);                 // v3.7：第 3 區起球變小
    P.placeStage(G.world, G.stage); R.applyBonuses(G.run, G.world);
    G.world.balls = [P.newBall(T, G.world)];
    G.run.stage = n; G.ps = R.newPlayState(); G.stageTime = 0; G.heartsLost = 0; G.ballSave = 0;
    G.introShort = !!(opts.continued || opts.replay);          // v3.10：同一關重打播 1.2 秒短版開場
    G.continued = !!opts.continued; G.itemFx = { slow: 0, save: 0, wide: 0 }; G.lastBreakT = 0; G._finTold = false; G._boostTold = false; G.fishHits = 0; G.landing = null; G.intro = null; G.ctrlCard = false;
    G.particles = []; G.popups = []; G.trails = new Map(); G.lastBreak = null; G.plunger = { holding: false, charge: 0 };
    newPaintLayer(); G.cam.y = Math.min(G.world.top, P.CAM_MAX); G.timeScale = 1; G.screen = "story";
    G.tut = n === 1 && !save.tutorialDone ? { step: "press", t: 0, flips: 0 } : null;
    AU.startMusic(G.district); AU.setIntensity(G.stage.isBoss ? 1 : 0);
    updateHud();
    // 第一次一定播；看過的可以在地圖的「劇情回放」重看（首領前的漫畫每次都播，當作開戰轉場）
    const keys = opts.continued || opts.replay ? [] : SR.storyBefore(n).filter(k => !save.seenComic[k] || k.endsWith("_boss"));
    playStory(keys, startIntro);
  }
  function startIntro() {
    G.screen = "intro";
    G.cine = { type: "intro", t: 0, dur: G.introShort ? 1.2 : 2.3 };
    AU.play("spray", 0.3);
    if (G.tut) return;                                    // 教學會自己帶
    const local = (G.stage.n - 1) % 10;
    if (local === 0 && assistText(G.assists)) setTimeout(() => say(assistText(G.assists).replace("輔助：", "這一區的輔助：") , "happy", 4000), 2300);
    else if (G.stage.isBoss) setTimeout(() => say("灰先生會補磚，先打掉他身下那排！", "wow", 3500), 2400);
    else say(["上吧！", "這面牆交給你了！", "畫就在磚底下！", "慢慢來，看準了再打！"][G.stage.n % 4], "happy", 1800);
  }
  function beginPlay() {
    G.cine = null; G.screen = "play"; G.view.zoom = 1; G.view.tilt = 0; G.view.rz = 0; G.view.scale = 1; G.view.tx = G.view.ty = null; G.cam.y = P.CAM_MAX;
    // 電腦第一次進遊玩畫面：先看操作卡（提案 desktop-controls），關掉後才教這一關的新物件（提案 newbie-tutorial）
    if (FINE && !save.seenControlsCard && G.world.paddle) G.ctrlCard = true;
    else startObjectIntros();
  }

  const viewCX = () => G.win.x0 + VW / 2;   // 畫面中心在台面座標的位置

  /* ---------- 鏡頭視窗與發射道滑出（提案 mobile-layout，2026-10-08）----------
     手機（寬 ≤ 520）：畫面只看台面本體（左牆 x=20 起），球在發射道時看到 20～380，發射後發射道 0.3 秒往右滑出、
     視窗收到 20～340，磚自然變大；螢幕比台面寬時左右多看一點牆。電腦維持 0～400 整個畫布。物理座標完全不變。 */
  const LANE_SLIDE = 44;
  function tickWindow(dt) {
    const w = G.world;
    const busy = !w || G.screen !== "play" || G.attract || w.balls.some(b => b.x > 340 && b.y > 520);   // 有球在發射道那一欄
    const target = busy ? 0 : 1, d = target - G.laneK;
    G.laneK = Math.abs(d) <= dt / 0.3 ? target : G.laneK + Math.sign(d) * dt / 0.3;
    layoutWindow();
  }
  function layoutWindow() {
    const wrap = $("stagewrap"), mobile = innerWidth <= 520;
    let x0 = 0, w = 400;
    if (mobile) {
      w = 360 - 40 * G.laneK; x0 = 20;
      const availW = wrap.clientWidth, availH = wrap.clientHeight, fill = availH > 0 ? VH * availW / availH : w;
      if (fill > w) { x0 -= (fill - w) / 2; w = fill; }     // 螢幕比台面寬：左右多看一點牆，台面一樣貼齊兩邊
    }
    if (Math.abs(w - G.win.w) > 0.01 || Math.abs(x0 - G.win.x0) > 0.01) { G.win = { x0, w }; VW = w; fit(); }
  }

  /* ---------- 物件特寫教學（提案 newbie-tutorial）：每種物件第一次出現時暫停、暗幕、鏡頭拉近 2 倍、一句話，點一下才繼續 ---------- */
  const INTRO_ORDER = ["gift", "hp2", "bucket", "rail", "boost", "bumper", "fish", "boss"];
  function seenObj(kind) { return !!(save.seenObjects && save.seenObjects[kind]); }
  function markSeen(kind) { save.seenObjects = save.seenObjects || {}; save.seenObjects[kind] = true; R.persist(save); }
  // 這一關有哪些物件、特寫要對準哪裡（世界座標；回傳函式，膠囊這種會動的也能對準）
  function introTargets(w) {
    const out = {}, rectOf = k => () => ({ x: k.x + k.w / 2, y: k.y + k.h / 2, w: k.w, h: k.h });
    const brick = pred => w.bricks.find(k => k.alive && pred(k));
    const gift = brick(k => k.type === "gift"), hp2 = brick(k => k.type === "brick" && k.maxHp >= 2), bucket = brick(k => k.type === "bucket");
    if (gift) out.gift = rectOf(gift);
    if (hp2) out.hp2 = rectOf(hp2);
    if (bucket) out.bucket = rectOf(bucket);
    const rail = w.segments.find(sg => sg.kind === "rubber" || sg.kind === "rail");
    if (rail) out.rail = () => ({ x: (rail.ax + rail.bx) / 2, y: (rail.ay + rail.by) / 2, w: Math.abs(rail.bx - rail.ax) + 16, h: Math.abs(rail.by - rail.ay) + 16 });
    const pad = (w.boosts || [])[0];
    if (pad) out.boost = () => ({ x: pad.x + pad.w / 2, y: pad.y + pad.h / 2, w: pad.w, h: pad.h });
    const bump = w.circles.find(c => c.kind === "bumper"), fish = w.circles.find(c => c.kind === "fish");
    if (bump) out.bumper = () => ({ x: bump.x, y: bump.y, w: T.bumper.radius * 2 + 8, h: T.bumper.radius * 2 + 8 });
    if (fish) out.fish = () => ({ x: fish.x, y: fish.y, w: fish.r * 2 + 12, h: fish.r * 2 + 12 });
    if (w.boss) out.boss = rectOf(w.boss);
    return out;
  }
  function startObjectIntros() {
    if (!G.world || G.screen !== "play") return;
    const targets = introTargets(G.world);
    const queue = INTRO_ORDER.filter(k => targets[k] && !seenObj(k)).map(k => ({ kind: k, at: targets[k] }));
    if (queue.length) showObjectIntro(queue);
  }
  function showObjectIntro(queue) {
    G.intro = { queue, cur: queue[0].kind, at: queue[0].at, t: 0 };
    G.timeScale = 0; G.plunger.holding = false; G.plunger.charge = 0;   // 畫面停住；拉到一半的桿放掉
  }
  function dismissIntro() {
    const it = G.intro; if (!it) return;
    markSeen(it.cur); it.queue.shift();
    AU.play("combo", 3);
    if (it.queue.length) { it.cur = it.queue[0].kind; it.at = it.queue[0].at; it.t = 0; return; }
    G.intro = null; G.timeScale = 1; G.view.zoom = 1; G.view.tx = G.view.ty = null;
  }
  function tickIntro(dt) {
    const it = G.intro; if (!it) return;
    it.t += dt;
    const p = it.at(), v = G.view, k = Math.min(1, dt * 10);
    // 放大 2 倍時畫面只看得到中心左右 100、上下 185，中心離邊至少這麼多才不會露出台面外
    const tx = P.clamp(p.x, G.win.x0 + VW / 4, G.win.x0 + VW * 3 / 4), ty = P.clamp(p.y - G.cam.y, 185, VH - 185);
    if (v.ty == null) { v.tx = viewCX(); v.ty = 370; }
    v.zoom += (2 - v.zoom) * k; v.tx += (tx - v.tx) * k; v.ty += (ty - v.ty) * k;
  }
  function drawIntro(g) {
    const it = G.intro, info = SR.OBJECT_INTROS[it.cur] || { name: it.cur, text: "" }, v = G.view, p = it.at();
    // 物件在畫面上的位置（跟 render 的鏡頭算法一樣）
    const sx = VW / 2 + v.zoom * (p.x - v.tx), sy = 370 + v.zoom * (p.y - G.cam.y - v.ty);
    const hw = p.w * v.zoom / 2 + 14, hh = p.h * v.zoom / 2 + 14, bob = Math.sin(G.t * 5) * 4;
    g.save();
    g.fillStyle = "rgba(8,8,12,0.66)";
    g.beginPath(); g.rect(0, 0, VW, VH); A.roundRect(g, sx + hw, sy - hh, -hw * 2, hh * 2, 10); g.fill("evenodd");
    g.strokeStyle = "#ffe14d"; g.lineWidth = 4; g.setLineDash([10, 8]); g.lineDashOffset = -G.t * 30;
    A.roundRect(g, sx - hw, sy - hh, hw * 2, hh * 2, 10); g.stroke(); g.setLineDash([]);
    // 說明卡（放在物件上方或下方，不蓋到物件）
    const x = 28, w = VW - 56, h = 84, y = sy > VH / 2 ? Math.max(56, sy - hh - h - 24) : Math.min(VH - h - 90, sy + hh + 24);
    g.fillStyle = A.INK; A.roundRect(g, x + 5, y + 5, w, h, 16); g.fill();
    g.fillStyle = "#ffffff"; A.roundRect(g, x, y, w, h, 16); g.fill();
    g.strokeStyle = A.INK; g.lineWidth = 3.5; g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#c2187a"; g.font = `900 22px ${A.FONT_CJK}`; g.fillText(info.name, VW / 2, y + 28);
    g.fillStyle = A.INK; g.font = `700 17px ${A.FONT_CJK}`; g.fillText(info.text, VW / 2, y + 58);
    g.fillStyle = "#ffe14d"; g.font = `900 18px ${A.FONT_CJK}`; g.strokeStyle = A.INK; g.lineWidth = 4; g.lineJoin = "round";
    g.strokeText(FINE ? "點一下（或按空白鍵）繼續" : "點一下繼續", VW / 2, VH - 44 + bob); g.fillText(FINE ? "點一下（或按空白鍵）繼續" : "點一下繼續", VW / 2, VH - 44 + bob);
    g.restore();
  }

  /* ---------- 電腦操作卡（提案 desktop-controls）：第一次進遊玩畫面出現一次 ---------- */
  function closeCtrlCard() { G.ctrlCard = false; save.seenControlsCard = true; R.persist(save); startObjectIntros(); }
  function drawCtrlCard(g) {
    const bob = Math.sin(G.t * 5) * 4;
    g.save();
    g.fillStyle = "rgba(8,8,12,0.72)"; g.fillRect(0, 0, VW, VH);
    const x = 36, w = VW - 72, h = 236, y = (VH - h) / 2 - 40;
    g.fillStyle = A.INK; A.roundRect(g, x + 6, y + 6, w, h, 18); g.fill();
    g.fillStyle = "#ffffff"; A.roundRect(g, x, y, w, h, 18); g.fill();
    g.strokeStyle = A.INK; g.lineWidth = 4; g.stroke();
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#c2187a"; g.font = `900 24px ${A.FONT_CJK}`; g.fillText("電腦操作", VW / 2, y + 34);
    const rows = [["空白鍵", "按住蓄力，放開發射"], ["滑鼠左右", "移動滑板接球"], ["Esc", "暫停"]];
    rows.forEach(([key, what], i) => {
      const ry = y + 80 + i * 48;
      g.fillStyle = "#ffe14d"; A.roundRect(g, x + 18, ry - 17, 96, 34, 8); g.fill(); g.strokeStyle = A.INK; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = A.INK; g.font = `900 15px ${A.FONT_CJK}`; g.fillText(key, x + 66, ry);
      g.textAlign = "left"; g.font = `700 17px ${A.FONT_CJK}`; g.fillText(what, x + 128, ry); g.textAlign = "center";
    });
    g.fillStyle = "#ffe14d"; g.font = `900 18px ${A.FONT_CJK}`; g.strokeStyle = A.INK; g.lineWidth = 4; g.lineJoin = "round";
    g.strokeText("點一下或按任意鍵開始", VW / 2, y + h + 44 + bob); g.fillText("點一下或按任意鍵開始", VW / 2, y + h + 44 + bob);
    g.restore();
  }

  function launchIfReady() {
    const b = G.world.balls.find(x => P.ballInLane(x));
    if (b && b.y > 990 && Math.abs(b.vy) < 30) {
      R.launch(T, G.run, b, G.plunger.charge);
      G.ballSave = R.ballSaveTime(T, G.run, G.assists);
      AU.play("launch"); vibrate(20);
    }
  }

  function ballLost() {
    if (G.ballSave > 0 || G.itemFx.save > 0) {
      G.world.balls = [P.newBall(T, G.world)]; G.ballSave = 0;
      AU.play("save"); say("球保險！再來一次！", "wow"); popup(185, 900, "BALL SAVED", true);
      return;
    }
    if (SR.TUNE && SR.TUNE.practice) { G.world.balls = [P.newBall(T, G.world)]; popup(185, 900, "PRACTICE", true); return; }
    G.run.hearts--; G.heartsLost++;
    AU.play("drain"); vibrate([90, 50, 160]); G.shake = 12;
    updateHud();
    if (G.run.hearts <= 0) { G.screen = "over"; setTimeout(runOver, 700); return; }
    say(["小心！", "還有機會！", "沒關係，下一顆！"][G.run.hearts % 3], "sad");
    G.world.balls = [P.newBall(T, G.world)];
  }

  function onCleared() {
    G.screen = "clearing";
    const secs = G.stageTime, stars = R.stars(G.stage, G.heartsLost, secs, G.continued);
    const n = G.stage.n;
    save.stars[n] = Math.max(save.stars[n] || 0, stars);
    save.unlocked = Math.max(save.unlocked, n + 1);
    save.stats.clears++;
    G.run.starsEarned += stars; G.run.maxCombo = Math.max(G.run.maxCombo, G.ps.maxCombo);
    const heartsLeft = G.run.hearts;
    if (n % 10 !== 0) R.heartOnClear(T, G.run);          // 過關回 1 顆愛心
    if (G.tut) { G.tut = null; save.tutorialDone = true; }
    R.persist(save);
    updateHud();
    // 首領關：剩下的磚跟著碎掉，牆面炸滿顏色
    for (const k of G.world.bricks) if (k.alive) { k.alive = false; burstPaint(k.x + k.w / 2, k.y + k.h / 2, 16); }
    const f = G.lastBreak || { x: 200, y: 200 };
    G.cine = { type: "clear", t: 0, dur: 2.6, fx: f.x, fy: f.y, camFrom: G.cam.y, stars, secs, splatted: 0 };
    AU.play("clear"); AU.setIntensity(2); vibrate([60, 50, 140]);
    say(stars === 3 ? "金牌！一顆愛心都沒掉！" : "牆變彩色了！", "happy", 2500);
    achieve({ clearedStage: n, bossDistrict: n % 10 === 0 ? n / 10 : 0, combo: G.ps.maxCombo, flawless: G.heartsLost === 0, balls: G.ps.maxBalls, chain: G.ps.maxChain,
              medal: stars, heartsLeft, fishHits: G.fishHits });
  }
  function afterClear(stars, secs) {
    const n = G.stage.n;
    // 一般關卡：過關直接抽一罐強化（首領關結束這一輪，不抽）
    let reward = null;
    if (n % 10 !== 0) {
      const o = R.offerUpgrades(T, G.run, Math.random);
      if (o.length) { reward = o[0]; R.takeUpgrade(T, G.run, reward.id); updateHud(); }
    }
    stageResult(stars, secs, reward, () => {
      const after = SR.storyAfter(n);
      playStory(after, () => {
        if (n === 50) { G.ending = true; credits(); return; }
        if (n % 10 === 0) { districtCleared(); return; }
        goStage(n + 1);
      });
    });
  }

  /* ---------- 物理事件 → 回饋 ---------- */
  function popup(x, y, text, big = false, color) { G.popups.push({ x, y, text, big, life: big ? 1.2 : 0.8, max: big ? 1.2 : 0.8, color }); }
  function burstPaint(x, y, size, color) {
    const c = color || paintColor();
    A.splat(G.paint.getContext("2d"), x, y, c, size);
    for (let i = 0; i < 15; i++) {                                               // 碎片 1.5 倍（提案 boost-feel）
      const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 260;
      G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.5, max: 0.5, color: c, r: 2 + Math.random() * 3 });
    }
  }
  let lastHitSfx = 0;
  function handleEvents(ev) {
    const run = G.run, ps = G.ps, prevCombo = ps.combo;
    const extra = R.processEvents(T, run, G.world, ev, ps);
    for (const e of [...ev, ...extra]) {
      switch (e.type) {
        case "ball_brick": if (G.t - lastHitSfx > 0.03) { AU.play("brickHit"); lastHitSfx = G.t; } break;
        case "brick_hit": if (e.k.type === "boss") { AU.play("bossHit"); G.shake = Math.max(G.shake, 5); vibrate(28); popup(e.k.x + e.k.w / 2, e.k.y - 8, "-" + G.world.dmg); } else vibrate(8); break;
        case "brick_break": {
          const k = e.k, cx = k.x + k.w / 2, cy = k.y + k.h / 2;
          G.lastBreak = { x: cx, y: cy };
          if (k.type === "boss") break;
          const pts = Math.round(T.brick.score * k.maxHp * (1 + ps.combo / 10));
          run.score += pts; run.bricks++; save.stats.bricks++;
          burstPaint(cx, cy, k.type === "bucket" ? 30 : 14 + k.maxHp * 3);
          popup(cx, cy - 6, "+" + pts);
          // 爽感（提案 boost-feel）：磚碎掉白閃 60 毫秒；1 秒內碎 3 塊以上畫面震動加大到 6
          G.flashes.push({ x: k.x, y: k.y, w: k.w, h: k.h, t: 0.06, max: 0.06 });
          G.recentBreaks.push(G.t); G.recentBreaks = G.recentBreaks.filter(t0 => G.t - t0 <= 1);
          if (G.recentBreaks.length >= 3) G.shake = Math.max(G.shake, 6);
          if (k.type === "bucket") { AU.play("bucket"); G.shake = Math.max(G.shake, 9); G.hitstop = 0.06; vibrate([40, 30, 60]); }
          else if (k.type === "gift") AU.play("achievement");   // 膠囊由物理放出（capsule_drop），接到才生效

          else { AU.play("brickBreak", Math.min(8, ps.combo / 4)); G.shake = Math.max(G.shake, 3); vibrate(18 + Math.min(20, ps.combo)); }
          break;
        }
        case "capsule_drop":                                // 道具膠囊掉下來（第一次：暫停特寫教學；之後噴噴提醒一次）
          // 最後一塊磚剛好是道具磚：這一關已經要過了，不暫停教學（過關演出會接手），下一次掉膠囊再教
          if (!seenObj("capsule") && P.liveBricks(G.world).some(k => k.type !== "boss")) { const c = e.c; showObjectIntro([{ kind: "capsule", at: () => ({ x: c.x, y: c.y, w: 36, h: 36 }) }]); }
          else if (!save.seenCapsule) { save.seenCapsule = true; R.persist(save); say("道具掉下來了！用滑板接住！", "wow", 2600); }
          break;
        case "capsule_caught": catchItem(e.item, e.x, e.y); break;
        case "capsule_missed": break;
        case "boost": {                                     // 加速帶（v3.7）＋衝刺演出（提案 boost-feel，2026-10-08）
          AU.play("boost"); vibrate(30);
          const b = e.b, sp = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / sp, dy = b.vy / sp;
          G.hitstop = Math.max(G.hitstop, 0.04);                                   // 停格一下
          G.nudge = { x: dx * 6, y: dy * 6, t: 0.5, max: 0.5 };                     // 畫面往球的方向推 6 px 再彈回
          b.dash = 0.5;                                                              // 拖尾變綠變長、速度線
          const pad = G.world.boosts.find(q => e.x >= q.x - 4 && e.x <= q.x + q.w + 4 && e.y >= q.y - 8 && e.y <= q.y + q.h + 8) || G.world.boosts[0];
          if (pad) {
            pad.flash = 0.5;
            for (let i = 0; i < 12; i++) {                                           // 箭頭往上噴 12 顆萊姆綠光點
              const a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9, v = 260 + Math.random() * 240;
              G.particles.push({ x: pad.x + Math.random() * pad.w, y: pad.y + pad.h / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.45, max: 0.45, color: "#9dff3a", r: 2 + Math.random() * 2.5 });
            }
            popup(pad.x + pad.w / 2, pad.y - 22, "BOOST!", true, "#9dff3a");
          }
          if (!G._boostTold) { G._boostTold = true; say("踩到加速帶，球變快了！", "wow", 1600); }
          break;
        }
        case "bumper":
          e.c.flash = e.c.kind === "fish" ? 0.4 : 0.12; run.score += 5; AU.play("bumper"); vibrate(14);
          if (e.c.kind === "fish") { G.fishHits++; if (G.fishHits === 1) say("阿鰭：「好痛……把球吐回去！」", "wow", 1800); }
          break;
        case "sling": e.s.flash = 0.1; AU.play("sling"); vibrate(10); break;
        case "flipper": if (e.speed > 1700) G.shake = Math.max(G.shake, 2); vibrate(12); break;
        case "paddle": {
          if (G.tut && G.tut.step === "move") G.tut.hit = true;
          AU.play("flipper"); const edge = Math.abs(e.off || 0) > 0.6;
          vibrate(edge ? 24 : 16); G.shake = Math.max(G.shake, edge ? 3 : 1.5);
          // 擊球回饋：接觸點噴一小團漆，往出球方向飛；打邊邊（斜射）更大、更亮
          const ang = Math.atan2(e.b.vy, e.b.vx), c = edge ? pal().a : pal().c;
          for (let i = 0; i < (edge ? 12 : 7); i++) {
            const a = ang + (Math.random() - 0.5) * 0.9, s = 160 + Math.random() * (edge ? 320 : 200);
            G.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35, max: 0.35, color: c, r: 2 + Math.random() * 2.5 });
          }
          if (edge) popup(e.x, e.y - 24, e.off < 0 ? "↖" : "↗", false, c);
          break;
        }
        case "wall": AU.play("wall", e.speed); break;
        case "split": popup(e.x, e.y - 20, `分裂 ×${e.n + 1}`, true, pal().c); AU.play("card"); break;
        case "pierce": burstPaint(e.x, e.y, 8); break;
        case "bomb": A.splat(G.paint.getContext("2d"), e.x, e.y, paintColor(), e.r * 0.8); AU.play("bucket"); G.shake = 10; G.hitstop = 0.05; popup(e.x, e.y, "漆彈！", true, pal().a); break;
        case "boss_regen": AU.play("bossRegen"); say("他在補灰磚！", "wow", 1500); break;
        case "boss_enrage": popup(200, 120, "灰先生生氣了！", true, "#ff5a5a"); AU.setIntensity(2); say("他生氣了！速度變快！", "wow"); break;
      }
    }
    // 連擊里程碑
    if (ps.combo > prevCombo) {
      G.comboFx = { n: ps.combo, t: 1.3 };
      if (ps.combo >= 5) AU.play("combo", ps.combo);
      for (const m of [10, 20, 30, 50, 100]) if (prevCombo < m && ps.combo >= m) {
        say(m >= 50 ? `${m} 連擊！！停不下來！` : `${m} 連擊！`, "happy", 1600); G.hitstop = 0.05; vibrate([30, 40, 30, 40, 60]);
      }
    }
    AU.setIntensity(ps.combo >= 10 || (G.world.boss && G.world.boss.enraged) ? 2 : ps.combo >= 4 || G.stage.isBoss ? 1 : 0);
    if (ev.some(e => e.type === "drain") && !G.world.balls.length) ballLost();
    if (ps.combo >= 20 || ps.maxBalls >= 4 || ps.maxChain >= 6) achieve({ combo: ps.maxCombo, balls: ps.maxBalls, chain: ps.maxChain });
    const left = P.liveBricks(G.world).filter(k => k.type !== "boss").length;
    if (!G.world.boss && left > 0 && left <= 3 && G.world.bricks.length > 3 && !G._warnedLast) { /* 教學關本來就只有 1～3 塊，不喊「剩 N 塊」 */ G._warnedLast = true; say(`剩 ${left} 塊！`, "wow", 1500); }
    if (left > 3) G._warnedLast = false;
    updateHud();
    if (R.isCleared(G.world)) onCleared();
  }

  /* ============================================================
     主迴圈
     ============================================================ */
  let acc = 0, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }
  /* 一幀的全部邏輯（也給自動驗收手動推進用：SR_GAME.tick(1/60)） */
  function tick(dt) {
    G.t += dt;
    // 台面區大小變了（道具欄出現、提示文字變兩行…）就重算台面大小，台面永遠不會被蓋住
    const wh = $("stagewrap").clientHeight;
    if (wh !== G.wrapH) { G.wrapH = wh; fit(); }
    tickWindow(dt);
    tickDialog(dt);
    drawPinkyHud(dt);
    // 特效衰減（真實時間）
    G.shake *= Math.exp(-12 * dt);
    if (G.comboFx.t > 0) G.comboFx.t -= dt;
    // 鍵盤（沒有拖曳）：按住空白鍵會慢慢往後拉；拖曳時由手指位置決定（pullPlunger）
    if (G.plunger.holding && !G.plunger.drag) G.plunger.charge = Math.min(1, G.plunger.charge + dt / T.plunger.charge_time);
    if (G.plunger.nudge > 0) G.plunger.nudge = Math.max(0, G.plunger.nudge - dt * 1.5);

    tickCine(dt);
    if (G.screen === "opening") tickOpening(dt);
    const playing = (G.screen === "play" || G.screen === "intro" || G.screen === "clearing") && !G.paused && !dlg;
    if (G.world && (G.attract || playing)) {
      // 時間倍率：過場（G.timeScale）× 慢動作道具 × 教學的慢動作
      const slowItem = G.screen === "play" && G.itemFx.slow > 0 ? T.items.slow_scale : 1;
      // 滑板的教學慢動作不能太慢：滑板也在物理時間裡移動，太慢會跟不上手指
      const tutSlow = G.screen === "play" && G.tut && G.tut.slow ? (G.world.paddle ? 0.35 : 0.12) : 1;
      const sdt = dt * G.timeScale * slowItem * tutSlow;
      for (const p of G.particles) { p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += 600 * sdt; p.life -= dt; }
      G.particles = G.particles.filter(p => p.life > 0);
      for (const p of G.popups) p.life -= dt;
      G.popups = G.popups.filter(p => p.life > 0);
      for (const f of G.flashes) f.t -= dt;
      G.flashes = G.flashes.filter(f => f.t > 0);
      if (G.nudge) { G.nudge.t -= dt; if (G.nudge.t <= 0) G.nudge = null; }
      for (const b of G.world.balls) if (b.dash > 0) b.dash -= dt;
      for (const c of G.world.circles) if (c.flash > 0) c.flash -= dt;
      for (const s of G.world.segments) if (s.flash > 0) s.flash -= dt;
      for (const k of G.world.bricks) { if (k.flash > 0) k.flash -= dt; if (k.fresh && k.flash <= 0) k.fresh = false; }
      if (G.hitstop > 0) G.hitstop -= dt;
      else if (G.screen !== "intro") {
        acc += sdt;
        while (acc >= 1 / 60) {
          acc -= 1 / 60;
          if (G.attract) SR.Tests.bot(G.world, T, Math.random);
          const ev = []; P.stepFrame(G.world, T, ev);
          if (G.attract) {
            for (const e of ev) if (e.type === "brick_break") burstPaint(e.x, e.y, 14);
            if (!G.world.balls.length) G.world.balls = [P.newBall(T, G.world)];
            if (!P.liveBricks(G.world).length) startAttract(true);
            continue;
          }
          if (G.screen === "play") {
            if (ev.some(e => e.type === "brick_break")) G.lastBreakT = G.stageTime;
            const fin = R.updateFinisher(T, G.world, G.assists, G.stageTime - (G.lastBreakT || 0));
            if (fin && !G._finTold) { G._finTold = true; say("剩下的磚我幫你標出來了，球會往那邊偏！", "happy", 3000); }
            R.bossTick(T, G.world, G.stage, 1 / 60, ev);
            R.tickItems(G.world, G.itemFx, 1 / 60);
            G.stageTime += 1 / 60;
            if (G.ballSave > 0 && G.world.balls.some(b => !P.ballInLane(b))) G.ballSave = Math.max(0, G.ballSave - 1 / 60);
            handleEvents(ev);
          }
          for (const b of G.world.balls) {
            // 拖尾光長度看區（v3.7：第 3 區剩一半、第 4、5 區沒有）
            const max = b.dash > 0 ? Math.max(6, SR.trailFor(G.stage.n) * 2) : SR.trailFor(G.stage.n), tr = G.trails.get(b.id) || []; tr.push({ x: b.x, y: b.y }); while (tr.length > max) tr.shift(); G.trails.set(b.id, tr);
          }
          if (G.hitstop > 0 || G.screen !== "play") { if (G.screen !== "clearing") acc = 0; break; }
        }
      }
      if (!G.cine) P.updateCamera(G.cam, G.world, dt);
    }
    if (G.screen === "play" && G.world) { tickKeys(dt); tickIntro(dt); if (!G.intro && !G.ctrlCard) tickTutorial(dt); computePreviews(); }
    else G.previews = [];
    updateHintText();
    // 電腦的滑板模式遊玩中把滑鼠游標藏起來（滑板就是游標）；暫停、教學卡、操作卡時放回來
    const cur = FINE && G.screen === "play" && G.world && G.world.paddle && !G.paused && !G.intro && !G.ctrlCard ? "none" : "";
    if (canvas.style.cursor !== cur) canvas.style.cursor = cur;
    render();
  }

  /* ---------- 彈道預覽（輔助，依街區長度不同；第 4 區起關閉）---------- */
  function computePreviews() {
    const secs = G.assists.preview || 0;
    G.previews = [];
    // 落點提示：每 3 幀算一次最先落下的那顆球
    if (G.world.paddle && (G.assists.timing || G.tut) && (G._landT = (G._landT || 0) + 1) % 3 === 0) {
      let best = null;
      for (const b of G.world.balls) if (!P.ballInLane(b) && b.vy > -400) { const l = P.landingPoint(G.world, T, b, 1.6); if (l && (!best || l.t < best.t)) best = l; }
      G.landing = best;
    }
    if (!G.world.paddle || !(G.assists.timing || G.tut)) G.landing = null;
    if (!secs) return;
    for (const b of G.world.balls) {
      if (P.ballInLane(b) && b.y > 990) {
        if (!G.plunger.holding) continue;
        // 蓄力中：預覽這個力道發射出去會怎麼走
        const ghost = { ...b, vy: -(T.plunger.min_speed + (T.plunger.max_speed - T.plunger.min_speed) * G.plunger.charge) };
        G.previews.push(P.predictPath(G.world, T, ghost, Math.max(secs, 0.8), 6));
      } else G.previews.push(P.predictPath(G.world, T, b, secs, 6));
    }
  }
  /* 擋板時機提示：球進入這一側擋板能打到的範圍 */
  function inReach(side) {
    return G.world.balls.some(b => b.vy > -50 && b.y > P.FLIP_Y - 75 && b.y < P.FLIP_Y + 20 && (side === "L" ? b.x > 95 && b.x < 185 : b.x >= 185 && b.x < 275));
  }

  /* ---------- 互動教學（第 1 關、第一次玩）----------
     press → release → watch → flip（慢動作、指出左右，等玩家按對，帶 3 次）→ done */
  function tickTutorial(dt) {
    const tu = G.tut; if (!tu) return;
    tu.t += dt;
    const w = G.world, laneBall = w.balls.find(b => P.ballInLane(b) && b.y > 990);
    if (tu.step === "press") { if (G.plunger.holding) next("release"); }
    else if (tu.step === "release") { if (!G.plunger.holding) next(laneBall ? "press" : "watch"); }
    else if (tu.step === "watch") {
      if (laneBall) next("press");
      else if (tu.t > 1.2 && w.balls.some(b => b.vy > 0 && b.y > P.FLIP_Y - (w.paddle ? 260 : 150) && b.x > 100 && b.x < 270)) { next(w.paddle ? "move" : "flip"); tu.slow = true; }
    } else if (tu.step === "move") {
      // 滑板：慢動作＋落點圈，等玩家把滑板移過去接到球（接到的事件在 handleEvents 的 paddle）
      if (tu.hit) {
        tu.hit = false; tu.slow = false; tu.flips++;
        AU.play("combo", 5 + tu.flips * 5);
        next(tu.flips >= 3 ? "done" : "watch");
        if (tu.flips < 3) say(["接到了！球打在滑板邊邊會飛得比較斜！", "很好！再一次！"][tu.flips - 1], "happy", 1800);
      } else if (laneBall) { tu.slow = false; next("press"); }
      else if (!w.balls.some(b => b.y > P.FLIP_Y - 300)) { tu.slow = false; next("watch"); }
    } else if (tu.step === "flip") {
      const b = w.balls.find(x => x.y > P.FLIP_Y - 220);
      if (!b) { tu.slow = false; next("watch"); return; }
      tu.side = b.x < 185 ? "L" : "R";
      if (w.flippers.some(f => f.side === tu.side && f.pressed)) {
        tu.slow = false; tu.flips++;
        AU.play("combo", 5 + tu.flips * 5);
        next(tu.flips >= 3 ? "done" : "watch");
        if (tu.flips < 3) say(["打到了！就是這樣！", "很好！再一次！"][tu.flips - 1], "happy", 1400);
      }
      if (laneBall) { tu.slow = false; next("press"); }
    } else if (tu.step === "done" && tu.t > 3.2) {
      G.tut = null; save.tutorialDone = true; R.persist(save);
    }
    function next(s) {
      tu.step = s; tu.t = 0;
      if (s === "done") say(P.liveBricks(G.world).filter(k => k.type !== "boss").length === 1 ? "很好！接下來靠你自己了。打碎那塊灰磚就過關！" : "很好！接下來靠你自己了。打碎所有灰磚就過關！", "happy", 3200);
    }
  }
  // 教學卡的文字：電腦說空白鍵與滑鼠、手機說手指（提案 desktop-controls）
  function tutLines(step, coarse = !FINE) {
    const pad = !G.world || !!G.world.paddle;
    const L = {
      press: pad ? (coarse ? ["按住畫面，往下拉", "像真的彈珠台拉柄一樣"] : ["按住空白鍵蓄力，放開發射", "也可以按住滑鼠往下拉"]) : ["按住右下角，往下拉", "像真的彈珠台拉柄一樣"],
      release: coarse ? ["拉越多，力道越大", "拉到底就放開手指！"] : ["按越久，力道越大", "放開空白鍵就發射！"],
      watch: ["球打碎灰磚，", "外面那面牆的畫就會回來"],
      move: coarse ? ["把滑板移到圈圈下面", "手指按著左右滑"] : ["移動滑鼠接球，不用點", "把滑板移到圈圈下面"],
      done: ["很好！", "打碎所有灰磚就過關"]
    };
    return L[step] || null;
  }

  /* ---------- 過場鏡頭 ---------- */
  function tickCine(dt) {
    const c = G.cine, v = G.view;
    if (!c) { v.tilt += (0 - v.tilt) * Math.min(1, dt * 8); v.rz += (0 - v.rz) * Math.min(1, dt * 8); v.scale += (1 - v.scale) * Math.min(1, dt * 8); applyTilt(); return; }
    c.t += dt;
    const k = c.t / c.dur;
    if (c.type === "intro") {
      // v3.11 開場運鏡（提案 stage-intro-sweep，2.3 秒）：
      // ① 0–1.2 秒 台面傾斜 38°（3D），拉近 2 倍到最上排磚的左端（0–0.4 秒），再橫移到右端（0.4–1.2 秒）；首領關改成特寫首領＋震動
      // ② 1.2–2.3 秒 拉遠回 1 倍，同時台面從傾斜轉平、回到平常畫面。重打的短版（1.2 秒）只有 ②。
      // v.tx／v.ty＝鏡頭看著的點（畫面座標）：畫在畫面正中央（200, 370）
      G.cam.y = P.CAM_MAX;
      const cy = G.cam.y, boss = G.world.boss, bricks = G.world.bricks || [];
      const top = bricks.length ? Math.min(...bricks.map(b => b.y + b.h / 2)) : 450;
      const row = bricks.filter(b => Math.abs(b.y + b.h / 2 - top) < 2);
      const left = [row.length ? Math.min(...row.map(b => b.x + b.w / 2)) : 80, top - cy];
      const right = [row.length ? Math.max(...row.map(b => b.x + b.w / 2)) : 320, top - cy];
      const focus = boss ? [boss.x + (boss.w || 0) / 2, boss.y + (boss.h || 0) / 2 - cy] : null;
      const end = focus || right, mid = [viewCX(), 370], smooth = x => (x = Math.max(0, Math.min(1, x)), x * x * (3 - 2 * x));
      let z, p, flat;                                                // flat：0＝傾斜 38°、1＝平
      if (c.dur < 2) { flat = ease(c.t / c.dur); z = lerp(2, 1, flat); p = [lerp(end[0], viewCX(), flat), lerp(end[1], 370, flat)]; }
      else if (c.t < 1.2) {
        flat = 0;
        const k1 = ease(Math.min(1, c.t / 0.4)); z = lerp(1, 2, k1);
        if (focus) { p = [lerp(mid[0], focus[0], k1), lerp(mid[1], focus[1], k1)]; if (c.t > 0.15) G.shake = Math.max(G.shake, 4); }
        else if (c.t < 0.4) p = [lerp(mid[0], left[0], k1), lerp(mid[1], left[1], k1)];
        else { const k2 = smooth((c.t - 0.4) / 0.8); p = [lerp(left[0], right[0], k2), left[1]]; }
      } else { flat = ease(Math.min(1, (c.t - 1.2) / 1.1)); z = lerp(2, 1, flat); p = [lerp(end[0], viewCX(), flat), lerp(end[1], 370, flat)]; }
      v.zoom = z; v.tx = p[0]; v.ty = p[1];
      v.tilt = 38 * (1 - flat); v.scale = lerp(0.88, 1, flat); v.rz = -3 * (1 - flat);
      if (c.t >= c.dur) beginPlay();
    } else if (c.type === "clear") {
      // 慢動作特寫 → 定格 → 3D 傾斜展示整面彩色牆
      if (c.t < 0.9) { G.timeScale = 0.15; v.zoom = lerp(1, 1.7, ease(c.t / 0.5)); v.fx = viewCX(); v.fy = c.fy - G.cam.y; }
      else {
        G.timeScale = 0;
        const k2 = ease((c.t - 0.9) / 1.2);
        v.zoom = lerp(1.7, 1, k2); G.cam.y = lerp(c.camFrom, Math.min(G.world.top, P.CAM_MAX), k2);
        v.tilt = 24 * k2; v.rz = -4 * k2; v.scale = lerp(1, 0.92, k2);
        // 整面牆噴滿顏色
        const want = Math.floor(k2 * 70);
        while (c.splatted < want) { c.splatted++; A.splat(G.paint.getContext("2d"), 30 + Math.random() * 300, G.world.top + 60 + Math.random() * (840 - G.world.top), paintColor(), 18 + Math.random() * 30); }
      }
      if (c.t >= c.dur) { G.cine = null; G.timeScale = 1; afterClear(c.stars, c.secs); }
    }
    applyTilt();
  }
  function applyTilt() {
    const v = G.view;
    canvas.style.transform = Math.abs(v.tilt) < 0.05 && Math.abs(v.rz) < 0.05 && Math.abs(v.scale - 1) < 0.002 ? "" :
      `rotateX(${v.tilt.toFixed(2)}deg) rotateZ(${v.rz.toFixed(2)}deg) scale(${v.scale.toFixed(3)})`;
  }

  /* ---------- 繪圖 ---------- */
  function render() {
    const g = ctx, w = G.world;
    g.setTransform(canvas.width / VW, 0, 0, canvas.height / VH, 0, 0);
    g.fillStyle = "#18181d"; g.fillRect(0, 0, VW, VH);
    if (G.screen === "opening") { drawOpening(g); return; }
    if (!w) return;
    const v = G.view, p = pal();
    g.save();
    if (G.shake > 0.2) g.translate((Math.random() - 0.5) * G.shake * 2, (Math.random() - 0.5) * G.shake * 2);
    if (G.nudge) { const k = G.nudge.t / G.nudge.max; g.translate(G.nudge.x * k, G.nudge.y * k); }   // 衝刺：畫面被推一下再彈回
    if (v.ty != null) { g.translate(VW / 2, 370); g.scale(v.zoom, v.zoom); g.translate(-v.tx, -v.ty); }
    else { g.translate(-G.win.x0, 0); g.translate(v.fx, v.fy); g.scale(v.zoom, v.zoom); g.translate(-v.fx, -v.fy); }
    g.translate(0, -G.cam.y);
    const laneSlide = G.laneK * LANE_SLIDE;
    g.drawImage(A.wall(G.district, VW, P.H, w.top || 0), 0, 0);
    g.drawImage(G.paint, 0, 0);
    A.table(g, w, p, G.t, laneSlide);
    for (const k of w.bricks) A.brick(g, k, p, G.t);
    for (const f of G.flashes) { g.fillStyle = `rgba(255,255,255,${(0.9 * f.t / f.max).toFixed(2)})`; g.fillRect(f.x - 3, f.y - 3, f.w + 6, f.h + 6); }   // 碎磚白閃
    for (const c of w.capsules || []) A.capsule(g, c, SR.ITEMS.find(i => i.id === c.item), G.t);
    if (w.magnet && G.screen === "play") {
      // 收尾輔助：剩下的磚發光＋目標框
      for (const k of w.bricks) if (k.alive && k.type !== "boss") { g.strokeStyle = A.rgba(p.c, 0.5 + 0.4 * Math.sin(G.t * 8)); g.lineWidth = 4; g.strokeRect(k.x - 4, k.y - 4, k.w + 8, k.h + 8); }
      const k = w.magnet.k; g.save(); g.strokeStyle = "#ffffff"; g.lineWidth = 2; g.setLineDash([6, 5]); g.lineDashOffset = -G.t * 40;
      g.beginPath(); g.arc(k.x + k.w / 2, k.y + k.h / 2, 30 + Math.sin(G.t * 6) * 4, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    if (w.boss) A.boss(g, w.boss, G.t, w.boss.flash > 0);
    // 彈道預覽：白色虛點，越遠越淡（參考 LINE Bubble 的瞄準線）
    for (const path of G.previews) {
      for (let i = 1; i < path.length; i += 2) {
        const a = 1 - i / path.length;
        g.globalAlpha = 0.25 + 0.65 * a;
        g.beginPath(); g.arc(path[i].x, path[i].y, 3.2, 0, Math.PI * 2);
        g.fillStyle = "#ffffff"; g.fill(); g.lineWidth = 1.5; g.strokeStyle = A.INK; g.stroke();
      }
      g.globalAlpha = 1;
    }
    const dims = P.flipperDims(T, w);
    const tutSide = G.tut && G.tut.step === "flip" ? G.tut.side : null;
    for (const f of w.flippers) A.flipper(g, f, dims, p, (G.assists.timing && G.screen === "play" && inReach(f.side)) || tutSide === f.side);
    if (w.paddle) {
      // 落點提示（滑板模式的新手輔助）：球會掉在哪裡，畫一個圈＋往下的箭頭
      if (G.landing && G.screen === "play") {
        const lx = G.landing.x, ly = P.PADDLE_Y, pulse = 1 + 0.12 * Math.sin(G.t * 10);
        const under = Math.abs(lx - w.paddle.x) < P.paddleDims(T, w).hw - 6;
        g.save(); g.strokeStyle = under ? "#9dff3a" : "#ffffff"; g.lineWidth = 3; g.setLineDash([5, 5]); g.lineDashOffset = -G.t * 30;
        g.beginPath(); g.ellipse(lx, ly, 22 * pulse, 9 * pulse, 0, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
        g.fillStyle = under ? "#9dff3a" : "#ffffff"; g.beginPath(); g.moveTo(lx - 7, ly - 30); g.lineTo(lx + 7, ly - 30); g.lineTo(lx, ly - 20); g.closePath(); g.fill();
        g.restore();
      }
      A.paddle(g, w.paddle, P.paddleDims(T, w), p, G.t, G.tut && G.tut.step === "move");
    }
    // 發射桿（拉柄＋彈簧）：球在發射道等發射時，閃一個「往下拉」的提示
    const c = G.plunger.charge, waiting = G.screen === "play" && w.balls.some(b => P.ballInLane(b) && b.y > 990);
    g.save(); g.translate(laneSlide, 0); A.plunger(g, c, p, G.t, waiting && !G.plunger.holding, G.plunger.nudge || 0); g.restore();
    // 拉發射桿時，球跟著托盤一起往下
    for (const b of w.balls) { if (P.ballInLane(b) && G.laneK > 0.02) continue; A.ball(g, G.plunger.holding && P.ballInLane(b) && b.y > 990 ? { ...b, y: b.y + c * A.PULL_PX } : b, p, G.trails.get(b.id) || []); }   // 發射道還沒滑回來時先不畫裡面的球
    for (const q of G.particles) { g.globalAlpha = Math.max(0, q.life / q.max); g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    for (const q of G.popups) {
      g.globalAlpha = Math.min(1, q.life / q.max * 2);
      A.tag(g, q.text, q.x, q.y - (1 - q.life / q.max) * 26, q.big ? 22 : 14, [q.color || "#ffffff"], { drips: false, cjk: /[^\x00-\x7F]/.test(q.text) });
    }
    g.globalAlpha = 1;
    g.restore();

    // ---- 螢幕座標的 HUD 與光影 ----
    const vg = g.createRadialGradient(VW / 2, 370, 200, VW / 2, 370, 480);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    if (w.boss && w.boss.alive && !G.attract) {
      const frac = Math.max(0, w.boss.hp / w.boss.maxHp);
      g.fillStyle = A.INK; g.fillRect(48, 12, 304, 18);
      g.fillStyle = w.boss.enraged ? "#ff5a5a" : "#b8b8bf"; g.fillRect(51, 15, 298 * frac, 12);
      g.fillStyle = "#fff"; g.font = `900 11px ${A.FONT_CJK}`; g.textAlign = "left"; g.textBaseline = "middle";
      g.fillText(`灰先生 ${w.boss.hp}/${w.boss.maxHp}`, 56, 21);
    }
    if (!G.attract && G.screen === "play") {
      if (G.comboFx.t > 0 && G.comboFx.n >= 3) {
        const pop = 1 + Math.max(0, G.comboFx.t - 1.1) * 2;
        g.save(); g.globalAlpha = Math.min(1, G.comboFx.t * 1.5);
        A.tag(g, String(G.comboFx.n), VW - 88, 92, 46 * pop, [p.c, p.a], { rot: -0.08 });
        A.tag(g, "連擊", VW - 82, 128, 18, [p.b], { cjk: true, drips: false });
        g.restore();
      }
      if (G.ballSave > 0 && w.balls.some(b => !P.ballInLane(b))) { g.fillStyle = "#9dff3a"; g.font = `900 12px ${A.FONT_CJK}`; g.textAlign = "center"; g.fillText(`球保險 ${G.ballSave.toFixed(1)}s`, 180, VH - 14); }
      if (G.plunger.holding) {
        g.fillStyle = A.INK; g.fillRect(VW - 14, VH - 170, 10, 150);
        g.fillStyle = p.a; g.fillRect(VW - 12, VH - 22 - 146 * G.plunger.charge, 6, 146 * G.plunger.charge);
      }
      const left = P.liveBricks(w).filter(k => k.type !== "boss").length;
      if (!w.boss) { g.fillStyle = "rgba(17,17,20,0.7)"; g.fillRect(8, 8, 74, 22); g.fillStyle = "#fff"; g.font = `900 12px ${A.FONT_CJK}`; g.textAlign = "left"; g.fillText(`灰磚 ${left}`, 14, 20); }
    }
    if (G.screen === "play" && G.itemFx.slow > 0) { g.fillStyle = "rgba(62,224,255,0.10)"; g.fillRect(0, 0, VW, VH); A.tag(g, `⏳ ${G.itemFx.slow.toFixed(1)}`, 60, VH - 40, 16, ["#3ee0ff"], { drips: false, rot: 0 }); }
    if (G.screen === "play" && G.itemFx.save > 0) A.tag(g, `🛟 ${Math.ceil(G.itemFx.save)}`, VW - 60, VH - 40, 16, ["#9dff3a"], { drips: false, rot: 0 });
    if (G.tut && G.screen === "play" && !G.intro && !G.ctrlCard) drawTutorial(g);
    if (G.intro && G.screen === "play") drawIntro(g);
    if (G.ctrlCard && G.screen === "play") drawCtrlCard(g);
    if (G.cine && G.cine.type === "intro") {
      const k = G.cine.t;
      const slam = k < 0.35 ? 1 + (0.35 - k) * 3 : 1;
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, (G.cine.dur - k) * 2));   // 開場期間一直顯示，最後淡出
      const ty0 = lerp(120, 300, Math.max(0, Math.min(1, (G.view.zoom - 2) / -1)));   // 特寫時在上方空牆；拉遠時跟著往下移到磚的下方，兩邊都不擋住磚
      A.tag(g, `STAGE ${G.stage.n}`, VW / 2, ty0, 44 * slam, [p.a, p.b]);
      A.tag(g, G.stage.name, VW / 2, ty0 + 52, 26, [p.c], { cjk: true, drips: false, rot: 0.04 });
      A.tag(g, `台面：${w.layout.name}`, VW / 2, ty0 + 96, 17, ["#ffffff"], { cjk: true, drips: false, rot: 0.02 });
      g.restore();
    }
    if (G.cine && G.cine.type === "clear" && G.cine.t > 0.9) {
      const k = ease((G.cine.t - 0.9) / 0.4);
      A.tag(g, "WALL", VW / 2, 300, 60 * (2 - k), [p.a, p.b]);
      A.tag(g, "CLEARED!", VW / 2, 372, 50 * (2 - k), [p.c, p.a]);
    }
  }

  /* ---------- 開場動畫（第 6 輪：初次進入遊戲時播放）----------
     「投幣開始」：點一下＝投下硬幣（同時讓瀏覽器允許播放聲音）→ 灰城 → 老彈珠台亮起 → 噴漆炸開 → SPRAY RUN 招牌 → 噴噴跳出來
     大約 7 秒，播放中點一下可以跳過 */
  const OP_DUR = 7;
  function openingScreen() {
    hideScreen(); G.screen = "opening"; G.attract = false;
    G.op = { phase: "coin", t: 0, paint: A.off(VW, VH), splats: 0 };
    updateHud();
  }
  function openingTap() {
    const op = G.op; if (!op) return;
    AU.ensure();
    if (op.phase === "coin") { op.phase = "play"; op.t = 0; AU.play("launch"); vibrate(30); return; }
    if (op.t > 0.8) finishOpening();
  }
  function finishOpening() {
    save.seenOpening = true; R.persist(save);
    G.op = null; titleScreen();
  }
  function tickOpening(dt) {
    const op = G.op; if (!op) return;
    op.t += dt;
    if (op.phase !== "play") return;
    const t = op.t;
    if (t > 1.2 && !op.lit) { op.lit = true; AU.play("bumper"); }
    // 2.6～4.2 秒：噴漆一團一團炸開
    const want = t < 2.6 ? 0 : Math.min(28, Math.floor((t - 2.6) * 18));
    while (op.splats < want) {
      op.splats++;
      const cols = ["#ff3ea5", "#ffe14d", "#3ee0ff", "#9dff3a", "#b25cff", "#ff8a1f"];
      A.splat(op.paint.getContext("2d"), 20 + Math.random() * 360, 60 + Math.random() * 620, cols[op.splats % cols.length], 22 + Math.random() * 34);
      if (op.splats % 4 === 1) { AU.play("brickBreak", op.splats / 4); vibrate(12); }
    }
    if (t > 4.3 && !op.slam) { op.slam = true; AU.play("clear"); vibrate([40, 30, 80]); }
    if (t > 5.2 && !op.pop) { op.pop = true; AU.play("combo", 10); }
    if (t >= OP_DUR) finishOpening();
  }
  function drawOpening(g) {
    const op = G.op; if (!op) return;
    const t = op.phase === "play" ? op.t : 0, k = x => P.clamp(x, 0, 1);
    // 灰城的天際線（純灰，沒有一點顏色）
    g.fillStyle = "#2a2a30"; g.fillRect(0, 0, VW, VH);
    const rnd = SR.rng(77);
    for (let i = 0; i < 9; i++) {
      const bw = 34 + rnd() * 40, bh = 180 + rnd() * 260, bx = i * 46 - 10, v = 70 + Math.floor(rnd() * 40);
      g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(bx, VH - 140 - bh, bw, bh);
      g.fillStyle = "rgba(255,255,255,0.08)"; for (let wy = VH - 130 - bh; wy < VH - 150; wy += 22) g.fillRect(bx + 6, wy, bw - 12, 8);
    }
    g.fillStyle = "#1c1c22"; g.fillRect(0, VH - 140, VW, 140);
    if (op.phase === "coin") {
      // 投幣開始
      const blink = Math.sin(op.t * 5) > -0.2;
      g.fillStyle = "rgba(10,10,14,0.55)"; g.fillRect(0, 0, VW, VH);
      A.tag(g, "SPRAY RUN", VW / 2, 250, 44, ["#9a9aa3", "#6c6c75"], { drips: false, rot: -0.04 });
      if (blink) A.tag(g, "INSERT COIN", VW / 2, 430, 30, ["#ffe14d", "#ff8a1f"], { drips: false, rot: 0 });
      A.tag(g, "點一下 投下硬幣", VW / 2, 480, 18, ["#ffffff"], { cjk: true, drips: false, rot: 0 });
      // 硬幣
      const cy = 560 + Math.sin(op.t * 3) * 6;
      g.beginPath(); g.arc(VW / 2, cy, 24, 0, Math.PI * 2); g.fillStyle = "#ffd23f"; g.fill(); g.strokeStyle = A.INK; g.lineWidth = 4; g.stroke();
      g.fillStyle = A.INK; g.font = `900 22px ${A.FONT_BLOCK}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("¢", VW / 2, cy + 1);
      return;
    }
    // 旁白
    if (t < 2.6) { g.save(); g.globalAlpha = k(t * 2) * k((2.6 - t) * 3); A.tag(g, "很久很久以前，有一座灰城……", VW / 2, 110, 19, ["#ffffff"], { cjk: true, drips: false, rot: 0 }); g.restore(); }
    // 老彈珠台：1.0 秒起亮起來（閃爍）
    const lit = t > 1.2 ? (t < 1.6 ? (Math.floor(t * 20) % 2) : 1) : 0;
    const mx = VW / 2, my = 470 - (t > 4.3 ? 0 : 0);
    g.fillStyle = lit ? "rgba(255,62,165,0.25)" : "rgba(0,0,0,0)"; g.beginPath(); g.arc(mx, my, 190, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#3a2a4a"; A.roundRect(g, mx - 90, my - 150, 180, 230, 14); g.fill(); g.strokeStyle = A.INK; g.lineWidth = 5; g.stroke();
    g.fillStyle = lit ? "#1a1030" : "#202024"; A.roundRect(g, mx - 70, my - 130, 140, 100, 8); g.fill(); g.stroke();
    if (lit) for (let i = 0; i < 7; i++) { g.fillStyle = ["#ff3ea5", "#ffe14d", "#3ee0ff", "#9dff3a"][i % 4]; g.beginPath(); g.arc(mx - 60 + i * 20, my - 4, 4 + Math.sin(t * 8 + i) * 1.5, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = "#2a1f38"; g.fillRect(mx - 100, my + 80, 200, 40); g.strokeRect(mx - 100, my + 80, 200, 40);
    // 噴漆層
    g.drawImage(op.paint, 0, 0);
    // 招牌：4.3 秒砸下來
    if (t > 4.3) {
      const s = 1 + Math.max(0, 4.6 - t) * 4;
      A.tag(g, "SPRAY", VW / 2, 120, 66 * s, ["#ff3ea5", "#ffe14d"]);
      A.tag(g, "RUN", VW / 2, 190, 60 * s, ["#3ee0ff", "#9dff3a"], { rot: 0.05 });
    }
    // 噴噴從機台跳出來
    if (t > 5.2) {
      const j = k((t - 5.2) / 0.5), hop = Math.sin(j * Math.PI) * 60;
      A.pinky(g, mx, my - 30 - j * 40 - hop * 0.3, 1.5, "happy", G.t, false);
      if (t > 5.9) A.tag(g, "把灰城砸回彩色！", VW / 2, 640, 22, ["#ffffff"], { cjk: true, drips: false, rot: -0.02 });
    }
    // 跳過提示
    g.fillStyle = "rgba(255,255,255,0.55)"; g.font = `700 12px ${A.FONT_CJK}`; g.textAlign = "right"; g.textBaseline = "alphabetic"; g.fillText("點一下跳過 ▶▶", VW - 12, VH - 12);
  }

  /* 教學畫面：變暗＋只亮要操作的區域＋手指＋提示框 */
  function drawTutorial(g) {
    const tu = G.tut, bob = Math.sin(G.t * 6) * 6;
    let hole = null, hand = null, lines = tutLines(tu.step);
    const pad = !!G.world.paddle;
    if (tu.step === "press") { hole = pad ? [0, 520, VW, 220] : [VW / 2, 520, VW / 2, 220]; hand = [360 - G.win.x0, 650]; }
    if (tu.step === "move") {
      const lx = G.landing ? G.landing.x : 185;
      hole = [0, 470, VW, 270]; hand = [lx - G.win.x0, 700];
    }
    if (tu.step === "flip") {
      hole = tu.side === "L" ? [0, 520, VW / 2, 220] : [VW / 2, 520, VW / 2, 220]; hand = [tu.side === "L" ? VW / 4 : VW * 3 / 4, 650];
      lines = ["就是現在！", tu.side === "L" ? "點左半邊" : "點右半邊"];
    }
    if (tu.step === "watch" && tu.t > 3) lines = null;
    if (hole) {
      g.save(); g.fillStyle = "rgba(8,8,12,0.62)";
      g.beginPath(); g.rect(0, 0, VW, VH); g.rect(hole[0] + hole[2], hole[1], -hole[2], hole[3]); g.fill("evenodd");
      g.strokeStyle = "#ffe14d"; g.lineWidth = 4; g.setLineDash([10, 8]); g.lineDashOffset = -G.t * 30;
      g.strokeRect(hole[0] + 4, hole[1] + 4, hole[2] - 8, hole[3] - 8); g.restore();
    }
    if (hand && FINE && pad && (tu.step === "press" || tu.step === "move")) {
      // 電腦：手指圖示換成空白鍵鍵帽／滑鼠
      g.save(); g.textAlign = "center"; g.textBaseline = "middle";
      if (tu.step === "press") {
        g.fillStyle = A.INK; A.roundRect(g, hand[0] - 70 + 4, hand[1] + bob - 20 + 4, 140, 40, 8); g.fill();
        g.fillStyle = "#ffe14d"; A.roundRect(g, hand[0] - 70, hand[1] + bob - 20, 140, 40, 8); g.fill(); g.strokeStyle = A.INK; g.lineWidth = 3; g.stroke();
        g.fillStyle = A.INK; g.font = `900 16px ${A.FONT_CJK}`; g.fillText("空白鍵 SPACE", hand[0], hand[1] + bob);
      } else { g.font = "44px sans-serif"; g.fillText("🖱️", hand[0], hand[1] + bob); }
      g.restore();
    } else if (hand) {
      g.save(); g.font = "44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("👆", hand[0], hand[1] + bob); g.restore();
    }
    if (lines) {
      const x = 28, y = 64, w = VW - 56, h = 78;
      g.save();
      g.fillStyle = A.INK; A.roundRect(g, x + 5, y + 5, w, h, 16); g.fill();
      g.fillStyle = "#ffffff"; A.roundRect(g, x, y, w, h, 16); g.fill();
      g.strokeStyle = A.INK; g.lineWidth = 3.5; g.stroke();
      g.fillStyle = A.INK; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `900 20px ${A.FONT_CJK}`; g.fillText(lines[0], VW / 2, y + 26);
      g.font = `700 17px ${A.FONT_CJK}`; g.fillStyle = "#c2187a"; g.fillText(lines[1], VW / 2, y + 54);
      g.restore();
    }
  }

  function updateHintText() {
    const coarse = matchMedia("(pointer: coarse)").matches;
    if (G.screen !== "play") { hint(G.screen === "intro" ? (coarse ? "點一下跳過" : "按任意鍵跳過") : ""); return; }
    const pad = !!G.world.paddle;
    if (G.ctrlCard) { hint("點一下或按任意鍵開始"); return; }
    if (G.intro) { hint(coarse ? "點一下繼續" : "點一下（或按空白鍵）繼續"); return; }
    if (G.world.balls.some(b => P.ballInLane(b) && b.y > 990)) hint(G.plunger.holding ? (coarse ? "拉越多力道越大，放開發射！" : "按越久力道越大，放開發射！") : coarse ? (pad ? "按住畫面往下拉，放開發射" : "按住右半邊往下拉，放開發射") : pad ? "空白鍵蓄力發射・滑鼠左右移動滑板" : "按住空白鍵蓄力，放開發射");
    else hint(pad ? (coarse ? "手指左右滑，移動滑板接球" : "滑鼠左右移動滑板接球（或 ←／→）") : coarse ? "點左半邊／右半邊控制擋板" : "Z／← 左擋板・/／→ 右擋板");
  }

  /* ---------- 版面 ---------- */
  function fit() {
    const wrap = $("stagewrap"), pad = innerWidth <= 520 ? 0 : 8, availW = wrap.clientWidth - pad, availH = wrap.clientHeight - pad;
    const s = Math.max(0.3, Math.min(availW / VW, availH / VH));
    const cssW = Math.floor(VW * s), cssH = Math.floor(VH * s), dpr = Math.min(2.5, devicePixelRatio || 1);
    canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  }
  addEventListener("resize", () => { layoutWindow(); fit(); });

  /* ---------- 輸入 ---------- */
  function setFlipper(side, down) {
    if (!G.world) return;
    const fs = G.world.flippers.filter(f => f.side === side);
    if (down && !fs[0].pressed) AU.play("flipper");
    fs.forEach(f => f.pressed = down);
  }
  /* 發射桿（第 6 輪：改成「按住往後拉」，像真的彈珠台拉柄）
     手指／滑鼠：按住後往下拉，拉越多力道越大，放開發射；鍵盤：按住空白鍵會慢慢往後拉
     拉不到一點點就放開＝不發射，提示「往下拉再放開」 */
  const PULL_FULL = 0.16;                       // 拉滿＝往下拉畫面高度的 16%
  function setPlunger(down, drag) {
    if (down) {
      if (!G.world.balls.some(b => P.ballInLane(b) && b.y > 990)) return;
      G.plunger.holding = true; G.plunger.charge = 0;
      G.plunger.drag = drag || null;            // { id, y }：拖曳的手指與起點
      return;
    }
    if (!G.plunger.holding) return;
    G.plunger.holding = false; G.plunger.drag = null;
    if (G.plunger.charge < 0.08) {
      G.plunger.charge = 0; G.plunger.nudge = 1;
      say(matchMedia("(pointer: coarse)").matches ? "按住往下拉，再放開！" : "按住往下拖（或按住空白鍵），再放開！", "wow", 1800);
      return;
    }
    launchIfReady(); G.plunger.charge = 0;
  }
  function pullPlunger(e) {
    const d = G.plunger.drag; if (!G.plunger.holding || !d || d.id !== e.pointerId) return;
    const rect = canvas.getBoundingClientRect(), c = P.clamp((e.clientY - d.y) / (rect.height * PULL_FULL), 0, 1);
    if (Math.floor(c * 5) > Math.floor(G.plunger.charge * 5)) vibrate(6);   // 拉的時候每 2 成一下「喀」
    G.plunger.charge = c;
  }
  const pointers = new Map();
  const toGameX = e => { const rect = canvas.getBoundingClientRect(); return G.win.x0 + (e.clientX - rect.left) / rect.width * VW; };
  // 滑板：滑鼠移動（不用按）或手指拖曳，滑板就跟著走。
  // 聽整個視窗：電腦上滑鼠移出窄窄的遊戲畫面時，滑板還是跟著（停在最左／最右）
  addEventListener("pointermove", e => {
    if (!G.world || G.screen !== "play" || G.paused) return;
    pullPlunger(e);
    // 正在拉發射桿的那根手指／滑鼠不帶動滑板（放開後才恢復）
    const pulling = G.plunger.holding && G.plunger.drag && G.plunger.drag.id === e.pointerId;
    if (G.world.paddle && !pulling && (e.pointerType === "mouse" || e.target === canvas)) G.world.paddle.target = toGameX(e);
  });
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault(); AU.ensure();
    if (G.screen === "opening") { openingTap(); return; }
    if (G.screen === "intro" && G.cine) { G.cine.t = Math.max(G.cine.t, G.cine.dur - 0.25); return; }
    if (G.screen !== "play") return;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}     // 有些瀏覽器／觸控筆會拒絕，不影響操作
    if (G.ctrlCard) { closeCtrlCard(); return; }                        // 操作卡／物件特寫教學：這一下只用來關卡片
    if (G.intro) { dismissIntro(); return; }
    if (G.world.paddle) {
      // 滑板模式：按哪裡都可以；球在發射道時按住＝蓄力（這一下只拉桿，不移動滑板）
      const plunge = G.world.balls.some(b => P.ballInLane(b) && b.y > 990);
      pointers.set(e.pointerId, { side: "P", plunge });
      if (plunge) setPlunger(true, { id: e.pointerId, y: e.clientY }); else G.world.paddle.target = toGameX(e);
      return;
    }
    const rect = canvas.getBoundingClientRect(), side = (e.clientX - rect.left) < rect.width / 2 ? "L" : "R";
    const plunge = side === "R" && G.world.balls.some(b => P.ballInLane(b) && b.y > 990);
    pointers.set(e.pointerId, { side, plunge });
    if (plunge) setPlunger(true, { id: e.pointerId, y: e.clientY }); else setFlipper(side, true);
  });
  function pointerEnd(e) {
    const p = pointers.get(e.pointerId); if (!p) return;
    pointers.delete(e.pointerId);
    if (p.plunge) setPlunger(false);
    else if (p.side !== "P" && ![...pointers.values()].some(q => q.side === p.side && !q.plunge)) setFlipper(p.side, false);
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  const KEYS = { KeyZ: "L", ArrowLeft: "L", Slash: "R", ArrowRight: "R", KeyM: "R" };
  const keysHeld = new Set();                 // 滑板模式：按住方向鍵移動
  function tickKeys(dt) {
    const p = G.world && G.world.paddle; if (!p || G.screen !== "play" || !keysHeld.size) return;
    const dir = (keysHeld.has("R") ? 1 : 0) - (keysHeld.has("L") ? 1 : 0);
    p.target = p.x + dir * T.paddle.max_speed * dt;   // 鍵盤移動速度跟滑板跟滑鼠的最高速一樣（提案 desktop-controls）
  }
  addEventListener("keydown", e => {
    AU.ensure();
    if (dlg) { if (e.code === "Space" || e.code === "Enter") { advanceDialog(); e.preventDefault(); } if (e.code === "Escape") closeDialog(); return; }
    if (G.screen === "opening") { openingTap(); e.preventDefault(); return; }
    if (G.screen === "intro" && G.cine) { G.cine.t = Math.max(G.cine.t, G.cine.dur - 0.25); return; }
    if (e.code === "Escape" || e.code === "KeyP") { togglePause(); return; }
    if (G.screen !== "play" || G.paused) return;
    if (G.ctrlCard) { closeCtrlCard(); e.preventDefault(); return; }
    if (G.intro) { if (e.code === "Space" || e.code === "Enter") { dismissIntro(); e.preventDefault(); } return; }
    if (KEYS[e.code]) { if (G.world.paddle) keysHeld.add(KEYS[e.code]); else setFlipper(KEYS[e.code], true); e.preventDefault(); }
    else if (e.code === "Space") { if (!e.repeat) setPlunger(true); e.preventDefault(); }   // 按住時系統會一直重送 keydown，只認第一次
  });
  addEventListener("keyup", e => {
    if (KEYS[e.code]) keysHeld.delete(KEYS[e.code]);
    if (G.screen !== "play") return;
    if (KEYS[e.code]) setFlipper(KEYS[e.code], false);
    else if (e.code === "Space") setPlunger(false);
  });

  /* ---------- 暫停 ---------- */
  function togglePause() {
    if (G.screen !== "play" && !G.paused) return;
    G.paused = !G.paused;
    if (!G.paused) { hideScreen(); return; }
    show(`<h2 class="tag-title" style="font-size:52px">PAUSE</h2>
      <button class="big-btn" id="resume">繼續</button>
      <div class="row"><button class="big-btn ghost" id="pSfx">${AU.sfxOn ? "音效：開" : "音效：關"}</button><button class="big-btn ghost" id="pMusic">${AU.musicOn ? "音樂：開" : "音樂：關"}</button><button class="big-btn ghost" id="pVib">${save.vibrate === false ? "震動：關" : "震動：開"}</button></div>
      ${SR.TUNE ? `<button class="big-btn alt" id="pTune">🎚 手感調整（邊玩邊調）</button>` : ""}
      <button class="big-btn ghost" id="quit">放棄這一輪，回地圖</button>`);
    on("resume", togglePause);
    on("pTune", () => { SR.TUNE.open(); togglePause(); });
    on("pSfx", () => { setSound("sfx", !AU.sfxOn); G.paused = false; togglePause(); });
    on("pMusic", () => { setSound("music", !AU.musicOn); G.paused = false; togglePause(); });
    on("pVib", () => { save.vibrate = save.vibrate === false; R.persist(save); if (save.vibrate) vibrate([30, 40, 60]); G.paused = false; togglePause(); });
    on("quit", () => { G.paused = false; mapScreen(); });
  }
  $("pauseBtn").addEventListener("click", () => { AU.ensure(); togglePause(); });

  /* ---------- 標題背景：自動遊玩展示 ---------- */
  function startAttract(again) {
    G.attract = true;
    const n = again ? 1 + Math.floor(Math.random() * 9) : 1;
    G.district = again ? SR.DISTRICTS[Math.floor(Math.random() * 5)] : G.district || SR.DISTRICTS[0];
    G.stage = null;
    G.world = P.buildTable(T, {}, SR.layoutFor(n + SR.DISTRICTS.indexOf(G.district) * 10), control()); P.placeStage(G.world, SR.buildStage(n)); G.world.balls = [P.newBall(T, G.world)];
    G.trails = new Map(); G.particles = []; G.popups = []; G.cine = null; G.timeScale = 1; G.screen = G.screen === "title" || G.screen === "map" ? G.screen : "title";
    newPaintLayer();
  }

  /* ---------- 啟動 ---------- */
  layoutWindow(); fit();
  // 第一次進入遊戲：先播開場動畫（第 6 輪）；之後直接到標題（標題可以「重看開場」）
  if (!save.seenOpening) openingScreen(); else titleScreen();
  // 標題畫面上的大隻噴噴
  (function titlePinky() {
    const c = $("titlePinky");
    if (c && !screen.hidden) { const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 360, 360); A.pinky(g, 180, 200, 2.7, "happy", G.t, false); }
    requestAnimationFrame(titlePinky);
  })();
  if (location.hash === "#test") {
    const res = SR.Tests.run(T); window.SR_TEST_RESULTS = res;
    console.log(res.map(r => `${r.pass ? "PASS" : "FAIL"} ${r.id} ${r.value}`).join("\n"));
  }
  window.SR_GAME = { G, save, openingScreen, openingTap, goStage, startDistrict, mapScreen, titleScreen, districtCleared, T, tick, closeDialog: () => { if (dlg) { SR.Comic.finish(); for (let i = 0; i < 30 && dlg; i++) SR.Comic.update(1 / 60); } }, setPlunger, setFlipper, tutLines, handleEvents, win: () => G.win, laneK: () => G.laneK, VW: () => VW };
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
