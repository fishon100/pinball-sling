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
  function bot(w, T, rnd, run, skill) {
    const lane = w.balls.find(b => P().ballInLane(b) && Math.abs(b.vy) < 5 && b.y > 990);
    if (lane) {
      const charge = 0.6 + 0.4 * rnd();
      if (run) SR.Rules.launch(T, run, lane, charge);
      else lane.vy = -(T.plunger.min_speed + (T.plunger.max_speed - T.plunger.min_speed) * charge);
      w._launchedAt = w.time;
    }
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
    const cluster = opts.cluster ?? SR.districtOf(n).cluster;
    const st = SR.buildStage(n), w = P().buildTable(T, assists, cluster), rnd = SR.rng(seed), ps = SR.Rules.newPlayState();
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
  function stuckProbe(T, assists, cluster = 3) {
      const r = T.ball.radius, stuckAt = [];
      const base = P().buildTable(T, assists, cluster);
      const overlaps = (x, y) => {
        for (const s of base.segments) {
          const abx = s.bx - s.ax, aby = s.by - s.ay, k = P().clamp(((x - s.ax) * abx + (y - s.ay) * aby) / (abx * abx + aby * aby), 0, 1);
          if (Math.hypot(x - s.ax - abx * k, y - s.ay - aby * k) < r) return true;
        }
        for (const c of base.circles) if (Math.hypot(x - c.x, y - c.y) < r + (c.kind === "bumper" ? T.bumper.radius : c.r)) return true;
        return false;
      };
      let runs = 0;
      for (let x = 20 + r; x <= 340 - r; x += 24) for (let y = 60; y <= 930; y += 24) {
        const arcY = 200 - Math.sqrt(Math.max(0, 180 * 180 - (x - 200) ** 2));
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
          const w = P().buildTable(T, assists, cluster); w.radiusBonus = bonus;
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
      const walls = P().buildTable(T).segments;
      for (let n = 1; n <= 50; n++) {
        const st = SR.buildStage(n), w = P().buildTable(T);
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
    { id: "AC-S7", name: "空台面沒有卡球死角（彈跳柱群每側 3／2／1 顆都測）", run(T) {
      const rs = [3, 2, 1].map(c => stuckProbe(T, {}, c));
      return { pass: rs.every(r => r.pass), value: rs.map((r, i) => `${3 - i} 顆：${r.value}`).join("；") };
    } },
    { id: "AC-S19", name: "彈跳柱群（中柱）：不碰磚、越後面越少、讓新手每關少掉一半以上的愛心（45 局）", run(T) {
      const problems = [];
      const cl = SR.DISTRICTS.map(d => d.cluster);
      for (let i = 1; i < cl.length; i++) if (cl[i] > cl[i - 1]) problems.push(`第 ${i + 1} 區的柱比前一區多`);
      for (let n = 1; n <= 50; n++) {
        const w = P().buildTable(T, {}, SR.districtOf(n).cluster); P().placeStage(w, SR.buildStage(n));
        const all = w.boss ? [...w.bricks, w.boss] : w.bricks;
        for (const c of w.circles) for (const k of all) {
          const dx = c.x - P().clamp(c.x, k.x, k.x + k.w), dy = c.y - P().clamp(c.y, k.y, k.y + k.h);
          if (Math.hypot(dx, dy) < T.bumper.radius + 2 * T.ball.radius) { problems.push(`第 ${n} 關柱子離磚太近`); break; }
        }
      }
      // 只看台面本身：輔助全關，新手自動玩家，第 1 區 9 關 × 5 局
      const m = cluster => { let h = 0, n = 0; for (let st = 1; st <= 9; st++) for (let s = 0; s < 5; s++) {
        const seed = st * 1000 + s * 17 + 3;
        h += playStage(T, st, SR.Rules.simulatedBuild(T, st - 1, seed), seed, 300, { skill: NOVICE, assists: null, cluster }).heartsLost; n++; } return h / n; };
      const off = m(0), on = m(SR.DISTRICTS[0].cluster);
      if (on > off * 0.5) problems.push(`愛心只從 ${off.toFixed(2)} 降到 ${on.toFixed(2)}`);
      return { pass: problems.length === 0, value: problems.length ? [...new Set(problems)].slice(0, 3).join("；") : `每側 ${cl.join("／")} 顆；新手每關掉愛心 ${off.toFixed(2)} → ${on.toFixed(2)}` };
    } },
    { id: "AC-S17", name: "收尾輔助：新手卡在最後 3 塊的時間少 20% 以上（45 局）", run(T) {
      // 彈珠物理對微小差異很敏感，樣本太少結果會飄；用 9 關 × 5 局
      const m = finisher => { let tail = 0, n = 0; for (let st = 1; st <= 9; st++) for (const s of [11, 12, 13, 14, 15]) {
        const r = playStage(T, st, SR.Rules.simulatedBuild(T, st - 1, st * 31 + s), st * 31 + s, 600, { skill: NOVICE, assists: { ...SR.Rules.assistsFor(st), finisher } });
        tail += r.tail; n++; } return tail / n; };
      const off = m(false), on = m(true);
      return { pass: on <= off * 0.8, value: `剩 3 塊以下的平均時間：沒輔助 ${off.toFixed(1)}s → 有輔助 ${on.toFixed(1)}s` };
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
    { id: "AC-S14", name: "道具：漆彈、慢動作、球保險、加一顆，每種最多 3 個", run(T) {
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
      const save = SR.Rules.emptySave(); for (let i = 0; i < 5; i++) SR.Rules.grantItem(save, "bomb");
      if (save.items.bomb !== SR.ITEM_MAX) problems.push("道具超過上限");
      return { pass: problems.length === 0, value: problems.length ? problems.join("；") : "4 種道具效果正確、上限 3" };
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
  ];

  function run(T) {
    return TESTS.map(t => {
      const t0 = performance.now();
      let r; try { r = t.run(T); } catch (e) { r = { pass: false, value: "錯誤：" + e.message }; }
      return { id: t.id, name: t.name, ms: Math.round(performance.now() - t0), ...r };
    });
  }
  return { run, bot, playStage, NOVICE, TESTS };
})();
