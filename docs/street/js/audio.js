/* ============================================================
   噴漆闖關 — 聲音（WebAudio 即時合成，不需音檔；之後可換成 AI 生成的正式音樂）
   BGM：boom-bap 嘻哈節拍。intensity 0＝基本鼓組＋貝斯、1＋鋼琴和弦、2＋高音琶音（連擊 ≥10 或首領戰）
   ============================================================ */
"use strict";
var SR = window.SR || (window.SR = {});

SR.Audio = (function () {
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let sfxOn = true, musicOn = true;
  const seq = { playing: false, tempo: 90, root: 45, step: 0, nextTime: 0, timer: null, intensity: 0, targetIntensity: 0 };

  function ensure() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxOn ? 0.9 : 0; sfxBus.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? 0.55 : 0; musicBus.connect(comp);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function osc(bus, type, f0, f1, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(bus, t, dur, vol, type, freq, q = 0.8, attack = 0.002) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  /* ---------- 音效 ---------- */
  const SFX = {
    spray(vol = 0.25) { noise(sfxBus, ctx.currentTime, 0.18, vol, "highpass", 5200, 0.5, 0.01); },                 // 噴漆「嘶」
    brickHit() { const t = ctx.currentTime; osc(sfxBus, "square", 420, 300, t, 0.06, 0.08); noise(sfxBus, t, 0.05, 0.18, "bandpass", 2400); },
    brickBreak(pitch = 0) { const t = ctx.currentTime; osc(sfxBus, "triangle", 300 + pitch * 40, 90, t, 0.16, 0.22); noise(sfxBus, t, 0.12, 0.3, "bandpass", 1400, 1.2); SFX.spray(0.12); },
    bucket() { const t = ctx.currentTime; osc(sfxBus, "sine", 160, 40, t, 0.4, 0.4); noise(sfxBus, t, 0.35, 0.4, "lowpass", 900); SFX.spray(0.3); },
    bumper() { const t = ctx.currentTime; osc(sfxBus, "square", 720, 360, t, 0.1, 0.1); noise(sfxBus, t, 0.03, 0.2, "highpass", 3000); },
    sling() { const t = ctx.currentTime; osc(sfxBus, "triangle", 220, 110, t, 0.09, 0.22); },
    flipper() { noise(sfxBus, ctx.currentTime, 0.035, 0.16, "bandpass", 900); },
    wall(s) { noise(sfxBus, ctx.currentTime, 0.03, Math.min(0.18, s / 9000), "bandpass", 2200); },
    launch() { noise(sfxBus, ctx.currentTime, 0.3, 0.25, "bandpass", 700); },
    boost() { const t = ctx.currentTime; osc(sfxBus, "sawtooth", 300, 1800, t, 0.3, 0.09); noise(sfxBus, t + 0.05, 0.08, 0.18, "highpass", 1800); },   // 加速帶：0.3 秒往上掃的「咻」＋短砰（提案 boost-feel）
    drain() { osc(sfxBus, "sawtooth", 330, 70, ctx.currentTime, 0.6, 0.12); },
    save() { const t = ctx.currentTime; osc(sfxBus, "sine", 990, 1480, t, 0.2, 0.15); },
    combo(n) { const t = ctx.currentTime; osc(sfxBus, "square", 660 + Math.min(n, 60) * 12, 660 + Math.min(n, 60) * 12, t, 0.07, 0.07); },
    bossHit() { const t = ctx.currentTime; osc(sfxBus, "sawtooth", 140, 70, t, 0.2, 0.2); noise(sfxBus, t, 0.1, 0.25, "lowpass", 600); },
    bossRegen() { const t = ctx.currentTime; noise(sfxBus, t, 0.5, 0.2, "highpass", 3000, 0.5, 0.05); osc(sfxBus, "sine", 200, 120, t, 0.5, 0.1); },
    clear() { const t = ctx.currentTime; [0, 4, 7, 12, 16].forEach((s, i) => osc(sfxBus, "square", mtof(72 + s), mtof(72 + s), t + i * 0.09, 0.25, 0.09)); },
    achievement() { const t = ctx.currentTime; [12, 16, 19, 24].forEach((s, i) => osc(sfxBus, "triangle", mtof(72 + s), mtof(72 + s), t + i * 0.07, 0.3, 0.12)); },
    card() { const t = ctx.currentTime; osc(sfxBus, "triangle", 880, 1320, t, 0.12, 0.1); SFX.spray(0.08); },
    ui() { osc(sfxBus, "sine", 1200, 1200, ctx.currentTime, 0.05, 0.06); },
    lose() { const t = ctx.currentTime; [7, 3, 0, -5].forEach((s, i) => osc(sfxBus, "triangle", mtof(60 + s), mtof(60 + s), t + i * 0.18, 0.4, 0.12)); }
  };
  function play(name, ...args) { if (!ensure() || !sfxOn) return; try { SFX[name](...args); } catch (e) {} }

  /* ---------- BGM 步進編曲器（16 步，提前排程）---------- */
  const KICK  = [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,0];
  const SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1];
  const HAT   = [1,0,1,0, 1,0,1,1, 1,0,1,0, 1,0,1,0];
  const BASS  = [0,null,null,0, null,null,3,null, 5,null,null,3, null,0,null,null];
  const PROG  = [[0, 3, 7, 10], [5, 8, 12, 15], [3, 7, 10, 14], [7, 10, 14, 17]];   // 小調 7 和弦進行
  let bar = 0;
  function scheduleStep(step, t) {
    const spb = 60 / seq.tempo / 4, swing = step % 2 ? spb * 0.18 : 0, tt = t + swing;
    const chord = PROG[bar % 4];
    if (KICK[step]) osc(musicBus, "sine", 120, 40, tt, 0.32, 0.9);
    if (SNARE[step]) { noise(musicBus, tt, 0.18, 0.45, "bandpass", 1800, 0.7); osc(musicBus, "triangle", 220, 160, tt, 0.08, 0.2); }
    if (HAT[step]) noise(musicBus, tt, step % 4 === 2 ? 0.09 : 0.04, 0.12, "highpass", 8000);
    if (BASS[step] !== null) osc(musicBus, "triangle", mtof(seq.root - 12 + chord[0] + BASS[step]), mtof(seq.root - 12 + chord[0] + BASS[step]), tt, spb * 2.6, 0.32);
    if (seq.intensity >= 1 && (step === 0 || step === 10)) chord.forEach(n => osc(musicBus, "sine", mtof(seq.root + 12 + n), mtof(seq.root + 12 + n), tt, spb * 5, 0.05));
    if (seq.intensity >= 2 && step % 2 === 0) { const n = chord[(step / 2) % 4]; osc(musicBus, "square", mtof(seq.root + 24 + n), mtof(seq.root + 24 + n), tt, spb * 0.9, 0.03); }
    if (seq.intensity >= 2 && step === 14) noise(musicBus, tt, 0.25, 0.1, "highpass", 4000, 0.5, 0.15);   // 噴漆刷聲當過門
  }
  function tick() {
    if (!seq.playing) return;
    const spb = 60 / seq.tempo / 4;
    while (seq.nextTime < ctx.currentTime + 0.12) {
      if (seq.step === 0) seq.intensity = seq.targetIntensity;   // 換小節才切換層數，聽起來比較順
      scheduleStep(seq.step, seq.nextTime);
      seq.nextTime += spb; seq.step = (seq.step + 1) % 16; if (seq.step === 0) bar++;
    }
  }
  function startMusic(district) {
    if (!ensure()) return;
    seq.tempo = district.tempo; seq.root = district.root;
    if (seq.playing) return;
    seq.playing = true; seq.step = 0; bar = 0; seq.nextTime = ctx.currentTime + 0.05;
    seq.timer = setInterval(tick, 25);
  }
  function stopMusic() { seq.playing = false; clearInterval(seq.timer); }
  function setIntensity(n) { seq.targetIntensity = n; }
  function setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.value = on ? 0.9 : 0; }
  function setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.value = on ? 0.55 : 0; }

  return { ensure, play, startMusic, stopMusic, setIntensity, setSfx, setMusic, get sfxOn() { return sfxOn; }, get musicOn() { return musicOn; } };
})();
