/* TaskLens P0-5: register the service worker (deferred, failure is silent). */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* offline support unavailable — the app still works online */
    });
  });
}
