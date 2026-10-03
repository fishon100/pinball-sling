/* ============================================================
   噴漆闖關 — 規則（純函式：一輪、強化卡、首領補磚、星星、成就）
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.Rules = (function () {
  const P = () => SR.Physics;

  function newRun(T, districtIdx) {
    const d = SR.DISTRICTS[districtIdx];
    return { district: districtIdx, stage: d.stages[0], hearts: T.run.hearts, upgrades: {}, score: 0,
             bricks: 0, starsEarned: 0, flawlessStages: 0, maxCombo: 0, startedAt: Date.now() };
  }
  const lv = (run, id) => run.upgrades[id] || 0;

  /* 強化卡套用到世界（每關開始時呼叫） */
  function applyBonuses(run, world) {
    world.dmg = 1 + lv(run, "heavy");
    world.radiusBonus = 1.5 * lv(run, "big");          // 最大半徑 16.5：直徑 33 < 擋板間縫隙 35、< 發射道 40
    world.flipperPower = 1 + 0.12 * lv(run, "power");   // 不改擋板長度，避免擋板尖端把出口堵住
    world.splash = lv(run, "splash");
  }
  function assistsFor(n) { return SR.districtOf(n).assists; }

  /* 收尾輔助：剩 ≤ 3 塊一般磚、而且 8 秒沒碎磚 → 設定磁力目標（離球最近的那塊）；否則清掉。回傳是否啟動 */
  function updateFinisher(T, world, assists, sinceBreak) {
    world.magnet = null;
    if (!assists || !assists.finisher || world.boss) return false;
    const left = world.bricks.filter(k => k.alive && k.type !== "boss");
    if (!left.length || left.length > 3 || sinceBreak < T.assist.finisher_delay) return false;
    const b = world.balls.find(x => !x.dead && x.vy < 0) || world.balls[0];
    if (!b) return false;
    const k = left.reduce((best, k) => Math.abs(k.x + k.w / 2 - b.x) < Math.abs(best.x + best.w / 2 - b.x) ? k : best);
    world.magnet = { x: k.x + k.w / 2, y: k.y + k.h / 2, strength: T.assist.finisher_strength, k };
    return true;
  }

  /* 過關回 1 顆愛心（最多 max_hearts） */
  function heartOnClear(T, run) { run.hearts = Math.min(T.run.max_hearts, run.hearts + 1); }
  /* 投幣續關：愛心用完時，從這一關以 3 顆愛心重來，強化卡保留；分數減半、這關最多 1 星 */
  function continueRun(T, run) {
    run.continues = (run.continues || 0) + 1;
    run.hearts = T.run.hearts;
    run.score = Math.floor(run.score / 2);
  }
  function ballSaveTime(T, run, assists) { return T.rules.ball_save_s + 3 * lv(run, "safety") + ((assists && assists.ballSave) || 0); }

  /* ---------- 道具 ---------- */
  function grantItem(save, id) {
    save.items = save.items || {};
    if ((save.items[id] || 0) >= SR.ITEM_MAX) return false;
    save.items[id] = (save.items[id] || 0) + 1;
    return true;
  }
  function randomItem(rnd) { return SR.ITEMS[Math.floor(rnd() * SR.ITEMS.length)].id; }
  /* 使用道具：fx 是計時器 {slow, save}，回傳產生的事件（漆彈碎磚等） */
  function useItem(T, world, id, fx) {
    const out = [];
    if (id === "bomb") {
      for (const b of world.balls) {
        if (b.dead) continue;
        out.push({ type: "bomb", x: b.x, y: b.y, r: T.items.bomb_radius });
        for (const k of world.bricks) {
          if (!k.alive) continue;
          const cx = P().clamp(b.x, k.x, k.x + k.w), cy = P().clamp(b.y, k.y, k.y + k.h);
          if (Math.hypot(b.x - cx, b.y - cy) <= T.items.bomb_radius) P().damageBrick(world, k, T.items.bomb_damage, out, "bomb");
        }
      }
    } else if (id === "slow") fx.slow = T.items.slow_s;
    else if (id === "save") fx.save = T.items.save_s;          // 球保險：這段時間內掉球會把球還回發射道（真實彈珠台的 ball save）
    else if (id === "ball") { const nb = P().newBall(T, world, 185, 110); nb.vx = (Math.random() - 0.5) * 200; world.balls.push(nb); out.push({ type: "extra_ball", b: nb }); }
    return out;
  }
  function tickItems(world, fx, dt) {
    if (fx.slow > 0) fx.slow = Math.max(0, fx.slow - dt);
    if (fx.save > 0) fx.save = Math.max(0, fx.save - dt);
  }
  function piercePerLaunch(run) { return 2 * lv(run, "pierce"); }

  function offerUpgrades(T, run, rnd) {
    const pool = SR.UPGRADES.filter(u => lv(run, u.id) < u.max && !(u.id === "refill" && run.hearts >= T.run.max_hearts));
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
    return picks;
  }
  function takeUpgrade(T, run, id) {
    if (id === "refill") run.hearts = Math.min(T.run.max_hearts, run.hearts + 1);
    else run.upgrades[id] = lv(run, id) + 1;
  }

  /* 首領：左右移動（物理處理），每隔 regen 秒在身下補 3 塊灰磚；血量低於 4 成會暴怒加速 */
  function bossTick(T, world, stage, dt, ev) {
    const b = world.boss;
    if (!b || !b.alive) return;
    if (!b.enraged && b.hp < b.maxHp * 0.4) { b.enraged = true; b.vx *= 1.5; b.regen *= 0.75; ev.push({ type: "boss_enrage" }); }
    b.regenT -= dt;
    if (b.regenT > 0) return;
    b.regenT = b.regen;
    const G = P().GRID, row = Math.round((b.y + b.h - G.y0) / G.ch) + 2;
    const c0 = Math.round((b.x + b.w / 2 - G.x0) / G.cw - 0.5);
    const hp = 1 + Math.floor(stage.district / 2);
    const added = [];
    for (const c of [c0 - 1, c0, c0 + 1]) if (c >= 0 && c < G.cols) { const k = P().addBrick(world, row, c, hp); if (k) added.push(k); }
    if (added.length) ev.push({ type: "boss_regen", bricks: added });
  }

  /* 發射：力道 0～1；套用穿透漆 */
  function launch(T, run, ball, charge) {
    ball.vy = -(T.plunger.min_speed + (T.plunger.max_speed - T.plunger.min_speed) * charge);
    ball.pierce = piercePerLaunch(run);
  }
  function newPlayState() { return { combo: 0, maxCombo: 0, chain: [], maxChain: 0, maxBalls: 1 }; }

  /* 物理事件 → 規則效果（連擊、分裂彈、連擊火力、連鎖計數）。遊戲與測試共用。
     回傳額外產生的事件（例如炸彈造成的碎磚），呼叫端要一起處理 */
  function processEvents(T, run, world, ev, st) {
    const extra = [];
    for (const e of ev) {
      if (e.type === "flipper_touch") { st.combo = 0; continue; }
      if (e.type === "ball_brick" || e.type === "bumper") {
        st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
        if (lv(run, "bomb") && st.combo % T.run.bomb_every === 0 && e.b) paintBomb(T, run, world, e.b.x, e.b.y, extra);
      }
      if (e.type === "ball_brick" && lv(run, "split") && e.b && !e.b.split && !e.b.dead) {
        e.b.split = true;
        const n = lv(run, "split"), sp = Math.max(700, Math.hypot(e.b.vx, e.b.vy));
        for (let i = 0; i < n; i++) {
          const nb = P().newBall(T, world, e.b.x, e.b.y), a = Math.atan2(e.b.vy, e.b.vx) + (i % 2 ? 1 : -1) * (0.45 + 0.25 * Math.floor(i / 2));
          nb.vx = Math.cos(a) * sp; nb.vy = Math.sin(a) * sp; nb.split = true; nb.pierce = e.b.pierce;
          world.balls.push(nb);
        }
        extra.push({ type: "split", x: e.b.x, y: e.b.y, n });
      }
      if (e.type === "brick_break") {
        st.chain.push(world.time);
        while (st.chain.length && world.time - st.chain[0] > 1) st.chain.shift();
        st.maxChain = Math.max(st.maxChain, st.chain.length);
      }
    }
    st.maxBalls = Math.max(st.maxBalls, world.balls.filter(b => !b.dead).length);
    return extra;
  }
  function paintBomb(T, run, world, x, y, out) {
    const R = T.run.bomb_radius * (1 + 0.3 * (lv(run, "bomb") - 1));
    out.push({ type: "bomb", x, y, r: R });
    for (const k of world.bricks) {
      if (!k.alive) continue;
      const cx = P().clamp(x, k.x, k.x + k.w), cy = P().clamp(y, k.y, k.y + k.h);
      if (Math.hypot(x - cx, y - cy) <= R) P().damageBrick(world, k, world.dmg, out, "bomb");
    }
  }

  /* 模擬一輪的強化構築（測試與平衡用）：每關後從 3 張隨機卡挑第一張 */
  function simulatedBuild(T, picks, seed) {
    const run = newRun(T, 0), rnd = SR.rng(seed);
    for (let i = 0; i < picks; i++) { const o = offerUpgrades(T, run, rnd); if (o.length) takeUpgrade(T, run, o[0].id); }
    return run;
  }

  function isCleared(world) {
    if (world.boss) return !world.boss.alive;
    return P().liveBricks(world).length === 0;
  }
  function stars(stage, heartsLost, seconds, continued) {
    if (heartsLost > 0 || continued) return 1;
    return seconds <= stage.parTime ? 3 : 2;
  }

  /* 成就判定：回傳這次新解鎖的成就 id */
  function checkAchievements(save, s) {
    const have = save.achievements, got = [];
    const give = id => { if (!have[id]) { have[id] = Date.now(); got.push(id); } };
    if (s.clearedStage >= 1) give("first");
    if (s.bossDistrict) give("boss" + s.bossDistrict);
    if (s.combo >= 20) give("combo20");
    if (s.combo >= 50) give("combo50");
    if (s.combo >= 100) give("combo100");
    if (s.flawless) give("flawless");
    if (s.balls >= 4) give("multi4");
    if (save.stats.bricks >= 500) give("bricks500");
    if (totalStars(save) >= 30) give("stars30");
    if (s.chain >= 6) give("chain6");
    if (s.oneCoin) give("onecoin");
    return got;
  }
  function totalStars(save) { return Object.values(save.stars).reduce((a, b) => a + b, 0); }

  /* 存檔 */
  const KEY = "sprayrun.save.v1";
  function emptySave() { return { unlocked: 1, stars: {}, achievements: {}, stats: { bricks: 0, runs: 0, clears: 0 }, best: {}, seenStory: {}, items: {}, tutorialDone: false }; }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s) return { ...emptySave(), ...s, stats: { ...emptySave().stats, ...s.stats } }; } catch (e) {}
    return emptySave();
  }
  function persist(save) { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {} }
  function districtUnlocked(save, d) { return save.unlocked >= SR.DISTRICTS[d].stages[0]; }

  return { newRun, applyBonuses, ballSaveTime, piercePerLaunch, offerUpgrades, takeUpgrade, lv,
           launch, newPlayState, processEvents, paintBomb, simulatedBuild,
           assistsFor, grantItem, randomItem, useItem, tickItems, heartOnClear, continueRun, updateFinisher,
           bossTick, isCleared, stars, checkAchievements, totalStars, load, persist, emptySave, districtUnlocked };
})();
