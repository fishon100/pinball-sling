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
  function stuckProbe(T, assists, layout = null) {
      const r = T.ball.radius, stuckAt = [];
      const base = P().buildTable(T, assists, layout), top = base.top;
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
          const w = P().buildTable(T, assists, layout); w.radiusBonus = bonus;
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
    { id: "AC-S7", name: "每一種台面配置都沒有卡球死角", run(T) {
      const ids = Object.keys(SR.LAYOUTS), rs = ids.map(id => stuckProbe(T, {}, SR.LAYOUTS[id]));
      const bad = ids.filter((id, i) => !rs[i].pass);
      return { pass: !bad.length, value: bad.length ? bad.map(id => `${id}：${rs[ids.indexOf(id)].value}`).join("；") : `${ids.length} 種配置、${rs.reduce((s, r) => s + +r.value.split(" ")[0], 0)} 次放球，0 次卡住` };
    } },
    { id: "AC-S19", name: "台面配置：柱子不碰磚、第 1 區最矮、越後面越高、每關跟上一關不同", run(T) {
      const problems = [];
      const tops = SR.DISTRICT_LAYOUTS.map(list => Math.min(...list.map(id => SR.LAYOUTS[id].top)));
      for (let i = 1; i < tops.length; i++) if (tops[i] > tops[i - 1]) problems.push(`第 ${i + 1} 區比前一區矮`);
      if (SR.LAYOUTS[SR.DISTRICT_LAYOUTS[0][0]].top < P().CAM_MAX) problems.push("第 1 區還需要捲動鏡頭");
      for (let n = 2; n <= 50; n++) if ((n - 1) % 10 && SR.layoutFor(n) === SR.layoutFor(n - 1)) problems.push(`第 ${n} 關跟上一關台面一樣`);
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
      }
      return { pass: problems.length === 0, value: problems.length ? [...new Set(problems)].slice(0, 3).join("；") : `${Object.keys(SR.LAYOUTS).length} 種配置；台面高度依區 ${tops.map(t => P().H - t).join("／")}` };
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
      if (SR.paddleSizeFor(3) !== "M" || SR.paddleSizeFor(10) !== "S") problems.push("關卡的滑板尺寸不對");
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
    { id: "AC-S20", name: "第 1 區難度（擬人新手、滑板、含輔助）：平均每關掉愛心 ≤ 1、一半以上的關卡完美（9 關 × 5 局）", run(T) {
      let h = 0, perfect = 0, n = 0, sec = 0;
      for (let st = 1; st <= 9; st++) for (let s = 0; s < 5; s++) {
        const seed = st * 1000 + s * 17 + 3;
        const r = playStage(T, st, SR.Rules.simulatedBuild(T, st - 1, seed), seed, 300, { skill: HUMAN.novice, control: "paddle" });
        h += r.heartsLost; perfect += r.heartsLost === 0 ? 1 : 0; sec += r.seconds; n++;
      }
      return { pass: h / n <= 1 && perfect / n >= 0.5, value: `每關掉 ${(h / n).toFixed(2)} 顆、完美 ${perfect}/${n} 關、平均 ${(sec / n).toFixed(0)} 秒` };
    } },
    { id: "AC-S17", name: "收尾不拖：擬人新手卡在最後 3 塊平均 ≤ 10 秒，收尾輔助不會變慢（45 局）", run(T) {
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
    { id: "AC-S14", name: "道具：漆彈、慢動作、球保險、加一顆、寬板，每種最多 3 個", run(T) {
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
      const save = SR.Rules.emptySave(); for (let i = 0; i < 5; i++) SR.Rules.grantItem(save, "bomb");
      if (save.items.bomb !== SR.ITEM_MAX) problems.push("道具超過上限");
      return { pass: problems.length === 0, value: problems.length ? problems.join("；") : `${SR.ITEMS.length} 種道具效果正確、上限 3（寬板：滑板半寬 ${mid}→${big}）` };
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
    { id: "AC-S18", name: "漫畫資料與版面：背景／角色都存在、對話框不超過 32 字、不蓋到臉、格子不重疊也不超出頁面", run(T) {
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
    , { id: "AC-S32", name: "手機畫面（390×680）道具欄出現後，台面不會被道具欄或上方資訊列蓋住", async run(frame) {
      const old = [frame.style.width, frame.style.height];
      frame.style.width = "390px"; frame.style.height = "680px";
      try {
        const w = await bootGame(frame, { ...BASE_SAVE, unlocked: 12, items: { bomb: 1, slow: 1, save: 1, ball: 1, wide: 1 } }), g = w.SR_GAME;
        g.startDistrict(1, 12);
        if (!toLaunch(w)) return { pass: false, value: "沒有進入遊玩" };   // 開場運鏡會傾斜縮放台面，要等開打後才量
        await new Promise(r => setTimeout(r, 250));                 // 等版面重新排好、畫面更新一次
        const box = id => w.document.getElementById(id).getBoundingClientRect();
        const cv = box("game"), bar = box("itembar"), hud = box("hud");
        const shown = !w.document.getElementById("itembar").hidden;
        return { pass: shown && cv.bottom <= bar.top + 0.5 && cv.top >= hud.bottom - 0.5,
          value: `道具欄 ${shown ? "有" : "沒有"}出現・台面底 ${Math.round(cv.bottom)} vs 道具欄頂 ${Math.round(bar.top)}・台面頂 ${Math.round(cv.top)} vs 資訊列底 ${Math.round(hud.bottom)}` };
      } finally { frame.style.width = old[0]; frame.style.height = old[1]; }
    }}
  ];
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

  function run(T) {
    return TESTS.map(t => {
      const t0 = performance.now();
      let r; try { r = t.run(T); } catch (e) { r = { pass: false, value: "錯誤：" + e.message }; }
      return { id: t.id, name: t.name, ms: Math.round(performance.now() - t0), ...r };
    });
  }
  return { run, runGame, bot, playStage, stuckProbe, NOVICE, HUMAN, TESTS, GAME_TESTS };
})();
