/* =========================================================================
   BLOCO ANTISTRESS — audio.js
   Todos os sons são sintetizados via Web Audio API (nenhum arquivo externo).
   O AudioContext só é criado após o primeiro gesto do usuário.
   ========================================================================= */

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let enabled = true;
  let volume = 0.8;

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  function unlock() {
    // Deve ser chamado dentro de um handler de gesto do usuário (pointerdown/click).
    const c = ensureContext();
    if (c && c.state === "suspended") {
      c.resume().catch(() => {});
    }
  }

  function setEnabled(v) { enabled = !!v; }
  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (masterGain) masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
  }

  function envGain(duration, peak = 1, attack = 0.005) {
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    return g;
  }

  function tone({ freq = 440, type = "sine", duration = 0.12, peak = 0.5, detune = 0, filterFreq = null }) {
    if (!enabled) return;
    const c = ensureContext();
    if (!c) return;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = envGain(duration, peak);
    let node = osc;
    if (filterFreq) {
      const filt = c.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.value = filterFreq;
      node.connect(filt);
      node = filt;
    }
    node.connect(g);
    g.connect(masterGain);
    osc.start();
    osc.stop(c.currentTime + duration + 0.02);
  }

  function noiseBurst({ duration = 0.08, peak = 0.35, filterFreq = 1200 }) {
    if (!enabled) return;
    const c = ensureContext();
    if (!c) return;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filt = c.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = filterFreq;
    const g = envGain(duration, peak, 0.002);
    src.connect(filt);
    filt.connect(g);
    g.connect(masterGain);
    src.start();
  }

  // ---- Sons específicos do jogo ----

  function playTap() {
    tone({ freq: 520 + Math.random() * 40, type: "sine", duration: 0.09, peak: 0.35, filterFreq: 2200 });
  }

  function playPress() {
    tone({ freq: 180, type: "triangle", duration: 0.16, peak: 0.4, filterFreq: 900 });
    noiseBurst({ duration: 0.05, peak: 0.12, filterFreq: 500 });
  }

  function playRelease() {
    tone({ freq: 300, type: "sine", duration: 0.1, peak: 0.25, filterFreq: 1500 });
  }

  function playMove() {
    noiseBurst({ duration: 0.06, peak: 0.06, filterFreq: 700 });
  }

  function playSpecial() {
    const notes = [523.25, 659.25, 784.0, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => tone({ freq: f, type: "sine", duration: 0.35, peak: 0.3, filterFreq: 4000 }), i * 70);
    });
  }

  function playUi() {
    tone({ freq: 660, type: "sine", duration: 0.07, peak: 0.25, filterFreq: 3000 });
  }

  return {
    unlock,
    setEnabled,
    setVolume,
    playTap,
    playPress,
    playRelease,
    playMove,
    playSpecial,
    playUi,
  };
})();
