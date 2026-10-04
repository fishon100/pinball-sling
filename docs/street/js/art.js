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
    // 第 5 輪「美術大膽一點」：街區色的霓虹打光＋巨大的半透明噴漆字，牆不再只是灰
    const p = district.colors;
    for (const [cx, cy, col] of [[0, H * 0.25, p.a], [W, H * 0.55, p.c], [W * 0.3, H * 0.9, p.b]]) {
      const lg = g.createRadialGradient(cx, cy, 10, cx, cy, W * 0.9);
      lg.addColorStop(0, rgba(col, 0.22)); lg.addColorStop(1, rgba(col, 0));
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    }
    g.save(); g.globalAlpha = 0.09; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    const words = ["SPRAY", "RUN", district.en, "COLOR"];
    for (let i = 0; i < 6; i++) {
      g.save(); g.translate(W * (0.2 + rnd() * 0.6), H * (0.08 + i * 0.16)); g.rotate((rnd() - 0.5) * 0.5);
      g.font = `${70 + rnd() * 40}px ${FONT_TAG}`;
      g.lineWidth = 10; g.strokeStyle = "#000"; g.strokeText(words[i % words.length], 0, 0);
      g.fillStyle = [p.a, p.b, p.c][i % 3]; g.fillText(words[i % words.length], 0, 0);
      g.restore();
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
    // 霓虹外光：先畫一層粗的半透明色，再畫黑邊、上色（大膽、像霓虹燈管）
    path(walls.filter(s => s.kind === "arc" || s.kind === "wall")); g.strokeStyle = rgba(pal.glow, 0.28); g.lineWidth = 20; g.stroke();
    path(walls); strokeInk(g, 12);
    path(walls.filter(s => s.kind === "arc")); g.strokeStyle = pal.b; g.lineWidth = 6; g.stroke();
    path(walls.filter(s => s.kind === "wall" || s.kind === "rail")); g.strokeStyle = pal.c; g.lineWidth = 6; g.stroke();
    for (const s of walls.filter(s => s.kind === "sling" || s.kind === "rubber")) {
      path([s]); g.strokeStyle = s.flash > 0 ? "#fff" : pal.a; g.lineWidth = s.kind === "rubber" ? 8 : 7; g.stroke();
      if (s.kind === "rubber") { g.strokeStyle = rgba("#ffffff", 0.6); g.lineWidth = 2; g.setLineDash([6, 8]); g.lineDashOffset = -t * 30; path([s]); g.stroke(); g.setLineDash([]); }
    }
    const gate = world.segments.find(s => s.kind === "gate");
    if (gate) { path([gate]); g.strokeStyle = "#ddd"; g.lineWidth = 2; g.stroke(); }
    // 彈弓本體（只有經典擋板模式才有彈弓；滑板模式底部是整片打開的）
    if (world.segments.some(s => s.kind === "sling")) for (const tri of SR.Physics.SLING_TRIS) {
      g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
      g.fillStyle = rgba(pal.b, 0.35); g.fill();
    }
    for (const c of world.circles) {
      if (c.kind === "post") { g.beginPath(); g.arc(c.x, c.y, c.r + 1, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); continue; }
      if (c.kind === "fish") { fish(g, c.x, c.y, c.r / 46, c.flash > 0 ? "wow" : "sleepy", t, c.vx < 0 ? -1 : 1); continue; }
      sprayCan(g, c.x, c.y, SR.T.bumper.radius, pal, c.flash > 0, t);
    }
  }
  // 彈跳柱＝從上往下看的噴漆罐
  function sprayCan(g, x, y, r, pal, lit, t) {
    // 平常就有一圈霓虹光（大膽一點），被打到時更亮
    g.fillStyle = rgba(pal.glow, lit ? 0.55 : 0.16 + 0.06 * Math.sin(t * 4 + x)); g.beginPath(); g.arc(x, y, r * (lit ? 2.1 : 1.55), 0, Math.PI * 2); g.fill();
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
    const depth = 6;
    const base = k.type === "bucket" ? pal.a : k.type === "gift" ? "#ffd23f" : HP_COLORS[Math.min(4, k.hp - 1)];
    // 貼紙風的彩色錯位影（大膽一點：灰磚也帶街區色）
    g.fillStyle = rgba(pal.a, 0.75); g.fillRect(k.x - 2, k.y + 3, k.w, k.h);
    // 側面（立體感）
    g.fillStyle = shade(base, -0.35);
    g.beginPath(); g.moveTo(k.x + k.w, k.y); g.lineTo(k.x + k.w + depth, k.y + depth); g.lineTo(k.x + k.w + depth, k.y + k.h + depth);
    g.lineTo(k.x + depth, k.y + k.h + depth); g.lineTo(k.x, k.y + k.h); g.lineTo(k.x + k.w, k.y + k.h); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    // 正面
    g.fillStyle = k.flash > 0 ? "#ffffff" : base;
    g.fillRect(k.x, k.y, k.w, k.h);
    g.strokeStyle = INK; g.lineWidth = 3.5; g.strokeRect(k.x, k.y, k.w, k.h);
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

  /* ---------- 發射桿（第 6 輪：參考真實彈珠台的黃色拉柄＋彈簧）----------
     c＝拉了多少（0～1）；托盤（球放的地方）、彈簧、黃色拉柄一起往下；hint＝閃「往下拉」提示；nudge＝拉太少的抖動 */
  const PULL_PX = 22;
  function plunger(g, c, pal, t, hint, nudge) {
    const x0 = 343, w = 34, cx = x0 + w / 2, pull = c * PULL_PX, shake = nudge ? Math.sin(t * 60) * 3 * nudge : 0;
    const plateY = 1022 + pull, housingY = 1036, knobY = 1046 + pull;
    g.save(); g.translate(shake, 0);
    // 機殼（固定）
    g.fillStyle = "#2a2a33"; g.fillRect(x0, housingY - 3, w, 6); g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(x0, housingY - 3, w, 6);
    // 拉桿
    g.fillStyle = "#b8b8bf"; g.fillRect(cx - 3, plateY + 6, 6, knobY - plateY - 6); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(cx - 3, plateY + 6, 6, knobY - plateY - 6);
    // 彈簧（機殼到拉柄之間，拉越多越長、越鬆）
    g.strokeStyle = "#e6e6ec"; g.lineWidth = 2.2; g.beginPath();
    const s0 = housingY + 3, s1 = knobY - 7, coils = 5;
    for (let i = 0; i <= coils * 2; i++) { const yy = s0 + (s1 - s0) * i / (coils * 2), xx = cx + (i % 2 ? 9 : -9); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
    // 托盤（球放的地方）
    g.fillStyle = pal.b; g.fillRect(x0, plateY, w, 7); g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(x0, plateY, w, 7);
    // 黃色拉柄（像照片裡的蘑菇頭）
    g.fillStyle = "#ffd23f"; g.beginPath(); g.ellipse(cx, knobY, 15, 7, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    g.fillStyle = "#e0a800"; g.beginPath(); g.ellipse(cx, knobY + 6, 8, 6, 0, 0, Math.PI); g.fill(); g.stroke();
    g.fillStyle = "rgba(255,255,255,0.6)"; g.beginPath(); g.ellipse(cx - 5, knobY - 2, 5, 2, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    // 提示：往下的箭頭一直往下滑
    if (hint) {
      const k = (t * 1.6) % 1;
      g.save(); g.globalAlpha = 1 - k; g.fillStyle = "#ffe14d"; g.strokeStyle = INK; g.lineWidth = 2;
      const ay = 958 + k * 22;
      g.beginPath(); g.moveTo(cx - 10, ay); g.lineTo(cx + 10, ay); g.lineTo(cx, ay + 12); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }

  /* ---------- 滑板（新操作：一根手指左右移動）---------- */
  function paddle(g, p, dims, pal, t, highlight) {
    const { hw, r } = dims, x = p.x, y = p.y, k = p.kick / 0.12;   // 擊球瞬間壓扁＋發光
    g.save(); g.translate(x, y); g.scale(1 + k * 0.08, 1 - k * 0.25);
    if (highlight || k > 0) { g.fillStyle = rgba(pal.glow, 0.35 + k * 0.4); roundRect(g, -hw - 10, -r - 10, hw * 2 + 20, r * 2 + 20, r + 10); g.fill(); }
    g.fillStyle = "rgba(0,0,0,0.4)"; roundRect(g, -hw + 4, -r + 6, hw * 2, r * 2, r); g.fill();
    // 輪子（從板子兩端露出來）
    for (const wx of [-hw + 12, hw - 12]) for (const wy of [-r - 2, r + 2]) { g.beginPath(); g.arc(wx, wy, 4, 0, Math.PI * 2); g.fillStyle = pal.c; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
    roundRect(g, -hw, -r, hw * 2, r * 2, r); g.fillStyle = pal.b; g.fill(); g.strokeStyle = INK; g.lineWidth = 4; g.stroke();
    // 板面噴漆圖案：粉紅閃電條紋
    g.save(); roundRect(g, -hw, -r, hw * 2, r * 2, r); g.clip();
    g.fillStyle = pal.a; g.beginPath(); g.moveTo(-hw * 0.6, -r); g.lineTo(-hw * 0.1, -r); g.lineTo(-hw * 0.3, 0); g.lineTo(hw * 0.25, 0); g.lineTo(hw * 0.05, r); g.lineTo(-hw * 0.6, r); g.lineTo(-hw * 0.35, 0); g.closePath(); g.fill();
    g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(-hw + 6, -r + 2, hw * 2 - 12, 3);
    g.restore();
    g.restore();
  }

  /* ---------- 阿鰭（第 5 輪企劃給的角色：藍綠色的魚、眼皮半垂、愛打哈欠、咖啡色粗描邊）---------- */
  const FISH_INK = "#4a2a17";
  function fish(g, x, y, s, mood, t, dir = 1) {
    const bob = Math.sin(t * 2.2 + x * 0.05) * 2;
    g.save(); g.translate(x, y + bob); g.scale(s * dir, s);
    g.lineJoin = "round"; g.lineCap = "round";
    const body = "#a8e6df", dark = "#3aa9a6", line = () => { g.strokeStyle = FISH_INK; g.lineWidth = 5; g.stroke(); };
    // 影子
    g.fillStyle = "rgba(0,0,0,0.28)"; g.beginPath(); g.ellipse(4, 40, 40, 8, 0, 0, Math.PI * 2); g.fill();
    // 尾巴（會擺）
    g.save(); g.translate(-40, 0); g.rotate(Math.sin(t * 5) * 0.18);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -30, -30, -28); g.quadraticCurveTo(-20, 0, -30, 28); g.quadraticCurveTo(-18, 30, 0, 0); g.closePath();
    g.fillStyle = dark; g.fill(); line(); g.restore();
    // 背鰭
    g.beginPath(); g.moveTo(-18, -28); g.quadraticCurveTo(-6, -48, 12, -32); g.closePath(); g.fillStyle = dark; g.fill(); line();
    // 身體
    g.beginPath(); g.ellipse(0, 0, 44, 34, 0, 0, Math.PI * 2); g.fillStyle = body; g.fill(); line();
    // 背上的鱗片
    g.save(); g.beginPath(); g.ellipse(0, 0, 42, 32, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = dark;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(-30 + c * 11 + r * 5, -22 + r * 11, 5, 0, Math.PI); g.fill(); }
    g.fillStyle = "rgba(255,255,255,0.55)"; g.beginPath(); g.ellipse(10, -22, 14, 4, -0.2, 0, Math.PI * 2); g.fill();
    g.restore();
    // 胸鰭
    g.beginPath(); g.moveTo(-6, 12); g.quadraticCurveTo(-20, 30, -4, 32); g.quadraticCurveTo(4, 24, -6, 12); g.fillStyle = dark; g.fill(); line();
    // 大嘴（參考圖最大的特徵）：佔臉的下半，打哈欠、兩顆小尖牙、粉紅舌頭
    const open = mood === "wow" ? 1.12 : 0.8 + 0.2 * Math.max(0, Math.sin(t * 1.3));
    g.save(); g.translate(22, 12);
    g.beginPath(); g.moveTo(-14, -12 * open); g.quadraticCurveTo(10, -20 * open, 22, -8 * open);
    g.quadraticCurveTo(26, 14 * open, 6, 22 * open); g.quadraticCurveTo(-16, 24 * open, -18, 2); g.closePath();
    g.fillStyle = "#24100b"; g.fill(); line();
    g.beginPath(); g.ellipse(2, 14 * open, 12, 6 * open, -0.1, 0, Math.PI * 2); g.fillStyle = "#e8848c"; g.fill();
    g.strokeStyle = "#b8545c"; g.lineWidth = 2; g.beginPath(); g.moveTo(2, 10 * open); g.lineTo(2, 17 * open); g.stroke();
    g.fillStyle = "#fff2c7"; g.strokeStyle = FISH_INK; g.lineWidth = 1.5;
    for (const fx of [-8, 10]) { g.beginPath(); g.moveTo(fx - 3, -12 * open + (fx > 0 ? -3 : 0)); g.lineTo(fx + 3, -12 * open + (fx > 0 ? -3 : 0)); g.lineTo(fx, -4 * open); g.closePath(); g.fill(); g.stroke(); }
    g.restore();
    // 眼睛（在嘴的上方）：平常上眼皮垂到一半（愛睏、厭世）；被打到時睜大
    const ex = 10, ey = -16, er = 13;
    g.beginPath(); g.ellipse(ex, ey, er, er * 0.9, 0, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); line();
    if (mood === "wow") {
      g.beginPath(); g.arc(ex + 2, ey, 5, 0, Math.PI * 2); g.fillStyle = FISH_INK; g.fill();
    } else {
      g.beginPath(); g.arc(ex + 1, ey + 5, 4, 0, Math.PI * 2); g.fillStyle = FISH_INK; g.fill();
      g.save(); g.beginPath(); g.ellipse(ex, ey, er, er * 0.9, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = "#4fb8b2"; g.fillRect(ex - er - 2, ey - er - 2, er * 2 + 4, er + 3);
      g.fillStyle = "rgba(255,255,255,0.45)"; g.fillRect(ex - er * 0.6, ey - er * 0.7, er * 0.7, 2.5);
      g.restore();
      g.strokeStyle = FISH_INK; g.lineWidth = 4.5; g.beginPath(); g.moveTo(ex - er, ey + 1); g.quadraticCurveTo(ex, ey + 4, ex + er, ey + 1); g.stroke();
    }
    g.restore();
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

  return { INK, FONT_TAG, FONT_BLOCK, FONT_CJK, shade, rgba, off, wall, splat, table, sprayCan, brick, boss, pinky, bossPortrait, ball, flipper, paddle, plunger, PULL_PX, fish, tag, roundRect };
})();
