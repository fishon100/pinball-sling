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

  /* ---------- 霓虹字、塗鴉小圖（背景用）---------- */
  function neonText(g, text, x, y, size, color, rot = 0, alpha = 0.85) {
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha;
    g.font = `${size}px ${FONT_TAG}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.shadowColor = color; g.shadowBlur = size * 0.45;
    g.strokeStyle = color; g.lineWidth = Math.max(2, size * 0.07); g.strokeText(text, 0, 0);
    g.shadowBlur = 0; g.strokeStyle = "rgba(255,255,255,0.85)"; g.lineWidth = Math.max(1, size * 0.025); g.strokeText(text, 0, 0);
    g.restore();
  }
  // 金色手刷大字（設計圖中央的 HIT!）：粗黑描邊＋金色漸層＋滴漆
  function goldTag(g, text, x, y, size, rot = -0.05, alpha = 0.9) {
    g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = alpha;
    g.font = `${size}px ${FONT_TAG}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    const w = g.measureText(text).width, rnd = SR.rng(text.length * 31 + size);
    g.fillStyle = "#e0a800";
    for (let i = 0; i < 5; i++) { const dx = (rnd() - 0.5) * w * 0.8, len = size * (0.2 + rnd() * 0.4); g.fillRect(dx - 2, size * 0.25, 4, len); }
    g.strokeStyle = "#1a0b10"; g.lineWidth = size * 0.12; g.strokeText(text, 0, 0);
    const gr = g.createLinearGradient(0, -size / 2, 0, size / 2); gr.addColorStop(0, "#fff2a8"); gr.addColorStop(0.45, "#ffcf3f"); gr.addColorStop(1, "#d98a00");
    g.shadowColor = "#ffb21f"; g.shadowBlur = size * 0.25; g.fillStyle = gr; g.fillText(text, 0, 0);
    g.restore();
  }
  function neonDoodle(g, kind, x, y, s, color, alpha = 0.7) {
    g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = alpha;
    g.strokeStyle = color; g.lineWidth = 2.2 / s; g.lineJoin = "round"; g.lineCap = "round"; g.shadowColor = color; g.shadowBlur = 10;
    g.beginPath();
    if (kind === "crown") { g.moveTo(-12, 6); g.lineTo(-12, -4); g.lineTo(-6, 2); g.lineTo(0, -8); g.lineTo(6, 2); g.lineTo(12, -4); g.lineTo(12, 6); g.closePath(); }
    else if (kind === "star") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 5 : 12; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); }
    else if (kind === "heart") { g.moveTo(0, 10); g.bezierCurveTo(-16, -2, -8, -14, 0, -5); g.bezierCurveTo(8, -14, 16, -2, 0, 10); }
    else if (kind === "bunny") { g.ellipse(0, 4, 11, 9, 0, 0, Math.PI * 2); g.moveTo(-5, -4); g.ellipse(-5, -12, 3, 8, -0.2, 0, Math.PI * 2); g.moveTo(8, -4); g.ellipse(5, -12, 3, 8, 0.2, 0, Math.PI * 2);
      g.moveTo(-6, 1); g.lineTo(-2, 5); g.moveTo(-2, 1); g.lineTo(-6, 5); g.moveTo(2, 1); g.lineTo(6, 5); g.moveTo(6, 1); g.lineTo(2, 5); }
    else if (kind === "arrow") { g.moveTo(-10, 0); g.lineTo(10, 0); g.moveTo(4, -6); g.lineTo(10, 0); g.lineTo(4, 6); }
    g.stroke(); g.restore();
  }

  /* ---------- 背景：霓虹夜店舞台（企劃 2026-10-05 的新彈珠台美術設計；每區＋台面高度快取一張）----------
     暗紫底＋六角暗紋、台面頂端的聚光燈與人群剪影、霓虹字（RUSH!／BOOM!／HIT!）、皇冠星星愛心兔子塗鴉 */
  const wallCache = new Map();
  function wall(district, W, H, top = 0) {
    const key = district.id + ":" + top;
    if (wallCache.has(key)) return wallCache.get(key);
    const c = off(W, H), g = c.getContext("2d"), rnd = SR.rng(district.stages[0] * 101 + top), p = district.colors;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1c0b38"); bg.addColorStop(0.6, "#160a2c"); bg.addColorStop(1, "#0d0719");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // 六角暗紋
    g.strokeStyle = "rgba(160,120,255,0.07)"; g.lineWidth = 1;
    const hs = 22;
    for (let row = 0, y = 0; y < H + hs; row++, y += hs * 1.5) for (let x = (row % 2) * hs * 0.866; x < W + hs; x += hs * 1.732) {
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(a) * hs, y + Math.sin(a) * hs); } g.closePath(); g.stroke();
    }
    // 街區色打光
    for (const [cx, cy, col] of [[0, top + (H - top) * 0.3, p.a], [W, top + (H - top) * 0.6, p.c], [W * 0.5, top + 60, "#b25cff"]]) {
      const lg = g.createRadialGradient(cx, cy, 10, cx, cy, W * 0.8);
      lg.addColorStop(0, rgba(col, 0.25)); lg.addColorStop(1, rgba(col, 0));
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
    }
    // 聚光燈（從台面頂端往下打）
    const y0 = top + 20;
    for (let i = 0; i < 6; i++) {
      const x = W * (0.12 + 0.15 * i), col = [p.a, p.c, "#b25cff"][i % 3], spread = 90 + rnd() * 60, len = 260 + rnd() * 120;
      const lg = g.createLinearGradient(0, y0, 0, y0 + len); lg.addColorStop(0, rgba(col, 0.32)); lg.addColorStop(1, rgba(col, 0));
      g.fillStyle = lg; g.beginPath(); g.moveTo(x - 5, y0); g.lineTo(x + 5, y0); g.lineTo(x + spread * (rnd() - 0.2), y0 + len); g.lineTo(x - spread * (rnd() + 0.2), y0 + len); g.closePath(); g.fill();
    }
    // 人群剪影（舞台下的觀眾）
    g.fillStyle = "rgba(8,4,20,0.75)";
    for (let x = 0; x < W; x += 13 + rnd() * 8) {
      const hy = y0 + 70 + rnd() * 14;
      g.beginPath(); g.arc(x, hy, 6 + rnd() * 2, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x, hy + 20, 11, 14, 0, 0, Math.PI * 2); g.fill();
      if (rnd() < 0.3) { g.fillRect(x + 3, hy - 22, 3, 18); }   // 舉手
    }
    // 霓虹字與塗鴉（放在磚塊區以外、彈跳柱附近較空的地方）
    const fh = H - top;
    neonText(g, "RUSH!", W * 0.5, top + 52, 30, p.a, -0.05, 0.75);
    neonText(g, "BOOM!", W * 0.42, top + fh * 0.5, 30, "#ffcf3f", -0.08, 0.55);
    neonText(g, "RUSH!", W * 0.5, top + fh * 0.5 + 28, 16, "#ffcf3f", -0.08, 0.5);
    goldTag(g, "HIT!", W * 0.44, top + fh * 0.7, 78, -0.06, 0.55);
    neonDoodle(g, "crown", W * 0.42, top + fh * 0.5 - 30, 1, "#ffcf3f", 0.6);
    neonDoodle(g, "crown", W * 0.44, top + fh * 0.7 - 62, 1.3, "#ffcf3f", 0.55);
    neonDoodle(g, "star", 48, top + fh * 0.62, 1, "#b25cff", 0.6);
    neonDoodle(g, "heart", 300, top + fh * 0.78, 1.1, p.a, 0.55);
    neonDoodle(g, "bunny", 52, top + fh * 0.82, 1.1, p.a, 0.55);
    neonDoodle(g, "arrow", 300, top + fh * 0.62, 1, "#9dff3a", 0.55);
    neonDoodle(g, "star", 300, top + fh * 0.4, 0.8, p.c, 0.5);
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
    // 發射道＝玻璃管（設計圖右側的透明管）
    g.fillStyle = "rgba(150,180,255,0.08)"; g.fillRect(341, 525, 38, 560);
    g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(347, 570); g.lineTo(347, 1018); g.moveTo(373, 540); g.lineTo(373, 1018); g.stroke();
    // 滑板模式：鉻金屬滑軌橫跨整個台面（設計圖 SHOOT! 底下那條）
    if (world.paddle) {
      const ry = world.paddle.y + 13, mg = g.createLinearGradient(0, ry - 4, 0, ry + 4);
      mg.addColorStop(0, "#e8ecf4"); mg.addColorStop(0.5, "#8a92a6"); mg.addColorStop(1, "#3b4052");
      g.fillStyle = mg; g.fillRect(20, ry - 4, 320, 8); g.strokeStyle = "#120a24"; g.lineWidth = 2; g.strokeRect(20, ry - 4, 320, 8);
      for (const bx of [24, 336]) {   // 兩端的黃黑警示條＋螺絲
        g.save(); g.beginPath(); g.rect(bx - 4, ry - 9, 8, 18); g.clip();
        g.fillStyle = "#ffcf3f"; g.fillRect(bx - 4, ry - 9, 8, 18); g.strokeStyle = "#111"; g.lineWidth = 3;
        for (let k = -20; k < 20; k += 6) { g.beginPath(); g.moveTo(bx - 6, ry + k); g.lineTo(bx + 6, ry + k + 8); g.stroke(); }
        g.restore(); g.strokeStyle = "#120a24"; g.lineWidth = 2; g.strokeRect(bx - 4, ry - 9, 8, 18);
      }
    }
    // 軌道：先畫深色金屬底，再畫霓虹燈管（頂部圓弧＝金＋粉雙色，側牆＝街區色）
    const walls = world.segments.filter(s => s.kind !== "plunger" && s.kind !== "gate");
    const path = list => { g.beginPath(); for (const s of list) { g.moveTo(s.ax, s.ay); g.lineTo(s.bx, s.by); } };
    path(walls); g.strokeStyle = "#0e0820"; g.lineWidth = 15; g.stroke();
    path(walls); g.strokeStyle = "#3a3152"; g.lineWidth = 10; g.stroke();
    const tube = (list, color, w) => { path(list); g.save(); g.shadowColor = color; g.shadowBlur = 12; g.strokeStyle = color; g.lineWidth = w; g.stroke(); g.restore(); };
    const arc = walls.filter(s => s.kind === "arc");
    tube(arc, "#ffb21f", 6); path(arc); g.strokeStyle = pal.a; g.lineWidth = 2; g.stroke();
    tube(walls.filter(s => s.kind === "wall" || s.kind === "rail"), pal.c, 4);
    path(walls.filter(s => s.kind === "wall" || s.kind === "rail")); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 1.2; g.stroke();
    for (const s of walls.filter(s => s.kind === "sling" || s.kind === "rubber")) {
      tube([s], s.flash > 0 ? "#ffffff" : pal.a, s.kind === "rubber" ? 7 : 6);
      if (s.kind === "rubber") { g.strokeStyle = rgba("#ffffff", 0.6); g.lineWidth = 2; g.setLineDash([6, 8]); g.lineDashOffset = -t * 30; path([s]); g.stroke(); g.setLineDash([]); }
    }
    const gate = world.segments.find(s => s.kind === "gate");
    if (gate) { path([gate]); g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2; g.stroke(); }
    // 彈弓本體（只有經典擋板模式才有）：粉紅霓虹三角＋星星
    if (world.segments.some(s => s.kind === "sling")) for (const tri of SR.Physics.SLING_TRIS) {
      g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
      g.fillStyle = rgba(pal.a, 0.32); g.fill();
      const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      neonDoodle(g, "star", cx, cy, 0.5, "#ffffff", 0.8);
    }
    for (const p of world.boosts || []) boostPad(g, p, t);
    for (const c of world.circles) {
      if (c.kind === "post") { g.beginPath(); g.arc(c.x, c.y, c.r + 1, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); continue; }
      if (c.kind === "fish") { fish(g, c.x, c.y, c.r / 46, c.flash > 0 ? "wow" : "sleepy", t, c.vx < 0 ? -1 : 1); continue; }
      sprayCan(g, c.x, c.y, SR.T.bumper.radius, pal, c.flash > 0, t);
    }
  }
  // 加速帶（v3.7）：深色底板＋三個往上的萊姆綠霓虹箭頭，箭頭會由下往上流動；被踩到時整條亮起
  function boostPad(g, p, t) {
    const lit = (p.flash || 0) > 0;
    if (lit) p.flash = Math.max(0, p.flash - 1 / 60);
    g.save();
    g.fillStyle = "rgba(10,6,24,0.85)"; g.strokeStyle = lit ? "#ffffff" : "#9dff3a"; g.lineWidth = 2;
    g.shadowColor = "#9dff3a"; g.shadowBlur = lit ? 22 : 14;
    g.beginPath(); g.roundRect ? g.roundRect(p.x, p.y, p.w, p.h, 4) : g.rect(p.x, p.y, p.w, p.h); g.fill(); g.stroke();
    g.lineWidth = 2.5; g.lineCap = "round"; g.lineJoin = "round";
    for (let i = 0; i < 3; i++) {
      const cx = p.x + p.w * (i + 0.5) / 3, phase = (t * 4.4 + i * 0.25) % 1, a = lit ? 1 : 0.55 + 0.45 * Math.sin(phase * Math.PI);   // 箭頭流動 2 倍快、更亮（提案 boost-feel）
      g.strokeStyle = `rgba(157,255,58,${a.toFixed(2)})`;
      g.beginPath(); g.moveTo(cx - 6, p.y + p.h - 3); g.lineTo(cx, p.y + 3); g.lineTo(cx + 6, p.y + p.h - 3); g.stroke();
    }
    g.restore();
  }
  // 彈跳柱（設計圖：深色金屬底座＋青色霓虹環＋深色中心）
  function sprayCan(g, x, y, r, pal, lit, t) {
    const ring = lit ? "#e6fdff" : "#3ee0ff";
    const halo = g.createRadialGradient(x, y, r * 0.6, x, y, r * (lit ? 2.2 : 1.7));
    halo.addColorStop(0, rgba("#3ee0ff", lit ? 0.6 : 0.25 + 0.07 * Math.sin(t * 4 + x))); halo.addColorStop(1, rgba("#3ee0ff", 0));
    g.fillStyle = halo; g.beginPath(); g.arc(x, y, r * (lit ? 2.2 : 1.7), 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x + 2, y + 4, r + 3, 0, Math.PI * 2); g.fillStyle = "rgba(0,0,0,0.5)"; g.fill();
    const base = g.createLinearGradient(x, y - r, x, y + r); base.addColorStop(0, "#3d2f63"); base.addColorStop(1, "#150d2a");
    g.beginPath(); g.arc(x, y, r + 3, 0, Math.PI * 2); g.fillStyle = base; g.fill(); g.strokeStyle = "#0a0614"; g.lineWidth = 2.5; g.stroke();
    g.save(); g.shadowColor = "#3ee0ff"; g.shadowBlur = lit ? 18 : 10;
    g.beginPath(); g.arc(x, y, r * 0.66, 0, Math.PI * 2); g.strokeStyle = ring; g.lineWidth = r * 0.34; g.stroke(); g.restore();
    g.beginPath(); g.arc(x, y, r * 0.66, 0, Math.PI * 2); g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 1.5; g.stroke();
    g.beginPath(); g.arc(x, y, r * 0.42, 0, Math.PI * 2); g.fillStyle = "#0d0819"; g.fill();
    g.beginPath(); g.arc(x, y, r * 0.16, 0, Math.PI * 2); g.fillStyle = lit ? "#3ee0ff" : "#1f6f86"; g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.ellipse(x - r * 0.45, y - r * 0.55, r * 0.22, r * 0.1, -0.6, 0, Math.PI * 2); g.fill();
  }

  /* ---------- 磚塊（設計圖：銀色金屬板、四角鉚釘、斜角高光；血越多顏色越深）---------- */
  const HP_COLORS = ["#eef1f7", "#c9ced9", "#a3aab8", "#808897", "#5f6676"];
  function brick(g, k, pal, t) {
    if (!k.alive) return;
    if (k.type === "boss") return;
    const base = k.type === "bucket" ? pal.a : k.type === "gift" ? "#ffd23f" : HP_COLORS[Math.min(4, k.hp - 1)];
    // 影子
    g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(k.x + 2, k.y + 4, k.w, k.h);
    // 金屬面（上亮下暗）
    const mg = g.createLinearGradient(0, k.y, 0, k.y + k.h);
    mg.addColorStop(0, k.flash > 0 ? "#ffffff" : shade(base, 0.08)); mg.addColorStop(1, k.flash > 0 ? "#ffffff" : shade(base, -0.2));
    g.fillStyle = mg; g.fillRect(k.x, k.y, k.w, k.h);
    g.strokeStyle = "#140c26"; g.lineWidth = 2; g.strokeRect(k.x, k.y, k.w, k.h);
    // 斜角：左上亮邊、右下暗邊
    g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(k.x + 2, k.y + k.h - 2); g.lineTo(k.x + 2, k.y + 2); g.lineTo(k.x + k.w - 2, k.y + 2); g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.beginPath(); g.moveTo(k.x + k.w - 2, k.y + 3); g.lineTo(k.x + k.w - 2, k.y + k.h - 2); g.lineTo(k.x + 3, k.y + k.h - 2); g.stroke();
    // 四角鉚釘
    for (const [rx, ry] of [[k.x + 4, k.y + 4], [k.x + k.w - 4, k.y + 4], [k.x + 4, k.y + k.h - 4], [k.x + k.w - 4, k.y + k.h - 4]]) {
      g.beginPath(); g.arc(rx, ry, 1.6, 0, Math.PI * 2); g.fillStyle = shade(base, -0.4); g.fill();
      g.beginPath(); g.arc(rx - 0.5, ry - 0.5, 0.6, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.8)"; g.fill();
    }
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
      // 裂痕（血量由金屬板的深淺表示）
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
    // 衝刺（踩到加速帶 0.5 秒內）：拖尾變萊姆綠、更亮，球兩側畫速度線
    const dash = b.dash > 0, trailColor = dash ? "#9dff3a" : pal.glow;
    for (let i = 0; i < trail.length; i++) {
      const p = trail[i], a = (i + 1) / (trail.length + 1);
      g.fillStyle = rgba(trailColor, (dash ? 0.45 : 0.25) * a); g.beginPath(); g.arc(p.x, p.y, b.r * (0.4 + 0.6 * a), 0, Math.PI * 2); g.fill();
    }
    if (dash) {
      const sp = Math.hypot(b.vx, b.vy) || 1, dx = b.vx / sp, dy = b.vy / sp, nx = -dy, ny = dx, k = Math.min(1, b.dash / 0.5);
      g.save(); g.strokeStyle = rgba("#9dff3a", 0.85 * k); g.lineWidth = 2.5; g.lineCap = "round";
      for (const side of [-1, 1]) for (let j = 0; j < 2; j++) {
        const off = b.r + 6 + j * 7, back = 10 + j * 8, len = 22 + 14 * k;
        g.beginPath(); g.moveTo(b.x + nx * off * side - dx * back, b.y + ny * off * side - dy * back);
        g.lineTo(b.x + nx * off * side - dx * (back + len), b.y + ny * off * side - dy * (back + len)); g.stroke();
      }
      g.restore();
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

  /* ---------- 滑板（設計圖：粉紅膠囊＋兩端黃色箭頭＋中間 SHOOT!）---------- */
  function paddle(g, p, dims, pal, t, highlight) {
    const { hw } = dims, r = dims.r + 3, x = p.x, y = p.y, k = p.kick / 0.12;   // 畫得比碰撞範圍厚一點；擊球瞬間壓扁＋發光
    g.save(); g.translate(x, y); g.scale(1 + k * 0.08, 1 - k * 0.22);
    if (highlight || k > 0) { g.save(); g.shadowColor = "#ff3ea5"; g.shadowBlur = 20 + k * 20; g.fillStyle = rgba("#ff3ea5", 0.35 + k * 0.4); roundRect(g, -hw - 6, -r - 6, hw * 2 + 12, r * 2 + 12, r + 6); g.fill(); g.restore(); }
    g.fillStyle = "rgba(0,0,0,0.5)"; roundRect(g, -hw + 3, -r + 5, hw * 2, r * 2, r); g.fill();
    // 外框（深色）＋粉紅本體
    roundRect(g, -hw, -r, hw * 2, r * 2, r); g.fillStyle = "#2a0a24"; g.fill();
    const pg = g.createLinearGradient(0, -r, 0, r); pg.addColorStop(0, "#ff8ccc"); pg.addColorStop(0.5, "#ff3ea5"); pg.addColorStop(1, "#c4157a");
    roundRect(g, -hw + 3, -r + 3, hw * 2 - 6, r * 2 - 6, r - 3); g.fillStyle = pg; g.fill();
    g.fillStyle = "rgba(255,255,255,0.5)"; roundRect(g, -hw + 8, -r + 4, hw * 2 - 16, 3, 1.5); g.fill();
    // 兩端黃色箭頭（往外指）
    g.fillStyle = "#ffd23f"; g.strokeStyle = "#2a0a24"; g.lineWidth = 1.2;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      const ax = s * (hw - 9 - i * 6);
      g.beginPath(); g.moveTo(ax - s * 3, -r + 4); g.lineTo(ax + s * 2, 0); g.lineTo(ax - s * 3, r - 4); g.lineTo(ax - s * 6, r - 4); g.lineTo(ax - s * 1, 0); g.lineTo(ax - s * 6, -r + 4); g.closePath(); g.fill(); g.stroke();
    }
    // 中間 SHOOT!
    const fs = Math.min(11, (hw * 2 - 34) / 4.6);
    g.font = `${fs}px ${FONT_BLOCK}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
    g.strokeStyle = "#2a0a24"; g.lineWidth = 3; g.strokeText("SHOOT!", 0, 1); g.fillStyle = "#ffe14d"; g.fillText("SHOOT!", 0, 1);
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

  // 道具膠囊（v3.7.1）：金色圓角膠囊＋道具圖示＋一閃一閃的光暈，往下掉時看得清楚
  function capsule(g, c, item, t) {
    const w = 34, h = 16, x = c.x - w / 2, y = c.y - h / 2, pulse = 0.6 + 0.4 * Math.sin(t * 10);
    g.save();
    g.shadowColor = "#ffd23f"; g.shadowBlur = 10 + 8 * pulse;
    g.fillStyle = "#ffd23f"; g.strokeStyle = INK; g.lineWidth = 2.5;
    roundRect(g, x, y, w, h, h / 2); g.fill(); g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = "rgba(255,255,255,0.55)"; roundRect(g, x + 4, y + 3, w - 8, 4, 2); g.fill();
    g.font = "13px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(item ? item.icon : "★", c.x, c.y + 1);
    g.restore();
  }
  return { INK, FONT_TAG, FONT_BLOCK, FONT_CJK, shade, rgba, off, wall, splat, table, sprayCan, brick, boss, pinky, bossPortrait, ball, flipper, paddle, plunger, PULL_PX, fish, tag, roundRect, capsule };
})();
