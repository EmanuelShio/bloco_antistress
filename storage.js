/* =========================================================================
   BLOCO ANTISTRESS — storage.js
   Camada única de acesso ao localStorage. Nunca lança erro para o app:
   se localStorage estiver indisponível, cai para memória volátil.
   ========================================================================= */

const Storage = (() => {
  const KEY_SETTINGS = "bloco_antistress_settings_v1";
  const KEY_STATS = "bloco_antistress_stats_v1";

  const DEFAULT_SETTINGS = {
    soundOn: true,
    vibrationOn: true,
    animationIntensity: "alta", // "alta" | "baixa" | "off"
    theme: "relaxante",         // "relaxante" | "escuro" | "neon"
    volume: 0.8,
    mode: "relaxante",          // "relaxante" | "desafio"
  };

  const DEFAULT_STATS = {
    totalTaps: 0,
    totalInteractions: 0,
    playTimeMs: 0,
    bestStreak: 0,
    discoveries: [], // ids de interações especiais descobertas
  };

  let memoryFallback = false;
  let memSettings = { ...DEFAULT_SETTINGS };
  let memStats = { ...DEFAULT_STATS };

  function isAvailable() {
    try {
      const t = "__bloco_test__";
      window.localStorage.setItem(t, "1");
      window.localStorage.removeItem(t);
      return true;
    } catch (e) {
      return false;
    }
  }

  memoryFallback = !isAvailable();

  function safeParse(str, fallback) {
    try {
      const parsed = JSON.parse(str);
      return parsed && typeof parsed === "object" ? parsed : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getSettings() {
    if (memoryFallback) return { ...memSettings };
    const raw = window.localStorage.getItem(KEY_SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...safeParse(raw, {}) };
  }

  function saveSettings(partial) {
    const current = getSettings();
    const next = { ...current, ...partial };
    if (memoryFallback) {
      memSettings = next;
      return next;
    }
    try {
      window.localStorage.setItem(KEY_SETTINGS, JSON.stringify(next));
    } catch (e) { /* ignora falha de quota */ }
    return next;
  }

  function getStats() {
    if (memoryFallback) return { ...memStats, discoveries: [...memStats.discoveries] };
    const raw = window.localStorage.getItem(KEY_STATS);
    if (!raw) return { ...DEFAULT_STATS, discoveries: [] };
    const parsed = safeParse(raw, {});
    return { ...DEFAULT_STATS, ...parsed, discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries : [] };
  }

  function saveStats(partial) {
    const current = getStats();
    const next = { ...current, ...partial };
    if (memoryFallback) {
      memStats = next;
      return next;
    }
    try {
      window.localStorage.setItem(KEY_STATS, JSON.stringify(next));
    } catch (e) { /* ignora falha de quota */ }
    return next;
  }

  function resetStats() {
    if (memoryFallback) {
      memStats = { ...DEFAULT_STATS, discoveries: [] };
      return memStats;
    }
    try {
      window.localStorage.removeItem(KEY_STATS);
    } catch (e) { /* ignora */ }
    return { ...DEFAULT_STATS, discoveries: [] };
  }

  return {
    getSettings,
    saveSettings,
    getStats,
    saveStats,
    resetStats,
    DEFAULT_SETTINGS,
    DEFAULT_STATS,
  };
})();
