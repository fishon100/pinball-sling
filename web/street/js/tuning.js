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
  ball: { rolling_friction: 0.002, impact_threshold: 50 },
  brick: { restitution: 0.85, min_bounce: 180, min_hit_speed: 60, score: 10 },
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
