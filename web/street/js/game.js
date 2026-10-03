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
    lastBreak: null, comboFx: { n: 0, t: 0 }, attract: false, ending: false, t: 0,
    assists: {}, itemFx: { slow: 0, save: 0 }, continued: false, tut: null, previews: []
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
    // 不顯示「起承轉合」（那是設計溝通用的，第 3 輪回饋）
    $("stageChip").textContent = st ? `${G.district.name} ${Math.floor((st.n - 1) / 10) + 1}-${(st.n - 1) % 10 + 1}${st.isBoss ? " 首領" : ""}` : "噴漆闖關 SPRAY RUN";
    const hearts = run ? run.hearts : 0, max = Math.max(3, hearts);
    $("hearts").innerHTML = run ? Array.from({ length: max }, (_, i) => `<span class="${i < hearts ? "" : "empty"}">♥</span>`).join("") : "";
    $("score").textContent = run ? run.score.toLocaleString() : "";
    updateItemBar();
  }
  /* 道具列：第 2 區起，或身上有道具時才出現 */
  function updateItemBar() {
    const bar = $("itembar"), items = save.items || {};
    const show = G.stage && G.screen !== "title" && G.screen !== "map" && (G.stage.district >= 1 || SR.ITEMS.some(i => items[i.id] > 0));
    bar.hidden = !show;
    if (!show) return;
    const key = SR.ITEMS.map(i => (items[i.id] || 0) + (G.itemFx.slow > 0 && i.id === "slow" ? "a" : "") + (G.itemFx.save > 0 && i.id === "save" ? "a" : "")).join(",") + G.screen;
    if (bar.dataset.key === key) return;
    bar.dataset.key = key;
    bar.innerHTML = SR.ITEMS.map(i => {
      const n = items[i.id] || 0, active = (i.id === "slow" && G.itemFx.slow > 0) || (i.id === "save" && G.itemFx.save > 0);
      return `<button class="item-btn ${active ? "active" : ""}" data-item="${i.id}" ${n && G.screen === "play" ? "" : "disabled"} title="${i.desc}"><span class="ico">${i.icon}</span>${i.name}${n ? `<span class="n">${n}</span>` : ""}</button>`;
    }).join("");
    bar.querySelectorAll("[data-item]").forEach(b => b.addEventListener("click", () => useItem(b.dataset.item)));
  }
  function useItem(id) {
    if (G.screen !== "play" || !(save.items[id] > 0)) return;
    AU.ensure();
    save.items[id]--; R.persist(save);
    const extra = R.useItem(T, G.world, id, G.itemFx);
    const it = SR.ITEMS.find(i => i.id === id);
    popup(185, G.cam.y + 330, `${it.icon} ${it.name}！`, true, pal().b);
    AU.play(id === "bomb" ? "bucket" : "card");
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
      </div>
      <button class="big-btn ghost" id="goControl">操作：${control() === "paddle" ? "🛹 滑板（一根手指／滑鼠）" : "🎰 經典擋板"}</button>
      <p class="sub" style="font-size:12px">${control() === "paddle" ? "手指左右滑或移動滑鼠＝滑板・球在發射道時按住畫面蓄力" : "左半邊／右半邊＝擋板・球在發射道時按住右半邊蓄力・電腦：Z、/、空白鍵"}</p>`);
    on("goMap", () => { AU.startMusic(SR.DISTRICTS[0]); mapScreen(); });
    on("goControl", () => controlScreen(titleScreen));
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
        const st = save.stars[n] || 0, done = n < save.unlocked, next = n === save.unlocked, open = n <= save.unlocked;
        // 第 5 輪：每一關都可以直接點（已過的關可以重打拿更好的獎牌）
        nodes.push(`<button class="node ${done ? "done m" + st : ""} ${next ? "next" : ""} ${n % 10 === 0 ? "boss" : ""}" ${open ? `data-n="${n}"` : "disabled"} title="第 ${n} 關">${done ? `<span class="s">${R.MEDALS[st] ? R.MEDALS[st].name[0] : ""}</span>` : next ? "▶" : n % 10 === 0 ? "王" : ""}</button>`);
      }
      const best = save.best[i] ? `最佳 ${save.best[i].toLocaleString()} 分` : "";
      const nextN = Math.min(s1, Math.max(s0, save.unlocked));
      return `<article class="district ${unlocked ? "" : "locked"}">
        <div class="bg" style="background:linear-gradient(120deg, ${d.colors.a}, ${d.colors.b} 55%, ${d.colors.c})"></div>
        <span class="act">第 ${i + 1} 區</span>
        <h3>${unlocked ? d.name : "？？？"}<small>${unlocked ? d.en : "LOCKED"} · ${s0}–${s1}</small></h3>
        <p class="story">${unlocked ? d.teaser : "在上一區打倒灰先生才會解鎖。"}</p>
        ${unlocked ? `<p class="assist-line">${assistText(d.assists) || "沒有輔助：全靠你的手感"}</p>` : ""}
        <div class="nodes">${nodes.join("")}</div>
        ${unlocked ? `<div class="row"><button class="big-btn ${i % 2 ? "alt" : ""}" data-n="${nextN}">${save.unlocked > s1 ? "從頭再打一次" : save.unlocked > s0 ? `繼續：第 ${nextN} 關` : "出發"}</button></div><p class="sub" style="text-align:left;margin-top:6px;font-size:12px">點上面的格子可以直接選關・${best}</p>` : `<p class="lockmsg">🔒 尚未解鎖</p>`}
      </article>`;
    }).join("");
    const gold = R.medalCount(save, 3), silver = R.medalCount(save, 2), bronze = R.medalCount(save, 1);
    show(`
      <div class="progress"><h2 class="h2">灰城地圖</h2><span>已解放 <b>${cleared}</b>/50・<i class="mc m3">金</i>${gold} <i class="mc m2">銀</i>${silver} <i class="mc m1">銅</i>${bronze}</span></div>
      <p class="sub" style="text-align:left">3 顆愛心、每過一關回 1 顆。一顆都沒掉＝金牌、掉 1 顆＝銀牌、掉 2 顆以上＝銅牌。每過一關會抽到一罐強化，一直帶到你回地圖為止。</p>
      ${cards}
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
    on("replayTut", () => { save.tutorialDone = false; R.persist(save); startDistrict(0); });
    updateHud();
  }

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
    // 街區獎勵：2 個隨機道具（下一區開始可以用）
    const reward = [];
    for (let k = 0; k < 2; k++) { const id = R.randomItem(Math.random); if (R.grantItem(save, id)) reward.push(SR.ITEMS.find(x => x.id === id)); }
    R.persist(save);
    achieve({ oneCoin: !G.run.continues });
    show(`<h2 class="tag-title" style="font-size:46px">${d.en}<br><span class="y">FREE!</span></h2>
      <p class="sub">${d.name} 的牆，全都回來了。</p>
      <dl class="stat-grid"><dt>本輪分數</dt><dd>${G.run.score.toLocaleString()}</dd><dt>打碎的磚</dt><dd>${G.run.bricks}</dd><dt>剩下的愛心</dt><dd>${G.run.hearts}</dd><dt>續關次數</dt><dd>${G.run.continues || 0}</dd></dl>
      ${reward.length ? `<p class="sub">街區獎勵：${reward.map(r => `${r.icon} ${r.name}`).join("、")}（道具列可以用）</p>` : ""}
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
    keys.forEach(k => save.seenComic[k] = true); R.persist(save);
    dlg = true; AU.ensure();
    SR.Comic.play(keys, () => { dlg = null; done(); });
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
    G.world = P.buildTable(T, G.assists, SR.layoutFor(n), control()); P.placeStage(G.world, G.stage); R.applyBonuses(G.run, G.world);
    G.world.balls = [P.newBall(T, G.world)];
    G.run.stage = n; G.ps = R.newPlayState(); G.stageTime = 0; G.heartsLost = 0; G.ballSave = 0;
    G.continued = !!opts.continued; G.itemFx = { slow: 0, save: 0 }; G.lastBreakT = 0; G._finTold = false; G.fishHits = 0; G.landing = null;
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
    G.cine = { type: "intro", t: 0, dur: 2.3 };
    AU.play("spray", 0.3);
    if (G.tut) return;                                    // 教學會自己帶
    const local = (G.stage.n - 1) % 10;
    if (local === 0 && assistText(G.assists)) setTimeout(() => say(assistText(G.assists).replace("輔助：", "這一區的輔助：") , "happy", 4000), 2300);
    else if (G.stage.isBoss) setTimeout(() => say("灰先生會補磚，先打掉他身下那排！", "wow", 3500), 2400);
    else say(["上吧！", "這面牆交給你了！", "畫就在磚底下！", "慢慢來，看準了再打！"][G.stage.n % 4], "happy", 1800);
  }
  function beginPlay() { G.cine = null; G.screen = "play"; G.view.zoom = 1; G.view.tilt = 0; G.view.rz = 0; G.view.scale = 1; }

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
        case "brick_hit": if (e.k.type === "boss") { AU.play("bossHit"); G.shake = Math.max(G.shake, 5); vibrate(28); popup(e.k.x + e.k.w / 2, e.k.y - 8, "-" + G.world.dmg); } else vibrate(8); break;
        case "brick_break": {
          const k = e.k, cx = k.x + k.w / 2, cy = k.y + k.h / 2;
          G.lastBreak = { x: cx, y: cy };
          if (k.type === "boss") break;
          const pts = Math.round(T.brick.score * k.maxHp * (1 + ps.combo / 10));
          run.score += pts; run.bricks++; save.stats.bricks++;
          burstPaint(cx, cy, k.type === "bucket" ? 30 : 14 + k.maxHp * 3);
          popup(cx, cy - 6, "+" + pts);
          if (k.type === "bucket") { AU.play("bucket"); G.shake = Math.max(G.shake, 9); G.hitstop = 0.06; vibrate([40, 30, 60]); }
          else if (k.type === "gift") {
            const id = R.randomItem(Math.random), it = SR.ITEMS.find(x => x.id === id);
            if (R.grantItem(save, id)) { R.persist(save); popup(cx, cy - 26, `得到 ${it.icon} ${it.name}`, true, "#ffe14d"); say(`拿到「${it.name}」！按下面的道具按鈕就能用。`, "happy", 2600); }
            else popup(cx, cy - 26, `${it.name} 已經滿了`, false, "#ffe14d");
            AU.play("achievement");
          }
          else { AU.play("brickBreak", Math.min(8, ps.combo / 4)); G.shake = Math.max(G.shake, 3); vibrate(18 + Math.min(20, ps.combo)); }
          break;
        }
        case "bumper":
          e.c.flash = e.c.kind === "fish" ? 0.4 : 0.12; run.score += 5; AU.play("bumper"); vibrate(14);
          if (e.c.kind === "fish") { G.fishHits++; if (G.fishHits === 1) say("阿鰭：「好痛……把球吐回去！」", "wow", 1800); }
          break;
        case "sling": e.s.flash = 0.1; AU.play("sling"); vibrate(10); break;
        case "flipper": if (e.speed > 1700) G.shake = Math.max(G.shake, 2); vibrate(12); break;
        case "paddle": if (G.tut && G.tut.step === "move") G.tut.hit = true; AU.play("flipper"); vibrate(e.off && Math.abs(e.off) > 0.6 ? 22 : 16); G.shake = Math.max(G.shake, 1.5); break;
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
      // 時間倍率：過場（G.timeScale）× 慢動作道具 × 教學的慢動作
      const slowItem = G.screen === "play" && G.itemFx.slow > 0 ? T.items.slow_scale : 1;
      // 滑板的教學慢動作不能太慢：滑板也在物理時間裡移動，太慢會跟不上手指
      const tutSlow = G.screen === "play" && G.tut && G.tut.slow ? (G.world.paddle ? 0.35 : 0.12) : 1;
      const sdt = dt * G.timeScale * slowItem * tutSlow;
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
            const tr = G.trails.get(b.id) || []; tr.push({ x: b.x, y: b.y }); if (tr.length > 8) tr.shift(); G.trails.set(b.id, tr);
          }
          if (G.hitstop > 0 || G.screen !== "play") { if (G.screen !== "clearing") acc = 0; break; }
        }
      }
      if (!G.cine) P.updateCamera(G.cam, G.world, dt);
    }
    if (G.screen === "play" && G.world) { tickKeys(dt); tickTutorial(dt); computePreviews(); }
    else G.previews = [];
    if (G.screen === "play") updateItemBar();
    updateHintText();
    // 滑板模式遊玩中把滑鼠游標藏起來（滑板就是游標）
    const cur = G.screen === "play" && G.world && G.world.paddle ? "none" : "";
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
      if (s === "done") say("很好！接下來靠你自己了。打碎所有灰磚就過關！", "happy", 3200);
    }
  }
  const TUT_TEXT = {
    press: ["按住右下角", "幫發射桿蓄力"],
    release: ["看右邊的力道條", "滿了就放開手指！"],
    watch: ["球打碎灰磚，", "外面那面牆的畫就會回來"],
    done: ["很好！", "打碎所有灰磚就過關"]
  };

  /* ---------- 過場鏡頭 ---------- */
  function tickCine(dt) {
    const c = G.cine, v = G.view;
    if (!c) { v.tilt += (0 - v.tilt) * Math.min(1, dt * 8); v.rz += (0 - v.rz) * Math.min(1, dt * 8); v.scale += (1 - v.scale) * Math.min(1, dt * 8); applyTilt(); return; }
    c.t += dt;
    const k = c.t / c.dur;
    if (c.type === "intro") {
      // 3D 俯衝：從牆頂（傾斜 38°）降到擋板（平面 2D）
      G.cam.y = lerp(Math.min(G.world.top, P.CAM_MAX), P.CAM_MAX, ease(k * 1.1 - 0.1));
      v.tilt = 38 * (1 - ease(k)); v.scale = lerp(0.88, 1, ease(k)); v.rz = -3 * (1 - ease(k)); v.zoom = 1;
      if (G.stage.isBoss && k > 0.15 && k < 0.5) { v.zoom = 1 + 0.35 * Math.sin((k - 0.15) / 0.35 * Math.PI); v.fx = 200; v.fy = 160; G.shake = Math.max(G.shake, 4); }
      if (c.t >= c.dur) beginPlay();
    } else if (c.type === "clear") {
      // 慢動作特寫 → 定格 → 3D 傾斜展示整面彩色牆
      if (c.t < 0.9) { G.timeScale = 0.15; v.zoom = lerp(1, 1.7, ease(c.t / 0.5)); v.fx = 200; v.fy = c.fy - G.cam.y; }
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
      g.fillText(`灰先生 ${w.boss.hp}/${w.boss.maxHp}`, 56, 21);
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
    if (G.screen === "play" && G.itemFx.slow > 0) { g.fillStyle = "rgba(62,224,255,0.10)"; g.fillRect(0, 0, VW, VH); A.tag(g, `⏳ ${G.itemFx.slow.toFixed(1)}`, 60, VH - 40, 16, ["#3ee0ff"], { drips: false, rot: 0 }); }
    if (G.screen === "play" && G.itemFx.save > 0) A.tag(g, `🛟 ${Math.ceil(G.itemFx.save)}`, 340, VH - 40, 16, ["#9dff3a"], { drips: false, rot: 0 });
    if (G.tut && G.screen === "play") drawTutorial(g);
    if (G.cine && G.cine.type === "intro") {
      const k = G.cine.t;
      const slam = k < 0.35 ? 1 + (0.35 - k) * 3 : 1;
      g.save(); g.globalAlpha = Math.min(1, (G.cine.dur - k) * 2);
      A.tag(g, `STAGE ${G.stage.n}`, 200, 300, 44 * slam, [p.a, p.b]);
      A.tag(g, G.stage.name, 200, 352, 26, [p.c], { cjk: true, drips: false, rot: 0.04 });
      A.tag(g, `台面：${w.layout.name}`, 200, 396, 17, ["#ffffff"], { cjk: true, drips: false, rot: 0.02 });
      g.restore();
    }
    if (G.cine && G.cine.type === "clear" && G.cine.t > 0.9) {
      const k = ease((G.cine.t - 0.9) / 0.4);
      A.tag(g, "WALL", 200, 300, 60 * (2 - k), [p.a, p.b]);
      A.tag(g, "CLEARED!", 200, 372, 50 * (2 - k), [p.c, p.a]);
    }
  }

  /* 教學畫面：變暗＋只亮要操作的區域＋手指＋提示框 */
  function drawTutorial(g) {
    const tu = G.tut, bob = Math.sin(G.t * 6) * 6;
    let hole = null, hand = null, lines = TUT_TEXT[tu.step];
    const pad = !!G.world.paddle;
    if (tu.step === "press") { hole = pad ? [0, 520, 400, 220] : [200, 520, 200, 220]; hand = [300, 650]; if (pad) lines = ["按住畫面任何地方", "幫發射桿蓄力"]; }
    if (tu.step === "move") {
      const lx = G.landing ? G.landing.x : 185;
      hole = [0, 470, 400, 270]; hand = [lx, 700];
      lines = ["把滑板移到圈圈下面", matchMedia("(pointer: coarse)").matches ? "手指按著左右滑" : "移動滑鼠就好，不用點"];
    }
    if (tu.step === "flip") {
      hole = tu.side === "L" ? [0, 520, 200, 220] : [200, 520, 200, 220]; hand = [tu.side === "L" ? 100 : 300, 650];
      lines = ["就是現在！", tu.side === "L" ? "點左半邊" : "點右半邊"];
    }
    if (tu.step === "watch" && tu.t > 3) lines = null;
    if (hole) {
      g.save(); g.fillStyle = "rgba(8,8,12,0.62)";
      g.beginPath(); g.rect(0, 0, VW, VH); g.rect(hole[0] + hole[2], hole[1], -hole[2], hole[3]); g.fill("evenodd");
      g.strokeStyle = "#ffe14d"; g.lineWidth = 4; g.setLineDash([10, 8]); g.lineDashOffset = -G.t * 30;
      g.strokeRect(hole[0] + 4, hole[1] + 4, hole[2] - 8, hole[3] - 8); g.restore();
    }
    if (hand) {
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
    if (G.world.balls.some(b => P.ballInLane(b) && b.y > 990)) hint(pad ? (coarse ? "按住畫面蓄力，放開發射" : "按住滑鼠或空白鍵蓄力，放開發射") : coarse ? "按住右半邊蓄力，放開發射" : "按住空白鍵蓄力，放開發射");
    else hint(pad ? (coarse ? "手指左右滑，移動滑板接球" : "移動滑鼠（或 ←／→）移動滑板接球") : coarse ? "點左半邊／右半邊控制擋板" : "Z／← 左擋板・/／→ 右擋板");
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
  const toGameX = e => { const rect = canvas.getBoundingClientRect(); return (e.clientX - rect.left) / rect.width * VW; };
  // 滑板：滑鼠移動（不用按）或手指拖曳，滑板就跟著走。
  // 聽整個視窗：電腦上滑鼠移出窄窄的遊戲畫面時，滑板還是跟著（停在最左／最右）
  addEventListener("pointermove", e => { if (G.world && G.world.paddle && G.screen === "play" && !G.paused && (e.pointerType === "mouse" || e.target === canvas)) G.world.paddle.target = toGameX(e); });
  canvas.addEventListener("pointerdown", e => {
    e.preventDefault(); AU.ensure();
    if (G.screen === "intro" && G.cine) { G.cine.t = Math.max(G.cine.t, G.cine.dur - 0.25); return; }
    if (G.screen !== "play") return;
    canvas.setPointerCapture(e.pointerId);
    if (G.world.paddle) {
      // 滑板模式：按哪裡都可以；球在發射道時按住＝蓄力
      G.world.paddle.target = toGameX(e);
      const plunge = G.world.balls.some(b => P.ballInLane(b) && b.y > 990);
      pointers.set(e.pointerId, { side: "P", plunge });
      if (plunge) setPlunger(true);
      return;
    }
    const rect = canvas.getBoundingClientRect(), side = (e.clientX - rect.left) < rect.width / 2 ? "L" : "R";
    const plunge = side === "R" && G.world.balls.some(b => P.ballInLane(b) && b.y > 990);
    pointers.set(e.pointerId, { side, plunge });
    if (plunge) setPlunger(true); else setFlipper(side, true);
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
    p.target = p.x + dir * 950 * dt;            // 鍵盤移動速度 950 px/s
  }
  addEventListener("keydown", e => {
    AU.ensure();
    if (dlg) { if (e.code === "Space" || e.code === "Enter") { advanceDialog(); e.preventDefault(); } if (e.code === "Escape") closeDialog(); return; }
    if (G.screen === "intro" && G.cine) { G.cine.t = Math.max(G.cine.t, G.cine.dur - 0.25); return; }
    if (e.code === "Escape" || e.code === "KeyP") { togglePause(); return; }
    if (G.screen !== "play" || G.paused) return;
    if (KEYS[e.code]) { if (G.world.paddle) keysHeld.add(KEYS[e.code]); else setFlipper(KEYS[e.code], true); e.preventDefault(); }
    else if (e.code === "Space") { setPlunger(true); e.preventDefault(); }
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
    G.world = P.buildTable(T, {}, SR.layoutFor(n + SR.DISTRICTS.indexOf(G.district) * 10), control()); P.placeStage(G.world, SR.buildStage(n)); G.world.balls = [P.newBall(T, G.world)];
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
  window.SR_GAME = { G, save, goStage, startDistrict, mapScreen, titleScreen, T, tick, closeDialog: () => { if (dlg) { SR.Comic.finish(); for (let i = 0; i < 30 && dlg; i++) SR.Comic.update(1 / 60); } }, setPlunger, setFlipper };
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
})();
