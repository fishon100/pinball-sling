/* ============================================================
   手感參數：先載入專案共用的 tuning.json（與 Godot、調參原型同一份），
   再補上噴漆闖關專用的參數。讀不到檔案時用內建備份（數值與 tuning.json v2 相同）。
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.TUNING_FALLBACK = {
  version: 2,
  ball: { radius: 12, gravity: 1400, max_speed: 2600, restitution_wall: 0.45, friction: 0.04, damping: 0.05 },
  flipper: { length: 72, radius_base: 11, radius_tip: 5, rest_deg: 30, stroke_deg: 58,
             up_speed_deg_s: 1700, down_speed_deg_s: 800, restitution: 0.3, power: 0.8 },
  plunger: { min_speed: 900, max_speed: 2300, charge_time: 0.9 },
  bumper: { radius: 22, kick_speed: 950, score: 100 },
  sling: { kick_speed: 800, score: 10 },
  rules: { ball_save_s: 3 },
  juice: { hitstop_ms: 35, shake_px: 6, flash_ms: 90, vibrate_ms: 15, trail: 10 },
  physics: { substeps: 8 }
};
/* 噴漆闖關專用（v3 新增） */
SR.STREET_TUNING = {
  plunger: { min_speed: 1300, max_speed: 2500 },          // 台面變高，發射力道跟著加大
  // 摩擦只在「撞擊」時用 ball.friction；滾動接觸用很小的 rolling_friction。
  // 原因：v2 的摩擦在滾動時每個子步都套用，球在長斜坡上只剩 50 px/s，
  // 會在兩支擋板之間無限慢滾循環（AC-S8 抓到）。擋板擊球屬於撞擊，手感不變（AC-S10 保護）。
  // 2026-10-07 企劃「套用調參」（手感調整面板）：球變輕飄、慢一點、不那麼彈；撞磚彈開力道下限提高；彈跳柱稍強
  //   重力 1400→820、最高速 2600→1900、撞牆反彈 0.45→0.24、撞擊摩擦 0.04→0.02、滾動摩擦 0.002→0.012、空氣阻力 0.05→0.19
  ball: { gravity: 820, max_speed: 1900, restitution_wall: 0.24, friction: 0.02, damping: 0.19, rolling_friction: 0.012, impact_threshold: 50 },
  //   撞磚反彈 0.85→0.50、撞磚最低彈開速度 180→300
  brick: { restitution: 0.5, min_bounce: 300, min_hit_speed: 60, score: 10 },
  bumper: { kick_speed: 1050 },   // 彈開力道 950→1050（2026-10-07 套用調參）
  // 收尾輔助：幾秒沒碎磚後啟動、吸力（v3.1 擋板新手：卡在最後幾塊 30.2s → 20.5s；
  // v3.4 滑板可以瞄準，擬人新手本來就只卡 7.7s，延遲 5→3 秒後 6.7s）
  assist: { finisher_delay: 3, finisher_strength: 1200 },
  // 滑板（第 5 輪：一根手指／滑鼠就能玩的新操作）：半寬、圓角、出球速度、最斜角度、跟手速度上限、移動時帶給球的側向速度比例
  // 第 6 輪：三種尺寸（半寬）S 小／M 中（一般關卡）／L 大（道具「寬板」）；滑板可在整個台面寬度移動
  // v3.7：S 半寬 40 → 48（第 4、5 區一般關也用 S，矮台面球回來得快，40 對新手太難：第 5 區每關掉 2.06 顆 → 1.28 顆）
  paddle: { half_widths: { S: 48, M: 56, L: 76 }, radius: 8, speed: 1550, max_angle_deg: 55, max_speed: 2600, carry: 0.15 },
  // 加速帶（v3.7，第 3 區起）：往上經過的球速度 ×mult，最少 min、最多 max；同一顆球 cooldown 秒內不重複
  // 2026-10-07 套用調參：上限 2000→1900（跟著球的最高速，企劃選的）
  boost: { mult: 1.35, min: 1000, max: 1900, cooldown: 0.5 },
  // capsule_speed＝道具膠囊直直往下掉的速度（px/s，v3.7.1）
  items: { capsule_speed: 170, bomb_radius: 60, bomb_damage: 2, slow_scale: 0.5, slow_s: 5, save_s: 10, wide_s: 12 },
  run: { hearts: 3, max_hearts: 5, bomb_radius: 52, bomb_every: 15 }
};

SR.loadTuning = async function () {
  const T = JSON.parse(JSON.stringify(SR.TUNING_FALLBACK));
  let source = "內建備份";
  try {
    const res = await fetch("tuning.json", { cache: "no-store" });
    if (res.ok) {
      const shared = await res.json();
      for (const g in shared) if (typeof shared[g] === "object") T[g] = { ...(T[g] || {}), ...shared[g] };
      source = "tuning.json v" + (shared.version ?? "?");
    }
  } catch (e) {}
  for (const g in SR.STREET_TUNING) T[g] = { ...(T[g] || {}), ...SR.STREET_TUNING[g] };
  T._source = source;
  return T;
};
