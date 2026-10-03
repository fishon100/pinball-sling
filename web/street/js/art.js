/* ============================================================
   噴漆闖關 — 美術（全部程式繪製的占位圖，之後可換成 AI 生成＋美術精修的素材）
   風格：美式噴漆。粗黑描邊、高彩度色塊、2.5D 擠出、噴漆濺痕會留在牆上
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.Art = (function () {
  const INK = "#111114";
  const FONT_TAG = "'Permanent Marker', 'Bungee', Impact, sans-serif";
  const FONT_BLOCK = "'Bungee', Impact, sans-serif";
  const FONT_CJK = "'Noto Sans TC', 'Microsoft JhengHei', sans-serif";

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
    return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("");
  }
  function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
  function off(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  /* ---------- 灰牆背景（每區快取一張）---------- */
  const wallCache = new Map();
  function wall(district, W, H) {
    const key = district.id;
    if (wallCache.has(key)) return wallCache.get(key);
    const c = off(W, H), g = c.getContext("2d"), rnd = SR.rng(district.stages[0] * 101);
    g.fillStyle = "#3a3a40"; g.fillRect(0, 0, W, H);
    // 磚牆紋理
    for (let y = 0, row = 0; y < H; y += 22, row++) {
      for (let x = (row % 2) * -24; x < W; x += 48) {
        const v = 52 + Math.floor(rnd() * 14);
        g.fillStyle = `rgb(${v},${v},${v + 4})`;
        g.fillRect(x + 1, y + 1, 46, 20);
      }
    }
    // 噴霧顆粒
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.05})`; g.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
    // 被刷灰的舊塗鴉（若隱若現）
    g.save(); g.globalAlpha = 0.13; g.strokeStyle = "#9a9aa3"; g.lineWidth = 3; g.lineCap = "round";
    for (let i = 0; i < 14; i++) {
      const x = rnd() * W, y = rnd() * H;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 6; k++) g.quadraticCurveTo(x + (rnd() - 0.5) * 120, y + (rnd() - 0.5) * 60, x + (rnd() - 0.5) * 140, y + (rnd() - 0.5) * 80);
      g.stroke();
    }
    g.restore();
    wallCache.set(key, c);
    return c;
  }

  /* ---------- 噴漆濺痕（畫在會保留整關的圖層上）---------- */
  function splat(g, x, y, color, size, rnd = Math.random) {
    g.save();
    g.fillStyle = color;
    g.beginPath();
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, r = size * (0.65 + rnd() * 0.5);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      i ? g.lineTo(px, py) : g.moveTo(px, py);
    }
    g.closePath(); g.fill();
    // 濺點
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2, d = size * (1.1 + rnd() * 1.1);
      g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + rnd() * size * 0.18, 0, Math.PI * 2); g.fill();
    }
    // 往下流的漆
    for (let i = 0; i < 3; i++) {
      const dx = x + (rnd() - 0.5) * size * 1.2, len = size * (0.6 + rnd() * 1.8), w = 1.5 + rnd() * 2.5;
      g.fillRect(dx - w / 2, y, w, len);
      g.beginPath(); g.arc(dx, y + len, w * 0.8, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  /* ---------- 台面 ---------- */
  function strokeInk(g, w) { g.strokeStyle = INK; g.lineWidth = w; g.stroke(); }
  function table(g, world, pal, t) {
    g.lineCap = "round"; g.lineJoin = "round";
    // 發射道底色
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(340, 525, 40, 560);
    // 兩次描繪：先把所有黑邊畫完，再統一上色（逐段畫的話，下一段的黑邊會蓋掉上一段的顏色，變成虛線）
    const walls = world.segments.filter(s => s.kind !== "plunger" && s.kind !== "gate");
    const path = list => { g.beginPath(); for (const s of list) { g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); } };
    path(walls); strokeInk(g, 10);
    path(walls.filter(s => s.kind === "arc")); g.strokeStyle = pal.b; g.lineWidth = 4.5; g.stroke();
    path(walls.filter(s => s.kind === "wall")); g.strokeStyle = pal.c; g.lineWidth = 4.5; g.stroke();
    for (const s of walls.filter(s => s.kind === "sling")) { path([s]); g.strokeStyle = s.flash > 0 ? "#fff" : pal.a; g.lineWidth = 6; g.stroke(); }
    const gate = world.segments.find(s => s.kind === "gate");
    if (gate) { path([gate]); g.strokeStyle = "#ddd"; g.lineWidth = 2; g.stroke(); }
    // 彈弓本體
    for (const tri of SR.Physics.SLING_TRIS) {
      g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
      g.fillStyle = rgba(pal.b, 0.35); g.fill();
    }
    for (const c of world.circles) {
      if (c.kind === "post") { g.beginPath(); g.arc(c.x, c.y, c.r + 1, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); continue; }
      if (c.kind === "kicker") { kicker(g, c, pal, t); continue; }
      sprayCan(g, c.x, c.y, SR.T.bumper.radius, pal, c.flash > 0, t);
    }
  }
  // 救球柱：擋板中間的橡膠柱。次數有限時，每用掉一次多一道裂痕；用完剩一截斷柱
  function kicker(g, c, pal, t) {
    const broken = c.charges <= 0, guard = c.tag === "guard";
    if (broken) { g.beginPath(); g.arc(c.x, c.y + 3, c.r * 0.6, 0, Math.PI * 2); g.fillStyle = "#4a4a55"; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); return; }
    const color = guard ? "#9dff3a" : pal.a;
    if (c.flash > 0 || guard) { g.fillStyle = rgba(color, 0.35 + 0.15 * Math.sin(t * 8)); g.beginPath(); g.arc(c.x, c.y, c.r * 2.4, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(c.x, c.y, c.r + 1.5, 0, Math.PI * 2); g.fillStyle = c.flash > 0 ? "#fff" : color; g.fill(); strokeInk(g, 3);
    g.beginPath(); g.arc(c.x - 2, c.y - 2, 2, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.8)"; g.fill();
    if (c.maxCharges && c.maxCharges < 99) {
      const used = c.maxCharges - c.charges;
      g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath();
      for (let i = 0; i < used; i++) { const a = i * 2.1; g.moveTo(c.x, c.y); g.lineTo(c.x + Math.cos(a) * (c.r + 1), c.y + Math.sin(a) * (c.r + 1)); }
      g.stroke();
      g.fillStyle = "#fff"; g.font = "900 10px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.strokeStyle = INK; g.lineWidth = 3; g.strokeText("×" + c.charges, c.x, c.y + 18); g.fillText("×" + c.charges, c.x, c.y + 18);
    }
  }
  // 彈跳柱＝從上往下看的噴漆罐
  function sprayCan(g, x, y, r, pal, lit, t) {
    if (lit) { g.fillStyle = rgba(pal.glow, 0.45); g.beginPath(); g.arc(x, y, r * 1.9, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(x + 3, y + 4, r, 0, Math.PI * 2); g.fillStyle = "rgba(0,0,0,0.35)"; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = lit ? "#fff" : pal.c; g.fill(); strokeInk(g, 4);
    g.beginPath(); g.arc(x, y, r * 0.62, 0, Math.PI * 2); g.fillStyle = lit ? pal.c : shade(pal.c, -0.25); g.fill(); strokeInk(g, 3);
    g.beginPath(); g.arc(x, y, r * 0.24, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
    // 霓虹閃爍點
    const blink = 0.5 + 0.5 * Math.sin(t * 6 + x);
    g.fillStyle = rgba("#ffffff", 0.4 + blink * 0.5); g.beginPath(); g.arc(x - r * 0.35, y - r * 0.35, 2.5, 0, Math.PI * 2); g.fill();
  }

  /* ---------- 磚塊（2.5D 擠出）---------- */
  const HP_COLORS = ["#b8b8bf", "#9a9aa3", "#7d7d86", "#62626b", "#4b4b53"];
  function brick(g, k, pal, t) {
    if (!k.alive) return;
    if (k.type === "boss") return;
    const depth = 5;
    const base = k.type === "bucket" ? pal.a : k.type === "gift" ? "#ffd23f" : HP_COLORS[Math.min(4, k.hp - 1)];
    // 側面（立體感）
    g.fillStyle = shade(base, -0.35);
    g.beginPath(); g.moveTo(k.x + k.w, k.y); g.lineTo(k.x + k.w + depth, k.y + depth); g.lineTo(k.x + k.w + depth, k.y + k.h + depth);
    g.lineTo(k.x + depth, k.y + k.h + depth); g.lineTo(k.x, k.y + k.h); g.lineTo(k.x + k.w, k.y + k.h); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    // 正面
    g.fillStyle = k.flash > 0 ? "#ffffff" : base;
    g.fillRect(k.x, k.y, k.w, k.h);
    g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(k.x, k.y, k.w, k.h);
    // 高光
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(k.x + 3, k.y + 3, k.w - 6, 3);
    if (k.type === "gift") {
      // 道具磚：金色＋星星
      const cx = k.x + k.w / 2, cy = k.y + k.h / 2, r = 6 + Math.sin(t * 5) * 0.8;
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
    } else if (k.type === "bucket") {
      // 油漆桶圖示
      const cx = k.x + k.w / 2, cy = k.y + k.h / 2 + 1;
      g.fillStyle = pal.b; g.fillRect(cx - 6, cy - 5, 12, 10); g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(cx - 6, cy - 5, 12, 10);
      g.beginPath(); g.arc(cx, cy - 5, 6, Math.PI, 0); g.stroke();
      g.fillStyle = pal.c; g.fillRect(cx - 6, cy - 5, 12, 3);
    } else {
      // 血量點
      for (let i = 0; i < k.hp && i < 5; i++) { g.fillStyle = INK; g.fillRect(k.x + k.w - 6 - i * 5, k.y + k.h - 6, 3, 3); }
      // 裂痕
      if (k.hp < k.maxHp) {
        g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath();
        const cx = k.x + k.w * 0.4;
        g.moveTo(cx, k.y + 1); g.lineTo(cx + 4, k.y + 7); g.lineTo(cx - 2, k.y + 11); g.lineTo(cx + 5, k.y + k.h - 1);
        if (k.maxHp - k.hp > 1) { g.moveTo(cx + 4, k.y + 7); g.lineTo(cx + 13, k.y + 4); }
        g.stroke();
      }
    }
    if (k.fresh) { g.strokeStyle = rgba("#ffffff", 0.6); g.lineWidth = 1; g.strokeRect(k.x - 2, k.y - 2, k.w + 4, k.h + 4); }
  }

  /* ---------- 首領：灰先生 ---------- */
  function boss(g, k, t, hurt) {
    if (!k || !k.alive) return;
    const { x, y, w, h } = k, cx = x + w / 2;
    const bob = Math.sin(t * 3) * 2;
    g.save(); g.translate(0, bob);
    // 影子與身體
    g.fillStyle = "rgba(0,0,0,0.35)"; roundRect(g, x + 5, y + 7, w, h, 14); g.fill();
    g.fillStyle = k.flash > 0 ? "#ffffff" : "#8d8d96"; roundRect(g, x, y, w, h, 14); g.fill(); strokeInk(g, 4);
    // 噴漆罐皇冠
    for (let i = 0; i < 3; i++) {
      const px = cx - 26 + i * 26;
      g.fillStyle = "#6c6c75"; g.fillRect(px - 5, y - 14, 10, 14); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(px - 5, y - 14, 10, 14);
      g.fillStyle = INK; g.fillRect(px - 2, y - 18, 4, 4);
    }
    // 墨鏡
    g.fillStyle = INK; roundRect(g, cx - 38, y + 10, 32, 13, 5); g.fill(); roundRect(g, cx + 6, y + 10, 32, 13, 5); g.fill();
    g.fillRect(cx - 8, y + 14, 16, 3);
    g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(cx - 33, y + 12, 8, 3); g.fillRect(cx + 11, y + 12, 8, 3);
    // 嘴
    g.strokeStyle = INK; g.lineWidth = 3; g.beginPath();
    if (hurt) { g.arc(cx, y + h - 4, 9, Math.PI * 1.15, Math.PI * 1.85); }
    else { g.moveTo(cx - 14, y + h - 10); g.lineTo(cx + 14, y + h - 12); }
    g.stroke();
    g.restore();
  }

  /* ---------- 噴噴（主角精靈，參考：粉紅、粗黑邊、咧嘴大笑）---------- */
  function pinky(g, x, y, s, mood, t, grey) {
    const body = grey ? "#a7a7ae" : "#ff8fc8", bodyDark = grey ? "#7d7d86" : "#ff5fae";
    const bounce = mood === "happy" ? Math.abs(Math.sin(t * 7)) * 5 * s : Math.sin(t * 2.4) * 2 * s;
    g.save(); g.translate(x, y - bounce); g.scale(s, s);
    g.lineJoin = "round"; g.lineCap = "round";
    // 影子
    g.fillStyle = "rgba(0,0,0,0.3)"; g.beginPath(); g.ellipse(0, 46 + bounce / s, 30, 7, 0, 0, Math.PI * 2); g.fill();
    // 耳朵
    const ear = (dx, rot) => { g.save(); g.translate(dx, -30); g.rotate(rot + Math.sin(t * 3 + dx) * 0.08);
      g.beginPath(); g.ellipse(0, -14, 11, 20, 0, 0, Math.PI * 2); g.fillStyle = body; g.fill(); g.strokeStyle = INK; g.lineWidth = 5; g.stroke();
      g.beginPath(); g.ellipse(0, -14, 5, 12, 0, 0, Math.PI * 2); g.fillStyle = bodyDark; g.fill(); g.restore(); };
    ear(-16, -0.35); ear(18, 0.3);
    // 身體
    g.beginPath(); g.moveTo(-34, 10);
    g.bezierCurveTo(-40, -30, -18, -42, 0, -42); g.bezierCurveTo(22, -42, 42, -28, 36, 8);
    g.bezierCurveTo(32, 40, 18, 46, 0, 46); g.bezierCurveTo(-20, 46, -30, 40, -34, 10); g.closePath();
    g.fillStyle = body; g.fill(); g.strokeStyle = INK; g.lineWidth = 6; g.stroke();
    // 縫線
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(2, -40); g.lineTo(0, -16);
    for (let i = 0; i < 4; i++) { g.moveTo(-4, -36 + i * 6); g.lineTo(5, -35 + i * 6); } g.stroke();
    // 眼睛
    const eye = (ex) => {
      g.beginPath(); g.arc(ex, -12, 10, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
      const look = mood === "sad" ? 3 : 0;
      g.beginPath(); g.arc(ex + 1, -11 + look, 5.5, 0, Math.PI * 2); g.fillStyle = grey ? "#555" : "#e0213a"; g.fill();
      g.beginPath(); g.arc(ex + 3, -13 + look, 2, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill();
      if (mood === "sad") { g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(ex - 9, -25); g.lineTo(ex + 7, -21 + (ex > 0 ? -6 : 0)); g.stroke(); }
    };
    eye(-13); eye(14);
    // 嘴巴：開心＝大笑露牙、驚訝＝圓嘴、難過＝下彎
    g.lineWidth = 4; g.strokeStyle = INK;
    if (mood === "sad") { g.beginPath(); g.arc(0, 22, 12, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (mood === "wow") { g.beginPath(); g.ellipse(0, 14, 8, 10, 0, 0, Math.PI * 2); g.fillStyle = "#3a0d1c"; g.fill(); g.stroke(); }
    else {
      g.beginPath(); g.moveTo(-24, 6); g.quadraticCurveTo(0, 34, 24, 6); g.quadraticCurveTo(0, 14, -24, 6); g.closePath();
      g.fillStyle = "#fff"; g.fill(); g.stroke();
      g.lineWidth = 2; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * 8, 9); g.lineTo(i * 8, 20 - Math.abs(i) * 2); } g.moveTo(-20, 13); g.lineTo(20, 13); g.stroke();
    }
    // 手
    g.lineWidth = 5; g.fillStyle = body;
    const wave = mood === "happy" ? Math.sin(t * 9) * 0.5 : 0;
    g.save(); g.translate(30, 10); g.rotate(-0.6 + wave); g.beginPath(); g.ellipse(10, 0, 12, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
    g.beginPath(); g.ellipse(-36, 18, 9, 11, 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    g.restore();
  }
  function bossPortrait(g, x, y, s, t) {
    g.save(); g.translate(x, y); g.scale(s, s);
    boss(g, { x: -55, y: -22, w: 110, h: 44, alive: true, flash: 0 }, t, false);
    g.restore();
  }

  /* ---------- 球（發光＋影子＝立體感）---------- */
  function ball(g, b, pal, trail) {
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i], a = (i + 1) / (trail.length + 1);
      g.fillStyle = rgba(pal.glow, 0.25 * a); g.beginPath(); g.arc(p.x, p.y, b.r * (0.4 + 0.6 * a), 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "rgba(0,0,0,0.35)"; g.beginPath(); g.ellipse(b.x + 5, b.y + 7, b.r, b.r * 0.8, 0, 0, Math.PI * 2); g.fill();
    const glow = g.createRadialGradient(b.x, b.y, b.r * 0.5, b.x, b.y, b.r * 2.6);
    glow.addColorStop(0, rgba(pal.glow, 0.35)); glow.addColorStop(1, rgba(pal.glow, 0));
    g.fillStyle = glow; g.beginPath(); g.arc(b.x, b.y, b.r * 2.6, 0, Math.PI * 2); g.fill();
    const grad = g.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.4, 1, b.x, b.y, b.r);
    grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.5, "#cfd6db"); grad.addColorStop(1, "#5d6a73");
    g.fillStyle = grad; g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    if (b.pierce > 0) { g.strokeStyle = pal.a; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2); g.stroke(); }
  }

  /* ---------- 擋板（麥克筆風格）---------- */
  function flipper(g, f, dims, pal, highlight) {
    const { L, rb, rt } = dims, dx = Math.cos(f.angle), dy = Math.sin(f.angle), nx = -dy, ny = dx;
    const tx = f.px + dx * L, ty = f.py + dy * L;
    const path = () => {
      g.beginPath();
      g.moveTo(f.px + nx * rb, f.py + ny * rb); g.lineTo(tx + nx * rt, ty + ny * rt);
      g.arc(tx, ty, rt, f.angle + Math.PI / 2, f.angle - Math.PI / 2, true);
      g.lineTo(f.px - nx * rb, f.py - ny * rb);
      g.arc(f.px, f.py, rb, f.angle - Math.PI / 2, f.angle + Math.PI / 2, true);
      g.closePath();
    };
    g.save(); g.translate(3, 5); path(); g.fillStyle = "rgba(0,0,0,0.35)"; g.fill(); g.restore();
    if (highlight) { path(); g.strokeStyle = rgba(pal.c, 0.85); g.lineWidth = 12; g.stroke(); }    // 擋板時機提示：可以打了
    path(); g.fillStyle = pal.b; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    g.beginPath(); g.arc(f.px, f.py, 4, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
  }

  /* ---------- 噴漆字 ---------- */
  function tag(g, text, x, y, size, colors, opts = {}) {
    const font = opts.cjk ? `900 ${size}px ${FONT_CJK}` : `${size}px ${opts.marker ? FONT_TAG : FONT_BLOCK}`;
    g.save(); g.translate(x, y); g.rotate(opts.rot ?? -0.06);
    g.font = font; g.textAlign = opts.align || "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    // 滴漆
    if (opts.drips !== false) {
      const w = g.measureText(text).width, rnd = SR.rng(text.length * 97 + size);
      g.fillStyle = colors[0];
      for (let i = 0; i < 5; i++) { const dx = (rnd() - 0.5) * w * 0.9, len = size * (0.3 + rnd() * 0.6); g.fillRect(dx - 2, size * 0.2, 4, len); g.beginPath(); g.arc(dx, size * 0.2 + len, 3, 0, Math.PI * 2); g.fill(); }
    }
    g.fillStyle = INK; g.fillText(text, size * 0.08, size * 0.1);          // 陰影
    g.strokeStyle = INK; g.lineWidth = size * 0.22; g.strokeText(text, 0, 0);
    const grad = g.createLinearGradient(0, -size / 2, 0, size / 2);
    colors.forEach((c, i) => grad.addColorStop(colors.length === 1 ? 0 : i / (colors.length - 1), c));
    g.fillStyle = grad; g.fillText(text, 0, 0);
    g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.5; g.strokeText(text, -1, -1.5);
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  return { INK, FONT_TAG, FONT_BLOCK, FONT_CJK, shade, rgba, off, wall, splat, table, sprayCan, brick, boss, pinky, bossPortrait, ball, flipper, tag, roundRect };
})();
