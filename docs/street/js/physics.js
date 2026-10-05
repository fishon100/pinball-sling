/* ============================================================
   噴漆闖關 — 物理核心（純函式，遊戲與測試共用）
   擋板／球／牆的碰撞與 v2（tools/tuning-prototype）相同，手感參數讀同一份 tuning.json。
   新增：多球、磚塊（圓與矩形）、移動的首領、1.4 倍高的台面、鏡頭規則。
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.Physics = (function () {
  const W = 400, H = 1060, VIEW_H = 740, CAM_MAX = H - VIEW_H, DRAIN_Y = 1080;
  const FLIP_Y = 960;                       // 擋板轉軸高度
  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  // 磚塊格子：9 欄，每格 35×20，磚 33×18（發射道內牆在 x=340）
  const GRID = { x0: 21, y0: 96, cw: 35, ch: 20, bw: 33, bh: 18, cols: 9 };
  const SLING_TRIS = [
    [[58, 790], [58, 865], [94, 900]],
    [[312, 790], [312, 865], [276, 900]]
  ];

  function seg(ax, ay, bx, by, kind = "wall", extra = {}) { return { ax, ay, bx, by, kind, ...extra }; }


  // 台面配置（見 data.js 的 SR.LAYOUTS）：top＝台面頂端往下移多少（越大台面越矮）、bumpers＝彈跳柱、rails＝導軌、fish＝會游的阿鰭
  // 沒給配置時用最早的高台面（兩顆彈跳柱），舊測試都用這個
  const DEFAULT_LAYOUT = { id: "classic", top: 0, bumpers: [[56, 560], [304, 560]], rails: [] };
  const PADDLE_Y = 948;                     // 滑板（新操作）的中心線高度
  // 加速帶：只有往上走的球經過才加速（往下掉的也加速的話，離滑板太近、新手 0.32 秒反應不及）。數值在 tuning.js 的 boost
  const BOOST_SIZE = { w: 56, h: 14 };

  function buildTable(T, assists = {}, layout = null, control = "flipper") {
    const L = layout || DEFAULT_LAYOUT, top = L.top || 0;
    const segments = [];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a0 = Math.PI + (i / N) * Math.PI, a1 = Math.PI + ((i + 1) / N) * Math.PI;
      segments.push(seg(200 + 180 * Math.cos(a0), 200 + top + 180 * Math.sin(a0), 200 + 180 * Math.cos(a1), 200 + top + 180 * Math.sin(a1), "arc"));
    }
    const paddle = control === "paddle";
    segments.push(seg(380, 200 + top, 380, H));      // 右外牆
    segments.push(seg(340, 560, 340, H));            // 發射道內牆（道寬 40，放得下最大的球）
    segments.push(seg(340, 1022, 380, 1022, "plunger"));
    const gx = -35, gy = -40, gl = Math.hypot(gx, gy);
    segments.push(seg(340, 560, 380, 525, "gate", { oneSide: true, nx: gx / gl, ny: gy / gl }));
    const circles = [];
    if (paddle) {
      // 滑板模式（第 6 輪）：底部整片打開，滑板可以在整個台面寬度（左牆 x=20 到發射道內牆 x=340）移動；
      // 拿掉彈弓與漏斗（那是給兩支擋板用的），左牆直直到底
      segments.push(seg(20, 200 + top, 20, H));
    } else {
      // 擋板模式：外側邊界是一條連續的線：牆 → 導球片 → 彈弓外側 → 漏斗 → 擋板轉軸。
      // 不留任何外側通道，球不會掉進彈弓和牆之間的窄縫卡住（AC-S7）
      segments.push(seg(20, 200 + top, 20, 760));      // 左牆
      segments.push(seg(20, 760, 58, 790));            // 左導球片（到彈弓頂端）
      segments.push(seg(58, 865, 100, 944));           // 左漏斗（彈弓底部 → 左擋板）
      segments.push(seg(340, 760, 312, 790));          // 右導球片
      segments.push(seg(312, 865, 270, 944));          // 右漏斗
      for (const [A, B, C] of SLING_TRIS) {
        segments.push(seg(A[0], A[1], B[0], B[1]));
        segments.push(seg(B[0], B[1], C[0], C[1]));
        segments.push(seg(A[0], A[1], C[0], C[1], "sling", { flash: 0 }));
      }
      circles.push({ x: 58, y: 790, r: 4, kind: "post" }, { x: 312, y: 790, r: 4, kind: "post" });
    }
    for (const r of L.rails || []) segments.push(seg(r[0], r[1], r[2], r[3], r[4] || "rail", { flash: 0 }));
    // 彈跳柱放兩側：不擋住往上打的主線（放中間時球常被彈回下方，打不到磚；見 v3 規格的平衡紀錄）
    for (const [x, y] of L.bumpers || []) circles.push({ x, y, kind: "bumper", flash: 0 });
    if (L.fish) circles.push({ x: (L.fish.x0 + L.fish.x1) / 2, y: L.fish.y, r: 20, kind: "fish", vx: L.fish.speed, x0: L.fish.x0, x1: L.fish.x1, flash: 0 });
    const flippers = paddle ? [] : [
      { side: "L", px: 100, py: FLIP_Y, angle: 0, omega: 0, pressed: false },
      { side: "R", px: 270, py: FLIP_Y, angle: 0, omega: 0, pressed: false }
    ];
    for (const f of flippers) f.angle = flipperRest(T, f);
    // 加速帶（v3.7，第 3 區起）：56×14 的長條、箭頭朝上；首領關在 placeStage 拿掉
    const boosts = (L.boost || []).map(([x, y]) => ({ x, y, w: BOOST_SIZE.w, h: BOOST_SIZE.h, flash: 0 }));
    return { segments, circles, flippers, bricks: [], grid: new Map(), boss: null, balls: [], time: 0, boosts, capsules: [],
             dmg: 1, flipperBonus: 0, radiusBonus: 0, nextId: 1, top, layout: L, control,
             paddle: paddle ? { x: 180, y: PADDLE_Y, target: 180, vx: 0, kick: 0, size: L.paddle || "M", wide: 0 } : null };
  }

  /* ---------- 滑板（第 5 輪回饋：兩支擋板要兩手配合、反應跟不上；滑鼠更來不及點）----------
     一根手指（或滑鼠）左右移動就好，不用抓時機。打在滑板哪裡決定球往哪飛（打磚塊的玩法）：
     中間＝直直往上、越靠邊角度越斜；滑板移動中擊球會帶一點側向速度 */
  // 三種尺寸（第 6 輪）：S 小、M 中（一般關卡）、L 大（道具「寬板」作用中）。半寬見 tuning.js 的 paddle.half_widths
  function paddleSize(world) { const p = world.paddle; return p && p.wide > 0 ? "L" : (p && p.size) || "M"; }
  function paddleDims(T, world) { return { hw: T.paddle.half_widths[paddleSize(world)], r: T.paddle.radius }; }
  // 滑板可以移動到整個台面寬度：左牆 x=20 到發射道內牆 x=340
  function paddleRange(T, world) { const { hw } = paddleDims(T, world); return [20 + hw, 340 - hw]; }
  function movePaddle(T, world, dt) {
    const p = world.paddle; if (!p) return;
    if (p.wide > 0) p.wide = Math.max(0, p.wide - dt);
    const [lo, hi] = paddleRange(T, world), goal = clamp(p.target, lo, hi), step = T.paddle.max_speed * dt;
    const prev = p.x;
    p.x = Math.abs(goal - p.x) <= step ? goal : p.x + Math.sign(goal - p.x) * step;
    p.vx = (p.x - prev) / dt;
    if (p.kick > 0) p.kick = Math.max(0, p.kick - dt);
  }
  function collidePaddle(T, world, b, ev) {
    const p = world.paddle, { hw, r } = paddleDims(T, world);
    const cx = clamp(b.x, p.x - hw, p.x + hw), cy = p.y;
    const dx = b.x - cx, dy = b.y - cy, R = b.r + r, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
    b.x = cx + nx * R; b.y = cy + ny * R;
    const vn = (b.vx - p.vx) * nx + b.vy * ny;
    if (vn >= 0) return;
    if (ny < -0.35) {
      // 從上面打到：依打點決定角度，速度固定（彈射感來自穩定、可預期的出球）
      const off = clamp((b.x - p.x) / hw, -1, 1), ang = off * T.paddle.max_angle_deg * D2R;
      const sp = T.paddle.speed * (world.flipperPower || 1);
      b.vx = Math.sin(ang) * sp + p.vx * T.paddle.carry; b.vy = -Math.cos(ang) * sp;
      if (!world.dry) { p.kick = 0.12; ev.push({ type: "paddle", x: b.x, y: cy - r, off, b }); }
    } else {
      const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty, vnNew = -vn * T.ball.restitution_wall;
      b.vx = nx * vnNew + tx * vt + p.vx * 0.3; b.vy = ny * vnNew + ty * vt;
    }
  }
  /* 球會落在滑板高度的哪裡（給「落點提示」輔助與自動玩家用）：試跑到球往下穿過滑板高度為止 */
  function landingPoint(world, T, ball, maxSec = 2.5) {
    const shadow = { segments: world.segments, circles: world.circles.map(c => ({ ...c })), bricks: world.bricks.filter(k => k.alive), boss: null, balls: [],
                     flippers: [], paddle: null, time: 0, dry: true, dmg: 0, radiusBonus: world.radiusBonus, ballRadius: world.ballRadius, nextId: 0, magnet: world.magnet };
    const b = { ...ball, hits: {}, pierce: 0, dead: false, dryRun: true };
    const n = Math.max(1, Math.round(T.physics.substeps)), dt = 1 / 60 / n, steps = Math.round(maxSec * 60 * n), ev = [];
    const lineY = PADDLE_Y - T.paddle.radius - b.r;
    for (let i = 0; i < steps; i++) {
      const py = b.y;
      substepBall(shadow, T, b, dt, ev); ev.length = 0;
      if (b.vy > 0 && py < lineY && b.y >= lineY) return { x: b.x, t: (i + 1) * dt };
      if (b.y > DRAIN_Y) return null;
    }
    return null;
  }

  /* ---------- 磚塊 ---------- */
  function cellRect(r, c, top = 0) {
    return { x: GRID.x0 + c * GRID.cw + 1, y: GRID.y0 + top + r * GRID.ch, w: GRID.bw, h: GRID.bh };
  }
  // 格子四個角都要在圓弧內（留 12px），而且在發射道左邊
  function validRect(x, y, w, h, top = 0) {
    for (const [px, py] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      if (py < 200 + top && Math.hypot(px - 200, py - 200 - top) > 168) return false;
      if (px < 22 || px > 338) return false;
    }
    return true;
  }
  function placeStage(world, stage) {
    world.bricks = []; world.grid = new Map(); world.boss = null;
    if (stage.isBoss) world.boosts = [];      // 首領關沒有加速帶
    const top = world.top || 0;
    for (const cell of stage.cells) {
      if (cell.type === "boss") {
        const w = 110, h = 44, x = 200 - w / 2, y = GRID.y0 + top + cell.r * GRID.ch;
        world.boss = { id: "boss", type: "boss", x, y, w, h, hp: stage.boss.hp, maxHp: stage.boss.hp,
                       vx: stage.boss.speed, alive: true, flash: 0, regenT: stage.boss.regen, regen: stage.boss.regen };
        world.bricks.push(world.boss);
        continue;
      }
      const rc = cellRect(cell.r, cell.c, top);
      if (!validRect(rc.x, rc.y, rc.w, rc.h, top)) continue;
      const k = { id: world.nextId++, type: cell.type, r: cell.r, c: cell.c, ...rc, hp: cell.hp, maxHp: cell.hp, alive: true, flash: 0 };
      world.bricks.push(k); world.grid.set(cell.r * GRID.cols + cell.c, k);
    }
  }
  function addBrick(world, r, c, hp) {
    const key = r * GRID.cols + c, old = world.grid.get(key);
    if (old && old.alive) return null;
    const top = world.top || 0, rc = cellRect(r, c, top);
    if (!validRect(rc.x, rc.y, rc.w, rc.h, top)) return null;
    const k = { id: world.nextId++, type: "brick", r, c, ...rc, hp, maxHp: hp, alive: true, flash: 0.2, fresh: true };
    world.bricks.push(k); world.grid.set(key, k);
    return k;
  }
  function liveBricks(world) { return world.bricks.filter(k => k.alive); }
  function neighbors(world, k, diag) {
    if (k.type === "boss") return [];
    const out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      if (!diag && dr && dc) continue;
      const n = world.grid.get((k.r + dr) * GRID.cols + (k.c + dc));
      if (n && n.alive && k.c + dc >= 0 && k.c + dc < GRID.cols) out.push(n);
    }
    return out;
  }
  /* 對磚塊造成傷害；油漆桶碎掉會連鎖炸周圍 8 格 */
  function damageBrick(world, k, amount, ev, cause, depth = 0) {
    if (!k.alive) return false;
    k.hp -= amount; k.flash = 0.12;
    if (k.hp > 0) { ev.push({ type: "brick_hit", k, cause }); return false; }
    k.alive = false;
    ev.push({ type: "brick_break", k, cause, x: k.x + k.w / 2, y: k.y + k.h / 2 });
    if (k.type === "boss") { ev.push({ type: "boss_down", k }); return true; }
    if (k.type === "gift" && !world.dry) spawnCapsule(world, k.x + k.w / 2, k.y + k.h / 2, ev);
    if (k.type === "bucket" && depth < 6) for (const n of neighbors(world, k, true)) damageBrick(world, n, 1, ev, "bucket", depth + 1);
    if (cause === "ball" && world.splash > 0 && depth === 0) for (const n of neighbors(world, k, false)) damageBrick(world, n, world.splash, ev, "splash", depth + 1);
    return true;
  }

  /* ---------- 道具膠囊（v3.7.1）：打破道具磚掉下來，直直往下掉、不撞球也不撞磚；碰到滑板／擋板就接住 ---------- */
  const CAPSULE = { hw: 17, hh: 8, missY: 1000 };
  function spawnCapsule(world, x, y, ev, item) {
    const id = item || SR.ITEMS[Math.floor(Math.random() * SR.ITEMS.length)].id;
    const c = { id: world.nextId++, item: id, x, y };
    (world.capsules || (world.capsules = [])).push(c);
    ev.push({ type: "capsule_drop", c });
    return c;
  }
  function capsuleCaught(T, world, c) {
    if (world.paddle) {
      const p = world.paddle, { hw, r } = paddleDims(T, world);
      return Math.abs(c.x - p.x) <= hw + CAPSULE.hw && Math.abs(c.y - p.y) <= r + CAPSULE.hh;
    }
    const { L, rb } = flipperDims(T, world);
    for (const f of world.flippers) {
      const tx = f.px + Math.cos(f.angle) * L, ty = f.py + Math.sin(f.angle) * L;
      const dx = tx - f.px, dy = ty - f.py, t = clamp(((c.x - f.px) * dx + (c.y - f.py) * dy) / (dx * dx + dy * dy), 0, 1);
      if (Math.hypot(c.x - (f.px + dx * t), c.y - (f.py + dy * t)) <= rb + CAPSULE.hh) return true;
    }
    return false;
  }
  function moveCapsules(T, world, dt, ev) {
    if (!world.capsules || !world.capsules.length) return;
    const v = (T.items && T.items.capsule_speed) || 170;
    world.capsules = world.capsules.filter(c => {
      c.y += v * dt;
      if (capsuleCaught(T, world, c)) { ev.push({ type: "capsule_caught", item: c.item, x: c.x, y: c.y }); return false; }
      if (c.y > CAPSULE.missY) { ev.push({ type: "capsule_missed", item: c.item }); return false; }
      return true;
    });
  }

  /* ---------- 球與擋板 ---------- */
  // 球的半徑＝這一區的基本大小（world.ballRadius，v3.7 第 3 區起變小；沒設定＝12）＋「大罐」加成
  function ballRadius(T, world) { return (world.ballRadius ?? T.ball.radius) + (world.radiusBonus || 0); }
  function newBall(T, world, x = 360, y) {
    const r = ballRadius(T, world);
    return { id: world.nextId++, x, y: y ?? 1022 - r - 0.5, vx: 0, vy: 0, r, pierce: 0, split: false, dead: false, hits: {} };
  }
  function flipperRest(T, f) { return f.side === "L" ? T.flipper.rest_deg * D2R : Math.PI - T.flipper.rest_deg * D2R; }
  function flipperUp(T, f) { return f.side === "L" ? (T.flipper.rest_deg - T.flipper.stroke_deg) * D2R : Math.PI - (T.flipper.rest_deg - T.flipper.stroke_deg) * D2R; }
  function flipperDims(T, world) { return { L: T.flipper.length + (world.flipperBonus || 0), rb: T.flipper.radius_base, rt: T.flipper.radius_tip }; }
  function ballInLane(b) { return !!b && b.x > 340 && b.y > 900; }

  function updateFlipper(T, f, dt) {
    const target = f.pressed ? flipperUp(T, f) : flipperRest(T, f);
    const speed = (f.pressed ? T.flipper.up_speed_deg_s : T.flipper.down_speed_deg_s) * D2R;
    const prev = f.angle, diff = target - f.angle, step = speed * dt;
    f.angle = Math.abs(diff) <= step ? target : f.angle + Math.sign(diff) * step;
    f.omega = (f.angle - prev) / dt;
  }

  // 撞擊用 ball.friction；滾動接觸（法向速度很小）用 rolling_friction
  function friction(T, vn) {
    return -vn > (T.ball.impact_threshold ?? 0) ? T.ball.friction : (T.ball.rolling_friction ?? T.ball.friction);
  }

  function collideSegment(T, b, s, ev) {
    const abx = s.bx - s.ax, aby = s.by - s.ay, len2 = abx * abx + aby * aby;
    const t = clamp(((b.x - s.ax) * abx + (b.y - s.ay) * aby) / len2, 0, 1);
    const cx = s.ax + abx * t, cy = s.ay + aby * t;
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= b.r * b.r) return;
    if (s.oneSide && (b.x - s.ax) * s.nx + (b.y - s.ay) * s.ny < 0) return;
    const d = Math.sqrt(d2);
    let nx, ny;
    if (d < 1e-6) { const l = Math.sqrt(len2); nx = -aby / l; ny = abx / l; } else { nx = dx / d; ny = dy / d; }
    b.x = cx + nx * b.r; b.y = cy + ny * b.r;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
    let vnNew = -vn * T.ball.restitution_wall;
    if (s.kind === "sling" && -vn > 40) { vnNew = Math.max(vnNew, T.sling.kick_speed); ev.push({ type: "sling", x: cx, y: cy, s, b }); }
    else if (s.kind === "rubber" && -vn > 40) { vnNew = Math.max(vnNew, T.sling.kick_speed * 0.8); ev.push({ type: "sling", x: cx, y: cy, s, b }); }
    else if (-vn > 260) ev.push({ type: "wall", x: cx, y: cy, speed: -vn });
    const vtNew = vt * (1 - friction(T, vn));
    b.vx = nx * vnNew + tx * vtNew; b.vy = ny * vnNew + ty * vtNew;
  }

  function collideCircle(T, b, c, ev) {
    const r = c.kind === "bumper" ? T.bumper.radius : c.r;
    const dx = b.x - c.x, dy = b.y - c.y, R = b.r + r, d2 = dx * dx + dy * dy;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
    b.x = c.x + nx * R; b.y = c.y + ny * R;
    const vn = b.vx * nx + b.vy * ny;
    if (vn >= 0) return;
    let vnNew = -vn * T.ball.restitution_wall;
    // 阿鰭（會游的彈跳柱）跟彈跳柱一樣會把球彈開
    if (c.kind === "bumper" || c.kind === "fish") { vnNew = Math.max(vnNew, T.bumper.kick_speed); if (!b.dryRun) ev.push({ type: "bumper", x: c.x, y: c.y, c, b }); }
    const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;
    b.vx = nx * vnNew + tx * vt; b.vy = ny * vnNew + ty * vt;
  }

  function collideFlipper(T, world, b, f, ev) {
    const { L, rb, rt } = flipperDims(T, world), dx = Math.cos(f.angle), dy = Math.sin(f.angle);
    const t = clamp(((b.x - f.px) * dx + (b.y - f.py) * dy) / L, 0, 1);
    const qx = f.px + dx * L * t, qy = f.py + dy * L * t;
    const rr = rb + (rt - rb) * t;
    const ox = b.x - qx, oy = b.y - qy, R = b.r + rr, d2 = ox * ox + oy * oy;
    if (d2 >= R * R) return;
    const d = Math.sqrt(d2) || 1e-6, nx = ox / d, ny = oy / d;
    b.x = qx + nx * R; b.y = qy + ny * R;
    const lx = qx - f.px + nx * rr, ly = qy - f.py + ny * rr;
    const pw = T.flipper.power * (world.flipperPower || 1), vsx = -f.omega * ly * pw, vsy = f.omega * lx * pw;
    const rvx = b.vx - vsx, rvy = b.vy - vsy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) return;
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
    const vnNew = -vn * T.flipper.restitution, vtNew = vt * (1 - friction(T, vn));
    b.vx = vsx + nx * vnNew + tx * vtNew; b.vy = vsy + ny * vnNew + ty * vtNew;
    ev.push({ type: "flipper_touch", b });
    if (Math.abs(f.omega) > 1 && -vn > 200) ev.push({ type: "flipper", x: qx, y: qy, speed: Math.hypot(b.vx, b.vy), t, b });
  }

  /* 圓與矩形：可移動（首領）；撞擊速度太低不扣血（避免球停在磚上把磚「磨」掉） */
  function collideBrick(T, world, b, k, ev) {
    const cx = clamp(b.x, k.x, k.x + k.w), cy = clamp(b.y, k.y, k.y + k.h);
    const dx = b.x - cx, dy = b.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= b.r * b.r) return;
    let nx, ny, px, py;
    const d = Math.sqrt(d2);
    if (d < 1e-6) {
      const left = b.x - k.x, right = k.x + k.w - b.x, top = b.y - k.y, bottom = k.y + k.h - b.y, m = Math.min(left, right, top, bottom);
      if (m === left) { nx = -1; ny = 0; px = k.x - b.r; py = b.y; }
      else if (m === right) { nx = 1; ny = 0; px = k.x + k.w + b.r; py = b.y; }
      else if (m === top) { nx = 0; ny = -1; px = b.x; py = k.y - b.r; }
      else { nx = 0; ny = 1; px = b.x; py = k.y + k.h + b.r; }
    } else { nx = dx / d; ny = dy / d; px = cx + nx * b.r; py = cy + ny * b.r; }
    const kvx = k.vx || 0, rvx = b.vx - kvx, rvy = b.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) { b.x = px; b.y = py; return; }
    let broke = false;
    const last = b.hits[k.id] ?? -1;
    if (!world.dry && -vn > T.brick.min_hit_speed && world.time - last > 0.05) {
      b.hits[k.id] = world.time;
      ev.push({ type: "ball_brick", k, b, x: cx, y: cy });
      broke = damageBrick(world, k, world.dmg, ev, "ball");
      if (broke && b.pierce > 0 && k.type !== "boss") { b.pierce--; ev.push({ type: "pierce", b, x: cx, y: cy }); return; }
    }
    b.x = px; b.y = py;
    const tx = -ny, ty = nx, vt = rvx * tx + rvy * ty;
    // 最低反彈速度：停在磚上的球會一直小跳、慢慢把磚敲碎，不會卡住
    const vnNew = Math.max(-vn * T.brick.restitution, T.brick.min_bounce);
    b.vx = kvx + nx * vnNew + tx * vt; b.vy = ny * vnNew + ty * vt;
  }

  function collideBalls(a, b, ev) {
    const dx = b.x - a.x, dy = b.y - a.y, R = a.r + b.r, d2 = dx * dx + dy * dy;
    if (d2 >= R * R || d2 < 1e-9) return;
    const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, push = (R - d) / 2;
    a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn >= 0) return;
    const j = -vn * 0.95;
    a.vx -= nx * j; a.vy -= ny * j; b.vx += nx * j; b.vy += ny * j;
  }

  function substep(world, T, dt, ev) {
    world.time += dt;
    for (const f of world.flippers) updateFlipper(T, f, dt);
    movePaddle(T, world, dt);
    for (const c of world.circles) if (c.kind === "fish") {
      c.x += c.vx * dt;
      if (c.x < c.x0) { c.x = c.x0; c.vx = Math.abs(c.vx); }
      if (c.x > c.x1) { c.x = c.x1; c.vx = -Math.abs(c.vx); }
    }
    const boss = world.boss;
    if (boss && boss.alive) {
      boss.x += boss.vx * dt;
      if (boss.x < 26) { boss.x = 26; boss.vx = Math.abs(boss.vx); }
      if (boss.x + boss.w > 336) { boss.x = 336 - boss.w; boss.vx = -Math.abs(boss.vx); }
    }
    for (const b of world.balls) if (!b.dead) substepBall(world, T, b, dt, ev);
    moveCapsules(T, world, dt, ev);
    const live = world.balls.filter(b => !b.dead);
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) collideBalls(live[i], live[j], ev);
    for (const b of live) {
      const sp = Math.hypot(b.vx, b.vy), max = T.ball.max_speed;
      if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
      if (b.y > DRAIN_Y) { b.dead = true; ev.push({ type: "drain", b }); }
    }
  }
  /* 單顆球一個子步（遊戲與彈道預覽共用） */
  function substepBall(world, T, b, dt, ev) {
    const damp = 1 - T.ball.damping * dt;
    b.r = ballRadius(T, world);
    b.vy += T.ball.gravity * dt;
    b.vx *= damp; b.vy *= damp;
    // 收尾輔助（第 1、2 區）：只剩幾塊磚時，往上飛的球會被輕輕往磚的方向吸（只有水平方向）
    const m = world.magnet;
    if (m && b.vy < 0 && b.y < FLIP_Y - 100) { const dx = m.x - b.x; b.vx += Math.sign(dx) * Math.min(1, Math.abs(dx) / 60) * m.strength * dt; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    for (const s of world.segments) collideSegment(T, b, s, ev);
    for (const p of world.boosts || []) {
      if (b.vy >= 0 || b.x < p.x || b.x > p.x + p.w || b.y < p.y || b.y > p.y + p.h) continue;
      const B = T.boost;
      if (b.boostT != null && world.time - b.boostT < B.cooldown) continue;
      const sp = Math.hypot(b.vx, b.vy), ns = clamp(sp * B.mult, B.min, B.max);
      b.vx *= ns / sp; b.vy *= ns / sp; b.boostT = world.time; p.flash = 0.3;
      if (!b.dryRun) ev.push({ type: "boost", x: b.x, y: b.y, b });
    }
    for (const c of world.circles) collideCircle(T, b, c, ev);
    for (const k of world.bricks) if (k.alive) collideBrick(T, world, b, k, ev);
    for (const f of world.flippers) collideFlipper(T, world, b, f, ev);
    if (world.paddle) collidePaddle(T, world, b, ev);
    if (world.dry) { const sp = Math.hypot(b.vx, b.vy), max = T.ball.max_speed; if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; } }
  }

  function stepFrame(world, T, ev) {
    const n = Math.max(1, Math.round(T.physics.substeps)), dt = 1 / 60 / n;
    for (let i = 0; i < n; i++) substep(world, T, dt, ev);
    world.balls = world.balls.filter(b => !b.dead);
  }

  /* ---------- 彈道預覽（AC-S13）----------
     用「試跑」模式往前模擬一顆球：磚塊只反彈不扣血、擋板停在目前角度。回傳每隔幾個子步的位置 */
  function predictPath(world, T, ball, seconds, every = 4) {
    const shadow = {
      segments: world.segments, circles: world.circles, bricks: world.bricks.filter(k => k.alive), boss: null, balls: [],
      flippers: world.flippers.map(f => ({ ...f, pressed: f.pressed, omega: 0 })),
      paddle: world.paddle ? { ...world.paddle, vx: 0 } : null, flipperBonus: world.flipperBonus,
      time: 0, dry: true, dmg: 0, radiusBonus: world.radiusBonus, ballRadius: world.ballRadius, flipperPower: world.flipperPower, nextId: 0, magnet: world.magnet
    };
    for (const f of shadow.flippers) f.angle = f.pressed ? flipperUp(T, f) : flipperRest(T, f);
    const b = { ...ball, hits: {}, pierce: 0, dead: false, dryRun: true };
    shadow.balls = [b];
    const n = Math.max(1, Math.round(T.physics.substeps)), dt = 1 / 60 / n, steps = Math.round(seconds * 60 * n);
    const pts = [];
    const ev = [];
    for (let i = 0; i < steps; i++) {
      for (const f of shadow.flippers) f.omega = 0;
      substepBall(shadow, T, b, dt, ev);
      shadow.time += dt;
      if (b.y > DRAIN_Y) break;
      if (i % every === 0) pts.push({ x: b.x, y: b.y });
      ev.length = 0;
    }
    return pts;
  }

  /* ---------- 鏡頭規則（AC-S5）----------
     需要操作時（球在發射道、球在擋板上方 300px 內、或往下掉且在 y>540）→ 一定停在最底部，兩支擋板完整入鏡
     其他時候跟著最低的那顆球，並預判 0.15 秒後的位置 */
  function cameraTarget(world) {
    const balls = world.balls.filter(b => !b.dead);
    if (!balls.length) return CAM_MAX;
    if (balls.some(b => ballInLane(b) || b.y > FLIP_Y - 300 || (b.vy > 0 && b.y > 540))) return CAM_MAX;
    const lowest = balls.reduce((m, b) => (b.y > m.y ? b : m));
    // 矮台面（top 大）鏡頭幾乎不用動；第 1 區 top＝CAM_MAX，整個台面一次看完
    return clamp(lowest.y + lowest.vy * 0.15 - VIEW_H * 0.42, Math.min(world.top || 0, CAM_MAX), CAM_MAX);
  }
  function updateCamera(cam, world, dt) {
    const target = cameraTarget(world);
    const k = target > cam.y ? 14 : 5;           // 往下（回到擋板）要快，往上看要慢
    cam.y += (target - cam.y) * (1 - Math.exp(-k * dt));
    if (target === CAM_MAX && cam.y > CAM_MAX - 1) cam.y = CAM_MAX;
    return cam.y;
  }
  // 兩支擋板（含尖端）是否完整在畫面內
  function flippersVisible(camY, T) { return camY + VIEW_H >= FLIP_Y + T.flipper.length * 0.5 + 12; }

  return { W, H, VIEW_H, CAM_MAX, DRAIN_Y, FLIP_Y, PADDLE_Y, GRID, SLING_TRIS, DEFAULT_LAYOUT, clamp,
           buildTable, cellRect, validRect, placeStage, addBrick, liveBricks, neighbors, damageBrick,
           paddleSize, paddleDims, paddleRange, movePaddle, landingPoint,
           newBall, ballRadius, flipperRest, flipperUp, flipperDims, ballInLane, updateFlipper,
           substep, stepFrame, cameraTarget, updateCamera, flippersVisible, predictPath, spawnCapsule, CAPSULE };
})();
