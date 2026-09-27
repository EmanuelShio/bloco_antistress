/* =========================================================================
   BLOCO ANTISTRESS — pwa.js
   Registro do service worker e captura do prompt de instalação (Android).
   ========================================================================= */

const PWA = (() => {
  let deferredPrompt = null;
  let onInstallAvailable = () => {};
  let onInstalled = () => {};

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .catch(() => { /* segue funcionando sem SW se falhar */ });
    });
  }

  function listenForInstallPrompt(cb) {
    onInstallAvailable = cb || onInstallAvailable;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      onInstallAvailable(true);
    });
    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      onInstalled();
    });
  }

  async function promptInstall() {
    if (!deferredPrompt) return "unavailable";
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice.outcome; // "accepted" | "dismissed"
  }

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  return {
    registerServiceWorker,
    listenForInstallPrompt,
    promptInstall,
    isStandalone,
  };
})();
