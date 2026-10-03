/* ============================================================
   噴漆闖關 — 漫畫劇情播放器（第 4 輪回饋：童話＋漫畫格，依序帶出 背景框 → 角色 → 旁白 → 對話框）
   參考的漫畫手法：
   - 新場景先用全景（建立鏡頭）交代地點，再拉近到角色
   - 大格放慢節奏、小格加快；情緒用「事件 → 停頓格 → 反應特寫」
   - 對話框照閱讀順序擺、尾巴指向說話者的臉、不蓋住臉、每個框不超過約 30 字
   背景與角色都是程式繪製的占位圖（之後可換成 AI 生成＋美術精修的插圖，見 Obsidian 09 號素材清單）
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.Comic = (function () {
  const VW = 400, VH = 740, M = 12, GAP = 10;
  const INK = "#111114";
  const FONT = "'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const back = t => { if (t <= 0) return 0; if (t >= 1) return 1; const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  /* ---------- 版面：把一頁的格子排成列 ---------- */
  function layout(page) {
    const rows = []; let row = [], wsum = 0;
    for (const p of page) { if (row.length && wsum + p.w > 1.001) { rows.push(row); row = []; wsum = 0; } row.push(p); wsum += p.w; }
    if (row.length) rows.push(row);
    const totalH = rows.reduce((s, r) => s + Math.max(...r.map(p => p.h)), 0);
    const unit = (VH - M * 2 - GAP * (rows.length - 1)) / totalH;
    const out = []; let y = M;
    for (const r of rows) {
      const h = Math.max(...r.map(p => p.h)) * unit, ws = r.reduce((s, p) => s + p.w, 0), availW = VW - M * 2 - GAP * (r.length - 1);
      let x = M;
      for (const p of r) { const w = availW * p.w / ws; out.push({ p, x, y, w, h }); x += w + GAP; }
      y += h + GAP;
    }
    return out;
  }

  /* ---------- 文字斷行（中文逐字量寬）---------- */
  const NO_LINE_START = "，。！？、…）」』：；～—";      // 避頭點：這些標點不放在行首
  function wrap(g, text, maxW) {
    const lines = []; let line = "";
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxW && line && !NO_LINE_START.includes(ch)) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  /* ---------- 小工具 ---------- */
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ink(g, w) { g.strokeStyle = INK; g.lineWidth = w; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
  function fillInk(g, color, w = 3) { g.fillStyle = color; g.fill(); ink(g, w); }
  function grad(g, h, a, b) { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
  function rnd(seed) { return SR.rng(seed); }
  function bricks(g, w, h, y0, base, seed) {
    const r = rnd(seed);
    for (let y = y0, row = 0; y < h; y += 16, row++) for (let x = (row % 2) * -14; x < w; x += 28) {
      const v = base + Math.floor(r() * 14); g.fillStyle = `rgb(${v},${v},${v + 4})`; g.fillRect(x + 1, y + 1, 26, 14);
    }
  }
  function skyline(g, w, h, baseY, colorful, seed) {
    const r = rnd(seed), cols = ["#ff3ea5", "#ffe14d", "#3ee0ff", "#9dff3a", "#ff8a1f", "#b25cff"];
    for (let x = -10; x < w; ) {
      const bw = 26 + r() * 40, bh = 40 + r() * (baseY * 0.7);
      const v = 110 + r() * 40 | 0;                           // 灰城：純灰（三個色版用同一個值）
      const c = colorful ? cols[Math.floor(r() * cols.length)] : `rgb(${v},${v},${v + 6})`;
      g.beginPath(); g.rect(x, baseY - bh, bw, bh + 4); fillInk(g, c, 2.5);
      g.fillStyle = colorful ? "rgba(255,255,255,0.55)" : "rgba(40,40,48,0.5)";
      for (let wy = baseY - bh + 8; wy < baseY - 8; wy += 12) for (let wx = x + 5; wx < x + bw - 6; wx += 9) if (r() > 0.35) g.fillRect(wx, wy, 4, 5);
      x += bw + 2;
    }
  }
  function sunflower(g, x, y, r, faded) {
    g.save(); g.translate(x, y);
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.beginPath(); g.ellipse(0, -r * 0.9, r * 0.28, r * 0.55, 0, 0, Math.PI * 2); g.fillStyle = faded ? "#c8b48a" : "#ffd23f"; g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke(); }
    g.beginPath(); g.arc(0, 0, r * 0.5, 0, Math.PI * 2); fillInk(g, faded ? "#8a7458" : "#8a4b12", 2);
    g.restore();
  }
  function rays(g, w, h, cx, cy, color, n = 22) {
    g.save(); g.fillStyle = color;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, a2 = a + Math.PI / n; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 900, cy + Math.sin(a) * 900); g.lineTo(cx + Math.cos(a2) * 900, cy + Math.sin(a2) * 900); g.closePath(); g.fill(); }
    g.restore();
  }
  function cabinet(g, cx, baseY, s, glow, dark) {
    g.save(); g.translate(cx, baseY); g.scale(s, s);
    if (glow) { const gr = g.createRadialGradient(0, -90, 10, 0, -90, 160); gr.addColorStop(0, "rgba(255,225,77,0.55)"); gr.addColorStop(1, "rgba(255,225,77,0)"); g.fillStyle = gr; g.fillRect(-170, -260, 340, 300); }
    g.beginPath(); g.moveTo(-60, 0); g.lineTo(-60, -110); g.lineTo(-48, -190); g.lineTo(48, -190); g.lineTo(60, -110); g.lineTo(60, 0); g.closePath(); fillInk(g, dark ? "#2a2a33" : "#3a2350", 4);
    g.beginPath(); g.rect(-44, -182, 88, 64); fillInk(g, dark ? "#1a1a20" : glow ? "#2b1240" : "#241a30", 3);
    if (!dark) { g.fillStyle = glow ? "#ff3ea5" : "#7a5a8a"; g.font = `900 13px ${FONT}`; g.textAlign = "center"; g.fillText("SPRAY RUN", 0, -146); }
    if (glow && !dark) for (let i = 0; i < 6; i++) { g.fillStyle = ["#ffe14d", "#3ee0ff", "#ff3ea5"][i % 3]; g.beginPath(); g.arc(-30 + i * 12, -128, 3, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.rect(-70, -112, 140, 22); fillInk(g, dark ? "#33333c" : "#5b3a78", 3);
    g.beginPath(); g.rect(-14, -70, 28, 14); fillInk(g, "#111", 2);
    g.fillStyle = dark ? "#555" : "#ffe14d"; g.fillRect(-6, -66, 12, 4);
    g.restore();
  }

  /* ---------- 背景場景 ---------- */
  const BG = {
    black(g, w, h) { g.fillStyle = "#111114"; g.fillRect(0, 0, w, h); },
    cityGrey(g, w, h) { g.fillStyle = grad(g, h, "#8f9098", "#c9cad0"); g.fillRect(0, 0, w, h); skyline(g, w, h, h * 0.86, false, 3); g.fillStyle = "#6c6d74"; g.fillRect(0, h * 0.86, w, h); },
    cityColor(g, w, h, t) { g.fillStyle = grad(g, h, "#7fd8ff", "#ffe9a8"); g.fillRect(0, 0, w, h); g.beginPath(); g.arc(w * 0.82, h * 0.22, 26, 0, Math.PI * 2); fillInk(g, "#ffd23f", 3); skyline(g, w, h, h * 0.86, true, 3); g.fillStyle = "#9dff3a"; g.fillRect(0, h * 0.86, w, h); for (let i = 0; i < 6; i++) sunflower(g, 30 + i * (w - 60) / 5, h * 0.9, 10 + Math.sin(t * 2 + i) * 1.2); },
    notice(g, w, h) { bricks(g, w, h, 0, 120, 7); g.save(); g.translate(w / 2, h * 0.48); g.rotate(-0.04); g.beginPath(); g.rect(-w * 0.34, -h * 0.3, w * 0.68, h * 0.6); fillInk(g, "#f2efe6", 3); g.fillStyle = INK; g.textAlign = "center"; g.font = `900 ${Math.max(11, w * 0.085)}px ${FONT}`; g.fillText("整潔條例", 0, -h * 0.14); g.font = `700 ${Math.max(9, w * 0.06)}px ${FONT}`; g.fillText("所有的牆", 0, h * 0.02); g.fillText("必須是灰色", 0, h * 0.13); g.beginPath(); g.arc(w * 0.2, h * 0.22, w * 0.06, 0, Math.PI * 2); g.strokeStyle = "#c43"; g.lineWidth = 3; g.stroke(); g.restore(); },
    wallPaint(g, w, h) { bricks(g, w, h, 0, 150, 9); const cols = ["#ff3ea5", "#ffe14d", "#3ee0ff", "#9dff3a"]; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(w * (0.15 + i * 0.15), h * (0.35 + (i % 2) * 0.2), w * 0.11, 0, Math.PI * 2); g.fillStyle = cols[i % 4]; g.fill(); } g.fillStyle = "#9a9aa3"; g.beginPath(); g.moveTo(0, h * 0.15); g.lineTo(w * 0.62, h * 0.15); g.lineTo(w * 0.62, h); g.lineTo(0, h); g.closePath(); g.fill(); g.save(); g.translate(w * 0.64, h * 0.5); g.beginPath(); g.rect(-8, -h * 0.3, 16, h * 0.6); fillInk(g, "#d8d8de", 3); g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w * 0.15, h * 0.48); ink(g, 4); g.restore(); },
    room(g, w, h) { g.fillStyle = "#f6d6a8"; g.fillRect(0, 0, w, h); g.fillStyle = "#c98b4e"; g.fillRect(0, h * 0.72, w, h); g.beginPath(); g.rect(w * 0.05, h * 0.55, w * 0.42, h * 0.32); fillInk(g, "#a8683a", 3); g.beginPath(); g.rect(w * 0.08, h * 0.62, w * 0.36, h * 0.14); fillInk(g, "#7a4a28", 2); for (let i = 0; i < 3; i++) { g.save(); g.translate(w * (0.13 + i * 0.11), h * 0.66); g.rotate((i - 1) * 0.2); g.beginPath(); g.rect(-14, -10, 28, 22); fillInk(g, "#fffaf0", 1.5); sunflower(g, 0, 1, 7); g.restore(); } },
    window(g, w, h) { g.fillStyle = "#e9d2ad"; g.fillRect(0, 0, w, h); g.beginPath(); g.rect(w * 0.42, h * 0.1, w * 0.52, h * 0.6); fillInk(g, "#8f9098", 4); g.save(); g.beginPath(); g.rect(w * 0.42, h * 0.1, w * 0.52, h * 0.6); g.clip(); bricks(g, w, h, h * 0.1, 105, 11); g.restore(); g.beginPath(); g.moveTo(w * 0.68, h * 0.1); g.lineTo(w * 0.68, h * 0.7); g.moveTo(w * 0.42, h * 0.4); g.lineTo(w * 0.94, h * 0.4); ink(g, 4); },
    arcade(g, w, h) { g.fillStyle = grad(g, h, "#1d1530", "#3b2a4a"); g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) cabinet(g, w * (0.18 + i * 0.22), h * 0.95, 0.42, false, true); cabinet(g, w * 0.72, h * 0.98, 0.62, false, false); g.fillStyle = "rgba(255,62,165,0.35)"; g.font = `900 ${w * 0.08}px ${FONT}`; g.textAlign = "center"; g.fillText("ARCADE", w * 0.5, h * 0.18); g.fillStyle = "#2a2233"; g.fillRect(0, h * 0.9, w, h); },
    arcadeNight(g, w, h) { BG.arcade(g, w, h); g.fillStyle = "rgba(10,20,60,0.45)"; g.fillRect(0, 0, w, h); },
    arcadeLit(g, w, h, t) { g.fillStyle = grad(g, h, "#3b1d5a", "#7a3a8a"); g.fillRect(0, 0, w, h); rays(g, w, h, w * 0.5, h * 0.55, "rgba(255,225,77,0.12)"); cabinet(g, w * 0.5, h * 0.98, 0.95, true, false); },
    machine(g, w, h) { g.fillStyle = "#3a2350"; g.fillRect(0, 0, w, h); g.beginPath(); g.rect(w * 0.3, h * 0.3, w * 0.4, h * 0.32); fillInk(g, "#5b3a78", 4); g.beginPath(); g.rect(w * 0.44, h * 0.38, w * 0.12, h * 0.16); fillInk(g, "#111", 3); g.fillStyle = "#ffe14d"; g.fillRect(w * 0.47, h * 0.43, w * 0.06, h * 0.03); g.fillStyle = "#ffe14d"; g.font = `900 ${w * 0.07}px ${FONT}`; g.textAlign = "center"; g.fillText("INSERT COIN", w / 2, h * 0.78); g.save(); g.translate(w * 0.5, h * 0.2); g.beginPath(); g.ellipse(0, 0, w * 0.07, w * 0.07, 0, 0, Math.PI * 2); fillInk(g, "#e8c040", 3); g.restore(); },
    machineGlow(g, w, h, t) { g.fillStyle = grad(g, h, "#2b1240", "#5b2a6a"); g.fillRect(0, 0, w, h); rays(g, w, h, w * 0.5, h * 0.62, "rgba(255,225,77,0.16)"); cabinet(g, w * 0.5, h * 1.05, h / 260, true, false); for (let i = 0; i < 10; i++) { const a = t * 0.8 + i; g.fillStyle = ["#ffe14d", "#3ee0ff", "#ff3ea5"][i % 3]; g.beginPath(); g.arc(w * 0.5 + Math.cos(a) * w * 0.4, h * 0.45 + Math.sin(a * 1.3) * h * 0.3, 2.5, 0, Math.PI * 2); g.fill(); } },
    machineDark(g, w, h) { g.fillStyle = grad(g, h, "#15151c", "#26262e"); g.fillRect(0, 0, w, h); cabinet(g, w * 0.5, h * 1.05, h / 260, false, true); },
    unplug(g, w, h) { g.fillStyle = "#1a1a22"; g.fillRect(0, 0, w, h); g.beginPath(); g.rect(w * 0.55, h * 0.2, w * 0.4, h * 0.5); fillInk(g, "#33333c", 3); g.beginPath(); g.moveTo(w * 0.6, h * 0.6); g.bezierCurveTo(w * 0.4, h * 0.7, w * 0.3, h * 0.5, w * 0.2, h * 0.75); ink(g, 6); g.strokeStyle = "#555"; g.lineWidth = 3; g.stroke(); g.beginPath(); g.rect(w * 0.12, h * 0.72, w * 0.12, h * 0.08); fillInk(g, "#777", 2); g.strokeStyle = "#ffe14d"; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(w * 0.28 + i * 6, h * 0.66 - i * 4); g.lineTo(w * 0.33 + i * 6, h * 0.62 - i * 4); g.stroke(); } },
    tableMagic(g, w, h, t) { g.fillStyle = "#241a30"; g.fillRect(0, 0, w, h); g.save(); g.translate(w * 0.42, h * 0.55); g.beginPath(); rr(g, -w * 0.12, -h * 0.4, w * 0.24, h * 0.8, 14); fillInk(g, "#3a2350", 3); for (let i = 0; i < 3; i++) { g.fillStyle = "#9a9aa3"; g.fillRect(-w * 0.09 + i * w * 0.065, -h * 0.3, w * 0.055, h * 0.07); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(-w * 0.09 + i * w * 0.065, -h * 0.3, w * 0.055, h * 0.07); } g.restore(); g.save(); g.setLineDash([8, 6]); g.lineDashOffset = -t * 40; g.strokeStyle = "#ffe14d"; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.5, h * 0.3); g.quadraticCurveTo(w * 0.7, h * 0.05, w * 0.86, h * 0.3); g.stroke(); g.restore(); g.save(); g.translate(w * 0.86, h * 0.5); g.beginPath(); g.rect(-w * 0.1, -h * 0.18, w * 0.2, h * 0.36); fillInk(g, "#9a9aa3", 3); sunflower(g, 0, 0, 10 + Math.sin(t * 3) * 2); g.restore(); },
    alleyNight(g, w, h) { g.fillStyle = grad(g, h, "#1c2240", "#363a52"); g.fillRect(0, 0, w, h); bricks(g, w, h * 0.85, h * 0.2, 70, 13); g.fillStyle = "#24242c"; g.fillRect(0, h * 0.85, w, h); g.beginPath(); g.rect(w * 0.06, h * 0.05, 6, h * 0.5); fillInk(g, "#333", 2); g.beginPath(); g.arc(w * 0.08, h * 0.08, 10, 0, Math.PI * 2); g.fillStyle = "#ffe9a8"; g.fill(); const gr = g.createRadialGradient(w * 0.08, h * 0.1, 5, w * 0.08, h * 0.1, h * 0.6); gr.addColorStop(0, "rgba(255,233,168,0.35)"); gr.addColorStop(1, "rgba(255,233,168,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
    alleyColor(g, w, h, t) { g.fillStyle = "#ffe9a8"; g.fillRect(0, 0, w, h); bricks(g, w, h * 0.85, h * 0.1, 150, 13); const cols = ["#ff3ea5", "#3ee0ff", "#9dff3a", "#ff8a1f"]; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(w * (0.1 + i * 0.2), h * 0.5, w * 0.12, h * 0.3, 0.3, 0, Math.PI * 2); g.fillStyle = cols[i % 4]; g.globalAlpha = 0.75; g.fill(); g.globalAlpha = 1; } for (let i = 0; i < 6; i++) sunflower(g, w * (0.1 + i * 0.16), h * (0.35 + (i % 2) * 0.22), 12 + Math.sin(t * 2 + i) * 1.5); g.fillStyle = "#c9b38a"; g.fillRect(0, h * 0.85, w, h); },
    subway(g, w, h) { g.fillStyle = "#9a9ca4"; g.fillRect(0, 0, w, h); for (let y = 0; y < h * 0.7; y += 14) for (let x = 0; x < w; x += 14) { g.strokeStyle = "rgba(60,60,70,0.25)"; g.lineWidth = 1; g.strokeRect(x, y, 14, 14); } g.fillStyle = "#6c6e76"; g.fillRect(0, h * 0.7, w, h); g.fillStyle = "#4a4c54"; for (let i = 0; i < 7; i++) { const x = w * (0.06 + i * 0.14); g.beginPath(); g.arc(x, h * 0.72, 9, 0, Math.PI * 2); g.fill(); g.fillRect(x - 9, h * 0.74, 18, h * 0.2); } },
    subwayColor(g, w, h, t) { g.fillStyle = "#fff1c8"; g.fillRect(0, 0, w, h); const cols = ["#3ee0ff", "#b25cff", "#ffe14d", "#ff3ea5"]; for (let i = 0; i < 8; i++) { g.fillStyle = cols[i % 4]; g.fillRect(i * w / 8, 0, w / 8 + 1, h * 0.7); } for (let i = 0; i < 4; i++) sunflower(g, w * (0.15 + i * 0.24), h * 0.32, 14); g.fillStyle = "#8a8c94"; g.fillRect(0, h * 0.7, w, h); g.fillStyle = "#33343c"; for (let i = 0; i < 7; i++) { const x = w * (0.06 + i * 0.14); g.beginPath(); g.arc(x, h * 0.66, 9, 0, Math.PI * 2); g.fill(); g.fillRect(x - 9, h * 0.69, 18, h * 0.24); } },
    chalk(g, w, h) { g.fillStyle = "#7d7f87"; g.fillRect(0, 0, w, h); g.strokeStyle = "#ffe14d"; g.lineWidth = 4; g.beginPath(); g.arc(w * 0.72, h * 0.65, h * 0.15, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; g.beginPath(); g.moveTo(w * 0.72 + Math.cos(a) * h * 0.19, h * 0.65 + Math.sin(a) * h * 0.19); g.lineTo(w * 0.72 + Math.cos(a) * h * 0.27, h * 0.65 + Math.sin(a) * h * 0.27); g.stroke(); } },
    rooftop(g, w, h) { g.fillStyle = grad(g, h, "#ffb36b", "#ffe2b5"); g.fillRect(0, 0, w, h); skyline(g, w, h, h * 0.78, false, 21); for (let i = 0; i < 3; i++) { g.beginPath(); g.rect(w * (0.2 + i * 0.3), h * (0.6 - (i % 2) * 0.1), w * 0.06, h * 0.12); fillInk(g, "#d08a4a", 2); } g.beginPath(); g.rect(0, h * 0.84, w, h); fillInk(g, "#6a5a5a", 3); },
    rooftopColor(g, w, h) { g.fillStyle = grad(g, h, "#ff8a1f", "#ffd27a"); g.fillRect(0, 0, w, h); skyline(g, w, h, h * 0.8, true, 21); g.beginPath(); g.rect(0, h * 0.84, w, h); fillInk(g, "#5a4a4a", 3); },
    riverside(g, w, h) { g.fillStyle = grad(g, h, "#8fa6b8", "#c7d4dc"); g.fillRect(0, 0, w, h); g.beginPath(); g.rect(w * 0.08, h * 0.1, w * 0.3, h * 0.65); fillInk(g, "#8a8c92", 3); g.beginPath(); g.rect(0, h * 0.1, w, h * 0.08); fillInk(g, "#7a7c82", 3); g.save(); g.beginPath(); g.rect(w * 0.08, h * 0.2, w * 0.3, h * 0.55); g.clip(); g.globalAlpha = 0.35; sunflower(g, w * 0.18, h * 0.42, 16, true); sunflower(g, w * 0.3, h * 0.58, 12, true); g.globalAlpha = 1; g.fillStyle = "rgba(154,154,163,0.75)"; g.fillRect(w * 0.08, h * 0.2, w * 0.17, h * 0.55); g.restore(); g.fillStyle = "#4f7ea8"; g.fillRect(0, h * 0.78, w, h); g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w * (0.5 + i * 0.1), h * (0.84 + (i % 2) * 0.06)); g.lineTo(w * (0.56 + i * 0.1), h * (0.84 + (i % 2) * 0.06)); g.stroke(); } },
    riversideColor(g, w, h, t) { BG.riverside(g, w, h); g.save(); g.beginPath(); g.rect(w * 0.08, h * 0.2, w * 0.3, h * 0.55); g.clip(); g.fillStyle = "#ffe9a8"; g.fillRect(0, 0, w, h); sunflower(g, w * 0.18, h * 0.42, 16); sunflower(g, w * 0.3, h * 0.58, 12); g.restore(); g.fillStyle = "#2f7bff"; g.fillRect(0, h * 0.78, w, h); },
    signature(g, w, h) { bricks(g, w, h, 0, 118, 31); g.save(); g.globalAlpha = 0.45; sunflower(g, w * 0.25, h * 0.4, 30, true); g.restore(); g.fillStyle = "rgba(154,154,163,0.7)"; g.fillRect(0, 0, w * 0.18, h); g.save(); g.translate(w * 0.5, h * 0.72); g.rotate(-0.12); g.font = `900 ${h * 0.16}px 'Permanent Marker', cursive`; g.fillStyle = "#3a2350"; g.fillText("G.Y.", 0, 0); g.restore(); },
    memoryWall(g, w, h) { g.fillStyle = "#e8d6b0"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5; i++) sunflower(g, w * (0.1 + i * 0.2), h * (0.3 + (i % 2) * 0.2), 16, true); g.fillStyle = "#b89a6a"; g.fillRect(0, h * 0.86, w, h); },
    memoryGrey(g, w, h) { g.fillStyle = "#b8ae9c"; g.fillRect(0, 0, w, h); g.fillStyle = "#9a948a"; g.fillRect(0, 0, w, h * 0.86); g.save(); g.globalAlpha = 0.18; for (let i = 0; i < 5; i++) sunflower(g, w * (0.1 + i * 0.2), h * (0.3 + (i % 2) * 0.2), 16, true); g.restore(); g.fillStyle = "#8a7a62"; g.fillRect(0, h * 0.86, w, h); },
    bigwall(g, w, h) { g.fillStyle = grad(g, h, "#7f8088", "#a5a6ac"); g.fillRect(0, 0, w, h); g.beginPath(); g.rect(w * 0.05, h * 0.08, w * 0.9, h * 0.72); fillInk(g, "#8e8f96", 4); bricks(g, w * 0.95, h * 0.8, h * 0.08, 128, 41); g.fillStyle = "#5c5d64"; g.fillRect(0, h * 0.8, w, h); g.fillStyle = INK; for (let i = 0; i < 6; i++) { const x = w * (0.15 + i * 0.13); g.beginPath(); g.arc(x, h * 0.84, 4, 0, Math.PI * 2); g.fill(); g.fillRect(x - 3, h * 0.86, 6, 10); } },
    bigwallColor(g, w, h, t) { BG.bigwall(g, w, h); g.save(); g.beginPath(); g.rect(w * 0.05, h * 0.08, w * 0.9, h * 0.72); g.clip(); rays(g, w, h, w * 0.5, h * 0.44, "rgba(255,225,77,0.35)", 16); sunflower(g, w * 0.5, h * 0.44, h * 0.22 + Math.sin(t * 2) * 2); const cols = ["#ff3ea5", "#3ee0ff", "#9dff3a", "#b25cff"]; for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(w * (0.1 + i * 0.12), h * (0.15 + (i % 3) * 0.25), w * 0.05, 0, Math.PI * 2); g.fillStyle = cols[i % 4]; g.fill(); } g.restore(); }
  };

  /* ---------- 角色（腳底在 (x, y)，u＝格子高度的比例單位）---------- */
  function face(g, mood, eyeY, eyeDx, r, skin) {
    g.fillStyle = INK;
    if (mood === "happy") { for (const s of [-1, 1]) { g.beginPath(); g.arc(s * eyeDx, eyeY, r * 0.16, Math.PI * 1.1, Math.PI * 1.9); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke(); } }
    else { for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * eyeDx, eyeY, r * 0.1, r * (mood === "wow" ? 0.17 : 0.14), 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(s * eyeDx + 1.5, eyeY - 2, 1.6, 0, Math.PI * 2); g.fill(); g.fillStyle = INK; } }
    g.strokeStyle = INK; g.lineWidth = 2.5;
    // 難過：眉毛內側往上抬（內高外低）；決心：內側往下壓
    if (mood === "sad") { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * eyeDx * 1.55, eyeY - r * 0.18); g.lineTo(s * eyeDx * 0.45, eyeY - r * 0.34); g.stroke(); } g.beginPath(); g.arc(0, eyeY + r * 0.55, r * 0.18, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    else if (mood === "wow") { g.beginPath(); g.ellipse(0, eyeY + r * 0.42, r * 0.11, r * 0.15, 0, 0, Math.PI * 2); g.fillStyle = "#6a1a2a"; g.fill(); g.stroke(); }
    else if (mood === "determined") { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * eyeDx * 1.5, eyeY - r * 0.22); g.lineTo(s * eyeDx * 0.4, eyeY - r * 0.3); g.stroke(); } g.beginPath(); g.moveTo(-r * 0.15, eyeY + r * 0.42); g.lineTo(r * 0.15, eyeY + r * 0.4); g.stroke(); }
    else { g.beginPath(); g.arc(0, eyeY + r * 0.3, r * 0.2, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    if (skin) { g.fillStyle = "rgba(255,120,120,0.35)"; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * eyeDx * 1.6, eyeY + r * 0.25, r * 0.12, 0, Math.PI * 2); g.fill(); } }
  }
  const CHAR = {
    // 小葵：黃色帽 T、短髮、大眼睛
    kid(g, c, u, t) {
      const bob = Math.sin(t * 3) * u * 1.5;
      g.save(); g.translate(0, bob);
      g.beginPath(); g.rect(-16 * u, -36 * u, 12 * u, 36 * u); g.rect(4 * u, -36 * u, 12 * u, 36 * u); fillInk(g, "#2b3550", 2.5);
      g.beginPath(); g.moveTo(-28 * u, -36 * u); g.lineTo(-22 * u, -96 * u); g.lineTo(22 * u, -96 * u); g.lineTo(28 * u, -36 * u); g.closePath(); fillInk(g, "#ffb21f", 3);
      g.beginPath(); g.moveTo(-6 * u, -90 * u); g.lineTo(-4 * u, -72 * u); g.moveTo(6 * u, -90 * u); g.lineTo(4 * u, -72 * u); ink(g, 2);
      const arm = c.mood === "determined" ? -1 : c.mood === "happy" ? -0.6 : 0.3;
      g.save(); g.translate(22 * u, -88 * u); g.rotate(arm); g.beginPath(); rr(g, -6 * u, 0, 12 * u, 34 * u, 6 * u); fillInk(g, "#ffb21f", 2.5); g.beginPath(); g.arc(0, 36 * u, 6 * u, 0, Math.PI * 2); fillInk(g, "#ffd9b3", 2); g.restore();
      g.save(); g.translate(-22 * u, -88 * u); g.rotate(0.3); g.beginPath(); rr(g, -6 * u, 0, 12 * u, 34 * u, 6 * u); fillInk(g, "#ffb21f", 2.5); g.beginPath(); g.arc(0, 36 * u, 6 * u, 0, Math.PI * 2); fillInk(g, "#ffd9b3", 2); g.restore();
      g.translate(0, -122 * u);
      g.beginPath(); g.arc(0, 0, 28 * u, 0, Math.PI * 2); fillInk(g, "#ffd9b3", 3);
      g.beginPath(); g.arc(0, -4 * u, 30 * u, Math.PI * 1.02, Math.PI * 1.98); g.lineTo(30 * u, 10 * u); g.lineTo(22 * u, 4 * u); g.lineTo(18 * u, -10 * u); g.lineTo(-18 * u, -10 * u); g.lineTo(-22 * u, 4 * u); g.lineTo(-30 * u, 10 * u); g.closePath(); fillInk(g, "#4a2a1a", 3);
      g.beginPath(); g.ellipse(14 * u, -20 * u, 9 * u, 6 * u, -0.4, 0, Math.PI * 2); fillInk(g, "#ffe14d", 2);
      face(g, c.mood, 4 * u, 10 * u, 28 * u, true);
      g.restore();
    },
    // 灰先生：灰大衣、灰帽、墨鏡、八字鬍
    grey(g, c, u) {
      if (c.mood === "back") {
        g.beginPath(); g.moveTo(-30 * u, 0); g.lineTo(-26 * u, -120 * u); g.lineTo(26 * u, -120 * u); g.lineTo(30 * u, 0); g.closePath(); fillInk(g, "#7d7d86", 3);
        g.beginPath(); g.arc(0, -138 * u, 22 * u, 0, Math.PI * 2); fillInk(g, "#5a4a3a", 3);
        g.beginPath(); g.ellipse(0, -152 * u, 36 * u, 8 * u, 0, 0, Math.PI * 2); fillInk(g, "#6c6c75", 3); g.beginPath(); rr(g, -20 * u, -178 * u, 40 * u, 26 * u, 6 * u); fillInk(g, "#6c6c75", 3);
        return;
      }
      g.beginPath(); g.moveTo(-34 * u, 0); g.lineTo(-28 * u, -122 * u); g.lineTo(28 * u, -122 * u); g.lineTo(34 * u, 0); g.closePath(); fillInk(g, "#8d8d96", 3);
      g.beginPath(); g.moveTo(0, -122 * u); g.lineTo(-10 * u, -80 * u); g.lineTo(0, -40 * u); g.lineTo(10 * u, -80 * u); g.closePath(); fillInk(g, "#5c5c66", 2);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(6 * u, (-70 + i * 18) * u, 2.5 * u, 0, Math.PI * 2); g.fillStyle = INK; g.fill(); }
      g.translate(0, -146 * u);
      g.beginPath(); g.arc(0, 0, 24 * u, 0, Math.PI * 2); fillInk(g, "#e8c9a6", 3);
      g.beginPath(); g.ellipse(0, -14 * u, 40 * u, 8 * u, 0, 0, Math.PI * 2); fillInk(g, "#6c6c75", 3);
      g.beginPath(); rr(g, -22 * u, -42 * u, 44 * u, 28 * u, 6 * u); fillInk(g, "#6c6c75", 3);
      if (c.mood === "sad") { g.fillStyle = INK; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 9 * u, 2 * u, 2.6 * u, 0, Math.PI * 2); g.fill(); } g.strokeStyle = INK; g.lineWidth = 2; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 14 * u, -4 * u); g.lineTo(s * 5 * u, -1 * u); g.stroke(); } g.beginPath(); rr(g, -16 * u, 6 * u, 32 * u, 6 * u, 3 * u); g.fillStyle = "rgba(17,17,20,0.6)"; g.fill(); }
      else { g.fillStyle = INK; rr(g, -19 * u, -4 * u, 17 * u, 10 * u, 3 * u); g.fill(); rr(g, 2 * u, -4 * u, 17 * u, 10 * u, 3 * u); g.fill(); g.fillRect(-3 * u, -1 * u, 6 * u, 2.5 * u); }
      g.beginPath(); g.moveTo(-10 * u, 12 * u); g.quadraticCurveTo(0, 6 * u, 10 * u, 12 * u); ink(g, 3.5);
    },
    // 年輕時的灰先生（回憶，貝雷帽＋沾滿顏料的圍裙）
    greyYoung(g, c, u) {
      if (c.mood === "back") { g.beginPath(); g.moveTo(-26 * u, 0); g.lineTo(-22 * u, -110 * u); g.lineTo(22 * u, -110 * u); g.lineTo(26 * u, 0); g.closePath(); fillInk(g, "#8a7458", 3); g.beginPath(); g.arc(0, -128 * u, 20 * u, 0, Math.PI * 2); fillInk(g, "#5a4a3a", 3); g.beginPath(); g.ellipse(4 * u, -146 * u, 22 * u, 8 * u, 0.2, 0, Math.PI * 2); fillInk(g, "#7a3a3a", 2.5); return; }
      g.beginPath(); g.moveTo(-26 * u, 0); g.lineTo(-22 * u, -110 * u); g.lineTo(22 * u, -110 * u); g.lineTo(26 * u, 0); g.closePath(); fillInk(g, "#d9c39a", 3);
      for (let i = 0; i < 6; i++) { g.fillStyle = ["#c8a24a", "#a86a4a", "#7a8a6a"][i % 3]; g.beginPath(); g.arc((-14 + i * 6) * u, (-70 + (i % 2) * 20) * u, 4 * u, 0, Math.PI * 2); g.fill(); }
      g.save(); g.translate(26 * u, -96 * u); g.rotate(-1.1); g.beginPath(); rr(g, -5 * u, 0, 10 * u, 34 * u, 5 * u); fillInk(g, "#d9c39a", 2.5); g.beginPath(); g.rect(-6 * u, 32 * u, 12 * u, 20 * u); fillInk(g, "#8a7458", 2); g.restore();
      g.translate(0, -128 * u);
      g.beginPath(); g.arc(0, 0, 20 * u, 0, Math.PI * 2); fillInk(g, "#e8c9a6", 3);
      g.beginPath(); g.ellipse(4 * u, -16 * u, 22 * u, 8 * u, 0.2, 0, Math.PI * 2); fillInk(g, "#9a5a4a", 2.5);
      face(g, "happy", 2 * u, 8 * u, 20 * u, false);
    },
    citizen(g, c, u) {
      g.beginPath(); g.moveTo(-24 * u, 0); g.lineTo(-20 * u, -100 * u); g.lineTo(20 * u, -100 * u); g.lineTo(24 * u, 0); g.closePath(); fillInk(g, "#3ee0ff", 3);
      g.translate(0, -122 * u); g.beginPath(); g.arc(0, 0, 22 * u, 0, Math.PI * 2); fillInk(g, "#f0c9a0", 3);
      g.beginPath(); g.arc(0, -6 * u, 23 * u, Math.PI, Math.PI * 2); fillInk(g, "#2a2a33", 2.5);
      face(g, "wow", 4 * u, 8 * u, 22 * u, false);
    },
    boy(g, c, u) {
      g.beginPath(); g.ellipse(0, -30 * u, 22 * u, 30 * u, 0, 0, Math.PI * 2); fillInk(g, "#9dff3a", 3);
      g.save(); g.translate(16 * u, -34 * u); g.rotate(0.9); g.beginPath(); rr(g, -5 * u, 0, 10 * u, 28 * u, 5 * u); fillInk(g, "#9dff3a", 2.5); g.fillStyle = "#ffe14d"; g.fillRect(-3 * u, 26 * u, 6 * u, 12 * u); g.restore();
      g.translate(0, -74 * u); g.beginPath(); g.arc(0, 0, 20 * u, 0, Math.PI * 2); fillInk(g, "#f0c9a0", 3);
      g.beginPath(); g.arc(0, -4 * u, 21 * u, Math.PI * 1.05, Math.PI * 1.95); fillInk(g, "#3a2a1a", 2.5);
      face(g, "happy", 4 * u, 7 * u, 20 * u, true);
    },
    pinky(g, c, u, t) { SR.Art.pinky(g, 0, -50 * u, 1.05 * u, c.mood || "happy", t, false); },
    pinkyGrey(g, c, u, t) { SR.Art.pinky(g, 0, -50 * u, 1.05 * u, c.mood || "sad", t, true); }
  };
  // 頭的位置（對話框尾巴要指向這裡）
  const HEAD = { kid: 122, grey: 146, greyYoung: 128, citizen: 122, boy: 74, pinky: 62, pinkyGrey: 62 };

  /* ---------- 對話框位置（繪圖與測試共用）---------- */
  function bubbleFont(w) { return `700 ${Math.max(13, Math.min(16, w / 20))}px ${FONT}`; }
  function bubbleBox(g, cell, b) {
    const { w, h } = cell;
    g.save(); g.font = bubbleFont(w);
    // 文字寬度：格子寬減掉留邊（框才不會超出格子），最多 236；太窄會把詞拆開（例如「灰先／生」），所以不再用比例縮
    const lines = wrap(g, b.text, Math.min(w - 50, 236)), lh = 20;
    const bw = Math.max(...lines.map(l => g.measureText(l).width)) + 26, bh = lines.length * lh + 18;
    g.restore();
    // 橢圓外擴 8／4px，所以留邊要算進去，框才不會超出格子
    const cx = Math.min(w - bw / 2 - 16, Math.max(bw / 2 + 16, b.x * w)), cy = Math.min(h - bh / 2 - 10, Math.max(bh / 2 + 10, b.y * h));
    return { lines, lh, bw, bh, cx, cy };
  }
  function bubbleOutside(g, cell) {
    return (cell.p.say || []).filter(b => { const bb = bubbleBox(g, cell, b); return bb.cx - bb.bw / 2 - 8 < 0 || bb.cx + bb.bw / 2 + 8 > cell.w || bb.cy - bb.bh / 2 - 4 < 0 || bb.cy + bb.bh / 2 + 4 > cell.h; }).map(b => b.text.slice(0, 6) + "…");
  }
  /* 角色的臉（圓），用來檢查對話框有沒有蓋到臉 */
  function faces(cell) {
    const u = cell.h / 300;
    return (cell.p.cast || []).map(c => ({ who: c.who, x: c.x * cell.w, y: c.y * cell.h - HEAD[c.who] * u * (c.s || 1), r: (c.who.startsWith("pinky") ? 40 : 26) * u * (c.s || 1) }));
  }
  function bubbleCoversFace(g, cell) {
    const hits = [];
    for (const b of cell.p.say || []) {
      const bb = bubbleBox(g, cell, b), rx = bb.bw / 2 + 8, ry = bb.bh / 2 + 4;
      for (const f of faces(cell)) {
        // 橢圓與圓：把臉心換到橢圓座標，距離 < 1 + 臉半徑比例就算蓋到
        const dx = (f.x - bb.cx) / (rx + f.r * 0.6), dy = (f.y - bb.cy) / (ry + f.r * 0.6);
        if (dx * dx + dy * dy < 1) hits.push(`${b.text.slice(0, 6)}… 蓋到 ${f.who}`);
      }
    }
    return hits;
  }

  /* ---------- 畫一格 ---------- */
  function drawPanel(g, cell, age, typedChars, t) {
    const { p, x, y, w, h } = cell;
    const kFrame = ease(age / 0.32);
    if (kFrame <= 0) return;
    g.save();
    g.globalAlpha = kFrame;
    const s = 0.9 + 0.1 * back(age / 0.32);
    g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-w / 2, -h / 2);
    // 1. 背景框
    g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    (BG[p.bg] || BG.black)(g, w, h, t);
    // 2. 角色（依序彈出）
    const u = h / 300;
    (p.cast || []).forEach((c, i) => {
      const k = back((age - 0.28 - i * 0.12) / 0.3);
      if (k <= 0) return;
      g.save(); g.translate(c.x * w, c.y * h); g.scale((c.flip ? -1 : 1) * k, k);
      CHAR[c.who](g, c, u * (c.s || 1), t);
      g.restore();
    });
    if (p.sepia) { g.fillStyle = "rgba(160,120,60,0.22)"; g.fillRect(0, 0, w, h); }
    // 網點（漫畫質感）
    g.fillStyle = "rgba(0,0,0,0.05)";
    for (let yy = 4; yy < h; yy += 7) for (let xx = (yy / 7 % 2) * 3.5; xx < w; xx += 7) g.fillRect(xx, yy, 1.4, 1.4);
    g.restore();
    // 3. 旁白框（左上，黃底）
    let typed = typedChars;
    if (p.cap) {
      const k = ease((age - 0.45) / 0.22);
      if (k > 0) {
        g.save(); g.globalAlpha *= k; g.font = `700 ${Math.max(12, Math.min(15, w / 22))}px ${FONT}`;
        const lines = wrap(g, p.cap, w - 34), lh = 19;
        const bw = Math.min(w - 14, Math.max(...lines.map(l => g.measureText(l).width)) + 20), bh = lines.length * lh + 12;
        const bx = 7, by = p.bg === "black" ? (h - bh) / 2 : 7 - (1 - k) * 10;
        g.beginPath(); g.rect(bx, by, p.bg === "black" ? w - 14 : bw, bh); g.fillStyle = p.bg === "black" ? "#111114" : "#ffe14d"; g.fill(); ink(g, 2.5);
        g.fillStyle = p.bg === "black" ? "#ffffff" : INK; g.textBaseline = "top"; g.textAlign = p.bg === "black" ? "center" : "left";
        const shown = Math.min(p.cap.length, typed); let left = shown;
        lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length; g.fillText(part, p.bg === "black" ? w / 2 : bx + 10, by + 6 + i * lh); });
        g.restore();
      }
      typed -= p.cap.length;
    }
    // 4. 對話框（依序彈出，尾巴指向說話者）
    (p.say || []).forEach((b, i) => {
      const k = back((age - 0.62 - i * 0.3) / 0.25);
      if (k <= 0) return;
      const { lines, lh, bw, bh, cx, cy } = bubbleBox(g, cell, b);
      g.save(); g.font = bubbleFont(w);
      const sp = (p.cast || []).find(c => c.who === b.who || (b.who === "pinky" && c.who === "pinkyGrey"));
      g.translate(cx, cy); g.scale(k, k);
      g.beginPath(); g.ellipse(0, 0, bw / 2 + 8, bh / 2 + 4, 0, 0, Math.PI * 2); g.fillStyle = "#fff"; g.fill(); ink(g, 3);
      if (sp && b.tail !== "none") {
        const hx = sp.x * w - cx, hy = sp.y * h - HEAD[sp.who] * u * (sp.s || 1) - cy;
        const ang = Math.atan2(hy, hx), ex = Math.cos(ang) * (bw / 2 + 4), ey = Math.sin(ang) * (bh / 2 + 2);
        const len = Math.min(34, Math.hypot(hx, hy) * 0.45);
        g.beginPath(); g.moveTo(ex - Math.sin(ang) * 7, ey + Math.cos(ang) * 7); g.lineTo(ex + Math.cos(ang) * len, ey + Math.sin(ang) * len); g.lineTo(ex + Math.sin(ang) * 7, ey - Math.cos(ang) * 7);
        g.fillStyle = "#fff"; g.fill(); ink(g, 3);
        g.beginPath(); g.moveTo(ex - Math.sin(ang) * 6, ey + Math.cos(ang) * 6); g.lineTo(ex + Math.sin(ang) * 6, ey - Math.cos(ang) * 6); g.strokeStyle = "#fff"; g.lineWidth = 4; g.stroke();
      }
      g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "top";
      const shown = Math.max(0, Math.min(b.text.length, typed)); let left = shown;
      lines.forEach((l, j) => { g.fillText(l.slice(0, Math.max(0, left)), 0, -bh / 2 + 9 + j * lh); left -= l.length; });
      g.restore();
      typed -= b.text.length;
    });
    // 外框
    g.beginPath(); g.rect(0, 0, w, h); ink(g, 4);
    g.restore();
  }
  function textLength(p) { return (p.cap ? p.cap.length : 0) + (p.say || []).reduce((s, b) => s + b.text.length, 0); }

  /* ---------- 播放器 ---------- */
  let st = null, canvas = null, ctx = null, layer = null;
  function el() {
    if (canvas) return;
    layer = document.getElementById("comicLayer"); canvas = document.getElementById("comicCanvas"); ctx = canvas.getContext("2d");
    layer.addEventListener("pointerdown", e => { if (e.target.id === "comicSkip") return; e.preventDefault(); tap(); });
    document.getElementById("comicSkip").addEventListener("click", () => finish(true));
  }
  function fit() {
    const sw = innerWidth, sh = innerHeight, s = Math.min(sw / VW, (sh - 10) / VH), dpr = Math.min(2.5, devicePixelRatio || 1);
    canvas.style.width = Math.floor(VW * s) + "px"; canvas.style.height = Math.floor(VH * s) + "px";
    canvas.width = Math.round(VW * s * dpr); canvas.height = Math.round(VH * s * dpr);
  }
  function play(keys, done) {
    const pages = keys.flatMap(k => SR.COMICS[k] || []);
    if (!pages.length) { done(); return; }
    el(); fit();
    st = { pages, pi: 0, cells: layout(pages[0]), shown: 1, ages: [0], typed: [0], done, t: 0, turn: 0, fade: 0, closing: false };
    layer.hidden = false;
  }
  function cur() { return st.cells[st.shown - 1]; }
  function panelDone(i) { return st.typed[i] >= textLength(st.cells[i].p) && st.ages[i] > 0.9 + (st.cells[i].p.say || []).length * 0.3; }
  function tap() {
    if (!st || st.closing || st.turn > 0) return;
    SR.Audio && SR.Audio.play("ui");
    const i = st.shown - 1;
    if (!panelDone(i)) { st.typed[i] = textLength(cur().p); st.ages[i] = Math.max(st.ages[i], 0.9 + (cur().p.say || []).length * 0.3); return; }
    if (st.shown < st.cells.length) { st.shown++; st.ages.push(0); st.typed.push(0); SR.Audio && SR.Audio.play("spray", 0.06); return; }
    if (st.pi < st.pages.length - 1) { st.turn = 0.0001; return; }
    finish(false);
  }
  function finish() { if (!st) return; st.closing = true; }
  function update(dt) {
    if (!st) return;
    st.t += dt;
    for (let i = 0; i < st.shown; i++) {
      st.ages[i] += dt;
      if (st.ages[i] > 0.5) st.typed[i] = Math.min(textLength(st.cells[i].p), st.typed[i] + dt * 34);
    }
    if (st.turn > 0) {
      st.turn += dt;
      if (st.turn > 0.35) { st.pi++; st.cells = layout(st.pages[st.pi]); st.shown = 1; st.ages = [0]; st.typed = [0]; st.turn = 0; }
    }
    if (st.closing) { st.fade += dt; if (st.fade > 0.3) { const d = st.done; st = null; layer.hidden = true; d(); return; } }
    render();
  }
  function render() {
    const g = ctx, s = canvas.width / VW;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#18181d"; g.fillRect(0, 0, canvas.width, canvas.height);
    g.setTransform(s, 0, 0, s, 0, 0);
    g.save();
    if (st.turn > 0) { const k = ease(st.turn / 0.35); g.translate(-VW * k, 0); g.globalAlpha = 1 - k * 0.6; }
    if (st.closing) g.globalAlpha = 1 - st.fade / 0.3;
    for (let i = 0; i < st.shown; i++) drawPanel(g, st.cells[i], st.ages[i], st.typed[i], st.t);
    g.restore();
    // 下一步提示
    const i = st.shown - 1;
    if (panelDone(i) && !st.closing && st.turn === 0) {
      const last = st.shown === st.cells.length && st.pi === st.pages.length - 1;
      g.fillStyle = "#ffe14d"; g.font = `900 13px ${FONT}`; g.textAlign = "right"; g.textBaseline = "bottom";
      g.globalAlpha = 0.6 + 0.4 * Math.sin(st.t * 5);
      g.fillText(last ? "點一下開始 ▶" : st.shown === st.cells.length ? "點一下翻頁 ▶" : "點一下 ▶", VW - 14, VH - 2);
      g.globalAlpha = 1;
    }
  }
  addEventListener("resize", () => { if (st) fit(); });

  return { play, update, tap, finish: () => finish(true), active: () => !!st, state: () => st && { page: st.pi, pages: st.pages.length, shown: st.shown, cells: st.cells.length },
           layout, BG, CHAR, textLength, VW, VH, bubbleCoversFace, bubbleOutside };
})();
