/* ============================================================
   噴漆闖關 — 自動測試（規格 08 的 AC-S1～AC-S10）
   執行：開啟 /street/#test，或在主控台呼叫 SR.Tests.run(T)
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.Tests = (function () {
  const P = () => SR.Physics;

  function emptyWorld(T) {
    const w = P().buildTable(T);
    w.segments = []; w.circles = []; w.flippers = [];
    return w;
  }
  function withGravity(T, g, fn) { const old = T.ball.gravity; T.ball.gravity = g; try { return fn(); } finally { T.ball.gravity = old; } }
  function frames(w, T, n, onEv) { for (let i = 0; i < n; i++) { const ev = []; P().stepFrame(w, T, ev); if (onEv) onEv(ev); } }
  function cross(p, q, s) {
    const d = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d1 = d(s.ax, s.ay, s.bx, s.by, p.x, p.y), d2 = d(s.ax, s.ay, s.bx, s.by, q.x, q.y);
    const d3 = d(p.x, p.y, q.x, q.y, s.ax, s.ay), d4 = d(p.x, p.y, q.x, q.y, s.bx, s.by);
    return d1 * d2 < 0 && d3 * d4 < 0;
  }
  function inTri(x, y, [A, B, C]) {
    const s = (p, q, w) => (q[0] - p[0]) * (w[1] - p[1]) - (q[1] - p[1]) * (w[0] - p[0]);
    const P0 = [x, y], d1 = s(A, B, P0), d2 = s(B, C, P0), d3 = s(C, A, P0);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  }
  function distRectSeg(k, s) {
    // 取線段上 24 個點，算到矩形的最短距離（夠用的近似）
    let best = Infinity;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, x = s.ax + (s.bx - s.ax) * t, y = s.ay + (s.by - s.ay) * t;
      const cx = P().clamp(x, k.x, k.x + k.w), cy = P().clamp(y, k.y, k.y + k.h);
      best = Math.min(best, Math.hypot(x - cx, y - cy));
    }
    return best;
  }
  /* 擬真自動玩家：球在發射道就發射；等球到擋板中段以後才擊球（真人會等球滾到尖端附近）
     skill：{ delay 反應時間（秒）, miss 每次球來時漏接的機率 }，預設是熟練玩家；NOVICE＝新手 */
  const NOVICE = { delay: 0.12, miss: 0.3 };
  /* 擬人玩家（第 5 輪回饋：人的手速跟機器不同，不能用機器速度測）
     react＝反應時間（看到球到手指動作，秒）；擋板：timing＝按下時機的誤差（標準差，秒）；滑板：aim＝對準落點的誤差（px，球越快越大）
     數值參考：一般人視覺反應約 0.25 秒、手機觸控再慢一點；新手判斷落點常差半個滑板 */
  const HUMAN = {
    novice: { react: 0.32, timing: 0.07, aim: 22 },
    casual: { react: 0.26, timing: 0.05, aim: 14 },
    skilled: { react: 0.2, timing: 0.03, aim: 8 }
  };
  const gauss = rnd => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
  function humanPaddle(w, T, rnd, skill) {
    const p = w.paddle, h = w._human || (w._human = { next: 0 });
    if (w.time < h.next) return;
    h.next = w.time + skill.react;                         // 每隔一個反應時間才「看一次」球、改一次目標
    const lineY = P().PADDLE_Y - T.paddle.radius - T.ball.radius;
    let best = null;
    for (const b of w.balls) {
      if (P().ballInLane(b)) continue;
      let land;
      if (b.y >= lineY - 4) land = { x: b.x, t: 0 };
      else if (b.vy > -200 || b.y > 600) land = P().landingPoint(w, T, b, 2);
      if (land && (!best || land.t < best.t)) best = { ...land, sp: Math.hypot(b.vx, b.vy) };
    }
    if (best) p.target = best.x + gauss(rnd) * skill.aim * (1 + best.sp / 2000);
  }
  function humanFlippers(w, T, rnd, skill) {
    const h = w._human || (w._human = { plans: new Map(), hold: { L: -1, R: -1 } }), g = T.ball.gravity, hitY = P().FLIP_Y - 22;
    for (const b of w.balls) {
      const coming = b.vy > 0 && b.y > P().FLIP_Y - 260 && b.y < hitY && b.x > 90 && b.x < 280;
      if (!coming) { if (b.y < P().FLIP_Y - 280 || b.vy < -100) h.plans.delete(b.id); continue; }
      if (h.plans.has(b.id)) continue;
      // 看到球往下掉：估計多久到擋板，排一次「按下」；但最快也要等反應時間過去
      const t = (-b.vy + Math.sqrt(b.vy * b.vy + 2 * g * (hitY - b.y))) / g;
      const x = b.x + b.vx * t, at = w.time + Math.max(skill.react, t - 0.04 + gauss(rnd) * skill.timing);
      h.plans.set(b.id, { at, side: x < 185 ? "L" : "R", done: false });
    }
    for (const pl of h.plans.values()) if (!pl.done && w.time >= pl.at) { pl.done = true; h.hold[pl.side] = w.time + 0.25; }
    for (const f of w.flippers) f.pressed = w.time < h.hold[f.side];
  }
  function bot(w, T, rnd, run, skill) {
    const lane = w.balls.find(b => P().ballInLane(b) && Math.abs(b.vy) < 5 && b.y > 990);
    if (lane) {
      const charge = 0.6 + 0.4 * rnd();
      if (run) SR.Rules.launch(T, run, lane, charge);
      else lane.vy = -(T.plunger.min_speed + (T.plunger.max_speed - T.plunger.min_speed) * charge);
      w._launchedAt = w.time;
    }
    if (w.paddle) {
      if (skill && skill.react) { humanPaddle(w, T, rnd, skill); return; }
      // 熟練（機器）：一直對準最低那顆球
      const low = w.balls.filter(b => !P().ballInLane(b)).sort((a, b) => b.y - a.y)[0];
      if (low) w.paddle.target = low.x;
      return;
    }
    if (skill && skill.react) { humanFlippers(w, T, rnd, skill); return; }
    let L = false, R = false;
    const mem = w._botMem || (w._botMem = new Map());
    for (const b of w.balls) {
      const inZone = !(b.y < P().FLIP_Y - 80 || b.y > P().FLIP_Y + 30) && b.vy > -50 && b.x > 125 && b.x < 245;
      if (!inZone) { mem.delete(b.id); continue; }
      if (skill) {
        // 新手：球每次進入擋板區，先決定這次會不會漏接，並且晚一點才反應
        let m = mem.get(b.id);
        if (!m) { m = { since: w.time, miss: rnd() < skill.miss }; mem.set(b.id, m); }
        if (m.miss || w.time - m.since < skill.delay) continue;
      }
      if (b.x < 185) L = true; else R = true;
    }
    // 像真人一樣「按一下」：最多按住 0.35 秒，然後放開 0.2 秒（一直按著會把球卡在接球位置）
    const hold = w._botHold || (w._botHold = { L: 0, R: 0 });
    const tap = (side, want) => {
      const h = hold[side];
      if (h < 0) { hold[side] = Math.min(0, h + 1 / 60); return false; }
      if (!want) { hold[side] = 0; return false; }
      hold[side] = h + 1 / 60;
      if (hold[side] > 0.35) { hold[side] = -0.2; return false; }
      return true;
    };
    L = tap("L", L); R = tap("R", R);
    for (const f of w.flippers) f.pressed = f.side === "L" ? L : R;
  }

  /* 用自動玩家打一關（套用完整規則：強化卡、分裂、炸彈、首領補磚、該區的輔助、球保險）。平衡分析也用這個
     opts：{ skill（NOVICE＝新手）, assists（預設＝該區設定，null＝全關）, hearts（有給就算愛心，用完算失敗）} */
  function playStage(T, n, run, seed, maxSec = 600, opts = {}) {
    const assists = opts.assists === undefined ? SR.Rules.assistsFor(n) : (opts.assists || {});
    const layout = opts.layout === undefined ? SR.layoutFor(n) : opts.layout;
    const st = SR.buildStage(n), w = P().buildTable(T, assists, layout, opts.control || "flipper");
    if (w.paddle) w.paddle.size = opts.paddleSize || SR.paddleSizeFor(n);
    w.ballRadius = SR.ballRadiusFor ? SR.ballRadiusFor(n) : undefined;
    const rnd = SR.rng(seed), ps = SR.Rules.newPlayState();
    P().placeStage(w, st);
    SR.Rules.applyBonuses(run, w);
    w.balls = [P().newBall(T, w)];
    let t = 0, drains = 0, heartsLost = 0, saved = 0, lastBreak = 0, tail = 0;
    const saveLen = SR.Rules.ballSaveTime(T, run, assists);
    for (; t < 60 * maxSec; t++) {
      bot(w, T, rnd, run, opts.skill);
      SR.Rules.updateFinisher(T, w, assists, w.time - lastBreak);
      const ev = []; P().stepFrame(w, T, ev);
      if (ev.some(e => e.type === "brick_break")) lastBreak = w.time;
      if (!w.boss && P().liveBricks(w).length <= 3) tail++;
      SR.Rules.bossTick(T, w, st, 1 / 60, ev);
      SR.Rules.processEvents(T, run, w, ev, ps);
      if (!w.balls.length) {
        drains++;
        if (w._launchedAt != null && w.time - w._launchedAt <= saveLen) saved++; else heartsLost++;
        w._launchedAt = null;
        w.balls = [P().newBall(T, w)];
        if (opts.hearts && heartsLost >= opts.hearts) break;
      }
      if (SR.Rules.isCleared(w)) break;
    }
    return { cleared: SR.Rules.isCleared(w), seconds: t / 60, tail: tail / 60, drains, heartsLost, saved, boss: w.boss, maxCombo: ps.maxCombo, maxBalls: ps.maxBalls };
  }

  /* 卡球探測：台面上每 24px 放一顆球（含 ±5 px/s 擾動與大罐滿級的球），速度 < 8 px/s 連續 3 秒算卡住 */
  function stuckProbe(T, assists, layout = null, control = "flipper") {
      const r = T.ball.radius, stuckAt = [];
      const base = P().buildTable(T, assists, layout, control), top = base.top;
      const overlaps = (x, y) => {
        for (const s of base.segments) {
          const abx = s.bx - s.ax, aby = s.by - s.ay, k = P().clamp(((x - s.ax) * abx + (y - s.ay) * aby) / (abx * abx + aby * aby), 0, 1);
          if (Math.hypot(x - s.ax - abx * k, y - s.ay - aby * k) < r) return true;
        }
        for (const c of base.circles) if (Math.hypot(x - c.x, y - c.y) < r + (c.kind === "bumper" ? T.bumper.radius : c.r) + (c.kind === "fish" ? 4 : 0)) return true;
        return false;
      };
      let runs = 0;
      for (let x = 20 + r; x <= 340 - r; x += 24) for (let y = 60 + top; y <= 930; y += 24) {
        const arcY = 200 + top - Math.sqrt(Math.max(0, 180 * 180 - (x - 200) ** 2));
        if (y < arcY + r + 2) continue;
        // 台面下緣：導球片 → 彈弓 → 漏斗 → 擋板區
        let bottom;
        if (x < 58) bottom = 760 + (x - 20) * 30 / 38;
        else if (x > 312) bottom = 760 + (340 - x) * 30 / 28;
        else if (x < 100) bottom = 865 + (x - 58) * 79 / 42;
        else if (x > 270) bottom = 865 + (312 - x) * 79 / 42;
        else bottom = 930;
        if (y > bottom - r - 2) continue;
        if (P().SLING_TRIS.some(t => inTri(x, y, t)) || overlaps(x, y)) continue;
        for (const [vx, bonus] of [[5, 0], [-5, 0], [5, 4.5]]) {     // 最後一種＝大罐滿級的球
          const w = P().buildTable(T, assists, layout, control); w.radiusBonus = bonus;
          const b = P().newBall(T, w, x, y); b.vx = vx; w.balls = [b]; runs++;
          let still = 0;
          for (let i = 0; i < 600 && w.balls.length; i++) {
            const ev = []; P().stepFrame(w, T, ev);
            if (!w.balls.length) break;
            still = Math.hypot(b.vx, b.vy) < 8 ? still + 1 : 0;
            if (still >= 180) { stuckAt.push(`(${Math.round(b.x)},${Math.round(b.y)})`); break; }
          }
        }
      }
      const uniq = [...new Set(stuckAt)];
      return { pass: stuckAt.length === 0, value: stuckAt.length ? `${runs} 次放球有 ${stuckAt.length} 次卡住：${uniq.slice(0, 4).join(" ")}` : `${runs} 次放球，0 次卡住` };
  }

  const TESTS = [
    { id: "AC-S1", name: "球打中磚塊會扣血並反彈；血歸零時磚塊消失", run(T) {
      const w = emptyWorld(T);
      const k = { id: 999, type: "brick", r: 0, c: 0, x: 180, y: 300, w: 34, h: 18, hp: 2, maxHp: 2, alive: true, flash: 0 };
      w.bricks = [k];
      const shoot = () => { w.balls = [P().newBall(T, w, 197, 420)]; w.balls[0].vy = -800; };
      let bounced = false;
      withGravity(T, 0, () => { shoot(); frames(w, T, 20); bounced = w.balls[0].vy > 0; });
      const hpAfter1 = k.hp;
      withGravity(T, 0, () => { shoot(); frames(w, T, 20); });
      const pass = bounced && hpAfter1 === 1 && !k.alive;
      return { pass, value: `第 1 擊後血量 ${hpAfter1}、反彈 ${bounced ? "是" : "否"}；第 2 擊後${k.alive ? "還在" : "消失"}` };
    }},
    { id: "AC-S2", name: "穿透漆：打碎磚塊時球不反彈、直接穿過", run(T) {
      const w = emptyWorld(T);
      const k = { id: 998, type: "brick", r: 0, c: 0, x: 180, y: 300, w: 34, h: 18, hp: 1, maxHp: 1, alive: true, flash: 0 };
      w.bricks = [k];
      let vyAfter = 0, yAfter = 0;
      withGravity(T, 0, () => { const b = P().newBall(T, w, 197, 420); b.vy = -800; b.pierce = 1; w.balls = [b]; frames(w, T, 20); vyAfter = b.vy; yAfter = b.y; });
      return { pass: !k.alive && vyAfter < 0 && yAfter < 300, value: `磚塊${k.alive ? "還在" : "碎了"}、球繼續往上 ${vyAfter < 0 ? "是" : "否"}` };
    }},
    { id: "AC-S3", name: "多球：只有掉下去的那顆觸發掉球", run(T) {
      const w = P().buildTable(T);
      const a = P().newBall(T, w, 185, 1060); a.vy = 900;          // 會掉進出口
      const b = P().newBall(T, w, 185, 300); b.vx = 200;            // 在上方飛
      w.balls = [a, b];
      const drained = [];
      frames(w, T, 10, ev => ev.forEach(e => { if (e.type === "drain") drained.push(e.b.id); }));
      const pass = drained.length === 1 && drained[0] === a.id && w.balls.length === 1 && w.balls[0].id === b.id;
      return { pass, value: `掉球事件 ${drained.length} 次（${drained[0] === a.id ? "正確的那顆" : "錯的球"}），場上剩 ${w.balls.length} 顆` };
    }},
    { id: "AC-S4", name: "高台面最高速撞牆不穿牆", run(T) {
      const n = Math.max(1, Math.round(T.physics.substeps)), dt = 1 / 60 / n;
      let tunnels = 0, steps = 0;
      for (let k = 0; k < 32; k++) {
        const a = (k / 32) * Math.PI * 2, w = P().buildTable(T);
        const b = P().newBall(T, w, 185, 600); b.vx = Math.cos(a) * T.ball.max_speed; b.vy = Math.sin(a) * T.ball.max_speed; w.balls = [b];
        const walls = w.segments.filter(s => s.kind !== "gate");
        for (let i = 0; i < 90 * n; i++) {
          const p = { x: b.x, y: b.y }, ev = [];
          P().substep(w, T, dt, ev); steps++;
          if (b.dead) break;
          if (walls.some(s => cross(p, b, s))) { tunnels++; break; }
          if (b.y < 940 && (b.x < 19 || b.x > 381 || b.y < 19)) { tunnels++; break; }
        }
      }
      return { pass: tunnels === 0, value: `32 個方向、${steps} 個子步，穿牆 ${tunnels} 次` };
    }},
    { id: "AC-S5", name: "鏡頭：需要操作時兩支擋板一定在畫面內", run(T) {
      const rnd = SR.rng(42);
      let checks = 0, misses = 0, worst = "";
      for (let run = 0; run < 24; run++) {
        const w = P().buildTable(T);
        P().placeStage(w, SR.buildStage(1 + (run % 50)));
        const b = P().newBall(T, w, 30 + rnd() * 300, 80 + rnd() * 500);
        const ang = rnd() * Math.PI * 2, sp = 300 + rnd() * (T.ball.max_speed - 300);
        b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; w.balls = [b];
        const cam = { y: rnd() * P().CAM_MAX };
        for (let i = 0; i < 60 * 20 && w.balls.length; i++) {
          bot(w, T, rnd);
          const ev = []; P().stepFrame(w, T, ev);
          P().updateCamera(cam, w, 1 / 60);
          const urgent = w.balls.some(x => P().ballInLane(x) || (x.y > P().FLIP_Y - 300 && x.vy > 0));
          if (urgent) {
            checks++;
            if (!P().flippersVisible(cam.y, T)) { misses++; worst = `球 (${Math.round(w.balls[0].x)},${Math.round(w.balls[0].y)}) 鏡頭 y=${Math.round(cam.y)}`; }
          }
        }
      }
      return { pass: misses === 0 && checks > 0, value: misses ? `${checks} 次需要操作，有 ${misses} 次看不到擋板：${worst}` : `${checks} 次需要操作，擋板全部在畫面內` };
    }},
    { id: "AC-S6", name: "50 關資料有效（有磚、在台面內、不碰牆、首領關有首領）", run(T) {
      const problems = [];
      for (let n = 1; n <= 50; n++) {
        const st = SR.buildStage(n), w = P().buildTable(T, {}, SR.layoutFor(n)), walls = w.segments;
        P().placeStage(w, st);
        const plain = w.bricks.filter(k => k.type !== "boss");
        if (!plain.length && !w.boss) problems.push(`第 ${n} 關沒有磚`);
        if ((n % 10 === 0) !== !!w.boss) problems.push(`第 ${n} 關首領設定錯誤`);
        if (plain.length < st.cells.filter(c => c.type !== "boss").length * 0.6) problems.push(`第 ${n} 關有超過 4 成的磚被圓弧切掉`);
        for (const k of w.bricks) for (const s of walls) if (distRectSeg(k, s) < 2) { problems.push(`第 ${n} 關有磚碰到牆`); break; }
      }
      const uniq = [...new Set(problems)];
      return { pass: uniq.length === 0, value: uniq.length ? uniq.slice(0, 3).join("；") : "50 關全部有效" };
    }},
    { id: "AC-S7", name: "每一種台面配置都沒有卡球死角（台面配置表裡的每一種）", run(T) {
      // v3.7.3：檢查企劃「台面配置表」裡的台面（之前誤用原本公式的 SR.LAYOUTS，企劃新增的台面不會被檢查到）
      const ids = SR.LEVELS ? Object.keys(SR.LEVELS.layouts) : Object.keys(SR.LAYOUTS);
      const rs = ids.map(id => stuckProbe(T, {}, (SR.tableLayout && SR.tableLayout(id)) || SR.LAYOUTS[id]));
      const bad = ids.filter((id, i) => !rs[i].pass);
      return { pass: !bad.length, value: bad.length ? bad.map(id => `${id}：${rs[ids.indexOf(id)].value}`).join("；") : `${ids.length} 種配置、${rs.reduce((s, r) => s + +r.value.split(" ")[0], 0)} 次放球，0 次卡住` };
    } },
    { id: "AC-S19", name: "台面配置：中柱、阿鰭、加速帶都不貼磚；首領關沒有阿鰭", run(T) {
      const problems = [];
      for (let n = 10; n <= 50; n += 10) if (SR.layoutFor(n).fish) problems.push(`第 ${n} 關首領關有阿鰭`);
      for (let n = 1; n <= 50; n++) {
        const w = P().buildTable(T, {}, SR.layoutFor(n)); P().placeStage(w, SR.buildStage(n));
        const all = w.boss ? [...w.bricks, w.boss] : w.bricks;
        // 阿鰭會游：整條游的路線都要檢查
        const pts = w.circles.flatMap(c => c.kind === "fish" ? [0, 0.25, 0.5, 0.75, 1].map(f => ({ x: c.x0 + (c.x1 - c.x0) * f, y: c.y })) : c.kind === "bumper" ? [c] : []);
        for (const c of pts) for (const k of all) {
          const dx = c.x - P().clamp(c.x, k.x, k.x + k.w), dy = c.y - P().clamp(c.y, k.y, k.y + k.h);
          if (Math.hypot(dx, dy) < T.bumper.radius + 2 * T.ball.radius) { problems.push(`第 ${n} 關（${SR.layoutFor(n).id}）柱子離磚太近`); break; }
        }
        // 加速帶：矩形離磚、離中柱都要 ≥ 46
        const gap = (a, b) => Math.hypot(Math.max(0, a.x - (b.x + b.w), b.x - (a.x + a.w)), Math.max(0, a.y - (b.y + b.h), b.y - (a.y + a.h)));
        for (const p of w.boosts || []) {
          if (all.some(k => gap(p, k) < 46)) problems.push(`第 ${n} 關（${SR.layoutFor(n).id}）加速帶離磚太近`);
          if (w.circles.some(c => c.kind === "bumper" && gap(p, { x: c.x, y: c.y, w: 0, h: 0 }) < 46)) problems.push(`第 ${n} 關（${SR.layoutFor(n).id}）加速帶離中柱太近`);
        }
      }
      return { pass: problems.length === 0, value: problems.length ? [...new Set(problems)].slice(0, 3).join("；") : "50 關的中柱、阿鰭、加速帶都離磚 46 px 以上；首領關沒有阿鰭" };
    } },
    { id: "AC-S21", name: "滑板：打中間直直往上、打邊邊比較斜、出球速度固定、移動有上限、球不會停在滑板上、大中小三種尺寸、可移動整個台面寬", run(T) {
      const shot = off => {
        const w = P().buildTable(T, {}, null, "paddle"); w.bricks = [];
        const b = P().newBall(T, w, w.paddle.x + off * P().paddleDims(T, w).hw, 880); b.vy = 400; w.balls = [b];
        let hit = null; frames(w, T, 30, ev => { const e = ev.find(x => x.type === "paddle"); if (e && !hit) hit = { vx: b.vx, vy: b.vy }; });
        return hit;
      };
      const c = shot(0), e = shot(0.9), problems = [];
      if (!c || !e) return { pass: false, value: "球沒打到滑板" };
      const angC = Math.abs(Math.atan2(c.vx, -c.vy)) * 180 / Math.PI, angE = Math.abs(Math.atan2(e.vx, -e.vy)) * 180 / Math.PI;
      if (angC > 3) problems.push(`中間偏了 ${angC.toFixed(1)}°`);
      if (angE < 35) problems.push(`邊邊只有 ${angE.toFixed(1)}°`);
      if (Math.abs(Math.hypot(c.vx, c.vy) - T.paddle.speed) > 40) problems.push(`出球速度 ${Math.hypot(c.vx, c.vy).toFixed(0)}（應約 ${T.paddle.speed}）`);   // 同一幀裡重力還會作用幾個子步
      const w = P().buildTable(T, {}, null, "paddle"); w.paddle.target = 9999; frames(w, T, 1);
      const moved = w.paddle.x - 180;
      if (moved > T.paddle.max_speed / 60 + 0.5) problems.push(`一幀移動 ${moved.toFixed(1)}px，超過上限`);
      // 球從滑板正上方輕輕掉下來，3 秒後不能還停在滑板附近
      const w2 = P().buildTable(T, {}, null, "paddle"); w2.bricks = []; const b2 = P().newBall(T, w2, 185, 900); w2.balls = [b2];
      let near = 0; frames(w2, T, 180, () => { if (b2.y > 900 && Math.hypot(b2.vx, b2.vy) < 50) near++; });
      if (near > 30) problems.push("球停在滑板上");
      // 第 6 輪：三種尺寸 S < M < L；一般關卡＝中、首領關＝小；可以移動到整個台面寬度（左牆 20～發射道內牆 340）
      const hw = T.paddle.half_widths;
      if (!(hw.S < hw.M && hw.M < hw.L)) problems.push("尺寸大小順序錯");
      const wr = P().buildTable(T, {}, null, "paddle"), [lo, hi] = P().paddleRange(T, wr), h2 = P().paddleDims(T, wr).hw;
      if (lo - h2 > 20.5 || hi + h2 < 339.5) problems.push(`移動範圍只到 ${lo - h2}～${hi + h2}`);
      if (wr.segments.some(s => s.kind === "sling")) problems.push("滑板模式還有彈弓擋住");
      return { pass: !problems.length, value: problems.length ? problems.join("；") : `中間 ${angC.toFixed(1)}°、邊邊 ${angE.toFixed(1)}°、速度 ${T.paddle.speed}、每幀最多 ${moved.toFixed(1)}px、寬 小${hw.S * 2}／中${hw.M * 2}／大${hw.L * 2}、範圍 20～340` };
    } },
    { id: "AC-S22", name: "獎牌依愛心：沒掉＝金、掉 1＝銀、掉 2 以上或續關＝銅；漫畫都能回放、阿鰭先登場再出現在台面", run(T) {
      const p = [];
      const st = SR.buildStage(3);
      if (SR.Rules.stars(st, 0, 999, false) !== 3) p.push("沒掉愛心不是金牌");
      if (SR.Rules.stars(st, 1, 1, false) !== 2) p.push("掉 1 顆不是銀牌");
      if (SR.Rules.stars(st, 2, 1, false) !== 1 || SR.Rules.stars(st, 0, 1, true) !== 1) p.push("銅牌條件錯");
      for (const k in SR.COMICS) if (!SR.COMIC_TITLES[k]) p.push(`漫畫 ${k} 沒有回放標題`);
      for (const k in SR.COMIC_TITLES) if (!SR.COMICS[k]) p.push(`回放標題 ${k} 沒有漫畫`);
      const firstFish = [...Array(50)].map((_, i) => i + 1).find(n => SR.layoutFor(n).fish);
      const fishComic = [...Array(firstFish)].map((_, i) => i + 1).some(n => SR.storyBefore(n).includes("d1_fish"));
      if (!fishComic) p.push(`第 ${firstFish} 關就有阿鰭，但之前沒播阿鰭的漫畫`);
      if (!SR.SPEAKERS.fish || !SR.Comic.CHAR.fish) p.push("漫畫沒有阿鰭");
      return { pass: !p.length, value: p.length ? p.join("；") : `獎牌規則正確・${Object.keys(SR.COMICS).length} 段漫畫都能回放・阿鰭第 ${firstFish} 關登場前先播漫畫` };
    } },
    { id: "AC-S20", report: true, name: "【報告】第 1 區難度（擬人新手、滑板、含輔助）：平均每關掉愛心 ≤ 1、一半以上的關卡完美（9 關 × 5 局）", run(T) {
      let h = 0, perfect = 0, n = 0, sec = 0;
      for (let st = 1; st <= 9; st++) for (let s = 0; s < 5; s++) {
        const seed = st * 1000 + s * 17 + 3;
        const r = playStage(T, st, SR.Rules.simulatedBuild(T, st - 1, seed), seed, 300, { skill: HUMAN.novice, control: "paddle" });
        h += r.heartsLost; perfect += r.heartsLost === 0 ? 1 : 0; sec += r.seconds; n++;
      }
      return { pass: h / n <= 1 && perfect / n >= 0.5, value: `每關掉 ${(h / n).toFixed(2)} 顆、完美 ${perfect}/${n} 關、平均 ${(sec / n).toFixed(0)} 秒` };
    } },
    { id: "AC-S17", report: true, name: "【報告】收尾不拖：擬人新手卡在最後 3 塊平均 ≤ 10 秒，收尾輔助不會變慢（45 局）", run(T) {
      // 彈珠物理對微小差異很敏感，樣本太少結果會飄；用 9 關 × 5 局
      const m = finisher => { let tail = 0, n = 0; for (let st = 1; st <= 9; st++) for (const s of [11, 12, 13, 14, 15]) {
        const r = playStage(T, st, SR.Rules.simulatedBuild(T, st - 1, st * 31 + s), st * 31 + s, 600, { skill: HUMAN.novice, control: "paddle", assists: { ...SR.Rules.assistsFor(st), finisher } });
        tail += r.tail; n++; } return tail / n; };
      const off = m(false), on = m(true);
      return { pass: on <= 10 && on <= off + 0.5, value: `剩 3 塊以下的平均時間：沒輔助 ${off.toFixed(1)}s → 有輔助 ${on.toFixed(1)}s` };
    }},
    { id: "AC-S13", name: "彈道預覽和實際軌跡吻合（0.5 秒內誤差 < 6px）", run(T) {
      let worst = 0;
      for (const [x, y, vx, vy] of [[100, 800, 400, -600], [250, 700, -300, -900], [60, 500, 500, 200], [180, 900, 100, -1500]]) {
        const w = P().buildTable(T, {}); P().placeStage(w, SR.buildStage(1));
        const b = P().newBall(T, w, x, y); b.vx = vx; b.vy = vy; w.balls = [b];
        const pred = P().predictPath(w, T, b, 0.5, 1);
        const n = Math.max(1, Math.round(T.physics.substeps)), dt = 1 / 60 / n;
        for (let i = 0; i < pred.length; i++) { P().substep(w, T, dt, []); if (b.dead) break; worst = Math.max(worst, Math.hypot(b.x - pred[i].x, b.y - pred[i].y)); }
      }
      return { pass: worst < 6, value: `4 條軌跡，最大誤差 ${worst.toFixed(2)} px` };
    }},
    { id: "AC-S14", name: "道具效果：漆彈、慢動作、球保險、加一顆、寬板（接到膠囊時生效）", run(T) {
      const problems = [];
      const w = P().buildTable(T, {}); P().placeStage(w, SR.buildStage(1));
      const k = P().liveBricks(w)[0];
      const b = P().newBall(T, w, k.x + k.w / 2, k.y + k.h + 20); w.balls = [b];
      const fx = { slow: 0, save: 0 };
      const hpBefore = k.hp, ev = SR.Rules.useItem(T, w, "bomb", fx);
      if (!(k.hp < hpBefore || !k.alive) || !ev.some(e => e.type === "bomb")) problems.push("漆彈沒有傷害");
      SR.Rules.useItem(T, w, "slow", fx); if (fx.slow !== T.items.slow_s) problems.push("慢動作沒有計時");
      SR.Rules.useItem(T, w, "save", fx);
      if (fx.save !== T.items.save_s) problems.push("球保險沒有計時");
      for (let i = 0; i < 11 * 60; i++) SR.Rules.tickItems(w, fx, 1 / 60);
      if (fx.save !== 0) problems.push("球保險沒有結束");
      const before = w.balls.length; SR.Rules.useItem(T, w, "ball", fx); if (w.balls.length !== before + 1) problems.push("加一顆沒有加球");
      // 寬板：滑板模式變大尺寸、時間到變回中；擋板模式擋板變長、時間到還原
      const wp = P().buildTable(T, {}, null, "paddle"), mid = P().paddleDims(T, wp).hw;
      SR.Rules.useItem(T, wp, "wide", { slow: 0, save: 0, wide: 0 });
      const big = P().paddleDims(T, wp).hw;
      for (let i = 0; i < 13 * 60; i++) P().stepFrame(wp, T, []);
      if (!(big > mid) || P().paddleDims(T, wp).hw !== mid) problems.push(`寬板：${mid}→${big}→${P().paddleDims(T, wp).hw}`);
      const wf = P().buildTable(T, {}), ff = { slow: 0, save: 0, wide: 0 };
      SR.Rules.useItem(T, wf, "wide", ff); const longer = wf.flipperBonus > 0;
      for (let i = 0; i < 13 * 60; i++) SR.Rules.tickItems(wf, ff, 1 / 60);
      if (!longer || wf.flipperBonus !== 0) problems.push("擋板模式的寬板沒有還原");
      return { pass: problems.length === 0, value: problems.length ? problems.join("；") : `${SR.ITEMS.length} 種道具效果正確（寬板：滑板半寬 ${mid}→${big}）` };
    }},
    { id: "AC-S16", name: "劇情是童話：很久很久以前開場、從此以後結尾、玩家不是彈珠、反派叫灰先生", run(T) {
      const problems = [], texts = [];
      for (const pages of Object.values(SR.COMICS)) for (const page of pages) for (const p of page) { if (p.cap) texts.push(p.cap); for (const b of p.say || []) texts.push(b.text); }
      const intro = SR.COMICS.intro[0][0].cap || "", ending = SR.COMICS.ending.flat().map(p => (p.cap || "") + (p.say || []).map(b => b.text).join("")).join("");
      if (!intro.startsWith("很久很久以前")) problems.push("序章不是「很久很久以前」開頭");
      if (!ending.includes("從此以後")) problems.push("結局沒有「從此以後」");
      if (texts.some(x => /鋼珠|變成彈珠/.test(x))) problems.push("還有「玩家是彈珠」的說法");
      if (texts.some(x => /灰老大/.test(x)) || SR.SPEAKERS.grey.name !== "灰先生") problems.push("反派名稱不對");
      if (!SR.COMICS.intro.flat().some(p => (p.cast || []).some(c => c.who === "kid"))) problems.push("序章沒有主角小葵");
      return { pass: problems.length === 0, value: problems.length ? problems.join("；") : `${Object.keys(SR.COMICS).length} 段漫畫、${texts.length} 段文字檢查通過` };
    }},
    { id: "AC-S18", browser: true, name: "漫畫資料與版面：背景／角色都存在、對話框不超過 32 字、不蓋到臉、格子不重疊也不超出頁面", run(T) {
      const problems = [], mctx = document.createElement("canvas").getContext("2d");
      for (const [key, pages] of Object.entries(SR.COMICS)) pages.forEach((page, pi) => {
        const cells = SR.Comic.layout(page);
        cells.forEach((c, i) => {
          const p = c.p, where = `${key} 第${pi + 1}頁第${i + 1}格`;
          if (!SR.Comic.BG[p.bg]) problems.push(`${where} 背景 ${p.bg} 不存在`);
          for (const ch of p.cast || []) if (!SR.Comic.CHAR[ch.who]) problems.push(`${where} 角色 ${ch.who} 不存在`);
          for (const b of p.say || []) {
            if (!SR.SPEAKERS[b.who]) problems.push(`${where} 說話者 ${b.who} 不存在`);
            if (b.text.length > 32) problems.push(`${where} 對話太長（${b.text.length} 字）`);
            if (b.tail !== "none" && !(p.cast || []).some(c => c.who === b.who || (b.who === "pinky" && c.who === "pinkyGrey"))) problems.push(`${where} 說話的人不在格子裡`);
          }
          if (c.x < 0 || c.y < 0 || c.x + c.w > SR.Comic.VW + 0.5 || c.y + c.h > SR.Comic.VH + 0.5) problems.push(`${where} 超出頁面`);
          cells.forEach((d, j) => { if (j > i && c.x < d.x + d.w - 0.5 && d.x < c.x + c.w - 0.5 && c.y < d.y + d.h - 0.5 && d.y < c.y + c.h - 0.5) problems.push(`${where} 和第${j + 1}格重疊`); });
          if (c.h < 90) problems.push(`${where} 太矮（${Math.round(c.h)}px）`);
          for (const hit of SR.Comic.bubbleCoversFace(mctx, c)) problems.push(`${where} 對話框${hit}`);
          for (const out of SR.Comic.bubbleOutside(mctx, c)) problems.push(`${where} 對話框超出格子：${out}`);
        });
        if (page.length > 5) problems.push(`${key} 第${pi + 1}頁格數太多`);
      });
      const pagesN = Object.values(SR.COMICS).reduce((s, p) => s + p.length, 0);
      return { pass: problems.length === 0, value: problems.length ? problems.slice(0, 4).join("；") : `${pagesN} 頁漫畫全部有效` };
    }},
    { id: "AC-S8", name: "自動遊玩能在 3 分鐘內打完第 1 關", run(T) {
      const w = P().buildTable(T), rnd = SR.rng(7);
      P().placeStage(w, SR.buildStage(1));
      w.balls = [P().newBall(T, w)];
      let t = 0, drains = 0;
      for (; t < 60 * 180; t++) {
        bot(w, T, rnd);
        const ev = []; P().stepFrame(w, T, ev);
        if (ev.some(e => e.type === "drain")) drains++;
        if (!w.balls.length) w.balls = [P().newBall(T, w)];
        if (!P().liveBricks(w).length) break;
      }
      const left = P().liveBricks(w).length;
      return { pass: left === 0, value: left ? `3 分鐘後還剩 ${left} 塊磚` : `${(t / 60).toFixed(1)} 秒打完（掉球 ${drains} 次）` };
    }},
    { id: "AC-S8b", name: "5 個首領都打得倒（帶一輪該有的 9 張隨機強化卡，各 3 局，7 分鐘內）", run(T) {
      const out = [];
      let ok = true;
      for (const n of [10, 20, 30, 40, 50]) {
        const ts = [];
        for (const sd of [1, 2, 3]) {
          const r = playStage(T, n, SR.Rules.simulatedBuild(T, 9, n * 10 + sd), sd * 7, 420);
          ok = ok && r.cleared;
          ts.push(r.cleared ? Math.round(r.seconds) + "s" : `✗剩${r.boss.hp}`);
        }
        out.push(`${n}關 ${ts.join("/")}`);
      }
      return { pass: ok, value: out.join("・") };
    }},
    { id: "AC-S9b", name: "強化卡規則：不超過上限、愛心最多 5、一次給 3 張不重複", run(T) {
      const run = SR.Rules.newRun(T, 0), rnd = SR.rng(5), problems = [];
      for (let i = 0; i < 60; i++) {
        const offer = SR.Rules.offerUpgrades(T, run, rnd);
        if (new Set(offer.map(u => u.id)).size !== offer.length) problems.push("同一次出現重複的卡");
        if (offer.length) SR.Rules.takeUpgrade(T, run, offer[0].id);
      }
      for (const u of SR.UPGRADES) if ((run.upgrades[u.id] || 0) > u.max) problems.push(`${u.name} 超過上限`);
      if (run.hearts > T.run.max_hearts) problems.push("愛心超過上限");
      const w = P().buildTable(T); SR.Rules.applyBonuses(run, w);
      return { pass: problems.length === 0, value: problems.length ? [...new Set(problems)].join("；") : `抽 60 次：傷害 ${w.dmg}、球半徑 +${w.radiusBonus}、擋板力道 ×${w.flipperPower.toFixed(2)}、愛心 ${run.hearts}` };
    }},
    { id: "AC-S9c", name: "最大顆的球（大罐滿級）能發射、能從擋板中間掉下去", run(T) {
      const w = P().buildTable(T); w.radiusBonus = 1.5 * SR.UPGRADES.find(u => u.id === "big").max;
      const b = P().newBall(T, w); w.balls = [b];
      frames(w, T, 30);                                   // 先讓球在發射道落定
      b.vy = -T.plunger.max_speed; let top = b.y;
      frames(w, T, 60, () => { if (w.balls[0]) top = Math.min(top, w.balls[0].y); });
      const launched = top < 500;
      const w2 = P().buildTable(T); w2.radiusBonus = w.radiusBonus;
      const c = P().newBall(T, w2, 185, 880); w2.balls = [c];
      let drained = false; frames(w2, T, 180, ev => { if (ev.some(e => e.type === "drain")) drained = true; });
      return { pass: launched && drained, value: `半徑 ${b.r}：發射最高到 y=${Math.round(top)}（${launched ? "出得去" : "卡在發射道"}）・中間${drained ? "掉得下去" : "卡住"}` };
    }},
    { id: "AC-S9", name: "劇情、強化卡、成就資料完整", run() {
      const problems = [];
      for (let n = 1; n <= 50; n++) for (const k of [...SR.storyBefore(n), ...SR.storyAfter(n)]) if (!SR.COMICS[k]) problems.push(`第 ${n} 關找不到劇情 ${k}`);
      const dup = arr => arr.length !== new Set(arr).size;
      if (dup(SR.UPGRADES.map(u => u.id))) problems.push("強化卡 id 重複");
      if (dup(SR.ACHIEVEMENTS.map(a => a.id))) problems.push("成就 id 重複");
      return { pass: problems.length === 0, value: problems.length ? problems.slice(0, 3).join("；") : `劇情 ${Object.keys(SR.COMICS).length} 段、強化卡 ${SR.UPGRADES.length} 種、成就 ${SR.ACHIEVEMENTS.length} 個` };
    }},
    { id: "AC-S10", name: "手感沿用 v2：擋板全舉時間、尖端擊球速度相同", run(T) {
      const w = emptyWorld(T), f = P().buildTable(T).flippers[0];
      w.flippers = [f];
      const n = Math.max(1, Math.round(T.physics.substeps)), dt = 1 / 60 / n;
      let time = 0;
      f.pressed = true;
      while (Math.abs(f.angle - P().flipperUp(T, f)) > 1e-9 && time < 1) { P().updateFlipper(T, f, dt); time += dt; }
      // 尖端擊球（與 v2 測試 AC2 相同的擺法）
      const g = P().buildTable(T), f2 = g.flippers[0];
      g.segments = []; g.circles = []; g.flippers = [f2];
      const { L, rb, rt } = P().flipperDims(T, g), a = P().flipperRest(T, f2), tA = 0.85, rr = rb + (rt - rb) * tA;
      const qx = f2.px + Math.cos(a) * L * tA, qy = f2.py + Math.sin(a) * L * tA;
      const b = P().newBall(T, g, qx + Math.sin(a) * (rr + T.ball.radius + 0.5), qy - Math.cos(a) * (rr + T.ball.radius + 0.5));
      g.balls = [b]; f2.pressed = true;
      let best = 0;
      for (let i = 0; i < 12; i++) { P().stepFrame(g, T, []); best = Math.max(best, Math.hypot(b.vx, b.vy)); }
      const ms = time * 1000;
      return { pass: Math.abs(ms - 35.4) < 0.1 && Math.abs(best - 1901) < 2, value: `全舉 ${ms.toFixed(1)} ms（v2：35.4）・尖端 ${Math.round(best)} px/s（v2：1901）` };
    }}
  , { id: "AC-S27", name: "所有關卡都是矮台面（top 320），遊玩時鏡頭固定不捲動", run(T) {
      const problems = [];
      for (let n = 1; n <= 50; n++) if (SR.layoutFor(n).top !== 320) problems.push(`第 ${n} 關 top ${SR.layoutFor(n).top}`);
      for (const n of [5, 15, 25, 35, 45]) {
        const w = P().buildTable(T, SR.Rules.assistsFor(n), SR.layoutFor(n), "paddle"); P().placeStage(w, SR.buildStage(n));
        const rnd = SR.rng(n * 31), run = SR.Rules.newRun(T, 0); w.balls = [P().newBall(T, w)];
        let moved = 0;
        for (let f = 0; f < 60 * 20; f++) {
          bot(w, T, rnd, run, HUMAN.novice); P().stepFrame(w, T, []);
          if (!w.balls.length) w.balls = [P().newBall(T, w)];
          if (P().cameraTarget(w) !== P().CAM_MAX) moved++;
        }
        if (moved) problems.push(`第 ${n} 關鏡頭移動 ${moved} 幀`);
      }
      return { pass: !problems.length, value: problems.length ? [...new Set(problems)].slice(0, 4).join("；") : "50 關 top 都是 320；第 5／15／25／35／45 關各玩 20 秒，鏡頭都沒動" };
    }}
  , { id: "AC-S28", name: "加速帶：往上經過加速 ×1.35（最少 1000、最多 2000）、往下不加速、0.5 秒內不重複；首領關沒有加速帶", run(T) {
      const problems = [];
      // 首領關：台面配置有加速帶也不放（v3.7.2 起台面由企劃的表決定，這裡自己造一個有加速帶的台面）
      const padLayout = { id: "test_pad", name: "測試", top: 320, bumpers: [], boost: [[152, 763]] };
      const pads = n => { const w = P().buildTable(T, {}, padLayout, "paddle"); P().placeStage(w, SR.buildStage(n)); return (w.boosts || []).length; };
      if (pads(10) !== 0 || pads(11) !== 1) problems.push(`首領關 ${pads(10)} 條、一般關 ${pads(11)} 條（應 0／1）`);
      // 只看加速帶：拿掉重力、空氣阻力、牆、柱子、磚、滑板；速度在加速那一幀量
      const trial = (vy, again) => withGravity(T, 0, () => {
        const oldDamp = T.ball.damping; T.ball.damping = 0;
        try {
          const w = P().buildTable(T, {}, padLayout, "paddle");
          w.bricks = []; w.circles = []; w.segments = []; w.paddle = null;
          const pad = (w.boosts || [])[0]; if (!pad) return null;
          const cx = pad.x + pad.w / 2, b = P().newBall(T, w, cx, vy < 0 ? pad.y + pad.h + 6 : pad.y - 6); b.vx = 0; b.vy = vy; w.balls = [b];
          let boosts = 0, sp = null;
          frames(w, T, 20, ev => { const n = ev.filter(e => e.type === "boost").length; boosts += n; if (n && sp == null) sp = Math.hypot(b.vx, b.vy); });
          if (sp == null) sp = Math.hypot(b.vx, b.vy);
          if (again) { b.x = cx; b.y = pad.y + pad.h + 6; b.vx = 0; b.vy = -800; frames(w, T, 6, ev => { boosts += ev.filter(e => e.type === "boost").length; }); }
          return { sp, boosts };
        } finally { T.ball.damping = oldDamp; }
      });
      for (const [vin, want] of [[-500, 1000], [-800, 1080], [-1700, 2000]]) {
        const r = trial(vin); if (!r) { problems.push("測試台面沒有加速帶"); break; }
        if (Math.abs(r.sp - want) > 6 || r.boosts !== 1) problems.push(`往上 ${-vin} → ${r.sp.toFixed(0)}（應 ${want}）、加速 ${r.boosts} 次`);
      }
      const down = trial(800);
      if (down && (Math.abs(down.sp - 800) > 6 || down.boosts)) problems.push(`往下 800 → ${down.sp.toFixed(0)}、加速 ${down.boosts} 次（應不加速）`);
      const cd = trial(-800, true);
      if (cd && cd.boosts !== 1) problems.push(`0.5 秒內加速了 ${cd.boosts} 次`);
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "首領關沒有、500→1000、800→1080、1700→2000；往下不加速；0.5 秒內不重複" };
    }}
  , { id: "AC-S40", report: true, name: "【報告】加速帶條數（設計值：第 3 區 1 條、第 4、5 區 2 條、第 1、2 區與首領關沒有）", run(T) {
      const count = n => { const w = P().buildTable(T, {}, SR.layoutFor(n), "paddle"); P().placeStage(w, SR.buildStage(n)); return (w.boosts || []).length; };
      const counts = [25, 35, 45, 30, 15, 5].map(count);
      return { pass: counts.join() === "1,2,2,0,0,0", value: `第 25／35／45／30／15／5 關：${counts.join("／")} 條（設計值 1／2／2／0／0／0）` };
    }}
  , { id: "AC-S39", report: true, name: "【報告】台面輪替：同一區相鄰兩關的台面不同", run(T) {
      const same = [];
      for (let n = 2; n <= 50; n++) if ((n - 1) % 10 && SR.layoutFor(n).id === SR.layoutFor(n - 1).id) same.push(n);
      return { pass: !same.length, value: same.length ? `第 ${same.join("、")} 關跟上一關台面一樣` : "相鄰兩關都不一樣" };
    }}
  , { id: "AC-S29", report: true, name: "【報告】第 2～5 區難度（擬人新手、滑板）：設計目標＝每區不比前一區簡單超過 0.15、第 5 區每關 0.8～1.4 顆、每區平均一關 ≤ 90 秒（每區 9 關 × 2 局）", run(T) {
      const rows = [];
      for (let d = 1; d <= 4; d++) {
        let h = 0, sec = 0, n = 0;
        for (let s = 1; s <= 9; s++) for (const k of [3, 21]) {
          const st = d * 10 + s, seed = st * 1000 + k;
          const r = playStage(T, st, SR.Rules.simulatedBuild(T, s - 1, seed), seed, 300, { skill: HUMAN.novice, control: "paddle" });
          h += r.heartsLost; sec += r.seconds; n++;
        }
        rows.push({ d: d + 1, hearts: h / n, sec: sec / n });
      }
      const problems = [];
      for (let i = 1; i < rows.length; i++) if (rows[i].hearts < rows[i - 1].hearts - 0.15) problems.push(`第 ${rows[i].d} 區比第 ${rows[i - 1].d} 區簡單`);
      const d5 = rows[3].hearts; if (d5 < 0.8 || d5 > 1.4) problems.push(`第 5 區每關 ${d5.toFixed(2)} 顆（應 0.8～1.4）`);
      for (const r of rows) if (r.sec > 90) problems.push(`第 ${r.d} 區平均 ${r.sec.toFixed(0)} 秒`);
      const txt = rows.map(r => `第 ${r.d} 區 ${r.hearts.toFixed(2)} 顆／${r.sec.toFixed(0)} 秒`).join("、");
      return { pass: !problems.length, value: (problems.length ? problems.join("；") + "｜" : "") + txt };
    }}
  , { id: "AC-S30", report: true, name: "【報告】每區難度元件（跟第一版設計值比）：球的大小、滑板大小、磚血、中柱數量、彈道預覽、拖尾長度", run(T) {
      const problems = [], R = SR.Rules;
      const radii = [5, 15, 25, 35, 45].map(n => SR.ballRadiusFor ? SR.ballRadiusFor(n) : NaN);
      if (radii.join() !== "12,12,11,10.5,10.5") problems.push(`球半徑 ${radii.join("／")}`);
      const w = P().buildTable(T); w.ballRadius = radii[3]; w.radiusBonus = 1.5 * 2;
      if (P().ballRadius(T, w) !== 13.5) problems.push(`第 35 關大罐 2 級＝${P().ballRadius(T, w)}`);
      if (T.paddle.half_widths.S !== 48) problems.push(`小滑板半寬 ${T.paddle.half_widths.S}`);
      const sizes = [3, 25, 35, 10].map(n => SR.paddleSizeFor(n));
      if (sizes.join() !== "M,M,S,S") problems.push(`滑板 ${sizes.join("／")}`);
      // 第 4、5 區不再少 1 血：每塊磚 ≥ 圖案數字、≤ 圖案數字 + 1
      for (let n = 31; n <= 49; n++) if (n % 10) for (const c of (SR.generateStage || SR.buildStage)(n).cells) if (c.type === "brick" && (c.base == null || c.hp < c.base || c.hp > c.base + 1)) { problems.push(`第 ${n} 關有磚 ${c.hp} 血（圖案 ${c.base}）`); break; }
      for (let n = 11; n <= 50; n++) { const pairs = (SR.layoutFor(n).bumpers || []).length / 2; if (pairs > (n <= 20 ? 2 : 1)) problems.push(`第 ${n} 關（${SR.layoutFor(n).id}）有 ${pairs} 對中柱`); }
      if (R.assistsFor(25).preview) problems.push(`第 25 關還有 ${R.assistsFor(25).preview} 秒預覽`);
      const trails = [5, 15, 25, 35, 45].map(n => SR.trailFor ? SR.trailFor(n) : NaN);
      if (trails.join() !== "8,8,4,0,0") problems.push(`拖尾 ${trails.join("／")}`);
      return { pass: !problems.length, value: problems.length ? [...new Set(problems)].slice(0, 6).join("；") : "球 12／12／11／10.5／10.5、大罐 2 級 13.5、滑板 M／M／S／S（S 半寬 48）、第 4、5 區磚不再少血、中柱數量、預覽、拖尾 8／8／4／0／0 都對" };
    }}
  , { id: "AC-S33", name: "道具膠囊：打破道具磚會掉膠囊、每秒 170 px 直直掉、碰到滑板就接住生效、沒接到過 y 1000 消失、不撞球", run(T) {
      const problems = [];
      // 找一關有道具磚的（v3.7.2 起磚牆由企劃的表決定）
      const gn = [...Array(50)].map((_, i) => i + 1).find(n => SR.buildStage(n).cells.some(c => c.type === "gift"));
      const setup = paddleUnder => {
        if (!gn) return null;
        const w = P().buildTable(T, {}, SR.layoutFor(gn), "paddle"); P().placeStage(w, SR.buildStage(gn)); w.balls = [];
        const k = w.bricks.find(x => x.type === "gift"); if (!k) return null;
        const cx = k.x + k.w / 2; w.paddle.x = w.paddle.target = paddleUnder ? P().clamp(cx, 76, 284) : (cx < 180 ? 284 : 76);
        const ev = []; P().damageBrick(w, k, 99, ev, "ball");
        return { w, k, cx };
      };
      const s = setup(true);
      if (!s) return { pass: false, value: "50 關都沒有道具磚，沒辦法測" };
      const cap = (s.w.capsules || [])[0];
      if (!cap) problems.push("打破道具磚沒有掉膠囊");
      else {
        if (!SR.ITEMS.some(i => i.id === cap.item)) problems.push(`膠囊道具不明：${cap.item}`);
        const y0 = cap.y; frames(s.w, T, 30);
        if (Math.abs(cap.y - y0 - 85) > 1.5) problems.push(`0.5 秒掉了 ${(cap.y - y0).toFixed(1)} px（應 85）`);
        let caught = null; frames(s.w, T, 300, ev => { const e = ev.find(x => x.type === "capsule_caught"); if (e && !caught) caught = e; });
        if (!caught) problems.push("滑板在下面卻沒接到");
        else if (caught.item !== cap.item || s.w.capsules.length) problems.push("接到後膠囊沒有移除或道具不對");
      }
      const m = setup(false);
      if (m && m.w.capsules && m.w.capsules[0]) {
        let caught = 0, missed = 0, gone = false;
        frames(m.w, T, 600, ev => { caught += ev.filter(x => x.type === "capsule_caught").length; missed += ev.filter(x => x.type === "capsule_missed").length; });
        gone = !m.w.capsules.length;
        if (caught || !missed || !gone) problems.push(`沒接到：接住 ${caught}、漏接 ${missed}、消失 ${gone ? "是" : "否"}`);
      }
      // 球穿過膠囊：跟沒有膠囊時完全一樣
      const twin = withCap => withGravity(T, 0, () => {
        const w = P().buildTable(T, {}, SR.layoutFor(12), "paddle"); w.bricks = []; w.circles = []; w.segments = []; w.paddle = null;
        w.capsules = withCap ? [{ id: 1, item: "bomb", x: 180, y: 500 }] : [];
        const b = P().newBall(T, w, 120, 500); b.vx = 900; b.vy = 0; w.balls = [b]; frames(w, T, 10);
        return { vx: b.vx, vy: b.vy, cy: withCap ? w.capsules[0] && w.capsules[0].y : null };
      });
      const a = twin(true), b0 = twin(false);
      if (Math.abs(a.vx - b0.vx) > 1e-6 || Math.abs(a.vy - b0.vy) > 1e-6) problems.push("球碰到膠囊被改變了");
      if (a.cy == null || Math.abs(a.cy - 500 - 170 / 6) > 1) problems.push("膠囊被球撞歪了");
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "會掉、170 px/s、接住生效並移除、漏接消失、不撞球" };
    }}
  , { id: "AC-S34", report: true, name: "【報告】道具磚數量（設計值）：第 1 關 0 塊、第 2～50 關每關 2～3 塊", run(T) {
      const bad = [];
      for (let n = 1; n <= 50; n++) {
        const g = SR.buildStage(n).cells.filter(c => c.type === "gift").length;
        if (n === 1 ? g !== 0 : g < 2 || g > 3) bad.push(`第 ${n} 關 ${g} 塊`);
      }
      return { pass: !bad.length, value: bad.length ? bad.slice(0, 6).join("、") + (bad.length > 6 ? ` …共 ${bad.length} 關不對` : "") : "第 1 關 0 塊，第 2～50 關都是 2～3 塊" };
    }}
  /* ---------- v3.7.2 關卡設定表（申請單 level-config-table）---------- */
  , { id: "AC-S36", name: "第一版關卡表跟原本公式產生的 50 關完全相同（企劃改過表之後改成報告）",
      report: () => !!(SR.LEVELS && SR.LEVELS.source && SR.LEVELS.source !== "export"), run(T) {
      if (!SR.LEVELS || !SR.generateStage || !SR.DEFAULTS) return { pass: false, value: "還沒有 SR.LEVELS／SR.generateStage／SR.DEFAULTS" };
      const R = SR.Rules, D = SR.DEFAULTS, diff = [];
      const cellsKey = st => st.cells.map(c => `${c.r},${c.c},${c.type},${c.type === "boss" ? "" : c.hp}`).sort().join("|");
      const geo = L => JSON.stringify({ name: L.name, bumpers: L.bumpers || [], fish: L.fish || null, rails: (L.rails || []).map(r => r.slice(0, 5)), boost: L.boost || [] });
      const asst = a => [a.preview || 0, !!a.timing, a.ballSave || 0, !!a.finisher].join();
      for (let n = 1; n <= 50; n++) {
        const a = SR.buildStage(n), b = SR.generateStage(n), what = [];
        if (cellsKey(a) !== cellsKey(b)) what.push("磚牆");
        if (a.name !== b.name) what.push("名稱");
        if (a.parTime !== b.parTime) what.push("標準時間");
        if (JSON.stringify(a.boss) !== JSON.stringify(b.boss)) what.push("首領");
        if (SR.layoutFor(n).id !== D.layoutFor(n).id || geo(SR.layoutFor(n)) !== geo(D.layoutFor(n))) what.push("台面");
        if (SR.paddleSizeFor(n) !== D.paddleSizeFor(n)) what.push("滑板");
        if (SR.ballRadiusFor(n) !== D.ballRadiusFor(n)) what.push("球半徑");
        if (SR.trailFor(n) !== D.trailFor(n)) what.push("拖尾");
        if (asst(R.assistsFor(n)) !== asst(D.assistsFor(n))) what.push("輔助");
        if (what.length) diff.push(`第 ${n} 關（${what.join("、")}）`);
      }
      return { pass: !diff.length, value: diff.length ? `跟第一版不同：${diff.slice(0, 8).join("、")}${diff.length > 8 ? ` …共 ${diff.length} 關` : ""}` : "50 關跟原本公式完全相同" };
    }}
  , { id: "AC-S37", name: "同步檢查：正確的表沒有問題；填壞的表會列出「第幾關・哪一欄・問題」", run(T) {
      const L = SR.LevelCheck; if (!L || !SR.LEVELS) return { pass: false, value: "還沒有 SR.LevelCheck" };
      const good = L.toRows(SR.LEVELS), ok = L.validate(good.stages, good.layouts);
      const problems = [];
      if (ok.problems.length) problems.push(`正確的表被擋：${ok.problems.slice(0, 3).map(p => `第 ${p.stage} 關・${p.column}：${p.message}`).join("；")}`);
      const bad = JSON.parse(JSON.stringify(good)), row = n => bad.stages.find(r => +r["關卡"] === n);
      row(7)["滑板"] = "Q";
      row(9)["第3排"] = row(9)["第3排"].slice(0, 2) + "9" + row(9)["第3排"].slice(3);
      row(5)["球半徑"] = 7;
      row(6)["道具池"] = "bomb,lazer";
      row(8)["台面配置"] = "z_new";
      for (const c of L.WALL_COLS) row(10)[c] = String(row(10)[c] || "").replace("X", ".");   // 拿掉首領（不管企劃把首領放在第幾排）
      row(11)["第1排"] = "....X....";
      row(12)["第2排"] = "22223223";
      const r = L.validate(bad.stages, bad.layouts), has = (n, col) => r.problems.some(p => p.stage === n && p.column === col);
      const want = [[7, "滑板"], [9, "第3排"], [5, "球半徑"], [6, "道具池"], [8, "台面配置"], [10, "磚牆"], [11, "磚牆"], [12, "第2排"]];
      const miss = want.filter(([n, c]) => !has(n, c));
      if (miss.length) problems.push(`沒抓到：${miss.map(([n, c]) => `第 ${n} 關・${c}`).join("、")}`);
      return { pass: !problems.length, value: problems.length ? problems.join("；") : `正確的表 0 個問題；填壞的表抓到 ${r.problems.length} 個問題，例如「第 ${r.problems[0].stage} 關・${r.problems[0].column}：${r.problems[0].message}」` };
    }}
  , { id: "AC-S38", name: "改表的效果：只影響改到的那一關；字元對應正確；純數字的排照樣讀；道具池決定掉什麼", run(T) {
      if (!SR.LEVELS || !SR.withLevels || !SR.LevelCheck) return { pass: false, value: "還沒有 SR.withLevels／SR.LevelCheck" };
      const problems = [], key = st => st.cells.map(c => `${c.r},${c.c},${c.type},${c.hp}`).sort().join("|");
      const before13 = key(SR.buildStage(13));
      const copy = JSON.parse(JSON.stringify(SR.LEVELS)), s12 = copy.stages.find(s => s.n === 12);
      s12.paddle = "L"; s12.grid[0] = "333333333"; s12.items = ["wide"];
      SR.withLevels(copy, () => {
        const row0 = SR.buildStage(12).cells.filter(c => c.r === 0);
        if (row0.length !== 9 || row0.some(c => c.type !== "brick" || c.hp !== 3)) problems.push("第 12 關第一排不是 9 塊 3 血");
        if (SR.paddleSizeFor(12) !== "L") problems.push(`第 12 關滑板 ${SR.paddleSizeFor(12)}`);
        if (key(SR.buildStage(13)) !== before13) problems.push("第 13 關被改到了");
        const w = P().buildTable(T, {}, SR.layoutFor(12), "paddle"); P().placeStage(w, SR.buildStage(12)); w.stageN = 12;
        const k = w.bricks.find(x => x.type === "gift");
        if (!k) problems.push("第 12 關沒有道具磚");
        else { const items = new Set(); for (let i = 0; i < 12; i++) { const e = []; const c = P().spawnCapsule(w, 100, 100, e, undefined, SR.itemPoolFor(12)); items.add(c.item); } if ([...items].join() !== "wide") problems.push(`道具池 wide 卻掉了 ${[...items].join("、")}`); }
      });
      // 純數字的排、各種字元
      const rows = SR.LevelCheck.toRows(SR.LEVELS), r1 = rows.stages.find(r => +r["關卡"] === 1);
      r1["第2排"] = 222232233; r1["第3排"] = ".1G.B..5.";
      const v = SR.LevelCheck.validate(rows.stages, rows.layouts);
      if (v.problems.length) problems.push(`檢查擋下：${v.problems[0].message}`);
      else {
        const g = v.levels.stages.find(s => s.n === 1).grid;
        if (g[1] !== "222232233") problems.push(`純數字排讀成 ${g[1]}`);
        SR.withLevels(v.levels, () => {
          const c = SR.buildStage(1).cells.filter(x => x.r === 2), at = col => c.find(x => x.c === col);
          const ok = at(1) && at(1).type === "brick" && at(1).hp === 1 && at(2) && at(2).type === "gift" && at(4) && at(4).type === "bucket" && at(7) && at(7).hp === 5 && c.length === 4;
          if (!ok) problems.push(`「.1G.B..5.」變成 ${c.map(x => `${x.c}:${x.type}${x.hp}`).join(" ")}`);
        });
      }
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "只改第 12 關、字元對應、純數字排、道具池都正確" };
    }}
  , { id: "AC-S25", name: "全破的街區按「從頭再打一次」從第 1 關開始", run() {
      const cases = [[1, 1], [6, 6], [11, 1], [51, 1]];             // 規則書 game-ui 的範例表
      const got = cases.map(([u]) => SR.Rules.districtStartStage({ unlocked: u }, 0));
      const d2 = SR.Rules.districtStartStage({ unlocked: 15 }, 1);
      return { pass: cases.every(([, e], i) => got[i] === e) && d2 === 15,
        value: `第 1 區（已解鎖 1／6／11／51）→ ${got.join("／")}・第 2 區已解鎖 15 → ${d2}` };
    }}
  ];

  /* ---------- 遊戲流程測試（v3.6.2）：在看不見的框架開 index.html?test=1，用 SR_GAME 操作真的遊戲 ----------
     測試模式用另一份存檔（sprayrun.save.test），不會動到玩家的存檔 */
  const TEST_SAVE = "sprayrun.save.test";
  const BASE_SAVE = { seenOpening: true, tutorialDone: true };
  async function bootGame(frame, preset) {                          // preset：物件＝先寫入測試存檔；null＝保留上一次的測試存檔
    try { if (preset) localStorage.setItem(TEST_SAVE, JSON.stringify(preset)); else if (preset === undefined) localStorage.removeItem(TEST_SAVE); } catch (e) {}
    await new Promise(res => { frame.onload = res; frame.src = "index.html?test=1&r=" + Math.random(); });
    const w = frame.contentWindow;
    for (let i = 0; i < 200 && !w.SR_GAME; i++) await new Promise(r => setTimeout(r, 25));
    if (!w.SR_GAME) throw new Error("遊戲沒有啟動");
    return w;
  }
  function runTicks(w, secs, until) {
    for (let t = 0; t < secs; t += 1 / 60) { w.SR_GAME.tick(1 / 60); if (until && until()) return true; }
    return until ? until() : true;
  }
  function toLaunch(w) {                                            // 關掉漫畫、跑完開場運鏡，等球停在發射道底部
    const g = w.SR_GAME; g.closeDialog();
    return runTicks(w, 8, () => g.G.screen === "play" && g.G.world.balls.some(b => w.SR.Physics.ballInLane(b) && b.y > 990 && Math.abs(b.vy) < 30));
  }
  const GAME_TESTS = [
    { id: "AC-S23", name: "按住空白鍵：系統連發的按鍵訊號不會讓發射桿力道歸零", async run(frame) {
      const w = await bootGame(frame, BASE_SAVE), g = w.SR_GAME;
      g.startDistrict(0, 2);
      if (!toLaunch(w)) return { pass: false, value: "球沒有停到發射道" };
      const key = (type, repeat) => w.dispatchEvent(new w.KeyboardEvent(type, { code: "Space", key: " ", repeat }));
      key("keydown", false); runTicks(w, 0.54);
      const before = g.G.plunger.charge;
      key("keydown", true); key("keydown", true);
      const after = g.G.plunger.charge;
      key("keyup", false);
      return { pass: before > 0.5 && after >= before - 1e-9, value: `連發前力道 ${before.toFixed(2)} → 連發後 ${after.toFixed(2)}` };
    }},
    { id: "AC-S24", name: "音樂關掉後重新整理，仍然是關", async run(frame) {
      let w = await bootGame(frame, BASE_SAVE);
      const btn = w.document.getElementById("goSound");
      if (!btn) return { pass: false, value: "標題畫面沒有音樂按鈕" };
      btn.click();
      const offNow = w.SR.Audio.musicOn === false;
      w = await bootGame(frame, null);
      const label = (w.document.getElementById("goSound") || {}).textContent;
      return { pass: offNow && w.SR.Audio.musicOn === false && label === "音樂：關", value: `按下後 ${offNow ? "關" : "開"}・重新整理後按鈕「${label}」` };
    }},
    { id: "AC-S26", name: "按跳過的漫畫不算看過；看完才算", async run(frame) {
      let w = await bootGame(frame, BASE_SAVE), g = w.SR_GAME;
      g.startDistrict(0, 1);
      const playing = !w.document.getElementById("comicLayer").hidden;
      w.document.getElementById("comicSkip").click();
      for (let i = 0; i < 30; i++) w.SR.Comic.update(1 / 60);
      const afterSkip = !!g.save.seenComic.intro;
      w = await bootGame(frame, BASE_SAVE); g = w.SR_GAME;
      g.startDistrict(0, 1);
      // 看完＝一格一格點到最後（closeDialog 等於按跳過，不能拿來模擬看完）
      for (let i = 0; i < 3000 && w.SR.Comic.active(); i++) { w.SR.Comic.tap(); w.SR.Comic.update(0.05); }
      const afterWatch = !!g.save.seenComic.intro;
      return { pass: playing && !afterSkip && afterWatch, value: `有播放 ${playing ? "是" : "否"}・跳過後算看過 ${afterSkip ? "是" : "否"}・看完後算看過 ${afterWatch ? "是" : "否"}` };
    }}
    , { id: "AC-S31", name: "拉發射桿的手指不會帶動滑板；放開後才恢復", async run(frame) {
      const w = await bootGame(frame, BASE_SAVE), g = w.SR_GAME;
      g.startDistrict(0, 2);
      if (!toLaunch(w)) return { pass: false, value: "球沒有停到發射道" };
      const cv = w.document.getElementById("game"), rc = cv.getBoundingClientRect(), p = g.G.world.paddle;
      p.target = 180;
      const ev = (type, x, y) => cv.dispatchEvent(new w.PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: rc.left + x * rc.width, clientY: rc.top + y * rc.height, bubbles: true, cancelable: true }));
      ev("pointerdown", 0.02, 0.5);
      const pulling = g.G.plunger.holding, afterDown = p.target;
      ev("pointermove", 0.7, 0.6);
      const afterMove = p.target;
      ev("pointerup", 0.7, 0.6);
      ev("pointermove", 0.3, 0.6);
      const afterRelease = p.target;
      return { pass: pulling && afterDown === 180 && afterMove === 180 && afterRelease !== 180,
        value: `拉桿中 ${pulling ? "是" : "否"}・按下後目標 ${Math.round(afterDown)}・拖動後 ${Math.round(afterMove)}・放開後移動 ${Math.round(afterRelease)}` };
    }}
    , { id: "AC-S32", name: "手機畫面（390×680）台面不會被下方提示或上方資訊列蓋住（v3.7.1 起沒有道具欄）", async run(frame) {
      const old = [frame.style.width, frame.style.height];
      frame.style.width = "390px"; frame.style.height = "680px";
      try {
        const w = await bootGame(frame, { ...BASE_SAVE, unlocked: 12, items: { bomb: 1, slow: 1, save: 1, ball: 1, wide: 1 } }), g = w.SR_GAME;
        g.startDistrict(1, 12);
        if (!toLaunch(w)) return { pass: false, value: "沒有進入遊玩" };   // 開場運鏡會傾斜縮放台面，要等開打後才量
        await new Promise(r => setTimeout(r, 250));                 // 等版面重新排好、畫面更新一次
        const box = id => w.document.getElementById(id).getBoundingClientRect();
        const cv = box("game"), below = box("hint"), hud = box("hud");
        return { pass: cv.bottom <= below.top + 0.5 && cv.top >= hud.bottom - 0.5,
          value: `台面底 ${Math.round(cv.bottom)} vs 提示頂 ${Math.round(below.top)}・台面頂 ${Math.round(cv.top)} vs 資訊列底 ${Math.round(hud.bottom)}` };
      } finally { frame.style.width = old[0]; frame.style.height = old[1]; }
    }}
    , { id: "AC-S35", name: "遊玩畫面沒有道具欄；打完一區不再送道具", async run(frame) {
      const w = await bootGame(frame, { ...BASE_SAVE, unlocked: 12, items: { bomb: 2, slow: 1 } }), g = w.SR_GAME;
      g.startDistrict(1, 12);
      if (!toLaunch(w)) return { pass: false, value: "沒有進入遊玩" };
      const bar = w.document.getElementById("itembar"), barShown = !!bar && !bar.hidden && bar.getBoundingClientRect().height > 0;
      let rewardText = "（沒測）";
      if (g.districtCleared) { g.districtCleared(); rewardText = w.document.getElementById("screen").textContent; }
      const noReward = !/街區獎勵/.test(rewardText) && rewardText !== "（沒測）";
      return { pass: !barShown && noReward, value: `道具欄 ${barShown ? "還在" : "沒有"}・街區解放畫面 ${rewardText === "（沒測）" ? "沒辦法測" : noReward ? "沒有送道具" : "還在送道具"}` };
    }}
    /* ---------- v3.7.3 台面編輯器（申請單 layout-editor）：在看不見的框架開 editor.html，用 SR_EDITOR 操作 ---------- */
    , { id: "AC-S41", name: "台面編輯器：中柱對稱新增與拖曳、關掉對稱、刪除、離磚提醒、另存新台面", async run(frame) {
      const w = await bootEditor(frame), E = w.SR_EDITOR;
      if (!E || !E.setMode) return { pass: false, value: "編輯器沒有台面模式（SR_EDITOR.setMode）" };
      const problems = [], has = (x, y) => E.layout.bumpers.some(b => b[0] === x && b[1] === y);
      E.load(1); E.setMode("layout"); E.setMirror(true);
      const n0 = E.layout.bumpers.length;
      E.addBumper(90, 700);
      if (E.layout.bumpers.length !== n0 + 2 || !has(90, 700) || !has(270, 700)) problems.push(`對稱新增後 ${JSON.stringify(E.layout.bumpers)}`);
      E.moveObject("bumper", E.layout.bumpers.findIndex(b => b[0] === 90 && b[1] === 700), 100, 690);
      if (!has(100, 690) || !has(260, 690)) problems.push(`拖曳後另一顆沒跟著動：${JSON.stringify(E.layout.bumpers)}`);
      E.setMirror(false); E.addBumper(90, 760);
      if (E.layout.bumpers.length !== n0 + 3) problems.push("關掉對稱還是加了兩顆");
      E.remove("bumper", E.layout.bumpers.findIndex(b => b[0] === 90 && b[1] === 760));
      if (E.layout.bumpers.length !== n0 + 2) problems.push("刪除沒有效果");
      E.moveObject("bumper", E.layout.bumpers.findIndex(b => b[0] === 100 && b[1] === 690), 100, 470);
      const warn = E.warnings().join("｜");
      if (!/第 1 關/.test(warn) || !/磚/.test(warn)) problems.push(`移到磚區沒有提醒：「${warn}」`);
      // 另存新台面
      E.load(35); E.setMode("layout");
      const orig = JSON.stringify(w.SR.LEVELS.layouts.d_high);
      E.saveAs("d_high_35"); E.setMirror(true); E.addBumper(120, 730);
      const copy = E.copyText();
      if (!copy.startsWith("d_high_35\t")) problems.push(`另存後複製的開頭是「${copy.split("\t")[0]}」`);
      if (!/第 35 關/.test(E.reminder || "") || !/d_high_35/.test(E.reminder || "")) problems.push(`沒有提醒改台面配置：「${E.reminder || ""}」`);
      if (JSON.stringify(w.SR.LEVELS.layouts.d_high) !== orig) problems.push("另存後原本的 d_high 被改到了");
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "對稱新增／拖曳、關掉對稱、刪除、離磚提醒、另存新台面都正確" };
    }}
    , { id: "AC-S42", name: "台面編輯器的「複製」＝台面配置表的一列，貼回同步讀得回來", async run(frame) {
      const w = await bootEditor(frame), E = w.SR_EDITOR;
      if (!E || !E.copyText) return { pass: false, value: "編輯器沒有 copyText" };
      const problems = [];
      E.load(31); E.setMode("layout");
      const want = "d_tri\t雙柱\t80,700; 280,700\t\t\t82,773; 222,773";
      if (E.copyText() !== want) problems.push(`d_tri 複製成「${E.copyText().replace(/\t/g, "⇥")}」`);
      E.setMirror(true); E.addBumper(120, 730); E.addRail(30, 620, 30, 700); E.addBoost(152, 800); E.setFish({ y: 660, x0: 80, x1: 280, speed: 90 });
      const cols = E.copyText().split("\t"), L = w.SR.LevelCheck, rows = L.toRows(w.SR.LEVELS);
      const heads = Object.keys(rows.layouts[0]), i = rows.layouts.findIndex(r => r["代號"] === "d_tri");
      rows.layouts[i] = Object.fromEntries(heads.map((h, k) => [h, cols[k] ?? ""]));
      const v = L.validate(rows.stages, rows.layouts);
      if (v.problems.length) problems.push(`讀回有問題：${v.problems[0].column}：${v.problems[0].message}`);
      else {
        const a = v.levels.layouts.d_tri, b = E.layout, norm = x => JSON.stringify({ bumpers: x.bumpers, fish: x.fish || null, rails: (x.rails || []).map(r => r.slice(0, 5)), boost: x.boost });
        if (norm(a) !== norm(b)) problems.push(`讀回不一樣：${norm(a)} ≠ ${norm(b)}`);
      }
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "複製格式正確，加了中柱、彈力牆、加速帶、阿鰭後讀回完全相同" };
    }}
    // v3.9 提案 level-editor-submit：編輯器改完直接送出（測試模式的暫存用另一個 key，不會動到企劃的暫存）
    , { id: "AC-S47", name: "編輯器「送出修改」只列出改過的關卡與台面；沒改就說沒有要送出的", async run(frame) {
      try { localStorage.removeItem("sprayrun.editor.draft.test"); } catch (e) {}
      let w = await bootEditor(frame), E = w.SR_EDITOR;
      if (!E || !E.changes) return { pass: false, value: "編輯器沒有送出功能（SR_EDITOR.changes）" };
      const problems = [];
      if (!/沒有要送出的修改/.test(E.submitMessage())) problems.push(`沒改東西時是「${E.submitMessage()}」`);
      E.load(3); E.grid.splice(0, 1, "333333333");
      E.load(1); E.setMode("layout"); E.setMirror(true);
      const [bx, by] = E.layout.bumpers[0]; E.moveObject("bumper", 0, bx + 4, by);
      const ch = E.changes(), p = E.payload("測試");
      const list = ch.stages.map(s => `${s.n}:${s.parts.join("+")}`).join(",") + "|" + ch.layouts.join(",");
      if (list !== "3:磚牆|a_pair") problems.push(`清單是「${list}」`);
      if (JSON.stringify(Object.keys(p.stages)) !== '["3"]' || JSON.stringify(Object.keys(p.stages[3])) !== '["grid"]' || p.stages[3].grid[0] !== "333333333") problems.push(`修改檔的關卡是 ${JSON.stringify(p.stages)}`);
      if (JSON.stringify(Object.keys(p.layouts)) !== '["a_pair"]' || p.note !== "測試") problems.push(`修改檔的台面／備註是 ${JSON.stringify(Object.keys(p.layouts))}／${p.note}`);
      E.discardDraft();
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "清單「第 3 關（磚牆）＋台面 a_pair」，修改檔只有這兩項；沒改時說沒有要送出的修改" };
    }}
    , { id: "AC-S48", name: "編輯器自動暫存：沒送出就重新整理，會問要不要接著改，接著改後修改還在", async run(frame) {
      try { localStorage.removeItem("sprayrun.editor.draft.test"); } catch (e) {}
      let w = await bootEditor(frame), E = w.SR_EDITOR;
      if (!E || !E.saveDraft) return { pass: false, value: "編輯器沒有暫存功能（SR_EDITOR.saveDraft）" };
      E.load(5); E.grid.splice(0, 1, "5.......5"); E.saveDraft();
      w = await bootEditor(frame); E = w.SR_EDITOR;
      const asked = E.draftPending;
      E.resumeDraft(); E.load(5);
      const row0 = E.grid[0], kept = row0 === "5.......5";
      E.discardDraft();
      return { pass: asked && kept, value: `重新整理後有問 ${asked ? "是" : "否"}・接著改後第 5 關第 1 排是「${row0}」` };
    }}
    , { id: "AC-S49", name: "編輯器「設定」模式：改滑板、球半徑會列進送出清單；超出範圍標出允許範圍、不能送出", async run(frame) {
      try { localStorage.removeItem("sprayrun.editor.draft.test"); } catch (e) {}
      const w = await bootEditor(frame), E = w.SR_EDITOR;
      if (!E || !E.setSetting) return { pass: false, value: "編輯器沒有設定模式（SR_EDITOR.setSetting）" };
      const problems = [];
      E.load(12); E.setMode("settings"); E.setSetting("paddle", "L"); E.setSetting("ball", 14);
      const s12 = E.changes().stages.find(s => s.n === 12);
      if (!s12 || s12.parts.join("+") !== "滑板+球半徑") problems.push(`清單是「${s12 ? s12.parts.join("+") : "沒有第 12 關"}」`);
      const p = E.payload();
      if (p.stages[12]?.paddle !== "L" || p.stages[12]?.ball !== 14) problems.push(`修改檔是 ${JSON.stringify(p.stages[12])}`);
      if (!E.canSubmit) problems.push("數值正確卻不能送出");
      E.setSetting("ball", 20);
      if (!/8.16/.test(E.fieldError("ball"))) problems.push(`球半徑 20 的提示是「${E.fieldError("ball")}」`);
      if (E.canSubmit) problems.push("球半徑 20 還能送出");
      E.discardDraft();
      return { pass: !problems.length, value: problems.length ? problems.join("；") : "改滑板、球半徑列進清單與修改檔；球半徑 20 顯示 8–16、不能送出" };
    }}
    // v3.8 提案 stage-select-map：地圖上每一關都有自己的入口按鈕
    , { id: "AC-S43", name: "地圖每區 10 顆有編號的關卡按鈕；打過的和下一關能直接點來玩，其他鎖住", async run(frame) {
      let w = await bootGame(frame, { ...BASE_SAVE, unlocked: 1 }), g = w.SR_GAME;
      g.mapScreen();
      const d1 = w.document.querySelector(".district"), btns = d1 ? [...d1.querySelectorAll("[data-stage]")] : [];
      const labels = btns.map(b => +b.dataset.stage), numbered = btns.every(b => b.textContent.includes(b.dataset.stage));
      const firstNext = btns[0]?.textContent.includes("▶"), restLocked = btns.slice(1).every(b => b.disabled);
      w = await bootGame(frame, { ...BASE_SAVE, unlocked: 7 }); g = w.SR_GAME;
      g.mapScreen();
      w.document.querySelector('.district [data-stage="3"]')?.click();
      g.closeDialog();                                              // 有漫畫的話先跳過
      const started = g.G.stage?.n, hearts = g.G.run?.hearts;
      const ok = labels.join() === "1,2,3,4,5,6,7,8,9,10" && numbered && firstNext && restLocked && started === 3 && hearts === 3;
      return { pass: ok, value: `按鈕 ${labels.join(",") || "沒有"}・有編號 ${numbered ? "是" : "否"}・第 1 顆▶ ${firstNext ? "是" : "否"}・其他鎖住 ${restLocked ? "是" : "否"}・已解鎖 7 點第 3 顆 → 第 ${started ?? "?"} 關、愛心 ${hearts ?? "?"}` };
    }}
    , { id: "AC-S44", name: "手機寬 375 px：關卡按鈕至少 44×44；排成來回路線（1→5、10←6）", async run(frame) {
      const old = frame.style.width;
      frame.style.width = "375px";
      try {
        const w = await bootGame(frame, { ...BASE_SAVE, unlocked: 12 }), g = w.SR_GAME;
        g.mapScreen();
        await new Promise(r => setTimeout(r, 100));
        const problems = [];
        [...w.document.querySelectorAll(".district")].slice(0, 2).forEach((d, k) => {
          const rect = n => d.querySelector(`[data-stage="${n}"]`)?.getBoundingClientRect();
          const base = k * 10, rs = Array.from({ length: 10 }, (_, i) => rect(base + i + 1));
          if (rs.some(r => !r)) { problems.push(`第 ${k + 1} 區按鈕不齊`); return; }
          const small = rs.findIndex(r => r.width < 44 || r.height < 44);
          if (small >= 0) problems.push(`第 ${base + small + 1} 關 ${Math.round(rs[small].width)}×${Math.round(rs[small].height)}`);
          const row1 = rs.slice(0, 5), row2 = rs.slice(5);
          const sameRow = row => row.every(r => Math.abs(r.top - row[0].top) < 4);
          if (!sameRow(row1) || !sameRow(row2) || !(row2[0].top > row1[0].top)) problems.push(`第 ${k + 1} 區不是兩排`);
          if (!row1.every((r, i) => !i || r.left > row1[i - 1].left)) problems.push(`第 ${k + 1} 區第 1 排不是由左到右`);
          if (!row2.every((r, i) => !i || r.left < row2[i - 1].left)) problems.push(`第 ${k + 1} 區第 2 排不是由右到左`);
        });
        return { pass: !problems.length, value: problems.length ? problems.join("；") : "第 1、2 區的按鈕都 ≥ 44×44，排成 1→5、10←6" };
      } finally { frame.style.width = old; }
    }}
    , { id: "AC-S46", name: "5 區的路連成一條街：第 10N 關往下接第 10N+1 關，路和按鈕對齊、不被文字蓋到", async run(frame) {
      const old = frame.style.width;
      frame.style.width = "375px";
      try {
        const w = await bootGame(frame, { ...BASE_SAVE, unlocked: 14 }), g = w.SR_GAME;
        g.mapScreen();
        await new Promise(r => setTimeout(r, 100));
        const ds = [...w.document.querySelectorAll(".district")], problems = [];
        const cx = r => (r.left + r.right) / 2, hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
        for (let N = 1; N <= 4; N++) {
          const out = ds[N - 1]?.querySelector(".lane-out")?.getBoundingClientRect(), inn = ds[N]?.querySelector(".lane-in")?.getBoundingClientRect();
          const a = ds[N - 1]?.querySelector(`[data-stage="${10 * N}"]`)?.getBoundingClientRect(), b = ds[N]?.querySelector(`[data-stage="${10 * N + 1}"]`)?.getBoundingClientRect();
          if (!out || !inn || !a || !b) { problems.push(`第 ${10 * N}→${10 * N + 1} 關沒有連接的路`); continue; }
          const cy = r => (r.top + r.bottom) / 2;                    // 路要從第 10N 關的中心往下、到第 10N+1 關的中心，中間不能有縫
          if (Math.abs(out.bottom - inn.top) > 2 || out.top > cy(a) + 2 || inn.bottom < cy(b) - 2) problems.push(`第 ${10 * N}→${10 * N + 1} 關的路斷掉`);
          if ([cx(out), cx(inn), cx(a), cx(b)].some(x => Math.abs(x - cx(a)) > 4)) problems.push(`第 ${10 * N}→${10 * N + 1} 關沒有對齊`);
          const texts = [...ds[N].querySelectorAll("h3, .act, .story, .assist-line, .nextname, .row, .sub, .lockmsg")].map(e => e.getBoundingClientRect());
          if (texts.some(t => hit(t, inn))) problems.push(`第 ${N + 1} 區的文字蓋到路`);
        }
        return { pass: !problems.length, value: problems.length ? problems.join("；") : "第 10→11、20→21、30→31、40→41 關的路都連起來、對齊、沒被文字蓋到" };
      } finally { frame.style.width = old; }
    }}
    , { id: "AC-S45", name: "地圖卡片顯示下一關的關名（第 N 關・關名）", async run(frame) {
      const w = await bootGame(frame, { ...BASE_SAVE, unlocked: 3 }), g = w.SR_GAME;
      g.mapScreen();
      const want = `第 3 關・${w.SR.buildStage(3).name}`, text = w.document.querySelector(".district")?.textContent || "";
      return { pass: text.includes(want), value: `要有「${want}」：${text.includes(want) ? "有" : "沒有"}` };
    }}
  ];
  async function bootEditor(frame) {
    await new Promise(res => { frame.onload = res; frame.src = "editor.html?test=1&r=" + Math.random(); });
    const w = frame.contentWindow;
    for (let i = 0; i < 200 && !(w.SR_EDITOR && w.SR_EDITOR.ready); i++) await new Promise(r => setTimeout(r, 25));
    return w;
  }
  async function runGame(frame) {
    const out = [];
    for (const t of GAME_TESTS) {
      const t0 = performance.now();
      let r; try { r = await t.run(frame); } catch (e) { r = { pass: false, value: "錯誤：" + e.message }; }
      out.push({ id: t.id, name: t.name, ms: Math.round(performance.now() - t0), ...r });
    }
    try { localStorage.removeItem(TEST_SAVE); } catch (e) {}
    return out;
  }

  // opts.node＝在 Node 跑（同步工具）：需要瀏覽器畫布量字的測試（browser: true）跳過，交給 test.html
  function run(T, opts = {}) {
    return TESTS.filter(t => !(opts.node && t.browser)).map(t => {
      const t0 = performance.now();
      let r; try { r = t.run(T); } catch (e) { r = { pass: false, value: "錯誤：" + e.message }; }
      // report＝只報告、不擋部署（企劃一改表就可能不同的設計值與難度）
      const report = typeof t.report === "function" ? !!t.report() : !!t.report;
      return { id: t.id, name: t.name, ms: Math.round(performance.now() - t0), report, ...r };
    });
  }
  return { run, runGame, bot, playStage, stuckProbe, NOVICE, HUMAN, TESTS, GAME_TESTS };
})();
