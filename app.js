/* =========================================================================
   BLOCO ANTISTRESS — app.js
   Controlador principal: navegação de telas, configurações, temas,
   estatísticas e integração dos módulos (Storage, AudioEngine, Game, PWA).
   ========================================================================= */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  const el = {
    root: document.documentElement,
    splash: $("#screen-splash"),
    gameScreen: $("#screen-game"),
    btnStart: $("#btn-start"),

    stage: $("#stage"),
    blockWrap: $("#block-wrap"),
    block: $("#block"),
    instructions: $("#instructions"),
    tapCounter: $("#tap-counter"),
    energyBar: $("#energy-bar"),
    energyBarFill: $("#energy-bar-fill"),
    modeToggle: $("#mode-toggle"),

    btnSound: $("#btn-sound"),
    btnStats: $("#btn-stats"),
    btnSettings: $("#btn-settings"),

    overlay: $("#sheet-overlay"),
    sheetSettings: $("#sheet-settings"),
    sheetStats: $("#sheet-stats"),

    switchSound: $("#switch-sound"),
    switchVibration: $("#switch-vibration"),
    rangeVolume: $("#range-volume"),
    segmentedMotion: $("#segmented-motion"),
    segmentedTheme: $("#segmented-theme"),
    btnInstall: $("#btn-install"),
    btnResetStats: $("#btn-reset-stats"),

    statTaps: $("#stat-taps"),
    statInteractions: $("#stat-interactions"),
    statTime: $("#stat-time"),
    statStreak: $("#stat-streak"),
    discoveriesList: $("#discoveries-list"),

    toast: $("#toast"),
  };

  let settings = Storage.getSettings();
  let toastTimer = null;

  /* ---------------- Utilidades de UI ---------------- */

  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2200);
  }

  function openSheet(sheetEl) {
    el.overlay.classList.add("open");
    sheetEl.classList.add("open");
  }
  function closeSheets() {
    el.overlay.classList.remove("open");
    el.sheetSettings.classList.remove("open");
    el.sheetStats.classList.remove("open");
  }

  /* ---------------- Aplicação de configurações ---------------- */

  function applyTheme(theme) {
    el.root.setAttribute("data-theme", theme);
    const colors = { relaxante: "#8A75C9", escuro: "#4C58C2", neon: "#4FD9FF" };
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute("content", colors[theme] || "#8A75C9");
  }

  function applyMotion(intensity) {
    el.root.setAttribute("data-motion", intensity);
  }

  function applySoundIcon(on) {
    el.btnSound.setAttribute("data-muted", (!on).toString());
  }

  function applySettingsToUI() {
    el.switchSound.classList.toggle("on", settings.soundOn);
    el.switchSound.setAttribute("aria-checked", String(settings.soundOn));
    el.switchVibration.classList.toggle("on", settings.vibrationOn);
    el.switchVibration.setAttribute("aria-checked", String(settings.vibrationOn));
    el.rangeVolume.value = Math.round(settings.volume * 100);
    applySoundIcon(settings.soundOn);
    applyTheme(settings.theme);
    applyMotion(settings.animationIntensity);
    AudioEngine.setEnabled(settings.soundOn);
    AudioEngine.setVolume(settings.volume);

    [...el.segmentedMotion.children].forEach((b) =>
      b.classList.toggle("active", b.dataset.value === settings.animationIntensity)
    );
    [...el.segmentedTheme.children].forEach((b) =>
      b.classList.toggle("active", b.dataset.value === settings.theme)
    );
    [...el.modeToggle.children].forEach((b) =>
      b.classList.toggle("active", b.dataset.mode === settings.mode)
    );
    el.energyBar.classList.toggle("hidden", settings.mode !== "desafio");
  }

  function updateSetting(partial) {
    settings = Storage.saveSettings(partial);
    applySettingsToUI();
  }

  /* ---------------- Estatísticas ---------------- */

  function formatTime(ms) {
    const totalMin = Math.floor(ms / 60000);
    if (totalMin < 1) return "<1min";
    if (totalMin < 60) return `${totalMin}min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}min`;
  }

  function renderStats(stats) {
    el.tapCounter.textContent = stats.totalTaps;
    el.statTaps.textContent = stats.totalTaps;
    el.statInteractions.textContent = stats.totalInteractions;
    el.statTime.textContent = formatTime(stats.playTimeMs);
    el.statStreak.textContent = stats.bestStreak;
    renderDiscoveries(stats.discoveries);
  }

  function renderDiscoveries(found) {
    const all = Game.getDiscoveriesList();
    el.discoveriesList.innerHTML = "";
    all.forEach((d) => {
      const chip = document.createElement("span");
      chip.className = "discovery-chip" + (found.includes(d.id) ? " found" : "");
      chip.textContent = found.includes(d.id) ? d.name : "???";
      el.discoveriesList.appendChild(chip);
    });
  }

  /* ---------------- Navegação de telas ---------------- */

  function goToGame() {
    el.splash.classList.add("hidden");
    el.gameScreen.classList.remove("hidden");
    Game.startPlayTimeTracking();
  }

  /* ---------------- Inicialização ---------------- */

  function init() {
    applySettingsToUI();
    renderStats(Storage.getStats());

    el.btnStart.addEventListener("click", () => {
      AudioEngine.unlock();
      AudioEngine.playUi?.();
      goToGame();
    });

    Game.init({
      els: { block: el.block, blockWrap: el.blockWrap, stage: el.stage, instructions: el.instructions },
      getSettings: () => settings,
      onStatsChange: renderStats,
      onDiscovery: (id, name) => showToast(`Nova descoberta: ${name} ✨`),
      onEnergyChange: (pct) => { el.energyBarFill.style.width = pct + "%"; },
    });

    // Som
    el.btnSound.addEventListener("click", () => {
      AudioEngine.playUi?.();
      updateSetting({ soundOn: !settings.soundOn });
    });

    // Sheets
    el.btnSettings.addEventListener("click", () => openSheet(el.sheetSettings));
    el.btnStats.addEventListener("click", () => {
      renderStats(Game.getStats());
      openSheet(el.sheetStats);
    });
    el.overlay.addEventListener("click", closeSheets);

    // Switches
    el.switchSound.addEventListener("click", () => updateSetting({ soundOn: !settings.soundOn }));
    el.switchVibration.addEventListener("click", () => updateSetting({ vibrationOn: !settings.vibrationOn }));
    el.rangeVolume.addEventListener("input", (e) => {
      updateSetting({ volume: Number(e.target.value) / 100 });
    });

    // Segmentados
    el.segmentedMotion.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      updateSetting({ animationIntensity: btn.dataset.value });
    });
    el.segmentedTheme.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      updateSetting({ theme: btn.dataset.value });
    });

    // Modo (relaxante / desafio)
    el.modeToggle.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      updateSetting({ mode: btn.dataset.mode });
      if (btn.dataset.mode !== "desafio") el.energyBarFill.style.width = "0%";
    });

    // Reset de estatísticas
    el.btnResetStats.addEventListener("click", () => {
      Game.resetStats();
      renderStats(Storage.getStats());
      showToast("Estatísticas redefinidas");
    });

    // PWA
    PWA.registerServiceWorker();
    PWA.listenForInstallPrompt((available) => {
      el.btnInstall.classList.toggle("hidden", !available || PWA.isStandalone());
    });
    el.btnInstall.addEventListener("click", async () => {
      const outcome = await PWA.promptInstall();
      if (outcome === "accepted") showToast("Instalando aplicativo…");
    });

    // Evita gestos indesejados
    document.addEventListener(
      "touchmove",
      (e) => {
        if (e.scale && e.scale !== 1) e.preventDefault();
      },
      { passive: false }
    );
    document.addEventListener("gesturestart", (e) => e.preventDefault());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
