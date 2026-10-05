/* ============================================================
   手感調參面板（企劃邊玩邊調）：只在遊戲頁載入，測試頁不載入 → 測試永遠用正式數值。
   - 從暫停選單「🎚 手感調整」打開；拉滑桿立刻生效（物理每一步都直接讀 SR.T）
   - 調過的數值存在這台裝置（localStorage），重新整理也還在；「恢復預設」清掉
   - 「複製數值」把改過的項目複製成一段文字，貼給 AI 說「套用調參」→ 寫回 tuning.js 與數值總表
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.TUNE_PARAMS = [
  { group: "球", items: [
    { g: "ball", k: "gravity", name: "重力（球掉多快）", min: 600, max: 2600, step: 20 },
    { g: "ball", k: "max_speed", name: "最高速", min: 1400, max: 3600, step: 50 },
    { g: "ball", k: "restitution_wall", name: "撞牆反彈（0 黏、1 全彈）", min: 0.1, max: 0.95, step: 0.01 },
    { g: "ball", k: "friction", name: "撞擊摩擦", min: 0, max: 0.2, step: 0.005 },
    { g: "ball", k: "rolling_friction", name: "滾動摩擦", min: 0, max: 0.02, step: 0.001 },
    { g: "ball", k: "damping", name: "空氣阻力", min: 0, max: 0.5, step: 0.01 }
  ] },
  { group: "磚塊", items: [
    { g: "brick", k: "restitution", name: "撞磚反彈", min: 0.3, max: 1.2, step: 0.01 },
    { g: "brick", k: "min_bounce", name: "撞磚最低彈開速度", min: 0, max: 600, step: 10 }
  ] },
  { group: "彈跳柱", items: [
    { g: "bumper", k: "kick_speed", name: "彈開力道", min: 400, max: 1800, step: 10 }
  ] }
];

(function () {
  const KEY = "sr.tune.v1";
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const store = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const TUNE = SR.TUNE = { practice: false, defaults: null, open: null };

  // 載入正式數值後：記下預設、套上這台裝置存的調整
  const orig = SR.loadTuning;
  SR.loadTuning = async function () {
    const T = await orig();
    TUNE.defaults = {};
    const saved = /[?&]test=1\b/.test(location.search) ? {} : load();   // 測試模式不套用個人調整
    for (const sec of SR.TUNE_PARAMS) for (const p of sec.items) {
      const id = p.g + "." + p.k;
      TUNE.defaults[id] = T[p.g][p.k];
      if (typeof saved[id] === "number") T[p.g][p.k] = saved[id];
    }
    return T;
  };

  const fmt = (p, v) => p.step < 1 ? v.toFixed(String(p.step).split(".")[1].length) : String(Math.round(v));
  const changed = () => {
    const T = SR.T, out = [];
    for (const sec of SR.TUNE_PARAMS) for (const p of sec.items) {
      const id = p.g + "." + p.k, d = TUNE.defaults[id], v = T[p.g][p.k];
      if (Math.abs(v - d) > 1e-9) out.push({ sec: sec.group, p, id, d, v });
    }
    return out;
  };

  const css = `
  .tune { position: fixed; z-index: 15; right: 8px; bottom: 8px; width: min(340px, calc(100vw - 16px)); max-height: 46vh; overflow-y: auto;
    background: rgba(20, 14, 34, .94); color: #f5f5f7; border: 3px solid #111114; border-radius: 14px; box-shadow: 0 0 0 2px #ff3ea5, 4px 4px 0 #111114;
    padding: 10px 12px; font: 13px/1.4 "Noto Sans TC", system-ui, sans-serif; touch-action: pan-y; -webkit-user-select: none; user-select: none; }
  .tune[hidden] { display: none; }
  @media (max-width: 700px) { .tune { bottom: auto; top: calc(64px + env(safe-area-inset-top, 0px)); max-height: 38vh; } }
  .tune.mini { max-height: none; width: auto; }
  .tune.mini .tbody { display: none; }
  .tune .thead { display: flex; align-items: center; gap: 6px; }
  .tune .thead b { flex: 1; font-family: "Bungee", Impact, sans-serif; color: #ffe14d; font-size: 14px; }
  .tune .tbtn { appearance: none; border: 2px solid #111114; background: #ffe14d; color: #111114; font-weight: 900; border-radius: 8px; padding: 3px 8px; cursor: pointer; font-size: 12px; }
  .tune .tbtn.ghost { background: #3a3152; color: #f5f5f7; }
  .tune h4 { margin: 10px 0 2px; color: #3ee0ff; font-size: 13px; }
  .tune .trow { display: grid; grid-template-columns: 1fr auto; gap: 0 8px; margin: 6px 0; }
  .tune .trow label { font-size: 12px; color: #dcd6ea; }
  .tune .trow .v { font-variant-numeric: tabular-nums; font-weight: 700; text-align: right; }
  .tune .trow .v.mod { color: #ff3ea5; }
  .tune .trow .v small { color: #8f88a3; font-weight: 400; margin-left: 4px; }
  .tune .trow input { grid-column: 1 / -1; width: 100%; accent-color: #ff3ea5; margin: 2px 0 0; }
  .tune .tfoot { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .tune .tfoot label { display: flex; align-items: center; gap: 4px; font-size: 12px; flex: 1 1 100%; }
  .tune .msg { font-size: 12px; color: #9dff3a; min-height: 16px; margin-top: 4px; }`;

  function build() {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const el = document.createElement("aside");
    el.className = "tune"; el.id = "tunePanel"; el.hidden = true; el.setAttribute("aria-label", "手感調整");
    let html = `<div class="thead"><b>手感調整</b><button class="tbtn ghost" data-act="mini">收起</button><button class="tbtn" data-act="close">關閉</button></div><div class="tbody">`;
    for (const sec of SR.TUNE_PARAMS) {
      html += `<h4>${sec.group}</h4>`;
      for (const p of sec.items) {
        const id = p.g + "." + p.k;
        html += `<div class="trow"><label for="tn-${id}">${p.name}</label><span class="v" data-v="${id}"></span>
          <input type="range" id="tn-${id}" data-id="${id}" min="${p.min}" max="${p.max}" step="${p.step}"></div>`;
      }
    }
    html += `<div class="tfoot"><label><input type="checkbox" data-act="practice"> 練習模式（掉球不扣愛心）</label>
      <button class="tbtn" data-act="copy">複製數值</button><button class="tbtn ghost" data-act="reset">恢復預設</button></div>
      <div class="msg" data-msg></div></div>`;
    el.innerHTML = html;
    document.body.appendChild(el);

    // 拉滑桿時不要讓滑板跟著滑鼠／手指跑（遊戲在 window 上聽 pointermove）
    for (const t of ["pointermove", "pointerdown", "pointerup"]) el.addEventListener(t, e => e.stopPropagation());
    const byId = {};
    for (const sec of SR.TUNE_PARAMS) for (const p of sec.items) byId[p.g + "." + p.k] = p;
    const msg = t => { el.querySelector("[data-msg]").textContent = t; };
    const refresh = () => {
      for (const id in byId) {
        const p = byId[id], v = SR.T[p.g][p.k], d = TUNE.defaults[id];
        el.querySelector(`input[data-id="${id}"]`).value = v;
        const span = el.querySelector(`[data-v="${id}"]`);
        const mod = Math.abs(v - d) > 1e-9;
        span.className = "v" + (mod ? " mod" : "");
        span.innerHTML = fmt(p, v) + (mod ? `<small>原 ${fmt(p, d)}</small>` : "");
      }
      const n = changed().length;
      el.querySelector(".thead b").textContent = n ? `手感調整（改了 ${n} 項）` : "手感調整";
    };
    const persist = () => { const o = {}; for (const c of changed()) o[c.id] = c.v; store(o); };

    el.addEventListener("input", e => {
      const id = e.target.dataset.id; if (!id) return;
      const p = byId[id]; SR.T[p.g][p.k] = parseFloat(e.target.value);
      persist(); refresh(); msg("");
    });
    el.addEventListener("change", e => { if (e.target.dataset.act === "practice") TUNE.practice = e.target.checked; });
    el.addEventListener("click", async e => {
      const act = e.target.dataset && e.target.dataset.act; if (!act || act === "practice") return;
      if (act === "close") { el.hidden = true; }
      else if (act === "mini") { el.classList.toggle("mini"); e.target.textContent = el.classList.contains("mini") ? "展開" : "收起"; }
      else if (act === "reset") {
        for (const id in byId) { const p = byId[id]; SR.T[p.g][p.k] = TUNE.defaults[id]; }
        store({}); refresh(); msg("已恢復預設");
      } else if (act === "copy") {
        const list = changed();
        const text = list.length
          ? "套用調參\n" + list.map(c => `${c.sec}｜${c.p.name}（${c.id}）：${fmt(c.p, c.d)} → ${fmt(c.p, c.v)}`).join("\n")
          : "套用調參\n（沒有改動）";
        try { await navigator.clipboard.writeText(text); msg("已複製，貼給 AI 或寫進回饋.md"); }
        catch (err) { window.prompt("複製下面這段：", text); }
      }
    });
    TUNE.open = () => { el.hidden = false; el.classList.remove("mini"); el.querySelector('[data-act="mini"]').textContent = "收起"; refresh(); };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
