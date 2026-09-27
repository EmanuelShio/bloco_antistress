/* =========================================================================
   BLOCO ANTISTRESS — game.js
   Interações do bloco: toque, pressão, arrasto, multitoque, combos.
   Usa Pointer Events, transforms via CSS (GPU) e requestAnimationFrame
   apenas para a interpolação do arrasto (evita layout thrashing).
   ========================================================================= */

const Game = (() => {
  const DISCOVERIES = [
    { id: "toque", name: "Primeiro toque" },
    { id: "pressionar", name: "Pressão longa" },
    { id: "arrastar", name: "Arrasto" },
    { id: "duplo", name: "Toque duplo" },
    { id: "combo", name: "Combo de 5 toques" },
    { id: "sequencia", name: "Sequência de 10" },
  ];

  let els = {};
  let getSettings = () => Storage.DEFAULT_SETTINGS;
  let onStatsChange = () => {};
  let onDiscovery = () => {};
  let onEnergyChange = () => {};

  let stats = Storage.DEFAULT_STATS;
  let activePointers = new Map(); // pointerId -> {x,y,startX,startY,startTime,lastMoveSound}
  let tapTimestamps = [];
  let lastInteractionTime = 0;
  let currentStreak = 0;
  let dragOffset = { x: 0, y: 0 };
  let rafScheduled = false;
  let comboLockUntil = 0;
  let playStartTime = 0;
  let playTimeTimer = null;

  function vibrate(pattern) {
    const s = getSettings();
    if (!s.vibrationOn) return;
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignora */ }
    }
  }

  function playSound(name) {
    const s = getSettings();
    if (!s.soundOn) return;
    AudioEngine.setVolume(s.volume);
    switch (name) {
      case "tap": AudioEngine.playTap(); break;
      case "press": AudioEngine.playPress(); break;
      case "release": AudioEngine.playRelease(); break;
      case "move": AudioEngine.playMove(); break;
      case "special": AudioEngine.playSpecial(); break;
      default: break;
    }
  }

  function markDiscovery(id) {
    if (stats.discoveries.includes(id)) return;
    stats.discoveries = [...stats.discoveries, id];
    const def = DISCOVERIES.find((d) => d.id === id);
    onDiscovery(id, def ? def.name : id);
    persist();
  }

  function registerInteraction({ isTap } = {}) {
    const now = performance.now();
    if (now - lastInteractionTime < 1500) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }
    lastInteractionTime = now;
    stats.totalInteractions += 1;
    if (isTap) stats.totalTaps += 1;
    if (currentStreak > stats.bestStreak) stats.bestStreak = currentStreak;
    if (currentStreak >= 10) markDiscovery("sequencia");

    const s = getSettings();
    if (s.mode === "desafio") {
      const energyPct = Math.min(100, (currentStreak % 12) * (100 / 12) + 8);
      onEnergyChange(energyPct);
      if (currentStreak > 0 && currentStreak % 12 === 0) {
        burstSpecial(getBlockCenter());
        playSound("special");
        vibrate([25, 40, 25, 60, 25]);
      }
    }
    onStatsChange({ ...stats });
    persist();
  }

  function persist() {
    Storage.saveStats(stats);
  }

  function getBlockCenter() {
    const rect = els.block.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function localPoint(clientX, clientY) {
    const rect = els.blockWrap.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top, rect };
  }

  function spawnDimple(x, y) {
    const d = document.createElement("div");
    d.className = "dimple";
    d.style.left = x + "px";
    d.style.top = y + "px";
    els.blockWrap.appendChild(d);
    requestAnimationFrame(() => d.classList.add("active"));
    return d;
  }

  function removeDimple(d) {
    if (!d) return;
    d.classList.remove("active");
    d.style.opacity = "0";
    setTimeout(() => d.remove(), 400);
  }

  function spawnRipple(x, y, size = 90) {
    const r = document.createElement("div");
    r.className = "ripple";
    r.style.left = x + "px";
    r.style.top = y + "px";
    r.style.width = size + "px";
    r.style.height = size + "px";
    els.blockWrap.appendChild(r);
    r.addEventListener("animationend", () => r.remove(), { once: true });
  }

  function spawnParticles(x, y, count = 8, colorVar = "--block-a") {
    const rootStyle = getComputedStyle(document.documentElement);
    const color = rootStyle.getPropertyValue(colorVar).trim() || "#fff";
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = i % 2 === 0 ? color : "#fff";
      els.blockWrap.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * 46;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const duration = 500 + Math.random() * 350;
      const anim = p.animate(
        [
          { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
          { transform: `translate(${dx - 3}px, ${dy - 3}px) scale(0.3)`, opacity: 0 },
        ],
        { duration, easing: "cubic-bezier(.2,.7,.3,1)" }
      );
      anim.onfinish = () => p.remove();
    }
  }

  function burstSpecial(clientPos) {
    const local = localPoint(clientPos.x, clientPos.y);
    spawnRipple(local.x, local.y, 140);
    spawnParticles(local.x, local.y, 18, "--accent");
    els.block.animate(
      [
        { filter: "brightness(1)" },
        { filter: "brightness(1.35)" },
        { filter: "brightness(1)" },
      ],
      { duration: 500 }
    );
    showInstructionsFade();
  }

  function showInstructionsFade() {
    if (!els.instructions) return;
    els.instructions.style.opacity = "0";
  }

  function applyBlockTransform(pressed) {
    const scale = pressed ? 0.9 : 1;
    const s = getSettings();
    const intensity = s.animationIntensity === "off" ? 0 : s.animationIntensity === "baixa" ? 0.5 : 1;
    const tx = dragOffset.x * intensity;
    const ty = dragOffset.y * intensity;
    const rot = Math.max(-10, Math.min(10, dragOffset.x * 0.06)) * intensity;
    els.block.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotate(${rot}deg) scale(${scale})`;
  }

  function scheduleTransformUpdate() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => {
      rafScheduled = false;
      applyBlockTransform(activePointers.size > 0);
    });
  }

  function onPointerDown(e) {
    AudioEngine.unlock();
    if (els.block.setPointerCapture) {
      try { els.block.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ }
    }
    const local = localPoint(e.clientX, e.clientY);
    const info = {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      startTime: performance.now(),
      dimple: spawnDimple(local.x, local.y),
      lastMoveSound: 0,
      dragged: false,
    };
    activePointers.set(e.pointerId, info);
    els.block.classList.add("is-pressed");
    showInstructionsFade();

    if (activePointers.size >= 2) {
      markDiscovery("duplo");
      burstSpecial({ x: e.clientX, y: e.clientY });
    }

    scheduleTransformUpdate();
    playSound("press");
    vibrate(12);
  }

  function onPointerMove(e) {
    const info = activePointers.get(e.pointerId);
    if (!info) return;
    info.x = e.clientX;
    info.y = e.clientY;
    const dx = e.clientX - info.startX;
    const dy = e.clientY - info.startY;
    const dist = Math.hypot(dx, dy);

    if (dist > 6) {
      info.dragged = true;
      if (info.dimple) info.dimple.style.left = localPoint(e.clientX, e.clientY).x + "px";
      if (info.dimple) info.dimple.style.top = localPoint(e.clientX, e.clientY).y + "px";
    }

    // Apenas o primeiro ponteiro controla o deslocamento visual do bloco (feel elástico)
    const firstKey = activePointers.keys().next().value;
    if (e.pointerId === firstKey) {
      const clampedX = Math.max(-26, Math.min(26, dx * 0.35));
      const clampedY = Math.max(-22, Math.min(22, dy * 0.35));
      dragOffset = { x: clampedX, y: clampedY };
      scheduleTransformUpdate();
    }

    const now = performance.now();
    if (dist > 18 && now - info.lastMoveSound > 160) {
      info.lastMoveSound = now;
      playSound("move");
    }

    if (dist > 60) {
      markDiscovery("arrastar");
    }
  }

  function endGesture(e) {
    const info = activePointers.get(e.pointerId);
    if (!info) return;
    activePointers.delete(e.pointerId);
    removeDimple(info.dimple);

    const duration = performance.now() - info.startTime;
    const local = localPoint(e.clientX ?? info.x, e.clientY ?? info.y);

    if (activePointers.size === 0) {
      els.block.classList.remove("is-pressed");
      dragOffset = { x: 0, y: 0 };
      scheduleTransformUpdate();
    }

    if (info.dragged) {
      spawnRipple(local.x, local.y, 110);
      registerInteraction({ isTap: false });
      playSound("release");
    } else if (duration >= 550) {
      markDiscovery("pressionar");
      spawnParticles(local.x, local.y, 14, "--accent");
      spawnRipple(local.x, local.y, 130);
      registerInteraction({ isTap: false });
      playSound("special");
      vibrate([20, 30, 20]);
    } else {
      markDiscovery("toque");
      spawnRipple(local.x, local.y, 80);
      spawnParticles(local.x, local.y, 6);
      registerInteraction({ isTap: true });
      playSound("tap");
      vibrate(10);

      const now = performance.now();
      tapTimestamps.push(now);
      tapTimestamps = tapTimestamps.filter((t) => now - t < 2000);
      if (tapTimestamps.length >= 5 && now > comboLockUntil) {
        comboLockUntil = now + 3000;
        markDiscovery("combo");
        burstSpecial({ x: e.clientX ?? info.x, y: e.clientY ?? info.y });
        playSound("special");
        vibrate([15, 20, 15, 20, 15, 40]);
      }
    }
  }

  function onPointerUp(e) { endGesture(e); }
  function onPointerCancel(e) { endGesture(e); }

  function startPlayTimeTracking() {
    playStartTime = performance.now();
    if (playTimeTimer) clearInterval(playTimeTimer);
    playTimeTimer = setInterval(() => {
      const elapsed = performance.now() - playStartTime;
      playStartTime = performance.now();
      stats.playTimeMs += elapsed;
      onStatsChange({ ...stats });
      persist();
    }, 5000);
  }

  function stopPlayTimeTracking() {
    if (playTimeTimer) {
      clearInterval(playTimeTimer);
      playTimeTimer = null;
    }
  }

  function init(config) {
    els = config.els;
    getSettings = config.getSettings;
    onStatsChange = config.onStatsChange || (() => {});
    onDiscovery = config.onDiscovery || (() => {});
    onEnergyChange = config.onEnergyChange || (() => {});
    stats = Storage.getStats();
    onStatsChange({ ...stats });

    els.block.addEventListener("pointerdown", onPointerDown);
    els.block.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);

    // Evita seleção/zoom acidental
    els.stage.addEventListener("contextmenu", (e) => e.preventDefault());
    els.stage.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length > 1) e.preventDefault();
      },
      { passive: false }
    );

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopPlayTimeTracking();
        persist();
      } else if (!document.hidden && document.getElementById("screen-game") && !document.getElementById("screen-game").classList.contains("hidden")) {
        startPlayTimeTracking();
      }
    });
    window.addEventListener("beforeunload", persist);
  }

  function getStats() { return { ...stats }; }
  function getDiscoveriesList() { return DISCOVERIES; }

  function resetStats() {
    stats = Storage.resetStats();
    currentStreak = 0;
    onStatsChange({ ...stats });
    onEnergyChange(0);
  }

  return {
    init,
    startPlayTimeTracking,
    stopPlayTimeTracking,
    getStats,
    getDiscoveriesList,
    resetStats,
  };
})();
