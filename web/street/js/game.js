/* ============================================================
   噴漆闖關 — 遊戲主程式：流程、鏡頭／過場、輸入、繪圖、畫面（標題／地圖／強化卡／結算／結局）
   ============================================================ */
"use strict";
(async function () {
  const P = SR.Physics, R = SR.Rules, A = SR.Art, AU = SR.Audio;
  const T = await SR.loadTuning();
  SR.T = T;
  const save = R.load();
  const $ = id => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d");
  const VW = 400, VH = P.VIEW_H;
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- 狀態 ---------- */
  const G = {
    screen: "title", world: null, stage: null, run: null, ps: null, district: SR.DISTRICTS[0],
    cam: { y: P.CAM_MAX }, view: { zoom: 1, fx: 200, fy: 370, tilt: 0, rz: 0, scale: 1 },
    cine: null, timeScale: 1, paused: false, hitstop: 0, shake: 0,
    paint: null, particles: [], popups: [], trails: new Map(),
    plunger: { holding: false, charge: 0 }, ballSave: 0, stageTime: 0, heartsLost: 0,
    lastBreak: null, comboFx: { n: 0, t: 0 }, attract: false, ending: false, t: 0
  };

  /* ---------- 小工具 ---------- */
  function pal() { return G.district.colors; }
  function paintColor(rnd = Math.random) {
    const p = pal();
    if (p.rainbow) return `hsl(${Math.floor(rnd() * 360)},95%,60%)`;
    return [p.a, p.b, p.c][Math.floor(rnd() * 3)];
  }
  function newPaintLayer() { G.paint = A.off(VW, P.H); }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

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
    $("stageChip").textContent = st ? `${G.district.act}・${G.district.name} ${Math.floor((st.n - 1) / 10) + 1}-${(st.n - 1) % 10 + 1}${st.isBoss ? " 首領" : ""}` : "噴漆闖關 SPRAY RUN";
    const hearts = run ? run.hearts : 0, max = Math.max(3, hearts);
    $("hearts").innerHTML = run ? Array.from({ length: max }, (_, i) => `<span class="${i < hearts ? "" : "empty"}">♥</span>`).join("") : "";
    $("score").textContent = run ? run.score.toLocaleString() : "";
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
      </div>
      <p class="sub" style="font-size:12px">左半邊／右半邊＝擋板・球在發射道時按住右半邊蓄力・電腦：Z、/、空白鍵</p>`);
    on("goMap", () => { AU.startMusic(SR.DISTRICTS[0]); mapScreen(); });
    on("goAch", achievementScreen);
    on("goSound", () => { AU.setMusic(!AU.musicOn); titleScreen(); });
    updateHud();
  }

  function mapScreen() {
    G.screen = "map"; G.run = null; G.stage = null;
    startAttract();
    const cleared = Math.max(0, save.unlocked - 1);
    const cards = SR.DISTRICTS.map((d, i) => {
      const unlocked = R.districtUnlocked(save, i);
      const [s0, s1] = d.stages;
      const nodes = [];
      for (let n = s0; n <= s1; n++) {
        const st = save.stars[n] || 0, done = n < save.unlocked, next = n === save.unlocked;
        nodes.push(`<div class="node ${done ? "done" : ""} ${next ? "next" : ""} ${n % 10 === 0 ? "boss" : ""}" title="第 ${n} 關">${done ? `<span class="s">${"★".repeat(st)}</span>` : n % 10 === 0 ? "王" : ""}</div>`);
      }
      const teaser = { alley: "被刷灰的巷子。噴噴在這裡醒來。", subway: "地鐵站的長廊，顏色會順著軌道擴散。", rooftops: "從屋頂能看到整座城……還有灰老大。",
                       riverside: "河堤的橋墩下，藏著被刷掉的舊塗鴉。", downtown: "整座城最大的一面灰牆。" }[d.id];
      const best = save.best[i] ? `最佳 ${save.best[i].toLocaleString()} 分` : "";
      return `<article class="district ${unlocked ? "" : "locked"}">
        <div class="bg" style="background:linear-gradient(120deg, ${d.colors.a}, ${d.colors.b} 55%, ${d.colors.c})"></div>
        <span class="act">${d.act}</span>
        <h3>${unlocked ? d.name : "？？？"}<small>${unlocked ? d.en : "LOCKED"} · ${s0}–${s1}</small></h3>
        <p class="story">${unlocked ? teaser : "打倒上一區的灰老大才會解鎖。"}</p>
        <div class="nodes">${nodes.join("")}</div>
        ${unlocked ? `<div class="row"><button class="big-btn ${i % 2 ? "alt" : ""}" data-d="${i}">${save.unlocked > s1 ? "再挑戰（刷星）" : save.unlocked > s0 ? "挑戰這一區" : "出發"}</button></div><p class="sub" style="text-align:left;margin-top:6px;font-size:12px">${best}</p>` : `<p class="lockmsg">🔒 尚未解鎖</p>`}
      </article>`;
    }).join("");
    show(`
      <div class="progress"><h2 class="h2">灰城地圖</h2><span>已解放 <b>${cleared}</b>/50・星星 <b>${R.totalStars(save)}</b>/150</span></div>
      <p class="sub" style="text-align:left">一輪＝一個街區（10 關）。3 顆愛心，每關挑 1 張強化卡，打倒第 10 關的灰老大就解放這一區。</p>
      ${cards}
      <div class="row"><button class="big-btn ghost" id="backTitle">回標題</button><button class="big-btn ghost" id="goAch2">成就</button></div>`);
    screen.querySelectorAll("[data-d]").forEach(b => b.addEventListener("click", () => { AU.ensure(); AU.play("card"); startDistrict(+b.dataset.d); }));
    on("backTitle", titleScreen);
    on("goAch2", achievementScreen);
    updateHud();
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

  function upgradeScreen(next) {
    G.screen = "upgrade";
    const rnd = SR.rng(Date.now() % 100000);
    const offer = R.offerUpgrades(T, G.run, rnd);
    const colors = [pal().a, pal().b, pal().c];
    const build = Object.entries(G.run.upgrades).map(([id, n]) => { const u = SR.UPGRADES.find(x => x.id === id); return `<span class="chip">${u.icon} ${u.name} Lv${n}</span>`; }).join("") || `<span class="chip">還沒有強化</span>`;
    show(`<h2 class="tag-title" style="font-size:44px">PICK ONE</h2><p class="sub">挑一罐強化，效果會一直帶到這一區結束</p>
      <div class="cards">${offer.map((u, i) => `<button class="card" data-u="${u.id}"><div class="ico" style="background:${colors[i % 3]}">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span><i>${u.id === "refill" ? `♥ ${G.run.hearts} → ${Math.min(T.run.max_hearts, G.run.hearts + 1)}` : `Lv ${R.lv(G.run, u.id)} → ${R.lv(G.run, u.id) + 1}`}</i></button>`).join("")}</div>
      <div><p class="sub" style="text-align:left;margin-bottom:6px">目前的強化</p><div class="build">${build}</div></div>`);
    screen.querySelectorAll("[data-u]").forEach(b => b.addEventListener("click", () => {
      AU.ensure(); AU.play("card"); R.takeUpgrade(T, G.run, b.dataset.u);
      const u = SR.UPGRADES.find(x => x.id === b.dataset.u);
      hideScreen(); say(`拿到「${u.name}」！`, "happy"); next();
    }));
  }

  function stageResult(stars, secs, onNext) {
    G.screen = "result";
    const st = G.stage;
    show(`<h2 class="tag-title" style="font-size:48px">WALL<br><span class="c">CLEARED!</span></h2>
      <div class="stars">${[1, 2, 3].map(i => `<span class="${i <= stars ? "" : "off"}">★</span>`).join("")}</div>
      <dl class="stat-grid">
        <dt>關卡</dt><dd>${st.n}・${st.name}</dd>
        <dt>時間（三星標準）</dt><dd>${secs.toFixed(1)} 秒（${st.parTime} 秒）</dd>
        <dt>本關掉的愛心</dt><dd>${G.heartsLost}</dd>
        <dt>最高連擊</dt><dd>${G.ps.maxCombo}</dd>
        <dt>分數</dt><dd>${G.run.score.toLocaleString()}</dd>
      </dl>
      <p class="sub" style="font-size:12px">${stars < 2 ? "沒掉愛心過關＝2★，再加上在標準時間內＝3★" : stars < 3 ? `${st.parTime} 秒內打完就有 3★` : "完美！"}</p>
      <button class="big-btn" id="nextBtn">${st.n % 10 === 0 ? "繼續" : "挑強化卡"}</button>`);
    on("nextBtn", () => { hideScreen(); onNext(); });
  }

  function districtCleared() {
    G.screen = "districtDone";
    const d = G.district, i = SR.DISTRICTS.indexOf(d), next = SR.DISTRICTS[i + 1];
    save.best[i] = Math.max(save.best[i] || 0, G.run.score); R.persist(save);
    show(`<h2 class="tag-title" style="font-size:46px">${d.en}<br><span class="y">FREE!</span></h2>
      <p class="sub">${d.name} 解放了！整區的牆都重新上色。</p>
      <dl class="stat-grid"><dt>本輪分數</dt><dd>${G.run.score.toLocaleString()}</dd><dt>打碎的磚</dt><dd>${G.run.bricks}</dd><dt>剩下的愛心</dt><dd>${G.run.hearts}</dd></dl>
      ${next ? `<p class="sub">下一區：<b style="color:${next.colors.a}">${next.name}</b> 已經出現在地圖上</p>` : ""}
      <button class="big-btn" id="toMap">回到城市地圖</button>`);
    on("toMap", mapScreen);
  }

  function runOver() {
    G.screen = "runover"; AU.play("lose"); AU.setIntensity(0);
    const i = SR.DISTRICTS.indexOf(G.district);
    save.best[i] = Math.max(save.best[i] || 0, G.run.score); R.persist(save);
    say("噴漆用完了……再一次！", "sad", 3000);
    show(`<h2 class="tag-title" style="font-size:46px;color:#9a9aa3">GREY<br><span class="y">AGAIN…</span></h2>
      <p class="sub">愛心用完了，牆又被刷回灰色。</p>
      <dl class="stat-grid"><dt>打到</dt><dd>第 ${G.stage.n} 關</dd><dt>本輪分數</dt><dd>${G.run.score.toLocaleString()}</dd><dt>打碎的磚</dt><dd>${G.run.bricks}</dd><dt>最高連擊</dt><dd>${G.run.maxCombo}</dd></dl>
      <div class="row"><button class="big-btn" id="retry">再挑戰這一區</button><button class="big-btn ghost" id="toMap2">回地圖</button></div>`);
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

  /* ---------- 劇情對話 ---------- */
  const portrait = $("portrait").getContext("2d");
  let dlg = null;
  function playStory(keys, done) {
    const lines = keys.flatMap(k => SR.STORY[k] || []);
    if (!lines.length) { done(); return; }
    keys.forEach(k => save.seenStory[k] = true); R.persist(save);
    dlg = { lines, i: 0, shown: 0, done, speed: 38 };
    $("dialog").hidden = false; renderLine();
  }
  function renderLine() {
    const l = dlg.lines[dlg.i], sp = SR.SPEAKERS[l.who];
    $("dialog").classList.toggle("narrator", l.who === "narrator");
    $("dialogName").textContent = sp.name; $("dialogName").style.background = sp.color; $("dialogName").hidden = !sp.name;
    dlg.shown = 0; $("dialogText").textContent = "";
    $("dialogHint").textContent = `${dlg.i + 1}/${dlg.lines.length}・點一下繼續`;
  }
  function advanceDialog() {
    if (!dlg) return;
    const l = dlg.lines[dlg.i];
    if (dlg.shown < l.text.length) { dlg.shown = l.text.length; return; }
    dlg.i++;
    if (dlg.i >= dlg.lines.length) { closeDialog(); return; }
    AU.play("ui"); renderLine();
  }
  function closeDialog() { const d = dlg; dlg = null; $("dialog").hidden = true; if (d) d.done(); }
  $("dialogBox").addEventListener("click", e => { if (e.target.id !== "dialogSkip") { AU.ensure(); advanceDialog(); } });
  $("dialogSkip").addEventListener("click", () => { AU.play("ui"); closeDialog(); });
  function tickDialog(dt) {
    if (!dlg) return;
    const l = dlg.lines[dlg.i];
    if (dlg.shown < l.text.length) { dlg.shown = Math.min(l.text.length, dlg.shown + dlg.speed * dt); $("dialogText").textContent = l.text.slice(0, Math.floor(dlg.shown)); }
    const g = portrait; g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 192, 192);
    if (l.who === "pinky") A.pinky(g, 96, 112, 1.5, l.mood || "happy", G.t, G.district.id === "rooftops" || G.district.id === "riverside");
    else if (l.who === "boss") A.bossPortrait(g, 96, 100, 1.45, G.t);
    else if (l.who === "citizen") { g.fillStyle = "#3ee0ff"; g.beginPath(); g.arc(96, 70, 30, 0, Math.PI * 2); g.fill(); g.strokeStyle = A.INK; g.lineWidth = 6; g.stroke(); g.fillRect(56, 104, 80, 70); g.strokeRect(56, 104, 80, 70); }
  }

  /* ============================================================
     一輪／一關
     ============================================================ */
  function startDistrict(i) {
    G.attract = false;
    G.run = R.newRun(T, i); save.stats.runs++; R.persist(save);
    G.district = SR.DISTRICTS[i];
    AU.startMusic(G.district);
    goStage(G.district.stages[0]);
  }
  function goStage(n) {
    hideScreen();
    G.stage = SR.buildStage(n); G.district = SR.districtOf(n);
    G.world = P.buildTable(T); P.placeStage(G.world, G.stage); R.applyBonuses(G.run, G.world);
    G.world.balls = [P.newBall(T, G.world)];
    G.run.stage = n; G.ps = R.newPlayState(); G.stageTime = 0; G.heartsLost = 0; G.ballSave = 0;
    G.particles = []; G.popups = []; G.trails = new Map(); G.lastBreak = null; G.plunger = { holding: false, charge: 0 };
    newPaintLayer(); G.cam.y = 0; G.timeScale = 1; G.screen = "story";
    AU.startMusic(G.district); AU.setIntensity(G.stage.isBoss ? 1 : 0);
    updateHud();
    const keys = SR.storyBefore(n).filter(k => !save.seenStory[k] || k.endsWith("_boss"));
    playStory(keys, startIntro);
  }
  function startIntro() {
    G.screen = "intro";
    G.cine = { type: "intro", t: 0, dur: 2.3 };
    AU.play("spray", 0.3);
    if (G.stage.n === 1) setTimeout(() => say("按住右半邊蓄力，放開發射！", "happy", 4000), 2300);
    else if (G.stage.isBoss) setTimeout(() => say("灰老大會補磚，先打他身下的磚！", "wow", 3500), 2400);
    else say(["上吧！", "這面牆交給你了！", "噴起來！", "顏色就在磚底下！"][G.stage.n % 4], "happy", 1800);
  }
  function beginPlay() { G.cine = null; G.screen = "play"; G.view.zoom = 1; G.view.tilt = 0; G.view.rz = 0; G.view.scale = 1; }

  function launchIfReady() {
    const b = G.world.balls.find(x => P.ballInLane(x));
    if (b && b.y > 990 && Math.abs(b.vy) < 30) {
      R.launch(T, G.run, b, G.plunger.charge);
      G.ballSave = R.ballSaveTime(T, G.run);
      AU.play("launch"); vibrate(20);
    }
  }

  function ballLost() {
    if (G.ballSave > 0) {
      G.world.balls = [P.newBall(T, G.world)]; G.ballSave = 0;
      AU.play("save"); say("球保險！再來一次！", "wow"); popup(185, 900, "BALL SAVED", true);
      return;
    }
    G.run.hearts--; G.heartsLost++;
    AU.play("drain"); vibrate(80); G.shake = 10;
    updateHud();
    if (G.run.hearts <= 0) { G.screen = "over"; setTimeout(runOver, 700); return; }
    say(["小心！", "還有機會！", "呼……下一顆！"][G.run.hearts % 3], "sad");
    G.world.balls = [P.newBall(T, G.world)];
  }

  function onCleared() {
    G.screen = "clearing";
    const secs = G.stageTime, stars = R.stars(G.stage, G.heartsLost, secs);
    const n = G.stage.n;
    save.stars[n] = Math.max(save.stars[n] || 0, stars);
    save.unlocked = Math.max(save.unlocked, n + 1);
    save.stats.clears++;
    G.run.starsEarned += stars; G.run.maxCombo = Math.max(G.run.maxCombo, G.ps.maxCombo);
    R.persist(save);
    // 首領關：剩下的磚跟著碎掉，牆面炸滿顏色
    for (const k of G.world.bricks) if (k.alive) { k.alive = false; burstPaint(k.x + k.w / 2, k.y + k.h / 2, 16); }
    const f = G.lastBreak || { x: 200, y: 200 };
    G.cine = { type: "clear", t: 0, dur: 2.6, fx: f.x, fy: f.y, camFrom: G.cam.y, stars, secs, splatted: 0 };
    AU.play("clear"); AU.setIntensity(2); vibrate(60);
    say(stars === 3 ? "完美！三顆星！" : "牆變彩色了！", "happy", 2500);
    achieve({ clearedStage: n, bossDistrict: n % 10 === 0 ? n / 10 : 0, combo: G.ps.maxCombo, flawless: G.heartsLost === 0, balls: G.ps.maxBalls, chain: G.ps.maxChain });
  }
  function afterClear(stars, secs) {
    const n = G.stage.n;
    stageResult(stars, secs, () => {
      const after = SR.storyAfter(n);
      playStory(after, () => {
        if (n === 50) { G.ending = true; credits(); return; }
        if (n % 10 === 0) { districtCleared(); return; }
        upgradeScreen(() => goStage(n + 1));
      });
    });
  }

  /* ---------- 物理事件 → 回饋 ---------- */
  function popup(x, y, text, big = false, color) { G.popups.push({ x, y, text, big, life: big ? 1.2 : 0.8, max: big ? 1.2 : 0.8, color }); }
  function burstPaint(x, y, size, color) {
    const c = color || paintColor();
    A.splat(G.paint.getContext("2d"), x, y, c, size);
    for (let i = 0; i < 10; i++) {
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
        case "brick_hit": if (e.k.type === "boss") { AU.play("bossHit"); G.shake = Math.max(G.shake, 5); popup(e.k.x + e.k.w / 2, e.k.y - 8, "-" + G.world.dmg); } break;
        case "brick_break": {
          const k = e.k, cx = k.x + k.w / 2, cy = k.y + k.h / 2;
          G.lastBreak = { x: cx, y: cy };
          if (k.type === "boss") break;
          const pts = Math.round(T.brick.score * k.maxHp * (1 + ps.combo / 10));
          run.score += pts; run.bricks++; save.stats.bricks++;
          burstPaint(cx, cy, k.type === "bucket" ? 30 : 14 + k.maxHp * 3);
          popup(cx, cy - 6, "+" + pts);
          if (k.type === "bucket") { AU.play("bucket"); G.shake = Math.max(G.shake, 9); G.hitstop = 0.06; vibrate(30); }
          else { AU.play("brickBreak", Math.min(8, ps.combo / 4)); G.shake = Math.max(G.shake, 3); }
          break;
        }
        case "bumper": e.c.flash = 0.12; run.score += 5; AU.play("bumper"); break;
        case "sling": e.s.flash = 0.1; AU.play("sling"); break;
        case "flipper": if (e.speed > 1700) G.shake = Math.max(G.shake, 2); break;
        case "wall": AU.play("wall", e.speed); break;
        case "split": popup(e.x, e.y - 20, `分裂 ×${e.n + 1}`, true, pal().c); AU.play("card"); break;
        case "pierce": burstPaint(e.x, e.y, 8); break;
        case "bomb": A.splat(G.paint.getContext("2d"), e.x, e.y, paintColor(), e.r * 0.8); AU.play("bucket"); G.shake = 10; G.hitstop = 0.05; popup(e.x, e.y, "漆彈！", true, pal().a); break;
        case "boss_regen": AU.play("bossRegen"); say("他在補灰磚！", "wow", 1500); break;
        case "boss_enrage": popup(200, 120, "灰老大暴怒！", true, "#ff5a5a"); AU.setIntensity(2); say("他生氣了！速度變快！", "wow"); break;
      }
    }
    // 連擊里程碑
    if (ps.combo > prevCombo) {
      G.comboFx = { n: ps.combo, t: 1.3 };
      if (ps.combo >= 5) AU.play("combo", ps.combo);
      for (const m of [10, 20, 30, 50, 100]) if (prevCombo < m && ps.combo >= m) {
        say(m >= 50 ? `${m} 連擊！！停不下來！` : `${m} 連擊！`, "happy", 1600); G.hitstop = 0.05; vibrate(25);
      }
    }
    AU.setIntensity(ps.combo >= 10 || (G.world.boss && G.world.boss.enraged) ? 2 : ps.combo >= 4 || G.stage.isBoss ? 1 : 0);
    if (ev.some(e => e.type === "drain") && !G.world.balls.length) ballLost();
    if (ps.combo >= 20 || ps.maxBalls >= 4 || ps.maxChain >= 6) achieve({ combo: ps.maxCombo, balls: ps.maxBalls, chain: ps.maxChain });
    const left = P.liveBricks(G.world).filter(k => k.type !== "boss").length;
    if (!G.world.boss && left > 0 && left <= 3 && !G._warnedLast) { G._warnedLast = true; say(`剩 ${left} 塊！`, "wow", 1500); }
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
    tickDialog(dt);
    drawPinkyHud(dt);
    // 特效衰減（真實時間）
    G.shake *= Math.exp(-12 * dt);
    if (G.comboFx.t > 0) G.comboFx.t -= dt;
    if (G.plunger.holding) G.plunger.charge = Math.min(1, G.plunger.charge + dt / T.plunger.charge_time);

    tickCine(dt);
    const playing = (G.screen === "play" || G.screen === "intro" || G.screen === "clearing") && !G.paused && !dlg;
    if (G.world && (G.attract || playing)) {
      const sdt = dt * G.timeScale;
      for (const p of G.particles) { p.x += p.vx * sdt; p.y += p.vy * sdt; p.vy += 600 * sdt; p.life -= dt; }
      G.particles = G.particles.filter(p => p.life > 0);
      for (const p of G.popups) p.life -= dt;
      G.popups = G.popups.filter(p => p.life > 0);
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
            R.bossTick(T, G.world, G.stage, 1 / 60, ev);
            G.stageTime += 1 / 60;
            if (G.ballSave > 0 && G.world.balls.some(b => !P.ballInLane(b))) G.ballSave = Math.max(0, G.ballSave - 1 / 60);
            handleEvents(ev);
          }
          for (const b of G.world.balls) {
            const tr = G.trails.get(b.id) || []; tr.push({ x: b.x, y: b.y }); if (tr.length > 8) tr.shift(); G.trails.set(b.id, tr);
          }
          if (G.hitstop > 0 || G.screen !== "play") { if (G.screen !== "clearing") acc = 0; break; }
        }
      }
      if (!G.cine) P.updateCamera(G.cam, G.world, dt);
    }
    updateHintText();
    render();
  }

  /* ---------- 過場鏡頭 ---------- */
  function tickCine(dt) {
    const c = G.cine, v = G.view;
    if (!c) { v.tilt += (0 - v.tilt) * Math.min(1, dt * 8); v.rz += (0 - v.rz) * Math.min(1, dt * 8); v.scale += (1 - v.scale) * Math.min(1, dt * 8); applyTilt(); return; }
    c.t += dt;
    const k = c.t / c.dur;
    if (c.type === "intro") {
      // 3D 俯衝：從牆頂（傾斜 38°）降到擋板（平面 2D）
      G.cam.y = lerp(0, P.CAM_MAX, ease(k * 1.1 - 0.1));
      v.tilt = 38 * (1 - ease(k)); v.scale = lerp(0.88, 1, ease(k)); v.rz = -3 * (1 - ease(k)); v.zoom = 1;
      if (G.stage.isBoss && k > 0.15 && k < 0.5) { v.zoom = 1 + 0.35 * Math.sin((k - 0.15) / 0.35 * Math.PI); v.fx = 200; v.fy = 160; G.shake = Math.max(G.shake, 4); }
      if (c.t >= c.dur) beginPlay();
    } else if (c.type === "clear") {
      // 慢動作特寫 → 定格 → 3D 傾斜展示整面彩色牆
      if (c.t < 0.9) { G.timeScale = 0.15; v.zoom = lerp(1, 1.7, ease(c.t / 0.5)); v.fx = 200; v.fy = c.fy - G.cam.y; }
      else {
        G.timeScale = 0;
        const k2 = ease((c.t - 0.9) / 1.2);
        v.zoom = lerp(1.7, 1, k2); G.cam.y = lerp(c.camFrom, 0, k2);
        v.tilt = 24 * k2; v.rz = -4 * k2; v.scale = lerp(1, 0.92, k2);
        // 整面牆噴滿顏色
        const want = Math.floor(k2 * 70);
        while (c.splatted < want) { c.splatted++; A.splat(G.paint.getContext("2d"), 30 + Math.random() * 300, 60 + Math.random() * 700, paintColor(), 18 + Math.random() * 30); }
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
    if (!w) return;
    const v = G.view, p = pal();
    g.save();
    if (G.shake > 0.2) g.translate((Math.random() - 0.5) * G.shake * 2, (Math.random() - 0.5) * G.shake * 2);
    g.translate(v.fx, v.fy); g.scale(v.zoom, v.zoom); g.translate(-v.fx, -v.fy);
    g.translate(0, -G.cam.y);
    g.drawImage(A.wall(G.district, VW, P.H), 0, 0);
    g.drawImage(G.paint, 0, 0);
    A.table(g, w, p, G.t);
    for (const k of w.bricks) A.brick(g, k, p, G.t);
    if (w.boss) A.boss(g, w.boss, G.t, w.boss.flash > 0);
    const dims = P.flipperDims(T, w);
    for (const f of w.flippers) A.flipper(g, f, dims, p);
    // 發射桿
    const c = G.plunger.charge, py = 1022 + c * 26;
    g.fillStyle = p.b; g.fillRect(343, py, 34, 7); g.strokeStyle = A.INK; g.lineWidth = 2.5; g.strokeRect(343, py, 34, 7);
    for (const b of w.balls) A.ball(g, b, p, G.trails.get(b.id) || []);
    for (const q of G.particles) { g.globalAlpha = Math.max(0, q.life / q.max); g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.r, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    for (const q of G.popups) {
      g.globalAlpha = Math.min(1, q.life / q.max * 2);
      A.tag(g, q.text, q.x, q.y - (1 - q.life / q.max) * 26, q.big ? 22 : 14, [q.color || "#ffffff"], { drips: false, cjk: /[^\x00-\x7F]/.test(q.text) });
    }
    g.globalAlpha = 1;
    g.restore();

    // ---- 螢幕座標的 HUD 與光影 ----
    const vg = g.createRadialGradient(200, 370, 200, 200, 370, 480);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    if (w.boss && w.boss.alive && !G.attract) {
      const frac = Math.max(0, w.boss.hp / w.boss.maxHp);
      g.fillStyle = A.INK; g.fillRect(48, 12, 304, 18);
      g.fillStyle = w.boss.enraged ? "#ff5a5a" : "#b8b8bf"; g.fillRect(51, 15, 298 * frac, 12);
      g.fillStyle = "#fff"; g.font = `900 11px ${A.FONT_CJK}`; g.textAlign = "left"; g.textBaseline = "middle";
      g.fillText(`灰老大 ${w.boss.hp}/${w.boss.maxHp}`, 56, 21);
    }
    if (!G.attract && G.screen === "play") {
      if (G.comboFx.t > 0 && G.comboFx.n >= 3) {
        const pop = 1 + Math.max(0, G.comboFx.t - 1.1) * 2;
        g.save(); g.globalAlpha = Math.min(1, G.comboFx.t * 1.5);
        A.tag(g, String(G.comboFx.n), 312, 92, 46 * pop, [p.c, p.a], { rot: -0.08 });
        A.tag(g, "連擊", 318, 128, 18, [p.b], { cjk: true, drips: false });
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
    if (G.cine && G.cine.type === "intro") {
      const k = G.cine.t;
      const slam = k < 0.35 ? 1 + (0.35 - k) * 3 : 1;
      g.save(); g.globalAlpha = Math.min(1, (G.cine.dur - k) * 2);
      A.tag(g, `STAGE ${G.stage.n}`, 200, 300, 44 * slam, [p.a, p.b]);
      A.tag(g, G.stage.name, 200, 352, 26, [p.c], { cjk: true, drips: false, rot: 0.04 });
      g.restore();
    }
    if (G.cine && G.cine.type === "clear" && G.cine.t > 0.9) {
      const k = ease((G.cine.t - 0.9) / 0.4);
      A.tag(g, "WALL", 200, 300, 60 * (2 - k), [p.a, p.b]);
      A.tag(g, "CLEARED!", 200, 372, 50 * (2 - k), [p.c, p.a]);
    }
  }

  function updateHintText() {
    const coarse = matchMedia("(pointer: coarse)").matches;
    if (G.screen !== "play") { hint(G.screen === "intro" ? (coarse ? "點一下跳過" : "按任意鍵跳過") : ""); return; }
    if (G.world.balls.some(b => P.ballInLane(b) && b.y > 990)) hint(coarse ? "按住右半邊蓄力，放開發射" : "按住空白鍵蓄力，放開發射");
    else hint(coarse ? "點左半邊／右半邊控制擋板" : "Z／← 左擋板・/／→ 右擋板");
  }

  /* ---------- 版面 ---------- */
  function fit() {
    const wrap = $("stagewrap"), availW = wrap.clientWidth - 8, availH = wrap.clientHeight - 8;
    const s = Math.max(0.3, Math.min(availW / VW, availH / VH));
    const cssW = Math.floor(VW * s), cssH = Math.floor(VH * s), dpr = Math.min(2.5, devicePixelRatio || 1);
    canvas.style.width = cssW + "px"; canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
  }
  addEventListener("resize", fit);

  /* ---------- 輸入 ---------- */
  function setFlipper(side, down) {
    if (!G.world) return;
    const fs = G.world.flippers.filter(f => f.side === side);
    if (down && !fs[0].pressed) AU.play("flipper");
    fs.forEach(f => f.pressed = down);
  }
  function setPlunger(down) {
    if (down) { if (G.world.balls.some(b => P.ballInLane(b) && b.y > 990)) G.plunger.holding = true; return; }
    if (G.plunger.holding) { G.plunger.holding = false; launchIfReady(); G.plunger.charge = 0; }
  }
  const pointers = new Map();
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault(); AU.ensure();
    if (G.screen === "intro" && G.cine) { G.cine.t = Math.max(G.cine.t, G.cine.dur - 0.25); return; }
    if (G.screen !== "play") return;
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect(), side = (e.clientX - rect.left) < rect.width / 2 ? "L" : "R";
    const plunge = side === "R" && G.world.balls.some(b => P.ballInLane(b) && b.y > 990);
    pointers.set(e.pointerId, { side, plunge });
    if (plunge) setPlunger(true); else setFlipper(side, true);
  });
  function pointerEnd(e) {
    const p = pointers.get(e.pointerId); if (!p) return;
    pointers.delete(e.pointerId);
    if (p.plunge) setPlunger(false);
    else if (![...pointers.values()].some(q => q.side === p.side && !q.plunge)) setFlipper(p.side, false);
  }
  canvas.addEventListener("pointerup", pointerEnd);
  canvas.addEventListener("pointercancel", pointerEnd);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  const KEYS = { KeyZ: "L", ArrowLeft: "L", Slash: "R", ArrowRight: "R", KeyM: "R" };
  addEventListener("keydown", e => {
    AU.ensure();
    if (dlg) { if (e.code === "Space" || e.code === "Enter") { advanceDialog(); e.preventDefault(); } if (e.code === "Escape") closeDialog(); return; }
    if (G.screen === "intro" && G.cine) { G.cine.t = Math.max(G.cine.t, G.cine.dur - 0.25); return; }
    if (e.code === "Escape" || e.code === "KeyP") { togglePause(); return; }
    if (G.screen !== "play" || G.paused) return;
    if (KEYS[e.code]) { setFlipper(KEYS[e.code], true); e.preventDefault(); }
    else if (e.code === "Space") { setPlunger(true); e.preventDefault(); }
  });
  addEventListener("keyup", e => {
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
      <div class="row"><button class="big-btn ghost" id="pSfx">${AU.sfxOn ? "音效：開" : "音效：關"}</button><button class="big-btn ghost" id="pMusic">${AU.musicOn ? "音樂：開" : "音樂：關"}</button></div>
      <button class="big-btn ghost" id="quit">放棄這一輪，回地圖</button>`);
    on("resume", togglePause);
    on("pSfx", () => { AU.setSfx(!AU.sfxOn); G.paused = false; togglePause(); });
    on("pMusic", () => { AU.setMusic(!AU.musicOn); G.paused = false; togglePause(); });
    on("quit", () => { G.paused = false; mapScreen(); });
  }
  $("pauseBtn").addEventListener("click", () => { AU.ensure(); togglePause(); });

  /* ---------- 標題背景：自動遊玩展示 ---------- */
  function startAttract(again) {
    G.attract = true;
    const n = again ? 1 + Math.floor(Math.random() * 9) : 1;
    G.district = again ? SR.DISTRICTS[Math.floor(Math.random() * 5)] : G.district || SR.DISTRICTS[0];
    G.stage = null;
    G.world = P.buildTable(T); P.placeStage(G.world, SR.buildStage(n)); G.world.balls = [P.newBall(T, G.world)];
    G.trails = new Map(); G.particles = []; G.popups = []; G.cine = null; G.timeScale = 1; G.screen = G.screen === "title" || G.screen === "map" ? G.screen : "title";
    newPaintLayer();
  }

  /* ---------- 啟動 ---------- */
  fit();
  titleScreen();
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
  window.SR_GAME = { G, save, goStage, startDistrict, mapScreen, titleScreen, T, tick, closeDialog: () => dlg && closeDialog(), setPlunger, setFlipper };
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
